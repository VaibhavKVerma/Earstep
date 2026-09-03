import { CHROMATIC_NAMES, NATURAL_NAMES, type NoteName } from './notes';

export const NOTE_STAGES: readonly NoteName[][] = [
  ['C', 'D'],
  ['C', 'D', 'E'],
  ['C', 'D', 'E', 'F'],
  ['C', 'D', 'E', 'F', 'G'],
  ['C', 'D', 'E', 'F', 'G', 'A'],
  [...NATURAL_NAMES],
  [...CHROMATIC_NAMES],
];

export const DEFAULT_THRESHOLDS = {
  stay: 0.6,
  continue: 0.8,
  recommendNext: 0.8,
  nextDifficulty: 0.9,
  minSamples: 8,
} as const;

export interface AccuracyMap {
  [note: string]: { correct: number; total: number };
}

export type ProgressionAction = 'stay' | 'continue' | 'add-note' | 'raise-difficulty';

export interface ProgressionAdvice {
  action: ProgressionAction;
  message: string;
  nextNote?: NoteName;
  weakest: { name: string; accuracy: number }[];
  strongest: { name: string; accuracy: number }[];
}

export function noteAccuracy(stats: { correct: number; total: number }): number {
  if (stats.total === 0) return 0;
  return stats.correct / stats.total;
}

export function rankedNotes(
  selected: readonly string[],
  map: AccuracyMap,
): { name: string; accuracy: number; total: number }[] {
  return selected
    .map((name) => {
      const stats = map[name] ?? { correct: 0, total: 0 };
      return { name, accuracy: noteAccuracy(stats), total: stats.total };
    })
    .sort((a, b) => a.accuracy - b.accuracy);
}

export function nextNaturalNote(selected: readonly string[]): NoteName | undefined {
  const set = new Set(selected);
  return NATURAL_NAMES.find((name) => !set.has(name));
}

export interface ProgressionThresholds {
  stay: number;
  continue: number;
  recommendNext: number;
  nextDifficulty: number;
  minSamples: number;
}

export function adviseProgression(
  selected: readonly string[],
  map: AccuracyMap,
  thresholds: ProgressionThresholds = DEFAULT_THRESHOLDS,
): ProgressionAdvice {
  const ranked = rankedNotes(selected, map);
  const weakest = [...ranked].slice(0, 3);
  const strongest = [...ranked].reverse().slice(0, 3);
  const sampled = ranked.filter((item) => item.total >= thresholds.minSamples);

  if (sampled.length < selected.length) {
    return {
      action: 'continue',
      message: 'Keep practicing these notes — a bit more data will show what to add next.',
      weakest,
      strongest,
    };
  }

  const minAccuracy = Math.min(...sampled.map((item) => item.accuracy));
  const nextNote = nextNaturalNote(selected);

  if (minAccuracy < thresholds.stay) {
    const hard = sampled[0];
    return {
      action: 'stay',
      message: `Keep practicing ${selected.join(' / ')}. ${hard.name} still needs more listening time.`,
      weakest,
      strongest,
    };
  }

  if (minAccuracy >= thresholds.nextDifficulty && nextNote) {
    return {
      action: 'add-note',
      nextNote,
      message: `You're ready to add ${nextNote}.`,
      weakest,
      strongest,
    };
  }

  if (minAccuracy >= thresholds.recommendNext && nextNote) {
    return {
      action: 'add-note',
      nextNote,
      message: `Nice work. You can add ${nextNote} when you feel ready.`,
      weakest,
      strongest,
    };
  }

  if (minAccuracy >= thresholds.nextDifficulty && !nextNote) {
    return {
      action: 'raise-difficulty',
      message: 'These notes are solid. Try a harder difficulty or a new octave range.',
      weakest,
      strongest,
    };
  }

  return {
    action: 'continue',
    message: `Keep practicing ${selected.join(' / ')}.`,
    weakest,
    strongest,
  };
}

export function stageForNotes(selected: readonly string[]): number {
  const set = new Set(selected);
  for (let i = 0; i < NOTE_STAGES.length; i++) {
    const stage = NOTE_STAGES[i];
    if (stage.length === selected.length && stage.every((name) => set.has(name))) {
      return i + 1;
    }
  }
  return 0;
}

export function formatNoteSet(notes: readonly string[]): string {
  if (notes.length === 0) return 'No notes';
  if (notes.length === 1) return notes[0];
  if (notes.length === 2) return `${notes[0]} vs ${notes[1]}`;
  return notes.join(' / ');
}
