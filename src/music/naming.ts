import { NATURAL_NAMES, nameFromPitchClass, pitchClassFromName, type NoteName } from './notes';

export type NoteSystem = 'western' | 'solfege' | 'sargam';

export const SARGAM_NATURAL = ['Sa', 'Re', 'Ga', 'Ma', 'Pa', 'Dha', 'Ni'] as const;
export const SOLFEGE_NATURAL = ['Do', 'Re', 'Mi', 'Fa', 'Sol', 'La', 'Ti'] as const;

const SARGAM_CHROMATIC = [
  'Sa',
  'komal Re',
  'Re',
  'komal Ga',
  'Ga',
  'Ma',
  'tivra Ma',
  'Pa',
  'komal Dha',
  'Dha',
  'komal Ni',
  'Ni',
] as const;

const SOLFEGE_CHROMATIC = [
  'Do',
  'Ra',
  'Re',
  'Me',
  'Mi',
  'Fa',
  'Fi',
  'Sol',
  'Le',
  'La',
  'Te',
  'Ti',
] as const;

const NATURAL_PITCH_CLASSES = [0, 2, 4, 5, 7, 9, 11] as const;

export function scaleDegreeSemitones(pitchClass: number, tonicPitchClass: number): number {
  return (pitchClass - tonicPitchClass + 12) % 12;
}

export function displayName(
  pitchClass: number,
  system: NoteSystem,
  tonicPitchClass = 0,
): string {
  if (system === 'western') {
    return nameFromPitchClass(pitchClass);
  }
  const degree = scaleDegreeSemitones(pitchClass, tonicPitchClass);
  if (system === 'sargam') return SARGAM_CHROMATIC[degree];
  return SOLFEGE_CHROMATIC[degree];
}

export function displayNameForNoteName(
  name: NoteName | string,
  system: NoteSystem,
  tonicPitchClass = 0,
): string {
  return displayName(pitchClassFromName(name), system, tonicPitchClass);
}

export function mappedScaleNotes(tonicPitchClass: number): NoteName[] {
  return NATURAL_PITCH_CLASSES.map((offset) =>
    nameFromPitchClass(tonicPitchClass + offset),
  );
}

export function systemLabel(system: NoteSystem): string {
  if (system === 'sargam') return 'Indian Sargam';
  if (system === 'solfege') return 'Solfège';
  return 'Western';
}

export function tonicOptions(): { name: NoteName; pitchClass: number }[] {
  return NATURAL_NAMES.map((name, index) => ({
    name,
    pitchClass: NATURAL_PITCH_CLASSES[index],
  }));
}
