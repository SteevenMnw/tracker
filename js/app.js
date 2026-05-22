// ============================================================================
// app.js — Logique principale : routing, rendu des 5 onglets, init
// ============================================================================

function confirmDialog(message, { title = 'Confirmation', confirmLabel = 'Supprimer', danger = true } = {}) {
  return new Promise(resolve => {
    const modal = document.getElementById('confirm-modal');
    document.getElementById('confirm-title').textContent = title;
    document.getElementById('confirm-message').textContent = message;
    const yesBtn = document.getElementById('confirm-yes');
    yesBtn.textContent = confirmLabel;
    yesBtn.className = danger ? 'btn btn-danger' : 'btn btn-primary';
    modal.classList.add('open');
    function cleanup(val) {
      modal.classList.remove('open');
      document.getElementById('confirm-yes').removeEventListener('click', onYes);
      document.getElementById('confirm-no').removeEventListener('click', onNo);
      resolve(val);
    }
    function onYes() { cleanup(true); }
    function onNo() { cleanup(false); }
    document.getElementById('confirm-yes').addEventListener('click', onYes);
    document.getElementById('confirm-no').addEventListener('click', onNo);
  });
}

function abortChoiceDialog() {
  return new Promise(resolve => {
    const modal = document.getElementById('abort-choice-modal');
    modal.classList.add('open');
    function cleanup(val) {
      modal.classList.remove('open');
      saveBtn.removeEventListener('click', onSave);
      discardBtn.removeEventListener('click', onDiscard);
      cancelBtn.removeEventListener('click', onCancel);
      resolve(val);
    }
    const saveBtn = document.getElementById('abort-save');
    const discardBtn = document.getElementById('abort-discard');
    const cancelBtn = document.getElementById('abort-cancel');
    function onSave() { cleanup('save'); }
    function onDiscard() { cleanup('discard'); }
    function onCancel() { cleanup('cancel'); }
    saveBtn.addEventListener('click', onSave);
    discardBtn.addEventListener('click', onDiscard);
    cancelBtn.addEventListener('click', onCancel);
  });
}

function showToast(message, duration = 2000) {
  const existing = document.querySelector('.toast');
  if (existing) existing.remove();
  const toast = document.createElement('div');
  toast.className = 'toast';
  toast.textContent = message;
  document.body.appendChild(toast);
  requestAnimationFrame(() => toast.classList.add('show'));
  setTimeout(() => {
    toast.classList.remove('show');
    setTimeout(() => toast.remove(), 300);
  }, duration);
}

const App = (() => {
  let charts = {};

  async function init() {
    const theme = await DB.getSetting('theme', 'dark');
    document.documentElement.dataset.theme = theme;
    const units = await DB.getSetting('units', 'metric');
    document.documentElement.dataset.units = units;
    bindTabs();
    bindGlobal();
    await renderSessions();
    registerServiceWorker();
    requestNotificationPermission();
  }

  function bindTabs() {
    document.querySelectorAll('.tab-btn').forEach(btn => {
      btn.addEventListener('click', () => switchTab(btn.dataset.screen));
    });
  }

  function switchTab(name) {
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    document.getElementById('screen-' + name).classList.add('active');
    document.querySelector(`.tab-btn[data-screen="${name}"]`).classList.add('active');
    if (name === 'sessions') renderSessions();
    if (name === 'history') renderHistory();
    if (name === 'stats') renderStats();
    if (name === 'measurements') renderMeasurements();
    if (name === 'settings') renderSettings();
  }

  function bindGlobal() {
    document.getElementById('finish-confirm').addEventListener('click', async () => {
      const note = document.getElementById('finish-note').value;
      await Workout.finishSession(note);
      document.getElementById('finish-modal').classList.remove('open');
      document.getElementById('finish-note').value = '';
      switchTab('history');
    });
    document.getElementById('finish-cancel').addEventListener('click', () => {
      document.getElementById('finish-modal').classList.remove('open');
    });
    document.getElementById('timer-skip').addEventListener('click', () => Workout.cancelTimer());
    document.getElementById('timer-plus').addEventListener('click', () => Workout.adjustTimer(15));
    document.getElementById('timer-minus').addEventListener('click', () => Workout.adjustTimer(-15));
    document.getElementById('workout-abort').addEventListener('click', async () => {
      if (Workout.isActive()) {
        const choice = await abortChoiceDialog();
        if (choice === 'save') {
          await Workout.pauseSession();
          if (document.querySelector('#screen-history.active')) renderHistory();
        } else if (choice === 'discard') {
          await Workout.abortSession();
          if (document.querySelector('#screen-history.active')) renderHistory();
        }
      } else {
        document.getElementById('workout-modal').classList.remove('open');
      }
    });
  }

  // ======== Helpers ========
  function timeAgo(dateStr) {
    const d = new Date(dateStr);
    const now = new Date();
    const todayStr = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')}`;
    const dStr = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
    if (dStr === todayStr) return "Aujourd'hui";
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    const yStr = `${yesterday.getFullYear()}-${String(yesterday.getMonth()+1).padStart(2,'0')}-${String(yesterday.getDate()).padStart(2,'0')}`;
    if (dStr === yStr) return 'Hier';
    const diff = Math.floor((now - d) / 86400000);
    if (diff < 7) return `Il y a ${diff}j`;
    if (diff < 30) return `Il y a ${Math.floor(diff / 7)} sem.`;
    return `Il y a ${Math.floor(diff / 30)} mois`;
  }

  function formatDuration(startISO, endISO) {
    if (!startISO || !endISO) return null;
    const ms = new Date(endISO) - new Date(startISO);
    const mins = Math.round(ms / 60000);
    if (mins < 60) return `${mins} min`;
    return `${Math.floor(mins / 60)}h${String(mins % 60).padStart(2, '0')}`;
  }

  // ======== SÉANCES ========
  async function renderSessions() {
    const root = document.getElementById('screen-sessions');
    const allSessions = await Program.getAllSessions();
    const workouts = (await DB.getAll('workouts')).filter(w => w.finished);

    // Compute weekly count
    const now = new Date();
    const weekStart = new Date(now);
    weekStart.setDate(now.getDate() - now.getDay() + (now.getDay() === 0 ? -6 : 1));
    weekStart.setHours(0, 0, 0, 0);
    const thisWeekCount = workouts.filter(w => new Date(w.date) >= weekStart).length;
    const totalCount = workouts.length;

    let html = `
      <h1 class="screen-title">Séances</h1>
      <div class="kpi-row">
        <div class="kpi-card">
          <span class="kpi-value">${thisWeekCount}</span>
          <span class="kpi-label">Cette semaine</span>
        </div>
        <div class="kpi-card">
          <span class="kpi-value">${totalCount}</span>
          <span class="kpi-label">Total séances</span>
        </div>
        <div class="kpi-card">
          <span class="kpi-value">${computeStreak(workouts)}</span>
          <span class="kpi-label">Série (sem.)</span>
        </div>
      </div>
    `;

    for (const [sid, session] of Object.entries(allSessions)) {
      const isCustom = sid.startsWith('custom_');
      const exCount = session.exercises.length;
      const avgRest = exCount ? Math.round(session.exercises.reduce((a, e) => a + (e.rest || 0), 0) / exCount) : 0;
      const restLabel = avgRest >= 60 ? Math.round(avgRest / 60) + ' min' : avgRest + 's';
      const totalSets = session.exercises.reduce((a, e) => a + (e.sets || 0), 0);

      const muscleSet = new Set();
      session.exercises.forEach(ex => {
        const cat = Exercises.getCatalogExercise(ex.id);
        const muscles = cat ? cat.muscles : (ex.muscles || []);
        muscles.forEach(m => muscleSet.add(m));
      });
      const muscleLabels = [...muscleSet].slice(0, 5).map(m => Stats.MUSCLE_LABELS[m] || m);

      const lastWorkout = workouts.filter(w => w.sessionId === sid).sort((a, b) => b.date.localeCompare(a.date))[0];
      const lastStr = lastWorkout ? timeAgo(lastWorkout.date) : null;
      const focusType = (session.focus || '').toLowerCase().includes('force') ? 'force' : 'volume';

      html += `
        <div class="card session-card" data-stagger>
          <div class="session-card-head">
            <div>
              <div class="session-title-row">
                <span class="session-type-badge session-type-${focusType}">${focusType === 'force' ? '🏋️ Force' : '🔥 Volume'}</span>
                ${isCustom ? `<button class="btn btn-tiny btn-ghost session-delete" data-sid="${sid}" title="Supprimer">🗑️</button>` : ''}
              </div>
              <h2>${session.name}</h2>
              ${session.focus ? `<p class="muted small">${session.focus}</p>` : ''}
            </div>
          </div>
          <div class="session-tags">
            ${muscleLabels.map(m => `<span class="tag">${m}</span>`).join('')}
          </div>
          <div class="session-meta-grid">
            <div class="session-meta-item">
              <span class="session-meta-icon">📋</span>
              <span><strong>${exCount}</strong> exos</span>
            </div>
            <div class="session-meta-item">
              <span class="session-meta-icon">🔁</span>
              <span><strong>${totalSets}</strong> sets</span>
            </div>
            <div class="session-meta-item">
              <span class="session-meta-icon">⏱️</span>
              <span>${restLabel} repos</span>
            </div>
            ${lastStr ? `<div class="session-meta-item">
              <span class="session-meta-icon">📅</span>
              <span>${lastStr}</span>
            </div>` : ''}
          </div>
          <button class="btn btn-primary btn-block session-start" data-sid="${sid}">
            Commencer la séance
          </button>
        </div>
      `;
    }

    html += `<button class="btn btn-ghost btn-block" id="create-session-btn" style="margin-top:8px;">+ Créer une séance</button>`;
    root.innerHTML = html;

    root.querySelectorAll('.session-start').forEach(btn => {
      btn.addEventListener('click', () => Workout.startSession(btn.dataset.sid));
    });
    root.querySelectorAll('.session-delete').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        e.stopPropagation();
        if (await confirmDialog('Cette séance et tout son historique (sets, stats) seront supprimés.', { title: 'Supprimer la séance ?' })) {
          const sid = btn.dataset.sid;
          const deletedExIds = new Set();
          const ws = (await DB.getAll('workouts')).filter(w => w.sessionId === sid);
          for (const w of ws) {
            const sets = await DB.getByIndex('sets', 'workoutId', w.id);
            for (const s of sets) {
              deletedExIds.add(s.exerciseId);
              await DB.del('sets', s.id);
            }
            await DB.del('workouts', w.id);
          }
          // Clean exercise_history for exercises that no longer have sets
          const remainingSets = await DB.getAll('sets');
          const activeExIds = new Set(remainingSets.map(s => s.exerciseId));
          for (const exId of deletedExIds) {
            if (!activeExIds.has(exId)) {
              await DB.del('exercise_history', exId);
            }
          }
          await Program.deleteCustomSession(sid);
          renderSessions();
        }
      });
    });
    document.getElementById('create-session-btn').addEventListener('click', () => openCreateSession());
  }

  function computeStreak(workouts) {
    if (!workouts.length) return 0;
    const weekSet = new Set();
    for (const w of workouts) {
      const d = new Date(w.date);
      const monday = new Date(d);
      const day = monday.getDay() || 7;
      if (day !== 1) monday.setDate(monday.getDate() - (day - 1));
      weekSet.add(monday.toISOString().slice(0, 10));
    }
    const sorted = [...weekSet].sort().reverse();
    let streak = 0;
    const now = new Date();
    const curMonday = new Date(now);
    const cd = curMonday.getDay() || 7;
    if (cd !== 1) curMonday.setDate(curMonday.getDate() - (cd - 1));

    for (let i = 0; i < 200; i++) {
      const check = new Date(curMonday);
      check.setDate(check.getDate() - i * 7);
      const key = check.toISOString().slice(0, 10);
      if (sorted.includes(key)) streak++;
      else break;
    }
    return streak;
  }

  // ======== CRÉATION DE SÉANCE (catalogue) ========
  function openCreateSession() {
    const modal = document.getElementById('workout-modal');
    const root = document.getElementById('workout-content');
    root.innerHTML = `
      <h2>Nouvelle séance</h2>
      <form id="create-session-form" class="create-form">
        <label>Nom de la séance
          <input type="text" id="cs-name" required placeholder="Ex: Push Day">
        </label>
        <label>Description courte
          <input type="text" id="cs-focus" placeholder="Ex: Pecs, épaules, triceps">
        </label>
        <h3>Exercices</h3>
        <div id="cs-exercises"></div>
        <button type="button" class="btn btn-ghost btn-block" id="cs-add-exercise">+ Ajouter un exercice</button>
        <div class="create-actions">
          <button type="button" class="btn btn-ghost" id="cs-cancel">Annuler</button>
          <button type="submit" class="btn btn-primary">Enregistrer</button>
        </div>
      </form>
    `;
    modal.classList.add('open');

    document.getElementById('cs-add-exercise').addEventListener('click', () => openExercisePicker());
    document.getElementById('cs-cancel').addEventListener('click', () => {
      modal.classList.remove('open');
      renderSessions();
    });

    document.getElementById('create-session-form').addEventListener('submit', async (e) => {
      e.preventDefault();
      const name = document.getElementById('cs-name').value.trim();
      const focus = document.getElementById('cs-focus').value.trim();
      if (!name) return;

      const rows = document.querySelectorAll('.cs-exercise-row');
      const exercises = [];
      rows.forEach(row => {
        const exId = row.dataset.exerciseId;
        const exName = row.dataset.exerciseName;
        if (!exId) return;
        exercises.push({
          id: exId,
          name: exName,
          sets: parseInt(row.querySelector('.cs-ex-sets').value) || 3,
          repsMin: parseInt(row.querySelector('.cs-ex-rmin').value) || 8,
          repsMax: parseInt(row.querySelector('.cs-ex-rmax').value) || 12,
          rest: parseInt(row.querySelector('.cs-ex-rest').value) || 120,
          muscles: JSON.parse(row.dataset.muscles || '[]'),
          note: row.querySelector('.cs-ex-note')?.value.trim() || '',
          isCompound: row.dataset.isCompound === 'true',
          ezBarOnly: row.dataset.ezBarOnly === 'true',
          perSide: row.dataset.perSide === 'true',
          isTime: row.dataset.isTime === 'true',
        });
      });

      if (!exercises.length) { alert('Ajoute au moins un exercice.'); return; }

      const session = { id: Program.generateId(), name, focus, exercises };
      await Program.saveCustomSession(session);
      modal.classList.remove('open');
      renderSessions();
    });
  }

  function addExerciseToForm(exercise) {
    const container = document.getElementById('cs-exercises');
    const cat = Exercises.getCatalogExercise(exercise.id) || exercise;
    const div = document.createElement('div');
    div.className = 'cs-exercise-row';
    div.dataset.exerciseId = exercise.id;
    div.dataset.exerciseName = exercise.name;
    div.dataset.muscles = JSON.stringify(cat.muscles || exercise.muscles || []);
    div.dataset.isCompound = String(cat.isCompound || false);
    div.dataset.ezBarOnly = String(cat.ezBarOnly || false);
    div.dataset.perSide = String(cat.perSide || false);
    div.dataset.isTime = String(cat.isTime || false);

    const muscleLabels = (cat.muscles || []).slice(0, 3).map(m => Stats.MUSCLE_LABELS[m] || m);

    div.innerHTML = `
      <div class="cs-exercise-header">
        <div>
          <strong>${exercise.name}</strong>
          <div class="cs-muscle-tags">${muscleLabels.map(m => `<span class="tag tag-small">${m}</span>`).join('')}</div>
        </div>
        <button type="button" class="btn btn-tiny btn-ghost cs-remove-ex">✕</button>
      </div>
      <div class="cs-row-grid">
        <label>Séries <input type="number" class="cs-ex-sets" value="3" min="1" inputmode="numeric"></label>
        <label>Reps min <input type="number" class="cs-ex-rmin" value="8" min="1" inputmode="numeric"></label>
        <label>Reps max <input type="number" class="cs-ex-rmax" value="12" min="1" inputmode="numeric"></label>
        <label>Repos (s) <input type="number" class="cs-ex-rest" value="120" min="0" inputmode="numeric"></label>
      </div>
    `;
    div.querySelector('.cs-remove-ex').addEventListener('click', () => div.remove());
    container.appendChild(div);
  }

  async function openExercisePicker() {
    const allExercises = await Exercises.getFullCatalog();
    const overlay = document.createElement('div');
    overlay.className = 'picker-overlay';
    overlay.innerHTML = `
      <div class="picker-dialog">
        <div class="picker-header">
          <h3>Choisir un exercice</h3>
          <button class="btn btn-tiny btn-ghost picker-close">✕</button>
        </div>
        <input type="text" id="picker-search" class="picker-search" placeholder="Rechercher un exercice..." autofocus>
        <div id="picker-list" class="picker-list"></div>
        <div class="picker-footer">
          <button class="btn btn-ghost btn-block" id="picker-create-new">+ Créer un nouvel exercice</button>
        </div>
      </div>
    `;
    document.body.appendChild(overlay);

    const listEl = overlay.querySelector('#picker-list');
    const searchEl = overlay.querySelector('#picker-search');

    function renderList(filter = '') {
      const lower = filter.toLowerCase();
      let html = '';
      for (const cat of Exercises.CATEGORIES) {
        const exs = allExercises.filter(e => (e.category === cat || (!e.category && cat === 'Autre')) && e.name.toLowerCase().includes(lower));
        if (!exs.length) continue;
        html += `<div class="picker-category">${cat}</div>`;
        for (const ex of exs) {
          const muscleLabels = (ex.muscles || []).slice(0, 3).map(m => Stats.MUSCLE_LABELS[m] || m);
          html += `
            <button type="button" class="picker-item" data-id="${ex.id}">
              <span class="picker-item-name">${ex.name}</span>
              <span class="picker-item-muscles">${muscleLabels.join(' · ')}</span>
            </button>
          `;
        }
      }
      const others = allExercises.filter(e => !Exercises.CATEGORIES.includes(e.category) && e.name.toLowerCase().includes(lower));
      if (others.length) {
        html += `<div class="picker-category">Autre</div>`;
        for (const ex of others) {
          html += `<button type="button" class="picker-item" data-id="${ex.id}"><span class="picker-item-name">${ex.name}</span></button>`;
        }
      }
      listEl.innerHTML = html || '<div class="empty-state"><p class="empty-state-icon">🔍</p><p>Aucun exercice trouvé.</p></div>';

      listEl.querySelectorAll('.picker-item').forEach(btn => {
        btn.addEventListener('click', () => {
          const ex = allExercises.find(e => e.id === btn.dataset.id);
          if (ex) addExerciseToForm(ex);
          overlay.remove();
        });
      });
    }

    renderList();
    searchEl.addEventListener('input', () => renderList(searchEl.value));
    overlay.querySelector('.picker-close').addEventListener('click', () => overlay.remove());
    overlay.addEventListener('click', (e) => { if (e.target === overlay) overlay.remove(); });

    overlay.querySelector('#picker-create-new').addEventListener('click', () => {
      overlay.remove();
      openCreateExercise();
    });
  }

  function openCreateExercise() {
    const overlay = document.createElement('div');
    overlay.className = 'picker-overlay';
    const muscleOptions = Object.entries(Stats.MUSCLE_LABELS)
      .map(([k, v]) => `<label class="muscle-check"><input type="checkbox" value="${k}"> ${v}</label>`)
      .join('');

    overlay.innerHTML = `
      <div class="picker-dialog">
        <div class="picker-header">
          <h3>Nouvel exercice</h3>
          <button class="btn btn-tiny btn-ghost picker-close">✕</button>
        </div>
        <form id="new-exercise-form" class="create-form" style="padding:0 16px 16px;">
          <label>Nom de l'exercice <input type="text" id="ne-name" required placeholder="Ex: Cable fly unilatéral"></label>
          <label>Catégorie
            <select id="ne-category">
              ${Exercises.CATEGORIES.map(c => `<option value="${c}">${c}</option>`).join('')}
            </select>
          </label>
          <div class="ne-muscles-section">
            <p class="small muted">Muscles ciblés :</p>
            <div class="muscle-grid">${muscleOptions}</div>
          </div>
          <label class="toggle-row" style="border:none;padding:8px 0;">
            <span>Exercice composé</span>
            <input type="checkbox" id="ne-compound">
          </label>
          <button type="submit" class="btn btn-primary btn-block">Créer et ajouter</button>
        </form>
      </div>
    `;
    document.body.appendChild(overlay);

    overlay.querySelector('.picker-close').addEventListener('click', () => overlay.remove());
    overlay.addEventListener('click', (e) => { if (e.target === overlay) overlay.remove(); });

    overlay.querySelector('#new-exercise-form').addEventListener('submit', async (e) => {
      e.preventDefault();
      const name = overlay.querySelector('#ne-name').value.trim();
      if (!name) return;
      const category = overlay.querySelector('#ne-category').value;
      const muscles = [...overlay.querySelectorAll('.muscle-check input:checked')].map(c => c.value);
      const isCompound = overlay.querySelector('#ne-compound').checked;
      const id = 'user_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 5);
      const exercise = { id, name, muscles, isCompound, category };
      await Exercises.addCustomExercise(exercise);
      addExerciseToForm(exercise);
      overlay.remove();
    });
  }

  // ======== HISTORIQUE ========
  async function renderHistory() {
    const root = document.getElementById('screen-history');
    const allWorkouts = (await DB.getAll('workouts'))
      .sort((a, b) => b.date.localeCompare(a.date));
    const pendingWorkouts = allWorkouts.filter(w => !w.finished);
    const workouts = allWorkouts.filter(w => w.finished);

    let html = '<h1 class="screen-title">Historique</h1>';

    // Séances en cours
    if (pendingWorkouts.length) {
      for (const pw of pendingWorkouts) {
        const sets = await DB.getByIndex('sets', 'workoutId', pw.id);
        html += `
          <div class="card history-card pending-card" data-stagger>
            <div class="history-card-head">
              <div class="history-card-info">
                <h3>${pw.sessionName || pw.sessionId} <span class="tag tag-small" style="background:var(--warning);color:#000;">En cours</span></h3>
                <div class="history-card-stats">
                  <span class="history-stat">🔁 ${sets.length} sets</span>
                  <span class="history-stat">${timeAgo(pw.date)}</span>
                </div>
              </div>
              <div class="history-actions">
                <button class="btn btn-small btn-primary resume-workout" data-wid="${pw.id}">Reprendre</button>
                <button class="btn btn-tiny btn-ghost history-delete" data-wid="${pw.id}">🗑️</button>
              </div>
            </div>
          </div>
        `;
      }
    }

    if (!workouts.length && !pendingWorkouts.length) {
      html += `<div class="empty-state-card">
        <p class="empty-state-icon">📋</p>
        <p class="empty-state-text">Aucune séance enregistrée</p>
        <p class="empty-state-sub">Commence une séance pour la voir apparaître ici.</p>
      </div>`;
      root.innerHTML = html;
      return;
    }

    if (!workouts.length) {
      root.innerHTML = html;
      bindHistoryListeners(root);
      return;
    }

    // Summary KPIs
    const totalVol = workouts.reduce((a, w) => a + (w.totalVolume || 0), 0);
    const totalSets = workouts.reduce((a, w) => a + (w.totalSets || 0), 0);
    html += `
      <div class="kpi-row">
        <div class="kpi-card">
          <span class="kpi-value">${workouts.length}</span>
          <span class="kpi-label">Séances</span>
        </div>
        <div class="kpi-card">
          <span class="kpi-value">${totalSets}</span>
          <span class="kpi-label">Sets totaux</span>
        </div>
        <div class="kpi-card">
          <span class="kpi-value">${totalVol >= 1000 ? Math.round(totalVol / 1000) + 'T' : Math.round(totalVol)}</span>
          <span class="kpi-label">Volume (kg)</span>
        </div>
      </div>
    `;

    // Group by date
    let lastDateGroup = '';
    for (const w of workouts) {
      const d = new Date(w.date);
      const dateGroup = d.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' });
      if (dateGroup !== lastDateGroup) {
        html += `<div class="history-date-header">${dateGroup}</div>`;
        lastDateGroup = dateGroup;
      }

      const vol = w.totalVolume ? Math.round(w.totalVolume).toLocaleString('fr-FR') + ' kg' : '—';
      const duration = formatDuration(w.date, w.finishedAt);
      const maxVol = Math.max(...workouts.map(x => x.totalVolume || 0), 1);
      const volPercent = Math.round(((w.totalVolume || 0) / maxVol) * 100);

      html += `
        <div class="card history-card" data-stagger>
          <div class="history-card-head">
            <div class="history-card-info">
              <h3>${w.sessionName || w.sessionId}</h3>
              <div class="history-card-stats">
                <span class="history-stat">🔁 ${w.totalSets || 0} sets</span>
                <span class="history-stat">🏋️ ${vol}</span>
                ${duration ? `<span class="history-stat">⏱️ ${duration}</span>` : ''}
              </div>
            </div>
            <div class="history-actions">
              <button class="btn btn-small btn-ghost history-view" data-wid="${w.id}">Détails</button>
              <button class="btn btn-tiny btn-ghost history-delete" data-wid="${w.id}">🗑️</button>
            </div>
          </div>
          <div class="history-vol-bar"><div class="history-vol-fill" style="width:${volPercent}%"></div></div>
          ${w.note ? `<p class="small muted" style="margin-top:8px;font-style:italic;">${w.note}</p>` : ''}
        </div>
      `;
    }

    root.innerHTML = html;
    bindHistoryListeners(root);
  }

  async function deleteWorkoutFull(wid) {
    const sets = await DB.getByIndex('sets', 'workoutId', wid);
    const deletedExIds = new Set(sets.map(s => s.exerciseId));
    for (const s of sets) await DB.del('sets', s.id);
    await DB.del('workouts', wid);
    const remainingSets = await DB.getAll('sets');
    const activeExIds = new Set(remainingSets.map(s => s.exerciseId));
    for (const exId of deletedExIds) {
      if (!activeExIds.has(exId)) {
        await DB.del('exercise_history', exId);
      }
    }
  }

  function bindHistoryListeners(root) {
    root.querySelectorAll('.resume-workout').forEach(btn => {
      btn.addEventListener('click', async () => {
        await Workout.resumeSession(parseInt(btn.dataset.wid));
      });
    });
    root.querySelectorAll('.history-view').forEach(btn => {
      btn.addEventListener('click', () => openWorkoutDetail(parseInt(btn.dataset.wid)));
    });
    root.querySelectorAll('.history-delete').forEach(btn => {
      btn.addEventListener('click', async () => {
        if (await confirmDialog('Cette séance et tous ses sets seront supprimés.', { title: 'Supprimer de l\'historique ?' })) {
          await deleteWorkoutFull(parseInt(btn.dataset.wid));
          renderHistory();
        }
      });
    });
  }

  async function openWorkoutDetail(workoutId) {
    const workout = await DB.get('workouts', workoutId);
    if (!workout) return;
    const sets = await DB.getByIndex('sets', 'workoutId', workoutId);

    const byExercise = {};
    for (const s of sets) {
      if (!byExercise[s.exerciseId]) {
        byExercise[s.exerciseId] = { name: s.exerciseName, sets: [] };
      }
      byExercise[s.exerciseId].sets.push(s);
    }
    for (const exId of Object.keys(byExercise)) {
      byExercise[exId].sets.sort((a, b) => a.setIndex - b.setIndex);
    }

    let exerciseOrder = Object.keys(byExercise);
    const allSessions = await Program.getAllSessions();
    const session = allSessions[workout.sessionId];
    if (session && session.exercises) {
      const sessionOrder = session.exercises.map(e => e.id);
      exerciseOrder.sort((a, b) => {
        const ia = sessionOrder.indexOf(a);
        const ib = sessionOrder.indexOf(b);
        if (ia === -1 && ib === -1) return 0;
        if (ia === -1) return 1;
        if (ib === -1) return -1;
        return ia - ib;
      });
    }

    const modal = document.getElementById('workout-modal');
    const root = document.getElementById('workout-content');
    const d = new Date(workout.date);
    const dateStr = d.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
    const vol = workout.totalVolume ? Math.round(workout.totalVolume).toLocaleString('fr-FR') + ' kg' : '—';
    const duration = formatDuration(workout.date, workout.finishedAt);

    let html = `
      <div class="detail-header">
        <h2>${workout.sessionName || workout.sessionId}</h2>
        <p class="muted small">${dateStr}</p>
        <div class="kpi-row" style="margin-top:12px;">
          <div class="kpi-card kpi-card-mini">
            <span class="kpi-value">${sets.length}</span>
            <span class="kpi-label">Sets</span>
          </div>
          <div class="kpi-card kpi-card-mini">
            <span class="kpi-value">${vol}</span>
            <span class="kpi-label">Volume</span>
          </div>
          ${duration ? `<div class="kpi-card kpi-card-mini">
            <span class="kpi-value">${duration}</span>
            <span class="kpi-label">Durée</span>
          </div>` : ''}
        </div>
      </div>
    `;

    for (const exId of exerciseOrder) {
      const data = byExercise[exId];
      const cat = Exercises.getCatalogExercise(exId);
      const muscles = cat ? cat.muscles : [];

      html += `<section class="card">
        <div class="detail-ex-head">
          ${muscles.length ? '<div class="detail-anatomy-mini"></div>' : ''}
          <h3>${data.name}</h3>
        </div>`;
      for (const s of data.sets) {
        html += `
          <div class="detail-set-row" data-set-id="${s.id}">
            <span class="set-num">Set ${s.setIndex + 1}</span>
            <input type="number" class="edit-weight" value="${s.weight}" step="0.5" inputmode="decimal" aria-label="Charge">
            <span class="detail-unit">kg</span>
            <span class="detail-x">×</span>
            <input type="number" class="edit-reps" value="${s.reps}" inputmode="numeric" aria-label="Reps">
            <span class="detail-unit">reps</span>
            <button class="btn btn-tiny edit-set-save" title="Sauvegarder">💾</button>
            <button class="btn btn-tiny btn-ghost edit-set-delete" title="Supprimer">✕</button>
          </div>
        `;
      }
      html += '</section>';
    }

    html += `
      <section class="card">
        <label class="small muted">Note</label>
        <textarea id="edit-workout-note" class="edit-note-field" rows="2">${workout.note || ''}</textarea>
        <button class="btn btn-ghost btn-block" id="save-workout-note" style="margin-top:8px;">Sauvegarder la note</button>
      </section>
    `;

    root.innerHTML = html;
    modal.classList.add('open');

    root.querySelectorAll('.detail-anatomy-mini').forEach((el, i) => {
      const exId = exerciseOrder[i];
      const cat = Exercises.getCatalogExercise(exId);
      if (cat && cat.muscles) {
        el.appendChild(Exercises.buildAnatomySvg(cat.muscles));
      }
    });

    document.getElementById('save-workout-note').addEventListener('click', async () => {
      workout.note = document.getElementById('edit-workout-note').value;
      await DB.put('workouts', workout);
      flashEl(document.getElementById('save-workout-note'), 'Sauvé !');
    });

    root.querySelectorAll('.edit-set-save').forEach(btn => {
      btn.addEventListener('click', async () => {
        const row = btn.closest('.detail-set-row');
        const setId = parseInt(row.dataset.setId);
        const set = await DB.get('sets', setId);
        if (!set) return;
        set.weight = parseFloat(row.querySelector('.edit-weight').value) || 0;
        set.reps = parseInt(row.querySelector('.edit-reps').value) || 0;
        await DB.put('sets', set);
        await recalcWorkoutVolume(workoutId);
        flashEl(btn, '✓');
      });
    });

    root.querySelectorAll('.edit-set-delete').forEach(btn => {
      btn.addEventListener('click', async () => {
        if (await confirmDialog('Ce set sera définitivement supprimé.', { title: 'Supprimer ce set ?' })) {
          const row = btn.closest('.detail-set-row');
          await DB.del('sets', parseInt(row.dataset.setId));
          await recalcWorkoutVolume(workoutId);
          row.remove();
        }
      });
    });
  }

  async function recalcWorkoutVolume(workoutId) {
    const workout = await DB.get('workouts', workoutId);
    if (!workout) return;
    const sets = await DB.getByIndex('sets', 'workoutId', workoutId);
    workout.totalSets = sets.length;
    workout.totalVolume = sets.reduce((a, s) => a + (s.weight * s.reps), 0);
    await DB.put('workouts', workout);
  }

  function flashEl(el, text) {
    const orig = el.textContent;
    el.textContent = text || '✓';
    el.classList.add('flash-success');
    setTimeout(() => { el.textContent = orig; el.classList.remove('flash-success'); }, 800);
  }

  // ======== STATS ========
  async function renderStats() {
    const root = document.getElementById('screen-stats');
    const recordedExercises = await Stats.getRecordedExercises();
    const workouts = (await DB.getAll('workouts')).filter(w => w.finished);
    const allSets = await DB.getAll('sets');

    const totalVol = allSets.reduce((a, s) => a + (s.weight * s.reps), 0);
    const prs = await Stats.getPRTable();
    const bestPR = prs.length ? prs[0] : null;

    const exerciseButtons = recordedExercises.length
      ? recordedExercises.map(ex =>
          `<button type="button" class="exercise-toggle" data-exid="${ex.id}">${ex.name}</button>`
        ).join('')
      : '';

    root.innerHTML = `
      <h1 class="screen-title">Statistiques</h1>

      <div class="kpi-row">
        <div class="kpi-card">
          <span class="kpi-value">${workouts.length}</span>
          <span class="kpi-label">Séances</span>
        </div>
        <div class="kpi-card">
          <span class="kpi-value">${totalVol >= 1000 ? (totalVol / 1000).toFixed(1) + 'T' : Math.round(totalVol)}</span>
          <span class="kpi-label">Volume total</span>
        </div>
        <div class="kpi-card">
          <span class="kpi-value">${bestPR ? bestPR.estimate1RM : '—'}</span>
          <span class="kpi-label">Meilleur 1RM</span>
        </div>
      </div>

      <section class="card">
        <h3>📈 Progression par exercice</h3>
        <p class="muted small">Charge moyenne (kg) par semaine.</p>
        <div class="exercise-selector">${exerciseButtons}</div>
        <div class="chart-wrap" style="height:220px"><canvas id="chart-ex-prog"></canvas></div>
        <p id="ex-prog-empty" class="muted small">${recordedExercises.length ? 'Sélectionne au moins un exercice.' : 'Fais une séance pour voir tes stats.'}</p>
      </section>

      <section class="card">
        <h3>📊 Activité hebdomadaire</h3>
        <div class="chart-wrap" style="height:200px"><canvas id="chart-activity"></canvas></div>
      </section>

      <section class="card">
        <h3>⚖️ Poids corporel</h3>
        <div class="chart-wrap" style="height:180px"><canvas id="chart-bodyweight"></canvas></div>
      </section>

      <section class="card">
        <h3>😴 Sommeil moyen hebdo</h3>
        <div class="chart-wrap" style="height:160px"><canvas id="chart-sleep"></canvas></div>
      </section>

      <section class="card">
        <h3>🏆 Personal Records</h3>
        <div id="pr-table"></div>
      </section>
    `;

    destroyCharts();

    const selectedExercises = new Set();
    root.querySelectorAll('.exercise-toggle').forEach(btn => {
      btn.addEventListener('click', async () => {
        const id = btn.dataset.exid;
        if (selectedExercises.has(id)) { selectedExercises.delete(id); btn.classList.remove('active'); }
        else { selectedExercises.add(id); btn.classList.add('active'); }
        await renderExerciseProgression([...selectedExercises], recordedExercises);
      });
    });

    await renderActivityChart();
    await renderChartBodyweight();
    await renderChartSleep();
    await renderPRTable();

    setTimeout(() => {
      Object.values(charts).forEach(c => { try { c.resize(); } catch (e) {} });
    }, 100);
  }

  const EXERCISE_COLORS = ['#ff6384', '#36a2eb', '#ffcd56', '#4bc0c0', '#9966ff', '#ff9f40', '#c9cbcf', '#30d158', '#ff453a', '#bf5af2', '#64d2ff', '#ffd60a'];

  async function renderExerciseProgression(selectedIds, recordedExercises) {
    const emptyEl = document.getElementById('ex-prog-empty');
    if (!selectedIds.length) {
      if (charts.exProg) { charts.exProg.destroy(); delete charts.exProg; }
      emptyEl.textContent = 'Sélectionne au moins un exercice.';
      emptyEl.style.display = '';
      return;
    }
    emptyEl.style.display = 'none';

    const { weeks, datasets } = await Stats.getExerciseProgressionData(selectedIds);
    if (!weeks.length) {
      emptyEl.textContent = 'Pas encore de données pour ces exercices.';
      emptyEl.style.display = '';
      return;
    }

    const nameMap = Object.fromEntries(recordedExercises.map(e => [e.id, e.name]));
    const chartDatasets = Object.entries(datasets).map(([exId, vals], i) => ({
      label: nameMap[exId] || exId,
      data: vals,
      borderColor: EXERCISE_COLORS[i % EXERCISE_COLORS.length],
      backgroundColor: EXERCISE_COLORS[i % EXERCISE_COLORS.length] + '33',
      borderWidth: 2.5,
      tension: 0.3,
      pointRadius: 4,
      pointHoverRadius: 6,
      spanGaps: true,
    }));

    if (charts.exProg) charts.exProg.destroy();
    charts.exProg = new Chart(document.getElementById('chart-ex-prog'), {
      type: 'line',
      data: { labels: weeks, datasets: chartDatasets },
      options: chartOptions({}),
    });
  }

  async function renderActivityChart() {
    const { weeks, sessions } = await Stats.getWeeklyActivityData();
    if (!weeks.length) { noDataMessage('chart-activity'); return; }

    const colors = ['#ff6384', '#36a2eb', '#ffcd56', '#4bc0c0', '#9966ff', '#ff9f40', '#c9cbcf', '#ff6384'];
    let ci = 0;
    const datasets = Object.entries(sessions).map(([name, data]) => {
      const color = colors[ci++ % colors.length];
      return {
        label: name,
        data: data.map(d => d.count),
        backgroundColor: color + 'cc',
        borderColor: color,
        borderWidth: 1,
        borderRadius: 6,
      };
    });

    charts.activity = new Chart(document.getElementById('chart-activity'), {
      type: 'bar',
      data: { labels: weeks, datasets },
      options: {
        ...chartOptions({ stacked: true }),
        plugins: {
          ...chartOptions({ stacked: true }).plugins,
          tooltip: {
            callbacks: {
              afterBody: (items) => {
                const weekIdx = items[0]?.dataIndex;
                if (weekIdx == null) return '';
                const lines = [];
                for (const [name, data] of Object.entries(sessions)) {
                  const d = data[weekIdx];
                  if (d && d.count > 0) {
                    lines.push(`${name}: ${d.dates.join(', ')}`);
                  }
                }
                return lines.join('\n');
              }
            }
          }
        }
      },
    });
  }

  async function renderChartBodyweight() {
    const raw = await Stats.getMeasurementSeries('weight');
    if (!raw.length) { noDataMessage('chart-bodyweight'); return; }
    const ma = Stats.movingAverage(raw, 7);
    charts.bw = new Chart(document.getElementById('chart-bodyweight'), {
      type: 'line',
      data: {
        datasets: [
          { label: 'Poids brut', data: raw, borderWidth: 1, pointRadius: 2, borderDash: [3, 3], borderColor: '#9a9aa3' },
          { label: 'MA 7j', data: ma, borderWidth: 2.5, tension: 0.3, borderColor: '#4a8eff', pointRadius: 3 },
        ],
      },
      options: chartOptions({ xType: 'time' }),
    });
  }

  async function renderChartSleep() {
    const items = await DB.getAll('measurements');
    if (!items.length) { noDataMessage('chart-sleep'); return; }
    const byWeek = {};
    for (const m of items) {
      if (m.sleep == null || m.sleep === '') continue;
      const monday = (() => {
        const d = new Date(m.date);
        const day = d.getDay() || 7;
        if (day !== 1) d.setDate(d.getDate() - (day - 1));
        return d.toISOString().slice(0, 10);
      })();
      if (!byWeek[monday]) byWeek[monday] = [];
      byWeek[monday].push(parseFloat(m.sleep));
    }
    const weeks = Object.keys(byWeek).sort();
    if (!weeks.length) { noDataMessage('chart-sleep'); return; }
    const avgs = weeks.map(w => {
      const a = byWeek[w];
      return Math.round((a.reduce((x, y) => x + y, 0) / a.length) * 10) / 10;
    });
    charts.sleep = new Chart(document.getElementById('chart-sleep'), {
      type: 'bar',
      data: { labels: weeks, datasets: [{ label: 'h/nuit', data: avgs, backgroundColor: '#4bc0c0cc', borderRadius: 6 }] },
      options: chartOptions({}),
    });
  }

  function destroyCharts() {
    Object.values(charts).forEach(c => { try { c.destroy(); } catch (e) {} });
    charts = {};
  }

  function noDataMessage(canvasId) {
    const canvas = document.getElementById(canvasId);
    if (canvas) canvas.replaceWith(Object.assign(document.createElement('div'),
      { innerHTML: '<div class="empty-state"><p class="empty-state-icon">📊</p><p>Pas encore de données.</p></div>', className: '' }).firstChild);
  }

  async function renderPRTable() {
    const root = document.getElementById('pr-table');
    const rows = await Stats.getPRTable();
    if (!rows.length) { root.innerHTML = '<div class="empty-state"><p class="empty-state-icon">🏆</p><p>Pas encore de PR.</p></div>'; return; }
    root.innerHTML = `<table class="pr-table">
      <thead><tr><th>Exercice</th><th>Top</th><th>1RM est.</th><th>Date</th></tr></thead>
      <tbody>${rows.map((r, i) => `<tr>
        <td>${i === 0 ? '🥇 ' : i === 1 ? '🥈 ' : i === 2 ? '🥉 ' : ''}${r.name}</td>
        <td>${r.bestWeight} × ${r.bestReps}</td>
        <td><strong>${r.estimate1RM} kg</strong></td>
        <td class="small muted">${r.date}</td>
      </tr>`).join('')}</tbody>
    </table>`;
  }

  function chartOptions({ xType, stacked, beginAtZero = true } = {}) {
    return {
      responsive: true,
      maintainAspectRatio: false,
      interaction: { mode: 'index', intersect: false },
      plugins: {
        legend: {
          position: 'bottom',
          labels: { color: getCSSVar('--text'), padding: 14, usePointStyle: true, font: { family: 'Outfit', size: 12 } }
        }
      },
      scales: {
        x: {
          type: 'category',
          stacked: !!stacked,
          ticks: { color: getCSSVar('--text-muted'), maxRotation: 45, font: { size: 11, family: 'Outfit' } },
          grid: { color: getCSSVar('--border') + '33' },
        },
        y: {
          stacked: !!stacked,
          beginAtZero,
          ticks: { color: getCSSVar('--text-muted'), font: { family: 'Outfit' } },
          grid: { color: getCSSVar('--border') + '33' },
        },
      },
    };
  }

  function getCSSVar(name) {
    return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  }

  // ======== MENSURATIONS ========
  async function renderMeasurements() {
    const root = document.getElementById('screen-measurements');
    const items = (await DB.getAll('measurements')).sort((a, b) => a.date.localeCompare(b.date));
    const latest = items.length ? items[items.length - 1] : null;
    const latestWeight = latest && latest.weight ? latest.weight + ' kg' : '—';
    const latestSleep = latest && latest.sleep ? latest.sleep + 'h' : '—';

    root.innerHTML = `<h1 class="screen-title">Mensurations</h1>
      <div class="kpi-row">
        <div class="kpi-card">
          <span class="kpi-value">${latestWeight}</span>
          <span class="kpi-label">Poids actuel</span>
        </div>
        <div class="kpi-card">
          <span class="kpi-value">${latestSleep}</span>
          <span class="kpi-label">Dernier sommeil</span>
        </div>
        <div class="kpi-card">
          <span class="kpi-value">${items.length}</span>
          <span class="kpi-label">Saisies</span>
        </div>
      </div>
      <section class="card">
        <h3>📝 Nouvelle saisie</h3>
        <form id="measure-form" class="measure-form">
          <label>Date <input type="date" name="date" required></label>
          <label>Poids (kg) <input type="number" step="0.1" name="weight" inputmode="decimal"></label>
          <label>Sommeil (h) <input type="number" step="0.1" name="sleep" inputmode="decimal"></label>
          <label>Bras G (cm) <input type="number" step="0.1" name="armL" inputmode="decimal"></label>
          <label>Bras D (cm) <input type="number" step="0.1" name="armR" inputmode="decimal"></label>
          <label>Poitrine (cm) <input type="number" step="0.1" name="chest" inputmode="decimal"></label>
          <label>Taille (cm) <input type="number" step="0.1" name="waist" inputmode="decimal"></label>
          <label>Cuisse G (cm) <input type="number" step="0.1" name="thighL" inputmode="decimal"></label>
          <label>Cuisse D (cm) <input type="number" step="0.1" name="thighR" inputmode="decimal"></label>
          <label>Mollet G (cm) <input type="number" step="0.1" name="calfL" inputmode="decimal"></label>
          <label>Mollet D (cm) <input type="number" step="0.1" name="calfR" inputmode="decimal"></label>
          <label class="full">Note <input type="text" name="note"></label>
          <button type="submit" class="btn btn-primary btn-block">Enregistrer</button>
        </form>
      </section>
      <section class="card">
        <h3>📈 Courbes</h3>
        <p class="muted small">Sélectionne une ou plusieurs mesures pour voir leur évolution.</p>
        <div class="exercise-selector" id="measure-toggles"></div>
        <div class="chart-wrap" style="height:220px"><canvas id="chart-measures"></canvas></div>
        <p id="measure-chart-empty" class="muted small">Sélectionne au moins une mesure.</p>
      </section>
      <section class="card">
        <h3>📐 Évolution</h3>
        <div id="measure-delta"></div>
      </section>
      <section class="card">
        <h3>📋 Historique</h3>
        <div id="measure-history"></div>
      </section>
    `;
    document.querySelector('[name="date"]').valueAsDate = new Date();
    document.getElementById('measure-form').addEventListener('submit', async e => {
      e.preventDefault();
      const fd = new FormData(e.target);
      const obj = { date: new Date(fd.get('date')).toISOString() };
      for (const [k, v] of fd.entries()) {
        if (k === 'date') continue;
        obj[k] = v === '' ? null : v;
      }
      await DB.add('measurements', obj);
      showToast('Mesure enregistrée !');
      renderMeasurements();
    });
    await initMeasureChart(items);
    await renderMeasurementDelta();
    await renderMeasurementHistory();
  }

  async function renderMeasurementDelta() {
    const root = document.getElementById('measure-delta');
    const items = (await DB.getAll('measurements')).sort((a, b) => a.date.localeCompare(b.date));
    if (items.length < 2) { root.innerHTML = '<div class="empty-state"><p class="empty-state-icon">📐</p><p>Au moins 2 saisies nécessaires.</p></div>'; return; }
    const first = items[0], last = items[items.length - 1];
    const fields = [
      ['weight', 'Poids', 'kg'], ['armL', 'Bras G', 'cm'], ['armR', 'Bras D', 'cm'],
      ['chest', 'Poitrine', 'cm'], ['waist', 'Taille', 'cm'],
      ['thighL', 'Cuisse G', 'cm'], ['thighR', 'Cuisse D', 'cm'],
      ['calfL', 'Mollet G', 'cm'], ['calfR', 'Mollet D', 'cm'],
    ];
    let html = `<p class="small muted" style="margin-bottom:10px;">Du ${first.date.slice(0,10)} au ${last.date.slice(0,10)}</p><table class="delta-table"><tbody>`;
    for (const [k, label, u] of fields) {
      if (first[k] == null || last[k] == null) continue;
      const d = parseFloat(last[k]) - parseFloat(first[k]);
      const sign = d > 0 ? '+' : '';
      const cls = d > 0 ? 'up' : (d < 0 ? 'down' : '');
      html += `<tr><td>${label}</td><td class="muted">${first[k]} → ${last[k]} ${u}</td><td class="delta ${cls}">${sign}${d.toFixed(1)}</td></tr>`;
    }
    html += '</tbody></table>';
    root.innerHTML = html;
  }

  async function renderMeasurementHistory() {
    const root = document.getElementById('measure-history');
    const items = (await DB.getAll('measurements')).sort((a, b) => b.date.localeCompare(a.date));
    if (!items.length) { root.innerHTML = '<div class="empty-state"><p class="empty-state-icon">📋</p><p>Aucune saisie.</p></div>'; return; }
    root.innerHTML = `<ul class="history-list">${items.map(m => `
      <li>
        <span><strong>${m.date.slice(0,10)}</strong> ·
        ${m.weight ? m.weight + ' kg' : ''}
        ${m.sleep ? ' · ' + m.sleep + 'h' : ''}</span>
        <button class="btn btn-tiny" data-del="${m.id}">✕</button>
      </li>`).join('')}</ul>`;
    root.querySelectorAll('[data-del]').forEach(b => b.addEventListener('click', async () => {
      if (await confirmDialog('Cette mesure sera définitivement supprimée.', { title: 'Supprimer cette saisie ?' })) {
        await DB.del('measurements', parseInt(b.dataset.del, 10));
        renderMeasurements();
      }
    }));
  }

  const MEASURE_FIELDS = [
    { key: 'weight', label: 'Poids (kg)', color: '#4a8eff' },
    { key: 'sleep', label: 'Sommeil (h)', color: '#2dd47a' },
    { key: 'armL', label: 'Bras G', color: '#ff6384' },
    { key: 'armR', label: 'Bras D', color: '#ff9f40' },
    { key: 'chest', label: 'Poitrine', color: '#9966ff' },
    { key: 'waist', label: 'Taille', color: '#ffcd56' },
    { key: 'thighL', label: 'Cuisse G', color: '#4bc0c0' },
    { key: 'thighR', label: 'Cuisse D', color: '#36a2eb' },
    { key: 'calfL', label: 'Mollet G', color: '#c9cbcf' },
    { key: 'calfR', label: 'Mollet D', color: '#ff453a' },
  ];

  async function initMeasureChart(items) {
    const togglesEl = document.getElementById('measure-toggles');
    const emptyEl = document.getElementById('measure-chart-empty');

    const availableFields = MEASURE_FIELDS.filter(f =>
      items.some(m => m[f.key] != null && m[f.key] !== '')
    );

    if (!availableFields.length) {
      togglesEl.innerHTML = '';
      emptyEl.textContent = 'Enregistre des mesures pour voir les courbes.';
      return;
    }

    togglesEl.innerHTML = availableFields.map(f =>
      `<button type="button" class="exercise-toggle" data-field="${f.key}">${f.label}</button>`
    ).join('');

    const selectedFields = new Set();
    togglesEl.querySelectorAll('.exercise-toggle').forEach(btn => {
      btn.addEventListener('click', () => {
        const key = btn.dataset.field;
        if (selectedFields.has(key)) { selectedFields.delete(key); btn.classList.remove('active'); }
        else { selectedFields.add(key); btn.classList.add('active'); }
        renderMeasureChart(items, [...selectedFields], availableFields);
      });
    });
  }

  function renderMeasureChart(items, selectedKeys, availableFields) {
    const emptyEl = document.getElementById('measure-chart-empty');
    if (!selectedKeys.length) {
      if (charts.measures) { charts.measures.destroy(); delete charts.measures; }
      emptyEl.textContent = 'Sélectionne au moins une mesure.';
      emptyEl.style.display = '';
      return;
    }
    emptyEl.style.display = 'none';

    const sorted = [...items].sort((a, b) => a.date.localeCompare(b.date));
    const dates = [...new Set(sorted.map(m => m.date.slice(0, 10)))];

    const datasets = selectedKeys.map(key => {
      const field = availableFields.find(f => f.key === key);
      const dataMap = {};
      sorted.forEach(m => {
        if (m[key] != null && m[key] !== '') dataMap[m.date.slice(0, 10)] = parseFloat(m[key]);
      });
      return {
        label: field.label,
        data: dates.map(d => dataMap[d] ?? null),
        borderColor: field.color,
        backgroundColor: field.color + '33',
        borderWidth: 2.5,
        tension: 0.3,
        pointRadius: 4,
        pointHoverRadius: 6,
        spanGaps: true,
      };
    });

    if (charts.measures) charts.measures.destroy();
    charts.measures = new Chart(document.getElementById('chart-measures'), {
      type: 'line',
      data: { labels: dates, datasets },
      options: chartOptions({ beginAtZero: false }),
    });
  }

  // ======== SETTINGS ========
  async function renderSettings() {
    const root = document.getElementById('screen-settings');
    const theme = await DB.getSetting('theme', 'dark');
    const units = await DB.getSetting('units', 'metric');
    const sound = await DB.getSetting('soundEnabled', true);
    const vibration = await DB.getSetting('vibrationEnabled', true);

    root.innerHTML = `<h1 class="screen-title">Réglages</h1>
      <section class="card">
        <h3>🎨 Apparence</h3>
        <label class="toggle-row"><span>Mode sombre</span>
          <input type="checkbox" id="set-theme" ${theme === 'dark' ? 'checked' : ''}></label>
        <label class="toggle-row"><span>Unités : kg / cm</span>
          <input type="checkbox" id="set-units" ${units === 'metric' ? 'checked' : ''}></label>
      </section>
      <section class="card">
        <h3>🔔 Notifications</h3>
        <label class="toggle-row"><span>Sons du timer</span>
          <input type="checkbox" id="set-sound" ${sound ? 'checked' : ''}></label>
        <label class="toggle-row"><span>Vibration</span>
          <input type="checkbox" id="set-vib" ${vibration ? 'checked' : ''}></label>
      </section>
      <section class="card">
        <h3>💾 Données</h3>
        <button class="btn btn-ghost btn-block" id="export">📤 Exporter (JSON)</button>
        <label class="btn btn-ghost btn-block" style="margin-top:8px;">
          📥 Importer (JSON)
          <input id="import" type="file" accept="application/json" hidden>
        </label>
        <button class="btn btn-danger btn-block" id="reset" style="margin-top:8px;">⚠️ Reset complet</button>
      </section>
      <section class="card center">
        <p class="muted small">Tracker Muscu · 100% offline · v3.1</p>
      </section>
    `;

    document.getElementById('set-theme').addEventListener('change', async e => {
      const t = e.target.checked ? 'dark' : 'light';
      document.documentElement.dataset.theme = t;
      await DB.setSetting('theme', t);
    });
    document.getElementById('set-units').addEventListener('change', async e => {
      const u = e.target.checked ? 'metric' : 'imperial';
      document.documentElement.dataset.units = u;
      await DB.setSetting('units', u);
    });
    document.getElementById('set-sound').addEventListener('change', async e => { await DB.setSetting('soundEnabled', e.target.checked); });
    document.getElementById('set-vib').addEventListener('change', async e => { await DB.setSetting('vibrationEnabled', e.target.checked); });
    document.getElementById('export').addEventListener('click', exportData);
    document.getElementById('import').addEventListener('change', importData);
    document.getElementById('reset').addEventListener('click', async () => {
      if (await confirmDialog('Toutes tes données seront effacées. Cette action est irréversible.', { title: 'Reset complet ?', confirmLabel: 'Tout effacer' })) {
        await DB.resetAll();
        location.reload();
      }
    });
  }

  async function exportData() {
    const data = await DB.exportAll();
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `tracker-export-${new Date().toISOString().slice(0,10)}.json`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  async function importData(e) {
    const file = e.target.files[0];
    if (!file) return;
    try {
      const text = await file.text();
      const data = JSON.parse(text);
      if (!await confirmDialog('Tes données actuelles seront remplacées.', { title: 'Importer ?', confirmLabel: 'Remplacer', danger: true })) return;
      await DB.importAll(data);
      alert('Import réussi.');
      location.reload();
    } catch (err) { alert('Erreur import : ' + err.message); }
  }

  function registerServiceWorker() {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('./service-worker.js').catch(err => console.warn('SW non enregistré', err));
    }
  }

  function requestNotificationPermission() {
    if ('Notification' in window && Notification.permission === 'default') {
      document.addEventListener('click', () => {
        try { Notification.requestPermission(); } catch (e) {}
      }, { once: true });
    }
  }

  return { init, switchTab, renderSessions };
})();

window.App = App;
document.addEventListener('DOMContentLoaded', () => App.init());
