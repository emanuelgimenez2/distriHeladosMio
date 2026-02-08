// services/auth-service.ts
import {
  GoogleAuthProvider,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut as firebaseSignOut,
  type User,
} from 'firebase/auth'
import { firebaseAuth } from '@/lib/firebase'

export const signIn = (email: string, password: string) =>
  signInWithEmailAndPassword(firebaseAuth, email, password)

export const signInWithGoogle = () => {
  const provider = new GoogleAuthProvider()
  provider.setCustomParameters({ prompt: 'select_account' })
  return signInWithPopup(firebaseAuth, provider)
}

export const signOut = () => firebaseSignOut(firebaseAuth)

export const onAuthChange = (callback: (user: User | null) => void) =>
  onAuthStateChanged(firebaseAuth, callback)

export const getAuthToken = async (): Promise<string | null> => {
  try {
    const currentUser = firebaseAuth.currentUser
    console.log("🔍 getAuthToken - Usuario actual:", currentUser?.email || "No autenticado")
    
    if (!currentUser) {
      console.warn("⚠️ getAuthToken: No hay usuario autenticado")
      return null
    }
    
    const token = await currentUser.getIdToken()
    console.log("✅ getAuthToken - Token obtenido:", token ? `Sí (${token.substring(0, 20)}...)` : "No")
    return token
  } catch (error) {
    console.error("❌ Error obteniendo token:", error)
    return null
  }
}