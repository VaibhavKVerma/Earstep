import { useState } from 'react';
import { audioEngine } from '../../audio/AudioEngine';
import { noteFromName, type NoteName } from '../../music/notes';
import { pick } from '../../training/quizEngine';
import { useProgress } from '../context/ProgressContext';

export function HearNow() {
  const { progress } = useProgress();
  const [playing, setPlaying] = useState(false);

  async function play() {
    if (playing) {
      audioEngine.stop();
      setPlaying(false);
      return;
    }
    const names = progress.selectedNotes.length ? progress.selectedNotes : (['C'] as NoteName[]);
    const note = noteFromName(pick(names), 4);
    setPlaying(true);
    try {
      await audioEngine.playFrequency(note.frequency, {
        instrument: progress.settings.instrument,
        awaitEnd: true,
      });
    } finally {
      setPlaying(false);
    }
  }

  return (
    <button
      type="button"
      className={`hear-now ${playing ? 'playing' : ''}`}
      onClick={() => void play()}
    >
      <span className="hear-now-disc" aria-hidden="true">
        <span className="hear-now-ring" />
        <span className="hear-now-note">♪</span>
      </span>
      <span className="hear-now-copy">
        <strong>{playing ? 'Playing… tap to stop' : 'Tap to hear a note'}</strong>
        <em>Then name it in practice or Journey.</em>
      </span>
    </button>
  );
}
