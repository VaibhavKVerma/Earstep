export const A4_HZ = 440;
export const A4_MIDI = 69;

export const CHROMATIC_NAMES = [
  'C',
  'C#',
  'D',
  'D#',
  'E',
  'F',
  'F#',
  'G',
  'G#',
  'A',
  'A#',
  'B',
] as const;

export const NATURAL_NAMES = ['C', 'D', 'E', 'F', 'G', 'A', 'B'] as const;

export type ChromaticName = (typeof CHROMATIC_NAMES)[number];
export type NaturalName = (typeof NATURAL_NAMES)[number];
export type NoteName = ChromaticName;

export interface MusicalNote {
  name: NoteName;
  pitchClass: number;
  octave: number;
  midi: number;
  frequency: number;
}

const NAME_TO_PITCH: Record<string, number> = {
  C: 0,
  'C#': 1,
  Db: 1,
  D: 2,
  'D#': 3,
  Eb: 3,
  E: 4,
  Fb: 4,
  F: 5,
  'E#': 5,
  'F#': 6,
  Gb: 6,
  G: 7,
  'G#': 8,
  Ab: 8,
  A: 9,
  'A#': 10,
  Bb: 10,
  B: 11,
  Cb: 11,
};

export function pitchClassFromName(name: string): number {
  const key = name.trim();
  if (!(key in NAME_TO_PITCH)) {
    throw new Error(`Unknown note name: ${name}`);
  }
  return NAME_TO_PITCH[key];
}

export function nameFromPitchClass(pitchClass: number): NoteName {
  const pc = ((pitchClass % 12) + 12) % 12;
  return CHROMATIC_NAMES[pc];
}

export function noteToMidi(pitchClass: number, octave: number): number {
  return (octave + 1) * 12 + (((pitchClass % 12) + 12) % 12);
}

export function midiToPitchClass(midi: number): number {
  return ((midi % 12) + 12) % 12;
}

export function midiToOctave(midi: number): number {
  return Math.floor(midi / 12) - 1;
}

export function midiToFrequency(midi: number, a4 = A4_HZ): number {
  return a4 * 2 ** ((midi - A4_MIDI) / 12);
}

export function frequencyToMidi(frequency: number, a4 = A4_HZ): number {
  return A4_MIDI + 12 * Math.log2(frequency / a4);
}

export function midiToNote(midi: number, a4 = A4_HZ): MusicalNote {
  const pitchClass = midiToPitchClass(midi);
  return {
    name: nameFromPitchClass(pitchClass),
    pitchClass,
    octave: midiToOctave(midi),
    midi,
    frequency: midiToFrequency(midi, a4),
  };
}

export function noteFromName(
  name: string,
  octave: number,
  a4 = A4_HZ,
): MusicalNote {
  return midiToNote(noteToMidi(pitchClassFromName(name), octave), a4);
}

export function parseScientific(token: string, a4 = A4_HZ): MusicalNote {
  const match = token.trim().match(/^([A-Ga-g](?:#|b)?)(-?\d+)$/);
  if (!match) {
    throw new Error(`Invalid scientific pitch: ${token}`);
  }
  return noteFromName(match[1].toUpperCase().replace('B#', 'B#'), Number(match[2]), a4);
}

export function formatScientific(note: MusicalNote): string {
  return `${note.name}${note.octave}`;
}

export function samePitchClass(a: MusicalNote, b: MusicalNote): boolean {
  return a.pitchClass === b.pitchClass;
}

export function sameAbsolutePitch(a: MusicalNote, b: MusicalNote): boolean {
  return a.midi === b.midi;
}

export function octaveLabel(octave: number): 'low' | 'middle' | 'high' {
  if (octave <= 3) return 'low';
  if (octave >= 5) return 'high';
  return 'middle';
}

export function humanOctaveName(note: MusicalNote): string {
  const band = octaveLabel(note.octave);
  const bandName = band === 'low' ? 'Low' : band === 'high' ? 'High' : 'Middle';
  return `${bandName} ${note.name}`;
}

export function notesInRange(
  names: readonly string[],
  octaves: readonly number[],
  a4 = A4_HZ,
): MusicalNote[] {
  const result: MusicalNote[] = [];
  for (const octave of octaves) {
    for (const name of names) {
      result.push(noteFromName(name, octave, a4));
    }
  }
  return result;
}
