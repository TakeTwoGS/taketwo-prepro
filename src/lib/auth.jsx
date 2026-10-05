import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { supabase } from './supabase.js'
import { createDemoProject } from './projects.js'

const AuthCtx = createContext(null)
export const useAuth = () => useContext(AuthCtx)

// Makes sure the signed-in person has a profile. The very first time, it also creates the demo project.
// Several calls at once share one request so the demo is never created twice.
const inflight = new Map()

function ensureProfile(userId) {
  if (inflight.has(userId)) return inflight.get(userId)
  const job = (async () => {
    const { data, error } = await supabase.from('profiles').select('*').eq('id', userId).maybeSingle()
    if (error) throw error
    if (data) return data

    const { error: insertError } = await supabase.from('profiles').insert({ id: userId })
    if (!insertError) {
      try {
        await createDemoProject()
      } catch (e) {
        // The demo is a bonus. Never block sign-in because of it.
        console.warn('Could not create the demo project', e)
      }
    } else if (insertError.code !== '23505') {
      throw insertError
    }
    const { data: profile, error: readError } = await supabase.from('profiles').select('*').eq('id', userId).maybeSingle()
    if (readError) throw readError
    return profile
  })().finally(() => setTimeout(() => inflight.delete(userId), 3000))
  inflight.set(userId, job)
  return job
}

export function AuthProvider({ children }) {
  const [session, setSession] = useState(undefined) // undefined = still checking
  const [profile, setProfile] = useState(null)
  const [profileError, setProfileError] = useState('')

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session ?? null))
    const { data } = supabase.auth.onAuthStateChange((_event, s) => setSession(s ?? null))
    return () => data.subscription.unsubscribe()
  }, [])

  const userId = session?.user?.id
  useEffect(() => {
    if (!userId) {
      setProfile(null)
      setProfileError('')
      return
    }
    let cancelled = false
    ensureProfile(userId)
      .then((p) => {
        if (!cancelled) {
          setProfile(p)
          setProfileError('')
        }
      })
      .catch((e) => {
        if (!cancelled) setProfileError(e.message || 'Could not load your account.')
      })
    return () => {
      cancelled = true
    }
  }, [userId])

  const setBeginner = useCallback(
    async (value) => {
      setProfile((p) => (p ? { ...p, beginner_mode: value } : p))
      if (userId) await supabase.from('profiles').update({ beginner_mode: value }).eq('id', userId)
    },
    [userId]
  )

  const signOut = useCallback(() => supabase.auth.signOut(), [])

  const value = useMemo(
    () => ({
      session,
      user: session?.user ?? null,
      loading: session === undefined,
      profile,
      profileError,
      beginner: profile?.beginner_mode ?? true,
      setBeginner,
      signOut,
    }),
    [session, profile, profileError, setBeginner, signOut]
  )

  return <AuthCtx.Provider value={value}>{children}</AuthCtx.Provider>
}
