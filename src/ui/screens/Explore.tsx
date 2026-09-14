import { useMemo, useState } from 'react';
import { audioEngine } from '../../audio/AudioEngine';
import { INTERVALS, INTERVAL_LEVELS, INTERVAL_REFERENCES, intervalFromSemitones, type IntervalId } from '../../music/intervals';
import { isCorrectFret, noteAtFret } from '../../music/guitar';
import { displayNameForNoteName } from '../../music/naming';
import {
  CHROMATIC_NAMES,
  formatScientific,
  humanOctaveName,
  NATURAL_NAMES,
  noteFromName,
  octaveLabel,
  type NoteName,
} from '../../music/notes';
import {
  buildPhraseChoices,
  formatPhraseLabel,
  generateMusicalPhrase,
} from '../../music/phrases';
import { PUBLIC_DOMAIN_SONGS, melodyDirection } from '../../music/songs';
import { completeSession, grantAchievement, recordAnswer, recordJourneyHit, summarizeSession } from '../../persistence/store';
import { guitarExplanation, octaveExplanation } from '../../training/explanations';
import {
  generateIntervalQuestion,
  generateOctaveQuestions,
  pick,
  validateOctaveAnswer,
  validatePitchClassAnswer,
} from '../../training/quizEngine';
import type { AnswerRecord } from '../../training/types';
import { Fretboard } from '../components/Fretboard';
import { Chip, NoteChoices, PlayButton, TopBar } from '../components/widgets';
import { useProgress } from '../context/ProgressContext';
import type { Go } from '../nav';

const MELODY_FALLBACK_NOTES: NoteName[] = ['C', 'D'];
const MELODY_MIX_OCTAVES = [3, 4, 5];
const MELODY_PINNED_OCTAVE = [4];
const SONG_PITCHES = [
  { id: 'low' as const, octave: 3, title: 'Low' },
  { id: 'middle' as const, octave: 4, title: 'Middle' },
  { id: 'high' as const, octave: 5, title: 'High' },
];

export function OneNoteMany({ go }: { go: Go }) {
  const { progress } = useProgress();
  const [step, setStep] = useState(0);
  const name = (progress.selectedNotes[0] ?? 'C') as NoteName;
  const demos = [2, 3, 4, 5].map((octave) => noteFromName(name, octave));
  const options = progress.selectedNotes.length >= 2 ? progress.selectedNotes : (['C', 'D', 'E'] as NoteName[]);

  return (
    <main className="screen">
      <TopBar title="One note, many pitches" onBack={() => go(progress.journey?.activeLevelId ? { id: 'journey' } : { id: 'home' })} />
      {step === 0 && (
        <>
          <p className="lede">
            These are all {displayNameForNoteName(name, progress.settings.noteSystem, progress.settings.tonicPitchClass)}.
            The height changes. The name does not.
          </p>
          <div className="stack">
            {demos.map((note) => (
              <button
                key={note.midi}
                type="button"
                className="ghost"
                onClick={() => void audioEngine.playFrequency(note.frequency, { instrument: progress.settings.instrument })}
              >
                Play {formatScientific(note)}
              </button>
            ))}
            <button type="button" className="primary" onClick={() => setStep(1)}>
              Quiz me
            </button>
          </div>
        </>
      )}
      {step === 1 && (
        <OctaveNameQuiz go={go} name={name} options={options} instrument={progress.settings.instrument} />
      )}
    </main>
  );
}

function OctaveNameQuiz({
  go,
  name,
  options,
  instrument,
}: {
  go: Go;
  name: NoteName;
  options: NoteName[];
  instrument: 'acoustic' | 'electric' | 'piano' | 'sine';
}) {
  const { progress, update } = useProgress();
  const [question] = useState(() => generateOctaveQuestions(name, [2, 3, 4, 5], 1)[0]);
  const note = question.note;
  const [phase, setPhase] = useState<'listen' | 'done'>('listen');
  const [selected, setSelected] = useState<string | null>(null);

  function choose(choice: NoteName) {
    const correct = validatePitchClassAnswer(name, choice);
    setSelected(choice);
    setPhase('done');
    const record: AnswerRecord = {
      questionId: `one-${note.midi}`,
      expected: name,
      expectedMidi: note.midi,
      selected: choice,
      correct,
      firstAttempt: true,
      replayCount: 0,
      mode: 'one-note',
    };
    update((current) => recordAnswer(current, record));
  }

  return (
    <>
      <PlayButton
        playing={false}
        replayed
        onClick={() => void audioEngine.playFrequency(note.frequency, { instrument })}
        label="Play mystery pitch"
      />
      <p className="question">Which note is this?</p>
      <NoteChoices
        options={options}
        system={progress.settings.noteSystem}
        tonic={progress.settings.tonicPitchClass}
        disabled={phase === 'done'}
        onChoose={choose}
        reveal={selected ? { selected, expected: name } : undefined}
      />
      {phase === 'done' && (
        <section className="feedback ok">
          <p>{octaveExplanation(note, selected === name).body}</p>
          <button type="button" className="primary" onClick={() => go({ id: 'octave' })}>
            Try low / middle / high
          </button>
        </section>
      )}
    </>
  );
}

export function OctaveTraining({ go }: { go: Go }) {
  const { progress, update } = useProgress();
  const name = (progress.selectedNotes[0] ?? 'C') as NoteName;
  const choices = [3, 4, 5];
  const [queue, setQueue] = useState(() => generateOctaveQuestions(name, choices, 6));
  const [index, setIndex] = useState(0);
  const target = queue[index].note;
  const [picked, setPicked] = useState<number | null>(null);

  function choose(octave: number) {
    const selected = noteFromName(name, octave);
    const correct = validateOctaveAnswer(target.midi, selected.midi);
    setPicked(octave);
    update((current) => {
      const next = recordJourneyHit(current, correct);
      return {
        ...next,
        octaveStats: {
          correct: next.octaveStats.correct + (correct ? 1 : 0),
          incorrect: next.octaveStats.incorrect + (correct ? 0 : 1),
        },
        xp: next.xp + (correct ? 10 : 2),
      };
    });
  }

  return (
    <main className="screen">
      <TopBar title="Low / Middle / High" onBack={() => go(progress.journey?.activeLevelId ? { id: 'journey' } : { id: 'home' })} />
      <p className="lede">
        Which {displayNameForNoteName(name, progress.settings.noteSystem, progress.settings.tonicPitchClass)} did you
        hear? Numbers like C3 can wait.
      </p>
      <PlayButton
        playing={false}
        replayed
        onClick={() => void audioEngine.playFrequency(target.frequency, { instrument: progress.settings.instrument })}
      />
      <div className="choice-grid">
        {choices.map((octave) => (
          <button
            key={octave}
            type="button"
            className={`choice ${picked === octave ? (octave === target.octave ? 'correct' : 'wrong') : ''} ${picked !== null && octave === target.octave ? 'correct' : ''}`}
            disabled={picked !== null}
            onClick={() => choose(octave)}
          >
            {humanOctaveName(noteFromName(name, octave))}
            {progress.settings.showScientific && <small>{name}{octave}</small>}
          </button>
        ))}
      </div>
      {picked !== null && (
        <section className={`feedback ${picked === target.octave ? 'ok' : 'bad'}`}>
          <p>{octaveExplanation(target, picked === target.octave).body}</p>
          <button
            type="button"
            className="primary"
            onClick={() => {
              setPicked(null);
              if (index + 1 >= queue.length) {
                setQueue(generateOctaveQuestions(name, choices, 6));
                setIndex(0);
              } else {
                setIndex((n) => n + 1);
              }
            }}
          >
            Another
          </button>
        </section>
      )}
    </main>
  );
}

export function GuitarFind({ go }: { go: Go }) {
  const { progress, update } = useProgress();
  const names = progress.selectedNotes.length ? progress.selectedNotes : (['C', 'D'] as NoteName[]);
  const octaves = progress.selectedOctaves.length ? progress.selectedOctaves : [3, 4];
  const [target, setTarget] = useState(() => noteFromName(pick(names), pick(octaves)));
  const [picked, setPicked] = useState<{ stringIndex: number; fret: number; name: string } | null>(null);
  const [exact, setExact] = useState(true);

  function select(stringIndex: number, fret: number) {
    const note = noteAtFret(stringIndex, fret);
    const correct = isCorrectFret(
      exact ? { pitchClass: target.pitchClass, midi: target.midi } : { pitchClass: target.pitchClass },
      stringIndex,
      fret,
    );
    setPicked({ stringIndex, fret, name: note.name });
    const record: AnswerRecord = {
      questionId: `gtr-${target.midi}`,
      expected: target.name,
      expectedMidi: target.midi,
      selected: `${note.name}${note.octave}`,
      correct,
      firstAttempt: true,
      replayCount: 0,
      mode: 'guitar',
    };
    update((current) => grantAchievement(recordAnswer(current, record), 'guitar_finder'));
  }

  const expl = guitarExplanation(
    target,
    Boolean(
      picked &&
        isCorrectFret(
          exact ? { pitchClass: target.pitchClass, midi: target.midi } : { pitchClass: target.pitchClass },
          picked.stringIndex,
          picked.fret,
        ),
    ),
    picked?.name,
  );

  return (
    <main className="screen">
      <TopBar title="Find it on guitar" onBack={() => go(progress.journey?.activeLevelId ? { id: 'journey' } : { id: 'home' })} />
      <p className="lede">Listen, then tap a fret. Several places can be right.</p>
      <PlayButton
        playing={false}
        replayed
        onClick={() => void audioEngine.playFrequency(target.frequency, { instrument: progress.settings.instrument })}
      />
      <label className="check">
        <input type="checkbox" checked={exact} onChange={(e) => setExact(e.target.checked)} />
        Match this exact pitch, not just the letter
      </label>
      <Fretboard
        target={target}
        highlight={picked ? (exact ? 'octave' : 'pitch-class') : 'none'}
        showNames={Boolean(picked)}
        onSelect={select}
        selected={picked}
        noteSystem={progress.settings.noteSystem}
        tonic={progress.settings.tonicPitchClass}
      />
      {picked && (
        <section className={`feedback ${expl.title.startsWith('You found') ? 'ok' : 'bad'}`}>
          <h2>{expl.title}</h2>
          <p>{expl.body}</p>
          <button
            type="button"
            className="primary"
            onClick={() => {
              setPicked(null);
              setTarget(noteFromName(pick(names), pick(octaves)));
            }}
          >
            Next note
          </button>
        </section>
      )}
    </main>
  );
}

export function IntervalTraining({ go }: { go: Go }) {
  const { progress, update } = useProgress();
  const [level, setLevel] = useState(1);
  const [round, setRound] = useState(0);
  const allowed = INTERVAL_LEVELS[Math.min(level, INTERVAL_LEVELS.length - 1)];
  const question = useMemo(
    () => generateIntervalQuestion(allowed, progress.selectedNotes, progress.selectedOctaves),
    [allowed, progress.selectedNotes, progress.selectedOctaves, round],
  );
  const [picked, setPicked] = useState<IntervalId | null>(null);
  const [playing, setPlaying] = useState(false);
  const expected = intervalFromSemitones(question.compareNote!.midi - question.note.midi);

  async function playPair() {
    setPlaying(true);
    audioEngine.stop();
    try {
      await audioEngine.playFrequency(question.note.frequency, {
        instrument: progress.settings.instrument,
        duration: 0.7,
        awaitEnd: true,
      });
      await new Promise((resolve) => window.setTimeout(resolve, 220));
      await audioEngine.playFrequency(question.compareNote!.frequency, {
        instrument: progress.settings.instrument,
        duration: 0.95,
        awaitEnd: true,
      });
    } finally {
      setPlaying(false);
    }
  }

  function choose(id: IntervalId) {
    setPicked(id);
    const correct = id === expected.id;
    update((current) => {
      const next = recordJourneyHit(current, correct);
      return { ...next, xp: next.xp + (correct ? 10 : 2) };
    });
  }

  return (
    <main className="screen">
      <TopBar title="Intervals" onBack={() => go(progress.journey?.activeLevelId ? { id: 'journey' } : { id: 'home' })} />
      <p className="lede">
        Level {level}: you will hear the first note, then the second. Name the distance between them.
      </p>
      <div className="chip-row">
        {INTERVAL_LEVELS.map((_, i) => (
          <button key={i} type="button" className={`chip ${level === i ? 'active' : ''}`} onClick={() => { setLevel(i); setPicked(null); }}>
            {i === 0 ? 'Same?' : `Lv ${i}`}
          </button>
        ))}
      </div>
      <PlayButton
        playing={playing}
        replayed
        onClick={() => void playPair()}
        label="Play one, then the other"
      />
      <div className="choice-grid">
        {allowed.map((id) => {
          const meta = INTERVALS.find((item) => item.id === id);
          const label = meta?.name ?? id;
          return (
            <button
              key={id}
              type="button"
              className={`choice ${picked === id ? (id === expected.id ? 'correct' : 'wrong') : ''} ${picked && id === expected.id ? 'correct' : ''}`}
              disabled={Boolean(picked)}
              onClick={() => choose(id)}
            >
              {label}
            </button>
          );
        })}
      </div>
      {picked && (
        <section className={`feedback ${picked === expected.id ? 'ok' : 'bad'}`}>
          <h2>{expected.name}</h2>
          <p>{INTERVAL_REFERENCES[expected.id] ?? 'Listen for the distance, not the starting note.'}</p>
          <button
            type="button"
            className="primary"
            onClick={() => {
              setPicked(null);
              setRound((n) => n + 1);
            }}
          >
            Next pair
          </button>
        </section>
      )}
    </main>
  );
}

export function MelodyTraining({ go }: { go: Go }) {
  const { progress, update } = useProgress();
  const [round, setRound] = useState(0);
  const [mode, setMode] = useState<'first' | 'direction' | 'sequence'>('sequence');
  const [picked, setPicked] = useState<string | null>(null);
  const [ok, setOk] = useState<boolean | null>(null);
  const [named, setNamed] = useState<NoteName | null>(null);
  const [chromatic, setChromatic] = useState(
    () => progress.selectedNotes.some((name) => !(NATURAL_NAMES as readonly string[]).includes(name)),
  );
  const system = progress.settings.noteSystem;
  const tonic = progress.settings.tonicPitchClass;
  const mix = progress.settings.mixOctaves;
  const pool = chromatic ? CHROMATIC_NAMES : NATURAL_NAMES;
  const scaleNotes = progress.selectedNotes.length >= 2 ? progress.selectedNotes : MELODY_FALLBACK_NOTES;
  const octaves = mix
    ? progress.selectedOctaves.length
      ? progress.selectedOctaves
      : MELODY_MIX_OCTAVES
    : MELODY_PINNED_OCTAVE;
  const askPitch = mix && octaves.length > 1;

  const phrase = useMemo(
    () => generateMusicalPhrase({ notes: scaleNotes, octaves, mixOctaves: mix }),
    [round, scaleNotes, octaves, mix],
  );
  const choices = useMemo(
    () => buildPhraseChoices(phrase, scaleNotes, Math.random, askPitch ? octaves : []),
    [phrase, scaleNotes, askPitch, octaves],
  );
  const heard = phrase.notes;
  const first = heard[0] ?? noteFromName('C', 4);
  const direction = heard.length >= 2 ? melodyDirection(heard[0], heard[1]) : 'same';
  const display = (name: NoteName) => displayNameForNoteName(name, system, tonic);
  const phraseLabel = formatPhraseLabel(heard, display, askPitch);
  const guessedLabel = named ? display(named) : '';
  const answered = ok !== null;

  function resetAnswer() {
    setPicked(null);
    setOk(null);
    setNamed(null);
  }

  function toggleNote(name: NoteName) {
    update((current) => {
      const has = current.selectedNotes.includes(name);
      const next = has ? current.selectedNotes.filter((item) => item !== name) : [...current.selectedNotes, name];
      return { ...current, selectedNotes: next.length >= 2 ? next : current.selectedNotes };
    });
    resetAnswer();
  }

  function toggleOctave(octave: number) {
    update((current) => {
      const has = current.selectedOctaves.includes(octave);
      const next = has ? current.selectedOctaves.filter((item) => item !== octave) : [...current.selectedOctaves, octave];
      return { ...current, selectedOctaves: next.length ? next : current.selectedOctaves };
    });
    resetAnswer();
  }

  function setMix(on: boolean) {
    update((current) => ({
      ...current,
      settings: { ...current.settings, mixOctaves: on },
    }));
    resetAnswer();
  }

  async function play() {
    await audioEngine.playSequence(
      heard.map((note) => note.frequency),
      { instrument: progress.settings.instrument, duration: 0.45, gap: 0.1 },
    );
  }

  function finish(correct: boolean, selected: string) {
    if (answered) return;
    setOk(correct);
    setPicked(selected);
    const summary = summarizeSession(
      [
        {
          questionId: phrase.id,
          expected: first.name,
          expectedMidi: first.midi,
          selected,
          correct,
          firstAttempt: true,
          replayCount: 0,
          mode: 'melody',
        },
      ],
      scaleNotes,
      'melody',
      progress.journey?.activeLevelId,
    );
    update((current) => completeSession(current, summary));
  }

  function nextPhrase() {
    resetAnswer();
    setRound((n) => n + 1);
  }

  function switchMode(next: typeof mode) {
    setMode(next);
    resetAnswer();
  }

  return (
    <main className="screen">
      <TopBar title="Melody" onBack={() => go(progress.journey?.activeLevelId ? { id: 'journey' } : { id: 'home' })} />
      <p className="lede">
        Real song shapes — steps, turns, repeats, and little leaps. Choose the notes. Pitch is optional, like note recognition.
      </p>

      <section className="stack">
        <h2>Notes</h2>
        <div className="chip-row">
          {pool.map((name) => (
            <Chip key={name} active={scaleNotes.includes(name)} onClick={() => toggleNote(name)}>
              {display(name)}
            </Chip>
          ))}
        </div>
        <label className="check">
          <input type="checkbox" checked={chromatic} onChange={(e) => setChromatic(e.target.checked)} />
          Include sharps
        </label>

        <h2>Pitch height</h2>
        <label className="check">
          <input type="checkbox" checked={mix} onChange={(e) => setMix(e.target.checked)} />
          Mix high and low pitches
        </label>
        <p className="muted">
          {mix
            ? 'The same letter can be low or high. Answers include pitch.'
            : 'Every note stays the same height. You only name the letter.'}
        </p>
        {mix && (
          <div className="chip-row">
            {[2, 3, 4, 5].map((octave) => (
              <Chip key={octave} active={octaves.includes(octave)} onClick={() => toggleOctave(octave)}>
                {octave === 3 ? 'Low' : octave === 4 ? 'Middle' : octave === 5 ? 'High' : 'Very low'} {octave}
              </Chip>
            ))}
          </div>
        )}
      </section>

      <div className="chip-row">
        <button type="button" className={`chip ${mode === 'first' ? 'active' : ''}`} onClick={() => switchMode('first')}>
          First note
        </button>
        <button type="button" className={`chip ${mode === 'direction' ? 'active' : ''}`} onClick={() => switchMode('direction')}>
          Higher / lower
        </button>
        <button type="button" className={`chip ${mode === 'sequence' ? 'active' : ''}`} onClick={() => switchMode('sequence')}>
          Sequence
        </button>
      </div>
      <PlayButton playing={false} replayed onClick={() => void play()} label="Play phrase" />
      {mode === 'first' && (
        <>
          <p className="question">
            {askPitch && named
              ? `You chose ${guessedLabel}. What pitch did you hear?`
              : 'What is the first note?'}
          </p>
          {(!askPitch || !named || answered) && (
            <NoteChoices
              options={scaleNotes}
              system={system}
              tonic={tonic}
              disabled={answered || (askPitch && Boolean(named))}
              reveal={answered ? { selected: named ?? picked ?? undefined, expected: first.name } : undefined}
              onChoose={(name) => {
                if (askPitch) setNamed(name);
                else finish(name === first.name, name);
              }}
            />
          )}
          {askPitch && named && (
            <div className="choice-grid" role="group" aria-label="Pitch">
              { [...octaves].sort((a, b) => a - b).map((octave, index) => {
                const state = answered
                  ? octave === first.octave
                    ? 'correct'
                    : picked === String(octave)
                      ? 'wrong'
                      : ''
                  : '';
                return (
                  <button
                    key={octave}
                    type="button"
                    className={`choice ${state}`}
                    disabled={answered}
                    onClick={() => finish(named === first.name && octave === first.octave, String(octave))}
                  >
                    <span className="choice-key">{index + 1}</span>
                    {humanOctaveName(noteFromName(named, octave))}
                    <small>
                      {guessedLabel}
                      {octave}
                    </small>
                  </button>
                );
              })}
            </div>
          )}
          {askPitch && named && !answered && (
            <button type="button" className="ghost" onClick={() => setNamed(null)}>
              Change note
            </button>
          )}
        </>
      )}
      {mode === 'direction' && (
        <div className="choice-grid">
          {(['higher', 'lower', 'same'] as const).map((dir) => (
            <button
              key={dir}
              type="button"
              className={`choice ${picked === dir ? (dir === direction ? 'correct' : 'wrong') : ''} ${answered && dir === direction ? 'correct' : ''}`}
              disabled={answered}
              onClick={() => finish(dir === direction, dir)}
            >
              {dir}
            </button>
          ))}
        </div>
      )}
      {mode === 'sequence' && (
        <div className="stack" role="group" aria-label="Phrase choices">
          {choices.map((choice) => {
            const label = formatPhraseLabel(choice.notes, display, askPitch);
            const state = answered
              ? choice.correct
                ? 'correct'
                : picked === choice.key
                  ? 'wrong'
                  : ''
              : '';
            const sameHeight = choice.notes.every((note) => note.octave === choice.notes[0]?.octave);
            const band = octaveLabel(choice.notes[0]?.octave ?? 4);
            const bandTitle = band === 'low' ? 'Low' : band === 'high' ? 'High' : 'Middle';
            return (
              <button
                key={choice.key}
                type="button"
                className={`choice ${state}`}
                disabled={answered}
                onClick={() => finish(choice.correct, choice.key)}
              >
                {label}
                {askPitch && sameHeight && <small>{bandTitle}</small>}
              </button>
            );
          })}
        </div>
      )}
      {answered && (
        <section className={`feedback ${ok ? 'ok' : 'bad'}`}>
          <p className="feedback-kicker">{ok ? 'Yes — that shape is in real music.' : 'Not quite. Hear it once more.'}</p>
          <h2>{phrase.name}</h2>
          <p>
            {phrase.hint} The phrase was {phraseLabel}
            {askPitch && heard.every((note) => note.octave === first.octave)
              ? ` · ${humanOctaveName(first).split(' ')[0]}`
              : ''}
            .
          </p>
          <div className="row">
            <button type="button" className="primary" onClick={nextPhrase}>
              Next phrase
            </button>
            <button type="button" className="ghost" onClick={() => go({ id: 'song' })}>
              Try a song
            </button>
          </div>
        </section>
      )}
      {!answered && (
        <button type="button" className="ghost" onClick={nextPhrase}>
          New phrase
        </button>
      )}
    </main>
  );
}

export function SongMode({ go }: { go: Go }) {
  const { progress, update } = useProgress();
  const [songId, setSongId] = useState(PUBLIC_DOMAIN_SONGS[0].id);
  const song = PUBLIC_DOMAIN_SONGS.find((item) => item.id === songId) ?? PUBLIC_DOMAIN_SONGS[0];
  const [noteIndex, setNoteIndex] = useState(0);
  const [step, setStep] = useState<'name' | 'pitch'>('name');
  const [selectedName, setSelectedName] = useState<NoteName | null>(null);
  const [selectedPitch, setSelectedPitch] = useState<'low' | 'middle' | 'high' | null>(null);
  const [complete, setComplete] = useState(false);
  const current = song.notes[noteIndex];
  const total = song.notes.length;
  const system = progress.settings.noteSystem;
  const tonic = progress.settings.tonicPitchClass;
  const currentLabel = displayNameForNoteName(current.name, system, tonic);
  const guessedLabel = selectedName ? displayNameForNoteName(selectedName, system, tonic) : '';
  const expectedPitch = octaveLabel(current.octave);
  const revealed = selectedPitch !== null;
  const bothCorrect = selectedName === current.name && selectedPitch === expectedPitch;

  async function play(through = noteIndex) {
    await audioEngine.playSequence(
      song.notes.slice(0, Math.max(1, through + 1)).map((note) => note.frequency),
      { instrument: progress.settings.instrument, duration: 0.42, gap: 0.1 },
    );
  }

  function resetAnswers() {
    setStep('name');
    setSelectedName(null);
    setSelectedPitch(null);
  }

  function resetSong(id = songId) {
    setSongId(id);
    setNoteIndex(0);
    setComplete(false);
    resetAnswers();
  }

  function next() {
    if (noteIndex + 1 >= total) {
      const summary = summarizeSession(
        [
          {
            questionId: song.id,
            expected: current.name,
            expectedMidi: current.midi,
            selected: selectedName ?? current.name,
            correct: bothCorrect,
            firstAttempt: bothCorrect,
            replayCount: 0,
            mode: 'song',
          },
        ],
        [current.name],
        'song',
      );
      update((currentProgress) => completeSession(currentProgress, summary));
      setComplete(true);
      return;
    }
    setNoteIndex((n) => n + 1);
    resetAnswers();
  }

  return (
    <main className="screen">
      <TopBar title="Learn from songs" onBack={() => go(progress.journey?.activeLevelId ? { id: 'journey' } : { id: 'home' })} />
      <div className="chip-row">
        {PUBLIC_DOMAIN_SONGS.map((item) => (
          <button
            key={item.id}
            type="button"
            className={`chip ${songId === item.id ? 'active' : ''}`}
            onClick={() => resetSong(item.id)}
          >
            {item.title}
          </button>
        ))}
      </div>
      <p className="muted">
        {song.origin} · Note {Math.min(noteIndex + 1, total)} of {total}
      </p>

      {!complete && (
        <>
          <p className="lede">First name the note. Then choose how high it is.</p>
          <PlayButton
            playing={false}
            replayed
            onClick={() => void play(noteIndex === 0 && step === 'name' ? total - 1 : noteIndex)}
            label={noteIndex === 0 ? 'Listen to the phrase' : 'Play up to this note'}
          />
        </>
      )}

      {!complete && step === 'name' && (
        <>
          <p className="question">
            {noteIndex === 0 ? 'What is the first note?' : `What is note ${noteIndex + 1}?`}
          </p>
          <NoteChoices
            options={[...NATURAL_NAMES]}
            system={system}
            tonic={tonic}
            onChoose={(name) => {
              setSelectedName(name);
              setStep('pitch');
            }}
          />
        </>
      )}

      {!complete && step === 'pitch' && selectedName && (
        <>
          <p className="question">
            You chose {guessedLabel}. What pitch did you hear?
          </p>
          <div className="choice-grid" role="group" aria-label="Pitch">
            {SONG_PITCHES.map((pitch, index) => {
              const state = !revealed
                ? ''
                : pitch.id === expectedPitch
                  ? 'correct'
                  : pitch.id === selectedPitch
                    ? 'wrong'
                    : '';
              return (
                <button
                  key={pitch.id}
                  type="button"
                  className={`choice ${state}`}
                  disabled={revealed}
                  onClick={() => setSelectedPitch(pitch.id)}
                >
                  <span className="choice-key">{index + 1}</span>
                  {pitch.title} {guessedLabel}
                  <small>
                    {guessedLabel}
                    {pitch.octave}
                  </small>
                </button>
              );
            })}
          </div>
          {!revealed && (
            <button type="button" className="ghost" onClick={resetAnswers}>
              Change note
            </button>
          )}
        </>
      )}

      {revealed && !complete && (
        <section className={`feedback ${bothCorrect ? 'ok' : 'bad'}`}>
          <p className="feedback-kicker">{bothCorrect ? 'Correct!' : 'Not quite.'}</p>
          <h2>
            You heard {currentLabel}
            {current.octave} · {humanOctaveName(current)}
          </h2>
          <p>
            Note: {selectedName === current.name ? `${currentLabel} is right.` : `You picked ${guessedLabel}; it is ${currentLabel}.`}{' '}
            Pitch: {selectedPitch === expectedPitch ? `${SONG_PITCHES.find((p) => p.id === expectedPitch)?.title} is right.` : `It is ${SONG_PITCHES.find((p) => p.id === expectedPitch)?.title}.`}
          </p>
          <button type="button" className="primary" onClick={next}>
            {noteIndex + 1 >= total ? 'See the full phrase' : 'Next note'}
          </button>
        </section>
      )}

      {complete && (
        <section className="feedback ok">
          <h2>You figured out the phrase.</h2>
          <p>{song.notes.map((note) => formatScientific(note)).join(' → ')}</p>
          <div className="row wrap">
            <button type="button" className="primary" onClick={() => resetSong()}>
              Practice this phrase again
            </button>
            <button type="button" className="ghost" onClick={() => go({ id: 'home' })}>
              Home
            </button>
          </div>
        </section>
      )}
    </main>
  );
}

export function HearSingFind({ go }: { go: Go }) {
  const { progress, update } = useProgress();
  const names = progress.selectedNotes.length ? progress.selectedNotes : (['C', 'D'] as NoteName[]);
  const [target] = useState(() => noteFromName(pick(names), 4));
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [found, setFound] = useState(false);

  return (
    <main className="screen">
      <TopBar title="Hear → Sing → Find" onBack={() => go(progress.journey?.activeLevelId ? { id: 'journey' } : { id: 'home' })} />
      {step === 1 && (
        <>
          <p className="lede">Step 1 — just listen.</p>
          <PlayButton
            playing={false}
            replayed
            onClick={() => void audioEngine.playFrequency(target.frequency, { instrument: progress.settings.instrument })}
          />
          <button type="button" className="primary" onClick={() => setStep(2)}>
            I heard it
          </button>
        </>
      )}
      {step === 2 && (
        <>
          <p className="lede">Step 2 — hum or play the note. This step is for your ear, not a score.</p>
          <button type="button" className="ghost" onClick={() => void audioEngine.playFrequency(target.frequency, { instrument: progress.settings.instrument })}>
            Hear it again
          </button>
          <button type="button" className="primary" onClick={() => setStep(3)}>
            I hummed it
          </button>
        </>
      )}
      {step === 3 && (
        <>
          <p className="lede">Step 3 — find it on guitar.</p>
          <Fretboard
            target={target}
            highlight={found ? 'octave' : 'none'}
            showNames={found}
            onSelect={(_s, _f, note) => {
              if (note.pitchClass === target.pitchClass) {
                setFound(true);
                update((current) =>
                  recordAnswer(current, {
                    questionId: `hsf-${target.midi}`,
                    expected: target.name,
                    expectedMidi: target.midi,
                    selected: note.name,
                    correct: true,
                    firstAttempt: true,
                    replayCount: 0,
                    mode: 'hear-sing-find',
                  }),
                );
              }
            }}
            noteSystem={progress.settings.noteSystem}
            tonic={progress.settings.tonicPitchClass}
          />
          {found && (
            <section className="feedback ok">
              <p>Sound → voice → guitar. That is the path toward figuring out songs.</p>
              <button type="button" className="primary" onClick={() => go({ id: 'home' })}>
                Home
              </button>
            </section>
          )}
        </>
      )}
    </main>
  );
}
