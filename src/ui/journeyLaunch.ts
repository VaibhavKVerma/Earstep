import { applyDifficulty, defaultConfig, mistakeWeights } from '../training/quizEngine';
import { getRoadmapLevel, type RoadmapLevel } from '../training/roadmap';
import { setActiveLevel } from '../persistence/store';
import type { PracticeConfig, UserProgress } from '../training/types';
import type { Go } from './nav';

export function configForLevel(level: RoadmapLevel, progress: UserProgress): PracticeConfig {
  const notes = level.notes?.length ? level.notes : progress.selectedNotes;
  const safeNotes = notes.length ? notes : (['C', 'D'] as PracticeConfig['notes']);
  return applyDifficulty({
    ...defaultConfig(level.practiceMode === 'note' ? 'note' : level.practiceMode, safeNotes),
    octaves: level.octaves ?? progress.selectedOctaves,
    instrument: progress.settings.instrument,
    questionCount: level.questionCount ?? 16,
    difficulty: level.difficulty,
    includeChromatic: level.includeChromatic,
    levelId: level.id,
    mode: level.practiceMode === 'higher-lower' ? 'interval' : level.practiceMode,
  });
}

export function beginLevel(
  level: RoadmapLevel,
  progress: UserProgress,
  update: (recipe: (current: UserProgress) => UserProgress) => void,
  go: Go,
  heading?: string,
): void {
  const notes = level.notes?.length ? level.notes : progress.selectedNotes;
  update((current) => ({
    ...setActiveLevel(current, level.id),
    selectedNotes: notes.length ? notes : current.selectedNotes,
    selectedOctaves: level.octaves ?? current.selectedOctaves,
  }));

  const config = configForLevel(level, { ...progress, selectedNotes: notes.length ? notes : progress.selectedNotes });

  if (level.practiceMode === 'note') {
    go({ id: 'train', config, heading: heading ?? level.title });
    return;
  }
  if (level.practiceMode === 'one-note') {
    go({ id: 'one-note' });
    return;
  }
  if (level.practiceMode === 'octave') {
    go({ id: 'octave' });
    return;
  }
  if (level.practiceMode === 'guitar') {
    go({ id: 'guitar-find' });
    return;
  }
  if (level.practiceMode === 'hear-sing-find') {
    go({ id: 'hear-sing-find' });
    return;
  }
  if (level.practiceMode === 'interval' || level.practiceMode === 'higher-lower') {
    go({ id: 'intervals' });
    return;
  }
  if (level.practiceMode === 'melody') {
    go({ id: 'melody' });
    return;
  }
  if (level.practiceMode === 'song') {
    go({ id: 'song' });
    return;
  }
  go({ id: 'train', config, heading: heading ?? level.title });
}

export function beginWeakNotes(
  level: RoadmapLevel,
  progress: UserProgress,
  update: (recipe: (current: UserProgress) => UserProgress) => void,
  go: Go,
  focus?: string,
): void {
  const notes = level.notes?.length ? level.notes : progress.selectedNotes;
  const map: Record<string, { correct: number; total: number }> = {};
  for (const name of notes) {
    const stat = progress.noteStats[name];
    map[name] = { correct: stat?.correct ?? 0, total: (stat?.correct ?? 0) + (stat?.incorrect ?? 0) };
  }
  const weights = mistakeWeights(notes, map);
  if (focus) weights[focus] = (weights[focus] ?? 1) + 6;
  const focused = focus && notes.includes(focus as never) ? [focus as (typeof notes)[number], ...notes.filter((n) => n !== focus)] : notes;

  update((current) => setActiveLevel(current, level.id));
  go({
    id: 'train',
    heading: focus ? `Practice ${focus}` : 'Practice weak notes',
    config: applyDifficulty({
      ...configForLevel(level, progress),
      notes: focused,
      questionCount: 12,
      noteWeights: weights,
      mode: 'note',
    }),
  });
}

export function startLevelById(
  levelId: string,
  progress: UserProgress,
  update: (recipe: (current: UserProgress) => UserProgress) => void,
  go: Go,
): void {
  const level = getRoadmapLevel(levelId);
  if (level) beginLevel(level, progress, update, go);
}
