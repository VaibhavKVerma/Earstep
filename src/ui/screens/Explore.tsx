import { useMemo, useState } from 'react';
import { audioEngine } from '../../audio/AudioEngine';
import { INTERVALS, INTERVAL_LEVELS, INTERVAL_REFERENCES, intervalFromSemitones, type IntervalId } from '../../music/intervals';
import { isCorrectFret, noteAtFret } from '../../music/guitar';
import { displayNameForNoteName } from '../../music/naming';
import { formatScientific, humanOctaveName, noteFromName, type NoteName } from '../../music/notes';
import { PUBLIC_DOMAIN_SONGS, melodyDirection } from '../../music/songs';
import { completeSession, grantAchievement, recordAnswer, summarizeSession } from '../../persistence/store';
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
import { NoteChoices, PlayButton, TopBar } from '../components/widgets';
import { useProgress } from '../context/ProgressContext';
import type { Go } from '../nav';

export function OneNoteMany({ go }: { go: Go }) {
  const { progress } = useProgress();
  const [step, setStep] = useState(0);
  const name = (progress.selectedNotes[0] ?? 'C') as NoteName;
  const demos = [2, 3, 4, 5].map((octave) => noteFromName(name, octave));
  const options = progress.selectedNotes.length >= 2 ? progress.selectedNotes : (['C', 'D', 'E'] as NoteName[]);

  return (
    <main className="screen">
      <TopBar title="One note, many pitches" onBack={() => go({ id: 'home' })} />
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
    update((current) => ({
      ...current,
      octaveStats: {
        correct: current.octaveStats.correct + (correct ? 1 : 0),
        incorrect: current.octaveStats.incorrect + (correct ? 0 : 1),
      },
      xp: current.xp + (correct ? 10 : 2),
    }));
  }

  return (
    <main className="screen">
      <TopBar title="Low / Middle / High" onBack={() => go({ id: 'home' })} />
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
      <TopBar title="Find it on guitar" onBack={() => go({ id: 'home' })} />
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
  const expected = intervalFromSemitones(question.compareNote!.midi - question.note.midi);

  async function playPair() {
    await audioEngine.playFrequency(question.note.frequency, {
      instrument: progress.settings.instrument,
      duration: 0.7,
    });
    await audioEngine.playFrequency(question.compareNote!.frequency, {
      instrument: progress.settings.instrument,
      duration: 0.9,
    });
  }

  function choose(id: IntervalId) {
    setPicked(id);
    const correct = id === expected.id;
    update((current) => ({ ...current, xp: current.xp + (correct ? 10 : 2) }));
  }

  return (
    <main className="screen">
      <TopBar title="Intervals" onBack={() => go({ id: 'home' })} />
      <p className="lede">Level {level}: only a few distances at a time.</p>
      <div className="chip-row">
        {INTERVAL_LEVELS.map((_, i) => (
          <button key={i} type="button" className={`chip ${level === i ? 'active' : ''}`} onClick={() => { setLevel(i); setPicked(null); }}>
            {i === 0 ? 'Same?' : `Lv ${i}`}
          </button>
        ))}
      </div>
      <PlayButton playing={false} replayed onClick={() => void playPair()} label="Play both notes" />
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
  const phrase = useMemo(() => {
    const a = noteFromName(progress.selectedNotes[0] ?? 'C', 4);
    const b = noteFromName(progress.selectedNotes[1] ?? 'D', 4);
    const c = noteFromName(progress.selectedNotes[2] ?? progress.selectedNotes[0] ?? 'E', 4);
    return [a, b, c, b];
  }, [progress.selectedNotes]);
  const [mode, setMode] = useState<'first' | 'direction' | 'sequence'>('first');
  const [done, setDone] = useState<string | null>(null);

  async function play() {
    await audioEngine.playSequence(
      phrase.map((note) => note.frequency),
      { instrument: progress.settings.instrument, duration: 0.45, gap: 0.1 },
    );
  }

  const sequences = [
    phrase.map((n) => n.name).join(' '),
    [phrase[0].name, phrase[2].name, phrase[1].name, phrase[0].name].join(' '),
    [phrase[1].name, phrase[2].name, phrase[0].name, phrase[1].name].join(' '),
  ];

  function finish(ok: boolean, label: string) {
    setDone(ok ? `Yes — ${label}` : `Not quite. ${label}`);
    if (ok) {
      const summary = summarizeSession(
        [
          {
            questionId: 'mel-1',
            expected: phrase[0].name,
            expectedMidi: phrase[0].midi,
            selected: phrase[0].name,
            correct: true,
            firstAttempt: true,
            replayCount: 0,
            mode: 'melody',
          },
        ],
        progress.selectedNotes,
        'melody',
      );
      update((current) => completeSession(current, summary));
    }
  }

  return (
    <main className="screen">
      <TopBar title="Melody" onBack={() => go({ id: 'home' })} />
      <div className="chip-row">
        <button type="button" className={`chip ${mode === 'first' ? 'active' : ''}`} onClick={() => setMode('first')}>
          First note
        </button>
        <button type="button" className={`chip ${mode === 'direction' ? 'active' : ''}`} onClick={() => setMode('direction')}>
          Higher / lower
        </button>
        <button type="button" className={`chip ${mode === 'sequence' ? 'active' : ''}`} onClick={() => setMode('sequence')}>
          Sequence
        </button>
      </div>
      <PlayButton playing={false} replayed onClick={() => void play()} label="Play melody" />
      {mode === 'first' && (
        <NoteChoices
          options={progress.selectedNotes}
          system={progress.settings.noteSystem}
          tonic={progress.settings.tonicPitchClass}
          onChoose={(name) => finish(name === phrase[0].name, `It started on ${phrase[0].name}.`)}
        />
      )}
      {mode === 'direction' && (
        <div className="choice-grid">
          {(['higher', 'lower', 'same'] as const).map((dir) => (
            <button
              key={dir}
              type="button"
              className="choice"
              onClick={() => finish(dir === melodyDirection(phrase[0], phrase[1]), `The second note went ${melodyDirection(phrase[0], phrase[1])}.`)}
            >
              {dir}
            </button>
          ))}
        </div>
      )}
      {mode === 'sequence' && (
        <div className="stack">
          {sequences.map((seq) => (
            <button key={seq} type="button" className="ghost" onClick={() => finish(seq === sequences[0], `The phrase was ${sequences[0]}.`)}>
              {seq}
            </button>
          ))}
        </div>
      )}
      {done && (
        <section className="feedback ok">
          <p>{done}</p>
          <button type="button" className="primary" onClick={() => go({ id: 'song' })}>
            Try a song phrase
          </button>
        </section>
      )}
    </main>
  );
}

export function SongMode({ go }: { go: Go }) {
  const { progress, update } = useProgress();
  const [songId, setSongId] = useState(PUBLIC_DOMAIN_SONGS[0].id);
  const song = PUBLIC_DOMAIN_SONGS.find((item) => item.id === songId) ?? PUBLIC_DOMAIN_SONGS[0];
  const [step, setStep] = useState(1);
  const [message, setMessage] = useState('');
  const secondDir = melodyDirection(song.notes[0], song.notes[1]);

  async function play(count = song.notes.length) {
    await audioEngine.playSequence(
      song.notes.slice(0, count).map((note) => note.frequency),
      { instrument: progress.settings.instrument, duration: 0.42, gap: 0.08 },
    );
  }

  function markSong() {
    const summary = summarizeSession(
      [
        {
          questionId: song.id,
          expected: song.notes[0].name,
          expectedMidi: song.notes[0].midi,
          selected: song.notes[0].name,
          correct: true,
          firstAttempt: true,
          replayCount: 0,
          mode: 'song',
        },
      ],
      [song.notes[0].name],
      'song',
    );
    update((current) => completeSession(current, summary));
  }

  return (
    <main className="screen">
      <TopBar title="Learn from songs" onBack={() => go({ id: 'home' })} />
      <div className="chip-row">
        {PUBLIC_DOMAIN_SONGS.map((item) => (
          <button
            key={item.id}
            type="button"
            className={`chip ${songId === item.id ? 'active' : ''}`}
            onClick={() => {
              setSongId(item.id);
              setStep(1);
              setMessage('');
            }}
          >
            {item.title}
          </button>
        ))}
      </div>
      <p className="muted">{song.origin}</p>
      <PlayButton playing={false} replayed onClick={() => void play(step === 1 ? song.notes.length : 2)} label="Listen" />

      {step === 1 && (
        <>
          <p className="question">What is the starting note?</p>
          <NoteChoices
            options={['C', 'D', 'E', 'F', 'G', 'A'] as NoteName[]}
            system={progress.settings.noteSystem}
            tonic={progress.settings.tonicPitchClass}
            onChoose={(name) => {
              setMessage(name === song.notes[0].name ? `Yes — it starts on ${formatScientific(song.notes[0])}.` : `It starts on ${song.notes[0].name}.`);
              setStep(2);
            }}
          />
        </>
      )}
      {step === 2 && (
        <>
          <p className="question">Does the next note go higher, lower, or stay?</p>
          <div className="choice-grid">
            {(['higher', 'lower', 'same'] as const).map((dir) => (
              <button
                key={dir}
                type="button"
                className="choice"
                onClick={() => {
                  setMessage(dir === secondDir ? `Right — it goes ${secondDir}.` : `It goes ${secondDir}.`);
                  setStep(3);
                }}
              >
                {dir}
              </button>
            ))}
          </div>
        </>
      )}
      {step === 3 && (
        <>
          <p className="question">Name the second note, then find the first on guitar.</p>
          <NoteChoices
            options={['C', 'D', 'E', 'F', 'G', 'A'] as NoteName[]}
            system={progress.settings.noteSystem}
            tonic={progress.settings.tonicPitchClass}
            onChoose={(name) => {
              setMessage(`Second note is ${song.notes[1].name}. You chose ${name}.`);
              setStep(4);
              markSong();
            }}
          />
        </>
      )}
      {step === 4 && (
        <>
          <p>Find {formatScientific(song.notes[0])} on the fretboard.</p>
          <Fretboard target={song.notes[0]} highlight="octave" showNames noteSystem={progress.settings.noteSystem} tonic={progress.settings.tonicPitchClass} />
          <button type="button" className="primary" onClick={() => go({ id: 'home' })}>
            Done
          </button>
        </>
      )}
      {message && <p className="lede">{message}</p>}
    </main>
  );
}

export function HearSingFind({ go }: { go: Go }) {
  const { progress } = useProgress();
  const names = progress.selectedNotes.length ? progress.selectedNotes : (['C', 'D'] as NoteName[]);
  const [target] = useState(() => noteFromName(pick(names), 4));
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [found, setFound] = useState(false);

  return (
    <main className="screen">
      <TopBar title="Hear → Sing → Find" onBack={() => go({ id: 'home' })} />
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
          <p className="lede">Step 2 — hum the note. The app will not grade your voice yet. That can come later with a microphone.</p>
          <button type="button" className="ghost" onClick={() => void audioEngine.playFrequency(target.frequency, { instrument: progress.settings.instrument })}>
            Hear it again
          </button>
          <button type="button" className="primary" onClick={() => setStep(3)}>
            I hummed it
          </button>
          <button type="button" className="text-btn" onClick={() => setStep(3)}>
            Skip singing
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
              if (note.pitchClass === target.pitchClass) setFound(true);
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
