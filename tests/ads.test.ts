import { describe, expect, it } from 'vitest';
import { shouldShowAd } from '../src/ads/config';

describe('ad placement', () => {
  it('shows ads on browsing screens', () => {
    expect(shouldShowAd('home')).toBe(true);
    expect(shouldShowAd('practice')).toBe(true);
    expect(shouldShowAd('lessons')).toBe(true);
    expect(shouldShowAd('stats')).toBe(true);
    expect(shouldShowAd('settings')).toBe(true);
    expect(shouldShowAd('complete')).toBe(true);
  });

  it('hides ads while the user is listening or answering', () => {
    expect(shouldShowAd('welcome')).toBe(false);
    expect(shouldShowAd('onboarding')).toBe(false);
    expect(shouldShowAd('train')).toBe(false);
    expect(shouldShowAd('song')).toBe(false);
    expect(shouldShowAd('intervals')).toBe(false);
    expect(shouldShowAd('lesson')).toBe(false);
  });
});
