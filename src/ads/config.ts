/** Publisher ID from the google-adsense-account meta tag. Slot comes after you create an ad unit. */
const MANUAL_CLIENT = 'ca-pub-4765016864072453';
const MANUAL_SLOT = '';

export const ADSENSE_CLIENT = (import.meta.env.VITE_ADSENSE_CLIENT || MANUAL_CLIENT).trim();
export const ADSENSE_SLOT = (import.meta.env.VITE_ADSENSE_SLOT || MANUAL_SLOT).trim();

export const adsConfigured = Boolean(ADSENSE_CLIENT && ADSENSE_SLOT);

const QUIET_SCREENS = new Set([
  'welcome',
  'onboarding',
  'train',
  'daily',
  'one-note',
  'octave',
  'guitar-find',
  'intervals',
  'melody',
  'song',
  'hear-sing-find',
  'lesson',
]);

export function shouldShowAd(screenId: string): boolean {
  return !QUIET_SCREENS.has(screenId);
}
