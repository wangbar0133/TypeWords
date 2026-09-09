export const TYPEWORDS_DATA_CONFLICT_TARGET = 'user_id,type'

export function canSyncToCloud(input: { hasSession: boolean; hasCredentials: boolean }): boolean {
  return Boolean(input.hasSession && input.hasCredentials)
}

export function withUserId<T extends Record<string, unknown>>(
  rows: T[],
  userId: string
): Array<T & { user_id: string }> {
  return rows.map(row => ({ ...row, user_id: userId }))
}
