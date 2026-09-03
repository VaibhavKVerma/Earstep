import { describe, expect, it } from 'vitest';
import {
  frequencyToRoundedMidi,
  isSampledInstrument,
  nearestSampleMidi,
  sampleFileName,
  sampleUrl,
} from '../src/audio/samples';

describe('instrument samples', () => {
  it('names FluidR3 files with flats', () => {
    expect(sampleFileName(60)).toBe('C4');
    expect(sampleFileName(61)).toBe('Db4');
    expect(sampleFileName(40)).toBe('E2');
    expect(sampleFileName(64)).toBe('E4');
  });

  it('picks the closest recorded pitch', () => {
    expect(nearestSampleMidi(60)).toBe(60);
    expect(nearestSampleMidi(62)).toBe(63);
    expect(nearestSampleMidi(41)).toBe(40);
  });

  it('maps frequencies to MIDI and sample URLs', () => {
    expect(frequencyToRoundedMidi(261.63)).toBe(60);
    expect(sampleUrl('acoustic', 40)).toBe('/samples/acoustic/E2.mp3');
    expect(isSampledInstrument('acoustic')).toBe(true);
    expect(isSampledInstrument('sine')).toBe(false);
  });
});
