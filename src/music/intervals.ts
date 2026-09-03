export const INTERVALS = [
  { semitones: 0, id: 'unison', name: 'Same note', short: 'Unison' },
  { semitones: 1, id: 'm2', name: 'Minor 2nd', short: 'm2' },
  { semitones: 2, id: 'M2', name: 'Major 2nd', short: 'M2' },
  { semitones: 3, id: 'm3', name: 'Minor 3rd', short: 'm3' },
  { semitones: 4, id: 'M3', name: 'Major 3rd', short: 'M3' },
  { semitones: 5, id: 'P4', name: 'Perfect 4th', short: 'P4' },
  { semitones: 6, id: 'TT', name: 'Tritone', short: 'TT' },
  { semitones: 7, id: 'P5', name: 'Perfect 5th', short: 'P5' },
  { semitones: 8, id: 'm6', name: 'Minor 6th', short: 'm6' },
  { semitones: 9, id: 'M6', name: 'Major 6th', short: 'M6' },
  { semitones: 10, id: 'm7', name: 'Minor 7th', short: 'm7' },
  { semitones: 11, id: 'M7', name: 'Major 7th', short: 'M7' },
  { semitones: 12, id: 'P8', name: 'Octave', short: '8ve' },
] as const;

export type IntervalId = (typeof INTERVALS)[number]['id'];

export const INTERVAL_LEVELS: readonly IntervalId[][] = [
  ['unison'],
  ['unison', 'M2'],
  ['M2', 'M3'],
  ['M2', 'M3', 'P4'],
  ['M2', 'M3', 'P4', 'P5'],
  ['unison', 'M2', 'M3', 'P4', 'P5', 'P8'],
  ['unison', 'm2', 'M2', 'm3', 'M3', 'P4', 'P5', 'P8'],
];

export const INTERVAL_REFERENCES: Record<string, string> = {
  unison: 'The same pitch twice',
  m2: 'The smallest step — like Jaws',
  M2: 'Do–Re, or the start of Happy Birthday',
  m3: 'A gentle sad step — Greensleeves',
  M3: 'Do–Mi, a bright major smile',
  P4: 'Here Comes the Bride',
  P5: 'Twinkle Twinkle, or a guitar power chord',
  P8: 'The same note, much higher or lower',
};

export function intervalFromSemitones(semitones: number) {
  const abs = Math.abs(semitones);
  const wrapped = abs > 12 ? abs % 12 === 0 ? 12 : abs % 12 : abs;
  const found = INTERVALS.find((item) => item.semitones === wrapped);
  if (!found) {
    throw new Error(`Unsupported interval: ${semitones}`);
  }
  return found;
}

export function semitonesBetween(fromMidi: number, toMidi: number): number {
  return toMidi - fromMidi;
}

export function intervalDirection(semitones: number): 'higher' | 'lower' | 'same' {
  if (semitones > 0) return 'higher';
  if (semitones < 0) return 'lower';
  return 'same';
}

export function validateIntervalAnswer(
  expectedSemitones: number,
  selectedId: IntervalId,
): boolean {
  return intervalFromSemitones(expectedSemitones).id === selectedId;
}
