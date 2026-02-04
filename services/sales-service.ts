import {
  collection,
  doc,
  getDoc,
  getDocs,
  increment,
  query,
  serverTimestamp,
  where,
  writeBatch,
} from 'firebase/firestore'
import { firestore } from '@/lib/firebase'
import type { CartItem, Sale } from '@/lib/types'
import { toDate } from '@/services/firestore-helpers'

const SALES_COLLECTION = 'ventas'
const COMMISSIONS_COLLECTION = 'comisiones'
const PRODUCTS_COLLECTION = 'productos'
const CLIENTS_COLLECTION = 'clientes'
const TRANSACTIONS_COLLECTION = 'transacciones'
const SELLERS_COLLECTION = 'vendedores'
const ORDERS_COLLECTION = 'pedidos'

const COMMISSION_RATE = 0.1

export const getSales = async (): Promise<Sale[]> => {
  const snapshot = await getDocs(collection(firestore, SALES_COLLECTION))
  return snapshot.docs
    .map((docSnap) => {
      const data = docSnap.data()
      return {
        id: docSnap.id,
        clientId: data.clientId ?? undefined,
        clientName: data.clientName ?? undefined,
        clientPhone: data.clientPhone ?? undefined,
        clientTaxCategory: data.clientTaxCategory ?? undefined,
        sellerId: data.sellerId ?? undefined,
        sellerName: data.sellerName ?? undefined,
        source: data.source ?? undefined,
        items: data.items ?? [],
        total: data.total,
        paymentType: data.paymentType,
        status: data.status,
        invoiceNumber: data.invoiceNumber ?? undefined,
        remitoNumber: data.remitoNumber ?? undefined,
        invoiceEmitted: data.invoiceEmitted ?? false,
        invoiceStatus: data.invoiceStatus ?? 'pending',
        invoicePdfUrl: data.invoicePdfUrl ?? undefined,
        invoiceWhatsappUrl: data.invoiceWhatsappUrl ?? undefined,
        remitoPdfUrl: data.remitoPdfUrl ?? undefined,
        createdAt: toDate(data.createdAt),
      }
    })
    .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
}

export const processSale = async (data: {
  clientId?: string
  clientName?: string
  clientPhone?: string
  sellerId?: string
  sellerName?: string
  items: CartItem[]
  paymentType: 'cash' | 'credit'
  source?: 'direct' | 'order'
  createOrder?: boolean
}): Promise<Sale> => {
  const total = data.items.reduce((acc, item) => acc + item.product.price * item.quantity, 0)
  const saleRef = doc(collection(firestore, SALES_COLLECTION))
  const batch = writeBatch(firestore)

  let clientAddress = 'Retiro en local'
  let resolvedClientName = data.clientName ?? 'Venta directa'
  let resolvedTaxCategory: 'responsable_inscripto' | 'monotributo' | 'consumidor_final' | 'exento' | 'no_responsable' | undefined
  if (data.clientId) {
    const clientSnapshot = await getDoc(doc(firestore, CLIENTS_COLLECTION, data.clientId))
    if (clientSnapshot.exists()) {
      const clientData = clientSnapshot.data()
      clientAddress = clientData.address ?? clientAddress
      resolvedClientName = clientData.name ?? resolvedClientName
      resolvedTaxCategory = clientData.taxCategory
    }
  }

  const salePayload = {
    clientId: data.clientId ?? null,
    clientName: resolvedClientName ?? null,
    clientPhone: data.clientPhone ?? null,
    clientTaxCategory: resolvedTaxCategory ?? null,
    sellerId: data.sellerId ?? null,
    sellerName: data.sellerName ?? null,
    source: data.source ?? 'direct',
    items: data.items.map((item) => ({
      productId: item.product.id,
      quantity: item.quantity,
      price: item.product.price,
      name: item.product.name,
    })),
    total,
    paymentType: data.paymentType,
    status: 'completed',
    invoiceEmitted: false,
    invoiceStatus: 'pending',
    createdAt: serverTimestamp(),
  }

  batch.set(saleRef, salePayload)

  const shouldCreateOrder = data.createOrder ?? true
  if (shouldCreateOrder) {
    const orderRef = doc(collection(firestore, ORDERS_COLLECTION))
    batch.set(orderRef, {
      saleId: saleRef.id,
      clientId: data.clientId ?? null,
      clientName: resolvedClientName ?? null,
      sellerId: data.sellerId ?? null,
      sellerName: data.sellerName ?? null,
      items: salePayload.items,
      status: 'pending',
      address: clientAddress,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    })
  }

  for (const item of data.items) {
    batch.update(doc(firestore, PRODUCTS_COLLECTION, item.product.id), {
      stock: increment(-item.quantity),
    })
  }

  if (data.paymentType === 'credit' && data.clientId) {
    batch.update(doc(firestore, CLIENTS_COLLECTION, data.clientId), {
      currentBalance: increment(total),
    })
    batch.set(doc(collection(firestore, TRANSACTIONS_COLLECTION)), {
      clientId: data.clientId,
      type: 'debt',
      amount: total,
      description: `Venta #${saleRef.id}`,
      date: serverTimestamp(),
      saleId: saleRef.id,
    })
  }

  if (data.sellerId) {
    const commissionAmount = total * COMMISSION_RATE
    batch.set(doc(collection(firestore, COMMISSIONS_COLLECTION)), {
      sellerId: data.sellerId,
      saleId: saleRef.id,
      saleTotal: total,
      commissionRate: COMMISSION_RATE * 100,
      commissionAmount,
      isPaid: false,
      createdAt: serverTimestamp(),
    })
    batch.update(doc(firestore, SELLERS_COLLECTION, data.sellerId), {
      totalSales: increment(total),
      totalCommission: increment(commissionAmount),
    })
  }

  await batch.commit()

  return {
    id: saleRef.id,
    clientId: data.clientId,
    clientName: resolvedClientName,
    clientPhone: data.clientPhone,
    clientTaxCategory: resolvedTaxCategory,
    sellerId: data.sellerId,
    sellerName: data.sellerName,
    source: data.source ?? 'direct',
    items: salePayload.items,
    total,
    paymentType: data.paymentType,
    status: 'completed',
    invoiceEmitted: false,
    invoiceStatus: 'pending',
    createdAt: new Date(),
  }
}

export const getSalesBySeller = async (sellerId: string): Promise<Sale[]> => {
  const snapshot = await getDocs(
    query(collection(firestore, SALES_COLLECTION), where('sellerId', '==', sellerId))
  )
  return snapshot.docs.map((docSnap) => {
    const data = docSnap.data()
    return {
      id: docSnap.id,
      clientId: data.clientId ?? undefined,
      clientName: data.clientName ?? undefined,
      clientPhone: data.clientPhone ?? undefined,
      clientTaxCategory: data.clientTaxCategory ?? undefined,
      sellerId: data.sellerId ?? undefined,
      sellerName: data.sellerName ?? undefined,
      source: data.source ?? undefined,
      items: data.items ?? [],
      total: data.total,
      paymentType: data.paymentType,
      status: data.status,
      invoiceNumber: data.invoiceNumber ?? undefined,
      remitoNumber: data.remitoNumber ?? undefined,
      invoiceEmitted: data.invoiceEmitted ?? false,
      invoiceStatus: data.invoiceStatus ?? 'pending',
      invoicePdfUrl: data.invoicePdfUrl ?? undefined,
      invoiceWhatsappUrl: data.invoiceWhatsappUrl ?? undefined,
      remitoPdfUrl: data.remitoPdfUrl ?? undefined,
      createdAt: toDate(data.createdAt),
    }
  })
}
