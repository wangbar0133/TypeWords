import { describe, expect, it } from 'vitest'
import { canSyncToCloud, TYPEWORDS_DATA_CONFLICT_TARGET, withUserId } from '@/core/utils/sync-policy.ts'

describe('sync policy', () => {
  it('syncs only when both a session and credentials exist', () => {
    expect(canSyncToCloud({ hasSession: false, hasCredentials: false })).toBe(false)
    expect(canSyncToCloud({ hasSession: false, hasCredentials: true })).toBe(false)
    expect(canSyncToCloud({ hasSession: true, hasCredentials: false })).toBe(false)
    expect(canSyncToCloud({ hasSession: true, hasCredentials: true })).toBe(true)
  })

  it('uses a user-scoped conflict target and attaches user_id onto each row', () => {
    expect(TYPEWORDS_DATA_CONFLICT_TARGET).toBe('user_id,type')
    const rows = [{ type: 'dict', data: { n: 1 } }]
    expect(withUserId(rows, 'user-1')).toEqual([{ type: 'dict', data: { n: 1 }, user_id: 'user-1' }])
    expect(rows[0]).not.toHaveProperty('user_id')
  })
})
