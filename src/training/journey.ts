import { rankedNotes } from '../music/progression';
import type { JourneyLevelStat, UserProgress } from './types';
import { meetsMastery, starCount } from './mastery';
import {
  ROADMAP_WORLDS,
  allRoadmapLevels,
  getRoadmapLevel,
  type RoadmapLevel,
  type RoadmapWorld,
} from './roadmap';

export type LevelState = 'locked' | 'available' | 'in-progress' | 'mastered';

export interface WeakNote {
  name: string;
  accuracy: number;
  total: number;
}

export interface LevelView {
  level: RoadmapLevel;
  state: LevelState;
  accuracy: number;
  questions: number;
  sessions: number;
  bestAccuracy: number;
  stars: number;
  weakNotes: WeakNote[];
  unlockHint: string;
  isCurrent: boolean;
}

export interface WorldView {
  world: RoadmapWorld;
  mastered: number;
  total: number;
  levels: LevelView[];
}

export interface JourneyView {
  worlds: WorldView[];
  levels: LevelView[];
  masteredCount: number;
  totalCount: number;
  overallProgress: number;
  current: LevelView | null;
  currentWorld: WorldView | null;
  next: LevelView | null;
  learnedNotes: string[];
  comingNext: LevelView[];
}

export function emptyLevelStat(): JourneyLevelStat {
  return { questions: 0, correct: 0, sessions: 0, bestAccuracy: 0, lastAccuracy: 0 };
}

function noteTotals(progress: UserProgress, notes: readonly string[]) {
  return notes.map((name) => {
    const stat = progress.noteStats[name];
    const correct = stat?.correct ?? 0;
    const total = (stat?.correct ?? 0) + (stat?.incorrect ?? 0);
    return { name, correct, total, accuracy: total ? correct / total : 0 };
  });
}

export function statsForLevel(progress: UserProgress, level: RoadmapLevel): JourneyLevelStat {
  const stored = progress.journey?.stats[level.id] ?? emptyLevelStat();

  if (level.notes?.length && level.practiceMode === 'note') {
    const perNote = noteTotals(progress, level.notes);
    const questions = perNote.reduce((sum, item) => sum + item.total, 0);
    const correct = perNote.reduce((sum, item) => sum + item.correct, 0);
    const accuracy = questions ? correct / questions : 0;
    return {
      questions: Math.max(questions, stored.questions),
      correct: questions >= stored.questions ? correct : stored.correct,
      sessions: Math.max(stored.sessions, historySessions(progress, level)),
      bestAccuracy: Math.max(stored.bestAccuracy, accuracy),
      lastAccuracy: stored.lastAccuracy || accuracy,
    };
  }

  if (stored.questions > 0) return stored;

  if (level.practiceMode === 'octave') {
    const total = progress.octaveStats.correct + progress.octaveStats.incorrect;
    return {
      questions: total,
      correct: progress.octaveStats.correct,
      sessions: stored.sessions,
      bestAccuracy: Math.max(stored.bestAccuracy, total ? progress.octaveStats.correct / total : 0),
      lastAccuracy: stored.lastAccuracy,
    };
  }

  return stored;
}

function historySessions(progress: UserProgress, level: RoadmapLevel): number {
  if (!level.notes?.length) return 0;
  const wanted = new Set(level.notes);
  return progress.history.filter((session) => {
    if (session.levelId === level.id) return true;
    if (session.mode !== 'note' || session.notes.length !== wanted.size) return false;
    return session.notes.every((name) => wanted.has(name));
  }).length;
}

export function isLevelMastered(progress: UserProgress, level: RoadmapLevel): boolean {
  const stats = statsForLevel(progress, level);
  const criteria = level.mastery;

  if (level.notes?.length && level.practiceMode === 'note') {
    const perNote = noteTotals(progress, level.notes);
    const minEach = criteria.minPerNote ?? 8;
    const eachReady = perNote.every((item) => item.total >= minEach && item.accuracy >= criteria.accuracy);
    const accuracy = stats.questions ? stats.correct / stats.questions : 0;
    return eachReady && meetsMastery(stats.questions, accuracy, criteria);
  }

  const accuracy = stats.questions ? stats.correct / stats.questions : 0;
  return meetsMastery(stats.questions, accuracy, criteria);
}

function levelAccuracy(stats: JourneyLevelStat): number {
  if (stats.lastAccuracy) return stats.questions ? stats.correct / stats.questions : stats.lastAccuracy;
  return stats.questions ? stats.correct / stats.questions : 0;
}

export function prerequisitesMet(progress: UserProgress, level: RoadmapLevel): boolean {
  return level.prerequisites.every((id) => {
    const required = getRoadmapLevel(id);
    return required ? isLevelMastered(progress, required) : false;
  });
}

export function stateForLevel(progress: UserProgress, level: RoadmapLevel): LevelState {
  if (isLevelMastered(progress, level)) return 'mastered';
  if (level.prerequisites.length > 0 && !prerequisitesMet(progress, level)) return 'locked';
  const stats = statsForLevel(progress, level);
  if (stats.questions > 0) return 'in-progress';
  return 'available';
}

export function unlockHintFor(progress: UserProgress, level: RoadmapLevel): string {
  if (stateForLevel(progress, level) !== 'locked') return '';
  const missing = level.prerequisites
    .map((id) => getRoadmapLevel(id))
    .filter((item): item is RoadmapLevel => Boolean(item))
    .filter((item) => !isLevelMastered(progress, item));
  if (missing[0]) return `Unlock by mastering ${missing[0].title}.`;
  return 'Unlock by finishing the previous level.';
}

export function weakNotesFor(progress: UserProgress, level: RoadmapLevel): WeakNote[] {
  if (!level.notes?.length) return [];
  const map: Record<string, { correct: number; total: number }> = {};
  for (const name of level.notes) {
    const stat = progress.noteStats[name];
    map[name] = { correct: stat?.correct ?? 0, total: (stat?.correct ?? 0) + (stat?.incorrect ?? 0) };
  }
  return rankedNotes(level.notes, map).map((item) => ({
    name: item.name,
    accuracy: item.accuracy,
    total: item.total,
  }));
}

function toView(progress: UserProgress, level: RoadmapLevel): Omit<LevelView, 'isCurrent'> {
  const stats = statsForLevel(progress, level);
  const accuracy = levelAccuracy(stats);
  const state = stateForLevel(progress, level);
  return {
    level,
    state,
    accuracy,
    questions: stats.questions,
    sessions: stats.sessions,
    bestAccuracy: Math.max(stats.bestAccuracy, accuracy),
    stars: state === 'mastered' ? starCount(Math.max(stats.bestAccuracy, accuracy)) : 0,
    weakNotes: weakNotesFor(progress, level),
    unlockHint: unlockHintFor(progress, level),
  };
}

export function buildJourney(progress: UserProgress): JourneyView {
  const raw = allRoadmapLevels().map((level) => toView(progress, level));
  const currentIndex = raw.findIndex((item) => item.state === 'available' || item.state === 'in-progress');
  const currentId = currentIndex >= 0 ? raw[currentIndex].level.id : raw.find((item) => item.state !== 'mastered')?.level.id;

  const levels: LevelView[] = raw.map((item) => ({
    ...item,
    isCurrent: item.level.id === currentId,
  }));

  const worlds: WorldView[] = ROADMAP_WORLDS.map((world) => {
    const worldLevels = levels.filter((item) => item.level.worldId === world.id);
    return {
      world,
      mastered: worldLevels.filter((item) => item.state === 'mastered').length,
      total: worldLevels.length,
      levels: worldLevels,
    };
  });

  const masteredCount = levels.filter((item) => item.state === 'mastered').length;
  const current = levels.find((item) => item.isCurrent) ?? null;
  const currentWorld = worlds.find((world) => world.world.id === current?.level.worldId) ?? worlds[0] ?? null;
  const next = current
    ? levels.find((item) => item.level.number === current.level.number + 1) ?? null
    : levels.find((item) => item.state === 'available') ?? null;

  const learnedNotes = unique(
    levels
      .filter((item) => item.state === 'mastered' && item.level.notes)
      .flatMap((item) => item.level.notes ?? []),
  );

  return {
    worlds,
    levels,
    masteredCount,
    totalCount: levels.length,
    overallProgress: levels.length ? masteredCount / levels.length : 0,
    current,
    currentWorld,
    next,
    learnedNotes,
    comingNext: levels.filter((item) => item.state === 'locked' || (!item.isCurrent && item.state !== 'mastered')).slice(0, 6),
  };
}

function unique(items: string[]): string[] {
  return [...new Set(items)];
}

export function uncelebratedMasteries(progress: UserProgress): LevelView[] {
  const celebrated = new Set(progress.journey?.celebrated ?? []);
  return buildJourney(progress).levels.filter((item) => item.state === 'mastered' && !celebrated.has(item.level.id));
}

export function progressBar(ratio: number, width = 12): string {
  const filled = Math.round(Math.max(0, Math.min(1, ratio)) * width);
  return `${'█'.repeat(filled)}${'░'.repeat(width - filled)}`;
}
