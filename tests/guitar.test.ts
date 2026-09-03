import { describe, expect, it } from 'vitest';
import {
  STANDARD_TUNING_MIDI,
  findPositions,
  isCorrectFret,
  midiAtFret,
  noteAtFret,
} from '../src/music/guitar';
import { noteFromName } from '../src/music/notes';

describe('guitar fretboard', () => {
  it('uses standard tuning MIDI numbers', () => {
    expect(STANDARD_TUNING_MIDI).toEqual([40, 45, 50, 55, 59, 64]);
    expect(noteAtFret(0, 0).name).toBe('E');
    expect(noteAtFret(0, 0).octave).toBe(2);
    expect(noteAtFret(5, 0).name).toBe('E');
    expect(noteAtFret(5, 0).octave).toBe(4);
  });

  it('calculates frets from tuning plus semitone offset', () => {
    expect(midiAtFret(1, 3)).toBe(48); // A2 + 3 = C3
    expect(noteAtFret(1, 3).name).toBe('C');
    expect(noteAtFret(2, 0).name).toBe('D');
    expect(noteAtFret(3, 0).name).toBe('G');
  });

  it('finds every G in the first 15 frets', () => {
    const g = findPositions({ pitchClass: 7 }, 15);
    expect(g.some((pos) => pos.stringIndex === 0 && pos.fret === 3)).toBe(true);
    expect(g.some((pos) => pos.stringIndex === 2 && pos.fret === 5)).toBe(true);
    expect(g.some((pos) => pos.stringIndex === 3 && pos.fret === 0)).toBe(true);
    expect(g.every((pos) => pos.note.name === 'G')).toBe(true);
  });

  it('can restrict matches to one octave', () => {
    const g3 = noteFromName('G', 3);
    const exact = findPositions({ pitchClass: g3.pitchClass, octave: 3 }, 15);
    expect(exact.every((pos) => pos.note.octave === 3)).toBe(true);
    expect(isCorrectFret({ midi: g3.midi }, 3, 0)).toBe(true);
    expect(isCorrectFret({ midi: g3.midi }, 0, 3)).toBe(false);
    expect(isCorrectFret({ pitchClass: 7 }, 0, 3)).toBe(true);
  });
});
