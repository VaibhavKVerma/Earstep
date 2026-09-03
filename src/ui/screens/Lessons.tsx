import { formatNoteSet } from '../../music/progression';
import { completeLesson } from '../../persistence/store';
import { LESSONS } from '../../training/lessons';
import type { NoteName } from '../../music/notes';
import { applyDifficulty, defaultConfig } from '../../training/quizEngine';
import { BottomNav, TopBar } from '../components/widgets';
import { useProgress } from '../context/ProgressContext';
import type { Go } from '../nav';

export function LessonList({ go }: { go: Go }) {
  const { progress } = useProgress();
  return (
    <div className="app-shell">
      <main className="screen">
        <TopBar title="Lessons" onBack={() => go({ id: 'home' })} />
        <p className="lede">Skip freely. Lessons are a path, not a gate.</p>
        <ol className="lesson-list">
          {LESSONS.map((lesson) => {
            const done = progress.completedLessons.includes(lesson.id);
            return (
              <li key={lesson.id}>
                <button type="button" className="card lesson-row" onClick={() => go({ id: 'lesson', lessonId: lesson.id })}>
                  <span className="num">{lesson.number}</span>
                  <span>
                    <strong>{lesson.title}</strong>
                    <em>{lesson.summary}</em>
                  </span>
                  <span className="muted">{done ? 'Done' : `${lesson.minutes} min`}</span>
                </button>
              </li>
            );
          })}
        </ol>
      </main>
      <BottomNav go={go} active="lessons" />
    </div>
  );
}

export function LessonView({ go, lessonId }: { go: Go; lessonId: string }) {
  const lesson = LESSONS.find((item) => item.id === lessonId) ?? LESSONS[0];
  const { progress, update } = useProgress();
  const index = LESSONS.findIndex((item) => item.id === lesson.id);
  const next = LESSONS[index + 1];

  function finish() {
    update((current) => completeLesson(current, lesson.id));
    if (lesson.practiceNotes && lesson.mode === 'note') {
      go({
        id: 'train',
        heading: formatNoteSet(lesson.practiceNotes),
        config: applyDifficulty({
          ...defaultConfig('note', lesson.practiceNotes as NoteName[]),
          instrument: progress.settings.instrument,
        }),
      });
      return;
    }
    if (lesson.mode === 'one-note') return go({ id: 'one-note' });
    if (lesson.mode === 'guitar') return go({ id: 'guitar-find' });
    if (lesson.mode === 'interval') return go({ id: 'intervals' });
    if (lesson.mode === 'melody') return go({ id: 'melody' });
    if (lesson.mode === 'song') return go({ id: 'song' });
    go({ id: 'lessons' });
  }

  return (
    <main className="screen lesson">
      <TopBar title={`Lesson ${lesson.number}`} onBack={() => go({ id: 'lessons' })} />
      <h1>{lesson.title}</h1>
      {lesson.pages.map((page) => (
        <article key={page.heading} className="card prose">
          <h2>{page.heading}</h2>
          <p>{page.body}</p>
        </article>
      ))}
      <div className="stack">
        <button type="button" className="primary" onClick={finish}>
          {lesson.practiceNotes ? `Practice ${formatNoteSet(lesson.practiceNotes)}` : 'Continue'}
        </button>
        {next && (
          <button type="button" className="ghost" onClick={() => go({ id: 'lesson', lessonId: next.id })}>
            Skip to lesson {next.number}
          </button>
        )}
      </div>
    </main>
  );
}
