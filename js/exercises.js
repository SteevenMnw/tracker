// ============================================================================
// exercises.js — Catalogue complet d'exercices + SVG anatomique + YouTube
// ============================================================================

const EXERCISE_CATALOG = [
  // === PECTORAUX ===
  { id: 'bench_press', name: 'Développé couché barre', muscles: ['pectorals', 'triceps', 'front_delts'], isCompound: true, category: 'Pectoraux', equipment: 'barbell' },
  { id: 'incline_bench', name: 'Développé incliné barre', muscles: ['pectorals', 'front_delts', 'triceps'], isCompound: true, category: 'Pectoraux', equipment: 'barbell' },
  { id: 'decline_bench', name: 'Développé décliné barre', muscles: ['pectorals', 'triceps'], isCompound: true, category: 'Pectoraux', equipment: 'barbell' },
  { id: 'incline_db_press', name: 'Développé incliné haltères', muscles: ['pectorals', 'front_delts', 'triceps'], isCompound: true, category: 'Pectoraux', equipment: 'dumbbell' },
  { id: 'flat_db_press', name: 'Développé couché haltères', muscles: ['pectorals', 'triceps', 'front_delts'], isCompound: true, category: 'Pectoraux', equipment: 'dumbbell' },
  { id: 'cable_fly', name: 'Écartés poulie (low-to-high)', muscles: ['pectorals'], isCompound: false, category: 'Pectoraux', equipment: 'cable' },
  { id: 'cable_fly_high', name: 'Écartés poulie haute (high-to-low)', muscles: ['pectorals'], isCompound: false, category: 'Pectoraux', equipment: 'cable' },
  { id: 'pec_deck', name: 'Pec deck (machine)', muscles: ['pectorals'], isCompound: false, category: 'Pectoraux', equipment: 'machine' },
  { id: 'dips_weighted', name: 'Dips lestés', muscles: ['pectorals', 'triceps', 'front_delts'], isCompound: true, category: 'Pectoraux', equipment: 'bodyweight' },
  { id: 'dips_bodyweight', name: 'Dips au poids du corps', muscles: ['pectorals', 'triceps', 'front_delts'], isCompound: true, category: 'Pectoraux', equipment: 'bodyweight' },
  { id: 'pushups', name: 'Pompes', muscles: ['pectorals', 'triceps', 'front_delts'], isCompound: true, category: 'Pectoraux', equipment: 'bodyweight' },
  { id: 'machine_chest_press', name: 'Chest press (machine)', muscles: ['pectorals', 'triceps', 'front_delts'], isCompound: true, category: 'Pectoraux', equipment: 'machine' },

  // === DOS ===
  { id: 'barbell_row', name: 'Rowing barre buste penché', muscles: ['mid_back', 'lats', 'rear_delts', 'biceps'], isCompound: true, category: 'Dos', equipment: 'barbell' },
  { id: 'cable_row', name: 'Tirage horizontal poulie', muscles: ['mid_back', 'lats', 'rear_delts', 'biceps'], isCompound: true, category: 'Dos', equipment: 'cable' },
  { id: 'neutral_pulldown', name: 'Tirage poulie haute prise neutre', muscles: ['lats', 'biceps', 'mid_back'], isCompound: true, category: 'Dos', equipment: 'cable' },
  { id: 'lat_pulldown', name: 'Tirage poulie haute prise large', muscles: ['lats', 'biceps', 'mid_back'], isCompound: true, category: 'Dos', equipment: 'cable' },
  { id: 'close_grip_pulldown', name: 'Tirage poulie haute prise serrée', muscles: ['lats', 'biceps', 'mid_back'], isCompound: true, category: 'Dos', equipment: 'cable' },
  { id: 'pullups', name: 'Tractions pronation', muscles: ['lats', 'biceps', 'mid_back'], isCompound: true, category: 'Dos', equipment: 'bodyweight' },
  { id: 'chinups', name: 'Tractions supination', muscles: ['lats', 'biceps', 'mid_back'], isCompound: true, category: 'Dos', equipment: 'bodyweight' },
  { id: 'db_row', name: 'Rowing haltère un bras', muscles: ['lats', 'mid_back', 'rear_delts', 'biceps'], isCompound: true, category: 'Dos', equipment: 'dumbbell' },
  { id: 'tbar_row', name: 'T-bar row', muscles: ['mid_back', 'lats', 'rear_delts'], isCompound: true, category: 'Dos', equipment: 'barbell' },
  { id: 'seated_row_machine', name: 'Rowing assis (machine)', muscles: ['mid_back', 'lats', 'biceps'], isCompound: true, category: 'Dos', equipment: 'machine' },
  { id: 'face_pull', name: 'Face pull poulie', muscles: ['rear_delts', 'mid_back'], isCompound: false, category: 'Dos', equipment: 'cable' },
  { id: 'straight_arm_pulldown', name: 'Pullover poulie haute bras tendus', muscles: ['lats'], isCompound: false, category: 'Dos', equipment: 'cable' },
  { id: 'hyperextension', name: 'Hyperextension (dos)', muscles: ['lower_back', 'glutes', 'hamstrings'], isCompound: false, category: 'Dos', equipment: 'bodyweight' },
  { id: 'shrugs_bar', name: 'Shrugs barre', muscles: ['traps'], isCompound: false, category: 'Dos', equipment: 'barbell' },
  { id: 'shrugs_db', name: 'Shrugs haltères', muscles: ['traps'], isCompound: false, category: 'Dos', equipment: 'dumbbell' },

  // === ÉPAULES ===
  { id: 'db_ohp_seated', name: 'Développé militaire haltères assis', muscles: ['front_delts', 'side_delts', 'triceps'], isCompound: true, category: 'Épaules', equipment: 'dumbbell' },
  { id: 'ohp_barbell', name: 'Développé militaire barre debout', muscles: ['front_delts', 'side_delts', 'triceps'], isCompound: true, category: 'Épaules', equipment: 'barbell' },
  { id: 'machine_shoulder_press', name: 'Shoulder press (machine)', muscles: ['front_delts', 'side_delts', 'triceps'], isCompound: true, category: 'Épaules', equipment: 'machine' },
  { id: 'lateral_raise', name: 'Élévation latérale haltères', muscles: ['side_delts'], isCompound: false, category: 'Épaules', equipment: 'dumbbell' },
  { id: 'cable_lateral_raise', name: 'Élévation latérale poulie', muscles: ['side_delts'], isCompound: false, category: 'Épaules', equipment: 'cable' },
  { id: 'machine_lateral_raise', name: 'Élévation latérale (machine)', muscles: ['side_delts'], isCompound: false, category: 'Épaules', equipment: 'machine' },
  { id: 'front_raise', name: 'Élévation frontale', muscles: ['front_delts'], isCompound: false, category: 'Épaules', equipment: 'dumbbell' },
  { id: 'rear_delt_fly', name: 'Oiseau haltères (rear delt)', muscles: ['rear_delts'], isCompound: false, category: 'Épaules', equipment: 'dumbbell' },
  { id: 'reverse_pec_deck', name: 'Reverse pec deck (machine)', muscles: ['rear_delts', 'mid_back'], isCompound: false, category: 'Épaules', equipment: 'machine' },
  { id: 'upright_row', name: 'Rowing menton', muscles: ['side_delts', 'traps', 'front_delts'], isCompound: true, category: 'Épaules', equipment: 'barbell' },

  // === BICEPS ===
  { id: 'ez_curl', name: 'Curl EZ debout', muscles: ['biceps'], isCompound: false, category: 'Biceps', ezBarOnly: true, equipment: 'barbell' },
  { id: 'db_curl_incline', name: 'Curl haltères assis incliné', muscles: ['biceps'], isCompound: false, category: 'Biceps', equipment: 'dumbbell' },
  { id: 'db_curl_standing', name: 'Curl haltères debout', muscles: ['biceps'], isCompound: false, category: 'Biceps', equipment: 'dumbbell' },
  { id: 'hammer_curl', name: 'Curl marteau haltères', muscles: ['biceps', 'forearms'], isCompound: false, category: 'Biceps', equipment: 'dumbbell' },
  { id: 'cable_curl', name: 'Curl poulie basse', muscles: ['biceps'], isCompound: false, category: 'Biceps', equipment: 'cable' },
  { id: 'preacher_curl', name: 'Curl pupitre (Larry Scott)', muscles: ['biceps'], isCompound: false, category: 'Biceps', equipment: 'dumbbell' },
  { id: 'concentration_curl', name: 'Curl concentration', muscles: ['biceps'], isCompound: false, category: 'Biceps', equipment: 'dumbbell' },
  { id: 'spider_curl', name: 'Spider curl', muscles: ['biceps'], isCompound: false, category: 'Biceps', equipment: 'dumbbell' },
  { id: 'machine_curl', name: 'Curl (machine)', muscles: ['biceps'], isCompound: false, category: 'Biceps', equipment: 'machine' },

  // === TRICEPS ===
  { id: 'overhead_triceps', name: 'Extension triceps poulie overhead', muscles: ['triceps'], isCompound: false, category: 'Triceps', equipment: 'cable' },
  { id: 'triceps_pushdown', name: 'Pushdown poulie (corde)', muscles: ['triceps'], isCompound: false, category: 'Triceps', equipment: 'cable' },
  { id: 'triceps_pushdown_bar', name: 'Pushdown poulie (barre)', muscles: ['triceps'], isCompound: false, category: 'Triceps', equipment: 'cable' },
  { id: 'skullcrusher', name: 'Skullcrusher barre EZ', muscles: ['triceps'], isCompound: false, category: 'Triceps', ezBarOnly: true, equipment: 'barbell' },
  { id: 'close_grip_bench', name: 'Développé couché prise serrée', muscles: ['triceps', 'pectorals'], isCompound: true, category: 'Triceps', equipment: 'barbell' },
  { id: 'triceps_kickback', name: 'Kickback haltère', muscles: ['triceps'], isCompound: false, category: 'Triceps', equipment: 'dumbbell' },
  { id: 'machine_triceps', name: 'Extension triceps (machine)', muscles: ['triceps'], isCompound: false, category: 'Triceps', equipment: 'machine' },

  // === QUADRICEPS ===
  { id: 'back_squat', name: 'Back squat', muscles: ['quads', 'glutes', 'lower_back'], isCompound: true, category: 'Quadriceps', equipment: 'barbell' },
  { id: 'front_squat', name: 'Front squat', muscles: ['quads', 'glutes'], isCompound: true, category: 'Quadriceps', equipment: 'barbell' },
  { id: 'hack_squat', name: 'Hack squat (machine)', muscles: ['quads', 'glutes'], isCompound: true, category: 'Quadriceps', equipment: 'machine' },
  { id: 'leg_press', name: 'Leg press', muscles: ['quads', 'glutes'], isCompound: true, category: 'Quadriceps', equipment: 'machine' },
  { id: 'leg_press_high', name: 'Leg press (pieds hauts/larges)', muscles: ['hamstrings', 'glutes', 'quads'], isCompound: true, category: 'Quadriceps', equipment: 'machine' },
  { id: 'leg_extension', name: 'Leg extension', muscles: ['quads'], isCompound: false, category: 'Quadriceps', equipment: 'machine' },
  { id: 'bulgarian_split', name: 'Bulgarian split squat haltères', muscles: ['quads', 'glutes', 'hamstrings'], isCompound: true, category: 'Quadriceps', perSide: true, equipment: 'dumbbell' },
  { id: 'goblet_squat', name: 'Goblet squat', muscles: ['quads', 'glutes'], isCompound: true, category: 'Quadriceps', equipment: 'dumbbell' },
  { id: 'lunges', name: 'Fentes marchées', muscles: ['quads', 'glutes', 'hamstrings'], isCompound: true, category: 'Quadriceps', perSide: true, equipment: 'dumbbell' },
  { id: 'smith_squat', name: 'Squat Smith machine', muscles: ['quads', 'glutes'], isCompound: true, category: 'Quadriceps', equipment: 'machine' },
  { id: 'sissy_squat', name: 'Sissy squat', muscles: ['quads'], isCompound: false, category: 'Quadriceps', equipment: 'bodyweight' },

  // === ISCHIO-JAMBIERS ===
  { id: 'rdl', name: 'Romanian deadlift (RDL)', muscles: ['hamstrings', 'glutes', 'lower_back'], isCompound: true, category: 'Ischio-jambiers', equipment: 'barbell' },
  { id: 'seated_leg_curl', name: 'Leg curl assis', muscles: ['hamstrings'], isCompound: false, category: 'Ischio-jambiers', equipment: 'machine' },
  { id: 'lying_leg_curl', name: 'Leg curl couché', muscles: ['hamstrings'], isCompound: false, category: 'Ischio-jambiers', equipment: 'machine' },
  { id: 'stiff_leg_deadlift', name: 'Soulevé de terre jambes tendues', muscles: ['hamstrings', 'glutes', 'lower_back'], isCompound: true, category: 'Ischio-jambiers', equipment: 'barbell' },
  { id: 'good_morning', name: 'Good morning', muscles: ['hamstrings', 'lower_back', 'glutes'], isCompound: true, category: 'Ischio-jambiers', equipment: 'barbell' },
  { id: 'nordic_curl', name: 'Nordic curl', muscles: ['hamstrings'], isCompound: false, category: 'Ischio-jambiers', equipment: 'bodyweight' },
  { id: 'db_rdl', name: 'RDL haltères', muscles: ['hamstrings', 'glutes'], isCompound: true, category: 'Ischio-jambiers', equipment: 'dumbbell' },

  // === FESSIERS ===
  { id: 'hip_thrust', name: 'Hip thrust barre', muscles: ['glutes', 'hamstrings'], isCompound: true, category: 'Fessiers', equipment: 'barbell' },
  { id: 'hip_thrust_machine', name: 'Hip thrust (machine)', muscles: ['glutes', 'hamstrings'], isCompound: true, category: 'Fessiers', equipment: 'machine' },
  { id: 'cable_kickback', name: 'Kickback fessier poulie', muscles: ['glutes'], isCompound: false, category: 'Fessiers', equipment: 'cable' },
  { id: 'glute_bridge', name: 'Glute bridge', muscles: ['glutes'], isCompound: false, category: 'Fessiers', equipment: 'bodyweight' },
  { id: 'hip_abduction', name: 'Abduction hanche (machine)', muscles: ['glutes'], isCompound: false, category: 'Fessiers', equipment: 'machine' },

  // === MOLLETS ===
  { id: 'standing_calf', name: 'Élévation mollets debout machine', muscles: ['calves'], isCompound: false, category: 'Mollets', equipment: 'machine' },
  { id: 'seated_calf', name: 'Élévation mollets assis', muscles: ['calves'], isCompound: false, category: 'Mollets', equipment: 'machine' },
  { id: 'calf_press', name: 'Mollets à la leg press', muscles: ['calves'], isCompound: false, category: 'Mollets', equipment: 'machine' },

  // === ABDOMINAUX ===
  { id: 'cable_crunch', name: 'Crunch poulie haute', muscles: ['abs'], isCompound: false, category: 'Abdominaux', equipment: 'cable' },
  { id: 'hanging_leg_raise', name: 'Relevé de jambes suspendu', muscles: ['abs'], isCompound: false, category: 'Abdominaux', equipment: 'bodyweight' },
  { id: 'ab_wheel', name: 'Ab wheel (roulette)', muscles: ['abs'], isCompound: false, category: 'Abdominaux', equipment: 'bodyweight' },
  { id: 'crunch_machine', name: 'Crunch (machine)', muscles: ['abs'], isCompound: false, category: 'Abdominaux', equipment: 'machine' },
  { id: 'plank', name: 'Planche (gainage)', muscles: ['abs', 'obliques'], isCompound: false, category: 'Abdominaux', isTime: true, equipment: 'bodyweight' },
  { id: 'side_plank', name: 'Gainage latéral planche', muscles: ['obliques', 'abs'], isCompound: false, category: 'Abdominaux', perSide: true, isTime: true, equipment: 'bodyweight' },
  { id: 'russian_twist', name: 'Russian twist', muscles: ['obliques', 'abs'], isCompound: false, category: 'Abdominaux', equipment: 'bodyweight' },
  { id: 'decline_crunch', name: 'Crunch décliné', muscles: ['abs'], isCompound: false, category: 'Abdominaux', equipment: 'bodyweight' },

  // === AVANT-BRAS ===
  { id: 'wrist_curl', name: 'Curl poignet (flexion)', muscles: ['forearms'], isCompound: false, category: 'Avant-bras', equipment: 'dumbbell' },
  { id: 'reverse_wrist_curl', name: 'Curl poignet inversé (extension)', muscles: ['forearms'], isCompound: false, category: 'Avant-bras', equipment: 'dumbbell' },
  { id: 'farmer_walk', name: 'Farmer walk', muscles: ['forearms', 'traps'], isCompound: true, category: 'Avant-bras', equipment: 'dumbbell' },

  // === FULL BODY / COMPOSÉS ===
  { id: 'deadlift', name: 'Soulevé de terre conventionnel', muscles: ['lower_back', 'glutes', 'hamstrings', 'quads', 'traps'], isCompound: true, category: 'Full body', equipment: 'barbell' },
  { id: 'sumo_deadlift', name: 'Soulevé de terre sumo', muscles: ['glutes', 'quads', 'hamstrings', 'lower_back'], isCompound: true, category: 'Full body', equipment: 'barbell' },
  { id: 'clean_and_press', name: 'Épaulé-jeté', muscles: ['quads', 'glutes', 'front_delts', 'traps'], isCompound: true, category: 'Full body', equipment: 'barbell' },
];

// Index par ID pour lookup rapide
const CATALOG_MAP = {};
EXERCISE_CATALOG.forEach(ex => { CATALOG_MAP[ex.id] = ex; });

// Catégories ordonnées
const CATEGORIES = [
  'Pectoraux', 'Dos', 'Épaules', 'Biceps', 'Triceps',
  'Quadriceps', 'Ischio-jambiers', 'Fessiers', 'Mollets',
  'Abdominaux', 'Avant-bras', 'Full body',
];

function getCatalogExercise(id) {
  return CATALOG_MAP[id] || null;
}

async function getFullCatalog() {
  const customs = await DB.getAll('custom_exercises');
  const all = [...EXERCISE_CATALOG, ...customs];
  return all;
}

async function addCustomExercise(exercise) {
  await DB.put('custom_exercises', exercise);
}

// SVG anatomique
const ANATOMY_SVG = `
<svg viewBox="0 0 200 400" xmlns="http://www.w3.org/2000/svg" class="anatomy">
  <g class="silhouette">
    <ellipse cx="100" cy="32" rx="18" ry="22"/>
    <rect x="92" y="52" width="16" height="14"/>
    <path d="M 60 70 Q 50 75 50 82 L 50 100 Q 50 140 55 175 L 70 220 L 130 220 L 145 175 Q 150 140 150 100 L 150 82 Q 150 75 140 70 Z"/>
    <ellipse cx="45" cy="120" rx="12" ry="40"/>
    <ellipse cx="155" cy="120" rx="12" ry="40"/>
    <ellipse cx="42" cy="195" rx="10" ry="38"/>
    <ellipse cx="158" cy="195" rx="10" ry="38"/>
    <ellipse cx="82" cy="270" rx="20" ry="50"/>
    <ellipse cx="118" cy="270" rx="20" ry="50"/>
    <ellipse cx="82" cy="350" rx="14" ry="38"/>
    <ellipse cx="118" cy="350" rx="14" ry="38"/>
  </g>
  <g class="muscles">
    <ellipse data-muscle="traps" cx="100" cy="65" rx="22" ry="9"/>
    <ellipse data-muscle="front_delts" cx="65" cy="80" rx="13" ry="13"/>
    <ellipse data-muscle="front_delts" cx="135" cy="80" rx="13" ry="13"/>
    <ellipse data-muscle="side_delts" cx="52" cy="88" rx="8" ry="14"/>
    <ellipse data-muscle="side_delts" cx="148" cy="88" rx="8" ry="14"/>
    <ellipse data-muscle="rear_delts" cx="55" cy="78" rx="8" ry="10"/>
    <ellipse data-muscle="rear_delts" cx="145" cy="78" rx="8" ry="10"/>
    <ellipse data-muscle="pectorals" cx="82" cy="105" rx="20" ry="18"/>
    <ellipse data-muscle="pectorals" cx="118" cy="105" rx="20" ry="18"/>
    <ellipse data-muscle="biceps" cx="45" cy="115" rx="11" ry="22"/>
    <ellipse data-muscle="biceps" cx="155" cy="115" rx="11" ry="22"/>
    <ellipse data-muscle="triceps" cx="40" cy="135" rx="10" ry="20"/>
    <ellipse data-muscle="triceps" cx="160" cy="135" rx="10" ry="20"/>
    <ellipse data-muscle="forearms" cx="42" cy="200" rx="10" ry="32"/>
    <ellipse data-muscle="forearms" cx="158" cy="200" rx="10" ry="32"/>
    <path data-muscle="lats" d="M 62 95 Q 60 135 70 175 L 80 175 L 80 95 Z"/>
    <path data-muscle="lats" d="M 138 95 Q 140 135 130 175 L 120 175 L 120 95 Z"/>
    <rect data-muscle="mid_back" x="78" y="95" width="44" height="55" rx="6"/>
    <ellipse data-muscle="lower_back" cx="100" cy="180" rx="22" ry="14"/>
    <rect data-muscle="abs" x="86" y="125" width="28" height="55" rx="8"/>
    <ellipse data-muscle="obliques" cx="78" cy="155" rx="6" ry="22"/>
    <ellipse data-muscle="obliques" cx="122" cy="155" rx="6" ry="22"/>
    <ellipse data-muscle="glutes" cx="82" cy="240" rx="18" ry="18"/>
    <ellipse data-muscle="glutes" cx="118" cy="240" rx="18" ry="18"/>
    <ellipse data-muscle="quads" cx="82" cy="275" rx="18" ry="42"/>
    <ellipse data-muscle="quads" cx="118" cy="275" rx="18" ry="42"/>
    <ellipse data-muscle="hamstrings" cx="82" cy="295" rx="18" ry="30"/>
    <ellipse data-muscle="hamstrings" cx="118" cy="295" rx="18" ry="30"/>
    <ellipse data-muscle="calves" cx="82" cy="350" rx="13" ry="36"/>
    <ellipse data-muscle="calves" cx="118" cy="350" rx="13" ry="36"/>
  </g>
</svg>
`;

function buildAnatomySvg(muscles) {
  const wrap = document.createElement('div');
  wrap.innerHTML = ANATOMY_SVG.trim();
  const svg = wrap.firstChild;
  if (muscles && muscles.length) {
    muscles.forEach(m => {
      svg.querySelectorAll(`[data-muscle="${m}"]`).forEach(el => el.classList.add('active'));
    });
  }
  return svg;
}

function buildYouTubeUrl(exerciseName) {
  const q = encodeURIComponent('technique ' + exerciseName);
  return `https://www.youtube.com/results?search_query=${q}`;
}

window.Exercises = {
  EXERCISE_CATALOG,
  CATALOG_MAP,
  CATEGORIES,
  getCatalogExercise,
  getFullCatalog,
  addCustomExercise,
  buildAnatomySvg,
  buildYouTubeUrl,
};
