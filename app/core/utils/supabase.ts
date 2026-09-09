import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { Toast } from '@/base'
import { useRuntimeStore } from '../stores/runtime.ts'
import { canSyncToCloud } from './sync-policy'

export const SUPABASE_CONFIG_KEY = 'supabase_config'

export type SupabaseStatus = 'idle' | 'syncing' | 'success' | 'error'

export interface SupabaseConfig {
  url: string
  key: string
  status: SupabaseStatus
  statusMessage?: string
}

export type ResolvedSupabaseCredentials = {
  url: string
  key: string
  source: 'custom' | 'official'
}

const defaultConfig: SupabaseConfig = {
  url: '',
  key: '',
  status: 'idle',
}

function dummyClient(): SupabaseClient {
  return {
    from: () => ({
      select: () => Promise.resolve({ data: [] }),
      upsert: () => Promise.resolve({ data: [] }),
      insert: () => Promise.resolve({ data: [] }),
    }),
    auth: {
      getSession: () => Promise.resolve({ data: { session: null }, error: null }),
      onAuthStateChange: () => ({ data: { subscription: { unsubscribe() {} } } }),
      signInWithPassword: () => Promise.resolve({ data: { session: null, user: null }, error: new Error('NO_SUPABASE') }),
      signUp: () => Promise.resolve({ data: { session: null, user: null }, error: new Error('NO_SUPABASE') }),
      signOut: () => Promise.resolve({ error: null }),
    },
  } as unknown as SupabaseClient
}

export function getConfig(): SupabaseConfig | null {
  try {
    const raw = localStorage.getItem(SUPABASE_CONFIG_KEY)
    if (!raw) return null
    const c = JSON.parse(raw) as Partial<SupabaseConfig>
    if (!c || !c.url || !c.key) return null
    return {
      url: c.url,
      key: c.key,
      status: c.status ?? 'idle',
      statusMessage: c.statusMessage,
    }
  } catch {
    return null
  }
}

export function setConfig(partial: Partial<SupabaseConfig>): void {
  const cur = getConfig() ?? defaultConfig
  const next: SupabaseConfig = {
    url: partial.url ?? cur.url,
    key: partial.key ?? cur.key,
    status: partial.status ?? cur.status,
    statusMessage: partial.statusMessage !== undefined ? partial.statusMessage : cur.statusMessage,
  }
  localStorage.setItem(SUPABASE_CONFIG_KEY, JSON.stringify(next))
}

export function getOfficialSupabaseCredentials(): { url: string; key: string } | null {
  try {
    const config = useRuntimeConfig()
    const url = String(config.public.supabaseUrl || '').trim()
    const key = String(config.public.supabaseAnonKey || '').trim()
    if (!url || !key) return null
    return { url, key }
  } catch {
    return null
  }
}

export function resolveSupabaseCredentials(): ResolvedSupabaseCredentials | null {
  const custom = getConfig()
  if (custom?.url && custom?.key) {
    return { url: custom.url, key: custom.key, source: 'custom' }
  }
  const official = getOfficialSupabaseCredentials()
  if (official) return { ...official, source: 'official' }
  return null
}

export class Supabase {
  static instance: SupabaseClient | null = null
  static supabaseUrl = ''
  static supabaseKey = ''
  static errorCount = 0
  static userId: string | null = null

  static setSessionUser(userId: string | null): void {
    this.userId = userId
  }

  static getUserId(): string | null {
    return this.userId
  }

  static hasCredentials(): boolean {
    return !!resolveSupabaseCredentials()
  }

  /** 是否允许执行同步：有凭据且已登录。 */
  static check(): boolean {
    const creds = resolveSupabaseCredentials()
    if (!canSyncToCloud({ hasSession: !!this.userId, hasCredentials: !!creds })) return false
    this.supabaseUrl = creds.url
    this.supabaseKey = creds.key
    return true
  }

  static saveConfig(url: string, key: string): void {
    this.instance = null
    setConfig({ url, key })
  }

  static removeConfig(): void {
    this.instance = null
    localStorage.removeItem(SUPABASE_CONFIG_KEY)
  }

  static getAuthClient(): SupabaseClient | null {
    const creds = resolveSupabaseCredentials()
    if (!creds) return null
    if (!this.instance || this.supabaseUrl !== creds.url || this.supabaseKey !== creds.key) {
      this.supabaseUrl = creds.url
      this.supabaseKey = creds.key
      try {
        this.instance = createClient(creds.url, creds.key, {
          auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
        })
      } catch (e) {
        Toast.error((e as Error).message)
        this.instance = dummyClient()
      }
    }
    return this.instance
  }

  /** 拿到客户端；仅根据 url/key 建连，不依赖 status（供设置页保存配置时验表使用） */
  static getInstance(): SupabaseClient {
    return this.getAuthClient() ?? dummyClient()
  }

  static getConfig(): SupabaseConfig | null {
    return getConfig()
  }

  static getStatus(): { status: SupabaseStatus; statusMessage?: string } {
    const c = getConfig()
    if (this.userId && resolveSupabaseCredentials()?.source === 'official') {
      return {
        status: c?.status && c.status !== 'idle' ? c.status : 'success',
        statusMessage: c?.statusMessage,
      }
    }
    return {
      status: c?.status ?? 'idle',
      statusMessage: c?.statusMessage,
    }
  }

  static setStatus(status: SupabaseStatus, statusMessage?: string): void {
    if (status === 'error') {
      if ('TypeError: Failed to fetch' === statusMessage && this.errorCount < 3) {
        this.errorCount++
        return
      }
      window?.umami?.track('sp-error', { error: statusMessage })
    }
    if (status !== 'error') {
      this.errorCount = 0
    }
    const runtimeStore = useRuntimeStore()
    runtimeStore.isError = status === 'error'
    const creds = resolveSupabaseCredentials()
    if (creds?.source === 'custom' || getConfig()) {
      setConfig({ status, statusMessage })
    }
  }
}
