import { newBlock } from './screenplay.js'
import { newShot } from './shots.js'
import { newFigure } from './figures.js'
import { todayStr, parseDate } from './dates.js'
import { uuid } from './rows.js'

export const DEMO_TITLE = 'Demo: Late Night Surprise'

const LINES = [
  ['transition', 'FADE IN:'],
  ['scene', 'EXT. PARKING LOT - NIGHT'],
  ['action', 'Rain hammers an empty lot behind a small apartment building. Headlights sweep across the wet asphalt as a battered hatchback pulls in.'],
  ['action', 'CHARLES (30s, tired eyes, a rain-soaked jacket, a heavy backpack on one shoulder) climbs out. A few neighbors watch from their windows.'],
  ['action', 'MRS. PARK (60s, holding an umbrella) leans out of a lit third-floor window.'],
  ['character', 'MRS. PARK (O.S.)'],
  ['dialogue', "Charles! She's been waiting two hours!"],
  ['character', 'CHARLES'],
  ['paren', '(wincing)'],
  ['dialogue', 'I know, I know.'],
  ['scene', 'INT. APARTMENT - NIGHT'],
  ['action', 'The room is dark. A key turns in the lock. Charles steps inside and drops his keys into a bowl by the door.'],
  ['character', 'CHARLES'],
  ['dialogue', 'Hello?'],
  ['action', 'No answer. A noise comes from the kitchen.'],
  ['character', "CHARLES (CONT'D)"],
  ['paren', '(whispering)'],
  ['dialogue', 'Maya?'],
  ['scene', 'INT. APARTMENT - KITCHEN - NIGHT'],
  ['action', 'MAYA (30s, grinning) crouches behind the counter, holding a small cake with a single lit candle.'],
  ['shot', 'CLOSE ON the candle flame, trembling.'],
  ['character', 'CHARLES (O.S.)'],
  ['dialogue', 'I can hear you breathing.'],
  ['action', 'Maya stands up, busted.'],
  ['character', 'MAYA'],
  ['dialogue', "You're supposed to be surprised."],
  ['character', 'CHARLES'],
  ['paren', '(smiling)'],
  ['dialogue', "I'm surprised you're still awake."],
  ['action', 'She sets the cake on the counter. They both laugh.'],
  ['scene', 'EXT. APARTMENT BALCONY - NIGHT'],
  ['action', 'The rain has stopped. Charles and Maya sit on the floor with the cake between them. He unzips his backpack and pulls out an old film camera.'],
  ['character', 'MAYA'],
  ['dialogue', 'Is that...'],
  ['character', 'CHARLES'],
  ['dialogue', 'Your first camera. I found it at a pawn shop on my way home.'],
  ['action', 'Maya holds it like it might break.'],
  ['transition', 'CUT TO:'],
  ['scene', 'EXT. PARKING LOT - DAY'],
  ['action', 'Morning light. Maya stands in the empty lot with the camera raised to her eye. Charles waves from the far end, small in the frame.'],
  ['character', 'MAYA'],
  ['paren', '(calling out)'],
  ['dialogue', "Okay! Now walk toward me. Don't look at the camera!"],
  ['action', 'Charles starts walking. He looks straight at the camera and grins.'],
  ['scene', "INT. CHARLES'S CAR - DAY"],
  ['action', 'The camera sits on the dashboard, recording. Charles and Maya watch the tiny screen and laugh.'],
  ['character', 'MAYA'],
  ['dialogue', 'Okay. Take two?'],
  ['character', 'CHARLES'],
  ['dialogue', 'Take two.'],
  ['transition', 'FADE OUT.'],
]

const addDays = (dateStr, n) => {
  const d = parseDate(dateStr)
  d.setDate(d.getDate() + n)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

// ----- drawing helpers for the storyboard frames -----
const WHITE = '#ffffff'
const PINK = '#f472ff'
const GOLD = '#ffc247'
const pen = (p, c = WHITE) => ({ t: 'pen', c, p })
const arrow = (a, b, c = PINK) => ({ t: 'arrow', c, a, b })
const rect = (x1, y1, x2, y2, c = WHITE) => pen([[x1, y1], [x2, y1], [x2, y2], [x1, y2], [x1, y1]], c)
const round4 = (v) => Math.round(v * 1e4) / 1e4
const circle = (cx, cy, r, c = WHITE) =>
  pen(Array.from({ length: 25 }, (_, i) => [round4(cx + (r * 9) / 16 * Math.cos((i / 24) * 2 * Math.PI)), round4(cy + r * Math.sin((i / 24) * 2 * Math.PI))]), c)
const fig = (key, x, y, s, extra = {}) => ({ ...newFigure(key, { x, y, s, color: extra.c || WHITE }), ...extra })
const rain = () => [0.1, 0.22, 0.34, 0.46, 0.58, 0.7, 0.82, 0.94].map((x, i) => pen([[x, 0.08 + (i % 3) * 0.1], [x - 0.02, 0.18 + (i % 3) * 0.1]], '#9fb8ff'))

// Everything the sample film contains. No picture files are needed: the storyboard is drawn with the new tools.
export function buildDemoData(today = todayStr()) {
  const blocks = LINES.map(([type, text]) => newBlock(type, text))
  const scenes = blocks.filter((b) => b.type === 'scene')
  const sid = (n) => scenes[n - 1].id
  const line = (text) => blocks.find((b) => b.text === text || b.text.includes(text))
  const day1 = addDays(today, 6)
  const day2 = addDays(today, 7)

  const sceneInfo = {
    [sid(1)]: { description: 'Charles arrives home late, in the rain, and Mrs. Park gives him away.', props: 'Backpack, umbrella, car keys', wardrobe: 'Charles: rain-soaked jacket. Mrs. Park: cardigan', makeup: 'Tired eyes for Charles', effects: 'Rain. Use a hose or sprinkler above the lot', equipment: 'Big umbrella to protect the camera', notes: 'Shoot toward the building so we do not catch traffic.', minutes: '90' },
    [sid(2)]: { description: 'He enters the dark apartment and senses someone is there.', props: 'Keys, bowl', notes: 'Keep the lights off. Practical lamp in the kitchen only.', minutes: '60' },
    [sid(3)]: { description: 'The surprise party is a party of one. Maya gets caught.', props: 'Small cake, candle, lighter', equipment: 'LED panel for the candle glow', notes: 'Real candle flame. Keep a fire extinguisher nearby.', minutes: '120' },
    [sid(4)]: { description: 'A quiet moment on the balcony, and a gift that means a lot.', props: 'Old film camera, cake, two forks', wardrobe: 'Blanket for Maya', minutes: '75' },
    [sid(5)]: { description: 'Morning. Maya films Charles walking toward her.', props: 'The old film camera', equipment: 'Gimbal for the walking shot', notes: 'Soft light. Best before 9 AM.', minutes: '60' },
    [sid(6)]: { description: 'They watch the footage. The first take was perfect, but they want a second.', props: 'Camera on the dashboard', minutes: '45' },
  }

  // ----- characters and locations -----
  const characters = [
    { name: 'Charles', aliases: '', actor: 'Jordan Lee', description: 'Late 20s or early 30s. Warm, a little forgetful, always carrying too much.', costume: 'Rain-soaked jacket, jeans, a worn backpack.', props: 'Backpack, keys, old film camera.', notes: 'Tired but happy by the end of the night.', images: [] },
    { name: 'Maya', aliases: '', actor: 'Dana Reyes', description: 'Same age as Charles. Playful and patient. Has been waiting all evening.', costume: 'Cozy sweater, bright socks.', props: 'Cake, candle, lighter.', notes: 'She loves old cameras.', images: [] },
    { name: 'Mrs. Park', aliases: '', actor: 'Ruth Kim', description: 'The nosy, kind neighbor upstairs.', costume: 'Cardigan, slippers.', props: 'Umbrella.', notes: 'One scene. Only needed for about an hour.', images: [] },
  ].map((c) => ({ id: uuid(), ...c }))

  const locations = [
    { name: 'Parking Lot', aliases: '', address: '12 Oak Street, behind the apartment building', contact: 'Mr. Gomez, building manager, (555) 010-0150', parking: 'Free after 6 PM. Room for about 8 cars.', power: 'No outlets. Bring batteries.', restrooms: 'None close. Use the cafe on Elm Street.', sound: 'Traffic on Oak Street. Shoot toward the building.', lighting: 'One streetlight. Great at night, flat in the morning.', permission: 'Approved', notes: 'Used in scenes 1 and 5, so it can be shot on one visit if we want.', photos: [] },
    { name: 'Apartment', aliases: 'APARTMENT - KITCHEN, APARTMENT BALCONY', address: '12 Oak Street, Unit 3B', contact: 'Dana Reyes, tenant, (555) 010-0102', parking: 'Back lot', power: 'Plenty of outlets in the kitchen and living room.', restrooms: 'Yes, inside.', sound: 'The fridge hums. Unplug it for takes.', lighting: 'One big living room window. Practical lamps.', permission: 'Approved', notes: 'One location with three different scene headings. The Other names field groups them.', photos: [] },
    { name: "Charles's Car", aliases: '', address: 'Parked in the back lot', contact: 'Jordan Lee, (555) 010-0101', parking: 'Back lot', power: 'Use the car battery or a power bank.', restrooms: '', sound: 'Windows up for quiet audio.', lighting: 'Daylight through the windshield.', permission: 'Not needed', notes: 'Tight space. Use a small camera.', photos: [] },
  ].map((l) => ({ id: uuid(), ...l }))

  // ----- script breakdown tags -----
  const tagDefs = [
    [line('Rain hammers'), 'Rain hammers', 'Special effect'],
    [line('Rain hammers'), 'battered hatchback', 'Vehicle'],
    [line('CHARLES (30s'), 'tired eyes', 'Makeup'],
    [line('CHARLES (30s'), 'rain-soaked jacket', 'Costume'],
    [line('CHARLES (30s'), 'heavy backpack', 'Prop'],
    [line('CHARLES (30s'), 'neighbors', 'Extra'],
    [line('MRS. PARK (60s'), 'umbrella', 'Prop'],
    [line('The room is dark'), 'keys', 'Prop'],
    [line('The room is dark'), 'bowl', 'Set dressing'],
    [line('No answer.'), 'noise comes from the kitchen', 'Sound'],
    [line('MAYA (30s'), 'small cake', 'Prop'],
    [line('MAYA (30s'), 'single lit candle', 'Prop'],
    [line('The rain has stopped'), 'old film camera', 'Prop'],
    [line('Morning light'), 'camera raised', 'Equipment'],
    [line('The camera sits'), 'dashboard', 'Set dressing'],
  ]
  const tags = tagDefs.map(([block, text, category]) => {
    const at = block.text.indexOf(text)
    return { id: uuid(), category, text, block_id: block.id, start_idx: at, end_idx: at + text.length, scene_id: null }
  })
  tags.push({ id: uuid(), category: 'Equipment', text: 'Fire extinguisher', block_id: null, start_idx: null, end_idx: null, scene_id: sid(3) })

  // ----- cast and crew -----
  const person = (kind, name, role, extra = {}) => ({ id: uuid(), kind, name, role, plays: '', email: `${name.split(' ')[0].toLowerCase()}@example.com`, phone: '', notes: '', photo_path: null, unavailable: [], ...extra })
  const jordan = person('cast', 'Jordan Lee', 'Actor', { plays: 'Charles', phone: '(555) 010-0101' })
  const dana = person('cast', 'Dana Reyes', 'Actor', { plays: 'Maya', phone: '(555) 010-0102', unavailable: [day2], notes: 'Cannot work on Day 2. See the warning on the Schedule.' })
  const ruth = person('cast', 'Ruth Kim', 'Actor', { plays: 'Mrs. Park', phone: '(555) 010-0103', notes: 'Only needed on Day 1.' })
  const alex = person('crew', 'Alex Rivera', 'Director', { phone: '(555) 010-0110' })
  const sam = person('crew', 'Sam Ortiz', 'Cinematographer', { phone: '(555) 010-0111' })
  const priya = person('crew', 'Priya Nair', 'Sound Mixer', { phone: '(555) 010-0112' })
  const eli = person('crew', 'Eli Brooks', 'Gaffer', { phone: '(555) 010-0113' })
  const jo = person('crew', 'Jo Martin', 'Producer', { phone: '(555) 010-0114' })
  const people = [jordan, dana, ruth, alex, sam, priya, eli, jo]

  // ----- equipment (the person's own gear list) -----
  const gearRow = (name, category, quantity = 1, notes = '') => ({ id: uuid(), name, category, quantity, notes })
  const camera = gearRow('Sample camera (mirrorless)', 'Cameras', 1, 'Delete or rename these sample items any time.')
  const lens = gearRow('Sample 50mm lens', 'Lenses')
  const tripod = gearRow('Sample tripod', 'Tripods')
  const led = gearRow('Sample LED panel light', 'Lighting')
  const boom = gearRow('Sample boom mic and pole', 'Audio')
  const gimbal = gearRow('Sample gimbal', 'Gimbals')
  const batteries = gearRow('Sample extra batteries', 'Power', 4)
  const gear = [camera, lens, tripod, led, boom, gimbal, batteries]

  // ----- storyboard and shot list -----
  const frames = [
    { key: '1A', scene: 1, description: 'The car pulls into the rainy lot. Charles is tiny against the building.', size: 'Extreme Wide Shot', angle: 'High Angle', movement: 'Static', lens: '16mm', audio: 'Rain, car engine', equipment: 'Tripod', setup: 20, shoot: 25, status: 'Completed', priority: 'High', marks: [rect(0.62, 0.3, 0.92, 0.82), rect(0.67, 0.38, 0.72, 0.46), rect(0.77, 0.38, 0.82, 0.46), rect(0.67, 0.58, 0.72, 0.66), pen([[0.05, 0.84], [0.95, 0.84]]), fig('walk', 0.32, 0.74, 0.14), arrow([0.1, 0.92], [0.4, 0.92]), ...rain()] },
    { key: '1B', scene: 1, description: 'Charles looks up at the lit window. Mrs. Park leans out and calls down.', dialogue: "Charles! She's been waiting two hours!", size: 'Wide Shot', angle: 'Eye Level', movement: 'Static', lens: '24mm', audio: 'Rain, dialogue from above', equipment: 'Tripod', setup: 15, shoot: 20, status: 'Completed', priority: 'High', marks: [fig('stand', 0.36, 0.6, 0.62), rect(0.42, 0.4, 0.47, 0.52, GOLD), rect(0.68, 0.08, 0.92, 0.42), fig('wave', 0.8, 0.3, 0.22, { c: PINK }), arrow([0.46, 0.3], [0.66, 0.2]), ...rain()] },
    { key: '2A', scene: 2, description: 'Charles walks into the dark apartment and drops his keys in the bowl.', size: 'Medium Shot', angle: 'Eye Level', movement: 'Dolly', lens: '35mm', audio: 'Keys, footsteps', equipment: 'Dolly or slider', setup: 25, shoot: 30, status: 'Needs Reshoot', priority: 'Medium', notes: 'Keys landed in the wrong hand in take 2. Reshoot.', marks: [fig('walk', 0.3, 0.6, 0.8), rect(0.78, 0.15, 0.95, 0.85), arrow([0.5, 0.92], [0.8, 0.92])] },
    { key: '2B', scene: 2, description: 'Close on Charles as he hears a noise from the kitchen.', dialogue: 'Hello?', size: 'Close-Up', angle: 'Eye Level', movement: 'Static', lens: '85mm', audio: 'Quiet room tone', equipment: 'Tripod', setup: 15, shoot: 15, status: 'Filming', priority: 'Medium', marks: [fig('stand', 0.5, 1.05, 1.7, { c: GOLD })] },
    { key: '3A', scene: 3, description: 'Maya crouches behind the counter with the cake. Charles stands in the doorway.', size: 'Two Shot', angle: 'Low Angle', movement: 'Static', lens: '35mm', audio: 'Boom over the counter', equipment: 'Tripod, LED panel', setup: 30, shoot: 40, status: 'Ready', priority: 'High', marks: [fig('crouch', 0.28, 0.66, 0.5, { c: PINK }), fig('stand', 0.7, 0.58, 0.62, { f: true }), pen([[0.05, 0.74], [0.52, 0.74]]), pen([[0.3, 0.5], [0.3, 0.56]], GOLD)] },
    { key: '3B', scene: 3, description: 'Insert: the single candle flame flickers.', size: 'Insert', angle: 'Eye Level', movement: 'Static', lens: '100mm macro', audio: 'Quiet', equipment: 'Tripod', setup: 15, shoot: 10, status: 'Setting Up', priority: 'Low', marks: [pen([[0.5, 0.85], [0.5, 0.48]]), pen([[0.5, 0.48], [0.46, 0.36], [0.5, 0.22], [0.54, 0.36], [0.5, 0.48]], GOLD)] },
    { key: '4A', scene: 4, description: "Over Maya's shoulder as Charles pulls the old camera out of his backpack.", dialogue: 'Your first camera. I found it at a pawn shop on my way home.', size: 'Over the Shoulder', angle: 'Eye Level', movement: 'Static', lens: '50mm', audio: 'Soft night sounds', equipment: 'Tripod', setup: 20, shoot: 30, status: 'Not Started', priority: 'High', marks: [fig('sit', 0.2, 0.74, 0.9, { c: '#cbbcff' }), fig('sit', 0.72, 0.68, 0.5, { f: true })] },
    { key: '4B', scene: 4, description: 'Insert: Maya turns the old camera over in her hands.', size: 'Insert', angle: 'High Angle', movement: 'Handheld', lens: '50mm', audio: 'Quiet', equipment: '', setup: 10, shoot: 15, status: 'Not Started', priority: 'Medium', marks: [rect(0.3, 0.34, 0.7, 0.72), circle(0.5, 0.53, 0.14), rect(0.58, 0.28, 0.66, 0.34), arrow([0.12, 0.85], [0.3, 0.7])] },
    { key: '5A', scene: 5, description: 'Maya raises the camera. Charles walks toward her down the empty lot.', dialogue: "Okay! Now walk toward me. Don't look at the camera!", size: 'Wide Shot', angle: 'Eye Level', movement: 'Tracking', lens: '24mm', audio: 'Birds, footsteps', equipment: 'Gimbal', setup: 25, shoot: 35, status: 'Not Started', priority: 'High', marks: [fig('reach', 0.2, 0.62, 0.5, { c: PINK }), fig('walk', 0.78, 0.7, 0.2, { f: true }), arrow([0.72, 0.84], [0.4, 0.84]), pen([[0.05, 0.86], [0.95, 0.86]])] },
    { key: '5B', scene: 5, description: 'Charles looks straight into the lens and grins.', size: 'Close-Up', angle: 'Eye Level', movement: 'Static', lens: '85mm', audio: 'Quiet', equipment: 'Tripod', setup: 10, shoot: 15, status: 'Not Started', priority: 'Medium', inList: false, marks: [fig('stand', 0.5, 1.05, 1.6, { c: GOLD })] },
    { key: '6A', scene: 6, description: 'They watch the footage on the tiny screen, then decide to go again.', dialogue: 'Okay. Take two?', size: 'Medium Shot', angle: 'Eye Level', movement: 'Static', lens: '35mm', audio: 'Car interior, laughing', equipment: 'Small camera mount', setup: 20, shoot: 25, status: 'Not Started', priority: 'Medium', marks: [pen([[0.05, 0.62], [0.95, 0.62]]), rect(0.45, 0.52, 0.55, 0.62, GOLD), fig('sit', 0.28, 0.72, 0.7), fig('sit', 0.72, 0.72, 0.7, { f: true, c: PINK })] },
  ]
  const shots = frames.map((f, i) =>
    newShot({
      id: uuid(),
      position: i + 1,
      scene_id: sid(f.scene),
      in_list: f.inList !== false,
      on_board: true,
      description: f.description,
      dialogue: f.dialogue || '',
      size: f.size,
      angle: f.angle,
      movement: f.movement,
      lens: f.lens || '',
      fps: '24',
      camera: 'A Cam',
      audio: f.audio || '',
      equipment: f.equipment || '',
      setup_min: f.setup,
      shoot_min: f.shoot,
      priority: f.priority,
      status: f.status,
      notes: f.notes || '',
      duration: f.size === 'Insert' ? 3 : 5,
      marks: f.marks,
    })
  )
  const shotOf = (key) => shots[frames.findIndex((f) => f.key === key)]

  // ----- schedule, call sheet, gear assignments -----
  const days = [
    {
      id: uuid(),
      label: 'Day 1',
      date: day1,
      call_time: '17:00',
      scene_ids: [sid(1), sid(2), sid(3), sid(4)],
      equip_checked: { [camera.id]: true, [tripod.id]: true },
      notes: '',
      call_sheet: {
        notes: 'Bring rain jackets. Dinner is provided at 8 PM.',
        safety: 'Wet pavement in the parking lot. The fire extinguisher stays in the kitchen.',
        hospital: 'City General Hospital, 1 Main Street',
        parking: 'Park in the back lot and use the side door.',
        calls: { 'c:MAYA': '19:00', 'c:MRS. PARK': '17:30' },
        crew_off: [],
      },
    },
    { id: uuid(), label: 'Day 2', date: day2, call_time: '07:30', scene_ids: [sid(5), sid(6)], equip_checked: {}, notes: '', call_sheet: { notes: 'A short morning shoot. Wrap by noon.' } },
  ]
  const use = (item, scope, target = null) => ({ id: uuid(), item_id: item.id, scope, target_id: target })
  const uses = [use(camera, 'project'), use(tripod, 'project'), use(batteries, 'project'), use(led, 'scene', sid(3)), use(gimbal, 'scene', sid(5)), use(lens, 'shot', shotOf('3B').id), use(boom, 'day', days[0].id)]

  // ----- tasks -----
  const task = (name, who, due, priority, status) => ({ id: uuid(), name, person_id: who.id, due_date: addDays(today, due), priority, status })
  const tasks = [
    task('Reserve the apartment for Day 1', jo, 2, 'High', 'In progress'),
    task('Buy a small cake and candles', alex, 5, 'Medium', 'To do'),
    task('Charge every camera battery', sam, 5, 'High', 'To do'),
    task('Send the call sheet to the cast and crew', jo, 5, 'Medium', 'To do'),
    task('Borrow a tripod from the film club', eli, -2, 'Low', 'Done'),
  ]

  // ----- takes already logged on set -----
  const take = (key, n, rating, director = '', continuity = '') => ({ id: uuid(), shot_id: shotOf(key).id, take_number: n, rating, director_note: director, continuity_note: continuity })
  const takes = [
    take('1A', 1, 'bad', 'Rain was too light. Turn the hose up.'),
    take('1A', 2, 'good', 'That is it.'),
    take('1B', 1, 'favorite', 'Great energy from Mrs. Park.', 'Umbrella in her left hand.'),
    take('2A', 1, 'good', 'Nice and slow.'),
    take('2A', 2, 'bad', 'Slow down the walk.', 'Keys in the wrong hand.'),
    take('2B', 1, 'bad', 'Try it quieter.'),
  ]

  // ----- an earlier draft to compare with, and a comment -----
  const carScene = blocks.findIndex((b) => b.id === sid(6))
  const versions = [{ id: uuid(), name: 'Draft 1', note: 'First pass, before the car scene', content: blocks.slice(0, carScene), scene_info: {} }]
  const quoted = line("I'm surprised you're still awake.")
  const comments = [{ id: uuid(), block_id: quoted.id, parent_id: null, body: 'Love this line! Maybe Charles smiles before he says it?', quote: quoted.text, mentions: [], resolved: false }]

  const slate = { director: 'Alex Rivera', camera: 'A Cam', fps: '24', shot_id: shotOf('2B').id, take: 2 }
  return { title: DEMO_TITLE, blocks, sceneInfo, characters, locations, tags, people, gear, shots, days, uses, tasks, takes, versions, comments, slate, boardRatio: '16:9' }
}
