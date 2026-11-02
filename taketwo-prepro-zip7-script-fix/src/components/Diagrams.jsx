// Small drawings that explain filmmaking ideas. Everything is plain SVG, so it stays sharp and loads instantly.

const SKIN = '#f2c9a8'
const BODY = '#b199ff'
const DARK = '#14101c'

export function World({ id }) {
  return (
    <>
      <defs>
        <linearGradient id={`sky-${id}`} x1="0" x2="0" y1="0" y2="1">
          <stop offset="0" stopColor="#1d1638" />
          <stop offset="1" stopColor="#7a4a9a" />
        </linearGradient>
      </defs>
      <rect x="-2400" y="-1400" width="5200" height="1730" fill={`url(#sky-${id})`} />
      <circle cx="560" cy="-120" r="70" fill="#ffd9a0" opacity="0.9" />
      <path d="M-2400 330 L-1500 -60 L-1000 150 L-400 -120 L200 140 L800 -40 L1500 160 L2400 330Z" fill="#33284a" />
      <rect x="-2400" y="330" width="5200" height="1000" fill="#1c1624" />
      <path d="M-2400 330H2800" stroke="#4a3b66" strokeWidth="3" />
    </>
  )
}

export function Figure({ x = 100, tone = BODY }) {
  return (
    <g transform={`translate(${x},0)`}>
      <rect x="-36" y="190" width="32" height="140" rx="6" fill="#3a2f55" />
      <rect x="4" y="190" width="32" height="140" rx="6" fill="#3a2f55" />
      <rect x="-54" y="92" width="16" height="100" rx="8" fill={tone} />
      <rect x="38" y="92" width="16" height="100" rx="8" fill={tone} />
      <path d="M-38 94 Q-38 84 -26 84 H26 Q38 84 38 94 V196 H-38 Z" fill={tone} />
      <rect x="-7" y="78" width="14" height="14" fill={SKIN} />
      <circle cx="0" cy="58" r="23" fill={SKIN} />
      <ellipse cx="-8" cy="56" rx="3" ry="2.2" fill={DARK} />
      <ellipse cx="8" cy="56" rx="3" ry="2.2" fill={DARK} />
      <path d="M-6 68 Q0 72 6 68" stroke={DARK} strokeWidth="1.6" fill="none" strokeLinecap="round" />
      <path d="M-23 52 Q-22 32 0 31 Q22 32 23 52 Q10 40 -23 52Z" fill="#2b2038" />
    </g>
  )
}

const BOX = {
  ews: '-700 -300 1600 900',
  ws: '-250 -20 700 394',
  mws: '-122 15 444 250',
  ms: '-60 25 320 180',
  mcu: '-11 28 222 125',
  cu: '40 30 120 67.5',
  ecu: '76 48 48 27',
}

// One drawing per shot size
export function ShotFrame({ kind, uid = 'a' }) {
  const id = `${kind}-${uid}`
  if (BOX[kind]) {
    return (
      <svg viewBox={BOX[kind]} preserveAspectRatio="xMidYMid slice" role="img" aria-label={`Example of a ${kind} shot`}>
        <World id={id} />
        <Figure />
      </svg>
    )
  }
  if (kind === 'two') {
    return (
      <svg viewBox="-90 25 380 214" preserveAspectRatio="xMidYMid slice" role="img" aria-label="Example of a two shot">
        <World id={id} />
        <Figure x={30} />
        <Figure x={175} tone="#f272d8" />
      </svg>
    )
  }
  if (kind === 'ots') {
    return (
      <svg viewBox="0 0 320 180" preserveAspectRatio="xMidYMid slice" role="img" aria-label="Example of an over the shoulder shot">
        <World id={id} />
        <rect x="0" y="0" width="320" height="180" fill="#1d1638" opacity="0.5" />
        <g transform="translate(205,70) scale(0.55)">
          <circle cx="0" cy="0" r="23" fill={SKIN} />
          <ellipse cx="-8" cy="-2" rx="3" ry="2.2" fill={DARK} />
          <ellipse cx="8" cy="-2" rx="3" ry="2.2" fill={DARK} />
          <path d="M-23 -6 Q-22 -26 0 -27 Q22 -26 23 -6 Q10 -18 -23 -6Z" fill="#2b2038" />
          <path d="M-45 110 Q-40 28 0 26 Q40 28 45 110Z" fill="#f272d8" />
        </g>
        <path d="M-10 190 Q5 118 70 124 Q135 120 160 190Z" fill={DARK} />
        <circle cx="72" cy="86" r="42" fill="#0f0b14" />
      </svg>
    )
  }
  if (kind === 'pov') {
    return (
      <svg viewBox="0 0 320 180" preserveAspectRatio="xMidYMid slice" role="img" aria-label="Example of a point of view shot">
        <rect width="320" height="180" fill="#241b34" />
        <rect y="120" width="320" height="60" fill="#18121f" />
        <rect x="120" y="22" width="80" height="120" rx="4" fill="#3b2d55" stroke="#6a548f" strokeWidth="3" />
        <circle cx="185" cy="86" r="5" fill="#ffd9a0" />
        <path d="M70 180 Q76 128 108 134 Q132 140 140 180Z" fill={SKIN} />
        <path d="M250 180 Q244 128 212 134 Q188 140 180 180Z" fill={SKIN} />
      </svg>
    )
  }
  // insert: a close shot of an object
  return (
    <svg viewBox="0 0 320 180" preserveAspectRatio="xMidYMid slice" role="img" aria-label="Example of an insert shot">
      <rect width="320" height="180" fill="#2a2030" />
      <rect x="105" y="14" width="110" height="152" rx="14" fill="#0f0b14" stroke="#6a548f" strokeWidth="3" />
      <rect x="115" y="30" width="90" height="120" rx="6" fill="#3b2d55" />
      <rect x="123" y="44" width="62" height="16" rx="8" fill="#b199ff" />
      <rect x="135" y="68" width="62" height="16" rx="8" fill="#f272d8" />
      <rect x="123" y="92" width="48" height="16" rx="8" fill="#b199ff" />
    </svg>
  )
}

// ---------- camera movements ----------
export function MoveDemo({ kind }) {
  const sceneId = `mv-${kind}`
  return (
    <div className={'mv-demo mv-' + kind.toLowerCase()} role="img" aria-label={`Animated example of a ${kind} movement`}>
      <svg viewBox="0 0 480 270" preserveAspectRatio="xMidYMid slice">
        <defs>
          <linearGradient id={sceneId} x1="0" x2="0" y1="0" y2="1">
            <stop offset="0" stopColor="#1d1638" />
            <stop offset="1" stopColor="#8a5aa8" />
          </linearGradient>
        </defs>
        <g className="mv-all">
          <rect x="-400" y="-500" width="1280" height="1000" fill={`url(#${sceneId})`} />
          <g className="mv-layer far">
            <circle cx="380" cy="80" r="30" fill="#ffd9a0" opacity="0.9" />
            <path d="M-400 200 L-250 100 L-140 170 L0 70 L130 175 L260 95 L400 180 L560 110 L680 200Z" fill="#33284a" />
          </g>
          <g className="mv-layer mid">
            <rect x="-260" y="190" width="1000" height="200" fill="#241b34" />
            <rect x="330" y="140" width="80" height="62" fill="#4b3a6b" />
            <path d="M322 142 L370 108 L418 142Z" fill="#6a4a90" />
            <rect x="358" y="165" width="22" height="37" fill="#1d1638" />
            <rect x="60" y="150" width="14" height="52" fill="#3b2d55" />
            <circle cx="67" cy="136" r="34" fill="#4b3a6b" />
            <rect x="-120" y="164" width="12" height="38" fill="#3b2d55" />
            <circle cx="-114" cy="152" r="26" fill="#4b3a6b" />
          </g>
          <g className="mv-layer near">
            <rect x="-300" y="228" width="1100" height="200" fill="#18121f" />
            {[-200, -120, -40, 40, 120, 200, 280, 360, 440, 520, 600].map((x) => (
              <rect key={x} x={x} y="200" width="9" height="44" fill="#6a548f" />
            ))}
            <rect x="-300" y="212" width="1100" height="7" fill="#6a548f" />
            <circle cx="140" cy="250" r="12" fill="#f272d8" />
            <circle cx="360" cy="256" r="10" fill="#ffd9a0" />
          </g>
          <g className="mv-subject">
            <g transform="translate(240,150) scale(0.42)">
              <rect x="-36" y="190" width="32" height="100" rx="6" fill="#3a2f55" />
              <rect x="4" y="190" width="32" height="100" rx="6" fill="#3a2f55" />
              <path d="M-38 94 Q-38 84 -26 84 H26 Q38 84 38 94 V196 H-38 Z" fill={BODY} />
              <rect x="-54" y="92" width="16" height="96" rx="8" fill={BODY} />
              <rect x="38" y="92" width="16" height="96" rx="8" fill={BODY} />
              <circle cx="0" cy="58" r="23" fill={SKIN} />
              <path d="M-23 52 Q-22 32 0 31 Q22 32 23 52 Q10 40 -23 52Z" fill="#2b2038" />
            </g>
          </g>
        </g>
      </svg>
      <span className="mv-badge">{kind}</span>
    </div>
  )
}

// ---------- camera angles (side view) ----------
export function AngleDiagram({ kind }) {
  const cams = { eye: { x: 40, y: 92, rot: 0 }, high: { x: 52, y: 38, rot: 28 }, low: { x: 52, y: 128, rot: -28 } }
  const c = cams[kind] || cams.eye
  const label = { eye: 'Eye level', high: 'High angle', low: 'Low angle' }[kind]
  return (
    <figure className="angle-fig">
      <svg viewBox="0 0 240 150" role="img" aria-label={`${label}: camera position`}>
        <rect width="240" height="150" rx="10" fill="#120e19" />
        <line x1="10" y1="140" x2="230" y2="140" stroke="#4a3b66" strokeWidth="2" />
        <g transform="translate(185,0)">
          <circle cx="0" cy="84" r="9" fill={SKIN} />
          <rect x="-9" y="94" width="18" height="30" rx="5" fill={BODY} />
          <rect x="-8" y="124" width="6" height="16" fill="#3a2f55" />
          <rect x="2" y="124" width="6" height="16" fill="#3a2f55" />
        </g>
        <line x1={c.x + 14} y1={c.y} x2="170" y2="90" stroke="#ffd9a0" strokeWidth="1.5" strokeDasharray="5 4" />
        <g transform={`translate(${c.x},${c.y}) rotate(${c.rot})`}>
          <rect x="-16" y="-10" width="26" height="20" rx="3" fill="#f272d8" />
          <path d="M10 -6 L22 -12 L22 12 L10 6Z" fill="#b199ff" />
        </g>
      </svg>
      <figcaption>{label}</figcaption>
    </figure>
  )
}

// ---------- the 180 degree rule ----------
export function Rule180() {
  return (
    <svg viewBox="0 0 340 230" className="rule180" role="img" aria-label="Diagram of the 180 degree rule">
      <rect width="340" height="230" rx="12" fill="#120e19" />
      <path d="M40 115 A130 100 0 0 1 300 115Z" fill="#5fdc97" opacity="0.12" />
      <line x1="30" y1="115" x2="310" y2="115" stroke="#ffd9a0" strokeWidth="2" strokeDasharray="8 6" />
      <text x="170" y="132" textAnchor="middle" fill="#ffd9a0" fontSize="11">line between the two people</text>
      <circle cx="105" cy="115" r="16" fill="#b199ff" />
      <text x="105" y="119" textAnchor="middle" fill="#14101c" fontSize="12" fontWeight="700">A</text>
      <circle cx="235" cy="115" r="16" fill="#f272d8" />
      <text x="235" y="119" textAnchor="middle" fill="#14101c" fontSize="12" fontWeight="700">B</text>
      {[{ x: 120, y: 40, r: 25 }, { x: 170, y: 28, r: 0 }, { x: 222, y: 40, r: -25 }].map((c) => (
        <g key={c.x} transform={`translate(${c.x},${c.y}) rotate(${90 + c.r})`}>
          <rect x="-12" y="-8" width="20" height="16" rx="3" fill="#5fdc97" />
          <path d="M8 -5 L18 -10 L18 10 L8 5Z" fill="#9cf0c4" />
        </g>
      ))}
      <text x="170" y="22" textAnchor="middle" fill="#5fdc97" fontSize="11" fontWeight="600">Keep the camera on this side</text>
      <g transform="translate(170,190) rotate(-90)">
        <rect x="-12" y="-8" width="20" height="16" rx="3" fill="#ff7a7a" />
        <path d="M8 -5 L18 -10 L18 10 L8 5Z" fill="#ffb0b0" />
      </g>
      <path d="M150 172 L190 208 M190 172 L150 208" stroke="#ff7a7a" strokeWidth="3" strokeLinecap="round" />
      <text x="235" y="205" fill="#ff9a9a" fontSize="11">Do not cross</text>
    </svg>
  )
}

// ---------- continuity ----------
function Table({ cupX, label }) {
  return (
    <figure className="cont-fig">
      <svg viewBox="0 0 200 120" role="img" aria-label={label}>
        <rect width="200" height="120" rx="8" fill="#241b34" />
        <rect x="0" y="78" width="200" height="42" fill="#18121f" />
        <circle cx="100" cy="42" r="14" fill={SKIN} />
        <rect x="84" y="56" width="32" height="24" rx="6" fill={BODY} />
        <rect x={cupX} y="66" width="14" height="14" rx="2" fill="#ffd9a0" />
        <path d={`M${cupX + 14} 70 q6 0 6 6 t-6 6`} stroke="#ffd9a0" strokeWidth="2" fill="none" />
      </svg>
      <figcaption>{label}</figcaption>
    </figure>
  )
}
export function ContinuityDemo() {
  return (
    <div className="cont-pair">
      <Table cupX={40} label="Shot 1: cup on the left" />
      <Table cupX={146} label="Shot 2: the cup jumped to the right" />
    </div>
  )
}

// ---------- storyboard sketches ----------
export function StoryboardSketch() {
  const frame = { fill: '#1b1524', stroke: '#6a548f', strokeWidth: 2 }
  const line = { stroke: '#e7defa', strokeWidth: 2.5, fill: 'none', strokeLinecap: 'round', strokeLinejoin: 'round' }
  return (
    <div className="sketch-row" role="img" aria-label="Three simple storyboard frames">
      <figure>
        <svg viewBox="0 0 160 90">
          <rect width="160" height="90" rx="4" {...frame} />
          <path d="M10 70 H150 M30 70 V40 H90 V70 M100 70 V50 H140 V70" {...line} />
          <circle cx="60" cy="56" r="4" {...line} />
        </svg>
        <figcaption>1. Wide: the room</figcaption>
      </figure>
      <figure>
        <svg viewBox="0 0 160 90">
          <rect width="160" height="90" rx="4" {...frame} />
          <circle cx="80" cy="34" r="14" {...line} />
          <path d="M50 88 Q50 56 80 54 Q110 56 110 88" {...line} />
        </svg>
        <figcaption>2. Medium: she sits down</figcaption>
      </figure>
      <figure>
        <svg viewBox="0 0 160 90">
          <rect width="160" height="90" rx="4" {...frame} />
          <path d="M50 70 Q60 40 90 44 L110 36 M90 44 L114 50 M90 44 L106 62" {...line} />
          <path d="M30 20 L70 36 M62 26 L72 36 L60 40" stroke="#f272d8" strokeWidth="3" fill="none" strokeLinecap="round" />
        </svg>
        <figcaption>3. Close-up: her hand. Arrow shows the move</figcaption>
      </figure>
    </div>
  )
}
