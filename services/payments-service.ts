import {
  addDoc,
  collection,
  doc,
  increment,
  serverTimestamp,
  updateDoc,
} from 'firebase/firestore'
import { firestore } from '@/lib/firebase'
import type { Transaction } from '@/lib/types'

const CLIENTS_COLLECTION = 'clientes'
const TRANSACTIONS_COLLECTION = 'transacciones'

export const registerCashPayment = async (data: {
  clientId: string
  amount: number
  description?: string
}): Promise<Transaction> => {
  await updateDoc(doc(firestore, CLIENTS_COLLECTION, data.clientId), {
    currentBalance: increment(-data.amount),
  })

  const docRef = await addDoc(collection(firestore, TRANSACTIONS_COLLECTION), {
    clientId: data.clientId,
    type: 'payment',
    amount: data.amount,
    description: data.description || 'Pago en efectivo',
    date: serverTimestamp(),
  })

  return {
    id: docRef.id,
    clientId: data.clientId,
    type: 'payment',
    amount: data.amount,
    description: data.description || 'Pago en efectivo',
    date: new Date(),
  }
}
