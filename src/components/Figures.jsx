import { skeleton, unitScale } from '../lib/figures.js'

function Layer({ p, color, under }) {
  const sk = skeleton(p)
  const stroke = under ? '#0b0810' : color
  const grow = under ? 4 : 0
  const line = (a, b, w) => <line x1={a[0]} y1={a[1]} x2={b[0]} y2={b[1]} strokeWidth={w + grow} />
  const poly = (pts, w) => <polyline points={pts.map((q) => q.join(',')).join(' ')} strokeWidth={w + grow} />
  const neckEnd = [sk.S[0] + (sk.head[0] - sk.S[0]) * 0.35, sk.S[1] + (sk.head[1] - sk.S[1]) * 0.35]
  return (
    <g fill={stroke} stroke={stroke} strokeLinecap="round" strokeLinejoin="round" opacity={under ? 0.55 : 1}>
      {line(sk.H, sk.S, 15)}
      {line(sk.ll.hp, sk.rl.hp, 11)}
      {line(sk.la.sh, sk.ra.sh, 8)}
      {line(sk.S, neckEnd, 5)}
      <g fill="none">
        {poly([sk.la.sh, sk.la.e, sk.la.w], 7)}
        {poly([sk.ra.sh, sk.ra.e, sk.ra.w], 7)}
        {poly([sk.ll.hp, sk.ll.k, sk.ll.a], 8)}
        {poly([sk.rl.hp, sk.rl.k, sk.rl.a], 8)}
      </g>
      <circle cx={sk.la.w[0]} cy={sk.la.w[1]} r={4.5 + grow / 2} stroke="none" />
      <circle cx={sk.ra.w[0]} cy={sk.ra.w[1]} r={4.5 + grow / 2} stroke="none" />
      <ellipse cx={sk.ll.a[0] + 4} cy={sk.ll.a[1] + 2} rx={8 + grow / 2} ry={3.6 + grow / 2} stroke="none" />
      <ellipse cx={sk.rl.a[0] + 4} cy={sk.rl.a[1] + 2} rx={8 + grow / 2} ry={3.6 + grow / 2} stroke="none" />
      <circle cx={sk.head[0]} cy={sk.head[1]} r={10 + grow / 2} stroke="none" />
    </g>
  )
}

// A figure placed in a frame (W x H is the frame's drawing space)
export function FigureShape({ mark, W, H, children }) {
  const k = unitScale(mark, H)
  return (
    <g transform={`translate(${mark.x * W},${mark.y * H}) rotate(${mark.r || 0}) scale(${(mark.f ? -1 : 1) * k},${k})`}>
      <Layer p={mark.p} color={mark.c} under />
      <Layer p={mark.p} color={mark.c} />
      {children}
    </g>
  )
}

// A small preview of a pose, for the pose picker
export function FigureThumb({ pose, color = '#e7defa', rotate = 0 }) {
  return (
    <svg viewBox="-58 -72 116 132" aria-hidden="true">
      <g transform={`rotate(${rotate})`}>
        <Layer p={pose} color={color} />
      </g>
    </svg>
  )
}
