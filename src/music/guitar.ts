import { midiToNote, type MusicalNote } from './notes';

export const STANDARD_TUNING_MIDI = [40, 45, 50, 55, 59, 64] as const;
export const STRING_NAMES = ['E', 'A', 'D', 'G', 'B', 'E'] as const;
/** Tab-style names: low E is `E`, high E is `e`. */
export const STRING_TAB_NAMES = ['E', 'A', 'D', 'G', 'B', 'e'] as const;
export const STRING_LABELS = [
  '6th string (low E)',
  '5th string (A)',
  '4th string (D)',
  '3rd string (G)',
  '2nd string (B)',
  '1st string (high E)',
] as const;

export type Tuning = readonly number[];

export interface FretPosition {
  stringIndex: number;
  fret: number;
  note: MusicalNote;
}

export function midiAtFret(
  stringIndex: number,
  fret: number,
  tuning: Tuning = STANDARD_TUNING_MIDI,
): number {
  if (stringIndex < 0 || stringIndex >= tuning.length) {
    throw new Error(`Invalid string index: ${stringIndex}`);
  }
  if (fret < 0) {
    throw new Error(`Invalid fret: ${fret}`);
  }
  return tuning[stringIndex] + fret;
}

export function noteAtFret(
  stringIndex: number,
  fret: number,
  tuning: Tuning = STANDARD_TUNING_MIDI,
): MusicalNote {
  return midiToNote(midiAtFret(stringIndex, fret, tuning));
}

export function findPositions(
  target: { pitchClass: number; octave?: number; midi?: number },
  fretCount = 24,
  tuning: Tuning = STANDARD_TUNING_MIDI,
): FretPosition[] {
  const positions: FretPosition[] = [];
  for (let stringIndex = 0; stringIndex < tuning.length; stringIndex++) {
    for (let fret = 0; fret <= fretCount; fret++) {
      const note = noteAtFret(stringIndex, fret, tuning);
      const midiMatch = target.midi === undefined || note.midi === target.midi;
      const classMatch = note.pitchClass === target.pitchClass;
      const octaveMatch = target.octave === undefined || note.octave === target.octave;
      if (classMatch && octaveMatch && midiMatch) {
        positions.push({ stringIndex, fret, note });
      }
    }
  }
  return positions;
}

export function describePosition(position: FretPosition): string {
  const stringLabel = STRING_LABELS[position.stringIndex];
  if (position.fret === 0) {
    return `${stringLabel}, open`;
  }
  const suffix = ordinal(position.fret);
  return `${stringLabel}, ${suffix} fret`;
}

export function ordinal(n: number): string {
  const v = n % 100;
  if (v >= 11 && v <= 13) return `${n}th`;
  switch (n % 10) {
    case 1:
      return `${n}st`;
    case 2:
      return `${n}nd`;
    case 3:
      return `${n}rd`;
    default:
      return `${n}th`;
  }
}

export function isCorrectFret(
  target: { pitchClass?: number; octave?: number; midi?: number },
  stringIndex: number,
  fret: number,
  tuning: Tuning = STANDARD_TUNING_MIDI,
): boolean {
  const note = noteAtFret(stringIndex, fret, tuning);
  if (target.midi !== undefined) return note.midi === target.midi;
  if (target.octave !== undefined) {
    return note.pitchClass === target.pitchClass && note.octave === target.octave;
  }
  return note.pitchClass === target.pitchClass;
}
