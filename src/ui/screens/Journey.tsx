import { useEffect, useRef, type Ref } from 'react';
import { STRING_NAMES } from '../../music/guitar';
import { buildJourney, progressBar, type LevelView } from '../../training/journey';
import { MASTERY_ACCURACY } from '../../training/mastery';
import { getRoadmapLevel } from '../../training/roadmap';
import { BottomNav, TopBar } from '../components/widgets';
import { useProgress } from '../context/ProgressContext';
import { beginLevel, beginWeakNotes } from '../journeyLaunch';
import type { Go } from '../nav';

function Stars({ count }: { count: number }) {
  return (
    <span className="journey-stars" aria-label={`${count} of 5 stars`}>
      {'★'.repeat(count)}
      {'☆'.repeat(Math.max(0, 5 - count))}
    </span>
  );
}

function percent(value: number): number {
  return Math.round(value * 100);
}

export function Journey({ go }: { go: Go }) {
  const { progress, update } = useProgress();
  const view = buildJourney(progress);
  const currentRef = useRef<HTMLLIElement | null>(null);

  useEffect(() => {
    currentRef.current?.scrollIntoView({ block: 'center', behavior: 'smooth' });
  }, [view.current?.level.id]);

  return (
    <div className="app-shell">
      <main className="screen journey-screen">
        <TopBar title="Journey" onBack={() => go({ id: 'home' })} />

        <header className="journey-dash">
          <p className="eyebrow">Your EarStep Journey</p>
          <h1>Your musical journey</h1>
          <p className="journey-count">
            {view.masteredCount} / {view.totalCount} levels mastered
          </p>
          {view.currentWorld && (
            <p>
              <strong>Current world:</strong> {view.currentWorld.world.title}
            </p>
          )}
          {view.current && (
            <p>
              <strong>Current level:</strong> {view.current.level.title}
            </p>
          )}
          <div className="journey-overall">
            <span>Overall progress</span>
            <div className="bar" role="progressbar" aria-valuenow={percent(view.overallProgress)} aria-valuemin={0} aria-valuemax={100}>
              <i style={{ width: `${percent(view.overallProgress)}%` }} />
            </div>
            <small>
              {progressBar(view.overallProgress)} {percent(view.overallProgress)}%
            </small>
          </div>
        </header>

        <NextStepCard view={view} go={go} />

        <LearnedSection view={view} />

        <section className="journey-world-overview" aria-label="World progress">
          {view.worlds.map((world) => (
            <article key={world.world.id} className="journey-world-chip">
              <strong>{world.world.title}</strong>
              <span>
                {world.mastered} / {world.total} mastered
              </span>
              <div className="bar">
                <i style={{ width: `${world.total ? (world.mastered / world.total) * 100 : 0}%` }} />
              </div>
            </article>
          ))}
        </section>

        <ol className="journey-map">
          {view.worlds.map((world, worldIndex) => (
            <li key={world.world.id} className="journey-world">
              <div className="journey-world-head">
                <span className="journey-world-icon" aria-hidden="true">
                  {world.world.icon}
                </span>
                <div>
                  <p className="eyebrow">{world.world.subtitle}</p>
                  <h2>{world.world.title}</h2>
                  <p className="muted">{world.world.description}</p>
                </div>
              </div>
              <ol className="journey-path">
                {world.levels.map((item, index) => (
                  <LevelNode
                    key={item.level.id}
                    item={item}
                    nodeRef={item.isCurrent ? currentRef : undefined}
                    last={index === world.levels.length - 1 && worldIndex === view.worlds.length - 1}
                    go={go}
                  />
                ))}
              </ol>
            </li>
          ))}
        </ol>

        <section className="card journey-anything">
          <h3>Practice anything</h3>
          <p>The journey is the recommended path. You can still choose notes, octaves, and modes freely.</p>
          <button
            type="button"
            className="ghost"
            onClick={() => {
              update((current) => ({
                ...current,
                journey: { ...current.journey, activeLevelId: undefined },
              }));
              go({ id: 'practice' });
            }}
          >
            Open custom practice
          </button>
        </section>
      </main>
      <BottomNav go={go} active="journey" />
    </div>
  );
}

function NextStepCard({
  view,
  go,
}: {
  view: ReturnType<typeof buildJourney>;
  go: Go;
}) {
  const { progress, update } = useProgress();
  const current = view.current;
  if (!current) {
    return (
      <section className="card journey-next">
        <p className="eyebrow">Journey complete</p>
        <h2>You have walked the whole map.</h2>
        <p>Return to any level to improve stars, or practice anything.</p>
        <button type="button" className="primary" onClick={() => go({ id: 'practice' })}>
          Practice anything
        </button>
      </section>
    );
  }

  const need = percent(current.level.mastery.accuracy);
  const now = percent(current.accuracy);
  const weakest = current.weakNotes.find((item) => item.total > 0 && item.accuracy < current.level.mastery.accuracy);
  const masteredHere = current.state === 'mastered';
  const upcoming = view.next;

  if (masteredHere && upcoming) {
    return (
      <section className="card journey-next">
        <p className="eyebrow">Next up</p>
        <h2>{upcoming.level.title}</h2>
        <p>{upcoming.level.description}</p>
        <button type="button" className="primary" onClick={() => beginLevel(upcoming.level, progress, update, go)}>
          Start level
        </button>
      </section>
    );
  }

  return (
    <section className="card journey-next">
      <p className="eyebrow">Your next step</p>
      <h2>{current.state === 'available' ? current.level.title : `Master ${current.level.title}`}</h2>
      {current.questions > 0 ? (
        <>
          <p>
            You are currently at {now}%. You need {need}% to unlock the next level.
          </p>
          <p className="muted">You&apos;re getting there.</p>
        </>
      ) : (
        <p>{current.level.description}</p>
      )}
      {weakest && (
        <p>
          <strong>{weakest.name}</strong> needs more practice.
        </p>
      )}
      <div className="row wrap">
        <button type="button" className="primary" onClick={() => beginLevel(current.level, progress, update, go)}>
          {current.questions > 0 ? 'Continue practice' : 'Start level'}
        </button>
        {weakest && (
          <button type="button" className="ghost" onClick={() => beginWeakNotes(current.level, progress, update, go, weakest.name)}>
            Practice {weakest.name}
          </button>
        )}
        {current.weakNotes.some((item) => item.total > 0 && item.accuracy < 1) && !weakest && (
          <button type="button" className="ghost" onClick={() => beginWeakNotes(current.level, progress, update, go)}>
            Practice weak notes
          </button>
        )}
      </div>
    </section>
  );
}

function LearnedSection({ view }: { view: ReturnType<typeof buildJourney> }) {
  const coming = view.comingNext.slice(0, 5);
  return (
    <section className="journey-learned">
      <div>
        <h3>You&apos;ve learned</h3>
        {view.learnedNotes.length ? (
          <ul>
            {view.learnedNotes.map((name) => (
              <li key={name}>✓ {name}</li>
            ))}
          </ul>
        ) : (
          <p className="muted">Your first notes will land here.</p>
        )}
        {view.current && (
          <p>
            <strong>Current skill:</strong> {view.current.level.skill}
          </p>
        )}
      </div>
      <div>
        <h3>Coming next</h3>
        <ul>
          {coming.map((item) => (
            <li key={item.level.id}>
              🔒 {item.level.shortTitle}
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

function LevelNode({
  item,
  nodeRef,
  last,
  go,
}: {
  item: LevelView;
  nodeRef?: Ref<HTMLLIElement>;
  last: boolean;
  go: Go;
}) {
  const locked = item.state === 'locked';
  return (
    <li ref={nodeRef} className={`journey-node-wrap side-${item.level.number % 2 === 0 ? 'right' : 'left'}`}>
      <button
        type="button"
        className={`journey-node ${item.state} ${item.isCurrent ? 'current' : ''}`}
        onClick={() => go({ id: 'level', levelId: item.level.id })}
      >
        <span className="journey-orb" aria-hidden="true">
          {item.state === 'locked' ? '🔒' : item.state === 'mastered' ? '✓' : '●'}
        </span>
        <span className="journey-node-body">
          {item.isCurrent && <span className="you-are-here">You are here</span>}
          <strong>{item.level.title}</strong>
          <em>Level {item.level.number}</em>
          {item.state === 'mastered' && (
            <span className="journey-status">
              ✓ Mastered <Stars count={item.stars} />
            </span>
          )}
          {item.state === 'in-progress' && <span className="journey-status">{percent(item.accuracy)}%</span>}
          {item.state === 'available' && <span className="journey-status start-tag">Start</span>}
          {locked && <span className="journey-status muted">{item.unlockHint}</span>}
        </span>
      </button>
      {!last && <span className="journey-connector" aria-hidden="true" />}
    </li>
  );
}

export function LevelDetail({ go, levelId }: { go: Go; levelId: string }) {
  const { progress, update } = useProgress();
  const level = getRoadmapLevel(levelId);
  const view = buildJourney(progress);
  const item = view.levels.find((entry) => entry.level.id === levelId);

  if (!level || !item) {
    return (
      <div className="app-shell">
        <main className="screen">
          <TopBar title="Level" onBack={() => go({ id: 'journey' })} />
          <p>That level is not on the map.</p>
        </main>
        <BottomNav go={go} active="journey" />
      </div>
    );
  }

  const locked = item.state === 'locked';
  const weakest = item.weakNotes.find((note) => note.total > 0 && note.accuracy < level.mastery.accuracy);

  return (
    <div className="app-shell">
      <main className="screen journey-detail">
        <TopBar title={`Level ${level.number}`} onBack={() => go({ id: 'journey' })} />
        {item.isCurrent && <p className="you-are-here inline">You are here</p>}
        <h1>{level.title}</h1>
        <p className="muted">{getWorldTitle(item)}</p>

        <article className="card prose">
          <h2>What you&apos;ll learn</h2>
          <p>{level.description}</p>
          <h2>Why it matters</h2>
          <p>{level.why}</p>
        </article>

        {level.id === 'guitar-fretboard' && (
          <article className="card prose">
            <h2>Standard tuning</h2>
            <p className="journey-tuning">{STRING_NAMES.join(' · ')}</p>
            <p className="muted">Low E to high E. Tap strings in Find the Note after you look this over.</p>
          </article>
        )}

        <ul className="stat-list">
          <li>
            <span>Current mastery</span>
            <b>{percent(item.accuracy)}%</b>
          </li>
          <li>
            <span>Best score</span>
            <b>{percent(item.bestAccuracy)}%</b>
          </li>
          <li>
            <span>Questions completed</span>
            <b>{item.questions}</b>
          </li>
          <li>
            <span>Attempts</span>
            <b>
              {item.sessions} session{item.sessions === 1 ? '' : 's'}
            </b>
          </li>
          <li>
            <span>Requirement</span>
            <b>{percent(level.mastery.accuracy)}% accuracy</b>
          </li>
        </ul>

        {item.state === 'mastered' && (
          <p>
            ✓ Mastered <Stars count={item.stars} />
          </p>
        )}
        {item.state === 'in-progress' && (
          <p>
            {percent(item.accuracy)}% — you&apos;re getting there. Need {percent(MASTERY_ACCURACY)}% across{' '}
            {level.mastery.minimumQuestions} questions.
          </p>
        )}
        {locked && <p>{item.unlockHint}</p>}

        {item.weakNotes.some((note) => note.total > 0) && (
          <ul className="stat-list">
            {item.weakNotes.map((note) => (
              <li key={note.name}>
                <span>{note.name}</span>
                <b>{note.total ? `${percent(note.accuracy)}%` : '—'}</b>
              </li>
            ))}
          </ul>
        )}

        <div className="stack">
          {!locked && (
            <button type="button" className="primary" onClick={() => beginLevel(level, progress, update, go)}>
              {item.questions > 0 ? 'Continue' : 'Start'}
            </button>
          )}
          {weakest && !locked && (
            <button type="button" className="ghost" onClick={() => beginWeakNotes(level, progress, update, go, weakest.name)}>
              Practice {weakest.name}
            </button>
          )}
          <button type="button" className="text-btn" onClick={() => go({ id: 'practice' })}>
            Practice anything
          </button>
        </div>
      </main>
      <BottomNav go={go} active="journey" />
    </div>
  );
}

function getWorldTitle(item: LevelView): string {
  const world = item.level.worldId;
  const names: Record<string, string> = {
    hear: 'World 1 — Hear',
    pitch: 'World 2 — Pitch',
    guitar: 'World 3 — Guitar',
    relative: 'World 4 — Relative pitch',
    language: 'World 5 — Musical language',
    melody: 'World 6 — Melody',
    songs: 'World 7 — Song detective',
    chromatic: 'World 8 — Chromatic',
  };
  return names[world] ?? world;
}
