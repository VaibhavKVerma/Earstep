import { describe, expect, it } from 'vitest';
import { buildJourney, isLevelMastered, stateForLevel, weakNotesFor } from '../src/training/journey';
import { MASTERY_ACCURACY, MIN_QUESTIONS, starCount } from '../src/training/mastery';
import { ROADMAP_WORLDS, allRoadmapLevels, getRoadmapLevel } from '../src/training/roadmap';
import { defaultProgress } from '../src/persistence/store';
import type { NoteStat, UserProgress } from '../src/training/types';

function stat(correct: number, incorrect: number): NoteStat {
  return {
    correct,
    incorrect,
    firstAttemptCorrect: correct,
    firstAttemptTotal: correct + incorrect,
    attempts: correct + incorrect,
  };
}

function withNotes(notes: Record<string, NoteStat>): UserProgress {
  return { ...defaultProgress(), noteStats: notes };
}

describe('roadmap config', () => {
  it('lists every world and a sequential first path', () => {
    expect(ROADMAP_WORLDS.map((world) => world.id)).toEqual([
      'hear',
      'pitch',
      'guitar',
      'relative',
      'language',
      'melody',
      'songs',
      'chromatic',
    ]);
    expect(allRoadmapLevels()[0].id).toBe('hear-cd');
    expect(allRoadmapLevels().length).toBeGreaterThanOrEqual(39);
  });

  it('renders newly added levels from configuration alone', () => {
    const extra = { ...allRoadmapLevels()[0], id: 'hear-extra-future', number: 99, title: 'Future level' };
    const combined = [...allRoadmapLevels(), extra];
    expect(combined.find((level) => level.id === 'hear-extra-future')?.title).toBe('Future level');
  });

  it('keeps chromatic notes after the natural-note world', () => {
    const naturals = getRoadmapLevel('hear-naturals');
    const firstSharp = getRoadmapLevel('chrom-sharps');
    expect(naturals?.number).toBe(6);
    expect(firstSharp && firstSharp.number).toBeGreaterThan(6);
    expect(firstSharp?.prerequisites).toContain('song-reconstruct');
  });
});

describe('journey engine', () => {
  it('starts the learner on C vs D', () => {
    const view = buildJourney(defaultProgress());
    expect(view.current?.level.id).toBe('hear-cd');
    expect(view.current?.state).toBe('available');
    expect(view.current?.isCurrent).toBe(true);
    expect(stateForLevel(defaultProgress(), getRoadmapLevel('hear-cde')!)).toBe('locked');
  });

  it('does not master a level from one short session', () => {
    const progress = withNotes({
      C: stat(8, 1),
      D: stat(8, 1),
    });
    expect(isLevelMastered(progress, getRoadmapLevel('hear-cd')!)).toBe(false);
  });

  it('masters C vs D from existing note stats at the configured threshold', () => {
    const each = Math.ceil(MIN_QUESTIONS / 2);
    const correct = Math.ceil(each * MASTERY_ACCURACY);
    const progress = withNotes({
      C: stat(correct, each - correct),
      D: stat(correct, each - correct),
    });
    expect(isLevelMastered(progress, getRoadmapLevel('hear-cd')!)).toBe(true);
    const view = buildJourney(progress);
    expect(view.current?.level.id).toBe('hear-cde');
    expect(view.masteredCount).toBe(1);
  });

  it('keeps C/D/E in progress when E is weak', () => {
    const progress = withNotes({
      C: stat(28, 2),
      D: stat(27, 3),
      E: stat(10, 20),
    });
    const level = getRoadmapLevel('hear-cde')!;
    expect(isLevelMastered(progress, getRoadmapLevel('hear-cd')!)).toBe(true);
    expect(isLevelMastered(progress, level)).toBe(false);
    const weak = weakNotesFor(progress, level);
    expect(weak[0].name).toBe('E');
    expect(buildJourney(progress).current?.level.id).toBe('hear-cde');
  });

  it('assigns stars from accuracy bands without replacing mastery', () => {
    expect(starCount(0.85)).toBe(2);
    expect(starCount(0.92)).toBe(3);
    expect(starCount(0.96)).toBe(4);
    expect(starCount(0.99)).toBe(5);
    expect(starCount(0.68)).toBe(0);
  });
});
