import { Link } from 'react-router-dom'

// The Take Two logo, with "PrePro" beside it
export default function Logo({ to = '/home', size = 'md', word = true }) {
  const img = (
    <img
      className={'logo-img logo-' + size}
      src="/taketwo-logo-sm.png"
      srcSet="/taketwo-logo-sm.png 1x, /taketwo-logo.png 2x"
      alt="Take Two"
    />
  )
  const inner = (
    <>
      {img}
      {word && <span className="logo-word">PrePro</span>}
    </>
  )
  return to ? (
    <Link to={to} className="logo-link" aria-label="TakeTwo PrePro home">
      {inner}
    </Link>
  ) : (
    <span className="logo-link">{inner}</span>
  )
}
