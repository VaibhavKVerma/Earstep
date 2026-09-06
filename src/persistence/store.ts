import { DEFAULT_THRESHOLDS } from '../music/progression';
import type {
  AnswerRecord,
  JourneyLevelStat,
  JourneyState,
  NoteStat,
  SessionSummary,
  UserProgress,
  UserSettings,
} from '../training/types';

export const STORAGE_KEY = 'earstep-progress-v1';

export const ACHIEVEMENTS = [
  { id: 'first_session', title: 'First session', detail: 'You finished a practice round.' },
  { id: 'first_10', title: 'First 10 correct', detail: 'Ten notes heard correctly.' },
  { id: 'cd_90', title: 'C and D are friends', detail: '90% accuracy with C vs D.' },
  { id: 'naturals', title: 'Natural notes', detail: 'Comfortable with C through B.' },
  { id: 'identified_100', title: 'A hundred notes', detail: 'Identified 100 notes by ear.' },
  { id: 'first_melody', title: 'Melody listener', detail: 'Figured out a short melody.' },
  { id: 'guitar_finder', title: 'On the fretboard', detail: 'Found a heard note on guitar.' },
  { id: 'week_practice', title: 'Steady week', detail: 'Practiced on 7 different days.' },
] as const;

const emptyNoteStat = (): NoteStat => ({
  correct: 0,
  incorrect: 0,
  firstAttemptCorrect: 0,
  firstAttemptTotal: 0,
  attempts: 0,
});

export function defaultSettings(): UserSettings {
  return {
    instrument: 'acoustic',
    soundSource: 'samples',
    noteSystem: 'western',
    tonicPitchClass: 0,
    theme: 'light',
    volume: 0.7,
    showScientific: false,
    a4: 440,
    thresholds: { ...DEFAULT_THRESHOLDS },
  };
}

export function defaultProgress(): UserProgress {
  return {
    version: 1,
    onboarded: false,
    settings: defaultSettings(),
    selectedNotes: ['C', 'D'],
    selectedOctaves: [4],
    noteStats: {},
    octaveStats: { correct: 0, incorrect: 0 },
    completedLessons: [],
    streak: { lastDate: '', days: 0 },
    xp: 0,
    history: [],
    achievements: [],
    totalCorrect: 0,
    journey: emptyJourney(),
  };
}

export function emptyJourney(): JourneyState {
  return { stats: {}, celebrated: [] };
}

export function emptyLevelStat(): JourneyLevelStat {
  return { questions: 0, correct: 0, sessions: 0, bestAccuracy: 0, lastAccuracy: 0 };
}

export function loadProgress(): UserProgress {
  if (typeof localStorage === 'undefined') return defaultProgress();
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaultProgress();
    const parsed = JSON.parse(raw) as UserProgress;
    return migrate(parsed);
  } catch {
    return defaultProgress();
  }
}

export function saveProgress(progress: UserProgress): void {
  if (typeof localStorage === 'undefined') return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(progress));
}

function migrate(progress: Partial<UserProgress>): UserProgress {
  return {
    ...defaultProgress(),
    ...progress,
    settings: { ...defaultSettings(), ...progress.settings, soundSource: progress.settings?.soundSource ?? 'samples' },
    journey: {
      ...emptyJourney(),
      ...progress.journey,
      stats: progress.journey?.stats ?? {},
      celebrated: progress.journey?.celebrated ?? [],
    },
    version: 1,
  };
}

export function todayKey(date = new Date()): string {
  return date.toISOString().slice(0, 10);
}

export function applyStreak(progress: UserProgress, now = new Date()): UserProgress {
  const today = todayKey(now);
  if (progress.streak.lastDate === today) return progress;
  const yesterday = todayKey(new Date(now.getTime() - 86400000));
  const days = progress.streak.lastDate === yesterday ? progress.streak.days + 1 : 1;
  return { ...progress, streak: { lastDate: today, days } };
}

export function recordAnswer(progress: UserProgress, answer: AnswerRecord): UserProgress {
  const next = structuredClone(progress) as UserProgress;
  const key = answer.expected;
  next.noteStats[key] = next.noteStats[key] ?? emptyNoteStat();
  const stat = next.noteStats[key];
  stat.attempts += 1;
  if (answer.correct) {
    stat.correct += 1;
    next.totalCorrect += 1;
    next.xp += answer.firstAttempt ? 10 : 5;
  } else {
    stat.incorrect += 1;
    next.xp += 2;
  }
  if (answer.firstAttempt) {
    stat.firstAttemptTotal += 1;
    if (answer.correct) stat.firstAttemptCorrect += 1;
  }
  return unlockAchievements(applyJourneyAnswer(next, answer));
}

export function completeSession(
  progress: UserProgress,
  summary: SessionSummary,
): UserProgress {
  let next = applyStreak(recordHistory(progress, summary));
  next = applyJourneySession(next, summary);
  next = { ...next, xp: next.xp + 50, onboarded: true };
  if (summary.mode === 'melody' || summary.mode === 'song') {
    next = unlock(next, 'first_melody');
  }
  if (summary.mode === 'guitar') {
    next = unlock(next, 'guitar_finder');
  }
  next = unlock(next, 'first_session');
  return unlockAchievements(next);
}

function recordHistory(progress: UserProgress, summary: SessionSummary): UserProgress {
  return {
    ...progress,
    history: [summary, ...progress.history].slice(0, 40),
  };
}

export function completeLesson(progress: UserProgress, lessonId: string): UserProgress {
  if (progress.completedLessons.includes(lessonId)) return progress;
  return unlockAchievements({
    ...progress,
    completedLessons: [...progress.completedLessons, lessonId],
    xp: progress.xp + 20,
    onboarded: true,
  });
}

export function userLevel(xp: number): number {
  return Math.floor(xp / 100) + 1;
}

export function accuracyMap(progress: UserProgress): Record<string, { correct: number; total: number }> {
  const map: Record<string, { correct: number; total: number }> = {};
  for (const [name, stat] of Object.entries(progress.noteStats)) {
    map[name] = { correct: stat.correct, total: stat.correct + stat.incorrect };
  }
  return map;
}

export function firstAttemptAccuracy(progress: UserProgress): number {
  let correct = 0;
  let total = 0;
  for (const stat of Object.values(progress.noteStats)) {
    correct += stat.firstAttemptCorrect;
    total += stat.firstAttemptTotal;
  }
  return total === 0 ? 0 : correct / total;
}

export function overallAccuracy(progress: UserProgress): number {
  let correct = 0;
  let total = 0;
  for (const stat of Object.values(progress.noteStats)) {
    correct += stat.correct;
    total += stat.correct + stat.incorrect;
  }
  return total === 0 ? 0 : correct / total;
}

function unlockAchievements(progress: UserProgress): UserProgress {
  let next = progress;
  if (next.totalCorrect >= 10) next = unlock(next, 'first_10');
  if (next.totalCorrect >= 100) next = unlock(next, 'identified_100');
  if (next.streak.days >= 7) next = unlock(next, 'week_practice');

  const c = next.noteStats.C;
  const d = next.noteStats.D;
  if (c && d && c.correct + c.incorrect >= 20 && d.correct + d.incorrect >= 20) {
    const cAcc = c.correct / (c.correct + c.incorrect);
    const dAcc = d.correct / (d.correct + d.incorrect);
    if (cAcc >= 0.9 && dAcc >= 0.9) next = unlock(next, 'cd_90');
  }

  const naturals = ['C', 'D', 'E', 'F', 'G', 'A', 'B'];
  const ready = naturals.every((name) => {
    const stat = next.noteStats[name];
    if (!stat) return false;
    const total = stat.correct + stat.incorrect;
    return total >= 10 && stat.correct / total >= 0.8;
  });
  if (ready) next = unlock(next, 'naturals');
  return next;
}

export function grantAchievement(progress: UserProgress, id: string): UserProgress {
  return unlock(progress, id);
}

function unlock(progress: UserProgress, id: string): UserProgress {
  if (progress.achievements.includes(id)) return progress;
  return { ...progress, achievements: [...progress.achievements, id], xp: progress.xp + 25 };
}

export function summarizeSession(
  answers: AnswerRecord[],
  notes: SessionSummary['notes'],
  mode: SessionSummary['mode'],
  levelId?: string,
): SessionSummary {
  const perNote: SessionSummary['perNote'] = {};
  let correct = 0;
  let firstCorrect = 0;
  let firstTotal = 0;
  let replayCount = 0;
  for (const answer of answers) {
    perNote[answer.expected] = perNote[answer.expected] ?? { correct: 0, total: 0 };
    perNote[answer.expected].total += 1;
    if (answer.correct) {
      perNote[answer.expected].correct += 1;
      correct += 1;
    }
    if (answer.firstAttempt) {
      firstTotal += 1;
      if (answer.correct) firstCorrect += 1;
    }
    replayCount += answer.replayCount;
  }
  return {
    id: `session-${Date.now()}`,
    date: new Date().toISOString(),
    mode,
    notes,
    accuracy: answers.length ? correct / answers.length : 0,
    firstAttemptAccuracy: firstTotal ? firstCorrect / firstTotal : 0,
    questionCount: answers.length,
    replayCount,
    perNote,
    levelId,
  };
}

function applyJourneyAnswer(progress: UserProgress, answer: AnswerRecord): UserProgress {
  const levelId = progress.journey?.activeLevelId;
  if (!levelId) return progress;
  const journey = progress.journey ?? emptyJourney();
  const prev = journey.stats[levelId] ?? emptyLevelStat();
  const questions = prev.questions + 1;
  const correct = prev.correct + (answer.correct ? 1 : 0);
  const accuracy = questions ? correct / questions : 0;
  return {
    ...progress,
    journey: {
      ...journey,
      stats: {
        ...journey.stats,
        [levelId]: {
          ...prev,
          questions,
          correct,
          lastAccuracy: accuracy,
          bestAccuracy: Math.max(prev.bestAccuracy, accuracy),
        },
      },
    },
  };
}

function applyJourneySession(progress: UserProgress, summary: SessionSummary): UserProgress {
  const levelId = summary.levelId ?? progress.journey?.activeLevelId;
  if (!levelId) return progress;
  const journey = progress.journey ?? emptyJourney();
  const prev = journey.stats[levelId] ?? emptyLevelStat();
  return {
    ...progress,
    journey: {
      ...journey,
      stats: {
        ...journey.stats,
        [levelId]: {
          ...prev,
          sessions: prev.sessions + 1,
          lastAccuracy: summary.accuracy,
          bestAccuracy: Math.max(prev.bestAccuracy, summary.accuracy),
        },
      },
    },
  };
}

export function recordJourneyHit(progress: UserProgress, correct: boolean): UserProgress {
  return applyJourneyAnswer(progress, {
    questionId: `journey-${Date.now()}`,
    expected: 'C',
    expectedMidi: 0,
    selected: correct ? 'C' : 'D',
    correct,
    firstAttempt: true,
    replayCount: 0,
    mode: 'interval',
  });
}

export function setActiveLevel(progress: UserProgress, levelId?: string): UserProgress {
  const journey = progress.journey ?? emptyJourney();
  return { ...progress, journey: { ...journey, activeLevelId: levelId } };
}

export function markCelebrated(progress: UserProgress, levelIds: string[]): UserProgress {
  const journey = progress.journey ?? emptyJourney();
  const celebrated = [...new Set([...journey.celebrated, ...levelIds])];
  return { ...progress, journey: { ...journey, celebrated } };
}
