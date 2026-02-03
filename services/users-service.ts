import { doc, getDoc, serverTimestamp, setDoc } from 'firebase/firestore'
import { firestore } from '@/lib/firebase'
import type { User, UserRole } from '@/lib/types'
import { toDate } from '@/services/firestore-helpers'

export const getUserProfile = async (userId: string): Promise<User | null> => {
  const snapshot = await getDoc(doc(firestore, 'usuarios', userId))
  if (!snapshot.exists()) return null
  const data = snapshot.data()
  return {
    id: snapshot.id,
    email: data.email,
    name: data.name,
    role: data.role as UserRole,
    sellerId: data.sellerId,
    isActive: data.isActive ?? true,
    createdAt: toDate(data.createdAt),
  }
}

export const ensureUserProfile = async (data: {
  id: string
  email: string
  name: string
  role?: UserRole
}): Promise<User> => {
  const existing = await getUserProfile(data.id)
  if (existing) return existing

  const profile: User = {
    id: data.id,
    email: data.email,
    name: data.name,
    role: data.role ?? 'seller',
    isActive: true,
    createdAt: new Date(),
  }

  await setDoc(doc(firestore, 'usuarios', data.id), {
    email: profile.email,
    name: profile.name,
    role: profile.role,
    sellerId: profile.sellerId ?? null,
    isActive: profile.isActive,
    createdAt: serverTimestamp(),
  })

  return profile
}
