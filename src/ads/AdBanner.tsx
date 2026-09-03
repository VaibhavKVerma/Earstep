import { useEffect, useRef } from 'react';
import { ADSENSE_CLIENT, ADSENSE_SLOT, adsConfigured } from './config';

declare global {
  interface Window {
    adsbygoogle?: Record<string, unknown>[];
  }
}

function ensureAdSenseScript(client: string) {
  const src = `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${encodeURIComponent(client)}`;
  if (document.querySelector(`script[src="${src}"]`)) return;
  const script = document.createElement('script');
  script.async = true;
  script.crossOrigin = 'anonymous';
  script.src = src;
  document.head.appendChild(script);
}

export function AdBanner() {
  const pushed = useRef(false);

  useEffect(() => {
    if (!adsConfigured) return;
    ensureAdSenseScript(ADSENSE_CLIENT);
    if (pushed.current) return;
    pushed.current = true;
    try {
      (window.adsbygoogle = window.adsbygoogle || []).push({});
    } catch {
      pushed.current = false;
    }
  }, []);

  if (!adsConfigured) {
    if (!import.meta.env.DEV) return null;
    return (
      <aside className="ad-slot ad-slot-placeholder" aria-label="Advertisement placeholder">
        <span>Advertisement</span>
        <small>Add your AdSense IDs in src/ads/config.ts or Netlify env vars, then redeploy.</small>
      </aside>
    );
  }

  return (
    <aside className="ad-slot" aria-label="Advertisement">
      <ins
        className="adsbygoogle"
        style={{ display: 'block' }}
        data-ad-client={ADSENSE_CLIENT}
        data-ad-slot={ADSENSE_SLOT}
        data-ad-format="auto"
        data-full-width-responsive="true"
      />
    </aside>
  );
}
