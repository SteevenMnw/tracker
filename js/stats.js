// ============================================================================
// stats.js — Calculs (1RM, volume hebdo, PR, stagnation) + graphiques Chart.js
// ============================================================================

function estimate1RM(weight, reps) {
  if (reps <= 0) return 0;
  return weight * (1 + reps / 30);
}

const MUSCLE_LABELS = {
  pectorals: 'Pecs', front_delts: 'Delt. ant.', side_delts: 'Delt. lat.',
  rear_delts: 'Delt. arr.', triceps: 'Triceps', biceps: 'Biceps',
  forearms: 'Avant-bras', traps: 'Trapèzes', mid_back: 'Dos haut',
  lats: 'Grand dorsal', lower_back: 'Lombaires', abs: 'Abdos',
  obliques: 'Obliques', quads: 'Quads', hamstrings: 'Ischios',
  glutes: 'Fessiers', calves: 'Mollets',
};

// Cherche dans les sessions pré-chargées (synchrone, pour les calculs)
function findExercise(exerciseId) {
  for (const session of Object.values(Program.SESSIONS)) {
    const ex = session.exercises.find(e => e.id === exerciseId);
    if (ex) return ex;
  }
  return null;
}

// Cherche aussi dans les sessions custom (asynchrone)
async function findExerciseAsync(exerciseId) {
  const sync = findExercise(exerciseId);
  if (sync) return sync;
  const customs = await DB.getAll('custom_sessions');
  for (const session of customs) {
    const ex = session.exercises.find(e => e.id === exerciseId);
    if (ex) return ex;
  }
  return null;
}

const KEY_EXERCISES = [
  { id: 'bench_press', label: 'Bench press' },
  { id: 'back_squat', label: 'Back squat' },
  { id: 'rdl', label: 'RDL' },
  { id: 'db_ohp_seated', label: 'OHP haltères' },
];

async function getAll1RMSeries() {
  const sets = await DB.getAll('sets');
  const out = {};
  for (const ex of KEY_EXERCISES) {
    const exSets = sets.filter(s => s.exerciseId === ex.id);
    if (!exSets.length) { out[ex.id] = { label: ex.label, points: [] }; continue; }
    const byDate = {};
    for (const s of exSets) {
      const d = s.date.slice(0, 10);
      const v = estimate1RM(s.weight, s.reps);
      if (!byDate[d] || v > byDate[d]) byDate[d] = v;
    }
    const points = Object.entries(byDate)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([d, v]) => ({ x: d, y: Math.round(v * 10) / 10 }));
    out[ex.id] = { label: ex.label, points };
  }
  return out;
}

async function getPRTable() {
  const sets = await DB.getAll('sets');
  const exMap = {};
  for (const s of sets) {
    if (!exMap[s.exerciseId]) exMap[s.exerciseId] = [];
    exMap[s.exerciseId].push(s);
  }
  const rows = [];
  for (const [exId, exSets] of Object.entries(exMap)) {
    let best = null;
    for (const s of exSets) {
      const v = estimate1RM(s.weight, s.reps);
      if (!best || v > best.estimate) {
        best = { ...s, estimate: v };
      }
    }
    const name = best.exerciseName || exId;
    rows.push({
      exerciseId: exId,
      name,
      bestWeight: best.weight,
      bestReps: best.reps,
      estimate1RM: Math.round(best.estimate * 10) / 10,
      date: best.date.slice(0, 10),
    });
  }
  rows.sort((a, b) => b.estimate1RM - a.estimate1RM);
  return rows;
}

async function getWeeklyVolumeByMuscle() {
  const sets = await DB.getAll('sets');
  if (!sets.length) return { weeks: [], muscles: {} };
  const byWeek = {};
  for (const s of sets) {
    const d = new Date(s.date);
    const monday = getMonday(d);
    const key = monday.toISOString().slice(0, 10);
    const ex = await findExerciseAsync(s.exerciseId);
    if (!ex || !ex.muscles || !ex.muscles.length) continue;
    if (!byWeek[key]) byWeek[key] = {};
    for (const m of ex.muscles) {
      byWeek[key][m] = (byWeek[key][m] || 0) + 1;
    }
  }
  const weeks = Object.keys(byWeek).sort();
  const allMuscles = new Set();
  weeks.forEach(w => Object.keys(byWeek[w]).forEach(m => allMuscles.add(m)));
  const muscles = {};
  for (const m of allMuscles) {
    muscles[m] = weeks.map(w => byWeek[w][m] || 0);
  }
  return { weeks, muscles };
}

function getMonday(d) {
  const x = new Date(d);
  const day = x.getDay() || 7;
  if (day !== 1) x.setDate(x.getDate() - (day - 1));
  x.setHours(0, 0, 0, 0);
  return x;
}

async function getWorkoutVolumeSeries() {
  const workouts = await DB.getAll('workouts');
  return workouts
    .filter(w => w.finished && w.totalVolume)
    .sort((a, b) => a.date.localeCompare(b.date))
    .map(w => ({ x: w.date.slice(0, 10), y: Math.round(w.totalVolume) }));
}

async function detectStagnation() {
  const sets = await DB.getAll('sets');
  const exMap = {};
  for (const s of sets) {
    if (!exMap[s.exerciseId]) exMap[s.exerciseId] = [];
    exMap[s.exerciseId].push(s);
  }
  const stagnant = [];
  const threeWeeksMs = 21 * 24 * 60 * 60 * 1000;
  const now = Date.now();
  for (const [exId, list] of Object.entries(exMap)) {
    if (list.length < 6) continue;
    list.sort((a, b) => a.date.localeCompare(b.date));
    let bestEver = 0;
    let bestDate = list[0].date;
    for (const s of list) {
      const v = estimate1RM(s.weight, s.reps);
      if (v > bestEver) { bestEver = v; bestDate = s.date; }
    }
    if (now - new Date(bestDate).getTime() > threeWeeksMs) {
      const name = list[0].exerciseName || exId;
      stagnant.push({ exerciseId: exId, name, since: bestDate.slice(0, 10) });
    }
  }
  return stagnant;
}

async function getMeasurementSeries(field) {
  const items = await DB.getAll('measurements');
  return items
    .filter(m => m[field] != null && m[field] !== '')
    .sort((a, b) => a.date.localeCompare(b.date))
    .map(m => ({ x: m.date.slice(0, 10), y: parseFloat(m[field]) }));
}

function movingAverage(points, window = 7) {
  return points.map((_, i) => {
    const slice = points.slice(Math.max(0, i - window + 1), i + 1);
    const avg = slice.reduce((a, b) => a + b.y, 0) / slice.length;
    return { x: points[i].x, y: Math.round(avg * 10) / 10 };
  });
}

window.Stats = {
  estimate1RM,
  KEY_EXERCISES,
  MUSCLE_LABELS,
  findExercise,
  findExerciseAsync,
  getAll1RMSeries,
  getPRTable,
  getWeeklyVolumeByMuscle,
  getWorkoutVolumeSeries,
  detectStagnation,
  getMeasurementSeries,
  movingAverage,
};
