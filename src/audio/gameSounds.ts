export type GameSound = "move" | "capture" | "check" | "win" | "draw";

let audioContext: AudioContext | null = null;

function getAudioContext() {
  if (typeof window === "undefined" || typeof window.AudioContext === "undefined") return null;
  try {
    audioContext ??= new window.AudioContext();
  } catch {
    return null;
  }
  if (audioContext.state === "suspended") void audioContext.resume();
  return audioContext;
}

function tone(
  context: AudioContext,
  destination: AudioNode,
  frequency: number,
  start: number,
  duration: number,
  level: number,
  type: OscillatorType = "sine",
) {
  const oscillator = context.createOscillator();
  const gain = context.createGain();
  oscillator.type = type;
  oscillator.frequency.setValueAtTime(frequency, start);
  oscillator.frequency.exponentialRampToValueAtTime(Math.max(45, frequency * 0.82), start + duration);
  gain.gain.setValueAtTime(0.0001, start);
  gain.gain.exponentialRampToValueAtTime(level, start + 0.008);
  gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
  oscillator.connect(gain).connect(destination);
  oscillator.start(start);
  oscillator.stop(start + duration + 0.02);
}

function woodenTap(context: AudioContext, destination: AudioNode, start: number, level: number, pitch = 150) {
  tone(context, destination, pitch, start, 0.085, level, "triangle");
  tone(context, destination, pitch * 2.18, start + 0.004, 0.045, level * 0.34, "sine");

  const sampleCount = Math.floor(context.sampleRate * 0.045);
  const buffer = context.createBuffer(1, sampleCount, context.sampleRate);
  const channel = buffer.getChannelData(0);
  for (let index = 0; index < sampleCount; index += 1) {
    channel[index] = (Math.random() * 2 - 1) * Math.exp(-index / (sampleCount * 0.16));
  }
  const noise = context.createBufferSource();
  const filter = context.createBiquadFilter();
  const gain = context.createGain();
  noise.buffer = buffer;
  filter.type = "bandpass";
  filter.frequency.value = 950;
  filter.Q.value = 0.8;
  gain.gain.value = level * 0.22;
  noise.connect(filter).connect(gain).connect(destination);
  noise.start(start);
}

export function playGameSound(sound: GameSound, volume: number) {
  if (volume <= 0) return;
  const context = getAudioContext();
  if (!context) return;

  const master = context.createGain();
  master.gain.value = Math.min(1, Math.max(0, volume));
  master.connect(context.destination);
  const now = context.currentTime + 0.015;

  if (sound === "move") {
    woodenTap(context, master, now, 0.34, 145);
  } else if (sound === "capture") {
    woodenTap(context, master, now, 0.42, 128);
    woodenTap(context, master, now + 0.085, 0.3, 185);
  } else if (sound === "check") {
    woodenTap(context, master, now, 0.4, 132);
    tone(context, master, 520, now + 0.07, 0.22, 0.17, "sine");
    tone(context, master, 780, now + 0.1, 0.28, 0.1, "sine");
  } else if (sound === "win") {
    woodenTap(context, master, now, 0.36, 120);
    [392, 523.25, 659.25, 783.99].forEach((frequency, index) => {
      tone(context, master, frequency, now + 0.09 + index * 0.105, 0.38, 0.12, "sine");
    });
  } else {
    tone(context, master, 220, now, 0.25, 0.15, "triangle");
    tone(context, master, 196, now + 0.13, 0.34, 0.12, "triangle");
  }
}
