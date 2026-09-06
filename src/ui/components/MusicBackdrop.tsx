import { useEffect, useRef } from 'react';

const NOTES = [
  { glyph: '♪', top: '8%', left: '6%', delay: '0s', size: '1.6rem' },
  { glyph: '♫', top: '18%', left: '88%', delay: '0.8s', size: '1.35rem' },
  { glyph: '♩', top: '62%', left: '4%', delay: '1.4s', size: '1.5rem' },
  { glyph: '♬', top: '72%', left: '90%', delay: '2s', size: '1.7rem' },
  { glyph: '♪', top: '42%', left: '92%', delay: '2.6s', size: '1.2rem' },
  { glyph: '♫', top: '86%', left: '18%', delay: '1.1s', size: '1.3rem' },
];

export function MusicBackdrop() {
  const layer = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const root = layer.current;
    if (!root || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    const onMove = (event: PointerEvent) => {
      const x = (event.clientX / window.innerWidth - 0.5) * 16;
      const y = (event.clientY / window.innerHeight - 0.5) * 10;
      root.style.setProperty('--mx', `${x.toFixed(1)}px`);
      root.style.setProperty('--my', `${y.toFixed(1)}px`);
    };

    window.addEventListener('pointermove', onMove, { passive: true });
    return () => window.removeEventListener('pointermove', onMove);
  }, []);

  return (
    <div className="music-backdrop" ref={layer} aria-hidden="true">
      <img className="music-photo music-photo-staff" src="/bg/bg-staff.jpg" alt="" />
      <img className="music-photo music-photo-guitar" src="/bg/bg-guitar.jpg" alt="" />
      <img className="music-photo music-photo-piano" src="/bg/bg-piano.jpg" alt="" />
      <div className="music-staff-veil" />
      <div className="music-floats">
        {NOTES.map((note, index) => (
          <span
            key={`${note.glyph}-${index}`}
            className="music-float-note"
            style={{
              top: note.top,
              left: note.left,
              animationDelay: note.delay,
              fontSize: note.size,
            }}
          >
            {note.glyph}
          </span>
        ))}
      </div>
    </div>
  );
}
