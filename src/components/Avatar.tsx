import React, { useEffect, useState } from 'react';

// Generated avatar for a seed (user id, title, ...). The generator is loaded on first use so it
// stays out of the main bundle; a plain circle is shown for that moment.

let generator: Promise<typeof import('../lib/avatar')> | null = null;
let ready: typeof import('../lib/avatar') | null = null;

export function GeneratedAvatar({ seed, className = '', alt = '', loading }: { seed: string | number; className?: string; alt?: string; loading?: 'lazy' | 'eager' }) {
  const key = String(seed);
  const [src, setSrc] = useState(() => ready?.avatarDataUri(key) || '');

  useEffect(() => {
    if (ready) { setSrc(ready.avatarDataUri(key)); return; }
    let alive = true;
    generator ??= import('../lib/avatar');
    generator.then(m => { ready = m; if (alive) setSrc(m.avatarDataUri(key)); });
    return () => { alive = false; };
  }, [key]);

  if (!src) return <span aria-hidden className={`${className} inline-block bg-gray-200 dark:bg-white/10`} />;
  return <img src={src} alt={alt} className={className} loading={loading} />;
}
