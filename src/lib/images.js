import { useEffect, useState } from 'react'
import { supabase } from './supabase.js'
import { uid } from './screenplay.js'

// Pictures live in a private Supabase storage bucket. Each person only sees their own.
export const BUCKET = 'project-images'
const ONE_DAY = 60 * 60 * 24

const cache = new Map() // path -> { url, exp }
let queue = new Map() // path -> [resolve, ...]
let timer = null

async function loadBitmap(file) {
  if (typeof createImageBitmap === 'function') {
    try {
      return await createImageBitmap(file, { imageOrientation: 'from-image' })
    } catch {
      /* fall through to the older way */
    }
  }
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file)
    const img = new Image()
    img.onload = () => {
      URL.revokeObjectURL(url)
      resolve(img)
    }
    img.onerror = () => reject(new Error('Could not read that image.'))
    img.src = url
  })
}

// Shrinks big phone photos so they upload fast and stay inside the free storage limit
export async function resizeImage(file, maxSide = 1600, quality = 0.85) {
  const img = await loadBitmap(file)
  const w = img.width || img.naturalWidth
  const h = img.height || img.naturalHeight
  const scale = Math.min(1, maxSide / Math.max(w, h))
  const canvas = document.createElement('canvas')
  canvas.width = Math.max(1, Math.round(w * scale))
  canvas.height = Math.max(1, Math.round(h * scale))
  const ctx = canvas.getContext('2d')
  ctx.fillStyle = '#ffffff'
  ctx.fillRect(0, 0, canvas.width, canvas.height)
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
  return new Promise((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('Could not process that image.'))), 'image/jpeg', quality)
  )
}

export async function uploadImage(file, { userId, projectId }) {
  if (!file || !String(file.type).startsWith('image/')) throw new Error('That file is not a picture.')
  const blob = await resizeImage(file)
  const path = `${userId}/${projectId}/${uid()}${uid()}.jpg`
  const { error } = await supabase.storage.from(BUCKET).upload(path, blob, { contentType: 'image/jpeg', upsert: false })
  if (error) throw error
  cache.set(path, { url: URL.createObjectURL(blob), exp: Infinity }) // show it instantly
  return path
}

export async function removeImages(paths) {
  const list = (paths || []).filter(Boolean)
  if (!list.length) return
  list.forEach((p) => cache.delete(p))
  try {
    await supabase.storage.from(BUCKET).remove(list)
  } catch {
    /* leftover files are harmless */
  }
}

export async function removeProjectFiles(userId, projectId) {
  try {
    const folder = `${userId}/${projectId}`
    const { data } = await supabase.storage.from(BUCKET).list(folder, { limit: 1000 })
    const paths = (data || []).filter((f) => f.name).map((f) => `${folder}/${f.name}`)
    if (paths.length) await removeImages(paths)
  } catch {
    /* best effort */
  }
}

export async function copyImage(fromPath, newProjectId) {
  const parts = fromPath.split('/')
  const to = `${parts[0]}/${newProjectId}/${uid()}${uid()}.jpg`
  const { error } = await supabase.storage.from(BUCKET).copy(fromPath, to)
  if (error) return null
  return to
}

async function flushQueue() {
  timer = null
  const batch = queue
  queue = new Map()
  const paths = [...batch.keys()]
  const found = new Map()
  try {
    const { data } = await supabase.storage.from(BUCKET).createSignedUrls(paths, ONE_DAY)
    for (const d of data || []) if (d.signedUrl && d.path) found.set(d.path, d.signedUrl)
  } catch {
    /* pictures just stay blank */
  }
  for (const [path, resolvers] of batch) {
    const url = found.get(path) || null
    if (url) cache.set(path, { url, exp: Date.now() + ONE_DAY * 1000 - 5 * 60 * 1000 })
    resolvers.forEach((r) => r(url))
  }
}

export function getSignedUrl(path) {
  const hit = cache.get(path)
  if (hit && hit.exp > Date.now() + 60 * 1000) return Promise.resolve(hit.url)
  return new Promise((resolve) => {
    if (!queue.has(path)) queue.set(path, [])
    queue.get(path).push(resolve)
    if (!timer) timer = setTimeout(flushQueue, 25)
  })
}

export function useImageUrl(path) {
  const [url, setUrl] = useState(() => (path && cache.get(path)?.url) || null)
  useEffect(() => {
    if (!path) {
      setUrl(null)
      return
    }
    let live = true
    const hit = cache.get(path)
    if (hit && hit.exp > Date.now()) setUrl(hit.url)
    getSignedUrl(path).then((u) => live && setUrl(u))
    return () => {
      live = false
    }
  }, [path])
  return url
}
