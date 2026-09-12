export type MusicScene = "normal" | "fever" | "sad";
export const MUSIC = {
  normal: {
    bpm: 112,
    melody: [72, 76, 79, 76, 74, 77, 81, 77, 72, 76, 79, 84, 83, 79, 77, 74],
    roots: [48, 53, 57, 55],
  },
  fever: {
    bpm: 172,
    melody: [
      84, 88, 91, 96, 91, 88, 86, 89, 93, 98, 93, 89, 88, 91, 95, 100, 98, 95,
      91, 88, 86, 89, 93, 98, 96, 93, 89, 86, 84, 88, 91, 96,
    ],
    roots: [48, 53, 57, 55],
  },
  sad: {
    bpm: 66,
    melody: [76, 0, 75, 0, 72, 0, 71, 0, 69, 0, 67, 0, 64, 0, 0, 0],
    roots: [45, 41, 43, 40],
  },
} as const;
export class GameAudio {
  private ctx?: AudioContext;
  private master?: GainNode;
  private compressor?: DynamicsCompressorNode;
  private mutedValue = false;
  private next = 0;
  private step = 0;
  private scene: MusicScene = "normal";
  private active = false;
  get muted() {
    return this.mutedValue;
  }
  set muted(value: boolean) {
    this.mutedValue = value;
    this.volume();
  }
  private volume() {
    if (this.ctx && this.master)
      this.master.gain.setTargetAtTime(
        this.mutedValue || !this.active ? 0 : 0.65,
        this.ctx.currentTime,
        0.02,
      );
  }
  start() {
    try {
      if (!this.ctx) {
        this.ctx = new AudioContext();
        this.master = this.ctx.createGain();
        this.compressor = this.ctx.createDynamicsCompressor();
        this.compressor.threshold.value = -15;
        this.compressor.ratio.value = 8;
        this.master.connect(this.compressor);
        this.compressor.connect(this.ctx.destination);
      }
      void this.ctx.resume().catch(() => {});
    } catch {
      /* Sound is optional. */
    }
  }
  update(scene: MusicScene, playing: boolean, music = true) {
    if (!this.ctx || this.ctx.state !== "running") return;
    const c = this.ctx;
    if (this.active !== playing) {
      this.active = playing;
      this.volume();
      this.next = c.currentTime;
    }
    if (!playing || this.muted || !music) return;
    if (this.scene !== scene) {
      this.scene = scene;
      this.step = 0;
      this.next = c.currentTime;
    }
    if (this.next < c.currentTime - 0.2) this.next = c.currentTime;
    const song = MUSIC[scene],
      interval = 60 / song.bpm / (scene === "fever" ? 4 : 2);
    while (this.next < c.currentTime + 0.07) {
      const n = this.step,
        at = this.next,
        melody = song.melody[n % song.melody.length],
        root = song.roots[Math.floor(n / 8) % 4];
      if (melody)
        this.tone(
          melody,
          at,
          interval * (scene === "sad" ? 2.7 : 0.8),
          scene === "fever" ? 0.1 : 0.09,
          scene === "fever" ? "square" : "triangle",
        );
      if (n % 4 === 0) {
        this.tone(root, at, interval * 3, 0.12, "triangle");
        for (const offset of [12, scene === "sad" ? 15 : 16, 19])
          this.tone(root + offset, at, interval * 3.8, 0.022, "sine");
      }
      if (scene === "fever") {
        this.tone(
          root + 24 + [0, 4, 7, 12][n % 4],
          at,
          interval * 0.6,
          0.035,
          "square",
        );
        if (n % 4 === 0) this.kick(at);
        else if (n % 2 === 0) this.noise(at, 0.065, 0.045, 4000);
      } else if (scene === "normal" && n % 4 === 0) this.kick(at, 0.08);
      this.step++;
      this.next += interval;
    }
  }
  private tone(
    midi: number,
    at: number,
    duration: number,
    volume: number,
    type: OscillatorType,
  ) {
    const c = this.ctx!,
      o = c.createOscillator(),
      g = c.createGain();
    o.type = type;
    o.frequency.value = 440 * 2 ** ((midi - 69) / 12);
    g.gain.setValueAtTime(0, at);
    g.gain.linearRampToValueAtTime(volume, at + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, at + duration);
    o.connect(g);
    g.connect(this.master!);
    o.start(at);
    o.stop(at + duration);
    o.onended = () => {
      o.disconnect();
      g.disconnect();
    };
  }
  private kick(at: number, volume = 0.14) {
    const c = this.ctx!,
      o = c.createOscillator(),
      g = c.createGain();
    o.frequency.setValueAtTime(130, at);
    o.frequency.exponentialRampToValueAtTime(40, at + 0.13);
    g.gain.setValueAtTime(volume, at);
    g.gain.exponentialRampToValueAtTime(0.0001, at + 0.16);
    o.connect(g);
    g.connect(this.master!);
    o.start(at);
    o.stop(at + 0.17);
    o.onended = () => {
      o.disconnect();
      g.disconnect();
    };
  }
  private noise(at: number, duration: number, volume: number, cutoff: number) {
    const c = this.ctx!,
      buffer = c.createBuffer(
        1,
        Math.ceil(c.sampleRate * duration),
        c.sampleRate,
      ),
      data = buffer.getChannelData(0);
    for (let i = 0; i < data.length; i++)
      data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / data.length, 2);
    const noise = c.createBufferSource(),
      g = c.createGain(),
      filter = c.createBiquadFilter();
    noise.buffer = buffer;
    filter.type = "lowpass";
    filter.frequency.value = cutoff;
    g.gain.value = volume;
    noise.connect(filter);
    filter.connect(g);
    g.connect(this.master!);
    noise.start(at);
    noise.onended = () => {
      noise.disconnect();
      filter.disconnect();
      g.disconnect();
    };
  }
  explode() {
    if (this.muted || !this.ctx || this.ctx.state !== "running") return;
    this.noise(this.ctx.currentTime, 1.8, 0.4, 1400);
    this.tone(29, this.ctx.currentTime, 1.3, 0.3, "sine");
  }
}
