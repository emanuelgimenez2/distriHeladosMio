// @/lib/firebase.ts
import { initializeApp, getApps } from 'firebase/app'
import { getAuth } from 'firebase/auth'
import { getFirestore } from 'firebase/firestore'
import { getDatabase } from 'firebase/database'  // ← AGREGAR
import { getStorage } from 'firebase/storage'    // ← AGREGAR

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  databaseURL: process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL  // ← AGREGAR si usas Realtime Database
}

const app = getApps().length ? getApps()[0] : initializeApp(firebaseConfig)

export const firebaseAuth = getAuth(app)
export const firestore = getFirestore(app)
export const database = getDatabase(app)  // ← AGREGAR
export const storage = getStorage(app)    // ← AGREGAR