import { describe, expect, it } from 'vitest';
import { noteFromName } from '../src/music/notes';
import { noteExplanation } from '../src/training/explanations';

describe('note explanations', () => {
  it('does not crash when the selected value is a phrase, not a note name', () => {
    const heard = noteFromName('C', 4);
    expect(() => noteExplanation(heard, 'C4-D4-C4', false, 'western', 0)).not.toThrow();
    const result = noteExplanation(heard, 'C4-D4-C4', false, 'western', 0);
    expect(result.title).toContain('Not quite');
  });
});
