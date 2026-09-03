import { noteFromName, type MusicalNote } from './notes';

export interface SongPhrase {
  id: string;
  title: string;
  origin: string;
  notes: MusicalNote[];
}

function phrase(tokens: string[]): MusicalNote[] {
  return tokens.map((token) => {
    const name = token.slice(0, -1);
    const octave = Number(token.slice(-1));
    return noteFromName(name, octave);
  });
}

export const PUBLIC_DOMAIN_SONGS: SongPhrase[] = [
  {
    id: 'twinkle',
    title: 'Twinkle Twinkle Little Star',
    origin: 'Public domain',
    notes: phrase(['C4', 'C4', 'G4', 'G4', 'A4', 'A4', 'G4']),
  },
  {
    id: 'ode',
    title: 'Ode to Joy',
    origin: 'Beethoven (public domain)',
    notes: phrase(['E4', 'E4', 'F4', 'G4', 'G4', 'F4', 'E4', 'D4']),
  },
  {
    id: 'birthday',
    title: 'Happy Birthday',
    origin: 'Public domain',
    notes: phrase(['C4', 'C4', 'D4', 'C4', 'F4', 'E4']),
  },
  {
    id: 'saregama',
    title: 'Sa Re Ga Ma',
    origin: 'Traditional exercise',
    notes: phrase(['C4', 'D4', 'E4', 'F4', 'G4', 'F4', 'E4', 'D4', 'C4']),
  },
  {
    id: 'jingle',
    title: 'Jingle Bells',
    origin: 'Public domain',
    notes: phrase(['E4', 'E4', 'E4', 'E4', 'E4', 'E4', 'E4', 'G4', 'C4', 'D4', 'E4']),
  }
];

export function melodyDirection(
  current: MusicalNote,
  next: MusicalNote,
): 'higher' | 'lower' | 'same' {
  if (next.midi > current.midi) return 'higher';
  if (next.midi < current.midi) return 'lower';
  return 'same';
}
