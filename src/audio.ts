export class GameAudio {
  private ctx?: AudioContext;
  muted = false;
  private beat = -1;
  explode() {
    if (this.muted || !this.ctx || this.ctx.state !== "running") return;
    const c = this.ctx,
      buffer = c.createBuffer(1, c.sampleRate * 2, c.sampleRate),
      data = buffer.getChannelData(0);
    for (let i = 0; i < data.length; i++)
      data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / data.length, 3);
    const noise = c.createBufferSource(),
      filter = c.createBiquadFilter(),
      gain = c.createGain();
    noise.buffer = buffer;
    filter.type = "lowpass";
    filter.frequency.setValueAtTime(1800, c.currentTime);
    filter.frequency.exponentialRampToValueAtTime(70, c.currentTime + 1.8);
    gain.gain.value = 0.35;
    noise.connect(filter);
    filter.connect(gain);
    gain.connect(c.destination);
    noise.start();
    this.tone(45, 1.5, 0.22);
  }
  start() {
    try {
      this.ctx ??= new AudioContext();
      void this.ctx.resume().catch(() => {});
    } catch {
      /* Audio is optional. */
    }
  }
  update(time: number, fever: boolean, danger: boolean) {
    const beat = Math.floor(time * (fever ? 4 : 2));
    if (beat === this.beat) return;
    this.beat = beat;
    if (this.muted || !this.ctx || this.ctx.state !== "running") return;
    const notes = [130.81, 164.81, 196, 164.81, 146.83, 174.61, 220, 196];
    this.tone(
      danger && beat % 4 === 0 ? 660 : notes[beat % 8],
      0.1,
      fever ? 0.035 : 0.018,
    );
    if (fever && beat % 2 === 0) this.tone(notes[beat % 8] * 2, 0.16, 0.018);
  }
  private tone(hz: number, duration: number, volume: number) {
    const c = this.ctx!,
      o = c.createOscillator(),
      g = c.createGain();
    o.type = "sine";
    o.frequency.value = hz;
    g.gain.setValueAtTime(0, c.currentTime);
    g.gain.linearRampToValueAtTime(volume, c.currentTime + 0.015);
    g.gain.exponentialRampToValueAtTime(0.0001, c.currentTime + duration);
    o.connect(g);
    g.connect(c.destination);
    o.start();
    o.stop(c.currentTime + duration);
  }
}
