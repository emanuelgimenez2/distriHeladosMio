import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  query,
  serverTimestamp,
  updateDoc,
  where,
  orderBy,
} from 'firebase/firestore'
import { firestore } from '@/lib/firebase'
import type { Client, Transaction } from '@/lib/types'
import { toDate } from '@/services/firestore-helpers'

const CLIENTS_COLLECTION = 'clientes'
const TRANSACTIONS_COLLECTION = 'transacciones'

export const getClients = async (): Promise<Client[]> => {
  const snapshot = await getDocs(collection(firestore, CLIENTS_COLLECTION))
  return snapshot.docs
    .map((docSnap) => {
      const data = docSnap.data()
      return {
        id: docSnap.id,
        name: data.name,
        dni: data.dni ?? '',
        cuit: data.cuit,
        email: data.email,
        phone: data.phone,
        address: data.address,
        taxCategory: data.taxCategory ?? 'consumidor_final',
        creditLimit: data.creditLimit,
        currentBalance: data.currentBalance ?? 0,
        createdAt: toDate(data.createdAt),
      }
    })
    .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
}

export const getClientById = async (id: string): Promise<Client | undefined> => {
  const snapshot = await getDoc(doc(firestore, CLIENTS_COLLECTION, id))
  if (!snapshot.exists()) return undefined
  const data = snapshot.data()
  return {
    id: snapshot.id,
    name: data.name,
    dni: data.dni ?? '',
    cuit: data.cuit,
    email: data.email,
    phone: data.phone,
    address: data.address,
    taxCategory: data.taxCategory ?? 'consumidor_final',
    creditLimit: data.creditLimit,
    currentBalance: data.currentBalance ?? 0,
    createdAt: toDate(data.createdAt),
  }
}

export const createClient = async (
  client: Omit<Client, 'id' | 'createdAt' | 'currentBalance'>
): Promise<Client> => {
  const docRef = await addDoc(collection(firestore, CLIENTS_COLLECTION), {
    ...client,
    currentBalance: 0,
    taxCategory: client.taxCategory ?? 'consumidor_final',
    createdAt: serverTimestamp(),
  })
  return {
    ...client,
    taxCategory: client.taxCategory ?? 'consumidor_final',
    currentBalance: 0,
    id: docRef.id,
    createdAt: new Date(),
  }
}

export const updateClient = async (id: string, updates: Partial<Client>): Promise<Client> => {
  await updateDoc(doc(firestore, CLIENTS_COLLECTION, id), {
    ...updates,
  })
  const updated = await getClientById(id)
  if (!updated) throw new Error('Client not found')
  return updated
}

export const deleteClient = async (id: string): Promise<void> => {
  await deleteDoc(doc(firestore, CLIENTS_COLLECTION, id))
}

export const getClientTransactions = async (clientId: string): Promise<Transaction[]> => {
  const snapshot = await getDocs(
    query(
      collection(firestore, TRANSACTIONS_COLLECTION),
      where('clientId', '==', clientId),
      orderBy('date', 'desc')
    )
  )
  return snapshot.docs.map((docSnap) => {
    const data = docSnap.data()
    return {
      id: docSnap.id,
      clientId: data.clientId,
      type: data.type,
      amount: data.amount,
      description: data.description,
      date: toDate(data.date),
      saleId: data.saleId,
    }
  })
}
