// Pen strokes and arrows drawn on top of a storyboard frame.
// Positions are saved as fractions (0 to 1) of the frame, so they fit any size.

function Arrow({ m, W, H }) {
  const [ax, ay] = [m.a[0] * W, m.a[1] * H]
  const [bx, by] = [m.b[0] * W, m.b[1] * H]
  const ang = Math.atan2(by - ay, bx - ax)
  const len = 30
  const spread = 0.5
  const p1 = [bx - len * Math.cos(ang - spread), by - len * Math.sin(ang - spread)]
  const p2 = [bx - len * Math.cos(ang + spread), by - len * Math.sin(ang + spread)]
  return (
    <g stroke={m.c} strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" fill="none">
      <line x1={ax} y1={ay} x2={bx} y2={by} />
      <polyline points={`${p1[0]},${p1[1]} ${bx},${by} ${p2[0]},${p2[1]}`} />
    </g>
  )
}

export default function MarksOverlay({ marks = [], ratio = 16 / 9, draft = null }) {
  const W = 1000
  const H = W / ratio
  const all = draft ? [...marks, draft] : marks
  if (!all.length) return null
  return (
    <svg className="marks" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" aria-hidden="true">
      {all.map((m, i) =>
        m.t === 'arrow' ? (
          <Arrow key={i} m={m} W={W} H={H} />
        ) : m.p.length === 1 ? (
          <circle key={i} cx={m.p[0][0] * W} cy={m.p[0][1] * H} r="3.5" fill={m.c} />
        ) : (
          <polyline
            key={i}
            points={m.p.map(([x, y]) => `${x * W},${y * H}`).join(' ')}
            fill="none"
            stroke={m.c}
            strokeWidth="6"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        )
      )}
    </svg>
  )
}
