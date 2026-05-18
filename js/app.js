// ============================================================================
// app.js — Logique principale : routing, rendu des 5 onglets, init
// ============================================================================

const App = (() => {
  let charts = {}; // référence aux instances Chart.js pour destruction propre

  // ---- Init ----
  async function init() {
    // Date de démarrage du programme
    let startDate = await DB.getSetting('startDate');
    if (!startDate) {
      startDate = Date.now();
      await DB.setSetting('startDate', startDate);
    }
    // Theme
    const theme = await DB.getSetting('theme', 'dark');
    document.documentElement.dataset.theme = theme;
    // Units
    const units = await DB.getSetting('units', 'metric');
    document.documentElement.dataset.units = units;

    bindTabs();
    bindGlobal();
    await refreshAll();
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
    if (name === 'stats') renderStats();
    if (name === 'measurements') renderMeasurements();
    if (name === 'program') renderProgramView();
    if (name === 'settings') renderSettings();
  }

  function bindGlobal() {
    // Modal finish (séance terminée)
    document.getElementById('finish-confirm').addEventListener('click', async () => {
      const sensation = parseInt(document.getElementById('finish-sensation').value, 10) || 7;
      const note = document.getElementById('finish-note').value;
      await Workout.finishSession(sensation, note);
      document.getElementById('finish-modal').classList.remove('open');
      document.getElementById('finish-note').value = '';
      switchTab('today');
    });
    document.getElementById('finish-cancel').addEventListener('click', () => {
      document.getElementById('finish-modal').classList.remove('open');
    });
    // Modal timer
    document.getElementById('timer-skip').addEventListener('click', () => Workout.cancelTimer());
    document.getElementById('timer-plus').addEventListener('click', () => Workout.adjustTimer(15));
    document.getElementById('timer-minus').addEventListener('click', () => Workout.adjustTimer(-15));
    // Modal workout — abort
    document.getElementById('workout-abort').addEventListener('click', async () => {
      if (confirm('Quitter la séance ? Les sets validés restent enregistrés.')) {
        await Workout.abortSession();
      }
    });
  }

  // ---- Aujourd'hui ----
  async function refreshAll() {
    await renderToday();
  }

  async function renderToday() {
    const root = document.getElementById('screen-today');
    const sessionId = Program.getTodaySessionId();
    const startDate = await DB.getSetting('startDate');
    const week = Program.getCurrentWeek(startDate);
    const phase = Program.getCurrentPhase(startDate);
    const dayNames = ['dimanche', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi'];
    const today = dayNames[new Date().getDay()];

    let body = '';
    if (sessionId === 'rest') {
      body = `
        <div class="card center">
          <h2>Jour de repos 🛌</h2>
          <p class="muted">${capitalize(today)} — pas de séance prévue.</p>
          <p>Optionnel : <strong>20-30 min de cardio LISS</strong> (marche rapide, vélo modéré).
             Ne dégrade pas la récupération musculaire.</p>
          <button class="btn btn-ghost" id="manual-session">Faire une autre séance</button>
        </div>
      `;
    } else {
      const session = Program.SESSIONS[sessionId];
      const restAvg = avgRest(session.exercises);
      const rirAvg = avgRir(session.exercises);
      const deloadNote = phase.deload
        ? `<div class="banner banner-warning">⚠️ <strong>Semaine deload</strong> — charges
            automatiquement réduites à ~60%, sets réduits, intensité maintenue.</div>` : '';
      const checkpointNote = phase.checkpoint
        ? `<div class="banner banner-info">📏 Checkpoint cette semaine : pense à mettre à jour tes mensurations.</div>` : '';
      body = `
        <div class="card">
          <p class="muted small">${capitalize(today)} · Semaine ${week} / 12 · ${phase.name}</p>
          ${deloadNote}
          ${checkpointNote}
          <h2>${session.name}</h2>
          <p class="muted">${session.focus}</p>
          <div class="today-meta">
            <span><strong>${session.exercises.length}</strong> exercices</span>
            <span>RIR cible moyen <strong>${rirAvg}</strong></span>
            <span>Repos moyen <strong>${restAvg}</strong></span>
          </div>
          <button class="btn btn-primary btn-block" id="start-session-btn">Commencer la séance</button>
        </div>
      `;
    }

    // Stagnation alert
    const stagnant = await Stats.detectStagnation();
    let stagnantHtml = '';
    if (stagnant.length) {
      stagnantHtml = `
        <div class="card warning">
          <h3>⚠️ Stagnation détectée</h3>
          <ul>${stagnant.map(s => `<li>${s.name} — pas de progression depuis ${s.since}</li>`).join('')}</ul>
          <p class="small muted">Envisage : changer de variation, réduire le volume du muscle d'1 set, ou vérifier ton sommeil.</p>
        </div>
      `;
    }

    root.innerHTML = `<h1 class="screen-title">Aujourd'hui</h1>${body}${stagnantHtml}`;

    const startBtn = document.getElementById('start-session-btn');
    if (startBtn) startBtn.addEventListener('click', () => Workout.startSession(sessionId));
    const manualBtn = document.getElementById('manual-session');
    if (manualBtn) manualBtn.addEventListener('click', () => promptManualSession());
  }

  function promptManualSession() {
    const ids = Object.keys(Program.SESSIONS);
    const labels = ids.map(id => Program.SESSIONS[id].name);
    const choice = prompt(
      'Quelle séance ?\n' + ids.map((id, i) => `${i + 1}. ${labels[i]}`).join('\n'),
      '1'
    );
    const idx = parseInt(choice, 10) - 1;
    if (ids[idx]) Workout.startSession(ids[idx]);
  }

  function avgRest(exs) {
    const a = Math.round(exs.reduce((x, e) => x + e.rest, 0) / exs.length);
    return a >= 60 ? Math.round(a / 60) + ' min' : a + 's';
  }
  function avgRir(exs) {
    return (exs.reduce((x, e) => x + e.rir, 0) / exs.length).toFixed(1);
  }
  function capitalize(s) { return s.charAt(0).toUpperCase() + s.slice(1); }

  // ---- Programme (vue d'ensemble + édition) ----
  async function renderProgramView() {
    const root = document.getElementById('screen-program');
    const overrides = await DB.getAll('program_overrides');
    const ovMap = Object.fromEntries(overrides.map(o => [o.exerciseId, o]));
    let html = `<h1 class="screen-title">Programme</h1>
      <p class="muted">Lecture seule par défaut. Active "Modifier" pour personnaliser.</p>
      <label class="toggle-row">
        <input type="checkbox" id="edit-mode"> Modifier
      </label>`;

    for (const sid of ['upper_a', 'lower_a', 'upper_b', 'lower_b']) {
      const session = Program.SESSIONS[sid];
      html += `<section class="card">
        <h2>${session.name}</h2>
        <p class="muted small">${session.focus}</p>
        <ol class="exercise-summary">`;
      for (const ex of session.exercises) {
        const ov = ovMap[ex.id] || {};
        const repsTarget = ex.isTime ? `${ex.repsMin}-${ex.repsMax}s` : `${ex.repsMin}-${ex.repsMax}`;
        html += `<li data-ex="${ex.id}">
          <div class="ex-line">
            <span class="ex-name">${ov.name ?? ex.name}${ex.perSide ? ' (par côté)' : ''}</span>
            <span class="ex-prescription">${ex.sets}×${repsTarget}</span>
          </div>
          <div class="ex-detail muted small">RIR <span class="rir-val">${ov.rir ?? ex.rir}</span>
            · Repos <span class="rest-val">${ov.rest ?? ex.rest}</span>s${ex.ezBarOnly ? ' · ⚠️ EZ uniquement' : ''}</div>
          <div class="ex-edit hidden">
            <label>Nom <input type="text" class="ex-edit-name" value="${ov.name ?? ex.name}"></label>
            <label>RIR <input type="number" class="ex-edit-rir" value="${ov.rir ?? ex.rir}" min="0" max="5"></label>
            <label>Repos (s) <input type="number" class="ex-edit-rest" value="${ov.rest ?? ex.rest}" min="0"></label>
            <button class="btn btn-small ex-save">Enregistrer</button>
            <button class="btn btn-small btn-ghost ex-reset">Réinitialiser</button>
          </div>
        </li>`;
      }
      html += `</ol></section>`;
    }
    root.innerHTML = html;

    const editToggle = document.getElementById('edit-mode');
    editToggle.addEventListener('change', () => {
      root.querySelectorAll('.ex-edit').forEach(el => el.classList.toggle('hidden', !editToggle.checked));
    });

    root.querySelectorAll('li[data-ex]').forEach(li => {
      const exId = li.dataset.ex;
      li.querySelector('.ex-save').addEventListener('click', async () => {
        const name = li.querySelector('.ex-edit-name').value.trim();
        const rir = parseInt(li.querySelector('.ex-edit-rir').value, 10);
        const rest = parseInt(li.querySelector('.ex-edit-rest').value, 10);
        await DB.put('program_overrides', { exerciseId: exId, name, rir, rest });
        renderProgramView();
      });
      li.querySelector('.ex-reset').addEventListener('click', async () => {
        await DB.del('program_overrides', exId);
        renderProgramView();
      });
    });
  }

  // ---- Stats ----
  async function renderStats() {
    const root = document.getElementById('screen-stats');
    root.innerHTML = `
      <h1 class="screen-title">Stats</h1>
      <section class="card">
        <h3>1RM estimé — exos clés</h3>
        <canvas id="chart-1rm" height="200" aria-label="Évolution 1RM estimé"></canvas>
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
    // On dérive le sommeil depuis les mensurations (champ sleep optionnel)
    const items = await DB.getAll('measurements');
    if (!items.length) { noDataMessage('chart-sleep'); return; }
    // Bucket par semaine
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
          type: xType === 'time' ? 'category' : 'category',
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
        <h3>Comparaison début ↔ maintenant</h3>
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
        ${m.sleep ? '💤 ' + m.sleep + 'h' : ''}
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
    const startDate = await DB.getSetting('startDate');
    const week = Program.getCurrentWeek(startDate);
    const phase = Program.getCurrentPhase(startDate);

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
        <h3>Programme</h3>
        <p class="muted small">Semaine ${week} / 12 — ${phase.name}</p>
        <button class="btn btn-ghost btn-block" id="force-deload">Marquer cette semaine comme deload</button>
        <button class="btn btn-ghost btn-block" id="reset-start">Reset date de démarrage à aujourd'hui</button>
      </section>
      <section class="card">
        <h3>Données</h3>
        <button class="btn btn-ghost btn-block" id="export">📤 Exporter (JSON)</button>
        <label class="btn btn-ghost btn-block">
          📥 Importer (JSON)
          <input id="import" type="file" accept="application/json" hidden>
        </label>
        <button class="btn btn-danger btn-block" id="reset">🗑️ Reset complet</button>
      </section>
      <section class="card center">
        <p class="muted small">Tracker Hypertrophie/Force · 100% offline · IndexedDB</p>
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
    document.getElementById('force-deload').addEventListener('click', async () => {
      // Reset startDate pour positionner semaine courante = 5 (deload)
      const wk = Program.getCurrentWeek(startDate);
      const shift = (5 - wk) * 7 * 24 * 60 * 60 * 1000;
      await DB.setSetting('startDate', startDate + shift);
      alert('Semaine courante désormais marquée comme deload.');
      refreshAll();
      renderSettings();
    });
    document.getElementById('reset-start').addEventListener('click', async () => {
      if (confirm('Recommencer le programme depuis aujourd\'hui ?')) {
        await DB.setSetting('startDate', Date.now());
        refreshAll();
        renderSettings();
      }
    });
    document.getElementById('export').addEventListener('click', exportData);
    document.getElementById('import').addEventListener('change', importData);
    document.getElementById('reset').addEventListener('click', async () => {
      if (confirm('⚠️ Effacer TOUTES les données (séances, mensurations, paramètres) ? Action irréversible.')) {
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
      // Demande au premier geste utilisateur, pas au boot
      const handler = () => {
        try { Notification.requestPermission(); } catch (e) {}
        document.removeEventListener('click', handler);
      };
      document.addEventListener('click', handler, { once: true });
    }
  }

  return { init, refreshAll, switchTab };
})();

window.App = App;

// Init au chargement
document.addEventListener('DOMContentLoaded', () => App.init());
