import { describe, expect, it } from 'vitest';
import {
  A4_HZ,
  frequencyToMidi,
  midiToFrequency,
  midiToNote,
  midiToOctave,
  midiToPitchClass,
  noteFromName,
  noteToMidi,
  octaveLabel,
  parseScientific,
  sameAbsolutePitch,
  samePitchClass,
} from '../src/music/notes';

describe('note model', () => {
  it('maps C4 to MIDI 60 and about 261.63 Hz', () => {
    const c4 = noteFromName('C', 4);
    expect(c4.midi).toBe(60);
    expect(c4.pitchClass).toBe(0);
    expect(c4.octave).toBe(4);
    expect(c4.frequency).toBeCloseTo(261.6256, 3);
  });

  it('maps A4 to 440 Hz and MIDI 69', () => {
    const a4 = noteFromName('A', 4);
    expect(a4.midi).toBe(69);
    expect(a4.frequency).toBeCloseTo(A4_HZ, 8);
  });

  it('treats C4 and C5 as the same pitch class but different pitches', () => {
    const c4 = noteFromName('C', 4);
    const c5 = noteFromName('C', 5);
    expect(samePitchClass(c4, c5)).toBe(true);
    expect(sameAbsolutePitch(c4, c5)).toBe(false);
    expect(c5.midi - c4.midi).toBe(12);
    expect(c5.frequency / c4.frequency).toBeCloseTo(2, 8);
  });

  it('converts MIDI, names, and octaves in both directions', () => {
    expect(noteToMidi(0, 4)).toBe(60);
    expect(midiToPitchClass(61)).toBe(1);
    expect(midiToOctave(72)).toBe(5);
    expect(midiToNote(64).name).toBe('E');
    expect(parseScientific('G#3').midi).toBe(noteFromName('G#', 3).midi);
  });

  it('uses equal temperament around A4', () => {
    expect(midiToFrequency(69)).toBe(440);
    expect(frequencyToMidi(880)).toBeCloseTo(81, 8);
  });

  it('labels octaves in beginner language', () => {
    expect(octaveLabel(2)).toBe('low');
    expect(octaveLabel(4)).toBe('middle');
    expect(octaveLabel(5)).toBe('high');
  });
});
