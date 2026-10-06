import { useCallback, useEffect, useState } from 'react'
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

  // Carry over the storyboard, shot list, characters, locations and breakdown.
  // This part is "best effort": if something fails, the script copy still exists.
  try {
    const [shots, chars, locs, tags] = await Promise.all([
      supabase.from('shots').select('*').eq('project_id', project.id),
      supabase.from('characters').select('*').eq('project_id', project.id),
      supabase.from('locations').select('*').eq('project_id', project.id),
      supabase.from('breakdown_items').select('*').eq('project_id', project.id),
    ])
    const strip = ({ id, created_at, updated_at, user_id, ...rest }) => ({ ...rest, id: uuid(), project_id: copy.id })

    const pathMap = new Map()
    const copyPath = async (p) => {
      if (!p) return p
      if (!pathMap.has(p)) pathMap.set(p, await copyImage(p, copy.id))
      return pathMap.get(p)
    }
    const shotRows = []
    for (const r of shots.data || []) shotRows.push({ ...strip(r), image_path: await copyPath(r.image_path) })
    const charRows = []
    for (const r of chars.data || []) charRows.push({ ...strip(r), images: (await Promise.all((r.images || []).map(copyPath))).filter(Boolean) })
    const locRows = []
    for (const r of locs.data || []) locRows.push({ ...strip(r), photos: (await Promise.all((r.photos || []).map(copyPath))).filter(Boolean) })
    const tagRows = (tags.data || []).map(strip)

    if (shotRows.length) await supabase.from('shots').insert(shotRows)
    if (charRows.length) await supabase.from('characters').insert(charRows)
    if (locRows.length) await supabase.from('locations').insert(locRows)
    if (tagRows.length) await supabase.from('breakdown_items').insert(tagRows)
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

export async function deleteProject(id) {
  const { data } = await supabase.auth.getSession()
  const userId = data?.session?.user?.id
  const { error } = await supabase.from('projects').delete().eq('id', id)
  if (error) throw error
  if (userId) removeProjectFiles(userId, id) // clean up pictures (not waiting for it)
}
