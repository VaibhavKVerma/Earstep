export interface Lesson {
  id: string;
  number: number;
  title: string;
  minutes: number;
  summary: string;
  practiceNotes?: string[];
  mode?:
    | 'note'
    | 'octave'
    | 'guitar'
    | 'one-note'
    | 'interval'
    | 'melody'
    | 'song'
    | 'hear-sing-find';
  pages: { heading: string; body: string }[];
}

export const LESSONS: Lesson[] = [
  {
    id: 'what-is-a-note',
    number: 1,
    title: 'What is a musical note?',
    minutes: 3,
    summary: 'Sound has height. We give those heights names.',
    pages: [
      {
        heading: 'A note is a named pitch',
        body: 'When a guitar string vibrates, it makes a pitch — how high or low the sound is. Musicians give the most useful pitches simple names: C, D, E, F, G, A, and B.',
      },
      {
        heading: 'You already hear differences',
        body: 'You do not need perfect pitch. If you can tell a low sound from a high one, you can learn note names the same way you learned spoken words: a few at a time, with lots of listening.',
      },
      {
        heading: 'We will start tiny',
        body: 'Traditional ear trainers throw all twelve notes at you. Earstep starts with two. Hear them, name them, then add one more only when the first pair feels familiar.',
      },
    ],
  },
  {
    id: 'c-vs-d',
    number: 2,
    title: 'C vs D',
    minutes: 6,
    summary: 'Your first two notes.',
    practiceNotes: ['C', 'D'],
    mode: 'note',
    pages: [
      {
        heading: 'Only two sounds',
        body: 'C is a little lower. D is one step higher. You do not need to see them on a staff. Close your eyes if it helps — this skill is sound first.',
      },
      {
        heading: 'Same letter, many places',
        body: 'A C on a guitar can be high or low. For now, ignore how high it is. If it is a C, answer C.',
      },
    ],
  },
  {
    id: 'cde',
    number: 3,
    title: 'C vs D vs E',
    minutes: 6,
    summary: 'Add the next step up.',
    practiceNotes: ['C', 'D', 'E'],
    mode: 'note',
    pages: [
      {
        heading: 'E is brighter',
        body: 'E sits above D. Together, C–D–E are the first three notes of a major scale. Hear the staircase: low, middle, high.',
      },
    ],
  },
  {
    id: 'adding-f',
    number: 4,
    title: 'Adding F',
    minutes: 6,
    summary: 'A closer neighbor.',
    practiceNotes: ['C', 'D', 'E', 'F'],
    mode: 'note',
    pages: [
      {
        heading: 'E to F is a smaller step',
        body: 'Most steps so far were a whole step. E to F is a half step — they sit closer. That is why F can feel trickier at first.',
      },
    ],
  },
  {
    id: 'adding-g',
    number: 5,
    title: 'Adding G',
    minutes: 6,
    summary: 'Home and the fifth.',
    practiceNotes: ['C', 'D', 'E', 'F', 'G'],
    mode: 'note',
    pages: [
      {
        heading: 'G feels open',
        body: 'From C to G is a perfect fifth — the same leap as the start of Twinkle Twinkle. On guitar, G is also an open string, so you will meet it often.',
      },
    ],
  },
  {
    id: 'naturals',
    number: 6,
    title: 'All natural notes',
    minutes: 8,
    summary: 'C D E F G A B.',
    practiceNotes: ['C', 'D', 'E', 'F', 'G', 'A', 'B'],
    mode: 'note',
    pages: [
      {
        heading: 'Seven names, then they repeat',
        body: 'After B comes C again, higher up. The seven natural notes are the white-key names. Sharps come later, only when these seven feel friendly.',
      },
    ],
  },
  {
    id: 'octaves',
    number: 7,
    title: 'Same note, different octave',
    minutes: 6,
    summary: 'C2, C3, C4, and C5 are all C.',
    mode: 'one-note',
    pages: [
      {
        heading: 'Pitch class vs height',
        body: 'C4 and C5 share a name (pitch class) but not a height (octave). First learn the name. Later you can learn which C you heard.',
      },
    ],
  },
  {
    id: 'guitar-notes',
    number: 8,
    title: 'Finding notes on guitar',
    minutes: 7,
    summary: 'Hear it, then put a finger on it.',
    mode: 'guitar',
    pages: [
      {
        heading: 'One sound, several frets',
        body: 'The same G can live on more than one string. That is not a trick — guitars repeat pitches. If the question is “which note?”, any G is the name. If the question is “this exact pitch”, only matching-octave frets count.',
      },
    ],
  },
  {
    id: 'higher-lower',
    number: 9,
    title: 'Higher vs lower',
    minutes: 5,
    summary: 'The first relative-pitch skill.',
    mode: 'interval',
    pages: [
      {
        heading: 'Before naming the distance',
        body: 'Play two notes. Did the second go up, down, or stay? This is the seed of figuring out songs by ear.',
      },
    ],
  },
  {
    id: 'intervals',
    number: 10,
    title: 'Intervals',
    minutes: 8,
    summary: 'How far apart are these two notes?',
    mode: 'interval',
    pages: [
      {
        heading: 'Distance has names',
        body: 'C to D is a major 2nd. C to E is a major 3rd. C to G is a perfect 5th. We add these names one pair at a time, never all at once.',
      },
    ],
  },
  {
    id: 'sargam',
    number: 11,
    title: 'Sa / Re / Ga / Ma',
    minutes: 6,
    summary: 'The same scale, Indian names.',
    practiceNotes: ['C', 'D', 'E', 'F'],
    mode: 'note',
    pages: [
      {
        heading: 'Sa is home',
        body: 'If Sa = C, then C is Sa, D is Re, E is Ga, F is Ma. If you move Sa to D, the relationships stay — the whole melody just sits in a new key.',
      },
    ],
  },
  {
    id: 'melodies',
    number: 12,
    title: 'Simple melodies',
    minutes: 8,
    summary: 'Notes in a row.',
    mode: 'melody',
    pages: [
      {
        heading: 'A melody is decisions',
        body: 'Each next note is higher, lower, or the same. Name the first note, then follow the path. That is how songs get figured out.',
      },
    ],
  },
  {
    id: 'songs',
    number: 13,
    title: 'Figuring out songs',
    minutes: 8,
    summary: 'The long-term skill.',
    mode: 'song',
    pages: [
      {
        heading: 'Song detective',
        body: 'Listen. Find the starting note. Ask whether the next note goes higher or lower. Then name the distance, then the note, then find it on guitar. Repeat. That is the whole craft.',
      },
    ],
  },
];
