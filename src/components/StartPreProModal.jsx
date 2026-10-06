import { useState } from 'react'
import { Modal } from './Modal.jsx'
import { useToast } from './Toast.jsx'
import Hint from './Hint.jsx'
import { useProject } from '../pages/ProjectLayout.jsx'
import { titleCase } from '../lib/breakdown.js'
import { newCharacter, newLocation } from '../lib/people.js'
import { newShot, nextPosition } from '../lib/shots.js'

// "Start Pre-Production": fills in a starting point from the script. It only adds, and never changes anything you made.
export default function StartPreProModal({ plan, onClose }) {
  const { characters, locations, shots } = useProject()
  const toast = useToast()
  const [opts, setOpts] = useState({ chars: true, locs: true, shots: true })
  const [busy, setBusy] = useState(false)
  const set = (k) => (e) => setOpts((o) => ({ ...o, [k]: e.target.checked }))
  const nothing =
    (!opts.chars || !plan.newCharacters.length) && (!opts.locs || !plan.newLocations.length) && (!opts.shots || !plan.scenesWithoutShots.length)

  async function go() {
    setBusy(true)
    try {
      if (opts.chars && plan.newCharacters.length) {
        await characters.addMany(plan.newCharacters.map((n) => newCharacter(titleCase(n))))
      }
      if (opts.locs && plan.newLocations.length) {
        await locations.addMany(plan.newLocations.map((l) => newLocation(titleCase(l.name))))
      }
      if (opts.shots && plan.scenesWithoutShots.length) {
        const base = nextPosition(shots.rowsRef.current)
        await shots.addMany(
          plan.scenesWithoutShots.map((s, i) =>
            newShot({
              position: base + i,
              scene_id: s.id,
              description: 'Master shot of the scene',
              size: 'Wide Shot',
              on_board: true,
              in_list: true,
            })
          )
        )
      }
      toast('Pre-production started')
      onClose()
    } catch (e) {
      toast(e.message || 'Something went wrong. Nothing else was changed.', 'error')
      setBusy(false)
    }
  }

  return (
    <Modal title="Start pre-production" onClose={onClose} wide>
      <p className="modal-text">
        We read your script and can set up a starting point. You can change or delete anything afterward, and nothing you already made is touched.
      </p>
      <div className="check-row stack">
        <label className="check">
          <input type="checkbox" checked={opts.chars} onChange={set('chars')} disabled={!plan.newCharacters.length} />
          <span>
            Add {plan.newCharacters.length} {plan.newCharacters.length === 1 ? 'character' : 'characters'} to the character database
            {plan.newCharacters.length > 0 && <span className="meta-text"> ({plan.newCharacters.slice(0, 4).map(titleCase).join(', ')}{plan.newCharacters.length > 4 ? '…' : ''})</span>}
          </span>
        </label>
        <label className="check">
          <input type="checkbox" checked={opts.locs} onChange={set('locs')} disabled={!plan.newLocations.length} />
          <span>
            Add {plan.newLocations.length} {plan.newLocations.length === 1 ? 'location' : 'locations'} to the location database
          </span>
        </label>
        <label className="check">
          <input type="checkbox" checked={opts.shots} onChange={set('shots')} disabled={!plan.scenesWithoutShots.length} />
          <span>
            Add a starting shot for {plan.scenesWithoutShots.length} {plan.scenesWithoutShots.length === 1 ? 'scene' : 'scenes'} without one{' '}
            <Hint text="A master shot is a wide shot that shows the whole scene. Most scenes start with one, and you add closer shots from there." />
          </span>
        </label>
      </div>
      <p className="field-note">Starting shots appear on your storyboard and in your shot list, ready for you to fill in.</p>
      <div className="modal-actions">
        <button className="btn btn-ghost" onClick={onClose}>
          Cancel
        </button>
        <button className="btn btn-primary" onClick={go} disabled={busy || nothing}>
          {busy ? 'Setting up…' : 'Start pre-production'}
        </button>
      </div>
    </Modal>
  )
}
