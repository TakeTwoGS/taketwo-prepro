// Gives every project its own color, based on its title, so the dashboard is easy to scan
const TONES = ['pink', 'violet', 'blue', 'teal', 'amber', 'rose']

export function toneFor(text) {
  let h = 0
  for (const ch of String(text || '')) h = (h * 31 + ch.charCodeAt(0)) >>> 0
  return TONES[h % TONES.length]
}
