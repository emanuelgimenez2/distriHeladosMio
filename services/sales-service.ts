// services/sales-service.ts
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
  increment,
  setDoc
} from 'firebase/firestore';
import { firestore } from '@/lib/firebase';
import type { CartItem, Sale } from '@/lib/types';
import { toDate } from '@/services/firestore-helpers';

const SALES_COLLECTION = 'ventas';
const COMMISSIONS_COLLECTION = 'comisiones';
const PRODUCTS_COLLECTION = 'productos';
const CLIENTS_COLLECTION = 'clientes';
const TRANSACTIONS_COLLECTION = 'transacciones';
const SELLERS_COLLECTION = 'vendedores';
const ORDERS_COLLECTION = 'pedidos';

const COMMISSION_RATE = 0.1;

export const getSales = async (): Promise<Sale[]> => {
  const salesQuery = query(
    collection(firestore, SALES_COLLECTION),
    orderBy('createdAt', 'desc')
  );
  const snapshot = await getDocs(salesQuery);
  
  return snapshot.docs.map((docSnap) => {
    const data = docSnap.data();
    return {
      id: docSnap.id,
      saleNumber: data.saleNumber,
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
    };
  });
};

export const getSalesBySeller = async (sellerId: string): Promise<Sale[]> => {
  const salesQuery = query(
    collection(firestore, SALES_COLLECTION),
    where('sellerId', '==', sellerId),
    orderBy('createdAt', 'desc')
  );
  const snapshot = await getDocs(salesQuery);
  
  return snapshot.docs.map((docSnap) => {
    const data = docSnap.data();
    return {
      id: docSnap.id,
      saleNumber: data.saleNumber,
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
    };
  });
};

export const getSalesByClient = async (clientId: string): Promise<Sale[]> => {
  const salesQuery = query(
    collection(firestore, SALES_COLLECTION),
    where('clientId', '==', clientId),
    orderBy('createdAt', 'desc')
  );
  const snapshot = await getDocs(salesQuery);
  
  return snapshot.docs.map((docSnap) => {
    const data = docSnap.data();
    return {
      id: docSnap.id,
      saleNumber: data.saleNumber,
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
    };
  });
};

export const generateSaleNumber = (date: Date, index: number) => {
  const d = new Date(date);
  const year = d.getFullYear().toString().slice(-2);
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `V${year}${month}${day}-${String(index + 1).padStart(4, "0")}`;
};

export const processSale = async (data: {
  clientId?: string;
  clientName?: string;
  clientPhone?: string;
  sellerId?: string;
  sellerName?: string;
  items: CartItem[];
  paymentType: 'cash' | 'credit' | 'mixed';
  cashAmount?: number;
  creditAmount?: number;
  source: 'direct' | 'order';
  createOrder: boolean; // REQUERIDO explícitamente
  orderId?: string;     // Para ventas desde pedidos completados
  deliveryMethod: 'pickup' | 'delivery';
  deliveryAddress: string;
}): Promise<Sale> => {
  const total = data.items.reduce((acc, item) => acc + item.product.price * item.quantity, 0);
  const saleRef = doc(collection(firestore, SALES_COLLECTION));
  const batch = writeBatch(firestore);

  // Obtener todas las ventas para generar número correlativo
  const allSales = await getSales();
  const saleNumber = generateSaleNumber(new Date(), allSales.length);

  let resolvedClientName = data.clientName ?? 'Venta directa';
  let resolvedTaxCategory: 'responsable_inscripto' | 'monotributo' | 'consumidor_final' | 'exento' | 'no_responsable' | undefined;
  let clientAddress = data.deliveryAddress;
  
  if (data.clientId) {
    const clientSnapshot = await getDoc(doc(firestore, CLIENTS_COLLECTION, data.clientId));
    if (clientSnapshot.exists()) {
      const clientData = clientSnapshot.data();
      resolvedClientName = clientData.name ?? resolvedClientName;
      resolvedTaxCategory = clientData.taxCategory;
      // Si es delivery y no se especificó dirección, usar la del cliente
      if (data.deliveryMethod === 'delivery' && !data.deliveryAddress) {
        clientAddress = clientData.address ?? data.deliveryAddress;
      }
    }
  }

  const salePayload = {
    saleNumber,
    clientId: data.clientId ?? null,
    clientName: resolvedClientName ?? null,
    clientPhone: data.clientPhone ?? null,
    clientTaxCategory: resolvedTaxCategory ?? null,
    sellerId: data.sellerId ?? null,
    sellerName: data.sellerName ?? null,
    source: data.source,
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
    orderId: data.orderId ?? null,
    status: 'completed',
    invoiceEmitted: false,
    invoiceStatus: 'pending',
    deliveryMethod: data.deliveryMethod,
    deliveryAddress: clientAddress,
    createdAt: serverTimestamp(),
  };

  batch.set(saleRef, salePayload);

  // ❌ NO crear pedido automáticamente - eliminado
  // Los pedidos se crean explícitamente desde nueva-venta/page.tsx

  // Actualizar stock
  for (const item of data.items) {
    const productRef = doc(firestore, PRODUCTS_COLLECTION, item.product.id);
    batch.update(productRef, {
      stock: increment(-item.quantity),
    });
  }

  // Procesar crédito si corresponde
  const amountToCredit = data.paymentType === 'credit' 
    ? total 
    : data.paymentType === 'mixed' 
      ? (data.creditAmount ?? 0)
      : 0;

  if (amountToCredit > 0 && data.clientId) {
    batch.update(doc(firestore, CLIENTS_COLLECTION, data.clientId), {
      currentBalance: increment(amountToCredit),
    });
    
    batch.set(doc(collection(firestore, TRANSACTIONS_COLLECTION)), {
      clientId: data.clientId,
      type: 'debt',
      amount: amountToCredit,
      description: `Venta #${saleNumber}`,
      date: serverTimestamp(),
      saleId: saleRef.id,
      saleNumber,
    });
  }

  // Comisión para vendedor
  if (data.sellerId) {
    const commissionAmount = total * COMMISSION_RATE;
    batch.set(doc(collection(firestore, COMMISSIONS_COLLECTION)), {
      sellerId: data.sellerId,
      saleId: saleRef.id,
      saleNumber,
      saleTotal: total,
      commissionRate: COMMISSION_RATE * 100,
      commissionAmount,
      isPaid: false,
      createdAt: serverTimestamp(),
    });
    
    batch.update(doc(firestore, SELLERS_COLLECTION, data.sellerId), {
      totalSales: increment(total),
      totalCommission: increment(commissionAmount),
    });
  }

  await batch.commit();

  return {
    id: saleRef.id,
    saleNumber,
    clientId: data.clientId,
    clientName: resolvedClientName,
    clientPhone: data.clientPhone,
    clientTaxCategory: resolvedTaxCategory,
    sellerId: data.sellerId,
    sellerName: data.sellerName,
    source: data.source,
    items: salePayload.items,
    total,
    paymentType: data.paymentType,
    cashAmount: data.cashAmount,
    creditAmount: data.creditAmount,
    orderId: data.orderId,
    status: 'completed',
    invoiceEmitted: false,
    invoiceStatus: 'pending',
    deliveryMethod: data.deliveryMethod,
    deliveryAddress: clientAddress,
    createdAt: new Date(),
  };
};

export const emitInvoice = async (saleId: string, clientData: any) => {
  // Simulación de emisión de factura
  const invoiceNumber = `B-${new Date().getFullYear()}-${String(Math.floor(Math.random() * 10000)).padStart(4, '0')}`;
  const pdfUrl = `data:application/pdf;base64,JVBERi0...`; // PDF simulado
  
  await updateDoc(doc(firestore, SALES_COLLECTION, saleId), {
    invoiceEmitted: true,
    invoiceNumber,
    invoiceStatus: 'emitted',
    invoicePdfUrl: pdfUrl,
    invoiceWhatsappUrl: pdfUrl,
    invoiceEmittedAt: serverTimestamp(),
  });

  return {
    invoiceNumber,
    pdfUrl,
    whatsappUrl: pdfUrl,
  };
};

export const getSaleById = async (id: string): Promise<Sale | null> => {
  const snapshot = await getDoc(doc(firestore, SALES_COLLECTION, id));
  if (!snapshot.exists()) return null;
  
  const data = snapshot.data();
  return {
    id: snapshot.id,
    saleNumber: data.saleNumber,
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
  };
};