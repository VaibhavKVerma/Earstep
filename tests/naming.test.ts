import { describe, expect, it } from 'vitest';
import { displayName, displayNameForNoteName, mappedScaleNotes, scaleDegreeSemitones } from '../src/music/naming';

describe('note naming systems', () => {
  it('maps C major to sargam and solfege', () => {
    expect(displayName(0, 'sargam', 0)).toBe('Sa');
    expect(displayName(2, 'sargam', 0)).toBe('Re');
    expect(displayName(4, 'solfege', 0)).toBe('Mi');
    expect(displayNameForNoteName('G', 'sargam', 0)).toBe('Pa');
  });

  it('moves the whole scale when Sa changes', () => {
    expect(displayNameForNoteName('D', 'sargam', 2)).toBe('Sa');
    expect(displayNameForNoteName('E', 'sargam', 2)).toBe('Re');
    expect(displayNameForNoteName('F#', 'sargam', 2)).toBe('Ga');
    expect(mappedScaleNotes(2)).toEqual(['D', 'E', 'F#', 'G', 'A', 'B', 'C#']);
  });

  it('keeps western names independent of tonic', () => {
    expect(displayName(0, 'western', 2)).toBe('C');
    expect(scaleDegreeSemitones(7, 0)).toBe(7);
  });
});
