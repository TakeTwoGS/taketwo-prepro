// Shared choices and helpers for storyboard frames and the shot list

export const SIZES = [
  { name: 'Extreme Wide Shot', abbr: 'EWS', hint: 'Shows a huge area, with people tiny or not visible at all. Great for showing where we are or how big a place is.' },
  { name: 'Wide Shot', abbr: 'WS', hint: 'Shows a whole person from head to toe, plus the space around them.' },
  { name: 'Medium Wide', abbr: 'MWS', hint: 'Frames a person from about the knees up. A good in-between of wide and medium.' },
  { name: 'Medium Shot', abbr: 'MS', hint: 'Frames a person from the waist up. A go-to for conversations.' },
  { name: 'Medium Close-Up', abbr: 'MCU', hint: 'Frames a person from the chest up. Closer, but you can still see some body language.' },
  { name: 'Close-Up', abbr: 'CU', hint: "Frames a person's face closely. Often used to show emotion." },
  { name: 'Extreme Close-Up', abbr: 'ECU', hint: 'Shows just one small detail, like eyes, lips, or a ring.' },
  { name: 'Over the Shoulder', abbr: 'OTS', hint: 'Shot from behind one person, looking at another. Common in conversations.' },
  { name: 'POV', abbr: 'POV', hint: 'Point of view. Shows exactly what a character sees, as if the camera is their eyes.' },
  { name: 'Two Shot', abbr: '2S', hint: 'Frames two people together in the same shot.' },
  { name: 'Insert', abbr: 'INS', hint: 'A close shot of an object or detail, like a phone screen or a note on a table.' },
]

export const ANGLES = [
  { name: 'Eye Level', hint: "The camera is at the height of the character's eyes. Feels natural and neutral." },
  { name: 'High Angle', hint: 'The camera looks down on the subject. Can make them seem small or weak.' },
  { name: 'Low Angle', hint: 'The camera looks up at the subject. Can make them seem powerful or scary.' },
  { name: 'Dutch Angle', hint: 'The camera is tilted sideways. Creates unease or tension.' },
  { name: 'Overhead', hint: 'The camera is directly above, looking straight down.' },
  { name: 'Ground Level', hint: 'The camera is placed very low, close to the floor or ground.' },
]

export const MOVEMENTS = [
  { name: 'Static', hint: 'The camera does not move. It stays locked in one spot.' },
  { name: 'Pan', hint: 'The camera turns left or right while staying in the same spot.' },
  { name: 'Tilt', hint: 'The camera tilts up or down while staying in the same spot.' },
  { name: 'Dolly', hint: 'The whole camera moves toward or away from the subject, often on wheels or a track.' },
  { name: 'Truck', hint: 'The whole camera moves sideways, left or right.' },
  { name: 'Pedestal', hint: 'The camera moves straight up or down, like an elevator.' },
  { name: 'Zoom', hint: 'The lens zooms in or out. The camera itself does not move.' },
  { name: 'Handheld', hint: 'The camera is held in the hands for a natural, slightly shaky feel.' },
  { name: 'Tracking', hint: 'The camera follows a moving subject.' },
  { name: 'Crane', hint: 'The camera sweeps up or down on a crane or jib arm.' },
  { name: 'Gimbal', hint: 'Smooth, floating handheld movement, steadied by a gimbal.' },
]

export const STATUSES = ['Not Started', 'Setting Up', 'Ready', 'Filming', 'Completed', 'Needs Reshoot']
export const PRIORITIES = ['High', 'Medium', 'Low']

export const STATUS_TONE = {
  'Not Started': 'gray',
  'Setting Up': 'amber',
  Ready: 'blue',
  Filming: 'pink',
  Completed: 'green',
  'Needs Reshoot': 'red',
}

export const RATIOS = [
  { value: '16:9', label: '16:9 (widescreen)', r: 16 / 9 },
  { value: '2.39:1', label: '2.39:1 (cinema)', r: 2.39 },
  { value: '1.85:1', label: '1.85:1 (flat)', r: 1.85 },
  { value: '4:3', label: '4:3 (classic)', r: 4 / 3 },
  { value: '1:1', label: '1:1 (square)', r: 1 },
  { value: '9:16', label: '9:16 (vertical)', r: 9 / 16 },
]
export const ratioOf = (value) => (RATIOS.find((x) => x.value === value) || RATIOS[0]).r

export const sizeAbbr = (name) => SIZES.find((s) => s.name === name)?.abbr || ''
export const hintFor = (list, name) => list.find((x) => x.name === name)?.hint || ''

export function newShot(partial = {}) {
  return {
    position: 0,
    on_board: true,
    in_list: false,
    scene_id: null,
    description: '',
    size: '',
    angle: '',
    movement: '',
    dialogue: '',
    duration: null,
    notes: '',
    image_path: null,
    marks: [],
    lens: '',
    fps: '',
    camera: '',
    audio: '',
    equipment: '',
    cast_note: '',
    location_note: '',
    setup_min: null,
    shoot_min: null,
    priority: 'Medium',
    status: 'Not Started',
    ...partial,
  }
}

// ----- shot numbers: Scene 4's second shot is "4B" -----

export function letters(n) {
  let s = ''
  let i = n
  do {
    s = String.fromCharCode(65 + (i % 26)) + s
    i = Math.floor(i / 26) - 1
  } while (i >= 0)
  return s
}

export function shotLabels(sorted, scenes) {
  const num = new Map(scenes.map((s) => [s.id, s.number]))
  const counts = new Map()
  const out = new Map()
  for (const s of sorted) {
    if (s.scene_id && num.has(s.scene_id)) {
      const n = counts.get(s.scene_id) || 0
      counts.set(s.scene_id, n + 1)
      out.set(s.id, `${num.get(s.scene_id)}${letters(n)}`)
    } else {
      out.set(s.id, '—')
    }
  }
  return out
}

// ----- ordering: every shot has a position number; moving a shot only changes its own number -----

export const sortShots = (rows) => rows.slice().sort((a, b) => a.position - b.position)

export function nextPosition(rows) {
  return rows.length ? Math.max(...rows.map((r) => r.position)) + 1 : 1
}

export function positionAfter(sorted, id) {
  const i = sorted.findIndex((r) => r.id === id)
  if (i < 0) return nextPosition(sorted)
  const cur = sorted[i]
  const next = sorted[i + 1]
  return next ? (cur.position + next.position) / 2 : cur.position + 1
}

// New position when dragging `movingId` onto `targetId`
export function positionForMove(sorted, movingId, targetId, after) {
  const list = sorted.filter((r) => r.id !== movingId)
  const i = list.findIndex((r) => r.id === targetId)
  if (i < 0) return null
  const cur = list[i]
  if (after) {
    const next = list[i + 1]
    return next ? (cur.position + next.position) / 2 : cur.position + 1
  }
  const prev = list[i - 1]
  return prev ? (prev.position + cur.position) / 2 : cur.position - 1
}

// Cast and location come from the scene unless the person typed their own
export const shotCast = (shot, scene) => (shot.cast_note || '').trim() || (scene ? scene.characters.join(', ') : '')
export const shotLocation = (shot, scene) => (shot.location_note || '').trim() || (scene ? scene.location : '')
