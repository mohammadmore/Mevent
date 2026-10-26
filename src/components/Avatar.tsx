import React, { useEffect, useState } from 'react';

// Generated avatar for a seed (user id, title, ...). The generator is loaded on first use so it
// stays out of the main bundle; a plain circle is shown until it arrives.

let generator: Promise<typeof import('../lib/avatar')> | null = null;
let ready: typeof import('../lib/avatar') | null = null;

export function GeneratedAvatar({ seed, className = '', alt = '', loading }: { seed: string | number; className?: string; alt?: string; loading?: 'lazy' | 'eager' }) {
  const key = String(seed);
  const [src, setSrc] = useState(() => ready?.avatarDataUri(key) || '');

  useEffect(() => {
    if (ready) { setSrc(ready.avatarDataUri(key)); return; }
    let alive = true;
    // The generator is large; fetch it once the page is idle so it never competes with content.
    generator ??= new Promise<void>(resolve => {
      const w = window as any;
      if (w.requestIdleCallback) w.requestIdleCallback(() => resolve(), { timeout: 2500 });
      else setTimeout(resolve, 1200);
    }).then(() => import('../lib/avatar'));
    generator.then(m => { ready = m; if (alive) setSrc(m.avatarDataUri(key)); });
    return () => { alive = false; };
  }, [key]);

  if (!src) return <span aria-hidden className={`${className} inline-block bg-gray-200 dark:bg-white/10`} />;
  return <img src={src} alt={alt} className={className} loading={loading} />;
}
