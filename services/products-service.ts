import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  serverTimestamp,
  updateDoc,
} from 'firebase/firestore'
import { firestore } from '@/lib/firebase'
import type { Product } from '@/lib/types'
import { toDate } from '@/services/firestore-helpers'

const PRODUCTS_COLLECTION = 'productos'

export const getProducts = async (): Promise<Product[]> => {
  const snapshot = await getDocs(collection(firestore, PRODUCTS_COLLECTION))
  return snapshot.docs
    .map((docSnap) => {
      const data = docSnap.data()
      return {
        id: docSnap.id,
        name: data.name,
        description: data.description,
        price: data.price,
        stock: data.stock,
        imageUrl: data.imageUrl,
        category: data.category,
        createdAt: toDate(data.createdAt),
      }
    })
    .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
}

export const getProductById = async (id: string): Promise<Product | undefined> => {
  const snapshot = await getDoc(doc(firestore, PRODUCTS_COLLECTION, id))
  if (!snapshot.exists()) return undefined
  const data = snapshot.data()
  return {
    id: snapshot.id,
    name: data.name,
    description: data.description,
    price: data.price,
    stock: data.stock,
    imageUrl: data.imageUrl,
    category: data.category,
    createdAt: toDate(data.createdAt),
  }
}

export const createProduct = async (
  product: Omit<Product, 'id' | 'createdAt'>
): Promise<Product> => {
  const docRef = await addDoc(collection(firestore, PRODUCTS_COLLECTION), {
    ...product,
    createdAt: serverTimestamp(),
  })
  return {
    ...product,
    id: docRef.id,
    createdAt: new Date(),
  }
}

export const updateProduct = async (id: string, updates: Partial<Product>): Promise<Product> => {
  await updateDoc(doc(firestore, PRODUCTS_COLLECTION, id), {
    ...updates,
  })
  const updated = await getProductById(id)
  if (!updated) throw new Error('Product not found')
  return updated
}

export const deleteProduct = async (id: string): Promise<void> => {
  await deleteDoc(doc(firestore, PRODUCTS_COLLECTION, id))
}
