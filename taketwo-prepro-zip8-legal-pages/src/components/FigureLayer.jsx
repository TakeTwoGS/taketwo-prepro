import { useRef } from 'react'
import { angleAround, clampScale, jointPoints, poseWithJoint, skeleton, toLocal, unitScale } from '../lib/figures.js'

const round = (v) => Math.round(v * 10000) / 10000

// The part of the frame editor that lets you grab, turn, resize, and pose the people on a frame.
// It sits on top of the picture while the People tool is on.
export default function FigureLayer({ marks, ratio, selectedId, setSelectedId, joints, onLive, onCommit, stageRef }) {
  const W = 1000
  const H = W / ratio
  const drag = useRef(null)
  const live = useRef(null)

  const point = (e) => {
    const r = stageRef.current.getBoundingClientRect()
    return [((e.clientX - r.left) / r.width) * W, ((e.clientY - r.top) / r.height) * H]
  }
  const setMark = (id, patch) => {
    const next = (live.current || marks).map((m) => (m.id === id ? { ...m, ...patch } : m))
    live.current = next
    onLive(next)
  }

  function start(e, id, kind, extra = {}) {
    e.stopPropagation()
    e.currentTarget.ownerSVGElement?.setPointerCapture?.(e.pointerId)
    const m = marks.find((x) => x.id === id)
    setSelectedId(id)
    drag.current = { id, kind, start: point(e), m, ...extra }
  }

  function move(e) {
    const d = drag.current
    if (!d) return
    const pt = point(e)
    const m = d.m
    if (d.kind === 'move') {
      const nx = Math.min(1.2, Math.max(-0.2, m.x + (pt[0] - d.start[0]) / W))
      const ny = Math.min(1.3, Math.max(-0.3, m.y + (pt[1] - d.start[1]) / H))
      setMark(d.id, { x: round(nx), y: round(ny) })
    } else if (d.kind === 'rotate') {
      setMark(d.id, { r: Math.round(angleAround(m.x * W, m.y * H, pt[0], pt[1])) })
    } else if (d.kind === 'scale') {
      const c = [m.x * W, m.y * H]
      const d0 = Math.hypot(d.start[0] - c[0], d.start[1] - c[1]) || 1
      const d1 = Math.hypot(pt[0] - c[0], pt[1] - c[1])
      setMark(d.id, { s: round(clampScale(m.s * (d1 / d0))) })
    } else if (d.kind === 'joint') {
      setMark(d.id, { p: poseWithJoint(m, d.joint, toLocal(m, pt, W, H)) })
    }
  }

  function end() {
    if (drag.current && live.current) onCommit(live.current)
    drag.current = null
    live.current = null
  }

  const figs = marks.filter((m) => m.t === 'fig')

  return (
    <svg
      className="fig-layer"
      viewBox={`0 0 ${W} ${H}`}
      preserveAspectRatio="none"
      onPointerMove={move}
      onPointerUp={end}
      onPointerCancel={end}
      onPointerDown={() => setSelectedId(null)}
    >
      {figs.map((m) => {
        const sk = skeleton(m.p)
        const k = unitScale(m, H)
        const sel = m.id === selectedId
        const h = 13 / k // handles stay the same size on screen, whatever the figure's size
        const k2 = (m.f ? -1 : 1) * k
        return (
          <g key={m.id} transform={`translate(${m.x * W},${m.y * H}) rotate(${m.r || 0}) scale(${k2},${k})`}>
            {/* invisible, generous grab areas along the body */}
            <g className="fig-hit" fill="none" stroke="transparent" strokeLinecap="round" strokeWidth={26} pointerEvents="stroke" onPointerDown={(e) => start(e, m.id, 'move')}>
              <polyline points={[sk.H, sk.S].map((q) => q.join(',')).join(' ')} strokeWidth={34} />
              <polyline points={[sk.la.sh, sk.la.e, sk.la.w].map((q) => q.join(',')).join(' ')} />
              <polyline points={[sk.ra.sh, sk.ra.e, sk.ra.w].map((q) => q.join(',')).join(' ')} />
              <polyline points={[sk.ll.hp, sk.ll.k, sk.ll.a].map((q) => q.join(',')).join(' ')} />
              <polyline points={[sk.rl.hp, sk.rl.k, sk.rl.a].map((q) => q.join(',')).join(' ')} />
            </g>
            <circle cx={sk.head[0]} cy={sk.head[1]} r={16} fill="transparent" pointerEvents="all" onPointerDown={(e) => start(e, m.id, 'move')} />
            {sel && (
              <g className="fig-ui">
                <circle cx={0} cy={-6} r={86} fill="none" stroke="#b199ff" strokeWidth={1.2 / k} strokeDasharray={`${5 / k} ${4 / k}`} />
                {/* turn */}
                <line x1={0} y1={-86} x2={0} y2={-100} stroke="#b199ff" strokeWidth={1.5 / k} />
                <circle className="fig-handle rot" cx={0} cy={-100} r={h * 1.25} onPointerDown={(e) => start(e, m.id, 'rotate')} />
                {/* resize */}
                <rect className="fig-handle size" x={74 - h * 1.1} y={52 - h * 1.1} width={h * 2.2} height={h * 2.2} rx={h * 0.4} onPointerDown={(e) => start(e, m.id, 'scale')} />
                {/* joints */}
                {joints &&
                  jointPoints(m.p).map(([name, q]) => (
                    <circle key={name} className="fig-handle joint" cx={q[0]} cy={q[1]} r={h} onPointerDown={(e) => start(e, m.id, 'joint', { joint: name })} />
                  ))}
              </g>
            )}
          </g>
        )
      })}
    </svg>
  )
}
