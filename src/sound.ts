let ctx: AudioContext | null = null;

function tone(freq: number, start: number, dur: number): void {
  if (!ctx) return;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = "triangle";
  osc.frequency.value = freq;
  gain.gain.setValueAtTime(0.0001, ctx.currentTime + start);
  gain.gain.exponentialRampToValueAtTime(0.2, ctx.currentTime + start + 0.02);
  gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + start + dur);
  osc.connect(gain).connect(ctx.destination);
  osc.start(ctx.currentTime + start);
  osc.stop(ctx.currentTime + start + dur + 0.05);
}

function play(notes: number[], muted: boolean): void {
  if (muted) return;
  try {
    ctx ??= new AudioContext();
    void ctx.resume();
    notes.forEach((f, i) => tone(f, i * 0.12, 0.25));
  } catch {
    // audio unavailable: stay silent
  }
}

export const sounds = {
  place: (muted: boolean) => play([523], muted),
  win: (muted: boolean) => play([523, 659, 784, 1047], muted),
  miss: (muted: boolean) => play([330, 294], muted),
};
