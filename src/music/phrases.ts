import {
  nameFromPitchClass,
  noteFromName,
  pitchClassFromName,
  type MusicalNote,
  type NoteName,
} from './notes';

export const MELODY_QUIZ_LENGTH = 10;

export type Rng = () => number;

export interface PhraseTemplate {
  id: string;
  name: string;
  hint: string;
  degrees: number[];
}

export interface GeneratedPhrase {
  id: string;
  templateId: string;
  name: string;
  hint: string;
  degrees: number[];
  notes: MusicalNote[];
}

export interface PhraseChoice {
  key: string;
  notes: MusicalNote[];
  correct: boolean;
}

/**
 * Scale-degree shapes that show up constantly in folk, hymns, playground
 * chants, and pop. Degrees are 0-based into the learner's note set
 * (0 = tonic / first selected note).
 */
export const PHRASE_TEMPLATES: PhraseTemplate[] = [
  {
    id: 'neighbor',
    name: 'Neighbor tone',
    hint: 'Step away, then home. Folk songs do this constantly.',
    degrees: [0, 1, 0],
  },
  {
    id: 'repeat-step',
    name: 'Repeat then step',
    hint: 'Stay, then move — the start of Happy Birthday.',
    degrees: [0, 0, 1],
  },
  {
    id: 'step-hold',
    name: 'Step and hold',
    hint: 'Move once, then sit on the new note.',
    degrees: [0, 1, 1],
  },
  {
    id: 'rocking',
    name: 'Rocking step',
    hint: 'Back and forth on two neighbors.',
    degrees: [0, 1, 0, 1],
  },
  {
    id: 'do-re-mi',
    name: 'Rising scale',
    hint: 'Do–re–mi. The first scale most people sing.',
    degrees: [0, 1, 2],
  },
  {
    id: 'mi-re-do',
    name: 'Falling scale',
    hint: 'Walking down to home, like a cadence.',
    degrees: [2, 1, 0],
  },
  {
    id: 'turn',
    name: 'Stepwise turn',
    hint: 'Up and back. A classic folk and ornament shape.',
    degrees: [0, 1, 2, 1, 0],
  },
  {
    id: 'arch',
    name: 'Small arch',
    hint: 'Rise, then settle one step.',
    degrees: [0, 1, 2, 1],
  },
  {
    id: 'repeat-rise',
    name: 'Repeat and rise',
    hint: 'Like the opening of Ode to Joy.',
    degrees: [0, 0, 1, 2],
  },
  {
    id: 'third-skip',
    name: 'Skip a third',
    hint: 'Do–mi–do. A tiny arpeggio.',
    degrees: [0, 2, 0],
  },
  {
    id: 'passing-home',
    name: 'Leap then step',
    hint: 'Jump, then walk back home.',
    degrees: [0, 2, 1, 0],
  },
  {
    id: 'question',
    name: 'Question phrase',
    hint: 'Ends away from home, as if asking.',
    degrees: [0, 1, 2, 2],
  },
  {
    id: 'scale-run',
    name: 'Four-note scale',
    hint: 'Walking the scale, one step at a time.',
    degrees: [0, 1, 2, 3],
  },
  {
    id: 'scale-fall',
    name: 'Four-note descent',
    hint: 'Walking down — a very common end of a line.',
    degrees: [3, 2, 1, 0],
  },
  {
    id: 'twinkle-head',
    name: 'Twinkle head',
    hint: 'Do–do–sol–sol. One of the most famous openings.',
    degrees: [0, 0, 4, 4],
  },
  {
    id: 'arpeggio',
    name: 'Triad arpeggio',
    hint: 'Do–mi–sol–mi–do. A chord sung as a melody.',
    degrees: [0, 2, 4, 2, 0],
  },
  {
    id: 'so-mi-do',
    name: 'So–mi–do',
    hint: 'A playground-chant shape that falls to home.',
    degrees: [4, 2, 0],
  },
  {
    id: 'leap-fill',
    name: 'Leap then fill',
    hint: 'Jump to the fifth, then walk down. Twinkle’s second idea.',
    degrees: [0, 4, 3, 2, 1, 0],
  },
  {
    id: 'call',
    name: 'Call',
    hint: 'Opens on the tonic and lands on the fifth.',
    degrees: [0, 1, 2, 4],
  },
  {
    id: 'response',
    name: 'Response',
    hint: 'Answers the call by walking home.',
    degrees: [4, 3, 2, 0],
  },
];

export function scaleFromNotes(notes: readonly NoteName[]): NoteName[] {
  const unique: NoteName[] = [];
  for (const name of notes) {
    if (!unique.includes(name)) unique.push(name);
  }
  if (!unique.length) return ['C', 'D', 'E'];
  const tonicPc = pitchClassFromName(unique[0]);
  return [...unique].sort((a, b) => {
    const da = (pitchClassFromName(a) - tonicPc + 12) % 12;
    const db = (pitchClassFromName(b) - tonicPc + 12) % 12;
    return da - db;
  });
}

export function usableScale(notes: readonly NoteName[]): NoteName[] {
  const scale = scaleFromNotes(notes);
  if (scale.length >= 2) return scale;
  const tonic = scale[0] ?? 'C';
  const pc = pitchClassFromName(tonic);
  return [tonic, nameFromPitchClass(pc + 2), nameFromPitchClass(pc + 4)];
}

export function phraseKey(notes: MusicalNote[]): string {
  return notes.map((note) => `${note.name}${note.octave}`).join('-');
}

export function formatPhraseLabel(
  notes: MusicalNote[],
  display: (name: NoteName) => string,
  includePitch = true,
): string {
  return notes
    .map((note) => (includePitch ? `${display(note.name)}${note.octave}` : display(note.name)))
    .join('  ·  ');
}

export function templatesForScale(scale: readonly NoteName[]): PhraseTemplate[] {
  return PHRASE_TEMPLATES.filter((template) => fitsScale(template.degrees, scale.length));
}

function fitsScale(degrees: number[], scaleLength: number): boolean {
  return degrees.length > 0 && degrees.every((degree) => degree >= 0 && degree < scaleLength);
}

function notesFromDegrees(scale: NoteName[], degrees: number[], octave: number): MusicalNote[] {
  return degrees.map((degree) => noteFromName(scale[degree], octave));
}

function stretchDegrees(degrees: number[], scaleLength: number, target: number, rng: Rng): number[] {
  if (target <= 0) return degrees;
  if (degrees.length >= target) return degrees.slice(0, target);
  const result = [...degrees];
  let shift = 1;
  let guard = 0;
  while (result.length < target && guard < 48) {
    guard += 1;
    const sequenced = degrees.map((degree) => degree + shift);
    if (fitsScale(sequenced, scaleLength)) {
      result.push(...sequenced);
      shift += 1;
      continue;
    }
    const last = result[result.length - 1] ?? 0;
    const down = last - 1;
    const up = last + 1;
    const next = down >= 0 && (up >= scaleLength || rng() < 0.55) ? down : up < scaleLength ? up : last;
    result.push(next);
    shift = 0;
  }
  return result.slice(0, target);
}

function pickOne<T>(items: readonly T[], rng: Rng): T {
  return items[Math.floor(rng() * items.length)];
}

function shuffle<T>(items: readonly T[], rng: Rng): T[] {
  const next = [...items];
  for (let i = next.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [next[i], next[j]] = [next[j], next[i]];
  }
  return next;
}

function offsetsFor(degrees: number[], scaleLength: number): number[] {
  const highest = Math.max(...degrees);
  const maxOffset = scaleLength - 1 - highest;
  const offsets: number[] = [];
  for (let offset = 0; offset <= maxOffset; offset++) offsets.push(offset);
  return offsets;
}

export function generateMusicalPhrase(options: {
  notes: readonly NoteName[];
  octaves?: number[];
  mixOctaves?: boolean;
  length?: number;
  rng?: Rng;
}): GeneratedPhrase {
  const rng = options.rng ?? Math.random;
  const scale = usableScale(options.notes);
  const pool = templatesForScale(scale);
  const template = pickOne(pool.length ? pool : PHRASE_TEMPLATES.filter((item) => fitsScale(item.degrees, 2)), rng);
  const offsets = offsetsFor(template.degrees, scale.length);
  const offset = pickOne(offsets.length ? offsets : [0], rng);
  let degrees = template.degrees.map((degree) => degree + offset);
  if (options.length) {
    degrees = stretchDegrees(degrees, scale.length, options.length, rng);
  }
  const octavePool = options.octaves?.length ? options.octaves : [4];
  const octave = options.mixOctaves ? pickOne(octavePool, rng) : (octavePool.includes(4) ? 4 : octavePool[0]);
  const notes = notesFromDegrees(scale, degrees, octave);

  return {
    id: `${template.id}-${offset}-${octave}-${phraseKey(notes)}`,
    templateId: template.id,
    name: template.name,
    hint: template.hint,
    degrees,
    notes,
  };
}

function uniquePhrases(candidates: MusicalNote[][], correctKey: string): MusicalNote[][] {
  const seen = new Set<string>([correctKey]);
  const unique: MusicalNote[][] = [];
  for (const notes of candidates) {
    if (notes.length < 2) continue;
    const key = phraseKey(notes);
    if (seen.has(key)) continue;
    seen.add(key);
    unique.push(notes);
  }
  return unique;
}

export function buildPhraseChoices(
  phrase: GeneratedPhrase,
  notes: readonly NoteName[],
  rng: Rng = Math.random,
  octaves: readonly number[] = [],
): PhraseChoice[] {
  const scale = usableScale(notes);
  const octave = phrase.notes[0]?.octave ?? 4;
  const correctKey = phraseKey(phrase.notes);
  const candidates: MusicalNote[][] = [];

  for (const other of octaves) {
    if (other === octave) continue;
    candidates.push(notesFromDegrees(scale, phrase.degrees, other));
  }

  candidates.push([...phrase.notes].reverse());

  const shifted = phrase.degrees.map((degree) => degree + 1);
  if (fitsScale(shifted, scale.length)) {
    candidates.push(notesFromDegrees(scale, shifted, octave));
  }

  const lowered = phrase.degrees.map((degree) => degree - 1);
  if (fitsScale(lowered, scale.length)) {
    candidates.push(notesFromDegrees(scale, lowered, octave));
  }

  if (phrase.degrees.length >= 3) {
    const mutated = [...phrase.degrees];
    const index = 1;
    mutated[index] = mutated[index] === 0 ? 1 : mutated[index] - 1;
    if (fitsScale(mutated, scale.length)) {
      candidates.push(notesFromDegrees(scale, mutated, octave));
    }
  }

  for (const template of templatesForScale(scale)) {
    if (template.id === phrase.templateId) continue;
    if (template.degrees.length !== phrase.degrees.length) continue;
    const offsets = offsetsFor(template.degrees, scale.length);
    if (!offsets.length) continue;
    candidates.push(notesFromDegrees(scale, template.degrees.map((degree) => degree + offsets[0]), octave));
  }

  const wrong = uniquePhrases(candidates, correctKey);
  const sameNamesDifferentPitch = wrong.find(
    (item) =>
      item.length === phrase.notes.length &&
      item.every((note, index) => note.name === phrase.notes[index]?.name) &&
      item[0]?.octave !== octave,
  );
  const otherWrong = wrong.filter((item) => phraseKey(item) !== (sameNamesDifferentPitch ? phraseKey(sameNamesDifferentPitch) : ''));
  const pickedWrong = [
    ...(sameNamesDifferentPitch ? [sameNamesDifferentPitch] : []),
    ...shuffle(otherWrong, rng),
  ].slice(0, 2);
  while (pickedWrong.length < 2 && scale.length >= 2) {
    const decoyDegrees = [1, 0, scale.length > 2 ? 2 : 1, 0].filter((_, i) => i < phrase.notes.length);
    if (!fitsScale(decoyDegrees, scale.length)) break;
    const decoy = notesFromDegrees(scale, decoyDegrees, octave);
    if (phraseKey(decoy) === correctKey) break;
    if (pickedWrong.some((item) => phraseKey(item) === phraseKey(decoy))) break;
    pickedWrong.push(decoy);
  }

  return shuffle(
    [
      { key: correctKey, notes: phrase.notes, correct: true },
      ...pickedWrong.map((item) => ({ key: phraseKey(item), notes: item, correct: false })),
    ],
    rng,
  );
}
