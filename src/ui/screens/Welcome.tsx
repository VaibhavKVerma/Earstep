import { formatNoteSet } from '../../music/progression';
import { NATURAL_NAMES, type NoteName } from '../../music/notes';
import { applyDifficulty, defaultConfig } from '../../training/quizEngine';
import { HearNow } from '../components/HearNow';
import { Chip } from '../components/widgets';
import type { Go } from '../nav';
import { useProgress } from '../context/ProgressContext';

export function Welcome({ go }: { go: Go }) {
  return (
    <main className="screen welcome">
      <div className="hero-mark" aria-hidden="true">
        <span />
        <span />
        <span />
      </div>
      <div className="wood-rule" aria-hidden="true" />
      <p className="eyebrow">Free guitar ear training</p>
      <h1>Hear a note. Name it.</h1>
      <p className="lede">
        Learn notes by ear, starting with C vs D. Built for beginners who want to learn guitar
        and figure out songs without dumping all twelve notes on day one.
      </p>
      <HearNow />
      <button type="button" className="primary xl" onClick={() => go({ id: 'onboarding' })}>
        Start ear training
      </button>
      <p className="fine">No account needed. Progress stays on this device.</p>
      <article className="seo-guide">
        <h2>Ear training, one pair at a time</h2>
        <p>
          Earstep is music learning through listening: we play a note, you name it, then you can
          find it on guitar. That is guitar ear training and note training in the same place.
        </p>
        <p>
          <a href="/ear-training.html">What is ear training?</a>
          {' · '}
          <a href="/guitar-ear-training.html">Learn guitar by ear</a>
          {' · '}
          <a href="/learn-notes.html">Learn musical notes</a>
        </p>
      </article>
    </main>
  );
}

export function Onboarding({ go }: { go: Go }) {
  const { progress, update } = useProgress();
  const selected = progress.selectedNotes;

  function toggle(name: NoteName) {
    update((current) => {
      const has = current.selectedNotes.includes(name);
      const next = has
        ? current.selectedNotes.filter((item) => item !== name)
        : [...current.selectedNotes, name];
      return { ...current, selectedNotes: next.length ? next : ['C'] };
    });
  }

  function begin() {
    const notes = selected.length >= 2 ? selected : (['C', 'D'] as NoteName[]);
    update((current) => ({ ...current, onboarded: true, selectedNotes: notes }));
    go({
      id: 'train',
      heading: formatNoteSet(notes),
      config: applyDifficulty({
        ...defaultConfig('note', notes),
        instrument: progress.settings.instrument,
      }),
    });
  }

  return (
    <main className="screen">
      <div className="wood-rule" aria-hidden="true" />
      <p className="eyebrow">Step 1</p>
      <h1>Choose your first notes.</h1>
      <p className="lede">Two is enough. You can change this any time.</p>
      <div className="chip-row">
        {NATURAL_NAMES.map((name) => (
          <Chip key={name} active={selected.includes(name)} onClick={() => toggle(name)}>
            {name}
          </Chip>
        ))}
      </div>
      <button type="button" className="primary xl" onClick={begin} disabled={selected.length < 2}>
        Start {formatNoteSet(selected.length >= 2 ? selected : ['C', 'D'])}
      </button>
    </main>
  );
}
