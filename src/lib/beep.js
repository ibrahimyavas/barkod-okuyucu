// Short audio feedback via WebAudio - no external sound file needed, so
// there's nothing to fetch and nothing that can 404. Browsers gate
// AudioContext playback behind a user gesture; since the user has to tap
// something (start camera / toggle a setting) before the first scan usually
// lands anyway, that tap doubles as the unlock. If the very first scan is
// silent because of that, every scan after it will beep normally.
let audioCtx;

function ctx() {
  audioCtx = audioCtx || new (window.AudioContext || window.webkitAudioContext)();
  if (audioCtx.state === "suspended") audioCtx.resume();
  return audioCtx;
}

function tone(freq, startAt, durationSec, gainValue = 0.15) {
  const c = ctx();
  const osc = c.createOscillator();
  const gain = c.createGain();
  osc.type = "square";
  osc.frequency.value = freq;
  gain.gain.setValueAtTime(gainValue, c.currentTime + startAt);
  gain.gain.exponentialRampToValueAtTime(0.0001, c.currentTime + startAt + durationSec);
  osc.connect(gain).connect(c.destination);
  osc.start(c.currentTime + startAt);
  osc.stop(c.currentTime + startAt + durationSec + 0.02);
}

// Single high blip for a freshly scanned code, a quick double blip for a
// repeat read - so you can tell them apart by ear without looking at the
// screen while scanning fast.
export function playBeep(kind = "new") {
  try {
    if (kind === "duplicate") {
      tone(1200, 0, 0.06);
      tone(1200, 0.09, 0.06);
    } else {
      tone(1800, 0, 0.09);
    }
  } catch {
    // Web Audio unavailable/blocked - it's just feedback, fail silently.
  }
}

export function vibrate(pattern = 60) {
  try {
    navigator.vibrate?.(pattern);
  } catch {
    // Vibration API unavailable - ignore.
  }
}
