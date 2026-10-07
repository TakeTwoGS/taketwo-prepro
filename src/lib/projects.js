import { useCallback, useEffect, useState } from 'react'
import { todayStr } from './dates.js'
import { supabase } from './supabase.js'
import { analyze, newBlock, parsePlainText } from './screenplay.js'
import { buildDemo, DEMO_TITLE } from './demo.js'
import { copyImage, removeProjectFiles } from './images.js'
import { uuid } from './rows.js'

// The projects list comes back with a tiny "scripts" piece (last edited + stats)
export function scriptOf(project) {
  const s = project.scripts
  return Array.isArray(s) ? s[0] : s
}

export async function listProjects() {
  const { data, error } = await supabase
    .from('projects')
    .select('*, scripts(updated_at, stats)')
    .order('updated_at', { ascending: false })
  if (error) throw error
  return data || []
}

export function useProjectList() {
  const [projects, setProjects] = useState(null)
  const [error, setError] = useState('')
  const reload = useCallback(async () => {
    try {
      setProjects(await listProjects())
      setError('')
    } catch (e) {
      setError(e.message || 'Could not load your projects.')
    }
  }, [])
  useEffect(() => {
    reload()
  }, [reload])
  return { projects, error, reload }
}

export async function createProject({ title, text = '', isDemo = false, blocks, sceneInfo }) {
  let content = blocks
  if (!content) content = text.trim() ? parsePlainText(text) : [newBlock('scene', '')]
  if (!content.length) content = [newBlock('scene', '')]

  const { data: project, error } = await supabase
    .from('projects')
    .insert({ title: (title || '').trim() || 'Untitled Film', is_demo: isDemo })
    .select()
    .single()
  if (error) throw error

  const { error: scriptError } = await supabase.from('scripts').insert({
    project_id: project.id,
    content,
    scene_info: sceneInfo || {},
    stats: analyze(content).stats,
  })
  if (scriptError) {
    await supabase.from('projects').delete().eq('id', project.id)
    throw scriptError
  }
  return project
}

export async function createDemoProject() {
  const { blocks, sceneInfo } = buildDemo()
  return createProject({ title: DEMO_TITLE, isDemo: true, blocks, sceneInfo })
}

export async function duplicateProject(project) {
  const { data: sess } = await supabase.auth.getSession()
  const mineId = sess?.session?.user?.id
  const { data, error } = await supabase
    .from('scripts')
    .select('content, scene_info')
    .eq('project_id', project.id)
    .single()
  if (error) throw error
  const copy = await createProject({
    title: `${project.title} (copy)`,
    blocks: data.content,
    sceneInfo: data.scene_info,
  })

  // Carry over the storyboard, shot list, breakdown, characters, locations, cast and crew, schedule, gear, and tasks.
  // This part is "best effort": if something fails, the script copy still exists.
  try {
    const grab = (t) => supabase.from(t).select('*').eq('project_id', project.id)
    const [shots, chars, locs, tags, people, days, uses, tasks] = await Promise.all([
      grab('shots'),
      grab('characters'),
      grab('locations'),
      grab('breakdown_items'),
      grab('people'),
      grab('shoot_days'),
      grab('equipment_uses'),
      grab('tasks'),
    ])
    const maps = { shots: new Map(), people: new Map(), days: new Map() }
    const strip = (row, map) => {
      const { id, created_at, updated_at, user_id, ...rest } = row
      const fresh = uuid()
      if (map) map.set(id, fresh)
      return { ...rest, id: fresh, project_id: copy.id }
    }

    const pathMap = new Map()
    const copyPath = async (p) => {
      if (!p) return p
      if (!pathMap.has(p)) pathMap.set(p, await copyImage(p, copy.id, mineId))
      return pathMap.get(p)
    }
    const shotRows = []
    for (const r of shots.data || []) shotRows.push({ ...strip(r, maps.shots), image_path: await copyPath(r.image_path) })
    const charRows = []
    for (const r of chars.data || []) charRows.push({ ...strip(r), images: (await Promise.all((r.images || []).map(copyPath))).filter(Boolean) })
    const locRows = []
    for (const r of locs.data || []) locRows.push({ ...strip(r), photos: (await Promise.all((r.photos || []).map(copyPath))).filter(Boolean) })
    const tagRows = (tags.data || []).map((r) => strip(r))
    const peopleRows = []
    for (const r of people.data || []) peopleRows.push({ ...strip(r, maps.people), photo_path: await copyPath(r.photo_path) })

    const remapKeys = (obj) => Object.fromEntries(Object.entries(obj || {}).map(([k, v]) => [maps.people.get(k) || k, v]))
    const dayRows = (days.data || []).map((r) => {
      const row = strip(r, maps.days)
      const cs = r.call_sheet || {}
      return {
        ...row,
        call_sheet: { ...cs, calls: remapKeys(cs.calls), crew_off: (cs.crew_off || []).map((id) => maps.people.get(id) || id) },
      }
    })
    const useRows = (uses.data || []).map((r) => {
      const row = strip(r)
      if (r.scope === 'shot') row.target_id = maps.shots.get(r.target_id) || r.target_id
      if (r.scope === 'day') row.target_id = maps.days.get(r.target_id) || r.target_id
      return row
    })
    const taskRows = (tasks.data || []).map((r) => ({ ...strip(r), person_id: r.person_id ? maps.people.get(r.person_id) || null : null }))

    // Order matters: tasks point at people
    if (shotRows.length) await supabase.from('shots').insert(shotRows)
    if (charRows.length) await supabase.from('characters').insert(charRows)
    if (locRows.length) await supabase.from('locations').insert(locRows)
    if (tagRows.length) await supabase.from('breakdown_items').insert(tagRows)
    if (peopleRows.length) await supabase.from('people').insert(peopleRows)
    if (dayRows.length) await supabase.from('shoot_days').insert(dayRows)
    if (useRows.length) await supabase.from('equipment_uses').insert(useRows)
    if (taskRows.length) await supabase.from('tasks').insert(taskRows)
    if (project.board_ratio) await supabase.from('projects').update({ board_ratio: project.board_ratio }).eq('id', copy.id)
  } catch (e) {
    console.warn('Could not copy everything into the duplicate', e)
  }
  return copy
}

export async function renameProject(id, title) {
  const { error } = await supabase.from('projects').update({ title: title.trim() || 'Untitled Film' }).eq('id', id)
  if (error) throw error
}

export async function setProjectStatus(id, status) {
  const { error } = await supabase.from('projects').update({ status }).eq('id', id)
  if (error) throw error
}

export async function leaveProject(id) {
  const { data } = await supabase.auth.getSession()
  const userId = data?.session?.user?.id
  const { error } = await supabase.from('project_members').delete().eq('project_id', id).eq('user_id', userId)
  if (error) throw error
}

export async function deleteProject(id) {
  const { data } = await supabase.auth.getSession()
  const userId = data?.session?.user?.id
  const { error } = await supabase.from('projects').delete().eq('id', id)
  if (error) throw error
  if (userId) removeProjectFiles(userId, id) // clean up pictures (not waiting for it)
}

// Things shown on the Home page across all projects: upcoming shoot days and open tasks
export function useDashboardExtras() {
  const [data, setData] = useState({ days: [], tasks: [], mentions: [] })
  useEffect(() => {
    let live = true
    ;(async () => {
      try {
        const { data: sess } = await supabase.auth.getSession()
        const me = sess?.session?.user?.id
        const since = new Date(Date.now() - 14 * 86400000).toISOString()
        const [d, t, m] = await Promise.all([
          supabase.from('shoot_days').select('id, project_id, label, date, call_time, scene_ids').gte('date', todayStr()).order('date', { ascending: true }).limit(5),
          supabase
            .from('tasks')
            .select('id, project_id, name, due_date, priority, status')
            .neq('status', 'Done')
            .order('due_date', { ascending: true, nullsFirst: false })
            .limit(8),
          me
            ? supabase
                .from('comments')
                .select('id, project_id, block_id, body, user_id, created_at, resolved')
                .contains('mentions', [me])
                .eq('resolved', false)
                .gte('created_at', since)
                .order('created_at', { ascending: false })
                .limit(5)
            : Promise.resolve({ data: [] }),
        ])
        let mentions = m.data || []
        if (mentions.length) {
          const ids = [...new Set(mentions.map((x) => x.user_id))]
          const { data: profs } = await supabase.from('profiles').select('id, display_name, email').in('id', ids)
          const names = Object.fromEntries((profs || []).map((p) => [p.id, p.display_name || p.email || 'Someone']))
          mentions = mentions.map((x) => ({ ...x, author: names[x.user_id] || 'Someone' }))
        }
        if (live) setData({ days: d.data || [], tasks: t.data || [], mentions })
      } catch {
        /* the dashboard just shows nothing extra */
      }
    })()
    return () => {
      live = false
    }
  }, [])
  return data
}
