/** Publisher ID from the google-adsense-account meta tag. Slot comes after you create an ad unit. */
const MANUAL_CLIENT = 'ca-pub-4765016864072453';
const MANUAL_SLOT = '';

export const ADSENSE_CLIENT = (import.meta.env.VITE_ADSENSE_CLIENT || MANUAL_CLIENT).trim();
export const ADSENSE_SLOT = (import.meta.env.VITE_ADSENSE_SLOT || MANUAL_SLOT).trim();

export const adsConfigured = Boolean(ADSENSE_CLIENT && ADSENSE_SLOT);

/**
 * Google does not allow ads on screens without publisher content:
 * quizzes, settings, stats, setup forms, session alerts, and navigation maps.
 * The trainer SPA is a practice tool. Ads load only on the static guide pages.
 */
const CONTENT_SCREENS = new Set<string>();

export function shouldShowAd(screenId: string): boolean {
  return CONTENT_SCREENS.has(screenId);
}
