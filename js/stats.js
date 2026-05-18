// ============================================================================
// stats.js — Stats : progression par muscle, activité hebdo, PR, poids, sommeil
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

const MUSCLE_COLORS = {
  pectorals: '#ff6384', front_delts: '#ff9f40', side_delts: '#ffcd56',
  rear_delts: '#4bc0c0', triceps: '#36a2eb', biceps: '#9966ff',
  forearms: '#c9cbcf', traps: '#ff6384', mid_back: '#ff9f40',
  lats: '#4bc0c0', lower_back: '#ffcd56', abs: '#36a2eb',
  obliques: '#9966ff', quads: '#ff6384', hamstrings: '#ff9f40',
  glutes: '#4bc0c0', calves: '#ffcd56',
};

// Résout les muscles d'un exercice (catalogue built-in + custom)
function resolveExerciseMuscles(exerciseId) {
  const cat = Exercises.getCatalogExercise(exerciseId);
  if (cat) return cat.muscles || [];
  return [];
}

// Progression par muscle : charge moyenne (kg) par semaine pour les muscles sélectionnés
async function getMuscleProgressionData(selectedMuscles) {
  const sets = await DB.getAll('sets');
  if (!sets.length) return { weeks: [], datasets: {} };

  // Charge aussi les exercices custom pour résoudre les muscles
  const customExercises = await DB.getAll('custom_exercises');
  const customMap = {};
  customExercises.forEach(e => { customMap[e.id] = e; });

  const byWeek = {};
  for (const s of sets) {
    if (!s.weight || s.weight <= 0) continue;
    const d = new Date(s.date);
    const monday = getMonday(d).toISOString().slice(0, 10);

    // Trouve les muscles de cet exercice
    let muscles = resolveExerciseMuscles(s.exerciseId);
    if (!muscles.length && customMap[s.exerciseId]) {
      muscles = customMap[s.exerciseId].muscles || [];
    }

    for (const m of muscles) {
      if (!selectedMuscles.includes(m)) continue;
      if (!byWeek[monday]) byWeek[monday] = {};
      if (!byWeek[monday][m]) byWeek[monday][m] = [];
      byWeek[monday][m].push(s.weight);
    }
  }

  const weeks = Object.keys(byWeek).sort();
  const datasets = {};
  for (const m of selectedMuscles) {
    datasets[m] = weeks.map(w => {
      const vals = (byWeek[w] && byWeek[w][m]) || [];
      if (!vals.length) return null;
      return Math.round((vals.reduce((a, b) => a + b, 0) / vals.length) * 10) / 10;
    });
  }
  return { weeks, datasets };
}

// Activité hebdo : quelles séances faites par semaine
async function getWeeklyActivityData() {
  const workouts = (await DB.getAll('workouts')).filter(w => w.finished);
  if (!workouts.length) return { weeks: [], sessions: {} };

  const byWeek = {};
  for (const w of workouts) {
    const d = new Date(w.date);
    const monday = getMonday(d).toISOString().slice(0, 10);
    if (!byWeek[monday]) byWeek[monday] = [];
    byWeek[monday].push({
      name: w.sessionName || w.sessionId,
      date: w.date.slice(0, 10),
      day: new Date(w.date).toLocaleDateString('fr-FR', { weekday: 'long' }),
    });
  }

  const weeks = Object.keys(byWeek).sort();

  // Collect unique session names
  const sessionNames = new Set();
  weeks.forEach(w => byWeek[w].forEach(s => sessionNames.add(s.name)));

  const sessions = {};
  for (const name of sessionNames) {
    sessions[name] = weeks.map(w => {
      const entries = byWeek[w].filter(s => s.name === name);
      return {
        count: entries.length,
        dates: entries.map(e => `${e.day} ${e.date}`),
      };
    });
  }

  return { weeks, sessions, byWeek };
}

// Volume hebdo par muscle (sets effectifs)
async function getWeeklyVolumeByMuscle() {
  const sets = await DB.getAll('sets');
  if (!sets.length) return { weeks: [], muscles: {} };

  const customExercises = await DB.getAll('custom_exercises');
  const customMap = {};
  customExercises.forEach(e => { customMap[e.id] = e; });

  const byWeek = {};
  for (const s of sets) {
    const d = new Date(s.date);
    const monday = getMonday(d).toISOString().slice(0, 10);
    let muscles = resolveExerciseMuscles(s.exerciseId);
    if (!muscles.length && customMap[s.exerciseId]) {
      muscles = customMap[s.exerciseId].muscles || [];
    }
    if (!muscles.length) continue;
    if (!byWeek[monday]) byWeek[monday] = {};
    for (const m of muscles) {
      byWeek[monday][m] = (byWeek[monday][m] || 0) + 1;
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

// PR table — utilise exerciseName stocké dans le set
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
    rows.push({
      exerciseId: exId,
      name: best.exerciseName || exId,
      bestWeight: best.weight,
      bestReps: best.reps,
      estimate1RM: Math.round(best.estimate * 10) / 10,
      date: best.date.slice(0, 10),
    });
  }
  rows.sort((a, b) => b.estimate1RM - a.estimate1RM);
  return rows;
}

// Stagnation
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
    let bestEver = 0, bestDate = list[0].date;
    for (const s of list) {
      const v = estimate1RM(s.weight, s.reps);
      if (v > bestEver) { bestEver = v; bestDate = s.date; }
    }
    if (now - new Date(bestDate).getTime() > threeWeeksMs) {
      stagnant.push({ exerciseId: exId, name: list[0].exerciseName || exId, since: bestDate.slice(0, 10) });
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

function getMonday(d) {
  const x = new Date(d);
  const day = x.getDay() || 7;
  if (day !== 1) x.setDate(x.getDate() - (day - 1));
  x.setHours(0, 0, 0, 0);
  return x;
}

window.Stats = {
  estimate1RM,
  MUSCLE_LABELS,
  MUSCLE_COLORS,
  getMuscleProgressionData,
  getWeeklyActivityData,
  getWeeklyVolumeByMuscle,
  getPRTable,
  detectStagnation,
  getMeasurementSeries,
  movingAverage,
};
