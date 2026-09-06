import { displayNameForNoteName } from '../../music/naming';
import { NOTE_STAGES, adviseProgression, formatNoteSet, stageForNotes } from '../../music/progression';
import { accuracyMap } from '../../persistence/store';
import { buildJourney } from '../../training/journey';
import { LESSONS } from '../../training/lessons';
import { applyDifficulty, defaultConfig } from '../../training/quizEngine';
import type { PracticeMode } from '../../training/types';
import { HearNow } from '../components/HearNow';
import { BottomNav } from '../components/widgets';
import { useProgress } from '../context/ProgressContext';
import type { Go } from '../nav';

const MODES: { id: PracticeMode | 'custom'; icon: string; title: string; text: string; screen: Parameters<Go>[0] }[] = [
  { id: 'note', icon: '♪', title: 'Note recognition', text: 'Hear a note. Name it.', screen: { id: 'practice' } },
  { id: 'one-note', icon: '↕', title: 'One note, many pitches', text: 'Same letter, different height.', screen: { id: 'one-note' } },
  { id: 'octave', icon: '⇅', title: 'Low / middle / high', text: 'Which octave did you hear?', screen: { id: 'octave' } },
  { id: 'guitar', icon: '🎸', title: 'Find it on guitar', text: 'Hear it, then tap a fret.', screen: { id: 'guitar-find' } },
  { id: 'interval', icon: '↔', title: 'Intervals', text: 'How far apart are two notes?', screen: { id: 'intervals' } },
  { id: 'melody', icon: '♫', title: 'Melodies', text: 'Follow a short phrase.', screen: { id: 'melody' } },
  { id: 'song', icon: '♬', title: 'Learn from songs', text: 'Name each note, then pick Low, Middle, or High.', screen: { id: 'song' } },
  { id: 'hear-sing-find', icon: '🎤', title: 'Hear → Sing → Find', text: 'Listen, hum, then find it.', screen: { id: 'hear-sing-find' } },
];

export function Home({ go }: { go: Go }) {
  const { progress, level } = useProgress();
  const notes = progress.selectedNotes;
  const advice = adviseProgression(notes, accuracyMap(progress), progress.settings.thresholds);
  const nextLesson = LESSONS.find((lesson) => !progress.completedLessons.includes(lesson.id));
  const stage = stageForNotes(notes);
  const journey = buildJourney(progress);
  const here = journey.current;

  return (
    <div className="app-shell">
      <main className="screen home">
        <header className="home-head">
          <div>
            <div className="wood-rule" aria-hidden="true" />
            <p className="eyebrow">Earstep</p>
            <h1>Listen first.</h1>
          </div>
          <button type="button" className="ghost" onClick={() => go({ id: 'settings' })}>
            Settings
          </button>
        </header>

        <HearNow />

        <section className="card hero-card">
          <p className="muted">
            Continue {formatNoteSet(notes)}
            {stage > 0 ? ` · Stage ${stage} of ${NOTE_STAGES.length}` : ' · custom set'}
          </p>
          <h2>
            {notes.map((name) => displayNameForNoteName(name, progress.settings.noteSystem, progress.settings.tonicPitchClass)).join('  ·  ')}
          </h2>
          <p>{advice.message}</p>
          <div className="row">
            <button
              type="button"
              className="primary"
              onClick={() =>
                go({
                  id: 'train',
                  heading: formatNoteSet(notes),
                  config: applyDifficulty({
                    ...defaultConfig('note', notes),
                    octaves: progress.selectedOctaves,
                    instrument: progress.settings.instrument,
                    questionCount: 16,
                    difficulty: notes.length <= 2 ? 'beginner' : 'easy',
                  }),
                })
              }
            >
              Practice now
            </button>
            <button type="button" className="ghost" onClick={() => go({ id: 'practice' })}>
              Customize
            </button>
          </div>
        </section>

        {here && (
          <button type="button" className="card lesson-link" onClick={() => go({ id: 'journey' })}>
            <span className="muted">You&apos;re here</span>
            <strong>{here.level.title}</strong>
            <span>
              {here.questions > 0
                ? `${Math.round(here.accuracy * 100)}% · open Journey to continue`
                : `${here.level.description} Open your Journey.`}
            </span>
          </button>
        )}

        <div className="stat-row">
          <article className="mini">
            <strong>{level}</strong>
            <span>Level</span>
          </article>
          <article className="mini">
            <strong>{progress.streak.days}</strong>
            <span>Day streak</span>
          </article>
          <article className="mini">
            <strong>{progress.totalCorrect}</strong>
            <span>Notes heard</span>
          </article>
        </div>

        <section>
          <div className="section-head">
            <h3>Daily training</h3>
            <button type="button" className="text-btn" onClick={() => go({ id: 'daily' })}>
              Start
            </button>
          </div>
          <p className="muted">A short mix: notes, octaves, guitar, and a melody.</p>
        </section>

        <section>
          <div className="section-head">
            <h3>Lessons</h3>
            <button type="button" className="text-btn" onClick={() => go({ id: 'lessons' })}>
              All lessons
            </button>
          </div>
          {nextLesson ? (
            <button type="button" className="card lesson-link" onClick={() => go({ id: 'lesson', lessonId: nextLesson.id })}>
              <span className="muted">Lesson {nextLesson.number}</span>
              <strong>{nextLesson.title}</strong>
              <span>{nextLesson.summary}</span>
            </button>
          ) : (
            <p className="muted">You have read every lesson. Practice from Journey or custom practice.</p>
          )}
        </section>

        <section>
          <h3>Practice modes</h3>
          <div className="mode-grid">
            {MODES.map((mode) => (
              <button key={mode.title} type="button" className="card mode-card" onClick={() => go(mode.screen)}>
                <span className="mode-icon" aria-hidden="true">
                  {mode.icon}
                </span>
                <strong>{mode.title}</strong>
                <span>{mode.text}</span>
              </button>
            ))}
          </div>
        </section>
      </main>
      <BottomNav go={go} active="home" />
    </div>
  );
}
