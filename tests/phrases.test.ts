import { describe, expect, it } from 'vitest';
import { NATURAL_NAMES } from '../src/music/notes';
import {
  buildPhraseChoices,
  formatPhraseLabel,
  generateMusicalPhrase,
  phraseKey,
  scaleFromNotes,
  templatesForScale,
  usableScale,
} from '../src/music/phrases';

function rngFrom(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (Math.imul(a, 1664525) + 1013904223) >>> 0;
    return a / 4294967296;
  };
}

describe('musical phrases', () => {
  it('orders the learner set from the first note as tonic', () => {
    expect(scaleFromNotes(['C', 'E', 'G'])).toEqual(['C', 'E', 'G']);
    expect(scaleFromNotes(['D', 'C', 'E'])).toEqual(['D', 'E', 'C']);
  });

  it('expands a single note into a tiny major triad so a phrase can exist', () => {
    expect(usableScale(['G'])).toEqual(['G', 'A', 'B']);
  });

  it('only uses notes from the selected set', () => {
    const selected = ['C', 'D', 'E'] as const;
    for (let i = 0; i < 40; i++) {
      const phrase = generateMusicalPhrase({ notes: [...selected], rng: rngFrom(i * 17 + 3) });
      for (const note of phrase.notes) {
        expect(selected).toContain(note.name);
        expect(note.octave).toBe(4);
      }
      expect(phrase.notes.length).toBeGreaterThanOrEqual(3);
    }
  });

  it('stays on one octave unless mix is on', () => {
    const mixed = generateMusicalPhrase({
      notes: ['C', 'D', 'E', 'F', 'G'],
      octaves: [3, 5],
      mixOctaves: true,
      rng: rngFrom(9),
    });
    expect([3, 5]).toContain(mixed.notes[0].octave);
    expect(mixed.notes.every((note) => note.octave === mixed.notes[0].octave)).toBe(true);

    const pinned = generateMusicalPhrase({
      notes: ['C', 'D', 'E', 'F', 'G'],
      octaves: [3, 5],
      mixOctaves: false,
      rng: rngFrom(9),
    });
    expect(pinned.notes.every((note) => note.octave === 3)).toBe(true);
  });

  it('is deterministic with a seeded rng', () => {
    const a = generateMusicalPhrase({ notes: ['C', 'D', 'E', 'F', 'G'], rng: rngFrom(42) });
    const b = generateMusicalPhrase({ notes: ['C', 'D', 'E', 'F', 'G'], rng: rngFrom(42) });
    expect(phraseKey(a.notes)).toBe(phraseKey(b.notes));
    expect(a.templateId).toBe(b.templateId);
  });

  it('can produce famous five-note shapes on C D E F G', () => {
    const scale = ['C', 'D', 'E', 'F', 'G'] as const;
    const ids = new Set(templatesForScale(scale).map((item) => item.id));
    expect(ids.has('twinkle-head')).toBe(true);
    expect(ids.has('arpeggio')).toBe(true);
    expect(ids.has('so-mi-do')).toBe(true);
    expect(ids.has('leap-fill')).toBe(true);
  });

  it('offers the heard sequence plus different musical decoys', () => {
    const notes = ['C', 'D', 'E', 'F', 'G'] as const;
    const phrase = generateMusicalPhrase({ notes, rng: rngFrom(21) });
    const choices = buildPhraseChoices(phrase, notes, rngFrom(21));
    const keys = choices.map((choice) => choice.key);
    expect(choices.some((choice) => choice.correct)).toBe(true);
    expect(new Set(keys).size).toBe(keys.length);
    expect(choices).toHaveLength(3);
    const heard = choices.find((choice) => choice.correct);
    expect(phraseKey(heard?.notes ?? [])).toBe(phraseKey(phrase.notes));
  });

  it('still offers three unique choices on a two-note set', () => {
    const notes = ['C', 'D'] as const;
    const phrase = generateMusicalPhrase({ notes, rng: rngFrom(5) });
    const choices = buildPhraseChoices(phrase, notes, rngFrom(8));
    expect(new Set(choices.map((choice) => choice.key)).size).toBe(choices.length);
    expect(choices.length).toBeGreaterThanOrEqual(2);
    expect(choices.some((choice) => choice.correct)).toBe(true);
    for (const choice of choices) {
      for (const note of choice.notes) expect(notes).toContain(note.name);
    }
  });

  it('can stretch a motif to a ten-note phrase', () => {
    const phrase = generateMusicalPhrase({
      notes: ['C', 'D', 'E', 'F'],
      length: 10,
      rng: rngFrom(11),
    });
    expect(phrase.notes).toHaveLength(10);
    for (const note of phrase.notes) {
      expect(['C', 'D', 'E', 'F']).toContain(note.name);
    }
  });

  it('labels every note with its pitch', () => {
    const phrase = generateMusicalPhrase({ notes: ['C', 'D', 'E'], rng: rngFrom(1) });
    expect(formatPhraseLabel(phrase.notes, (name) => name)).toMatch(/C4|D4|E4/);
    expect(formatPhraseLabel(phrase.notes, (name) => name)).toContain('4');
    expect(formatPhraseLabel(phrase.notes, (name) => name, false)).not.toMatch(/\d/);
  });

  it('uses the full natural scale and puts another pitch in the options', () => {
    const notes = NATURAL_NAMES;
    const phrase = generateMusicalPhrase({
      notes,
      octaves: [3, 4, 5],
      mixOctaves: true,
      rng: rngFrom(21),
    });
    expect(NATURAL_NAMES).toContain(phrase.notes[0]?.name);
    const choices = buildPhraseChoices(phrase, notes, rngFrom(4), [3, 4, 5]);
    expect(choices).toHaveLength(3);
    const pitchOption = choices.find(
      (choice) =>
        !choice.correct &&
        choice.notes.length === phrase.notes.length &&
        choice.notes.every((note, index) => note.name === phrase.notes[index]?.name) &&
        choice.notes[0]?.octave !== phrase.notes[0]?.octave,
    );
    expect(pitchOption).toBeTruthy();
    expect([3, 4, 5]).toContain(pitchOption?.notes[0]?.octave);
  });
});
