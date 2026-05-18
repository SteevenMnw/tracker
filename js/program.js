// ============================================================================
// program.js — Programme musculation pré-chargé (Upper/Lower 4x/sem)
// ============================================================================

const SESSIONS = {
  upper_a: {
    id: 'upper_a',
    name: 'Upper A — Force',
    focus: 'Force-orienté : pecs, dos, épaules lourds',
    exercises: [
      {
        id: 'bench_press',
        name: 'Développé couché barre',
        sets: 4, repsMin: 4, repsMax: 6, rest: 210,
        muscles: ['pectorals', 'triceps', 'front_delts'],
        note: 'Mouvement principal force. 3 sets de montée avant.',
        isCompound: true,
      },
      {
        id: 'barbell_row',
        name: 'Rowing barre buste penché',
        sets: 4, repsMin: 5, repsMax: 7, rest: 180,
        muscles: ['mid_back', 'lats', 'rear_delts', 'biceps'],
        note: 'Dos compact, pas de triche lombaire.',
        isCompound: true,
      },
      {
        id: 'db_ohp_seated',
        name: 'Développé militaire haltères assis',
        sets: 3, repsMin: 6, repsMax: 8, rest: 150,
        muscles: ['front_delts', 'side_delts', 'triceps'],
        note: 'Plus facile sur épaule que barre.',
        isCompound: true,
      },
      {
        id: 'neutral_pulldown',
        name: 'Tirage poulie haute prise neutre',
        sets: 3, repsMin: 8, repsMax: 10, rest: 120,
        muscles: ['lats', 'biceps', 'mid_back'],
        note: 'Étirement complet en haut.',
        isCompound: true,
      },
      {
        id: 'dips_weighted',
        name: 'Dips lestés',
        sets: 3, repsMin: 6, repsMax: 10, rest: 150,
        muscles: ['pectorals', 'triceps', 'front_delts'],
        note: 'Penché vers l\'avant = plus pecs.',
        isCompound: true,
      },
      {
        id: 'db_curl_incline',
        name: 'Curl haltères assis incliné',
        sets: 3, repsMin: 8, repsMax: 12, rest: 90,
        muscles: ['biceps'],
        note: 'Position étirée maximale (stretch-mediated). Haltères uniquement.',
        isCompound: false,
      },
    ],
  },

  lower_a: {
    id: 'lower_a',
    name: 'Lower A — Force',
    focus: 'Force-orienté : quads, dos bas',
    exercises: [
      {
        id: 'back_squat',
        name: 'Back squat',
        sets: 4, repsMin: 4, repsMax: 6, rest: 270,
        muscles: ['quads', 'glutes', 'lower_back'],
        note: 'Profondeur cuisse parallèle min. 3 sets de montée.',
        isCompound: true,
      },
      {
        id: 'rdl',
        name: 'Romanian deadlift (RDL)',
        sets: 4, repsMin: 6, repsMax: 8, rest: 180,
        muscles: ['hamstrings', 'glutes', 'lower_back'],
        note: 'Étirement ischios max, pas de flexion lombaire.',
        isCompound: true,
      },
      {
        id: 'hack_squat',
        name: 'Hack squat (machine)',
        sets: 3, repsMin: 8, repsMax: 10, rest: 150,
        muscles: ['quads', 'glutes'],
        note: 'Pieds bas = plus quads. Profondeur complète.',
        isCompound: true,
      },
      {
        id: 'seated_leg_curl',
        name: 'Leg curl assis',
        sets: 3, repsMin: 10, repsMax: 12, rest: 90,
        muscles: ['hamstrings'],
        note: 'Stretch-mediated. Pause 1 s position étirée.',
        isCompound: false,
      },
      {
        id: 'standing_calf',
        name: 'Élévation mollets debout machine',
        sets: 4, repsMin: 10, repsMax: 15, rest: 60,
        muscles: ['calves'],
        note: 'Pause 1 s en bas (étiré), 1 s en haut.',
        isCompound: false,
      },
      {
        id: 'cable_crunch',
        name: 'Crunch poulie haute',
        sets: 3, repsMin: 12, repsMax: 15, rest: 60,
        muscles: ['abs'],
        note: 'Abdos directs 1x/sem suffisant.',
        isCompound: false,
      },
    ],
  },

  upper_b: {
    id: 'upper_b',
    name: 'Upper B — Volume',
    focus: 'Volume-orienté : bras, épaules, dos en isolation',
    exercises: [
      {
        id: 'incline_db_press',
        name: 'Développé incliné haltères',
        sets: 4, repsMin: 8, repsMax: 10, rest: 150,
        muscles: ['pectorals', 'front_delts', 'triceps'],
        note: 'Étirement complet en bas, pas de pause au top.',
        isCompound: true,
      },
      {
        id: 'cable_row',
        name: 'Tirage horizontal poulie',
        sets: 4, repsMin: 8, repsMax: 10, rest: 150,
        muscles: ['mid_back', 'lats', 'rear_delts', 'biceps'],
        note: 'Tirer vers le bas du sternum.',
        isCompound: true,
      },
      {
        id: 'lateral_raise',
        name: 'Élévation latérale haltères',
        sets: 4, repsMin: 10, repsMax: 14, rest: 75,
        muscles: ['side_delts'],
        note: 'Léger, pas de triche. Coude légèrement plié.',
        isCompound: false,
      },
      {
        id: 'cable_fly',
        name: 'Écartés poulie basse (low-to-high)',
        sets: 3, repsMin: 10, repsMax: 12, rest: 90,
        muscles: ['pectorals'],
        note: 'Stretch-mediated. Pause 1 s en bas.',
        isCompound: false,
      },
      {
        id: 'overhead_triceps',
        name: 'Triceps poulie corde overhead extension',
        sets: 3, repsMin: 10, repsMax: 12, rest: 75,
        muscles: ['triceps'],
        note: 'Position étirée (long head triceps).',
        isCompound: false,
      },
      {
        id: 'ez_curl',
        name: 'Curl EZ debout',
        sets: 3, repsMin: 8, repsMax: 10, rest: 90,
        muscles: ['biceps'],
        note: 'Barre EZ uniquement pour ménager les coudes.',
        ezBarOnly: true,
        isCompound: false,
      },
      {
        id: 'hammer_curl',
        name: 'Curl marteau haltères',
        sets: 3, repsMin: 10, repsMax: 12, rest: 75,
        muscles: ['biceps', 'forearms'],
        note: 'Travaille brachial + avant-bras.',
        isCompound: false,
      },
      {
        id: 'face_pull',
        name: 'Face pull poulie',
        sets: 3, repsMin: 12, repsMax: 15, rest: 60,
        muscles: ['rear_delts', 'mid_back'],
        note: 'Deltoïde arrière + rotators.',
        isCompound: false,
      },
    ],
  },

  lower_b: {
    id: 'lower_b',
    name: 'Lower B — Volume',
    focus: 'Volume-orienté : ischios, fessiers, mollets',
    exercises: [
      {
        id: 'leg_press_high',
        name: 'Leg press (pieds hauts/larges)',
        sets: 4, repsMin: 10, repsMax: 12, rest: 180,
        muscles: ['hamstrings', 'glutes', 'quads'],
        note: 'Position pieds = focus ischios/glutes. Profondeur max.',
        isCompound: true,
      },
      {
        id: 'bulgarian_split',
        name: 'Bulgarian split squat haltères',
        sets: 3, repsMin: 8, repsMax: 10, rest: 120,
        muscles: ['quads', 'glutes', 'hamstrings'],
        note: 'Pied avant loin = glute. Unilatéral (par jambe).',
        perSide: true,
        isCompound: true,
      },
      {
        id: 'lying_leg_curl',
        name: 'Leg curl couché',
        sets: 4, repsMin: 8, repsMax: 12, rest: 90,
        muscles: ['hamstrings'],
        note: 'Variation par rapport au leg curl assis du mardi.',
        isCompound: false,
      },
      {
        id: 'hip_thrust',
        name: 'Hip thrust barre',
        sets: 3, repsMin: 10, repsMax: 12, rest: 120,
        muscles: ['glutes', 'hamstrings'],
        note: 'Contraction max au sommet 1 s.',
        isCompound: true,
      },
      {
        id: 'leg_extension',
        name: 'Leg extension',
        sets: 3, repsMin: 12, repsMax: 15, rest: 75,
        muscles: ['quads'],
        note: 'Finition quads.',
        isCompound: false,
      },
      {
        id: 'seated_calf',
        name: 'Élévation mollets assis',
        sets: 4, repsMin: 12, repsMax: 15, rest: 60,
        muscles: ['calves'],
        note: 'Soleus (fibres lentes), variation/debout.',
        isCompound: false,
      },
      {
        id: 'side_plank',
        name: 'Gainage latéral planche',
        sets: 3, repsMin: 30, repsMax: 45, rest: 45,
        muscles: ['obliques', 'abs'],
        note: 'Secondes par côté. Obliques + stabilité.',
        perSide: true,
        isCompound: false,
        isTime: true,
      },
    ],
  },
};

// Génère un ID unique pour les séances custom
function generateId() {
  return 'custom_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 6);
}

// Charge toutes les séances (pré-chargées + custom depuis IndexedDB)
async function getAllSessions() {
  const customs = await DB.getAll('custom_sessions');
  const all = { ...SESSIONS };
  for (const c of customs) {
    all[c.id] = c;
  }
  return all;
}

// Sauvegarde une séance custom
async function saveCustomSession(session) {
  await DB.put('custom_sessions', session);
}

// Supprime une séance custom
async function deleteCustomSession(sessionId) {
  await DB.del('custom_sessions', sessionId);
}

window.Program = {
  SESSIONS,
  generateId,
  getAllSessions,
  saveCustomSession,
  deleteCustomSession,
};
