import type { Timestamp } from 'firebase/firestore'

export const toDate = (value: unknown): Date => {
  if (!value) return new Date(0)
  if (value instanceof Date) return value
  if (typeof value === 'object' && 'toDate' in (value as Timestamp)) {
    return (value as Timestamp).toDate()
  }
  return new Date(value as string)
}
