import { useEffect, useMemo, useState } from 'react';
import { audioEngine } from '../../audio/AudioEngine';
import { findPositions } from '../../music/guitar';
import { displayNameForNoteName } from '../../music/naming';
import { formatScientific } from '../../music/notes';
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
  const [phase, setPhase] = useState<'listen' | 'feedback'>('listen');
  const [playing, setPlaying] = useState(false);
  const [replayCount, setReplayCount] = useState(0);
  const [answered, setAnswered] = useState(false);
  const [selected, setSelected] = useState<string | null>(null);
  const [correct, setCorrect] = useState(false);
  const [firstAttempt, setFirstAttempt] = useState(true);
  const [answers, setAnswers] = useState<AnswerRecord[]>([]);
  const [showBoard, setShowBoard] = useState(false);

  const question = questions[index];
  const settings = progress.settings;

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
      if (phase === 'listen') {
        const num = Number(event.key);
        if (num >= 1 && num <= question.options.length) {
          choose(question.options[num - 1]);
        }
      }
      if (phase === 'feedback' && event.key === 'Enter') next();
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [phase, question, replayCount, answered]);

  async function play(extra: { louder?: boolean; slower?: boolean } = {}) {
    setPlaying(true);
    if (answered || phase === 'feedback') {
      // replay after answering is fine
    } else if (replayCount > 0 || extra.louder || extra.slower) {
      setReplayCount((n) => n + 1);
    } else {
      setReplayCount((n) => (n === 0 ? 1 : n));
    }
    try {
      await audioEngine.playFrequency(question.note.frequency, {
        instrument: config.instrument,
        duration: extra.slower ? durationForDifficulty(config.difficulty) * 1.7 : durationForDifficulty(config.difficulty),
        louder: extra.louder,
        slower: extra.slower,
      });
    } finally {
      setPlaying(false);
    }
  }

  function choose(name: string) {
    if (phase !== 'listen') return;
    const isCorrect = validatePitchClassAnswer(question.note.name, name);
    const record: AnswerRecord = {
      questionId: question.id,
      expected: question.note.name,
      expectedMidi: question.note.midi,
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

  function next() {
    if (index + 1 >= questions.length) {
      const summary = summarizeSession(answers, config.notes, config.mode, config.levelId ?? progress.journey?.activeLevelId);
      update((current) => completeSession(current, summary));
      go({ id: 'complete', summary, config });
      return;
    }
    setIndex((n) => n + 1);
    setPhase('listen');
    setPlaying(false);
    setReplayCount(0);
    setAnswered(false);
    setSelected(null);
    setCorrect(false);
    setShowBoard(false);
  }

  if (!question) return null;
  const heard = displayNameForNoteName(question.note.name, settings.noteSystem, settings.tonicPitchClass);
  const explanation = noteExplanation(
    question.note,
    selected ?? question.note.name,
    correct,
    settings.noteSystem,
    settings.tonicPitchClass,
  );
  const positions = findPositions({ pitchClass: question.note.pitchClass }, 15);

  return (
    <main className="screen train">
      <TopBar
        title={heading ?? formatNoteSet(config.notes)}
        onBack={() => go({ id: progress.journey?.activeLevelId ? 'journey' : 'home' })}
      />
      <ProgressDots current={index} total={questions.length} />
      <p className="muted">{DIFFICULTY_PRESETS[config.difficulty].questionHint}</p>

      <div className="train-stage">
        <PlayButton playing={playing} replayed={replayCount > 0} onClick={() => void play()} />
        <div className="replay-row">
          <button type="button" className="ghost" onClick={() => void play()}>
            Replay
          </button>
          <button type="button" className="ghost" onClick={() => void play({ louder: true })}>
            Louder
          </button>
          <button type="button" className="ghost" onClick={() => void play({ slower: true })}>
            Slower
          </button>
        </div>
        <p className="question">What note did you hear?</p>
        <NoteChoices
          options={question.options}
          system={settings.noteSystem}
          tonic={settings.tonicPitchClass}
          disabled={phase === 'feedback'}
          onChoose={choose}
          reveal={phase === 'feedback' ? { selected: selected ?? undefined, expected: question.note.name } : undefined}
        />
      </div>

      {phase === 'feedback' && (
        <section className={`feedback ${correct ? 'ok' : 'bad'}`} aria-live="polite">
          <p className="feedback-kicker">{explanation.title}</p>
          <h2>
            You heard: {heard} · {formatScientific(question.note)}
          </h2>
          {!correct && selected && (
            <p>
              You answered:{' '}
              {displayNameForNoteName(selected, settings.noteSystem, settings.tonicPitchClass)}
            </p>
          )}
          <p>{explanation.body}</p>
          <p className="muted">
            {firstAttempt ? 'First-listen answer' : 'Answered after a replay'} · Replays are free.
          </p>
          <div className="row">
            <button type="button" className="ghost" onClick={() => setShowBoard((v) => !v)}>
              {showBoard ? 'Hide guitar' : 'Show me on guitar'}
            </button>
            <button type="button" className="primary" onClick={next}>
              {index + 1 >= questions.length ? 'See results' : 'Next'}
            </button>
          </div>
          {showBoard && (
            <div className="board-block">
              <p className="muted">Tap a fret to hear that note.</p>
              <Fretboard
                target={question.note}
                highlight="octave"
                showNames
                noteSystem={settings.noteSystem}
                tonic={settings.tonicPitchClass}
              />
              <ul className="pos-list">
                {positionList(
                  positions.filter((pos) => pos.note.octave === question.note.octave),
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
