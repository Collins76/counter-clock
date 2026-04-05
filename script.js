(() => {
  "use strict";

  const STORAGE_KEY = "counterClock.targetTs";
  const els = {
    days: document.getElementById("days"),
    hours: document.getElementById("hours"),
    minutes: document.getElementById("minutes"),
    seconds: document.getElementById("seconds"),
    input: document.getElementById("target-input"),
    start: document.getElementById("btn-start"),
    pause: document.getElementById("btn-pause"),
    reset: document.getElementById("btn-reset"),
    stopAlarm: document.getElementById("btn-stop-alarm"),
    subtitle: document.getElementById("subtitle"),
  };

  const state = {
    targetTs: null,
    paused: false,
    frozenRemaining: 0,
    rafId: null,
    lastTickSec: -1,
    finished: false,
  };

  // ---- alarm / melody (Web Audio, no external files) ----
  // A short looping jingle — notes are [frequency Hz, duration seconds].
  // Melody: a cheerful 8-note riff inspired by "ode to joy"-style intervals.
  const MELODY = [
    [659.25, 0.35], // E5
    [659.25, 0.35], // E5
    [698.46, 0.35], // F5
    [783.99, 0.35], // G5
    [783.99, 0.35], // G5
    [698.46, 0.35], // F5
    [659.25, 0.35], // E5
    [587.33, 0.35], // D5
    [523.25, 0.35], // C5
    [523.25, 0.35], // C5
    [587.33, 0.35], // D5
    [659.25, 0.35], // E5
    [659.25, 0.55], // E5 (held)
    [587.33, 0.2],  // D5
    [587.33, 0.65], // D5 (held)
  ];

  const audio = {
    ctx: null,
    master: null,
    timer: null,
    playing: false,
  };

  function ensureAudio() {
    if (audio.ctx) return audio.ctx;
    const Ctor = window.AudioContext || window.webkitAudioContext;
    if (!Ctor) return null;
    audio.ctx = new Ctor();
    audio.master = audio.ctx.createGain();
    audio.master.gain.value = 0.18;
    audio.master.connect(audio.ctx.destination);
    return audio.ctx;
  }

  function playNote(startAt, freq, dur) {
    const ctx = audio.ctx;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "triangle";
    osc.frequency.value = freq;
    // quick attack / smooth release for a bell-like pluck
    gain.gain.setValueAtTime(0.0001, startAt);
    gain.gain.exponentialRampToValueAtTime(1.0, startAt + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, startAt + dur);
    osc.connect(gain).connect(audio.master);
    osc.start(startAt);
    osc.stop(startAt + dur + 0.05);

    // soft harmonic for sparkle
    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.type = "sine";
    osc2.frequency.value = freq * 2;
    gain2.gain.setValueAtTime(0.0001, startAt);
    gain2.gain.exponentialRampToValueAtTime(0.4, startAt + 0.02);
    gain2.gain.exponentialRampToValueAtTime(0.0001, startAt + dur);
    osc2.connect(gain2).connect(audio.master);
    osc2.start(startAt);
    osc2.stop(startAt + dur + 0.05);
  }

  function scheduleMelodyOnce(startAt) {
    let t = startAt;
    for (const [freq, dur] of MELODY) {
      playNote(t, freq, dur);
      t += dur;
    }
    return t; // end time
  }

  function startAlarm() {
    const ctx = ensureAudio();
    if (!ctx || audio.playing) return;
    if (ctx.state === "suspended") ctx.resume();
    audio.playing = true;
    els.stopAlarm.hidden = false;

    const loop = () => {
      if (!audio.playing) return;
      const end = scheduleMelodyOnce(audio.ctx.currentTime + 0.05);
      const msUntilEnd = (end - audio.ctx.currentTime) * 1000;
      audio.timer = setTimeout(loop, Math.max(100, msUntilEnd - 50));
    };
    loop();
  }

  function stopAlarm() {
    audio.playing = false;
    if (audio.timer) {
      clearTimeout(audio.timer);
      audio.timer = null;
    }
    els.stopAlarm.hidden = true;
  }

  // ---- helpers ----
  const pad = (n) => String(Math.max(0, n)).padStart(2, "0");

  function toLocalInputValue(ts) {
    const d = new Date(ts);
    const off = d.getTimezoneOffset();
    const local = new Date(ts - off * 60000);
    return local.toISOString().slice(0, 16);
  }

  function defaultTarget() {
    // Next New Year, local time
    const now = new Date();
    return new Date(now.getFullYear() + 1, 0, 1, 0, 0, 0).getTime();
  }

  function setDigit(el, value) {
    const v = pad(value);
    if (el.textContent !== v) {
      el.textContent = v;
      el.classList.remove("flip");
      // force reflow so re-adding the class restarts the animation
      void el.offsetWidth;
      el.classList.add("flip");
    }
  }

  function render(remainingMs) {
    const total = Math.max(0, Math.floor(remainingMs / 1000));
    const days = Math.floor(total / 86400);
    const hours = Math.floor((total % 86400) / 3600);
    const minutes = Math.floor((total % 3600) / 60);
    const seconds = total % 60;

    setDigit(els.days, days);
    setDigit(els.hours, hours);
    setDigit(els.minutes, minutes);
    setDigit(els.seconds, seconds);

    if (total <= 0) {
      document.body.classList.add("timesup");
      els.subtitle.textContent = "Time's up!";
      if (!state.finished) {
        state.finished = true;
        startAlarm();
      }
    } else {
      document.body.classList.remove("timesup");
      els.subtitle.textContent = "Counting down to the moment…";
      state.finished = false;
    }
  }

  function tick() {
    if (state.paused || state.targetTs == null) return;
    const remaining = state.targetTs - Date.now();
    const sec = Math.floor(remaining / 1000);
    if (sec !== state.lastTickSec) {
      state.lastTickSec = sec;
      render(remaining);
    }
    state.rafId = requestAnimationFrame(tick);
  }

  function startLoop() {
    cancelAnimationFrame(state.rafId);
    state.lastTickSec = -1;
    state.rafId = requestAnimationFrame(tick);
  }

  function stopLoop() {
    cancelAnimationFrame(state.rafId);
    state.rafId = null;
  }

  // ---- controls ----
  function setTarget(ts, { persist = true } = {}) {
    state.targetTs = ts;
    state.paused = false;
    if (persist) {
      try { localStorage.setItem(STORAGE_KEY, String(ts)); } catch {}
    }
    els.input.value = toLocalInputValue(ts);
    startLoop();
  }

  els.start.addEventListener("click", () => {
    // unlock/prime Web Audio on user gesture so the alarm can fire later
    const ctx = ensureAudio();
    if (ctx && ctx.state === "suspended") ctx.resume();

    const raw = els.input.value;
    if (!raw) {
      els.input.focus();
      return;
    }
    const ts = new Date(raw).getTime();
    if (Number.isNaN(ts)) return;
    stopAlarm();
    state.finished = false;
    setTarget(ts);
  });

  els.stopAlarm.addEventListener("click", stopAlarm);

  els.pause.addEventListener("click", () => {
    if (state.targetTs == null) return;
    if (!state.paused) {
      state.paused = true;
      state.frozenRemaining = state.targetTs - Date.now();
      stopLoop();
      els.pause.textContent = "Resume";
    } else {
      state.paused = false;
      state.targetTs = Date.now() + state.frozenRemaining;
      els.pause.textContent = "Pause";
      startLoop();
    }
  });

  els.reset.addEventListener("click", () => {
    try { localStorage.removeItem(STORAGE_KEY); } catch {}
    stopAlarm();
    state.finished = false;
    state.paused = false;
    els.pause.textContent = "Pause";
    setTarget(defaultTarget(), { persist: false });
  });

  // ---- init ----
  function init() {
    let ts = null;
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) ts = Number(saved);
    } catch {}
    if (!ts || Number.isNaN(ts)) ts = defaultTarget();
    setTarget(ts, { persist: false });
  }

  init();
})();
