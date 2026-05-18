// ============================================================================
// app.js — Logique principale : routing, rendu des 5 onglets, init
// ============================================================================

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
        if (confirm('Quitter la séance ? Les sets validés restent enregistrés.')) {
          await Workout.abortSession();
        }
      } else {
        document.getElementById('workout-modal').classList.remove('open');
      }
    });
  }

  // ---- Séances (choix + création) ----
  async function renderSessions() {
    const root = document.getElementById('screen-sessions');
    const allSessions = await Program.getAllSessions();

    let html = '<h1 class="screen-title">Séances</h1>';
    html += '<p class="muted small">Choisis une séance à lancer ou crée la tienne.</p>';

    // Séances pré-enregistrées
    for (const [sid, session] of Object.entries(allSessions)) {
      const isCustom = sid.startsWith('custom_');
      const exCount = session.exercises.length;
      const avgRest = Math.round(session.exercises.reduce((a, e) => a + e.rest, 0) / exCount);
      const restLabel = avgRest >= 60 ? Math.round(avgRest / 60) + ' min' : avgRest + 's';
      html += `
        <div class="card session-card" data-session="${sid}">
          <div class="session-card-head">
            <div>
              <h2>${session.name}</h2>
              <p class="muted small">${session.focus || ''}</p>
            </div>
            ${isCustom ? `<button class="btn btn-tiny btn-ghost session-delete" data-sid="${sid}" title="Supprimer">🗑️</button>` : ''}
          </div>
          <div class="today-meta">
            <span><strong>${exCount}</strong> exercices</span>
            <span>Repos moyen <strong>${restLabel}</strong></span>
          </div>
          <button class="btn btn-primary btn-block session-start" data-sid="${sid}">Commencer</button>
        </div>
      `;
    }

    // Bouton créer séance custom
    html += `
      <button class="btn btn-ghost btn-block" id="create-session-btn" style="margin-top:8px;">
        + Créer une séance
      </button>
    `;

    root.innerHTML = html;

    root.querySelectorAll('.session-start').forEach(btn => {
      btn.addEventListener('click', () => Workout.startSession(btn.dataset.sid));
    });
    root.querySelectorAll('.session-delete').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        e.stopPropagation();
        if (confirm('Supprimer cette séance custom ?')) {
          await Program.deleteCustomSession(btn.dataset.sid);
          renderSessions();
        }
      });
    });
    document.getElementById('create-session-btn').addEventListener('click', () => openCreateSession());
  }

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
        <div style="margin-top:16px; display:flex; gap:10px;">
          <button type="button" class="btn btn-ghost" id="cs-cancel" style="flex:1;">Annuler</button>
          <button type="submit" class="btn btn-primary" style="flex:1;">Enregistrer</button>
        </div>
      </form>
    `;
    modal.classList.add('open');

    let exerciseCount = 0;

    function addExerciseRow() {
      const idx = exerciseCount++;
      const div = document.createElement('div');
      div.className = 'cs-exercise-row';
      div.innerHTML = `
        <div class="cs-exercise-header">
          <strong>Exercice ${idx + 1}</strong>
          <button type="button" class="btn btn-tiny btn-ghost cs-remove-ex">✕</button>
        </div>
        <label>Nom <input type="text" class="cs-ex-name" required placeholder="Ex: Développé couché"></label>
        <div class="cs-row-grid">
          <label>Séries <input type="number" class="cs-ex-sets" value="3" min="1" inputmode="numeric"></label>
          <label>Reps min <input type="number" class="cs-ex-rmin" value="8" min="1" inputmode="numeric"></label>
          <label>Reps max <input type="number" class="cs-ex-rmax" value="12" min="1" inputmode="numeric"></label>
          <label>Repos (s) <input type="number" class="cs-ex-rest" value="120" min="0" inputmode="numeric"></label>
        </div>
        <label>Note technique <input type="text" class="cs-ex-note" placeholder="Optionnel"></label>
      `;
      div.querySelector('.cs-remove-ex').addEventListener('click', () => div.remove());
      document.getElementById('cs-exercises').appendChild(div);
    }

    addExerciseRow();

    document.getElementById('cs-add-exercise').addEventListener('click', addExerciseRow);
    document.getElementById('cs-cancel').addEventListener('click', () => {
      modal.classList.remove('open');
      renderSessions();
    });

    document.getElementById('create-session-form').addEventListener('submit', async (e) => {
      e.preventDefault();
      const name = document.getElementById('cs-name').value.trim();
      const focus = document.getElementById('cs-focus').value.trim();
      if (!name) return;

      const exerciseRows = document.querySelectorAll('.cs-exercise-row');
      const exercises = [];
      exerciseRows.forEach((row, i) => {
        const exName = row.querySelector('.cs-ex-name').value.trim();
        if (!exName) return;
        exercises.push({
          id: Program.generateId() + '_ex' + i,
          name: exName,
          sets: parseInt(row.querySelector('.cs-ex-sets').value) || 3,
          repsMin: parseInt(row.querySelector('.cs-ex-rmin').value) || 8,
          repsMax: parseInt(row.querySelector('.cs-ex-rmax').value) || 12,
          rest: parseInt(row.querySelector('.cs-ex-rest').value) || 120,
          muscles: [],
          note: row.querySelector('.cs-ex-note').value.trim(),
          isCompound: false,
        });
      });

      if (!exercises.length) { alert('Ajoute au moins un exercice.'); return; }

      const session = {
        id: Program.generateId(),
        name,
        focus,
        exercises,
      };

      await Program.saveCustomSession(session);
      modal.classList.remove('open');
      renderSessions();
    });
  }

  // ---- Historique des séances ----
  async function renderHistory() {
    const root = document.getElementById('screen-history');
    const workouts = (await DB.getAll('workouts'))
      .filter(w => w.finished)
      .sort((a, b) => b.date.localeCompare(a.date));

    let html = '<h1 class="screen-title">Historique</h1>';

    if (!workouts.length) {
      html += '<p class="muted">Aucune séance enregistrée.</p>';
      root.innerHTML = html;
      return;
    }

    for (const w of workouts) {
      const d = w.date.slice(0, 10);
      const vol = w.totalVolume ? Math.round(w.totalVolume) + ' kg' : '—';
      html += `
        <div class="card history-card">
          <div class="history-card-head">
            <div>
              <h3>${w.sessionName || w.sessionId}</h3>
              <p class="muted small">${d} · ${w.totalSets || 0} sets · Volume ${vol}</p>
            </div>
            <div class="history-actions">
              <button class="btn btn-tiny btn-ghost history-view" data-wid="${w.id}">Voir</button>
              <button class="btn btn-tiny btn-ghost history-delete" data-wid="${w.id}">🗑️</button>
            </div>
          </div>
          ${w.note ? `<p class="small muted">${w.note}</p>` : ''}
        </div>
      `;
    }

    root.innerHTML = html;

    root.querySelectorAll('.history-view').forEach(btn => {
      btn.addEventListener('click', () => openWorkoutDetail(parseInt(btn.dataset.wid)));
    });
    root.querySelectorAll('.history-delete').forEach(btn => {
      btn.addEventListener('click', async () => {
        if (confirm('Supprimer cette séance et tous ses sets ?')) {
          const wid = parseInt(btn.dataset.wid);
          const sets = await DB.getByIndex('sets', 'workoutId', wid);
          for (const s of sets) await DB.del('sets', s.id);
          await DB.del('workouts', wid);
          renderHistory();
        }
      });
    });
  }

  async function openWorkoutDetail(workoutId) {
    const workout = await DB.get('workouts', workoutId);
    if (!workout) return;
    const sets = (await DB.getByIndex('sets', 'workoutId', workoutId))
      .sort((a, b) => {
        if (a.exerciseId !== b.exerciseId) return a.date.localeCompare(b.date);
        return a.setIndex - b.setIndex;
      });

    const modal = document.getElementById('workout-modal');
    const root = document.getElementById('workout-content');

    // Groupe les sets par exercice
    const byExercise = {};
    for (const s of sets) {
      if (!byExercise[s.exerciseId]) byExercise[s.exerciseId] = { name: s.exerciseName, sets: [] };
      byExercise[s.exerciseId].sets.push(s);
    }

    let html = `
      <h2>${workout.sessionName || workout.sessionId}</h2>
      <p class="muted">${workout.date.slice(0, 10)} · ${sets.length} sets · Volume ${workout.totalVolume ? Math.round(workout.totalVolume) + ' kg' : '—'}</p>
    `;

    for (const [exId, data] of Object.entries(byExercise)) {
      html += `<section class="card"><h3>${data.name}</h3>`;
      for (const s of data.sets) {
        html += `
          <div class="detail-set-row" data-set-id="${s.id}">
            <span class="set-num">Set ${s.setIndex + 1}</span>
            <input type="number" class="edit-weight" value="${s.weight}" step="0.5" inputmode="decimal" aria-label="Charge">
            <span class="small muted">kg ×</span>
            <input type="number" class="edit-reps" value="${s.reps}" inputmode="numeric" aria-label="Reps">
            <span class="small muted">reps</span>
            <button class="btn btn-tiny edit-set-save" title="Sauvegarder">💾</button>
            <button class="btn btn-tiny btn-ghost edit-set-delete" title="Supprimer">✕</button>
          </div>
        `;
      }
      html += '</section>';
    }

    html += `
      <div style="margin-top:12px;">
        <label class="small muted">Note</label>
        <textarea id="edit-workout-note" rows="2" class="edit-note-field">${workout.note || ''}</textarea>
        <button class="btn btn-ghost btn-block" id="save-workout-note" style="margin-top:8px;">Sauvegarder la note</button>
      </div>
    `;

    root.innerHTML = html;
    modal.classList.add('open');

    // Sauvegarder la note du workout
    document.getElementById('save-workout-note').addEventListener('click', async () => {
      workout.note = document.getElementById('edit-workout-note').value;
      await DB.put('workouts', workout);
      flash(document.getElementById('save-workout-note'), 'Sauvé !');
    });

    // Modifier un set
    root.querySelectorAll('.edit-set-save').forEach(btn => {
      btn.addEventListener('click', async () => {
        const row = btn.closest('.detail-set-row');
        const setId = parseInt(row.dataset.setId);
        const set = await DB.get('sets', setId);
        if (!set) return;
        set.weight = parseFloat(row.querySelector('.edit-weight').value) || 0;
        set.reps = parseInt(row.querySelector('.edit-reps').value) || 0;
        await DB.put('sets', set);
        // Recalcule le volume du workout
        await recalcWorkoutVolume(workoutId);
        flash(btn, '✓');
      });
    });

    // Supprimer un set
    root.querySelectorAll('.edit-set-delete').forEach(btn => {
      btn.addEventListener('click', async () => {
        if (!confirm('Supprimer ce set ?')) return;
        const row = btn.closest('.detail-set-row');
        const setId = parseInt(row.dataset.setId);
        await DB.del('sets', setId);
        await recalcWorkoutVolume(workoutId);
        row.remove();
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

  function flash(el, text) {
    const orig = el.textContent;
    el.textContent = text || '✓';
    el.classList.add('flash-success');
    setTimeout(() => {
      el.textContent = orig;
      el.classList.remove('flash-success');
    }, 800);
  }

  // ---- Stats ----
  async function renderStats() {
    const root = document.getElementById('screen-stats');
    root.innerHTML = `
      <h1 class="screen-title">Stats</h1>
      <section class="card">
        <h3>1RM estimé — exos clés</h3>
        <canvas id="chart-1rm" height="200"></canvas>
      </section>
      <section class="card">
        <h3>Volume hebdo par muscle (sets effectifs)</h3>
        <canvas id="chart-volume" height="220"></canvas>
      </section>
      <section class="card">
        <h3>Volume total par séance (charge × reps)</h3>
        <canvas id="chart-workout-vol" height="200"></canvas>
      </section>
      <section class="card">
        <h3>Poids corporel (moyenne mobile 7j)</h3>
        <canvas id="chart-bodyweight" height="180"></canvas>
      </section>
      <section class="card">
        <h3>Sommeil moyen hebdo</h3>
        <canvas id="chart-sleep" height="160"></canvas>
      </section>
      <section class="card">
        <h3>Personal records</h3>
        <div id="pr-table"></div>
      </section>
    `;
    destroyCharts();
    await renderChart1RM();
    await renderChartVolume();
    await renderChartWorkoutVol();
    await renderChartBodyweight();
    await renderChartSleep();
    await renderPRTable();
  }

  function destroyCharts() {
    Object.values(charts).forEach(c => { try { c.destroy(); } catch (e) {} });
    charts = {};
  }

  async function renderChart1RM() {
    const data = await Stats.getAll1RMSeries();
    const datasets = Object.entries(data).map(([id, s]) => ({
      label: s.label,
      data: s.points,
      borderWidth: 2,
      tension: 0.2,
      pointRadius: 3,
    }));
    if (datasets.every(d => !d.data.length)) {
      noDataMessage('chart-1rm');
      return;
    }
    charts.oneRM = new Chart(document.getElementById('chart-1rm'), {
      type: 'line',
      data: { datasets },
      options: chartOptions({ xType: 'time' }),
    });
  }

  async function renderChartVolume() {
    const { weeks, muscles } = await Stats.getWeeklyVolumeByMuscle();
    if (!weeks.length) { noDataMessage('chart-volume'); return; }
    const datasets = Object.entries(muscles).map(([m, vals]) => ({
      label: Stats.MUSCLE_LABELS[m] || m,
      data: vals,
      stack: 'volume',
    }));
    charts.volume = new Chart(document.getElementById('chart-volume'), {
      type: 'bar',
      data: { labels: weeks, datasets },
      options: chartOptions({ stacked: true }),
    });
  }

  async function renderChartWorkoutVol() {
    const data = await Stats.getWorkoutVolumeSeries();
    if (!data.length) { noDataMessage('chart-workout-vol'); return; }
    charts.workoutVol = new Chart(document.getElementById('chart-workout-vol'), {
      type: 'line',
      data: { datasets: [{ label: 'Volume (kg)', data, borderWidth: 2, tension: 0.2 }] },
      options: chartOptions({ xType: 'time' }),
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
          { label: 'Poids brut', data: raw, borderWidth: 1, pointRadius: 2, borderDash: [3, 3] },
          { label: 'MA 7j', data: ma, borderWidth: 2, tension: 0.3 },
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
      data: { labels: weeks, datasets: [{ label: 'h/nuit', data: avgs }] },
      options: chartOptions({}),
    });
  }

  function noDataMessage(canvasId) {
    const canvas = document.getElementById(canvasId);
    canvas.replaceWith(Object.assign(document.createElement('p'),
      { textContent: 'Pas encore de données.', className: 'muted small' }));
  }

  async function renderPRTable() {
    const root = document.getElementById('pr-table');
    const rows = await Stats.getPRTable();
    if (!rows.length) { root.innerHTML = '<p class="muted small">Pas encore de PR.</p>'; return; }
    root.innerHTML = `<table class="pr-table">
      <thead><tr><th>Exercice</th><th>Top</th><th>1RM est.</th><th>Date</th></tr></thead>
      <tbody>${rows.map(r => `<tr>
        <td>${r.name}</td>
        <td>${r.bestWeight} × ${r.bestReps}</td>
        <td><strong>${r.estimate1RM} kg</strong></td>
        <td class="small muted">${r.date}</td>
      </tr>`).join('')}</tbody>
    </table>`;
  }

  function chartOptions({ xType, stacked } = {}) {
    return {
      responsive: true,
      maintainAspectRatio: true,
      interaction: { mode: 'index', intersect: false },
      plugins: { legend: { position: 'bottom', labels: { color: getCSSVar('--text') } } },
      scales: {
        x: {
          type: 'category',
          stacked: !!stacked,
          ticks: { color: getCSSVar('--text-muted'), maxRotation: 0 },
          grid: { color: getCSSVar('--border') },
        },
        y: {
          stacked: !!stacked,
          beginAtZero: !stacked,
          ticks: { color: getCSSVar('--text-muted') },
          grid: { color: getCSSVar('--border') },
        },
      },
    };
  }

  function getCSSVar(name) {
    return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  }

  // ---- Mensurations ----
  async function renderMeasurements() {
    const root = document.getElementById('screen-measurements');
    root.innerHTML = `<h1 class="screen-title">Mensurations</h1>
      <section class="card">
        <h3>Nouvelle saisie</h3>
        <form id="measure-form" class="measure-form">
          <label>Date <input type="date" name="date" required></label>
          <label>Poids (kg) <input type="number" step="0.1" name="weight" inputmode="decimal"></label>
          <label>Sommeil dernière nuit (h) <input type="number" step="0.1" name="sleep" inputmode="decimal"></label>
          <label>Bras G contracté (cm) <input type="number" step="0.1" name="armL" inputmode="decimal"></label>
          <label>Bras D contracté (cm) <input type="number" step="0.1" name="armR" inputmode="decimal"></label>
          <label>Poitrine (cm) <input type="number" step="0.1" name="chest" inputmode="decimal"></label>
          <label>Taille (cm) <input type="number" step="0.1" name="waist" inputmode="decimal"></label>
          <label>Cuisse G (cm) <input type="number" step="0.1" name="thighL" inputmode="decimal"></label>
          <label>Cuisse D (cm) <input type="number" step="0.1" name="thighR" inputmode="decimal"></label>
          <label>Mollet G (cm) <input type="number" step="0.1" name="calfL" inputmode="decimal"></label>
          <label>Mollet D (cm) <input type="number" step="0.1" name="calfR" inputmode="decimal"></label>
          <label class="full">Note libre <input type="text" name="note"></label>
          <button type="submit" class="btn btn-primary btn-block">Enregistrer</button>
        </form>
      </section>
      <section class="card">
        <h3>Comparaison début → maintenant</h3>
        <div id="measure-delta"></div>
      </section>
      <section class="card">
        <h3>Historique</h3>
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
      renderMeasurements();
    });
    await renderMeasurementDelta();
    await renderMeasurementHistory();
  }

  async function renderMeasurementDelta() {
    const root = document.getElementById('measure-delta');
    const items = (await DB.getAll('measurements')).sort((a, b) => a.date.localeCompare(b.date));
    if (items.length < 2) { root.innerHTML = '<p class="muted small">Au moins 2 saisies nécessaires.</p>'; return; }
    const first = items[0], last = items[items.length - 1];
    const fields = [
      ['weight', 'Poids', 'kg'], ['armL', 'Bras G', 'cm'], ['armR', 'Bras D', 'cm'],
      ['chest', 'Poitrine', 'cm'], ['waist', 'Taille', 'cm'],
      ['thighL', 'Cuisse G', 'cm'], ['thighR', 'Cuisse D', 'cm'],
      ['calfL', 'Mollet G', 'cm'], ['calfR', 'Mollet D', 'cm'],
    ];
    let html = `<p class="small muted">Du ${first.date.slice(0,10)} au ${last.date.slice(0,10)}</p>
      <table class="delta-table"><tbody>`;
    for (const [k, label, u] of fields) {
      if (first[k] == null || last[k] == null) continue;
      const d = parseFloat(last[k]) - parseFloat(first[k]);
      const sign = d > 0 ? '+' : '';
      const cls = d > 0 ? 'up' : (d < 0 ? 'down' : '');
      html += `<tr><td>${label}</td><td>${first[k]} → ${last[k]} ${u}</td>
        <td class="delta ${cls}">${sign}${d.toFixed(1)}</td></tr>`;
    }
    html += '</tbody></table>';
    root.innerHTML = html;
  }

  async function renderMeasurementHistory() {
    const root = document.getElementById('measure-history');
    const items = (await DB.getAll('measurements')).sort((a, b) => b.date.localeCompare(a.date));
    if (!items.length) { root.innerHTML = '<p class="muted small">Aucune saisie.</p>'; return; }
    root.innerHTML = `<ul class="history-list">${items.map(m => `
      <li>
        <strong>${m.date.slice(0,10)}</strong> ·
        ${m.weight ? m.weight + ' kg · ' : ''}
        ${m.armR ? 'bras ' + m.armR + ' · ' : ''}
        ${m.waist ? 'taille ' + m.waist + ' · ' : ''}
        ${m.sleep ? 'sommeil ' + m.sleep + 'h' : ''}
        <button class="btn btn-tiny" data-del="${m.id}">✕</button>
      </li>`).join('')}</ul>`;
    root.querySelectorAll('[data-del]').forEach(b => b.addEventListener('click', async () => {
      if (confirm('Supprimer cette saisie ?')) {
        await DB.del('measurements', parseInt(b.dataset.del, 10));
        renderMeasurements();
      }
    }));
  }

  // ---- Settings ----
  async function renderSettings() {
    const root = document.getElementById('screen-settings');
    const theme = await DB.getSetting('theme', 'dark');
    const units = await DB.getSetting('units', 'metric');
    const sound = await DB.getSetting('soundEnabled', true);
    const vibration = await DB.getSetting('vibrationEnabled', true);

    root.innerHTML = `<h1 class="screen-title">Réglages</h1>
      <section class="card">
        <h3>Apparence</h3>
        <label class="toggle-row"><span>Mode sombre</span>
          <input type="checkbox" id="set-theme" ${theme === 'dark' ? 'checked' : ''}></label>
      </section>
      <section class="card">
        <h3>Unités</h3>
        <label class="toggle-row"><span>kg / cm (sinon lbs / pouces)</span>
          <input type="checkbox" id="set-units" ${units === 'metric' ? 'checked' : ''}></label>
      </section>
      <section class="card">
        <h3>Timer</h3>
        <label class="toggle-row"><span>Sons</span>
          <input type="checkbox" id="set-sound" ${sound ? 'checked' : ''}></label>
        <label class="toggle-row"><span>Vibration (Android)</span>
          <input type="checkbox" id="set-vib" ${vibration ? 'checked' : ''}></label>
      </section>
      <section class="card">
        <h3>Données</h3>
        <button class="btn btn-ghost btn-block" id="export">Exporter (JSON)</button>
        <label class="btn btn-ghost btn-block">
          Importer (JSON)
          <input id="import" type="file" accept="application/json" hidden>
        </label>
        <button class="btn btn-danger btn-block" id="reset">Reset complet</button>
      </section>
      <section class="card center">
        <p class="muted small">Tracker Muscu · 100% offline · IndexedDB</p>
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
    document.getElementById('set-sound').addEventListener('change', async e => {
      await DB.setSetting('soundEnabled', e.target.checked);
    });
    document.getElementById('set-vib').addEventListener('change', async e => {
      await DB.setSetting('vibrationEnabled', e.target.checked);
    });
    document.getElementById('export').addEventListener('click', exportData);
    document.getElementById('import').addEventListener('change', importData);
    document.getElementById('reset').addEventListener('click', async () => {
      if (confirm('Effacer TOUTES les données ? Action irréversible.')) {
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
    a.href = url;
    a.download = `tracker-export-${new Date().toISOString().slice(0,10)}.json`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  async function importData(e) {
    const file = e.target.files[0];
    if (!file) return;
    try {
      const text = await file.text();
      const data = JSON.parse(text);
      if (!confirm('Remplacer toutes les données actuelles par celles du fichier ?')) return;
      await DB.importAll(data);
      alert('Import réussi.');
      location.reload();
    } catch (err) {
      alert('Erreur import : ' + err.message);
    }
  }

  // ---- Service worker ----
  function registerServiceWorker() {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('./service-worker.js')
        .catch(err => console.warn('SW non enregistré', err));
    }
  }

  function requestNotificationPermission() {
    if ('Notification' in window && Notification.permission === 'default') {
      const handler = () => {
        try { Notification.requestPermission(); } catch (e) {}
        document.removeEventListener('click', handler);
      };
      document.addEventListener('click', handler, { once: true });
    }
  }

  return { init, switchTab, renderSessions };
})();

window.App = App;

document.addEventListener('DOMContentLoaded', () => App.init());
