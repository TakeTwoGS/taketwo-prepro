// Filmmaking calculators. Everything here is an estimate meant to help you plan, not a promise.

// ---------- Depth of field ----------
// "Circle of confusion" is how blurry a dot can get before your eye notices. It depends on the sensor size.
export const SENSORS = [
  { value: 'ff', label: 'Full frame', coc: 0.029 },
  { value: 'apsc', label: 'APS-C or Super 35', coc: 0.019 },
  { value: 'mft', label: 'Micro Four Thirds', coc: 0.015 },
  { value: '1in', label: '1 inch sensor', coc: 0.011 },
  { value: 'phone', label: 'Phone (main camera)', coc: 0.004 },
]
export const APERTURES = [1.2, 1.4, 1.8, 2, 2.8, 4, 5.6, 8, 11, 16, 22]

export function depthOfField({ focal, aperture, distance, coc }) {
  const f = Number(focal)
  const N = Number(aperture)
  const s = Number(distance) // millimetres
  const c = Number(coc)
  if (!(f > 0 && N > 0 && s > 0 && c > 0)) return null
  const hyperfocal = (f * f) / (N * c) + f
  const near = (s * (hyperfocal - f)) / (hyperfocal + s - 2 * f)
  const far = s >= hyperfocal ? Infinity : (s * (hyperfocal - f)) / (hyperfocal - s)
  return { hyperfocal, near, far, total: far === Infinity ? Infinity : far - near }
}

export const mmFrom = (value, unit) => (unit === 'ft' ? value * 304.8 : value * 1000)
export function fmtDistance(mm, unit) {
  if (mm === Infinity) return 'infinity'
  if (unit === 'ft') {
    const ft = mm / 304.8
    return ft >= 100 ? `${Math.round(ft)} ft` : `${ft.toFixed(ft < 10 ? 2 : 1)} ft`
  }
  const m = mm / 1000
  return m >= 100 ? `${Math.round(m)} m` : `${m.toFixed(m < 10 ? 2 : 1)} m`
}

// ---------- Storage ----------
// Typical data rates at 1080p and 24 frames per second, in megabits per second.
export const CODECS = [
  { value: 'h264', label: 'H.264 (most cameras and phones)', mbps: 50, longGop: true },
  { value: 'h265', label: 'H.265 / HEVC (efficient)', mbps: 35, longGop: true },
  { value: 'prores-lt', label: 'ProRes 422 LT', mbps: 82, longGop: false },
  { value: 'prores', label: 'ProRes 422', mbps: 117, longGop: false },
  { value: 'prores-hq', label: 'ProRes 422 HQ', mbps: 176, longGop: false },
  { value: 'prores-4444', label: 'ProRes 4444', mbps: 264, longGop: false },
  { value: 'custom', label: 'My camera says (enter Mbps)', mbps: 0, longGop: false },
]
export const RESOLUTIONS = [
  { value: '1080', label: '1080p (Full HD)', pixels: 1920 * 1080 },
  { value: '2k7', label: '2.7K', pixels: 2704 * 1520 },
  { value: 'uhd', label: '4K UHD (3840 x 2160)', pixels: 3840 * 2160 },
  { value: 'dci', label: 'DCI 4K (4096 x 2160)', pixels: 4096 * 2160 },
  { value: '6k', label: '6K', pixels: 6144 * 3456 },
]
export const FRAME_RATES = [24, 25, 30, 50, 60, 120]
export const CARDS = [64, 128, 256, 512, 1000]

// Data rate in megabits per second. Long-GOP codecs (H.264, H.265) get more efficient as the picture
// gets bigger, so they grow more slowly than the number of pixels. ProRes grows with the pixels.
export function bitrate({ codec, resolution, fps, customMbps }) {
  const c = CODECS.find((x) => x.value === codec)
  const r = RESOLUTIONS.find((x) => x.value === resolution)
  if (!c || !r) return 0
  if (codec === 'custom') return Math.max(0, Number(customMbps) || 0)
  const pixelFactor = r.pixels / (1920 * 1080)
  const fpsFactor = Number(fps) / 24
  return c.mbps * (c.longGop ? Math.pow(pixelFactor, 0.85) * Math.pow(fpsFactor, 0.8) : pixelFactor * fpsFactor)
}

export function storage({ mbps, hours = 0, minutes = 0, copies = 1 }) {
  const totalMinutes = Number(hours) * 60 + Number(minutes)
  const gbPerMinute = (mbps / 8) * 60 / 1000
  const gb = gbPerMinute * totalMinutes
  return {
    gbPerMinute,
    gbPerHour: gbPerMinute * 60,
    totalGb: gb,
    withCopiesGb: gb * Math.max(1, Number(copies) || 1),
    totalMinutes,
  }
}

export function minutesOnCard(cardGb, gbPerMinute) {
  return gbPerMinute > 0 ? (cardGb * 0.93) / gbPerMinute : 0 // cards hold a little less than the label says
}

export function fmtSize(gb) {
  if (!isFinite(gb)) return '0 GB'
  if (gb >= 1000) return `${(gb / 1000).toFixed(2)} TB`
  return `${gb >= 100 ? Math.round(gb) : gb.toFixed(gb >= 10 ? 1 : 2)} GB`
}

export function fmtMinutes(min) {
  if (!isFinite(min) || min <= 0) return '0 min'
  const h = Math.floor(min / 60)
  const m = Math.round(min % 60)
  return h ? `${h} h${m ? ` ${m} min` : ''}` : `${m} min`
}

// ---------- Script length ----------
// About one page of screenplay is one minute of film. Dialogue-heavy and action-heavy scripts drift a little.
export function runtimeFromPages(pages) {
  const p = Number(pages)
  if (!(p >= 0)) return null
  return { minutes: p, low: p * 0.85, high: p * 1.15 }
}
export function pagesFromRuntime(minutes) {
  const m = Number(minutes)
  if (!(m >= 0)) return null
  return { pages: m, low: m * 0.85, high: m * 1.15 }
}

// ---------- Aspect ratios ----------
export const ASPECTS = [
  { value: '16:9', r: 16 / 9, name: '16:9', note: 'The shape of TVs, computer screens, and YouTube. A safe choice for almost anything.' },
  { value: '2.39:1', r: 2.39, name: '2.39:1', note: 'Wide "cinemascope". Feels epic and cinematic. Great for landscapes and big spaces.' },
  { value: '1.85:1', r: 1.85, name: '1.85:1', note: 'The most common movie theater shape. A little wider than TV.' },
  { value: '4:3', r: 4 / 3, name: '4:3', note: 'The old TV shape. Feels intimate, nostalgic, or retro.' },
  { value: '1:1', r: 1, name: '1:1', note: 'A perfect square. Popular on Instagram and for a bold, artsy look.' },
  { value: '9:16', r: 9 / 16, name: '9:16', note: 'Tall and narrow. Made for phones, TikTok, Reels, and Shorts.' },
]
