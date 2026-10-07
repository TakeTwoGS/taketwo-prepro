import { BookOpen, Camera, Clock, Crop, HardDrive, Move3d, Ruler } from 'lucide-react'
import AspectRatioTool from './AspectRatioTool.jsx'
import DepthOfFieldTool from './DepthOfFieldTool.jsx'
import StorageTool from './StorageTool.jsx'
import RuntimeTool from './RuntimeTool.jsx'
import ShotSizeGuide from './ShotSizeGuide.jsx'
import MovementGuide from './MovementGuide.jsx'
import GlossaryTool from './GlossaryTool.jsx'

export const TOOLS = [
  { slug: 'aspect-ratio', title: 'Aspect ratio visualizer', blurb: 'See how 16:9, 2.39:1, 4:3, square, and vertical frame the same picture.', icon: Crop, tone: 'violet', Component: AspectRatioTool },
  { slug: 'depth-of-field', title: 'Depth of field calculator', blurb: 'Find out how much of your shot will be sharp for any lens, aperture, and distance.', icon: Camera, tone: 'pink', Component: DepthOfFieldTool },
  { slug: 'storage', title: 'Storage calculator', blurb: 'Work out how many gigabytes your footage needs, and how long a card will last.', icon: HardDrive, tone: 'teal', Component: StorageTool },
  { slug: 'runtime', title: 'Runtime calculator', blurb: 'Turn script pages into minutes of film, or the other way around.', icon: Clock, tone: 'amber', Component: RuntimeTool },
  { slug: 'shot-sizes', title: 'Shot size guide', blurb: 'Wide, medium, close-up, and more, with a picture of each.', icon: Ruler, tone: 'blue', Component: ShotSizeGuide },
  { slug: 'camera-movement', title: 'Camera movement guide', blurb: 'Pan, tilt, dolly, truck, and more, with a moving example of each.', icon: Move3d, tone: 'rose', Component: MovementGuide },
  { slug: 'glossary', title: 'Film glossary', blurb: 'Over 90 filmmaking terms explained in plain language.', icon: BookOpen, tone: 'violet', Component: GlossaryTool },
]
export const toolBySlug = (slug) => TOOLS.find((t) => t.slug === slug)
