import { createAvatar } from '@dicebear/core';
import * as notionists from '@dicebear/notionists';

// Same "notionists" avatars the app used to fetch from api.dicebear.com, generated in the browser.

const cache = new Map<string, string>();

export function avatarDataUri(seed: string): string {
  let uri = cache.get(seed);
  if (!uri) {
    uri = createAvatar(notionists, { seed, backgroundColor: ['transparent'] }).toDataUri();
    cache.set(seed, uri);
  }
  return uri;
}
