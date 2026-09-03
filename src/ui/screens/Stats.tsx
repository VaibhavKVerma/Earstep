import { NATURAL_NAMES } from '../../music/notes';
import { ACHIEVEMENTS, accuracyMap, firstAttemptAccuracy, overallAccuracy } from '../../persistence/store';
import { BottomNav, TopBar } from '../components/widgets';
import { useProgress } from '../context/ProgressContext';
import type { Go } from '../nav';

export function Stats({ go }: { go: Go }) {
  const { progress, level } = useProgress();
  const map = accuracyMap(progress);
  const ranked = NATURAL_NAMES.map((name) => {
    const stat = map[name] ?? { correct: 0, total: 0 };
    return { name, accuracy: stat.total ? stat.correct / stat.total : 0, total: stat.total };
  }).filter((item) => item.total > 0);
  const strongest = [...ranked].sort((a, b) => b.accuracy - a.accuracy).slice(0, 3);
  const weakest = [...ranked].sort((a, b) => a.accuracy - b.accuracy).slice(0, 3);
  const octaveTotal = progress.octaveStats.correct + progress.octaveStats.incorrect;
  const octaveAcc = octaveTotal ? progress.octaveStats.correct / octaveTotal : 0;

  return (
    <div className="app-shell">
      <main className="screen">
        <TopBar title="Your listening" onBack={() => go({ id: 'home' })} />
        <p className="lede">These numbers are a compass, not a scoreboard.</p>
        <div className="stat-row">
          <article className="mini">
            <strong>{Math.round(overallAccuracy(progress) * 100)}%</strong>
            <span>Overall</span>
          </article>
          <article className="mini">
            <strong>{Math.round(firstAttemptAccuracy(progress) * 100)}%</strong>
            <span>First listen</span>
          </article>
          <article className="mini">
            <strong>{Math.round(octaveAcc * 100)}%</strong>
            <span>Octaves</span>
          </article>
        </div>
        <p className="muted">
          Level {level} · {progress.xp} XP · {progress.streak.days}-day streak (no pressure — come back when you can)
        </p>

        <h2>Note recognition</h2>
        <ul className="stat-list">
          {NATURAL_NAMES.map((name) => {
            const stat = map[name];
            return (
              <li key={name}>
                <span>{name}</span>
                <b>{stat && stat.total ? `${Math.round((stat.correct / stat.total) * 100)}%` : '—'}</b>
              </li>
            );
          })}
        </ul>

        {strongest.length > 0 && (
          <>
            <h2>Strongest</h2>
            <p>{strongest.map((item) => item.name).join(' · ')}</p>
            <h2>Needs more ears</h2>
            <p>{weakest.map((item) => item.name).join(' · ')}</p>
          </>
        )}

        <h2>Milestones</h2>
        <ul className="achieve">
          {ACHIEVEMENTS.map((item) => (
            <li key={item.id} className={progress.achievements.includes(item.id) ? 'got' : ''}>
              <strong>{item.title}</strong>
              <span>{item.detail}</span>
            </li>
          ))}
        </ul>
      </main>
      <BottomNav go={go} active="stats" />
    </div>
  );
}
