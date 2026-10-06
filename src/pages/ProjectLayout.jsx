import { useCallback, useDeferredValue, useEffect, useMemo, useRef, useState } from 'react'
import { Link, NavLink, Outlet, useNavigate, useOutletContext, useParams } from 'react-router-dom'
import { supabase } from '../lib/supabase.js'
import { analyze, newBlock } from '../lib/screenplay.js'
import ProjectMenu from '../components/ProjectMenu.jsx'
import ExportModal from '../components/ExportModal.jsx'
import { useToast } from '../components/Toast.jsx'
import { useAuth } from '../lib/auth.jsx'
import { useRows } from '../lib/rows.js'
import { shotLabels, sortShots } from '../lib/shots.js'
import { sortDays } from '../lib/schedule.js'

export const useProject = () => useOutletContext()

export default function ProjectLayout() {
  const { projectId } = useParams()
  const [state, setState] = useState({ status: 'loading' })

  useEffect(() => {
    let cancelled = false
    setState({ status: 'loading' })
    ;(async () => {
      const [p, s, shotsRes, charsRes, locsRes, tagsRes, peopleRes, daysRes, usesRes, tasksRes, gearRes] = await Promise.all([
        supabase.from('projects').select('*').eq('id', projectId).maybeSingle(),
        supabase.from('scripts').select('*').eq('project_id', projectId).maybeSingle(),
        supabase.from('shots').select('*').eq('project_id', projectId),
        supabase.from('characters').select('*').eq('project_id', projectId),
        supabase.from('locations').select('*').eq('project_id', projectId),
        supabase.from('breakdown_items').select('*').eq('project_id', projectId),
        supabase.from('people').select('*').eq('project_id', projectId),
        supabase.from('shoot_days').select('*').eq('project_id', projectId),
        supabase.from('equipment_uses').select('*').eq('project_id', projectId),
        supabase.from('tasks').select('*').eq('project_id', projectId),
        supabase.from('equipment_items').select('*'),
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
      // If the newer tables are not set up yet, the script side still works.
      const extrasError = [shotsRes, charsRes, locsRes, tagsRes].find((r) => r.error)?.error?.message || ''
      setState({
        status: 'ready',
        project: p.data,
        blocks,
        sceneInfo: script.scene_info || {},
        shots: shotsRes.data || [],
        characters: charsRes.data || [],
        locations: locsRes.data || [],
        tags: tagsRes.data || [],
        extrasError,
        people: peopleRes.data || [],
        days: daysRes.data || [],
        uses: usesRes.data || [],
        tasks: tasksRes.data || [],
        gear: gearRes.data || [],
        prodError: [peopleRes, daysRes, usesRes, tasksRes, gearRes].find((r) => r.error)?.error?.message || '',
      })
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
  const toast = useToast()
  const [exportOpen, setExportOpen] = useState(false)
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
  const failed = useRef(false)

  // ----- storyboard, shot list, characters, locations, breakdown -----
  const { user } = useAuth()
  const [busy, setBusy] = useState(0)
  const [dbError, setDbError] = useState(false)
  const dbErrRef = useRef(false)
  const track = useCallback(async (fn) => {
    setBusy((n) => n + 1)
    try {
      const r = await fn()
      dbErrRef.current = false
      setDbError(false)
      return r
    } catch (e) {
      dbErrRef.current = true
      setDbError(true)
      throw e
    } finally {
      setBusy((n) => n - 1)
    }
  }, [])
  const shotsHook = useRows({ table: 'shots', projectId, initial: initial.shots || [], track })
  const characters = useRows({ table: 'characters', projectId, initial: initial.characters || [], track })
  const locations = useRows({ table: 'locations', projectId, initial: initial.locations || [], track })
  const tags = useRows({ table: 'breakdown_items', projectId, initial: initial.tags || [], track })
  const people = useRows({ table: 'people', projectId, initial: initial.people || [], track })
  const daysHook = useRows({ table: 'shoot_days', projectId, initial: initial.days || [], track })
  const uses = useRows({ table: 'equipment_uses', projectId, initial: initial.uses || [], track })
  const tasks = useRows({ table: 'tasks', projectId, initial: initial.tasks || [], track })
  const gear = useRows({ table: 'equipment_items', projectId: null, initial: initial.gear || [], track })
  const rowsDirty =
    shotsHook.dirty || characters.dirty || locations.dirty || tags.dirty || people.dirty || daysHook.dirty || uses.dirty || tasks.dirty || gear.dirty
  const rowsDirtyRef = useRef(false)
  rowsDirtyRef.current = rowsDirty

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
    failed.current = Boolean(error)
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
      if (dirty.current || rowsDirtyRef.current) {
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

  // The Save button and Ctrl+S: save right now and tell the person it worked
  const saveNow = useCallback(async () => {
    for (let i = 0; i < 50 && saving.current; i++) await new Promise((r) => setTimeout(r, 100))
    await Promise.all([flushSave(), shotsHook.flush(), characters.flush(), locations.flush(), tags.flush(), people.flush(), daysHook.flush(), uses.flush(), tasks.flush(), gear.flush()])
    for (let i = 0; i < 50 && saving.current; i++) await new Promise((r) => setTimeout(r, 100))
    if (failed.current || dbErrRef.current) toast('Could not save. Check your connection and try again.', 'error')
    else toast('Everything saved')
  }, [flushSave, toast, shotsHook.flush, characters.flush, locations.flush, tags.flush, people.flush, daysHook.flush, uses.flush, tasks.flush, gear.flush])

  const setBoardRatio = useCallback(
    (value) => {
      setProject((p) => ({ ...p, board_ratio: value }))
      track(() =>
        supabase
          .from('projects')
          .update({ board_ratio: value })
          .eq('id', projectId)
          .then((r) => {
            if (r.error) throw r.error
          })
      ).catch(() => {})
    },
    [projectId, track]
  )

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

  const sortedShots = useMemo(() => sortShots(shotsHook.rows), [shotsHook.rows])
  const labels = useMemo(() => shotLabels(sortedShots, analysis.scenes), [sortedShots, analysis.scenes])
  const sortedDays = useMemo(() => sortDays(daysHook.rows), [daysHook.rows])
  const effectiveState =
    saveState === 'error' || dbError ? 'error' : saveState === 'saving' || busy > 0 ? 'saving' : saveState === 'dirty' || rowsDirty ? 'dirty' : 'saved'

  const ctx = {
    userId: user?.id,
    extrasError: initial.extrasError,
    shots: { ...shotsHook, rows: sortedShots },
    shotLabels: labels,
    characters,
    locations,
    tags,
    people,
    days: { ...daysHook, rows: sortedDays },
    uses,
    tasks,
    gear,
    prodError: initial.prodError,
    boardRatio: project.board_ratio || '16:9',
    setBoardRatio,
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
    saveNow,
    saveState: effectiveState,
    openExport: () => setExportOpen(true),
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
          <SaveChip state={effectiveState} onRetry={saveNow} />
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
        <span className="tab-sep" aria-hidden="true" />
        <NavLink to={`${base}/breakdown`}>Breakdown</NavLink>
        <NavLink to={`${base}/characters`}>Characters</NavLink>
        <NavLink to={`${base}/locations`}>Locations</NavLink>
        <NavLink to={`${base}/storyboard`}>Storyboard</NavLink>
        <NavLink to={`${base}/shots`}>Shot list</NavLink>
        <span className="tab-sep" aria-hidden="true" />
        <NavLink to={`${base}/schedule`}>Schedule</NavLink>
        <NavLink to={`${base}/crew`}>Cast &amp; crew</NavLink>
        <NavLink to={`${base}/equipment`}>Equipment</NavLink>
        <NavLink to={`${base}/callsheets`}>Call sheets</NavLink>
        <NavLink to={`${base}/tasks`}>Tasks</NavLink>
      </nav>
      <div className="project-body">
        <Outlet context={ctx} />
      </div>
      {exportOpen && <ExportModal project={project} blocks={blocks} onClose={() => setExportOpen(false)} />}
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
