// services/sales-service.ts - AGREGAR esta función junto con getSales
import { 
  collection, 
  getDocs, 
  query, 
  where, 
  orderBy, 
  doc, 
  getDoc, 
  addDoc, 
  serverTimestamp, 
  updateDoc,
  writeBatch,
  increment
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

// ✅ getSales existente
export const getSales = async (): Promise<Sale[]> => {
  const salesQuery = query(
    collection(firestore, SALES_COLLECTION),
    orderBy('createdAt', 'desc')
  )
  const snapshot = await getDocs(salesQuery)
  
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
      source: data.source ?? 'direct',
      items: data.items ?? [],
      total: data.total ?? 0,
      paymentType: data.paymentType ?? 'cash',
      cashAmount: data.cashAmount ?? undefined,
      creditAmount: data.creditAmount ?? undefined,
      orderId: data.orderId ?? undefined,
      deliveryMethod: data.deliveryMethod ?? undefined,
      deliveryAddress: data.deliveryAddress ?? undefined,
      invoiceEmitted: data.invoiceEmitted ?? false,
      invoiceNumber: data.invoiceNumber ?? undefined,
      invoiceStatus: data.invoiceStatus ?? 'pending',
      invoicePdfUrl: data.invoicePdfUrl ?? undefined,
      invoiceWhatsappUrl: data.invoiceWhatsappUrl ?? undefined,
      remitoNumber: data.remitoNumber ?? undefined,
      remitoPdfUrl: data.remitoPdfUrl ?? undefined,
      createdAt: toDate(data.createdAt),
    }
  })
}

// ✅ NUEVA FUNCIÓN: getSalesBySeller - AGREGAR ESTA
export const getSalesBySeller = async (sellerId: string): Promise<Sale[]> => {
  const salesQuery = query(
    collection(firestore, SALES_COLLECTION),
    where('sellerId', '==', sellerId),
    orderBy('createdAt', 'desc')
  )
  const snapshot = await getDocs(salesQuery)
  
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
      source: data.source ?? 'direct',
      items: data.items ?? [],
      total: data.total ?? 0,
      paymentType: data.paymentType ?? 'cash',
      cashAmount: data.cashAmount ?? undefined,
      creditAmount: data.creditAmount ?? undefined,
      orderId: data.orderId ?? undefined,
      deliveryMethod: data.deliveryMethod ?? undefined,
      deliveryAddress: data.deliveryAddress ?? undefined,
      invoiceEmitted: data.invoiceEmitted ?? false,
      invoiceNumber: data.invoiceNumber ?? undefined,
      invoiceStatus: data.invoiceStatus ?? 'pending',
      invoicePdfUrl: data.invoicePdfUrl ?? undefined,
      invoiceWhatsappUrl: data.invoiceWhatsappUrl ?? undefined,
      remitoNumber: data.remitoNumber ?? undefined,
      remitoPdfUrl: data.remitoPdfUrl ?? undefined,
      createdAt: toDate(data.createdAt),
    }
  })
}

// ... resto del código (processSale, etc.)

export const processSale = async (data: {
  clientId?: string
  clientName?: string
  clientPhone?: string
  sellerId?: string
  sellerName?: string
  items: CartItem[]
  paymentType: 'cash' | 'credit' | 'mixed'
  cashAmount?: number
  creditAmount?: number
  source?: 'direct' | 'order'
  createOrder?: boolean
  deliveryMethod?: 'pickup' | 'delivery'
  deliveryAddress?: string
}): Promise<Sale> => {
  const total = data.items.reduce((acc, item) => acc + item.product.price * item.quantity, 0)
  const saleRef = doc(collection(firestore, SALES_COLLECTION))
  const batch = writeBatch(firestore)

  let clientAddress = data.deliveryAddress || 'Retiro en local'
  let resolvedClientName = data.clientName ?? 'Venta directa'
  let resolvedTaxCategory: 'responsable_inscripto' | 'monotributo' | 'consumidor_final' | 'exento' | 'no_responsable' | undefined
  
  if (data.clientId) {
    const clientSnapshot = await getDoc(doc(firestore, CLIENTS_COLLECTION, data.clientId))
    if (clientSnapshot.exists()) {
      const clientData = clientSnapshot.data()
      if (data.deliveryMethod === 'delivery' && !data.deliveryAddress) {
        clientAddress = clientData.address ?? clientAddress
      }
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
    cashAmount: data.cashAmount ?? null,
    creditAmount: data.creditAmount ?? null,
    status: 'completed',
    invoiceEmitted: false,
    invoiceStatus: 'pending',
    deliveryMethod: data.deliveryMethod ?? 'pickup',
    deliveryAddress: clientAddress,
    createdAt: serverTimestamp(),
  }

  batch.set(saleRef, salePayload)

  const shouldCreateOrder = data.createOrder ?? (data.deliveryMethod === 'delivery')
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

  const amountToCredit = data.paymentType === 'credit' 
    ? total 
    : data.paymentType === 'mixed' 
      ? (data.creditAmount ?? 0)
      : 0

  if (amountToCredit > 0 && data.clientId) {
    batch.update(doc(firestore, CLIENTS_COLLECTION, data.clientId), {
      currentBalance: increment(amountToCredit),
    })
    batch.set(doc(collection(firestore, TRANSACTIONS_COLLECTION)), {
      clientId: data.clientId,
      type: 'debt',
      amount: amountToCredit,
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

// ❌ ELIMINAR TODO DESDE AQUÍ HASTA EL FINAL (la segunda getSales y cualquier otra duplicación)
// export const getSales = async (): Promise<Sale[]> => { ... }