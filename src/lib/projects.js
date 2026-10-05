import { useCallback, useEffect, useState } from 'react'
import { supabase } from './supabase.js'
import { analyze, newBlock, parsePlainText } from './screenplay.js'
import { buildDemo, DEMO_TITLE } from './demo.js'

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
  return createProject({
    title: `${project.title} (copy)`,
    blocks: data.content,
    sceneInfo: data.scene_info,
  })
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
  const { error } = await supabase.from('projects').delete().eq('id', id)
  if (error) throw error
}
