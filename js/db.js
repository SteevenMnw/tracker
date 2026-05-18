// ============================================================================
// db.js — Wrapper IndexedDB basé sur des Promises
// Stores : workouts, sets, measurements, settings, exercise_history, program_overrides
// ============================================================================

const DB_NAME = 'TrackerDB';
const DB_VERSION = 1;
let _dbPromise = null;

function openDb() {
  if (_dbPromise) return _dbPromise;
  _dbPromise = new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = e => {
      const db = e.target.result;
      // Séances terminées (1 enregistrement par séance)
      if (!db.objectStoreNames.contains('workouts')) {
        const s = db.createObjectStore('workouts', { keyPath: 'id', autoIncrement: true });
        s.createIndex('date', 'date');
        s.createIndex('sessionId', 'sessionId');
      }
      // Sets individuels (1 par set, lié à un workout)
      if (!db.objectStoreNames.contains('sets')) {
        const s = db.createObjectStore('sets', { keyPath: 'id', autoIncrement: true });
        s.createIndex('workoutId', 'workoutId');
        s.createIndex('exerciseId', 'exerciseId');
        s.createIndex('date', 'date');
      }
      // Mensurations corporelles
      if (!db.objectStoreNames.contains('measurements')) {
        const s = db.createObjectStore('measurements', { keyPath: 'id', autoIncrement: true });
        s.createIndex('date', 'date');
      }
      // Paramètres clé-valeur
      if (!db.objectStoreNames.contains('settings')) {
        db.createObjectStore('settings', { keyPath: 'key' });
      }
      // Dernière performance par exercice (cache pour suggestion progression)
      if (!db.objectStoreNames.contains('exercise_history')) {
        db.createObjectStore('exercise_history', { keyPath: 'exerciseId' });
      }
      // Surcharges éventuelles du programme par l'utilisateur (substitutions / ajustements)
      if (!db.objectStoreNames.contains('program_overrides')) {
        db.createObjectStore('program_overrides', { keyPath: 'exerciseId' });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
  return _dbPromise;
}

// Helpers génériques
async function _tx(store, mode) {
  const db = await openDb();
  return db.transaction(store, mode).objectStore(store);
}

function _req(request) {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

// API publique
async function put(store, value) { return _req((await _tx(store, 'readwrite')).put(value)); }
async function add(store, value) { return _req((await _tx(store, 'readwrite')).add(value)); }
async function get(store, key)   { return _req((await _tx(store, 'readonly')).get(key)); }
async function del(store, key)   { return _req((await _tx(store, 'readwrite')).delete(key)); }
async function getAll(store)     { return _req((await _tx(store, 'readonly')).getAll()); }
async function clear(store)      { return _req((await _tx(store, 'readwrite')).clear()); }

async function getByIndex(store, indexName, value) {
  const os = await _tx(store, 'readonly');
  return _req(os.index(indexName).getAll(value));
}

// Setting helpers
async function getSetting(key, fallback = null) {
  const r = await get('settings', key);
  return r ? r.value : fallback;
}
async function setSetting(key, value) {
  return put('settings', { key, value });
}

// Export / import complet
async function exportAll() {
  const stores = ['workouts', 'sets', 'measurements', 'settings',
                  'exercise_history', 'program_overrides'];
  const data = { version: DB_VERSION, exportedAt: new Date().toISOString() };
  for (const s of stores) data[s] = await getAll(s);
  return data;
}

async function importAll(data) {
  const stores = ['workouts', 'sets', 'measurements', 'settings',
                  'exercise_history', 'program_overrides'];
  for (const s of stores) {
    if (!Array.isArray(data[s])) continue;
    await clear(s);
    for (const item of data[s]) {
      try { await add(s, item); } catch (e) { console.warn('skip', s, e); }
    }
  }
}

async function resetAll() {
  const stores = ['workouts', 'sets', 'measurements', 'settings',
                  'exercise_history', 'program_overrides'];
  for (const s of stores) await clear(s);
}

window.DB = {
  put, add, get, del, getAll, clear, getByIndex,
  getSetting, setSetting,
  exportAll, importAll, resetAll,
};
