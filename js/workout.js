// ============================================================================
// workout.js — Mode "séance en cours" : sets, timer, sauvegarde
// ============================================================================

const Workout = (() => {
  let current = null;
  let timerInterval = null;
  let timerEndsAt = 0;
  let audioCtx = null;

  // ---- Timer ----
  function startTimer(seconds) {
    cancelTimer();
    timerEndsAt = Date.now() + seconds * 1000;
    document.getElementById('timer-modal').classList.add('open');
    updateTimerDisplay();
    timerInterval = setInterval(() => {
      updateTimerDisplay();
      if (Math.max(0, Math.round((timerEndsAt - Date.now()) / 1000)) <= 0) {
        finishTimer();
      }
    }, 250);
  }

  function adjustTimer(deltaSec) {
    timerEndsAt += deltaSec * 1000;
    if (timerEndsAt < Date.now()) timerEndsAt = Date.now();
    updateTimerDisplay();
  }

  function cancelTimer() {
    if (timerInterval) clearInterval(timerInterval);
    timerInterval = null;
    document.getElementById('timer-modal').classList.remove('open');
  }

  async function finishTimer() {
    cancelTimer();
    const enabled = await DB.getSetting('soundEnabled', true);
    if (enabled) playBeep();
    if (navigator.vibrate) {
      try { navigator.vibrate([200, 100, 200, 100, 400]); } catch (e) {}
    }
    flashBody();
  }

  function updateTimerDisplay() {
    const remaining = Math.max(0, Math.round((timerEndsAt - Date.now()) / 1000));
    const m = Math.floor(remaining / 60);
    const s = remaining % 60;
    document.getElementById('timer-display').textContent = `${m}:${String(s).padStart(2, '0')}`;
  }

  function playBeep() {
    try {
      if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      const ctx = audioCtx;
      const beep = (freq, start, duration) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.frequency.value = freq;
        osc.type = 'sine';
        gain.gain.setValueAtTime(0, ctx.currentTime + start);
        gain.gain.linearRampToValueAtTime(0.3, ctx.currentTime + start + 0.02);
        gain.gain.linearRampToValueAtTime(0, ctx.currentTime + start + duration);
        osc.connect(gain).connect(ctx.destination);
        osc.start(ctx.currentTime + start);
        osc.stop(ctx.currentTime + start + duration);
      };
      beep(880, 0, 0.18);
      beep(880, 0.22, 0.18);
      beep(1320, 0.44, 0.35);
    } catch (e) { console.warn('Audio non disponible', e); }
  }

  function flashBody() {
    document.body.classList.add('flash');
    setTimeout(() => document.body.classList.remove('flash'), 400);
  }

  // ---- Démarrage / fin de séance ----
  async function startSession(sessionId) {
    const allSessions = await Program.getAllSessions();
    const session = allSessions[sessionId];
    if (!session) return;

    const overrides = await DB.getAll('program_overrides');
    const ovMap = Object.fromEntries(overrides.map(o => [o.exerciseId, o]));

    const exercises = session.exercises.map(ex => {
      const ov = ovMap[ex.id] || {};
      return {
        ...ex,
        rest: ov.rest ?? ex.rest,
        name: ov.name ?? ex.name,
      };
    });

    current = {
      workoutId: null,
      sessionId,
      sessionName: session.name,
      exercises,
      startedAt: new Date().toISOString(),
      completedSets: [],
    };

    current.workoutId = await DB.add('workouts', {
      sessionId,
      sessionName: session.name,
      date: current.startedAt,
      finished: false,
    });

    renderWorkout();
    openModal('workout-modal');
  }

  async function logSet(exerciseId, setIndex, weight, reps) {
    const ex = current.exercises.find(e => e.id === exerciseId);
    const record = {
      workoutId: current.workoutId,
      exerciseId,
      exerciseName: ex.name,
      setIndex,
      weight: parseFloat(weight) || 0,
      reps: parseInt(reps, 10) || 0,
      date: new Date().toISOString(),
    };
    const id = await DB.add('sets', record);
    record.id = id;
    current.completedSets.push(record);

    // Met à jour l'historique du dernier passage
    const previous = await DB.get('exercise_history', exerciseId);
    if (!previous || setIndex === 0) {
      await DB.put('exercise_history', {
        exerciseId,
        lastDate: record.date,
        lastSets: [record],
      });
    } else {
      previous.lastDate = record.date;
      previous.lastSets = previous.lastSets || [];
      if (previous.lastSets[0] && previous.lastSets[0].workoutId === current.workoutId) {
        previous.lastSets.push(record);
      } else {
        previous.lastSets = [record];
      }
      await DB.put('exercise_history', previous);
    }

    startTimer(ex.rest);
  }

  async function finishSession(note) {
    if (!current) return;
    const workout = await DB.get('workouts', current.workoutId);
    workout.finished = true;
    workout.finishedAt = new Date().toISOString();
    workout.note = note;
    workout.totalSets = current.completedSets.length;
    workout.totalVolume = current.completedSets.reduce(
      (a, s) => a + (s.weight * s.reps), 0
    );
    await DB.put('workouts', workout);
    closeModal('workout-modal');
    current = null;
  }

  async function abortSession() {
    if (current && current.workoutId) {
      if (current.completedSets.length === 0) {
        await DB.del('workouts', current.workoutId);
      }
    }
    current = null;
    closeModal('workout-modal');
  }

  // ---- Rendu DOM ----
  async function renderWorkout() {
    const root = document.getElementById('workout-content');
    root.innerHTML = '';

    const header = document.createElement('div');
    header.className = 'workout-header';
    header.innerHTML = `<h2>${current.sessionName}</h2>`;
    root.appendChild(header);

    for (let i = 0; i < current.exercises.length; i++) {
      const card = await renderExerciseCard(current.exercises[i], i);
      root.appendChild(card);
    }

    const finishBtn = document.createElement('button');
    finishBtn.className = 'btn btn-primary btn-block';
    finishBtn.textContent = 'Terminer la séance';
    finishBtn.addEventListener('click', () => promptFinish());
    root.appendChild(finishBtn);
  }

  async function renderExerciseCard(ex, index) {
    const card = document.createElement('section');
    card.className = 'exercise-card';

    const lastSession = await DB.get('exercise_history', ex.id);
    const lastSetsHtml = (lastSession && lastSession.lastSets &&
                         lastSession.lastSets[0] &&
                         lastSession.lastSets[0].workoutId !== current.workoutId)
      ? renderLastSetsLine(lastSession.lastSets)
      : '<p class="muted small">Premier passage sur cet exercice.</p>';

    const suggestion = computeSuggestion(ex, lastSession);
    const repsTarget = ex.isTime
      ? `${ex.repsMin}-${ex.repsMax} s`
      : `${ex.repsMin}-${ex.repsMax} reps`;
    const perSideLabel = ex.perSide ? ' / côté' : '';
    const ezBadge = ex.ezBarOnly
      ? `<span class="badge badge-warning">EZ uniquement</span>` : '';

    // Résout les muscles depuis le catalogue si pas dans l'objet exercice
    const cat = Exercises.getCatalogExercise(ex.id);
    const muscles = (ex.muscles && ex.muscles.length) ? ex.muscles : (cat ? cat.muscles : []);
    const hasMuscles = muscles && muscles.length > 0;

    card.innerHTML = `
      <header class="exercise-head">
        <h3>${index + 1}. ${ex.name}${perSideLabel}</h3>
        ${ezBadge}
        <div class="exercise-meta">
          <span>${ex.sets} × ${repsTarget}</span>
          <span>Repos ${formatRest(ex.rest)}</span>
        </div>
        ${ex.note ? `<p class="exercise-note">${ex.note}</p>` : ''}
        <div class="exercise-actions">
          <a class="btn btn-ghost btn-small" href="${Exercises.buildYouTubeUrl(ex.name)}"
             target="_blank" rel="noopener">Voir technique</a>
        </div>
      </header>
      <div class="exercise-body${hasMuscles ? '' : ' no-anatomy'}">
        ${hasMuscles ? '<div class="anatomy-wrap"></div>' : ''}
        <div class="exercise-right">
          <div class="last-session">${lastSetsHtml}</div>
          ${suggestion ? `<div class="suggestion">${suggestion}</div>` : ''}
          <div class="sets-list"></div>
        </div>
      </div>
    `;

    if (hasMuscles) {
      card.querySelector('.anatomy-wrap').appendChild(Exercises.buildAnatomySvg(muscles));
    }

    const setsList = card.querySelector('.sets-list');
    for (let s = 0; s < ex.sets; s++) {
      setsList.appendChild(buildSetRow(ex, s));
    }

    return card;
  }

  function renderLastSetsLine(sets) {
    const txt = sets.map(s => `${s.weight}kg × ${s.reps}`).join(' · ');
    return `<p class="small"><strong>Dernier passage :</strong> ${txt}</p>`;
  }

  function computeSuggestion(ex, lastSession) {
    if (!lastSession || !lastSession.lastSets || !lastSession.lastSets.length) return null;
    const top = lastSession.lastSets[lastSession.lastSets.length - 1];
    if (top.reps >= ex.repsMax) {
      const increment = ex.isCompound ? 2.5 : 1.25;
      const newWeight = Math.round((top.weight + increment) * 2) / 2;
      return `Dernier : ${top.weight}kg × ${top.reps} → essaie <strong>${newWeight} kg</strong>`;
    }
    if (top.reps < ex.repsMin) {
      return `Reps en dessous de la cible — garde la charge et vise ${ex.repsMin}+ reps.`;
    }
    return `Reste sur ${top.weight} kg, vise plus de reps.`;
  }

  function buildSetRow(ex, setIndex) {
    const row = document.createElement('div');
    row.className = 'set-row';
    row.innerHTML = `
      <span class="set-num">Set ${setIndex + 1}</span>
      <input type="number" inputmode="decimal" step="0.5"
             placeholder="kg" aria-label="Charge set ${setIndex + 1}">
      <input type="number" inputmode="numeric"
             placeholder="${ex.isTime ? 'sec' : 'reps'}" aria-label="Reps set ${setIndex + 1}">
      <button class="btn btn-small validate-set" aria-label="Valider set">✓</button>
    `;
    const btn = row.querySelector('.validate-set');
    const inputs = row.querySelectorAll('input');
    btn.addEventListener('click', async () => {
      const w = inputs[0].value;
      const r = inputs[1].value;
      if (!r) { alert('Indique au moins les reps.'); return; }
      await logSet(ex.id, setIndex, w, r);
      row.classList.add('done');
      btn.disabled = true;
      btn.textContent = '✓ ok';
    });
    return row;
  }

  function formatRest(sec) {
    if (sec < 60) return sec + 's';
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return s ? `${m}'${s}` : `${m} min`;
  }

  function promptFinish() {
    document.getElementById('finish-modal').classList.add('open');
  }

  function openModal(id) { document.getElementById(id).classList.add('open'); }
  function closeModal(id) { document.getElementById(id).classList.remove('open'); }

  return {
    startSession,
    finishSession,
    abortSession,
    startTimer,
    adjustTimer,
    cancelTimer,
    finishTimer,
    isActive: () => current !== null,
  };
})();

window.Workout = Workout;
