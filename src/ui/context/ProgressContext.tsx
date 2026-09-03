import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { audioEngine } from '../../audio/AudioEngine';
import {
  defaultProgress,
  loadProgress,
  saveProgress,
  userLevel,
} from '../../persistence/store';
import type { UserProgress } from '../../training/types';

interface ProgressApi {
  progress: UserProgress;
  update: (recipe: (current: UserProgress) => UserProgress) => void;
  replace: (next: UserProgress) => void;
  level: number;
}

const ProgressContext = createContext<ProgressApi | null>(null);

export function ProgressProvider({ children }: { children: ReactNode }) {
  const [progress, setProgress] = useState<UserProgress>(() => loadProgress());

  useEffect(() => {
    saveProgress(progress);
    document.documentElement.dataset.theme = progress.settings.theme;
    document.documentElement.style.colorScheme = progress.settings.theme;
    document
      .querySelector('meta[name="theme-color"]')
      ?.setAttribute('content', progress.settings.theme === 'dark' ? '#1c1612' : '#f3eadc');
    audioEngine.setVolume(progress.settings.volume);
    audioEngine.setSoundSource(progress.settings.soundSource);
  }, [progress]);

  const update = useCallback((recipe: (current: UserProgress) => UserProgress) => {
    setProgress((current) => recipe(current));
  }, []);

  const value = useMemo<ProgressApi>(
    () => ({
      progress,
      update,
      replace: setProgress,
      level: userLevel(progress.xp),
    }),
    [progress, update],
  );

  return <ProgressContext.Provider value={value}>{children}</ProgressContext.Provider>;
}

export function useProgress(): ProgressApi {
  const value = useContext(ProgressContext);
  if (!value) throw new Error('useProgress must be used inside ProgressProvider');
  return value;
}

export function resetProgress(): UserProgress {
  const fresh = defaultProgress();
  saveProgress(fresh);
  return fresh;
}
