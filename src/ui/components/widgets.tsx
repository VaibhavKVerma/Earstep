import type { ReactNode } from 'react';
import { displayNameForNoteName, type NoteSystem } from '../../music/naming';
import type { NoteName } from '../../music/notes';
import type { Go } from '../nav';

export function TopBar({
  title,
  onBack,
  right,
}: {
  title: string;
  onBack?: () => void;
  right?: ReactNode;
}) {
  return (
    <header className="topbar">
      {onBack ? (
        <button type="button" className="ghost icon-btn" onClick={onBack} aria-label="Back">
          ←
        </button>
      ) : (
        <span className="icon-btn spacer" />
      )}
      <h1>{title}</h1>
      <div className="topbar-right">{right}</div>
    </header>
  );
}

export function PlayButton({
  playing,
  replayed,
  onClick,
  label = 'Play note',
}: {
  playing: boolean;
  replayed: boolean;
  onClick: () => void;
  label?: string;
}) {
  return (
    <button
      type="button"
      className={`play-btn ${playing ? 'playing' : ''}`}
      onClick={onClick}
      aria-label={replayed ? 'Replay note' : label}
    >
      <span className="play-wave" aria-hidden="true" />
      <strong>{replayed ? 'Replay' : label}</strong>
    </button>
  );
}

export function NoteChoices({
  options,
  system,
  tonic,
  disabled,
  onChoose,
  reveal,
}: {
  options: NoteName[];
  system: NoteSystem;
  tonic: number;
  disabled?: boolean;
  onChoose: (name: NoteName) => void;
  reveal?: { selected?: string; expected?: string };
}) {
  return (
    <div className="choice-grid" role="group" aria-label="Note choices">
      {options.map((name, index) => {
        const label = displayNameForNoteName(name, system, tonic);
        const state =
          reveal?.expected === name
            ? 'correct'
            : reveal?.selected === name
              ? 'wrong'
              : '';
        return (
          <button
            key={name}
            type="button"
            className={`choice ${state}`}
            disabled={disabled}
            onClick={() => onChoose(name)}
          >
            <span className="choice-key">{index + 1}</span>
            {label}
            {system !== 'western' && <small>{name}</small>}
          </button>
        );
      })}
    </div>
  );
}

export function ProgressDots({ current, total }: { current: number; total: number }) {
  const pct = total === 0 ? 0 : Math.round((current / total) * 100);
  return (
    <div className="session-progress">
      <span>
        Question {Math.min(current + 1, total)} / {total}
      </span>
      <div className="bar" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100}>
        <i style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

export function BottomNav({ go, active }: { go: Go; active: string }) {
  const items = [
    { id: 'home', label: 'Home', screen: { id: 'home' } as const },
    { id: 'practice', label: 'Practice', screen: { id: 'practice' } as const },
    { id: 'lessons', label: 'Lessons', screen: { id: 'lessons' } as const },
    { id: 'stats', label: 'Stats', screen: { id: 'stats' } as const },
  ];
  return (
    <nav className="bottom-nav" aria-label="Main">
      {items.map((item) => (
        <button
          key={item.id}
          type="button"
          className={active === item.id ? 'active' : ''}
          onClick={() => go(item.screen)}
        >
          {item.label}
        </button>
      ))}
    </nav>
  );
}

export function SiteFooter() {
  return (
    <footer className="site-footer">
      <p>Made by Cursor. Idea by Vaibhav Verma.</p>
      <p>
        If you need enhancements or corrections, please drop an email to{' '}
        <a href="mailto:vaibhavverma15062001@gmail.com">vaibhavverma15062001@gmail.com</a>
      </p>
      <p>
        <a href="/ear-training.html">Ear training</a>
        {' · '}
        <a href="/guitar-ear-training.html">Guitar ear training</a>
        {' · '}
        <a href="/learn-notes.html">Learn notes</a>
        {' · '}
        <a href="/privacy.html">Privacy</a>
      </p>
    </footer>
  );
}

export function Chip({
  active,
  children,
  onClick,
}: {
  active?: boolean;
  children: ReactNode;
  onClick?: () => void;
}) {
  return (
    <button type="button" className={`chip ${active ? 'active' : ''}`} onClick={onClick} aria-pressed={active}>
      {children}
    </button>
  );
}
