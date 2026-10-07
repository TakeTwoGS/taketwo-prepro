// A simple 2D "mannequin" for storyboards. Everything is plain numbers, so a pose is tiny to save.
//
// The body is built from bones. Each limb bone has an angle in degrees measured from "straight down",
// turning toward the figure's right side (screen right when the figure is not flipped).
// The torso and head are measured from "straight up".
// The figure's own units: standing, it is about 112 units tall, with the hips at (0, 0).

export const BONES = { torso: 32, neck: 18, uarm: 22, farm: 20, thigh: 26, shin: 26, shoulder: 10, hip: 7 }
export const HEIGHT = 112

const rad = (d) => (d * Math.PI) / 180
const deg = (r) => (r * 180) / Math.PI
const down = (a) => [Math.sin(rad(a)), Math.cos(rad(a))]
const up = (a) => [Math.sin(rad(a)), -Math.cos(rad(a))]
export const wrapAngle = (a) => {
  let x = ((a + 180) % 360 + 360) % 360 - 180
  if (x === -180) x = 180
  return Math.round(x * 10) / 10
}

const STAND = { aT: 0, aH: 0, la1: -7, la2: -5, ra1: 7, ra2: 5, ll1: -4, ll2: -2, rl1: 4, rl2: 2 }

export const POSES = [
  { key: 'stand', name: 'Standing', pose: STAND },
  { key: 'walk', name: 'Walking', pose: { aT: 3, aH: 2, la1: 22, la2: 34, ra1: -22, ra2: -26, ll1: -18, ll2: -32, rl1: 24, rl2: 8 } },
  { key: 'run', name: 'Running', pose: { aT: 18, aH: 12, la1: 55, la2: 135, ra1: -50, ra2: -25, ll1: -38, ll2: -88, rl1: 62, rl2: -18 } },
  { key: 'sit', name: 'Sitting', pose: { aT: 0, aH: 0, la1: 8, la2: 62, ra1: -8, ra2: -58, ll1: 86, ll2: 4, rl1: 86, rl2: 4 } },
  { key: 'crouch', name: 'Crouching', pose: { aT: 14, aH: 6, la1: 42, la2: 74, ra1: 52, ra2: 84, ll1: 72, ll2: -34, rl1: 62, rl2: -46 } },
  { key: 'wave', name: 'Waving', pose: { ...STAND, ra1: 138, ra2: 170 } },
  { key: 'point', name: 'Pointing', pose: { ...STAND, aH: 8, ra1: 90, ra2: 92 } },
  { key: 'reach', name: 'Reaching', pose: { ...STAND, aT: 10, ra1: 112, ra2: 104, rl1: 18, rl2: 6, ll1: -12, ll2: -6 } },
  { key: 'hands-up', name: 'Hands up', pose: { ...STAND, la1: -150, la2: -176, ra1: 150, ra2: 176 } },
  { key: 'crossed', name: 'Arms crossed', pose: { ...STAND, la1: 14, la2: 100, ra1: -14, ra2: -100 } },
  { key: 'hips', name: 'Hands on hips', pose: { ...STAND, la1: -48, la2: 28, ra1: 48, ra2: -28 } },
  { key: 'kick', name: 'Kicking', pose: { aT: -10, aH: -4, la1: -40, la2: 60, ra1: 60, ra2: 100, ll1: -8, ll2: -6, rl1: 82, rl2: 88 } },
  { key: 'lying', name: 'Lying down', pose: STAND, r: 90 },
]
export const poseByKey = (key) => POSES.find((p) => p.key === key) || POSES[0]

// Where every joint is, in the figure's own units
export function skeleton(p) {
  const H = [0, 0]
  const t = up(p.aT)
  const S = [H[0] + t[0] * BONES.torso, H[1] + t[1] * BONES.torso]
  const h = up(p.aH)
  const head = [S[0] + h[0] * BONES.neck, S[1] + h[1] * BONES.neck]
  const perp = [Math.cos(rad(p.aT)), Math.sin(rad(p.aT))]
  const shL = [S[0] - perp[0] * BONES.shoulder, S[1] - perp[1] * BONES.shoulder]
  const shR = [S[0] + perp[0] * BONES.shoulder, S[1] + perp[1] * BONES.shoulder]
  const arm = (sh, a1, a2) => {
    const d1 = down(a1)
    const e = [sh[0] + d1[0] * BONES.uarm, sh[1] + d1[1] * BONES.uarm]
    const d2 = down(a2)
    return { sh, e, w: [e[0] + d2[0] * BONES.farm, e[1] + d2[1] * BONES.farm] }
  }
  const leg = (hp, a1, a2) => {
    const d1 = down(a1)
    const k = [hp[0] + d1[0] * BONES.thigh, hp[1] + d1[1] * BONES.thigh]
    const d2 = down(a2)
    return { hp, k, a: [k[0] + d2[0] * BONES.shin, k[1] + d2[1] * BONES.shin] }
  }
  return {
    H,
    S,
    head,
    la: arm(shL, p.la1, p.la2),
    ra: arm(shR, p.ra1, p.ra2),
    ll: leg([-BONES.hip, 0], p.ll1, p.ll2),
    rl: leg([BONES.hip, 0], p.rl1, p.rl2),
  }
}

// ----- placing a figure in a frame -----
// A figure mark: { t: 'fig', id, x, y, s, r, f, c, p }
//   x, y = where the hips are, as fractions of the frame (0 to 1)
//   s = how tall the figure is, as a fraction of the frame height
//   r = rotation in degrees, f = flipped left to right, c = color, p = the pose

export function newFigure(poseKey, { x = 0.5, y = 0.6, s = 0.5, color = '#ffffff', id } = {}) {
  const preset = poseByKey(poseKey)
  return {
    t: 'fig',
    id: id || Math.random().toString(36).slice(2, 10),
    x,
    y,
    s,
    r: preset.r || 0,
    f: false,
    c: color,
    p: { ...preset.pose },
  }
}

// units -> frame coordinates (W wide, H tall)
export const unitScale = (mark, H) => (mark.s * H) / HEIGHT

// A point in the figure's own units -> a point in the frame
export function toFrame(mark, pt, W, H) {
  const k = unitScale(mark, H)
  let [x, y] = pt
  if (mark.f) x = -x
  const a = rad(mark.r || 0)
  const rx = x * Math.cos(a) - y * Math.sin(a)
  const ry = x * Math.sin(a) + y * Math.cos(a)
  return [mark.x * W + rx * k, mark.y * H + ry * k]
}

// A point in the frame -> a point in the figure's own units (the opposite direction)
export function toLocal(mark, pt, W, H) {
  const k = unitScale(mark, H)
  const dx = pt[0] - mark.x * W
  const dy = pt[1] - mark.y * H
  const a = -rad(mark.r || 0)
  const x = (dx * Math.cos(a) - dy * Math.sin(a)) / k
  const y = (dx * Math.sin(a) + dy * Math.cos(a)) / k
  return [mark.f ? -x : x, y]
}

// Dragging a joint to a spot changes the angle of the bone that leads to it
export function poseWithJoint(mark, joint, local) {
  const sk = skeleton(mark.p)
  const aim = (from, to) => wrapAngle(deg(Math.atan2(to[0] - from[0], to[1] - from[1])))
  const aimUp = (from, to) => wrapAngle(deg(Math.atan2(to[0] - from[0], -(to[1] - from[1]))))
  const p = { ...mark.p }
  if (joint === 'torso') p.aT = aimUp(sk.H, local)
  else if (joint === 'head') p.aH = aimUp(sk.S, local)
  else if (joint === 'la-e') p.la1 = aim(sk.la.sh, local)
  else if (joint === 'la-w') p.la2 = aim(sk.la.e, local)
  else if (joint === 'ra-e') p.ra1 = aim(sk.ra.sh, local)
  else if (joint === 'ra-w') p.ra2 = aim(sk.ra.e, local)
  else if (joint === 'll-k') p.ll1 = aim(sk.ll.hp, local)
  else if (joint === 'll-a') p.ll2 = aim(sk.ll.k, local)
  else if (joint === 'rl-k') p.rl1 = aim(sk.rl.hp, local)
  else if (joint === 'rl-a') p.rl2 = aim(sk.rl.k, local)
  return p
}

// The draggable points on a figure
export function jointPoints(p) {
  const sk = skeleton(p)
  return [
    ['head', sk.head],
    ['torso', sk.S],
    ['la-e', sk.la.e],
    ['la-w', sk.la.w],
    ['ra-e', sk.ra.e],
    ['ra-w', sk.ra.w],
    ['ll-k', sk.ll.k],
    ['ll-a', sk.ll.a],
    ['rl-k', sk.rl.k],
    ['rl-a', sk.rl.a],
  ]
}

export const clampScale = (s) => Math.min(2.5, Math.max(0.08, s))
export const angleAround = (cx, cy, px, py) => wrapAngle(deg(Math.atan2(px - cx, -(py - cy)))) // 0 = straight up
