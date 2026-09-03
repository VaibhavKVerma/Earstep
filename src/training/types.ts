import type { InstrumentId, SoundSource } from '../audio/AudioEngine';
import type { IntervalId } from '../music/intervals';
import type { NoteSystem } from '../music/naming';
import type { MusicalNote, NoteName } from '../music/notes';

export type Difficulty = 'beginner' | 'easy' | 'medium' | 'hard' | 'expert';
export type PracticeMode =
  | 'note'
  | 'octave'
  | 'guitar'
  | 'higher-lower'
  | 'interval'
  | 'melody'
  | 'song'
  | 'one-note'
  | 'hear-sing-find';

export interface PracticeConfig {
  notes: NoteName[];
  octaves: number[];
  instrument: InstrumentId;
  questionCount: number;
  difficulty: Difficulty;
  mode: PracticeMode;
  includeChromatic?: boolean;
  noteWeights?: Record<string, number>;
}

export interface QuizQuestion {
  id: string;
  note: MusicalNote;
  options: NoteName[];
  compareNote?: MusicalNote;
  melody?: MusicalNote[];
  intervalId?: IntervalId;
}

export interface AnswerRecord {
  questionId: string;
  expected: NoteName;
  expectedMidi: number;
  selected: string;
  correct: boolean;
  firstAttempt: boolean;
  replayCount: number;
  mode: PracticeMode;
}

export interface SessionSummary {
  id: string;
  date: string;
  mode: PracticeMode;
  notes: NoteName[];
  accuracy: number;
  firstAttemptAccuracy: number;
  questionCount: number;
  replayCount: number;
  perNote: Record<string, { correct: number; total: number }>;
}

export interface NoteStat {
  correct: number;
  incorrect: number;
  firstAttemptCorrect: number;
  firstAttemptTotal: number;
  attempts: number;
}

export interface UserSettings {
  instrument: InstrumentId;
  soundSource: SoundSource;
  noteSystem: NoteSystem;
  tonicPitchClass: number;
  theme: 'dark' | 'light';
  volume: number;
  showScientific: boolean;
  a4: number;
  thresholds: {
    stay: number;
    continue: number;
    recommendNext: number;
    nextDifficulty: number;
    minSamples: number;
  };
}

export interface UserProgress {
  version: 1;
  onboarded: boolean;
  settings: UserSettings;
  selectedNotes: NoteName[];
  selectedOctaves: number[];
  noteStats: Record<string, NoteStat>;
  octaveStats: { correct: number; incorrect: number };
  completedLessons: string[];
  streak: { lastDate: string; days: number };
  xp: number;
  history: SessionSummary[];
  achievements: string[];
  totalCorrect: number;
}

export interface AdaptiveThresholds {
  stay: number;
  continue: number;
  recommendNext: number;
  nextDifficulty: number;
  minSamples: number;
}
