// Coordinates typed by hand or pasted from a map app (Neshan, Balad, Google Maps).

/** Reads "35.7, 51.4" or a map link that carries coordinates. */
export function parseCoordinates(text: string): { lat: number; lng: number } | null {
  const t = text.replace(/[۰-۹]/g, d => String('۰۱۲۳۴۵۶۷۸۹'.indexOf(d))).replace(/٫/g, '.');
  const patterns = [
    /[?&]lat(?:itude)?=(-?\d+(?:\.\d+)?)&(?:amp;)?(?:lng|longitude)=(-?\d+(?:\.\d+)?)/,
    /@(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)/,
    /[?&](?:q|query|ll)=(-?\d+(?:\.\d+)?),\s*(-?\d+(?:\.\d+)?)/,
    /^\s*(-?\d+(?:\.\d+)?)\s*[,،\s]\s*(-?\d+(?:\.\d+)?)\s*$/,
  ];
  for (const re of patterns) {
    const m = t.match(re);
    if (m) {
      const lat = parseFloat(m[1]), lng = parseFloat(m[2]);
      if (Math.abs(lat) <= 90 && Math.abs(lng) <= 180) return { lat, lng };
    }
  }
  return null;
}
