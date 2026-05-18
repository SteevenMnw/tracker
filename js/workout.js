// ============================================================================
// workout.js — Mode "séance en cours" : sets, timer, sauvegarde
// ============================================================================

const Workout = (() => {
  let current = null; // { workoutId, sessionId, exercises, startedAt, sets: [] }
  let timerInterval = null;
  let timerEndsAt = 0;
  let audioCtx = null;

  // ---- Timer ----
  function startTimer(seconds) {
    cancelTimer();
    timerEndsAt = Date.now() + seconds * 1000;
    const modal = document.getElementById('timer-modal');
    modal.classList.add('open');
    updateTimerDisplay();
    timerInterval = setInterval(() => {
      const remaining = Math.max(0, Math.round((timerEndsAt - Date.now()) / 1000));
      updateTimerDisplay();
      if (remaining <= 0) {
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
    // Son via Web Audio (pas de fichier externe nécessaire)
    const enabled = await DB.getSetting('soundEnabled', true);
    if (enabled) playBeep();
    // Vibration (Android — iOS ignore silencieusement)
    if (navigator.vibrate) {
      try { navigator.vibrate([200, 100, 200, 100, 400]); } catch (e) {}
    }
    // Animation feedback léger
    flash(document.body);
  }

  function updateTimerDisplay() {
    const remaining = Math.max(0, Math.round((timerEndsAt - Date.now()) / 1000));
    const m = Math.floor(remaining / 60);
    const s = remaining % 60;
    document.getElementById('timer-display').textContent =
      `${m}:${String(s).padStart(2, '0')}`;
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

  function flash(el) {
    el.classList.add('flash');
    setTimeout(() => el.classList.remove('flash'), 400);
  }

  // ---- Démarrage / fin de séance ----
  async function startSession(sessionId) {
    const session = Program.SESSIONS[sessionId];
    if (!session) return;
    const phase = Program.getCurrentPhase(await DB.getSetting('startDate'));
    // Applique surcharges éventuelles
    const overrides = await DB.getAll('program_overrides');
    const ovMap = Object.fromEntries(overrides.map(o => [o.exerciseId, o]));
    const exercises = session.exercises.map(ex => {
      const ov = ovMap[ex.id] || {};
      const setsCount = phase.deload ? Math.max(2, Math.floor(ex.sets * 0.6)) : ex.sets;
      return {
        ...ex,
        rir: ov.rir ?? ex.rir,
        rest: ov.rest ?? ex.rest,
        name: ov.name ?? ex.name,
        sets: setsCount,
      };
    });
    current = {
      workoutId: null,
      sessionId,
      sessionName: session.name,
      phase: phase.name,
      week: Program.getCurrentWeek(await DB.getSetting('startDate')),
      isDeload: phase.deload,
      intensityMultiplier: phase.intensityMultiplier,
      exercises,
      startedAt: new Date().toISOString(),
      completedSets: [],
    };
    // Crée le workout en base immédiatement (sauvegarde auto)
    current.workoutId = await DB.add('workouts', {
      sessionId,
      sessionName: session.name,
      date: current.startedAt,
      phase: current.phase,
      week: current.week,
      isDeload: current.isDeload,
      finished: false,
    });
    renderWorkout();
    openModal('workout-modal');
  }

  async function logSet(exerciseId, setIndex, weight, reps, rir) {
    const ex = current.exercises.find(e => e.id === exerciseId);
    const record = {
      workoutId: current.workoutId,
      exerciseId,
      exerciseName: ex.name,
      setIndex,
      weight: parseFloat(weight) || 0,
      reps: parseInt(reps, 10) || 0,
      rir: parseInt(rir, 10) || 0,
      date: new Date().toISOString(),
    };
    const id = await DB.add('sets', record);
    record.id = id;
    current.completedSets.push(record);
    // Met à jour l'historique du dernier passage (pour suggestion suivante)
    const previous = await DB.get('exercise_history', exerciseId);
    if (!previous || setIndex === 0) {
      // Si premier set, on initialise la session courante
      await DB.put('exercise_history', {
        exerciseId,
        lastDate: record.date,
        lastSets: [record],
      });
    } else {
      previous.lastDate = record.date;
      previous.lastSets = previous.lastSets || [];
      // Si même session, ajoute le set ; sinon écrase
      if (previous.lastSets[0] && previous.lastSets[0].workoutId === current.workoutId) {
        previous.lastSets.push(record);
      } else {
        previous.lastSets = [record];
      }
      await DB.put('exercise_history', previous);
    }
    // Déclenche le timer
    startTimer(ex.rest);
  }

  async function finishSession(sensation, note) {
    if (!current) return;
    const workout = await DB.get('workouts', current.workoutId);
    workout.finished = true;
    workout.finishedAt = new Date().toISOString();
    workout.sensation = sensation;
    workout.note = note;
    workout.totalSets = current.completedSets.length;
    workout.totalVolume = current.completedSets.reduce(
      (a, s) => a + (s.weight * s.reps), 0
    );
    await DB.put('workouts', workout);
    closeModal('workout-modal');
    current = null;
    if (window.App && App.refreshAll) App.refreshAll();
  }

  async function abortSession() {
    if (current && current.workoutId) {
      // Conserve la séance (autosave) mais marque non finie
      // Optionnel : supprimer si aucun set
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
    const deloadBadge = current.isDeload
      ? `<span class="badge badge-warning">⚠️ Semaine deload — charges 60%</span>` : '';
    header.innerHTML = `
      <h2>${current.sessionName}</h2>
      <p class="muted">Semaine ${current.week} — ${current.phase}</p>
      ${deloadBadge}
    `;
    root.appendChild(header);

    for (let i = 0; i < current.exercises.length; i++) {
      const ex = current.exercises[i];
      const card = await renderExerciseCard(ex, i);
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
    card.dataset.exerciseId = ex.id;

    // Dernier passage
    const lastSession = await DB.get('exercise_history', ex.id);
    const lastSetsHtml = (lastSession && lastSession.lastSets &&
                         lastSession.lastSets[0] &&
                         lastSession.lastSets[0].workoutId !== current.workoutId)
      ? renderLastSetsLine(lastSession.lastSets)
      : '<p class="muted small">Premier passage sur cet exercice.</p>';

    const suggestion = await computeSuggestion(ex, lastSession);
    const repsTarget = ex.isTime
      ? `${ex.repsMin}-${ex.repsMax} s`
      : `${ex.repsMin}-${ex.repsMax} reps`;
    const perSideLabel = ex.perSide ? ' / côté' : '';
    const ezBadge = ex.ezBarOnly
      ? `<span class="badge badge-warning">⚠️ Utiliser barre EZ uniquement</span>` : '';

    card.innerHTML = `
      <header class="exercise-head">
        <h3>${index + 1}. ${ex.name}${perSideLabel}</h3>
        ${ezBadge}
        <div class="exercise-meta">
          <span>${ex.sets} × ${repsTarget}</span>
          <span>RIR ${ex.rir}</span>
          <span>Repos ${formatRest(ex.rest)}</span>
          ${ex.tempo ? `<span>Tempo ${ex.tempo}</span>` : ''}
        </div>
        <p class="exercise-note">${ex.note}</p>
        <div class="exercise-actions">
          <a class="btn btn-ghost" href="${Exercises.buildYouTubeUrl(ex.name)}"
             target="_blank" rel="noopener">▶ Voir technique</a>
        </div>
      </header>
      <div class="exercise-body">
        <div class="anatomy-wrap"></div>
        <div class="exercise-right">
          <div class="last-session">${lastSetsHtml}</div>
          ${suggestion ? `<div class="suggestion">💡 ${suggestion}</div>` : ''}
          <div class="sets-list"></div>
        </div>
      </div>
    `;

    card.querySelector('.anatomy-wrap').appendChild(Exercises.buildAnatomySvg(ex.muscles));

    const setsList = card.querySelector('.sets-list');
    for (let s = 0; s < ex.sets; s++) {
      setsList.appendChild(buildSetRow(ex, s));
    }

    return card;
  }

  function renderLastSetsLine(sets) {
    const txt = sets.map(s => `${s.weight}kg × ${s.reps} (RIR ${s.rir})`).join(' · ');
    return `<p class="small"><strong>Dernier passage :</strong> ${txt}</p>`;
  }

  // Formule Epley pour suggestion : si dernier set en haut de fourchette avec RIR ≥ cible → +charge
  async function computeSuggestion(ex, lastSession) {
    if (!lastSession || !lastSession.lastSets || !lastSession.lastSets.length) return null;
    const last = lastSession.lastSets;
    // On regarde le top set (dernier set)
    const top = last[last.length - 1];
    if (top.reps >= ex.repsMax && top.rir >= ex.rir) {
      const increment = ex.isCompound ? 2.5 : 1.25;
      const newWeight = Math.round((top.weight + increment) * 2) / 2;
      return `Tu as fait ${top.weight}kg × ${top.reps} (RIR ${top.rir}) → essaie <strong>${newWeight} kg</strong>.`;
    }
    if (top.reps < ex.repsMin) {
      return `Reps en dessous de la cible — garde la charge et vise ${ex.repsMin}+ reps.`;
    }
    return `Reste sur ${top.weight} kg, vise plus de reps cette fois.`;
  }

  function buildSetRow(ex, setIndex) {
    const row = document.createElement('div');
    row.className = 'set-row';
    row.dataset.setIndex = setIndex;
    const deloadHint = current.isDeload ? ' (deload : ~60% charge habituelle)' : '';
    row.innerHTML = `
      <span class="set-num">Set ${setIndex + 1}</span>
      <label class="sr-only" for="w-${ex.id}-${setIndex}">Charge (kg)</label>
      <input id="w-${ex.id}-${setIndex}" type="number" inputmode="decimal" step="0.5"
             placeholder="kg${deloadHint}" aria-label="Charge ${setIndex + 1}">
      <label class="sr-only" for="r-${ex.id}-${setIndex}">Reps</label>
      <input id="r-${ex.id}-${setIndex}" type="number" inputmode="numeric"
             placeholder="${ex.isTime ? 'sec' : 'reps'}" aria-label="Reps ${setIndex + 1}">
      <label class="sr-only" for="ri-${ex.id}-${setIndex}">RIR</label>
      <input id="ri-${ex.id}-${setIndex}" type="number" inputmode="numeric"
             placeholder="RIR" min="0" max="10" aria-label="RIR ${setIndex + 1}">
      <button class="btn btn-small validate-set" aria-label="Valider set">✓</button>
    `;
    const btn = row.querySelector('.validate-set');
    btn.addEventListener('click', async () => {
      const w = row.querySelector(`#w-${ex.id}-${setIndex}`).value;
      const r = row.querySelector(`#r-${ex.id}-${setIndex}`).value;
      const ri = row.querySelector(`#ri-${ex.id}-${setIndex}`).value || ex.rir;
      if (!r) { alert('Indique au moins les reps.'); return; }
      await logSet(ex.id, setIndex, w, r, ri);
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
    const overlay = document.getElementById('finish-modal');
    overlay.classList.add('open');
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
