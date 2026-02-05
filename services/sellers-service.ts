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
import type { Seller, SellerCommission } from '@/lib/types'
import { toDate } from '@/services/firestore-helpers'

const SELLERS_COLLECTION = 'vendedores'
const COMMISSIONS_COLLECTION = 'comisiones'

export const getSellers = async (): Promise<Seller[]> => {
  const snapshot = await getDocs(collection(firestore, SELLERS_COLLECTION))
  return snapshot.docs
    .map((docSnap) => {
      const data = docSnap.data()
      return {
        id: docSnap.id,
        name: data.name,
        email: data.email,
        phone: data.phone,
        commissionRate: data.commissionRate,
        isActive: data.isActive ?? true,
        totalSales: data.totalSales ?? 0,
        totalCommission: data.totalCommission ?? 0,
        createdAt: toDate(data.createdAt),
      }
    })
    .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
}

export const getSellerById = async (id: string): Promise<Seller | undefined> => {
  const snapshot = await getDoc(doc(firestore, SELLERS_COLLECTION, id))
  if (!snapshot.exists()) return undefined
  const data = snapshot.data()
  return {
    id: snapshot.id,
    name: data.name,
    email: data.email,
    phone: data.phone,
    commissionRate: data.commissionRate,
    isActive: data.isActive ?? true,
    totalSales: data.totalSales ?? 0,
    totalCommission: data.totalCommission ?? 0,
    createdAt: toDate(data.createdAt),
  }
}

export const createSeller = async (
  seller: Omit<Seller, 'id' | 'createdAt' | 'totalSales' | 'totalCommission'>
): Promise<Seller> => {
  const docRef = await addDoc(collection(firestore, SELLERS_COLLECTION), {
    ...seller,
    totalSales: 0,
    totalCommission: 0,
    createdAt: serverTimestamp(),
  })
  return {
    ...seller,
    id: docRef.id,
    totalSales: 0,
    totalCommission: 0,
    createdAt: new Date(),
  }
}

export const updateSeller = async (id: string, updates: Partial<Seller>): Promise<Seller> => {
  await updateDoc(doc(firestore, SELLERS_COLLECTION, id), { ...updates })
  const updated = await getSellerById(id)
  if (!updated) throw new Error('Seller not found')
  return updated
}

export const deleteSeller = async (id: string): Promise<void> => {
  await deleteDoc(doc(firestore, SELLERS_COLLECTION, id))
}

export const getSellerCommissions = async (sellerId: string): Promise<SellerCommission[]> => {
  const snapshot = await getDocs(
    query(
      collection(firestore, COMMISSIONS_COLLECTION),
      where('sellerId', '==', sellerId)
    )
  )
  return snapshot.docs
    .map((docSnap) => {
      const data = docSnap.data()
      return {
        id: docSnap.id,
        sellerId: data.sellerId,
        saleId: data.saleId,
        saleTotal: data.saleTotal,
        commissionRate: data.commissionRate,
        commissionAmount: data.commissionAmount,
        isPaid: data.isPaid ?? false,
        paidAt: data.paidAt ? toDate(data.paidAt) : undefined,
        createdAt: toDate(data.createdAt),
      }
    })
    .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
}

export const getAllCommissions = async (): Promise<SellerCommission[]> => {
  const snapshot = await getDocs(collection(firestore, COMMISSIONS_COLLECTION))
  return snapshot.docs.map((docSnap) => {
    const data = docSnap.data()
    return {
      id: docSnap.id,
      sellerId: data.sellerId,
      saleId: data.saleId,
      saleTotal: data.saleTotal,
      commissionRate: data.commissionRate,
      commissionAmount: data.commissionAmount,
      isPaid: data.isPaid ?? false,
      paidAt: data.paidAt ? toDate(data.paidAt) : undefined,
      createdAt: toDate(data.createdAt),
    }
  })
}

export const payCommission = async (commissionId: string): Promise<SellerCommission> => {
  await updateDoc(doc(firestore, COMMISSIONS_COLLECTION, commissionId), {
    isPaid: true,
    paidAt: serverTimestamp(),
  })
  const updated = await getDoc(doc(firestore, COMMISSIONS_COLLECTION, commissionId))
  if (!updated.exists()) throw new Error('Commission not found')
  const data = updated.data()
  return {
    id: updated.id,
    sellerId: data.sellerId,
    saleId: data.saleId,
    saleTotal: data.saleTotal,
    commissionRate: data.commissionRate,
    commissionAmount: data.commissionAmount,
    isPaid: data.isPaid ?? true,
    paidAt: data.paidAt ? toDate(data.paidAt) : undefined,
    createdAt: toDate(data.createdAt),
  }
}

export const payAllCommissions = async (sellerId: string): Promise<void> => {
  const snapshot = await getDocs(
    query(
      collection(firestore, COMMISSIONS_COLLECTION),
      where('sellerId', '==', sellerId),
      where('isPaid', '==', false)
    )
  )
  const updates = snapshot.docs.map((docSnap) =>
    updateDoc(doc(firestore, COMMISSIONS_COLLECTION, docSnap.id), {
      isPaid: true,
      paidAt: serverTimestamp(),
    })
  )
  await Promise.all(updates)
}
