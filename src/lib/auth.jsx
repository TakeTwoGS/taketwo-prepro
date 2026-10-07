import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { supabase } from './supabase.js'
import { createDemoProject } from './projects.js'

const AuthCtx = createContext(null)
export const useAuth = () => useContext(AuthCtx)

// Makes sure the signed-in person has a profile. The very first time, it also creates the demo project.
// Several calls at once share one request so the demo is never created twice.
const inflight = new Map()

function ensureProfile(user) {
  const userId = user.id
  if (inflight.has(userId)) return inflight.get(userId)
  const job = (async () => {
    const { data, error } = await supabase.from('profiles').select('*').eq('id', userId).maybeSingle()
    if (error) throw error
    let profile = data
    if (!profile) {
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
      const { data: fresh, error: readError } = await supabase.from('profiles').select('*').eq('id', userId).maybeSingle()
      if (readError) throw readError
      profile = fresh
    }

    // Let teammates see my name and picture, and pick up any projects shared with my email.
    // Both are "nice to have": an older database that has not been updated yet must not block sign-in.
    const meta = user.user_metadata || {}
    const info = {
      display_name: meta.full_name || meta.name || (user.email ? user.email.split('@')[0] : null),
      email: user.email || null,
      avatar_url: meta.avatar_url || meta.picture || null,
    }
    try {
      await supabase.from('profiles').update(info).eq('id', userId)
      await supabase.rpc('accept_invites')
    } catch {
      /* ignore */
    }
    return profile ? { ...profile, ...info } : profile
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
  const sessionUser = session?.user
  useEffect(() => {
    if (!userId) {
      setProfile(null)
      setProfileError('')
      return
    }
    let cancelled = false
    ensureProfile(sessionUser)
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
