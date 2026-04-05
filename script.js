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
    subtitle: document.getElementById("subtitle"),
  };

  const state = {
    targetTs: null,
    paused: false,
    frozenRemaining: 0,
    rafId: null,
    lastTickSec: -1,
  };

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
    } else {
      document.body.classList.remove("timesup");
      els.subtitle.textContent = "Counting down to the moment…";
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
    const raw = els.input.value;
    if (!raw) {
      els.input.focus();
      return;
    }
    const ts = new Date(raw).getTime();
    if (Number.isNaN(ts)) return;
    setTarget(ts);
  });

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
