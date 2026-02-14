import {
  collection,
  doc,
  getDoc,
  getDocs,
  serverTimestamp,
  updateDoc,
  addDoc,
} from 'firebase/firestore'
import { firestore } from '@/lib/firebase'
import type { Order, OrderStatus, CartItem } from '@/lib/types'
import { toDate } from '@/services/firestore-helpers'

const ORDERS_COLLECTION = 'pedidos'

export const getOrders = async (): Promise<Order[]> => {
  const snapshot = await getDocs(collection(firestore, ORDERS_COLLECTION))
  return snapshot.docs.map((docSnap) => {
    const data = docSnap.data()
    return {
      id: docSnap.id,
      saleId: data.saleId,
      clientId: data.clientId ?? undefined,
      clientName: data.clientName ?? undefined,
      sellerId: data.sellerId ?? undefined,
      sellerName: data.sellerName ?? undefined,
      items: data.items ?? [],
      status: data.status,
      address: data.address ?? 'Retiro en local',
      createdAt: toDate(data.createdAt),
      updatedAt: toDate(data.updatedAt ?? data.createdAt),
    }
  })
}

export const updateOrderStatus = async (id: string, status: OrderStatus): Promise<Order> => {
  await updateDoc(doc(firestore, ORDERS_COLLECTION, id), {
    status,
    updatedAt: serverTimestamp(),
  })
  const snapshot = await getDoc(doc(firestore, ORDERS_COLLECTION, id))
  if (!snapshot.exists()) throw new Error('Order not found')
  const data = snapshot.data()
  return {
    id: snapshot.id,
    saleId: data.saleId,
    clientId: data.clientId ?? undefined,
    clientName: data.clientName ?? undefined,
    sellerId: data.sellerId ?? undefined,
    sellerName: data.sellerName ?? undefined,
    items: data.items ?? [],
    status: data.status,
    address: data.address ?? 'Retiro en local',
    createdAt: toDate(data.createdAt),
    updatedAt: toDate(data.updatedAt ?? data.createdAt),
  }
}

export const completeOrder = async (id: string, saleId: string): Promise<Order> => {
  await updateDoc(doc(firestore, ORDERS_COLLECTION, id), {
    status: 'completed',
    saleId: saleId,
    updatedAt: serverTimestamp(),
  })
  const snapshot = await getDoc(doc(firestore, ORDERS_COLLECTION, id))
  if (!snapshot.exists()) throw new Error('Order not found')
  const data = snapshot.data()
  return {
    id: snapshot.id,
    saleId: data.saleId,
    clientId: data.clientId ?? undefined,
    clientName: data.clientName ?? undefined,
    sellerId: data.sellerId ?? undefined,
    sellerName: data.sellerName ?? undefined,
    items: data.items ?? [],
    status: data.status,
    address: data.address ?? 'Retiro en local',
    createdAt: toDate(data.createdAt),
    updatedAt: toDate(data.updatedAt ?? data.createdAt),
  }
}

export const createOrder = async (data: {
  clientId: string
  clientName: string
  sellerId?: string
  sellerName?: string
  items: CartItem[]
  address: string
  status: OrderStatus
  source?: string
}): Promise<Order> => {
  const orderRef = await addDoc(collection(firestore, ORDERS_COLLECTION), {
    clientId: data.clientId,
    clientName: data.clientName,
    sellerId: data.sellerId ?? null,
    sellerName: data.sellerName ?? null,
    items: data.items.map((item) => ({
      productId: item.product.id,
      name: item.product.name,
      quantity: item.quantity,
      price: item.product.price,
    })),
    address: data.address,
    status: data.status,
    source: data.source ?? 'direct',
    saleId: null,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  })

  const snapshot = await getDoc(orderRef)
  if (!snapshot.exists()) throw new Error('Failed to create order')
  
  const orderData = snapshot.data()
  return {
    id: snapshot.id,
    saleId: orderData.saleId,
    clientId: orderData.clientId ?? undefined,
    clientName: orderData.clientName ?? undefined,
    sellerId: orderData.sellerId ?? undefined,
    sellerName: orderData.sellerName ?? undefined,
    items: orderData.items ?? [],
    status: orderData.status,
    address: orderData.address ?? 'Retiro en local',
    createdAt: toDate(orderData.createdAt),
    updatedAt: toDate(orderData.updatedAt ?? orderData.createdAt),
  }
}