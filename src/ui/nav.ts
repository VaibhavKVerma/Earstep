import type { PracticeConfig, SessionSummary } from '../training/types';

export type Screen =
  | { id: 'welcome' }
  | { id: 'onboarding' }
  | { id: 'home' }
  | { id: 'practice' }
  | { id: 'train'; config: PracticeConfig; heading?: string }
  | { id: 'complete'; summary: SessionSummary; config: PracticeConfig }
  | { id: 'lessons' }
  | { id: 'lesson'; lessonId: string }
  | { id: 'stats' }
  | { id: 'settings' }
  | { id: 'daily' }
  | { id: 'one-note' }
  | { id: 'octave' }
  | { id: 'guitar-find' }
  | { id: 'intervals' }
  | { id: 'melody' }
  | { id: 'song' }
  | { id: 'hear-sing-find' };

export type Go = (screen: Screen) => void;
