import { audioEngine, type InstrumentId, type SoundSource } from '../../audio/AudioEngine';
import {
  SARGAM_NATURAL,
  SOLFEGE_NATURAL,
  mappedScaleNotes,
  systemLabel,
  tonicOptions,
  type NoteSystem,
} from '../../music/naming';
import { resetProgress, useProgress } from '../context/ProgressContext';
import { adsConfigured } from '../../ads/config';
import { Chip, TopBar } from '../components/widgets';
import type { Go } from '../nav';

export function Settings({ go }: { go: Go }) {
  const { progress, update, replace } = useProgress();
  const settings = progress.settings;

  return (
    <main className="screen">
      <TopBar title="Settings" onBack={() => go({ id: 'home' })} />
      <section className="stack">
        <h2>Note system</h2>
        <div className="chip-row">
          {(['western', 'solfege', 'sargam'] as NoteSystem[]).map((system) => (
            <Chip
              key={system}
              active={settings.noteSystem === system}
              onClick={() => update((current) => ({ ...current, settings: { ...current.settings, noteSystem: system } }))}
            >
              {systemLabel(system)}
            </Chip>
          ))}
        </div>

        <h2>Sa / Do tonic</h2>
        <div className="chip-row">
          {tonicOptions().map((option) => (
            <Chip
              key={option.name}
              active={settings.tonicPitchClass === option.pitchClass}
              onClick={() =>
                update((current) => ({
                  ...current,
                  settings: { ...current.settings, tonicPitchClass: option.pitchClass },
                }))
              }
            >
              Sa = {option.name}
            </Chip>
          ))}
        </div>
        {settings.noteSystem !== 'western' && (
          <p className="muted">
            {mappedScaleNotes(settings.tonicPitchClass)
              .map((name, index) => {
                const degree = settings.noteSystem === 'sargam' ? SARGAM_NATURAL[index] : SOLFEGE_NATURAL[index];
                return `${name} = ${degree}`;
              })
              .join(' · ')}
          </p>
        )}

        <h2>Sound</h2>
        <div className="chip-row">
          {([
            ['samples', 'Recorded samples'],
            ['synth', 'Synth'],
          ] as [SoundSource, string][]).map(([id, label]) => (
            <Chip
              key={id}
              active={settings.soundSource === id}
              onClick={() =>
                update((current) => ({
                  ...current,
                  settings: { ...current.settings, soundSource: id },
                }))
              }
            >
              {label}
            </Chip>
          ))}
        </div>
        <p className="muted">
          {settings.soundSource === 'samples'
            ? 'Uses downloaded guitar and piano recordings. Sine stays generated.'
            : 'Uses the in-browser Karplus–Strong guitar and additive piano. Instant, no sample loading.'}
        </p>

        <h2>Default instrument</h2>
        <div className="chip-row">
          {(
            [
              ['acoustic', 'Acoustic guitar'],
              ['electric', 'Electric guitar'],
              ['piano', 'Piano'],
              ['sine', 'Sine wave'],
            ] as [InstrumentId, string][]
          ).map(([id, label]) => (
            <Chip
              key={id}
              active={settings.instrument === id}
              onClick={() => update((current) => ({ ...current, settings: { ...current.settings, instrument: id } }))}
            >
              {label}
            </Chip>
          ))}
        </div>

        <h2>Appearance</h2>
        <div className="chip-row">
          {(['dark', 'light'] as const).map((theme) => (
            <Chip
              key={theme}
              active={settings.theme === theme}
              onClick={() => update((current) => ({ ...current, settings: { ...current.settings, theme } }))}
            >
              {theme === 'dark' ? 'Dark' : 'Light'}
            </Chip>
          ))}
        </div>

        <label className="field">
          Volume
          <input
            type="range"
            min={0.1}
            max={1}
            step={0.05}
            value={settings.volume}
            onChange={(e) => {
              const volume = Number(e.target.value);
              audioEngine.setVolume(volume);
              update((current) => ({ ...current, settings: { ...current.settings, volume } }));
            }}
          />
        </label>

        <label className="check">
          <input
            type="checkbox"
            checked={settings.showScientific}
            onChange={(e) =>
              update((current) => ({
                ...current,
                settings: { ...current.settings, showScientific: e.target.checked },
              }))
            }
          />
          Show C3 / C4 labels after the low–middle–high words
        </label>

        <h2>Ready-for-next thresholds</h2>
        <p className="muted">Stay below {(settings.thresholds.stay * 100).toFixed(0)}%. Suggest a new note above {(settings.thresholds.recommendNext * 100).toFixed(0)}%.</p>
        <label className="field">
          Suggest next note at
          <input
            type="range"
            min={0.7}
            max={0.95}
            step={0.05}
            value={settings.thresholds.recommendNext}
            onChange={(e) =>
              update((current) => ({
                ...current,
                settings: {
                  ...current.settings,
                  thresholds: { ...current.settings.thresholds, recommendNext: Number(e.target.value) },
                },
              }))
            }
          />
          <span>{Math.round(settings.thresholds.recommendNext * 100)}%</span>
        </label>

        <button
          type="button"
          className="ghost"
          onClick={() => void audioEngine.playFrequency(261.63, { instrument: settings.instrument })}
        >
          Play a reference middle C
        </button>

        <h2>Ads</h2>
        <p className="muted">
          Banners stay off listening and quiz screens. Your AdSense publisher ID is already on the
          site. After Google approves Earstep, create a display ad unit and put the slot ID in{' '}
          <code>src/ads/config.ts</code> as <code>MANUAL_SLOT</code>, then redeploy. See the{' '}
          <a href="/privacy.html">privacy page</a>.
        </p>
        <p className="muted">
          {adsConfigured
            ? 'Ad IDs are set. Banners can load on Home, Lessons, Stats, Settings, and session complete.'
            : 'Waiting for an ad slot ID. The verification tag is in place; banners stay hidden until the slot is added.'}
        </p>

        <button
          type="button"
          className="ghost danger"
          onClick={() => {
            if (window.confirm('Clear local progress on this device?')) {
              replace(resetProgress());
              go({ id: 'welcome' });
            }
          }}
        >
          Reset local progress
        </button>
      </section>
    </main>
  );
}
