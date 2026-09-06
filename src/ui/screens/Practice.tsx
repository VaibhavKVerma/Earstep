import { useEffect, useState } from 'react';
import type { InstrumentId, SoundSource } from '../../audio/AudioEngine';
import { CHROMATIC_NAMES, NATURAL_NAMES, type NoteName } from '../../music/notes';
import { adviseProgression, formatNoteSet, nextNaturalNote, noteAccuracy, rankedNotes } from '../../music/progression';
import { buildJourney, uncelebratedMasteries } from '../../training/journey';
import {
  DIFFICULTY_PRESETS,
  applyDifficulty,
  defaultConfig,
  mistakeWeights,
} from '../../training/quizEngine';
import type { Difficulty, PracticeConfig, SessionSummary } from '../../training/types';
import { markCelebrated, setActiveLevel } from '../../persistence/store';
import { BottomNav, Chip, TopBar } from '../components/widgets';
import { useProgress } from '../context/ProgressContext';
import { beginLevel } from '../journeyLaunch';
import type { Go } from '../nav';

const INSTRUMENTS: { id: InstrumentId; label: string }[] = [
  { id: 'acoustic', label: 'Acoustic guitar' },
  { id: 'electric', label: 'Electric guitar' },
  { id: 'piano', label: 'Piano' },
  { id: 'sine', label: 'Sine wave' },
];

const DIFFICULTIES: Difficulty[] = ['beginner', 'easy', 'medium', 'hard', 'expert'];

export function PracticeSetup({ go }: { go: Go }) {
  const { progress, update } = useProgress();
  const [notes, setNotes] = useState<NoteName[]>(progress.selectedNotes);
  const [octaves, setOctaves] = useState<number[]>(progress.selectedOctaves);
  const [instrument, setInstrument] = useState<InstrumentId>(progress.settings.instrument);
  const [soundSource, setSoundSource] = useState<SoundSource>(progress.settings.soundSource);
  const [count, setCount] = useState(16);
  const [difficulty, setDifficulty] = useState<Difficulty>(notes.length <= 2 ? 'beginner' : 'easy');
  const [chromatic, setChromatic] = useState(false);
  const pool = chromatic ? CHROMATIC_NAMES : NATURAL_NAMES;

  function toggleNote(name: NoteName) {
    setNotes((current) =>
      current.includes(name) ? current.filter((item) => item !== name) : [...current, name],
    );
  }

  function toggleOctave(octave: number) {
    setOctaves((current) =>
      current.includes(octave) ? current.filter((item) => item !== octave) : [...current, octave],
    );
  }

  function start(overrides: Partial<PracticeConfig> = {}) {
    const chosen = (overrides.notes ?? notes).filter(Boolean);
    const safeNotes = chosen.length >= 2 ? chosen : (['C', 'D'] as NoteName[]);
    const safeOctaves = (overrides.octaves ?? octaves).length ? (overrides.octaves ?? octaves) : [4];
    update((current) => ({
      ...setActiveLevel(current, undefined),
      selectedNotes: safeNotes,
      selectedOctaves: safeOctaves,
      settings: { ...current.settings, instrument, soundSource },
    }));
    const config = applyDifficulty({
      ...defaultConfig('note', safeNotes),
      octaves: safeOctaves,
      instrument,
      questionCount: count,
      difficulty,
      ...overrides,
      notes: overrides.notes ?? safeNotes,
    });
    go({ id: 'train', config, heading: formatNoteSet(config.notes) });
  }

  return (
    <div className="app-shell">
      <main className="screen">
        <TopBar title="Custom practice" onBack={() => go({ id: 'home' })} />
        <section className="stack">
          <h2>Notes</h2>
          <div className="chip-row">
            {pool.map((name) => (
              <Chip key={name} active={notes.includes(name)} onClick={() => toggleNote(name)}>
                {name}
              </Chip>
            ))}
          </div>
          <label className="check">
            <input type="checkbox" checked={chromatic} onChange={(e) => setChromatic(e.target.checked)} />
            Include sharps
          </label>

          <h2>Octaves</h2>
          <div className="chip-row">
            {[2, 3, 4, 5].map((octave) => (
              <Chip key={octave} active={octaves.includes(octave)} onClick={() => toggleOctave(octave)}>
                {octave === 3 ? 'Low' : octave === 4 ? 'Middle' : octave === 5 ? 'High' : 'Very low'} {octave}
              </Chip>
            ))}
          </div>

          <h2>Sound</h2>
          <div className="chip-row">
            <Chip active={soundSource === 'samples'} onClick={() => setSoundSource('samples')}>
              Recorded samples
            </Chip>
            <Chip active={soundSource === 'synth'} onClick={() => setSoundSource('synth')}>
              Synth
            </Chip>
          </div>

          <h2>Instrument</h2>
          <div className="chip-row">
            {INSTRUMENTS.map((item) => (
              <Chip key={item.id} active={instrument === item.id} onClick={() => setInstrument(item.id)}>
                {item.label}
              </Chip>
            ))}
          </div>

          <h2>Difficulty</h2>
          <div className="chip-row">
            {DIFFICULTIES.map((item) => (
              <Chip key={item} active={difficulty === item} onClick={() => setDifficulty(item)}>
                {item}
              </Chip>
            ))}
          </div>
          <p className="muted">{DIFFICULTY_PRESETS[difficulty].questionHint}</p>

          <label className="field">
            Questions
            <input
              type="range"
              min={8}
              max={30}
              value={count}
              onChange={(e) => setCount(Number(e.target.value))}
            />
            <span>{count}</span>
          </label>

          <button type="button" className="primary xl" onClick={() => start()} disabled={notes.length < 2}>
            Start practice
          </button>
        </section>
      </main>
      <BottomNav go={go} active="practice" />
    </div>
  );
}

export function SessionComplete({
  go,
  summary,
  config,
}: {
  go: Go;
  summary: SessionSummary;
  config: PracticeConfig;
}) {
  const { progress, update } = useProgress();
  const advice = adviseProgression(config.notes, summary.perNote, progress.settings.thresholds);
  const nextNote = advice.nextNote ?? nextNaturalNote(config.notes);
  const weak = rankedNotes(config.notes, summary.perNote).map((item) => ({
    ...item,
    misses: item.total - Math.round(item.accuracy * item.total),
  }));
  const [freshlyMastered] = useState(() => uncelebratedMasteries(progress));
  const celebration = freshlyMastered[0];
  const journey = buildJourney(progress);
  const unlocked = celebration
    ? journey.levels.find((item) => item.level.number === celebration.level.number + 1)
    : null;

  useEffect(() => {
    if (!freshlyMastered.length) return;
    update((current) => markCelebrated(current, freshlyMastered.map((item) => item.level.id)));
  }, [freshlyMastered, update]);

  return (
    <main className="screen">
      {celebration && (
        <section className="card journey-celebrate">
          <p className="eyebrow">Level complete</p>
          <h2>{celebration.level.title} mastered</h2>
          <p className="journey-stars" aria-label={`${celebration.stars} stars`}>
            {'★'.repeat(celebration.stars)}
            {'☆'.repeat(Math.max(0, 5 - celebration.stars))}
          </p>
          {unlocked && (
            <p>
              New level unlocked: <strong>{unlocked.level.title}</strong>
            </p>
          )}
          <button
            type="button"
            className="primary"
            onClick={() => {
              update((current) => markCelebrated(current, freshlyMastered.map((item) => item.level.id)));
              go({ id: 'journey' });
            }}
          >
            Continue journey
          </button>
        </section>
      )}
      <p className="eyebrow">Session complete</p>
      <h1>{Math.round(summary.accuracy * 100)}% accuracy</h1>
      <p className="lede">
        First listen: {Math.round(summary.firstAttemptAccuracy * 100)}% · {summary.replayCount} replays
        (replays never cost you).
      </p>
      <ul className="stat-list">
        {Object.entries(summary.perNote).map(([name, stat]) => (
          <li key={name}>
            <span>{name}</span>
            <b>{Math.round(noteAccuracy(stat) * 100)}%</b>
          </li>
        ))}
      </ul>
      {weak[0] && weak[0].accuracy < 1 && (
        <p>
          <strong>{weak[0].name}</strong> is currently your hardest note.
        </p>
      )}
      <p>{celebration ? `You've mastered ${celebration.level.title}.` : advice.message}</p>
      {!celebration && summary.accuracy < 0.85 && <p>Keep practicing. You&apos;re getting there.</p>}
      <div className="stack">
        <button type="button" className="primary" onClick={() => go({ id: 'train', config, heading: formatNoteSet(config.notes) })}>
          Practice {formatNoteSet(config.notes)} again
        </button>
        {celebration && unlocked && (
          <button
            type="button"
            className="ghost"
            onClick={() => {
              update((current) => markCelebrated(current, freshlyMastered.map((item) => item.level.id)));
              beginLevel(unlocked.level, progress, update, go);
            }}
          >
            Unlock {unlocked.level.title}
          </button>
        )}
        {nextNote && !celebration && (
          <button
            type="button"
            className="ghost"
            onClick={() => {
              const notes = [...config.notes, nextNote];
              update((current) => ({ ...current, selectedNotes: notes }));
              go({
                id: 'train',
                heading: formatNoteSet(notes),
                config: { ...config, notes, difficulty: notes.length <= 3 ? 'easy' : config.difficulty },
              });
            }}
          >
            Add {nextNote}
          </button>
        )}
        {weak.some((item) => item.misses > 0) && (
          <button
            type="button"
            className="ghost"
            onClick={() => {
              const notes = config.notes;
              go({
                id: 'train',
                heading: 'Weak notes',
                config: applyDifficulty({
                  ...config,
                  notes,
                  questionCount: 12,
                  noteWeights: mistakeWeights(notes, summary.perNote),
                }),
              });
            }}
          >
            Practice {weak[0]?.name && weak[0].accuracy < 1 ? weak[0].name : 'weak notes'}
          </button>
        )}
        <button type="button" className="text-btn" onClick={() => go({ id: 'journey' })}>
          Journey
        </button>
        <button type="button" className="text-btn" onClick={() => go({ id: 'home' })}>
          Home
        </button>
      </div>
    </main>
  );
}

export function DailyTraining({ go }: { go: Go }) {
  const { progress } = useProgress();
  const notes = progress.selectedNotes.length >= 2 ? progress.selectedNotes : (['C', 'D'] as NoteName[]);
  const extra = nextNaturalNote(notes);
  const withNext = extra ? [...notes, extra] : notes;

  return (
    <main className="screen">
      <TopBar title="Daily training" onBack={() => go({ id: 'home' })} />
      <p className="lede">Five short rounds. About ten minutes if you linger, two if you move quickly.</p>
      <ol className="daily-list">
        <li>Notes — {formatNoteSet(notes)}</li>
        <li>Add one — {formatNoteSet(withNext)}</li>
        <li>Same notes, different octaves</li>
        <li>Find them on guitar</li>
        <li>A tiny melody</li>
      </ol>
      <button
        type="button"
        className="primary xl"
        onClick={() =>
          go({
            id: 'train',
            heading: 'Daily notes',
            config: applyDifficulty({
              ...defaultConfig('note', notes),
              instrument: progress.settings.instrument,
              questionCount: 6,
            }),
          })
        }
      >
        Begin daily session
      </button>
      <div className="row wrap">
        <button type="button" className="ghost" onClick={() => go({ id: 'one-note' })}>
          Octaves
        </button>
        <button type="button" className="ghost" onClick={() => go({ id: 'guitar-find' })}>
          Guitar
        </button>
        <button type="button" className="ghost" onClick={() => go({ id: 'melody' })}>
          Melody
        </button>
      </div>
    </main>
  );
}
