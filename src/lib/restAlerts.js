// Only emit the newest due cue. Never replay a burst after a suspended tab.
export function restAlertCues(seconds) {
  const duration = seconds * 1000;
  if (!Number.isFinite(duration) || duration <= 0) return [];
  const cues = new Map();
  for (let at = 30000; at < duration; at += 30000) cues.set(at, 'interval');
  for (let remaining = 3; remaining >= 1; remaining--) {
    const at = duration - remaining * 1000;
    if (at >= 0) cues.set(at, 'countdown');
  }
  cues.set(duration, 'finish');
  return [...cues].sort(([a], [b]) => a - b);
}

export function watchRestAlerts(timer, emit, clock = Date.now) {
  const start = timer.endsAt - timer.seconds * 1000;
  const cues = restAlertCues(timer.seconds);
  let previous = clock() - start;
  // Include the initial beep for a manually started rest of 3 seconds or less.
  if (previous >= 0 && previous < 100) previous = -1;
  const tick = () => {
    const elapsed = clock() - start;
    const cue = cues.findLast(([at]) => at > previous && at <= elapsed);
    previous = elapsed;
    if (cue && elapsed - cue[0] < 1000) emit(cue[1]);
    if (elapsed >= timer.seconds * 1000) clearInterval(interval);
  };
  const interval = setInterval(tick, 100);
  tick();
  return () => clearInterval(interval);
}

export function createRestAlertPlayer() {
  let context;
  const voices = new Set();
  const vibrate = (pattern) => {
    try { globalThis.navigator?.vibrate?.(pattern); } catch { /* Optional hardware. */ }
  };
  const unlock = () => {
    try {
      const AudioContext = globalThis.AudioContext || globalThis.webkitAudioContext;
      if (!AudioContext) return;
      if (!context || context.state === 'closed') context = new AudioContext();
      if (context.state !== 'running') void context.resume().catch(() => {});
    } catch { /* Keep the timer usable when audio is unavailable. */ }
  };
  const stop = () => {
    for (const voice of voices) {
      try { voice.stop(); } catch { /* Already stopped. */ }
    }
    voices.clear();
    vibrate(0);
  };
  return {
    unlock,
    play(kind) {
      if (kind === 'finish') vibrate([200, 100, 200]);
      if (!context || context.state !== 'running') return;
      try {
        const oscillator = context.createOscillator();
        const gain = context.createGain();
        const at = context.currentTime;
        const length = kind === 'finish' ? 0.4 : 0.12;
        oscillator.frequency.value = kind === 'finish' ? 1100 : kind === 'countdown' ? 880 : 660;
        gain.gain.setValueAtTime(0, at);
        gain.gain.linearRampToValueAtTime(0.15, at + 0.01);
        gain.gain.linearRampToValueAtTime(0, at + length);
        oscillator.connect(gain);
        gain.connect(context.destination);
        voices.add(oscillator);
        oscillator.onended = () => { voices.delete(oscillator); oscillator.disconnect(); gain.disconnect(); };
        oscillator.start(at);
        oscillator.stop(at + length);
      } catch { /* Audio must never interrupt logging a set. */ }
    },
    stop,
    dispose() {
      stop();
      if (context && context.state !== 'closed') void context.close().catch(() => {});
    },
  };
}
