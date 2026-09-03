import {
  SampleBank,
  frequencyToRoundedMidi,
  isSampledInstrument,
  type SampledInstrument,
} from './samples';

export type InstrumentId = 'acoustic' | 'electric' | 'piano' | 'sine';
export type SoundSource = 'samples' | 'synth';

export interface PlayOptions {
  instrument?: InstrumentId;
  duration?: number;
  volume?: number;
  slower?: boolean;
  louder?: boolean;
  soundSource?: SoundSource;
}

const DEFAULT_DURATION: Record<InstrumentId, number> = {
  acoustic: 1.6,
  electric: 1.4,
  piano: 1.5,
  sine: 1.4,
};

export class AudioEngine {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private compressor: DynamicsCompressorNode | null = null;
  private volume = 0.7;
  private activeSources: AudioBufferSourceNode[] = [];
  private samples = new SampleBank();
  private preloaded = new Set<SampledInstrument>();
  private soundSource: SoundSource = 'samples';

  get context(): AudioContext | null {
    return this.ctx;
  }

  async unlock(instrument: InstrumentId = 'acoustic'): Promise<void> {
    const ctx = this.ensureContext();
    if (ctx.state === 'suspended') {
      await ctx.resume();
    }
    if (
      this.soundSource === 'samples' &&
      isSampledInstrument(instrument) &&
      !this.preloaded.has(instrument)
    ) {
      this.preloaded.add(instrument);
      this.samples.preload(ctx, instrument);
    }
  }

  setSoundSource(source: SoundSource): void {
    this.soundSource = source;
  }

  getSoundSource(): SoundSource {
    return this.soundSource;
  }

  setVolume(value: number): void {
    this.volume = clamp(value, 0, 1);
    if (this.master) {
      this.master.gain.setTargetAtTime(this.volume, this.ctx!.currentTime, 0.02);
    }
  }

  getVolume(): number {
    return this.volume;
  }

  stop(): void {
    for (const source of this.activeSources) {
      try {
        source.stop();
      } catch {
        // already stopped
      }
    }
    this.activeSources = [];
  }

  async playFrequency(frequency: number, options: PlayOptions = {}): Promise<void> {
    const instrument = options.instrument ?? 'acoustic';
    await this.unlock(instrument);
    const ctx = this.ensureContext();
    const duration = (options.duration ?? DEFAULT_DURATION[instrument]) * (options.slower ? 1.7 : 1);
    const volume = clamp((options.volume ?? 1) * (options.louder ? 1.55 : 1), 0.05, 1.4);

    const voice = ctx.createGain();
    voice.gain.value = volume;
    voice.connect(this.master!);

    const source = options.soundSource ?? this.soundSource;
    let usedSample = false;
    if (source === 'samples' && isSampledInstrument(instrument)) {
      usedSample = await this.playSample(ctx, voice, frequency, duration, instrument);
    }
    if (!usedSample) {
      if (instrument === 'sine') {
        this.playSine(ctx, voice, frequency, duration);
      } else if (instrument === 'piano') {
        this.playPiano(ctx, voice, frequency, duration);
      } else {
        this.playPlucked(ctx, voice, frequency, duration, instrument === 'electric');
      }
    }

    window.setTimeout(() => {
      voice.disconnect();
    }, (duration + 0.3) * 1000);
  }

  async playSequence(
    frequencies: number[],
    options: PlayOptions & { gap?: number } = {},
  ): Promise<void> {
    const gap = options.gap ?? 0.12;
    const noteDuration = options.duration ?? 0.55;
    for (const frequency of frequencies) {
      await this.playFrequency(frequency, { ...options, duration: noteDuration });
      await wait((noteDuration + gap) * 1000);
    }
  }

  private ensureContext(): AudioContext {
    if (!this.ctx) {
      const Ctx = window.AudioContext || (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!Ctx) {
        throw new Error('Web Audio API is not available in this browser.');
      }
      this.ctx = new Ctx();
      this.master = this.ctx.createGain();
      this.master.gain.value = this.volume;
      this.compressor = this.ctx.createDynamicsCompressor();
      this.compressor.threshold.value = -14;
      this.compressor.knee.value = 18;
      this.compressor.ratio.value = 3;
      this.compressor.attack.value = 0.003;
      this.compressor.release.value = 0.18;
      this.master.connect(this.compressor);
      this.compressor.connect(this.ctx.destination);
    }
    return this.ctx;
  }

  private async playSample(
    ctx: AudioContext,
    dest: AudioNode,
    frequency: number,
    duration: number,
    instrument: SampledInstrument,
  ): Promise<boolean> {
    const match = await this.samples.ensureNearest(ctx, instrument, frequencyToRoundedMidi(frequency));
    if (!match) return false;

    const source = ctx.createBufferSource();
    source.buffer = match.buffer;
    const targetMidi = frequencyToRoundedMidi(frequency);
    source.playbackRate.value = 2 ** ((targetMidi - match.sampleMidi) / 12);

    const env = ctx.createGain();
    const now = ctx.currentTime;
    env.gain.setValueAtTime(0.0001, now);
    env.gain.exponentialRampToValueAtTime(0.9, now + 0.012);
    env.gain.setValueAtTime(0.9, now + Math.max(0.05, duration - 0.12));
    env.gain.exponentialRampToValueAtTime(0.0001, now + duration);

    source.connect(env);
    env.connect(dest);
    source.start(now);
    source.stop(now + duration + 0.05);
    this.activeSources.push(source);
    source.onended = () => {
      this.activeSources = this.activeSources.filter((item) => item !== source);
    };
    return true;
  }

  private playSine(ctx: AudioContext, dest: AudioNode, frequency: number, duration: number): void {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.value = frequency;
    const now = ctx.currentTime;
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(0.28, now + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);
    osc.connect(gain);
    gain.connect(dest);
    osc.start(now);
    osc.stop(now + duration + 0.02);
  }

  private playPiano(ctx: AudioContext, dest: AudioNode, frequency: number, duration: number): void {
    const now = ctx.currentTime;
    const master = ctx.createGain();
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(Math.min(4200, frequency * 10), now);
    filter.frequency.exponentialRampToValueAtTime(900, now + duration);
    master.connect(filter);
    filter.connect(dest);

    const partials = [1, 0.55, 0.28, 0.14, 0.08, 0.04];
    partials.forEach((amp, index) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = index === 0 ? 'triangle' : 'sine';
      osc.frequency.value = frequency * (index + 1);
      gain.gain.setValueAtTime(0.0001, now);
      gain.gain.exponentialRampToValueAtTime(0.22 * amp, now + 0.012);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + duration * (1 - index * 0.08));
      osc.connect(gain);
      gain.connect(master);
      osc.start(now);
      osc.stop(now + duration + 0.03);
    });
  }

  private playPlucked(
    ctx: AudioContext,
    dest: AudioNode,
    frequency: number,
    duration: number,
    electric: boolean,
  ): void {
    const buffer = createPluckBuffer(ctx.sampleRate, frequency, duration, electric);
    const source = ctx.createBufferSource();
    source.buffer = buffer;

    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = electric ? Math.min(5200, frequency * 14) : Math.min(3400, frequency * 9);
    filter.Q.value = electric ? 0.9 : 0.6;

    const body = ctx.createBiquadFilter();
    body.type = 'peaking';
    body.frequency.value = electric ? 800 : 220;
    body.gain.value = electric ? 3.5 : 5;
    body.Q.value = 1.2;

    const out = ctx.createGain();
    const now = ctx.currentTime;
    out.gain.setValueAtTime(0.0001, now);
    out.gain.exponentialRampToValueAtTime(electric ? 0.42 : 0.5, now + 0.008);
    out.gain.exponentialRampToValueAtTime(0.0001, now + duration);

    if (electric) {
      const shaper = ctx.createWaveShaper();
      shaper.curve = makeDistortionCurve(12);
      source.connect(filter);
      filter.connect(shaper);
      shaper.connect(body);
    } else {
      source.connect(filter);
      filter.connect(body);
    }
    body.connect(out);
    out.connect(dest);
    source.start(now);
    source.stop(now + duration + 0.05);
    this.activeSources.push(source);
    source.onended = () => {
      this.activeSources = this.activeSources.filter((item) => item !== source);
    };
  }
}

function createPluckBuffer(
  sampleRate: number,
  frequency: number,
  duration: number,
  electric: boolean,
): AudioBuffer {
  const length = Math.max(1, Math.floor(sampleRate * duration));
  const period = Math.max(2, Math.round(sampleRate / frequency));
  const delay = new Float32Array(period);
  for (let i = 0; i < period; i++) {
    delay[i] = (Math.random() * 2 - 1) * (electric ? 0.95 : 0.82);
  }

  const data = new Float32Array(length);
  let index = 0;
  let previous = 0;
  const decay = electric ? 0.994 : 0.9968;
  const mix = electric ? 0.42 : 0.5;

  for (let i = 0; i < length; i++) {
    const current = delay[index];
    const averaged = (current + previous) * mix * decay;
    delay[index] = averaged;
    previous = current;
    const envelope = Math.exp(-i / (sampleRate * (electric ? 0.55 : 0.7)));
    data[i] = averaged * envelope;
    index = (index + 1) % period;
  }

  const buffer = new AudioBuffer({ length, sampleRate, numberOfChannels: 1 });
  buffer.copyToChannel(data, 0);
  return buffer;
}

function makeDistortionCurve(amount: number): Float32Array<ArrayBuffer> {
  const samples = 1024;
  const curve = new Float32Array(new ArrayBuffer(samples * 4));
  const deg = Math.PI / 180;
  for (let i = 0; i < samples; i++) {
    const x = (i * 2) / samples - 1;
    curve[i] = ((3 + amount) * x * 20 * deg) / (Math.PI + amount * Math.abs(x));
  }
  return curve;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function wait(ms: number): Promise<void> {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

export const audioEngine = new AudioEngine();
