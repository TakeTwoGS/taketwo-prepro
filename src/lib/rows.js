import { useCallback, useEffect, useRef, useState } from 'react'
import { supabase } from './supabase.js'

export function uuid() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID()
  const b = new Uint8Array(16)
  crypto.getRandomValues(b)
  b[6] = (b[6] & 0x0f) | 0x40
  b[8] = (b[8] & 0x3f) | 0x80
  const h = [...b].map((x) => x.toString(16).padStart(2, '0')).join('')
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`
}

// A list of database rows that updates on screen instantly and saves in the background.
// `track(fn)` lets the project page show "Saving..." for every kind of change.
export function useRows({ table, projectId, initial, track }) {
  const [rows, setRows] = useState(initial)
  const ref = useRef(initial)
  const pending = useRef(new Map()) // id -> changes waiting to be saved
  const timer = useRef(null)
  const [dirty, setDirty] = useState(false)

  const set = useCallback((next) => {
    ref.current = next
    setRows(next)
  }, [])

  const flush = useCallback(async () => {
    clearTimeout(timer.current)
    if (!pending.current.size) return
    const batch = [...pending.current.entries()]
    pending.current = new Map()
    try {
      await track(() =>
        Promise.all(
          batch.map(([id, patch]) =>
            supabase
              .from(table)
              .update(patch)
              .eq('id', id)
              .then((r) => {
                if (r.error) throw r.error
              })
          )
        )
      )
      if (!pending.current.size) setDirty(false)
    } catch {
      // keep the changes so the next save tries again
      for (const [id, patch] of batch) pending.current.set(id, { ...patch, ...(pending.current.get(id) || {}) })
    }
  }, [table, track])

  const update = useCallback(
    (id, patch) => {
      set(ref.current.map((r) => (r.id === id ? { ...r, ...patch } : r)))
      pending.current.set(id, { ...(pending.current.get(id) || {}), ...patch })
      setDirty(true)
      clearTimeout(timer.current)
      timer.current = setTimeout(flush, 900)
    },
    [flush, set]
  )

  const addMany = useCallback(
    async (partials) => {
      const created = partials.map((p) => ({ id: uuid(), ...(projectId ? { project_id: projectId } : {}), ...p }))
      if (!created.length) return []
      set([...ref.current, ...created])
      try {
        await track(() =>
          supabase
            .from(table)
            .insert(created)
            .then((r) => {
              if (r.error) throw r.error
            })
        )
      } catch (e) {
        const ids = new Set(created.map((c) => c.id))
        set(ref.current.filter((r) => !ids.has(r.id)))
        throw e
      }
      return created
    },
    [projectId, set, table, track]
  )

  const add = useCallback(async (partial) => (await addMany([partial]))[0], [addMany])

  const removeMany = useCallback(
    async (ids) => {
      const gone = new Set(ids)
      const removed = ref.current.filter((r) => gone.has(r.id))
      if (!removed.length) return
      ids.forEach((id) => pending.current.delete(id))
      set(ref.current.filter((r) => !gone.has(r.id)))
      try {
        await track(() =>
          supabase
            .from(table)
            .delete()
            .in('id', ids)
            .then((r) => {
              if (r.error) throw r.error
            })
        )
      } catch (e) {
        set([...ref.current, ...removed])
        throw e
      }
    },
    [set, table, track]
  )

  const remove = useCallback((id) => removeMany([id]), [removeMany])

  useEffect(() => () => flush(), [flush]) // leaving the page: save what is waiting

  return { rows, rowsRef: ref, add, addMany, update, remove, removeMany, flush, dirty }
}
