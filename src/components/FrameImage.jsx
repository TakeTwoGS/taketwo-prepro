import { forwardRef } from 'react'
import { ImageIcon } from 'lucide-react'
import MarksOverlay from './MarksOverlay.jsx'
import { useImageUrl } from '../lib/images.js'

// A storyboard frame: the picture (if any) with any drawing on top
const FrameImage = forwardRef(function FrameImage({ path, marks, ratio, draft, blankText = 'Blank frame', children, className = '' }, ref) {
  const url = useImageUrl(path)
  return (
    <div className={'frame-img ' + className} ref={ref} style={{ aspectRatio: ratio }}>
      {url ? (
        <img src={url} alt="" draggable={false} />
      ) : (
        <div className="frame-blank">
          <ImageIcon size={22} />
          <span>{path ? 'Loading…' : blankText}</span>
        </div>
      )}
      <MarksOverlay marks={marks} ratio={ratio} draft={draft} />
      {children}
    </div>
  )
})
export default FrameImage
