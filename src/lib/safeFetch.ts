import dns from 'dns/promises';
import net from 'net';

// Guards server-side fetches of user-supplied URLs (crawler) against SSRF:
// only http(s), no credentials in the URL, and no hosts that resolve to
// loopback, private, link-local or otherwise internal addresses.

function isPrivateIPv4(ip: string): boolean {
  const [a, b] = ip.split('.').map(Number);
  return (
    a === 0 ||
    a === 10 ||
    a === 127 ||
    (a === 100 && b >= 64 && b <= 127) ||
    (a === 169 && b === 254) ||
    (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && b === 168) ||
    (a === 198 && (b === 18 || b === 19)) ||
    a >= 224
  );
}

function isPrivateIP(ip: string): boolean {
  if (net.isIPv4(ip)) return isPrivateIPv4(ip);
  const lower = ip.toLowerCase();
  if (lower.startsWith('::ffff:')) return isPrivateIP(lower.slice(7));
  return (
    lower === '::' ||
    lower === '::1' ||
    lower.startsWith('fc') ||
    lower.startsWith('fd') ||
    lower.startsWith('fe80') ||
    lower.startsWith('ff')
  );
}

async function assertPublicUrl(rawUrl: string): Promise<URL> {
  let url: URL;
  try {
    url = new URL(rawUrl);
  } catch {
    throw new Error('آدرس وارد شده معتبر نیست.');
  }
  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    throw new Error('فقط آدرس‌های http و https مجاز هستند.');
  }
  if (url.username || url.password) {
    throw new Error('آدرس نباید شامل نام کاربری یا رمز عبور باشد.');
  }
  const host = url.hostname.replace(/^\[|\]$/g, '');
  const addresses = net.isIP(host) ? [host] : (await dns.lookup(host, { all: true })).map(a => a.address);
  if (addresses.length === 0 || addresses.some(isPrivateIP)) {
    throw new Error('دسترسی به این آدرس مجاز نیست.');
  }
  return url;
}

export async function safeFetchText(rawUrl: string, { maxRedirects = 3, timeoutMs = 15000, maxBytes = 2_000_000 } = {}): Promise<string> {
  let current = rawUrl;
  for (let hop = 0; hop <= maxRedirects; hop++) {
    const url = await assertPublicUrl(current);
    const res = await fetch(url, { redirect: 'manual', signal: AbortSignal.timeout(timeoutMs) });
    if (res.status >= 300 && res.status < 400 && res.headers.get('location')) {
      current = new URL(res.headers.get('location')!, url).toString();
      continue;
    }
    if (!res.ok) throw new Error(`دریافت صفحه با خطای ${res.status} مواجه شد.`);
    const text = await res.text();
    return text.length > maxBytes ? text.slice(0, maxBytes) : text;
  }
  throw new Error('تعداد ریدایرکت‌ها بیش از حد مجاز است.');
}
