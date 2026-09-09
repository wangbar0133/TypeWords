import { defineStore } from 'pinia'
import type { Session, User } from '@supabase/supabase-js'
import { Supabase } from '../utils/supabase'

export const LAST_USER_ID_KEY = 'typewords_last_user_id'

export const useUserStore = defineStore('user', {
  state: () => ({
    user: null as User | null,
    session: null as Session | null,
    load: false,
  }),
  getters: {
    isLoggedIn: (state): boolean => !!state.session,
    email: (state): string => state.user?.email ?? '',
  },
  actions: {
    applySession(session: Session | null) {
      this.session = session
      this.user = session?.user ?? null
      Supabase.setSessionUser(session?.user?.id ?? null)
    },
    async init() {
      const client = Supabase.getAuthClient()
      if (!client) {
        this.load = true
        return
      }
      const { data } = await client.auth.getSession()
      this.applySession(data.session)
      client.auth.onAuthStateChange((_event, session) => {
        this.applySession(session)
      })
      this.load = true
    },
    async signIn(email: string, password: string) {
      const client = Supabase.getAuthClient()
      if (!client) throw new Error('NO_SUPABASE')
      const { data, error } = await client.auth.signInWithPassword({ email, password })
      if (error) throw error
      this.applySession(data.session)
      return data
    },
    async signUp(email: string, password: string) {
      const client = Supabase.getAuthClient()
      if (!client) throw new Error('NO_SUPABASE')
      const { data, error } = await client.auth.signUp({ email, password })
      if (error) throw error
      this.applySession(data.session)
      return data
    },
    async signOut() {
      const client = Supabase.getAuthClient()
      await client?.auth.signOut()
      this.applySession(null)
    },
    /** 本机第一次出现该 user_id 时返回 true，用于首次登录冲突处理。 */
    consumeFirstLoginOnDevice(): boolean {
      const userId = this.user?.id
      if (!userId) return false
      const last = localStorage.getItem(LAST_USER_ID_KEY)
      localStorage.setItem(LAST_USER_ID_KEY, userId)
      return last !== userId
    },
  },
})
