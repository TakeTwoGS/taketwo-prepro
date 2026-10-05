import { useAuth } from '../lib/auth.jsx'

// The little (?) that explains a term. Only shows when Beginner Mode is on.
export default function Hint({ text }) {
  const { beginner } = useAuth()
  if (!beginner) return null
  return (
    <span className="hint" tabIndex={0} role="note" aria-label={text} data-tip={text}>
      ?
    </span>
  )
}
