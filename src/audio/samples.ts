import { frequencyToMidi, midiToOctave, midiToPitchClass } from '../music/notes';

export const SAMPLED_INSTRUMENTS = ['acoustic', 'electric', 'piano'] as const;

export type SampledInstrument = (typeof SAMPLED_INSTRUMENTS)[number];

/** Sparse real-instrument notes; nearby pitches use playbackRate. */
export const SAMPLE_MIDIS = [
  36, 39, 40, 42, 45, 48, 50, 51, 54, 55, 57, 59, 60, 63, 64, 66, 69, 72, 75, 78, 81, 84,
] as const;

const SAMPLE_FLAT_NAMES = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B'] as const;

export function isSampledInstrument(id: string): id is SampledInstrument {
  return (SAMPLED_INSTRUMENTS as readonly string[]).includes(id);
}

export function sampleFileName(midi: number): string {
  return `${SAMPLE_FLAT_NAMES[midiToPitchClass(midi)]}${midiToOctave(midi)}`;
}

export function nearestSampleMidi(midi: number): number {
  return SAMPLE_MIDIS.reduce((best, current) =>
    Math.abs(current - midi) < Math.abs(best - midi) ? current : best,
  );
}

export function sampleUrl(instrument: SampledInstrument, midi: number): string {
  return `/samples/${instrument}/${sampleFileName(midi)}.mp3`;
}

export class SampleBank {
  private buffers = new Map<string, AudioBuffer>();
  private loading = new Map<string, Promise<AudioBuffer | null>>();

  key(instrument: SampledInstrument, midi: number): string {
    return `${instrument}:${midi}`;
  }

  async load(
    ctx: AudioContext,
    instrument: SampledInstrument,
    midi: number,
  ): Promise<AudioBuffer | null> {
    const key = this.key(instrument, midi);
    const cached = this.buffers.get(key);
    if (cached) return cached;
    const pending = this.loading.get(key);
    if (pending) return pending;

    const task = (async () => {
      try {
        const response = await fetch(sampleUrl(instrument, midi));
        if (!response.ok) return null;
        const raw = await response.arrayBuffer();
        const buffer = await ctx.decodeAudioData(raw.slice(0));
        this.buffers.set(key, buffer);
        return buffer;
      } catch {
        return null;
      } finally {
        this.loading.delete(key);
      }
    })();

    this.loading.set(key, task);
    return task;
  }

  async ensureNearest(
    ctx: AudioContext,
    instrument: SampledInstrument,
    midi: number,
  ): Promise<{ buffer: AudioBuffer; sampleMidi: number } | null> {
    const sampleMidi = nearestSampleMidi(Math.round(midi));
    const buffer = await this.load(ctx, instrument, sampleMidi);
    if (!buffer) return null;
    return { buffer, sampleMidi };
  }

  preload(ctx: AudioContext, instrument: SampledInstrument): void {
    for (const midi of SAMPLE_MIDIS) {
      void this.load(ctx, instrument, midi);
    }
  }
}

export function frequencyToRoundedMidi(frequency: number): number {
  return Math.round(frequencyToMidi(frequency));
}
