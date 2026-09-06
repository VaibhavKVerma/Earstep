import { useEffect, useMemo, useState } from 'react';
import { audioEngine } from '../../audio/AudioEngine';
import {
  STRING_LABELS,
  STRING_TAB_NAMES,
  describePosition,
  findPositions,
  noteAtFret,
  type FretPosition,
} from '../../music/guitar';
import { displayName, type NoteSystem } from '../../music/naming';
import type { MusicalNote } from '../../music/notes';
import { useProgress } from '../context/ProgressContext';

interface FretboardProps {
  target?: Pick<MusicalNote, 'pitchClass' | 'octave' | 'midi' | 'name'>;
  highlight: 'none' | 'pitch-class' | 'octave';
  showNames: boolean;
  fretCount?: number;
  onSelect?: (stringIndex: number, fret: number, note: ReturnType<typeof noteAtFret>) => void;
  selected?: { stringIndex: number; fret: number } | null;
  noteSystem?: NoteSystem;
  tonic?: number;
  interactive?: boolean;
}

function useResponsiveFrets(override?: number) {
  const [count, setCount] = useState(override ?? 15);
  useEffect(() => {
    if (override !== undefined) {
      setCount(override);
      return;
    }
    const apply = () => {
      const width = window.innerWidth;
      setCount(width < 640 ? 10 : width < 900 ? 13 : 17);
    };
    apply();
    window.addEventListener('resize', apply);
    return () => window.removeEventListener('resize', apply);
  }, [override]);
  return count;
}

export function Fretboard({
  target,
  highlight,
  showNames,
  fretCount,
  onSelect,
  selected,
  noteSystem = 'western',
  tonic = 0,
  interactive = true,
}: FretboardProps) {
  const { progress } = useProgress();
  const [heard, setHeard] = useState<{ stringIndex: number; fret: number } | null>(null);
  const visibleFrets = useResponsiveFrets(fretCount);

  useEffect(() => {
    setHeard(null);
  }, [target?.midi]);

  const matches = useMemo(() => {
    if (!target || highlight === 'none') return [];
    if (highlight === 'octave') {
      return findPositions({ pitchClass: target.pitchClass, octave: target.octave }, visibleFrets);
    }
    return findPositions({ pitchClass: target.pitchClass }, visibleFrets);
  }, [target, highlight, visibleFrets]);

  const matchKey = new Set(matches.map((item) => `${item.stringIndex}-${item.fret}`));

  function playFret(stringIndex: number, fret: number, note: ReturnType<typeof noteAtFret>) {
    setHeard({ stringIndex, fret });
    audioEngine.stop();
    void audioEngine.playFrequency(note.frequency, { instrument: progress.settings.instrument });
    onSelect?.(stringIndex, fret, note);
  }

  return (
    <div className="fretboard-wrap">
      <div
        className="fretboard"
        role="group"
        aria-label="Guitar fretboard"
        style={{ ['--fret-cols' as string]: String(visibleFrets + 1) }}
      >
        <div className="fret-index">
          <span />
          <span className="nut-label">open</span>
          {Array.from({ length: visibleFrets }, (_, fret) => (
            <span key={fret}>{fret + 1}</span>
          ))}
        </div>
        {Array.from({ length: 6 }, (_, row) => {
          const stringIndex = 5 - row;
          return (
            <div className="string-row" key={stringIndex}>
              <span className="string-name">{STRING_TAB_NAMES[stringIndex]}</span>
              {Array.from({ length: visibleFrets + 1 }, (_, fret) => {
                const note = noteAtFret(stringIndex, fret);
                const isMatch = matchKey.has(`${stringIndex}-${fret}`);
                const isExact = Boolean(target && isMatch && note.midi === target.midi);
                const isSelected =
                  (selected?.stringIndex === stringIndex && selected.fret === fret) ||
                  (!selected && heard?.stringIndex === stringIndex && heard.fret === fret);
                const label = displayName(note.pitchClass, noteSystem, tonic);
                return (
                  <button
                    key={`${stringIndex}-${fret}`}
                    type="button"
                    className={[
                      'fret',
                      fret === 0 ? 'open' : '',
                      isMatch ? 'match' : '',
                      isExact ? 'exact' : '',
                      isSelected ? 'selected' : '',
                    ]
                      .filter(Boolean)
                      .join(' ')}
                    style={{ ['--thick' as string]: `${6 - stringIndex * 0.7}px` }}
                    disabled={!interactive}
                    aria-label={`${STRING_LABELS[stringIndex]}, ${fret === 0 ? 'open' : `fret ${fret}`}, ${label}${note.octave}`}
                    onClick={() => playFret(stringIndex, fret, note)}
                  >
                    <i className="wire" />
                    {(showNames || isMatch || isSelected) && (
                      <span className="fret-note">
                        {label}
                        <small>{note.octave}</small>
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          );
        })}
        <div className="inlays">
          {[3, 5, 7, 9, 12, 15].filter((fret) => fret <= visibleFrets).map((fret) => (
            <span key={fret} style={{ gridColumn: fret + 2 }}>
              {fret === 12 ? '••' : '•'}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

export function positionList(positions: FretPosition[], max = 6): string[] {
  return positions.slice(0, max).map(describePosition);
}
