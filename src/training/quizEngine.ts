import type { IntervalId } from '../music/intervals';
import { midiToNote, noteFromName, notesInRange, type NoteName } from '../music/notes';
import type { Difficulty, PracticeConfig, PracticeMode, QuizQuestion } from './types';

export const DIFFICULTY_PRESETS: Record<
  Difficulty,
  { duration: number; octaves: number[]; questionHint: string }
> = {
  beginner: {
    duration: 1.8,
    octaves: [4],
    questionHint: 'Two notes, same octave, plenty of time.',
  },
  easy: {
    duration: 1.2,
    octaves: [3, 4],
    questionHint: 'A few notes, some octave movement.',
  },
  medium: {
    duration: 0.85,
    octaves: [3, 4, 5],
    questionHint: 'More notes, mixed lengths, mixed octaves.',
  },
  hard: {
    duration: 0.5,
    octaves: [2, 3, 4, 5],
    questionHint: 'Natural notes across the guitar range.',
  },
  expert: {
    duration: 0.32,
    octaves: [2, 3, 4, 5],
    questionHint: 'Chromatic notes, short attacks, nearby pitches.',
  },
};

export function durationForDifficulty(difficulty: Difficulty): number {
  return DIFFICULTY_PRESETS[difficulty].duration;
}

export function applyDifficulty(config: PracticeConfig): PracticeConfig {
  const preset = DIFFICULTY_PRESETS[config.difficulty];
  if (config.difficulty === 'beginner') {
    return { ...config, octaves: [config.octaves[0] ?? 4] };
  }
  if (config.octaves.length === 1) {
    return { ...config, octaves: preset.octaves };
  }
  return config;
}

export function generateQuestions(config: PracticeConfig): QuizQuestion[] {
  const resolved = applyDifficulty(config);
  const notes = resolved.notes.length >= 2 ? resolved.notes : (['C', 'D'] as NoteName[]);
  const octaves = resolved.octaves.length ? resolved.octaves : [4];
  const namePool = resolved.noteWeights ? weightedNotes(notes, resolved.noteWeights) : notes;
  const range = notesInRange(notes, octaves);
  const questions: QuizQuestion[] = [];
  let lastName: NoteName | null = null;
  let repeat = 0;

  for (let i = 0; i < resolved.questionCount; i++) {
    let name = pick(namePool);
    if (name === lastName && repeat >= 2) {
      name = pick(notes.filter((item) => item !== lastName));
      repeat = 0;
    } else if (name === lastName) {
      repeat += 1;
    } else {
      lastName = name;
      repeat = 1;
    }

    const matches = range.filter((item) => item.name === name);
    const note = pick(matches.length ? matches : notesInRange([name], octaves));
    questions.push({
      id: `q-${i}-${note.midi}-${Math.random().toString(36).slice(2, 7)}`,
      note,
      options: [...notes],
    });
  }
  return questions;
}

export function generateOctaveQuestions(
  name: NoteName,
  octaves: number[],
  count: number,
): QuizQuestion[] {
  const pool = octaves.length ? octaves : [3, 4, 5];
  return Array.from({ length: count }, (_, i) => {
    const octave = pick(pool);
    const note = noteFromName(name, octave);
    return {
      id: `oct-${i}-${note.midi}`,
      note,
      options: [name],
    };
  });
}

export function generateIntervalQuestion(
  allowed: readonly IntervalId[],
  rootNames: NoteName[],
  octaves: number[],
): QuizQuestion {
  const intervalId = pick([...allowed]);
  const root = noteFromName(pick(rootNames), pick(octaves.length ? octaves : [4]));
  const compare = midiToNote(root.midi + intervalSemitones(intervalId));

  return {
    id: `int-${root.midi}-${compare.midi}`,
    note: root,
    compareNote: compare,
    options: rootNames,
    intervalId,
  };
}

function intervalSemitones(id: IntervalId): number {
  const table: Record<IntervalId, number> = {
    unison: 0,
    m2: 1,
    M2: 2,
    m3: 3,
    M3: 4,
    P4: 5,
    TT: 6,
    P5: 7,
    m6: 8,
    M6: 9,
    m7: 10,
    M7: 11,
    P8: 12,
  };
  return table[id];
}

export function validatePitchClassAnswer(expected: NoteName, selected: string): boolean {
  return expected === selected;
}

export function validateOctaveAnswer(expectedMidi: number, selectedMidi: number): boolean {
  return expectedMidi === selectedMidi;
}

export function pick<T>(items: readonly T[]): T {
  return items[Math.floor(Math.random() * items.length)];
}

export function weightedNotes(
  notes: NoteName[],
  weights: Record<string, number>,
): NoteName[] {
  const expanded: NoteName[] = [];
  for (const name of notes) {
    const copies = Math.max(1, Math.round(weights[name] ?? 1));
    for (let i = 0; i < copies; i++) expanded.push(name);
  }
  return expanded;
}

export function mistakeWeights(
  notes: NoteName[],
  map: Record<string, { correct: number; total: number }>,
): Record<string, number> {
  const weights: Record<string, number> = {};
  for (const name of notes) {
    const stats = map[name] ?? { correct: 0, total: 0 };
    const accuracy = stats.total === 0 ? 0.5 : stats.correct / stats.total;
    weights[name] = 1 + Math.round((1 - accuracy) * 4);
  }
  return weights;
}

export function defaultConfig(mode: PracticeMode, notes: NoteName[]): PracticeConfig {
  return {
    notes,
    octaves: [4],
    instrument: 'acoustic',
    questionCount: 12,
    difficulty: 'beginner',
    mode,
  };
}
