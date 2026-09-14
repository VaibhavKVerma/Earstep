import { useEffect, useMemo, useState } from 'react';
import { audioEngine } from '../../audio/AudioEngine';
import { findPositions } from '../../music/guitar';
import { displayNameForNoteName } from '../../music/naming';
import { formatScientific, humanOctaveName, noteFromName, type NoteName } from '../../music/notes';
import { formatNoteSet } from '../../music/progression';
import { completeSession, recordAnswer, summarizeSession } from '../../persistence/store';
import { noteExplanation } from '../../training/explanations';
import {
  DIFFICULTY_PRESETS,
  durationForDifficulty,
  generateQuestions,
  validatePitchClassAnswer,
} from '../../training/quizEngine';
import { positionList } from '../components/Fretboard';
import type { AnswerRecord, PracticeConfig } from '../../training/types';
import { Fretboard } from '../components/Fretboard';
import { NoteChoices, PlayButton, ProgressDots, TopBar } from '../components/widgets';
import { useProgress } from '../context/ProgressContext';
import type { Go } from '../nav';

export function Training({
  go,
  config,
  heading,
}: {
  go: Go;
  config: PracticeConfig;
  heading?: string;
}) {
  const { progress, update } = useProgress();
  const questions = useMemo(() => generateQuestions(config), [config]);
  const [index, setIndex] = useState(0);
  const [noteIndex, setNoteIndex] = useState(0);
  const [phase, setPhase] = useState<'listen' | 'feedback'>('listen');
  const [playing, setPlaying] = useState(false);
  const [replayCount, setReplayCount] = useState(0);
  const [answered, setAnswered] = useState(false);
  const [selected, setSelected] = useState<string | null>(null);
  const [named, setNamed] = useState<NoteName | null>(null);
  const [correct, setCorrect] = useState(false);
  const [firstAttempt, setFirstAttempt] = useState(true);
  const [answers, setAnswers] = useState<AnswerRecord[]>([]);
  const [showBoard, setShowBoard] = useState(false);

  const question = questions[index];
  const settings = progress.settings;
  const isMelody = config.mode === 'melody';
  const melody = question?.melody ?? [];
  const includePitch = Boolean(question?.includePitch);
  const currentMelodyNote = melody[noteIndex] ?? question?.note;
  const pitchOctaves = [...config.octaves].sort((a, b) => a - b);
  const totalMelodyNotes = questions.reduce((sum, item) => sum + (item.melody?.length ?? 1), 0);
  const melodyProgress = questions
    .slice(0, index)
    .reduce((sum, item) => sum + (item.melody?.length ?? 1), 0) + noteIndex;

  useEffect(() => {
    audioEngine.setVolume(settings.volume);
  }, [settings.volume]);

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement) return;
      if (event.code === 'Space') {
        event.preventDefault();
        void play();
      }
      if (phase === 'listen' && !named) {
        const num = Number(event.key);
        if (num >= 1 && num <= question.options.length) {
          choose(question.options[num - 1]);
        }
      }
      if (phase === 'feedback' && event.key === 'Enter') next();
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [phase, question, replayCount, answered, named, noteIndex]);

  async function play(extra: { louder?: boolean; slower?: boolean; whole?: boolean } = {}) {
    setPlaying(true);
    if (answered || phase === 'feedback') {
      // replay after answering is fine
    } else if (replayCount > 0 || extra.louder || extra.slower || extra.whole) {
      setReplayCount((n) => n + 1);
    } else {
      setReplayCount((n) => (n === 0 ? 1 : n));
    }
    try {
      if (isMelody && melody.length) {
        const through = extra.whole || noteIndex === 0 ? melody.length : noteIndex + 1;
        await audioEngine.playSequence(
          melody.slice(0, through).map((note) => note.frequency),
          {
            instrument: config.instrument,
            duration: extra.slower ? 0.7 : 0.42,
            gap: extra.slower ? 0.16 : 0.08,
            louder: extra.louder,
          },
        );
      } else {
        await audioEngine.playFrequency(question.note.frequency, {
          instrument: config.instrument,
          duration: extra.slower ? durationForDifficulty(config.difficulty) * 1.7 : durationForDifficulty(config.difficulty),
          louder: extra.louder,
          slower: extra.slower,
        });
      }
    } finally {
      setPlaying(false);
    }
  }

  function recordChoice(name: string, isCorrect: boolean) {
    if (phase !== 'listen') return;
    const expected = currentMelodyNote ?? question.note;
    const record: AnswerRecord = {
      questionId: `${question.id}-${noteIndex}`,
      expected: expected.name,
      expectedMidi: expected.midi,
      selected: name,
      correct: isCorrect,
      firstAttempt: replayCount <= 1,
      replayCount,
      mode: config.mode,
    };
    setSelected(name);
    setCorrect(isCorrect);
    setFirstAttempt(record.firstAttempt);
    setAnswered(true);
    setPhase('feedback');
    setAnswers((list) => [...list, record]);
    update((current) => recordAnswer(current, record));
  }

  function choose(name: string) {
    if (phase !== 'listen') return;
    if (isMelody && includePitch) {
      setNamed(name as NoteName);
      return;
    }
    const expected = currentMelodyNote ?? question.note;
    recordChoice(name, validatePitchClassAnswer(expected.name, name));
  }

  function choosePitch(octave: number) {
    if (phase !== 'listen' || !named) return;
    const expected = currentMelodyNote ?? question.note;
    const isCorrect = named === expected.name && octave === expected.octave;
    recordChoice(`${named}${octave}`, isCorrect);
  }

  function resetNote() {
    setPhase('listen');
    setPlaying(false);
    setReplayCount(0);
    setAnswered(false);
    setSelected(null);
    setNamed(null);
    setCorrect(false);
    setShowBoard(false);
  }

  function next() {
    if (isMelody && noteIndex + 1 < melody.length) {
      setNoteIndex((n) => n + 1);
      resetNote();
      return;
    }
    if (index + 1 >= questions.length) {
      const summary = summarizeSession(answers, config.notes, config.mode, config.levelId);
      update((current) => completeSession(current, summary));
      go({ id: 'complete', summary, config });
      return;
    }
    setIndex((n) => n + 1);
    setNoteIndex(0);
    resetNote();
  }

  if (!question) return null;
  const target = currentMelodyNote ?? question.note;
  const heard = displayNameForNoteName(target.name, settings.noteSystem, settings.tonicPitchClass);
  const explanation = noteExplanation(
    target,
    named ?? selected ?? target.name,
    correct,
    settings.noteSystem,
    settings.tonicPitchClass,
  );
  const positions = findPositions({ pitchClass: target.pitchClass }, 15);
  const guessedLabel = named ? displayNameForNoteName(named, settings.noteSystem, settings.tonicPitchClass) : '';
  const lastMelodyNote = isMelody && noteIndex + 1 >= melody.length && index + 1 >= questions.length;

  return (
    <main className="screen train">
      <TopBar
        title={heading ?? formatNoteSet(config.notes)}
        onBack={() => go({ id: progress.journey?.activeLevelId ? 'journey' : 'home' })}
      />
      <ProgressDots current={isMelody ? melodyProgress : index} total={isMelody ? totalMelodyNotes : questions.length} />
      <p className="muted">
        {isMelody
          ? `Phrase ${index + 1} of ${questions.length} · Name each note, like note recognition.`
          : DIFFICULTY_PRESETS[config.difficulty].questionHint}
      </p>

      <div className="train-stage">
        <PlayButton
          playing={playing}
          replayed={replayCount > 0}
          onClick={() => void play()}
          label={isMelody ? (noteIndex === 0 ? 'Play phrase' : 'Play up to this note') : 'Play note'}
        />
        <div className="replay-row">
          <button type="button" className="ghost" onClick={() => void play()}>
            Replay
          </button>
          {isMelody && noteIndex > 0 && (
            <button type="button" className="ghost" onClick={() => void play({ whole: true })}>
              Whole phrase
            </button>
          )}
          <button type="button" className="ghost" onClick={() => void play({ louder: true })}>
            Louder
          </button>
          <button type="button" className="ghost" onClick={() => void play({ slower: true })}>
            Slower
          </button>
        </div>
        <p className="question">
          {isMelody
            ? named && includePitch
              ? `You chose ${guessedLabel}. What pitch did you hear?`
              : `What is note ${noteIndex + 1} of ${melody.length}?`
            : 'What note did you hear?'}
        </p>
        {(!isMelody || !includePitch || !named || answered) && (
          <NoteChoices
            options={question.options}
            system={settings.noteSystem}
            tonic={settings.tonicPitchClass}
            disabled={phase === 'feedback' || Boolean(isMelody && includePitch && named)}
            onChoose={choose}
            reveal={
              phase === 'feedback'
                ? { selected: named ?? selected ?? undefined, expected: target.name }
                : undefined
            }
          />
        )}
        {isMelody && includePitch && named && (
          <div className="choice-grid" role="group" aria-label="Pitch">
            {pitchOctaves.map((octave, pitchIndex) => {
              const state = answered
                ? octave === target.octave
                  ? 'correct'
                  : selected === `${named}${octave}`
                    ? 'wrong'
                    : ''
                : '';
              return (
                <button
                  key={octave}
                  type="button"
                  className={`choice ${state}`}
                  disabled={answered}
                  onClick={() => choosePitch(octave)}
                >
                  <span className="choice-key">{pitchIndex + 1}</span>
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
        {isMelody && includePitch && named && !answered && (
          <button type="button" className="ghost" onClick={() => setNamed(null)}>
            Change note
          </button>
        )}
      </div>

      {phase === 'feedback' && (
        <section className={`feedback ${correct ? 'ok' : 'bad'}`} aria-live="polite">
          <p className="feedback-kicker">{explanation.title}</p>
          <h2>
            You heard: {heard}
            {includePitch ? ` · ${formatScientific(target)}` : ''}
          </h2>
          {!correct && selected && (
            <p>
              You answered:{' '}
              {named
                ? `${guessedLabel}${includePitch ? selected.replace(named, '') : ''}`
                : displayNameForNoteName(selected, settings.noteSystem, settings.tonicPitchClass)}
            </p>
          )}
          <p>{explanation.body}</p>
          <p className="muted">
            {firstAttempt ? 'First-listen answer' : 'Answered after a replay'} · Replays are free.
          </p>
          <div className="row">
            {!isMelody && (
              <button type="button" className="ghost" onClick={() => setShowBoard((v) => !v)}>
                {showBoard ? 'Hide guitar' : 'Show me on guitar'}
              </button>
            )}
            <button type="button" className="primary" onClick={next}>
              {lastMelodyNote || (!isMelody && index + 1 >= questions.length) ? 'See results' : 'Next'}
            </button>
          </div>
          {showBoard && (
            <div className="board-block">
              <p className="muted">Tap a fret to hear that note.</p>
              <Fretboard
                target={target}
                highlight="octave"
                showNames
                noteSystem={settings.noteSystem}
                tonic={settings.tonicPitchClass}
              />
              <ul className="pos-list">
                {positionList(
                  positions.filter((pos) => pos.note.octave === target.octave),
                ).map((line) => (
                  <li key={line}>{line}</li>
                ))}
              </ul>
            </div>
          )}
        </section>
      )}
    </main>
  );
}
