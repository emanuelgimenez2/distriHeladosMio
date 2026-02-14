// lib/firebase.ts
import { initializeApp, getApps, getApp } from 'firebase/app'
import { getAuth } from 'firebase/auth'
import { getFirestore } from 'firebase/firestore'
import { getDatabase } from 'firebase/database'
import { getStorage } from 'firebase/storage'

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  databaseURL: process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

// DEBUG: Verificar que databaseURL existe
if (!firebaseConfig.databaseURL) {
  console.error('❌ ERROR: NEXT_PUBLIC_FIREBASE_DATABASE_URL no está definida');
}

// Inicializar app (una sola vez)
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

// Crear las instancias (solo una vez cada una)
export const auth = getAuth(app)
export const firestore = getFirestore(app)
export const database = getDatabase(app)
export const storage = getStorage(app)

// Exportar app por si se necesita
export { app }

// Alias para compatibilidad (opcional)
export const db = firestore
export const firebaseAuth = auth  // <-- Para compatibilidad con tu código existente