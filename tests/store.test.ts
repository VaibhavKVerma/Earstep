import { describe, expect, it } from 'vitest';
import {
  applyStreak,
  defaultProgress,
  firstAttemptAccuracy,
  recordAnswer,
  userLevel,
} from '../src/persistence/store';

describe('progress store', () => {
  it('records first-attempt accuracy separately from later tries', () => {
    let progress = defaultProgress();
    progress = recordAnswer(progress, {
      questionId: '1',
      expected: 'C',
      expectedMidi: 60,
      selected: 'C',
      correct: true,
      firstAttempt: true,
      replayCount: 0,
      mode: 'note',
    });
    progress = recordAnswer(progress, {
      questionId: '2',
      expected: 'D',
      expectedMidi: 62,
      selected: 'C',
      correct: false,
      firstAttempt: false,
      replayCount: 2,
      mode: 'note',
    });
    expect(progress.noteStats.C.correct).toBe(1);
    expect(progress.noteStats.D.incorrect).toBe(1);
    expect(firstAttemptAccuracy(progress)).toBe(1);
    expect(userLevel(progress.xp)).toBe(1);
  });

  it('continues a streak on the next calendar day', () => {
    const monday = new Date('2026-09-07T12:00:00Z');
    const tuesday = new Date('2026-09-08T12:00:00Z');
    let progress = defaultProgress();
    progress = applyStreak(progress, monday);
    progress = applyStreak(progress, tuesday);
    expect(progress.streak.days).toBe(2);
  });
});
