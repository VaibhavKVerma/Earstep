import { describe, expect, it } from 'vitest';
import {
  intervalDirection,
  intervalFromSemitones,
  semitonesBetween,
  validateIntervalAnswer,
} from '../src/music/intervals';
import { noteFromName } from '../src/music/notes';
import { melodyDirection } from '../src/music/songs';

describe('intervals', () => {
  it('names common distances from C', () => {
    const c = noteFromName('C', 4);
    expect(intervalFromSemitones(semitonesBetween(c.midi, noteFromName('D', 4).midi)).name).toBe('Major 2nd');
    expect(intervalFromSemitones(semitonesBetween(c.midi, noteFromName('E', 4).midi)).name).toBe('Major 3rd');
    expect(intervalFromSemitones(semitonesBetween(c.midi, noteFromName('G', 4).midi)).name).toBe('Perfect 5th');
    expect(intervalFromSemitones(12).id).toBe('P8');
  });

  it('validates answers and direction', () => {
    expect(validateIntervalAnswer(4, 'M3')).toBe(true);
    expect(validateIntervalAnswer(4, 'P5')).toBe(false);
    expect(intervalDirection(3)).toBe('higher');
    expect(intervalDirection(-2)).toBe('lower');
    expect(intervalDirection(0)).toBe('same');
  });

  it('reads melody contour', () => {
    expect(melodyDirection(noteFromName('C', 4), noteFromName('E', 4))).toBe('higher');
    expect(melodyDirection(noteFromName('G', 4), noteFromName('G', 4))).toBe('same');
  });
});
