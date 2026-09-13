import { describe, expect, it } from 'vitest';
import { shouldShowAd } from '../src/ads/config';

describe('ad placement', () => {
  it('keeps Google ads off the trainer SPA', () => {
    for (const screen of [
      'home',
      'welcome',
      'onboarding',
      'practice',
      'train',
      'complete',
      'daily',
      'journey',
      'level',
      'lessons',
      'lesson',
      'stats',
      'settings',
      'one-note',
      'octave',
      'guitar-find',
      'intervals',
      'melody',
      'song',
      'hear-sing-find',
    ]) {
      expect(shouldShowAd(screen)).toBe(false);
    }
  });
});
