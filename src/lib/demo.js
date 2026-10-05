import { newBlock } from './screenplay.js'

export const DEMO_TITLE = 'Demo: Late Night Surprise'

const LINES = [
  ['transition', 'FADE IN:'],
  ['scene', 'INT. APARTMENT - NIGHT'],
  ['action', 'Rain taps against the window. The room is dark. A key turns in the lock.'],
  ['action', 'CHARLES (30s, tired, a heavy backpack on one shoulder) steps inside and drops his keys into a bowl.'],
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
  ['transition', 'FADE OUT.'],
]

export function buildDemo() {
  const blocks = LINES.map(([type, text]) => newBlock(type, text))
  const scenes = blocks.filter((b) => b.type === 'scene')
  const sceneInfo = {
    [scenes[0].id]: {
      description: 'Charles comes home late and senses someone else is in the apartment.',
      props: 'Keys, bowl, heavy backpack',
      wardrobe: 'Charles: rain-damp jacket',
      minutes: '90',
    },
    [scenes[1].id]: {
      description: 'The surprise party is a party of one. Maya gets caught.',
      props: 'Cake, candle, lighter',
      notes: 'Real candle flame. Keep a fire extinguisher nearby.',
      minutes: '120',
    },
  }
  return { blocks, sceneInfo }
}
