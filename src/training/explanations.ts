import { displayNameForNoteName, type NoteSystem } from '../music/naming';
import { formatScientific, type MusicalNote } from '../music/notes';

export function noteExplanation(
  note: MusicalNote,
  selected: string,
  correct: boolean,
  system: NoteSystem,
  tonic: number,
): { title: string; body: string } {
  const heard = displayNameForNoteName(note.name, system, tonic);
  const scientific = formatScientific(note);

  if (correct) {
    return {
      title: `Correct — that's ${heard}.`,
      body: `${scientific} is still the note ${heard}. The same note can appear in several octaves. Don't worry about the number yet — first learn the sound of ${heard} itself.`,
    };
  }

  const chosen = displayNameForNoteName(selected, system, tonic);
  return {
    title: `Not quite. You chose ${chosen}.`,
    body: `The note was ${heard} (${scientific}). Don't worry about the octave yet. Listen again and notice how ${heard} feels different from ${chosen}.`,
  };
}

export function octaveExplanation(note: MusicalNote, correct: boolean): { title: string; body: string } {
  const band = note.octave <= 3 ? 'low' : note.octave >= 5 ? 'high' : 'middle';
  if (correct) {
    return {
      title: `Yes — ${band} ${note.name}.`,
      body: `${formatScientific(note)} is a ${band} version of ${note.name}. Same note name, different height.`,
    };
  }
  return {
    title: 'Different height, same letter.',
    body: `That was ${formatScientific(note)} — a ${band} ${note.name}. Low sounds thicker, high sounds thinner, but both are still ${note.name}.`,
  };
}

export function guitarExplanation(note: MusicalNote, correct: boolean, clickedName?: string): { title: string; body: string } {
  if (correct) {
    return {
      title: `You found ${note.name}.`,
      body: `${formatScientific(note)} lives in more than one place on the guitar. Those spots are the same pitch class — some may even be the exact same pitch.`,
    };
  }
  return {
    title: clickedName ? `That's ${clickedName}.` : 'Not that fret.',
    body: `Listen again, then look for ${note.name}. Neighboring frets are only a half step apart, so nearby notes can sound similar at first.`,
  };
}
