import { describe, expect, it } from 'vitest';
import { adviseProgression, formatNoteSet, stageForNotes } from '../src/music/progression';

describe('progression', () => {
  it('identifies the C/D and C/D/E stages', () => {
    expect(stageForNotes(['C', 'D'])).toBe(1);
    expect(stageForNotes(['C', 'D', 'E'])).toBe(2);
    expect(formatNoteSet(['C', 'D'])).toBe('C vs D');
  });

  it('stays when a note is still weak', () => {
    const advice = adviseProgression(
      ['C', 'D'],
      {
        C: { correct: 9, total: 10 },
        D: { correct: 4, total: 10 },
      },
    );
    expect(advice.action).toBe('stay');
  });

  it('recommends E after C and D are strong', () => {
    const advice = adviseProgression(
      ['C', 'D'],
      {
        C: { correct: 19, total: 20 },
        D: { correct: 18, total: 20 },
      },
    );
    expect(advice.action).toBe('add-note');
    expect(advice.nextNote).toBe('E');
  });
});
