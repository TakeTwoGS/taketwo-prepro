import { useCallback, useDeferredValue, useEffect, useMemo, useRef, useState } from 'react'
import { Link, NavLink, Outlet, useNavigate, useOutletContext, useParams } from 'react-router-dom'
import { supabase } from '../lib/supabase.js'
import { analyze, newBlock } from '../lib/screenplay.js'
import ProjectMenu from '../components/ProjectMenu.jsx'

export const useProject = () => useOutletContext()

export default function ProjectLayout() {
  const { projectId } = useParams()
  const [state, setState] = useState({ status: 'loading' })

  useEffect(() => {
    let cancelled = false
    setState({ status: 'loading' })
    ;(async () => {
      const [p, s] = await Promise.all([
        supabase.from('projects').select('*').eq('id', projectId).maybeSingle(),
        supabase.from('scripts').select('*').eq('project_id', projectId).maybeSingle(),
      ])
      if (cancelled) return
      if (p.error) return setState({ status: 'error', message: p.error.message })
      if (!p.data) return setState({ status: 'missing' })

      let script = s.data
      if (!script) {
        const content = [newBlock('scene', '')]
        const { data, error } = await supabase
          .from('scripts')
          .insert({ project_id: projectId, content, stats: analyze(content).stats })
          .select()
          .single()
        if (cancelled) return
        if (error) return setState({ status: 'error', message: error.message })
        script = data
      }
      const blocks = Array.isArray(script.content) && script.content.length ? script.content : [newBlock('scene', '')]
      setState({ status: 'ready', project: p.data, blocks, sceneInfo: script.scene_info || {} })
    })()
    return () => {
      cancelled = true
    }
  }, [projectId])

  if (state.status === 'loading')
    return (
      <div className="page">
        <p className="muted-text">Opening project…</p>
      </div>
    )
  if (state.status === 'missing')
    return (
      <div className="page">
        <div className="empty">
          <h2>We could not find that project</h2>
          <p>It may have been deleted.</p>
          <Link className="btn btn-primary" to="/projects">
            Back to projects
          </Link>
        </div>
      </div>
    )
  if (state.status === 'error')
    return (
      <div className="page">
        <div className="notice error">{state.message}</div>
      </div>
    )

  return <Workspace key={projectId} initial={state} />
}

export function Workspace({ initial }) {
  const nav = useNavigate()
  const projectId = initial.project.id
  const [project, setProject] = useState(initial.project)
  const [blocks, setBlocks] = useState(initial.blocks)
  const [sceneInfo, setSceneInfo] = useState(initial.sceneInfo)
  const [saveState, setSaveState] = useState('saved') // saved | dirty | saving | error

  const blocksRef = useRef(blocks)
  const infoRef = useRef(sceneInfo)
  const past = useRef([])
  const future = useRef([])
  const coalesce = useRef({ key: null, t: 0 })
  const timer = useRef(null)
  const saving = useRef(false)
  const dirty = useRef(false)

  // ----- saving -----
  const flushSave = useCallback(async () => {
    clearTimeout(timer.current)
    if (!dirty.current || saving.current) return
    saving.current = true
    setSaveState('saving')
    const snapBlocks = blocksRef.current
    const snapInfo = infoRef.current
    const { error } = await supabase
      .from('scripts')
      .update({ content: snapBlocks, scene_info: snapInfo, stats: analyze(snapBlocks).stats })
      .eq('project_id', projectId)
    saving.current = false
    if (error) {
      setSaveState('error')
      return
    }
    if (blocksRef.current !== snapBlocks || infoRef.current !== snapInfo) {
      flushSave() // more changes arrived while saving
    } else {
      dirty.current = false
      setSaveState('saved')
    }
  }, [projectId])

  const markDirty = useCallback(() => {
    dirty.current = true
    setSaveState((s) => (s === 'saving' ? s : 'dirty'))
    clearTimeout(timer.current)
    timer.current = setTimeout(flushSave, 1500)
  }, [flushSave])

  useEffect(() => {
    const onHide = () => {
      if (document.visibilityState === 'hidden') flushSave()
    }
    const onUnload = (e) => {
      if (dirty.current) {
        e.preventDefault()
        e.returnValue = ''
      }
    }
    document.addEventListener('visibilitychange', onHide)
    window.addEventListener('beforeunload', onUnload)
    return () => {
      document.removeEventListener('visibilitychange', onHide)
      window.removeEventListener('beforeunload', onUnload)
      flushSave() // leaving the project: save anything pending
    }
  }, [flushSave])

  // ----- editing with undo / redo -----
  const commit = useCallback(
    (next, key) => {
      const now = Date.now()
      const sameRun = key && coalesce.current.key === key && now - coalesce.current.t < 1000
      if (!sameRun) {
        past.current.push(blocksRef.current)
        if (past.current.length > 200) past.current.shift()
      }
      coalesce.current = { key: key || null, t: now }
      future.current = []
      blocksRef.current = next
      setBlocks(next)
      markDirty()
    },
    [markDirty]
  )

  const undo = useCallback(() => {
    const prev = past.current.pop()
    if (!prev) return
    future.current.push(blocksRef.current)
    blocksRef.current = prev
    coalesce.current = { key: null, t: 0 }
    setBlocks(prev)
    markDirty()
  }, [markDirty])

  const redo = useCallback(() => {
    const next = future.current.pop()
    if (!next) return
    past.current.push(blocksRef.current)
    blocksRef.current = next
    coalesce.current = { key: null, t: 0 }
    setBlocks(next)
    markDirty()
  }, [markDirty])

  const updateSceneInfo = useCallback(
    (sceneId, field, value) => {
      const next = { ...infoRef.current, [sceneId]: { ...(infoRef.current[sceneId] || {}), [field]: value } }
      infoRef.current = next
      setSceneInfo(next)
      markDirty()
    },
    [markDirty]
  )

  // The scene list and stats can trail a keystroke slightly so typing always stays fast
  const deferred = useDeferredValue(blocks)
  const analysis = useMemo(() => analyze(deferred), [deferred])

  const ctx = {
    project,
    blocks,
    blocksRef,
    commit,
    undo,
    redo,
    canUndo: past.current.length > 0,
    canRedo: future.current.length > 0,
    sceneInfo,
    updateSceneInfo,
    analysis,
    saveNow: flushSave,
    saveState,
  }

  const base = `/project/${projectId}`
  return (
    <div className="project-shell">
      <div className="project-head">
        <div className="crumbs">
          <Link to="/projects">Projects</Link>
          <span aria-hidden="true">/</span>
          <span className="crumb-title">{project.title}</span>
          {project.is_demo && <span className="badge">Demo</span>}
          {project.status === 'archived' && <span className="badge muted">Archived</span>}
        </div>
        <div className="project-head-right">
          <SaveChip state={saveState} onRetry={flushSave} />
          <ProjectMenu
            project={project}
            beforeDuplicate={flushSave}
            onChanged={(title) => {
              if (typeof title === 'string') setProject((p) => ({ ...p, title }))
              else nav('/projects')
            }}
            afterDelete={() => nav('/projects')}
          />
        </div>
      </div>
      <nav className="tabs" aria-label="Project">
        <NavLink to={base} end>
          Overview
        </NavLink>
        <NavLink to={`${base}/script`}>Script</NavLink>
        <NavLink to={`${base}/scenes`}>Scenes</NavLink>
      </nav>
      <div className="project-body">
        <Outlet context={ctx} />
      </div>
    </div>
  )
}

function SaveChip({ state, onRetry }) {
  if (state === 'error')
    return (
      <button className="save-chip error" onClick={onRetry}>
        Could not save. Try again
      </button>
    )
  const label = state === 'saving' ? 'Saving…' : state === 'dirty' ? 'Unsaved changes' : 'All changes saved'
  return <span className={'save-chip ' + state}>{label}</span>
}
