import { useCallback, useDeferredValue, useEffect, useMemo, useRef, useState } from 'react'
import { Link, NavLink, Outlet, useNavigate, useOutletContext, useParams } from 'react-router-dom'
import { supabase } from '../lib/supabase.js'
import { analyze, newBlock } from '../lib/screenplay.js'
import { mergeBlocks, mergeInfo, sameBlocks } from '../lib/merge.js'
import ProjectMenu from '../components/ProjectMenu.jsx'
import ExportModal from '../components/ExportModal.jsx'
import ShareModal from '../components/ShareModal.jsx'
import PrintDocs from '../components/PrintDocs.jsx'
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
      const [p, s, shotsRes, charsRes, locsRes, tagsRes, peopleRes, daysRes, usesRes, tasksRes, gearRes, commentsRes, takesRes, membersRes] = await Promise.all([
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
        supabase.from('comments').select('*').eq('project_id', projectId),
        supabase.from('takes').select('*').eq('project_id', projectId),
        supabase.from('project_members').select('*').eq('project_id', projectId),
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
      const members = membersRes.data || []
      const ids = [...new Set([p.data.user_id, ...members.map((m) => m.user_id)].filter(Boolean))]
      const profRes = ids.length ? await supabase.from('profiles').select('id, display_name, email, avatar_url').in('id', ids) : { data: [] }
      if (cancelled) return
      // If the newer tables are not set up yet, the script side still works.
      const extrasError = [shotsRes, charsRes, locsRes, tagsRes].find((r) => r.error)?.error?.message || ''
      setState({
        status: 'ready',
        project: p.data,
        blocks,
        sceneInfo: script.scene_info || {},
        scriptUpdatedAt: script.updated_at || null,
        members,
        profiles: Object.fromEntries((profRes.data || []).map((x) => [x.id, x])),
        comments: commentsRes.data || [],
        takes: takesRes.data || [],
        collabError: [commentsRes, takesRes, membersRes].find((r) => r.error)?.error?.message || '',
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
  const { user } = useAuth()
  const [exportOpen, setExportOpen] = useState(false)
  const [shareOpen, setShareOpen] = useState(false)
  const [printJob, setPrintJob] = useState(null)
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
  // what the server last had, so two people's edits can be merged
  const knownAt = useRef(initial.scriptUpdatedAt || null)
  const baseBlocks = useRef(initial.blocks)
  const baseInfo = useRef(initial.sceneInfo)
  const conflictRetries = useRef(0)

  // ----- who am I in this project? -----
  const [members, setMembers] = useState(initial.members || [])
  const [profiles, setProfiles] = useState(initial.profiles || {})
  const isOwner = !project.user_id || project.user_id === user?.id
  const role = isOwner ? 'owner' : members.find((m) => m.user_id === user?.id)?.role || 'viewer'
  const canEdit = role === 'owner' || role === 'editor'
  const canComment = canEdit || role === 'commenter'

  const lastDenied = useRef(0)
  const onDenied = useCallback(() => {
    const now = Date.now()
    if (now - lastDenied.current > 4000) {
      lastDenied.current = now
      toast('This project is view-only for you, so changes are not kept. Ask the owner for edit access.', 'error')
    }
  }, [toast])

  const team = useMemo(() => {
    const ids = [...new Set([project.user_id, ...members.map((m) => m.user_id)].filter(Boolean))]
    return ids.map((id) => {
      const pr = profiles[id] || {}
      return {
        id,
        role: id === project.user_id ? 'owner' : members.find((m) => m.user_id === id)?.role,
        name: pr.display_name || pr.email || (id === user?.id ? 'You' : 'Someone'),
        email: pr.email || '',
        avatar: pr.avatar_url || '',
      }
    })
  }, [project.user_id, members, profiles, user?.id])

  const refreshTeam = useCallback(async () => {
    const { data: mem } = await supabase.from('project_members').select('*').eq('project_id', projectId)
    const list = mem || []
    setMembers(list)
    const ids = [...new Set([project.user_id, ...list.map((m) => m.user_id)].filter(Boolean))]
    if (ids.length) {
      const { data } = await supabase.from('profiles').select('id, display_name, email, avatar_url').in('id', ids)
      setProfiles(Object.fromEntries((data || []).map((x) => [x.id, x])))
    }
  }, [projectId, project.user_id])

  // ----- the rest of the project's data -----
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
  const rowOpts = { projectId, track, readOnly: !canEdit, onDenied, realtime: true }
  const shotsHook = useRows({ table: 'shots', initial: initial.shots || [], ...rowOpts })
  const characters = useRows({ table: 'characters', initial: initial.characters || [], ...rowOpts })
  const locations = useRows({ table: 'locations', initial: initial.locations || [], ...rowOpts })
  const tags = useRows({ table: 'breakdown_items', initial: initial.tags || [], ...rowOpts })
  const people = useRows({ table: 'people', initial: initial.people || [], ...rowOpts })
  const daysHook = useRows({ table: 'shoot_days', initial: initial.days || [], ...rowOpts })
  const uses = useRows({ table: 'equipment_uses', initial: initial.uses || [], ...rowOpts })
  const tasks = useRows({ table: 'tasks', initial: initial.tasks || [], ...rowOpts })
  const takes = useRows({ table: 'takes', initial: initial.takes || [], ...rowOpts })
  const gear = useRows({ table: 'equipment_items', projectId: null, initial: initial.gear || [], track, readOnly: false })
  // commenters may add comments even though they cannot change anything else
  const comments = useRows({ table: 'comments', projectId, initial: initial.comments || [], track, readOnly: !canComment, onDenied, realtime: true })
  const rowsDirty =
    shotsHook.dirty || characters.dirty || locations.dirty || tags.dirty || people.dirty || daysHook.dirty || uses.dirty || tasks.dirty || takes.dirty || gear.dirty || comments.dirty
  const rowsDirtyRef = useRef(false)
  rowsDirtyRef.current = rowsDirty

  // ----- the script: saving, and merging with what other people saved -----
  const applyRemote = useCallback(
    (row) => {
      if (!row || row.updated_at === knownAt.current) return // that was my own save coming back
      const theirsBlocks = Array.isArray(row.content) && row.content.length ? row.content : blocksRef.current
      const theirsInfo = row.scene_info || {}
      const mine = blocksRef.current
      const mineInfo = infoRef.current
      let nextBlocks = theirsBlocks
      let nextInfo = theirsInfo
      let conflicts = []
      if (dirty.current) {
        const m = mergeBlocks(baseBlocks.current, mine, theirsBlocks)
        nextBlocks = m.blocks
        conflicts = m.conflicts
        nextInfo = mergeInfo(baseInfo.current, mineInfo, theirsInfo)
      }
      baseBlocks.current = theirsBlocks
      baseInfo.current = theirsInfo
      knownAt.current = row.updated_at
      if (!sameBlocks(nextBlocks, mine)) {
        blocksRef.current = nextBlocks
        setBlocks(nextBlocks)
        past.current = [] // undo would otherwise undo other people's work too
        future.current = []
      }
      if (JSON.stringify(nextInfo) !== JSON.stringify(mineInfo)) {
        infoRef.current = nextInfo
        setSceneInfo(nextInfo)
      }
      if (conflicts.length) toast('Someone edited the same line as you at the same moment. Yours was kept.')
    },
    [toast]
  )
  const applyRemoteRef = useRef(applyRemote)
  applyRemoteRef.current = applyRemote

  const flushSave = useCallback(async () => {
    clearTimeout(timer.current)
    if (!dirty.current || saving.current) return
    saving.current = true
    setSaveState('saving')
    const snapBlocks = blocksRef.current
    const snapInfo = infoRef.current
    const strict = Boolean(knownAt.current) && conflictRetries.current < 3
    let q = supabase
      .from('scripts')
      .update({ content: snapBlocks, scene_info: snapInfo, stats: analyze(snapBlocks).stats })
      .eq('project_id', projectId)
    if (strict) q = q.eq('updated_at', knownAt.current)
    const { data, error } = await q.select('updated_at')
    saving.current = false
    failed.current = Boolean(error)
    if (error) {
      setSaveState('error')
      return
    }
    if (strict && (!data || data.length === 0)) {
      // someone else saved first: bring in their changes, then save again
      conflictRetries.current += 1
      const { data: latest } = await supabase.from('scripts').select('content, scene_info, updated_at').eq('project_id', projectId).maybeSingle()
      if (latest) {
        knownAt.current = null // force the merge even if the timestamps look alike
        applyRemoteRef.current(latest)
      }
      flushSave()
      return
    }
    conflictRetries.current = 0
    if (data && data[0]) knownAt.current = data[0].updated_at
    baseBlocks.current = snapBlocks
    baseInfo.current = snapInfo
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

  // Other people's script saves, the project's own settings, and who is here right now
  const [here, setHere] = useState([])
  const me = team.find((t) => t.id === user?.id)
  const myName = me?.name || user?.email || 'Someone'
  const myAvatar = me?.avatar || ''
  useEffect(() => {
    if (!supabase.channel) return
    const channel = supabase
      .channel(`project:${projectId}`)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'scripts', filter: `project_id=eq.${projectId}` }, (p) => applyRemoteRef.current(p.new))
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'projects', filter: `id=eq.${projectId}` }, (p) => {
        const incoming = p.new || {}
        // my own slate coming back is old news; another device's slate is applied
        const mine = incoming.slate && JSON.stringify(incoming.slate) === lastSlateSent.current
        if (incoming.slate && !mine) slateRef.current = incoming.slate
        setProject((prev) => ({ ...prev, ...incoming, ...(mine ? { slate: prev.slate } : {}) }))
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'project_members', filter: `project_id=eq.${projectId}` }, () => refreshTeam())
      .subscribe()
    return () => {
      supabase.removeChannel(channel)
    }
  }, [projectId, refreshTeam])

  useEffect(() => {
    if (!supabase.channel || !user?.id) return
    const ch = supabase.channel(`presence:${projectId}`, { config: { presence: { key: user.id } } })
    const sync = () => {
      const state = ch.presenceState()
      setHere(
        Object.entries(state)
          .filter(([key]) => key !== user.id)
          .map(([key, list]) => ({ id: key, ...(list[0] || {}) }))
      )
    }
    ch.on('presence', { event: 'sync' }, sync).subscribe(async (status) => {
      if (status === 'SUBSCRIBED') await ch.track({ name: myName, avatar: myAvatar })
    })
    return () => {
      supabase.removeChannel(ch)
    }
  }, [projectId, user?.id, myName, myAvatar])

  // The Save button and Ctrl+S: save right now and tell the person it worked
  const saveNow = useCallback(async () => {
    for (let i = 0; i < 50 && saving.current; i++) await new Promise((r) => setTimeout(r, 100))
    await Promise.all([
      flushSave(),
      shotsHook.flush(),
      characters.flush(),
      locations.flush(),
      tags.flush(),
      people.flush(),
      daysHook.flush(),
      uses.flush(),
      tasks.flush(),
      takes.flush(),
      gear.flush(),
      comments.flush(),
    ])
    for (let i = 0; i < 50 && saving.current; i++) await new Promise((r) => setTimeout(r, 100))
    if (failed.current || dbErrRef.current) toast('Could not save. Check your connection and try again.', 'error')
    else toast('Everything saved')
  }, [flushSave, toast, shotsHook.flush, characters.flush, locations.flush, tags.flush, people.flush, daysHook.flush, uses.flush, tasks.flush, takes.flush, gear.flush, comments.flush])

  const setBoardRatio = useCallback(
    (value) => {
      if (!canEdit) return onDenied()
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
    [projectId, track, canEdit, onDenied]
  )

  // The digital slate and On-Set Mode share one small record on the project, so a phone and a tablet stay in step
  const slateRef = useRef(initial.project.slate || {})
  const slateTimer = useRef(null)
  const lastSlateSent = useRef(null)
  const updateSlate = useCallback(
    (patch) => {
      if (!canEdit) return
      const next = { ...slateRef.current, ...patch }
      slateRef.current = next
      setProject((p) => ({ ...p, slate: next }))
      clearTimeout(slateTimer.current)
      slateTimer.current = setTimeout(() => {
        const sending = slateRef.current
        lastSlateSent.current = JSON.stringify(sending)
        track(() =>
          supabase
            .from('projects')
            .update({ slate: sending })
            .eq('id', projectId)
            .then((r) => {
              if (r.error) throw r.error
            })
        ).catch(() => {})
      }, 400)
    },
    [projectId, track, canEdit]
  )

  // ----- editing with undo / redo -----
  const commit = useCallback(
    (next, key) => {
      if (!canEdit) return onDenied()
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
    [markDirty, canEdit, onDenied]
  )

  const undo = useCallback(() => {
    if (!canEdit) return onDenied()
    const prev = past.current.pop()
    if (!prev) return
    future.current.push(blocksRef.current)
    blocksRef.current = prev
    coalesce.current = { key: null, t: 0 }
    setBlocks(prev)
    markDirty()
  }, [markDirty, canEdit, onDenied])

  const redo = useCallback(() => {
    if (!canEdit) return onDenied()
    const next = future.current.pop()
    if (!next) return
    past.current.push(blocksRef.current)
    blocksRef.current = next
    coalesce.current = { key: null, t: 0 }
    setBlocks(next)
    markDirty()
  }, [markDirty, canEdit, onDenied])

  const updateSceneInfo = useCallback(
    (sceneId, field, value) => {
      if (!canEdit) return onDenied()
      const next = { ...infoRef.current, [sceneId]: { ...(infoRef.current[sceneId] || {}), [field]: value } }
      infoRef.current = next
      setSceneInfo(next)
      markDirty()
    },
    [markDirty, canEdit, onDenied]
  )

  // Put an older version of the script back (the current one is saved as a version first, by the Versions window)
  const restoreScript = useCallback(
    (nextBlocks, nextInfo) => {
      if (!canEdit) return onDenied()
      past.current.push(blocksRef.current)
      future.current = []
      blocksRef.current = nextBlocks
      infoRef.current = nextInfo || {}
      setBlocks(nextBlocks)
      setSceneInfo(infoRef.current)
      markDirty()
    },
    [markDirty, canEdit, onDenied]
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
    role,
    isOwner,
    canEdit,
    canComment,
    team,
    here,
    refreshTeam,
    collabError: initial.collabError,
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
    takes,
    comments,
    gear,
    prodError: initial.prodError,
    boardRatio: project.board_ratio || '16:9',
    setBoardRatio,
    slate: project.slate || {},
    updateSlate,
    project,
    blocks,
    blocksRef,
    commit,
    undo,
    redo,
    restoreScript,
    canUndo: past.current.length > 0,
    canRedo: future.current.length > 0,
    sceneInfo,
    updateSceneInfo,
    analysis,
    saveNow,
    saveState: effectiveState,
    openExport: () => setExportOpen(true),
    openShare: () => setShareOpen(true),
    printDoc: (kind, opts = {}) => setPrintJob({ kind, opts }),
  }

  const base = `/project/${projectId}`
  const shown = [...here].slice(0, 4)
  return (
    <div className="project-shell">
      <div className="project-head">
        <div className="crumbs">
          <Link to="/projects">Projects</Link>
          <span aria-hidden="true">/</span>
          <span className="crumb-title">{project.title}</span>
          {project.is_demo && <span className="badge">Demo</span>}
          {project.status === 'archived' && <span className="badge muted">Archived</span>}
          {!isOwner && <span className="badge">Shared with you</span>}
        </div>
        <div className="project-head-right">
          {shown.length > 0 && (
            <div className="presence" aria-label="People here right now">
              {shown.map((h) => (
                <span key={h.id} className="presence-dot" title={`${h.name || 'Someone'} is here`}>
                  {h.avatar ? <img src={h.avatar} alt="" referrerPolicy="no-referrer" /> : (h.name || '?').charAt(0).toUpperCase()}
                </span>
              ))}
              {here.length > shown.length && <span className="presence-more">+{here.length - shown.length}</span>}
            </div>
          )}
          <SaveChip state={effectiveState} onRetry={saveNow} />
          <button className="btn btn-ghost btn-sm" onClick={() => setShareOpen(true)}>
            {isOwner ? 'Share' : 'Team'}
          </button>
          <ProjectMenu
            project={project}
            isOwner={isOwner}
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
        <span className="tab-sep" aria-hidden="true" />
        <NavLink to={`${base}/onset`}>On set</NavLink>
        <NavLink to={`${base}/exports`}>Exports</NavLink>
      </nav>
      {!canEdit && (
        <div className="role-banner">
          {role === 'commenter'
            ? 'You can read this project and leave comments on the script, but you cannot change it.'
            : 'You have view-only access to this project. You can read, print, and export everything, but changes are not kept.'}
        </div>
      )}
      <div className="project-body">
        <Outlet context={ctx} />
      </div>
      {exportOpen && <ExportModal project={project} blocks={blocks} onClose={() => setExportOpen(false)} />}
      {shareOpen && <ShareModal ctx={ctx} onClose={() => setShareOpen(false)} />}
      {printJob && <PrintDocs job={printJob} ctx={ctx} onDone={() => setPrintJob(null)} />}
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
