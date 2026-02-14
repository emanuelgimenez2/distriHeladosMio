// services/sales-service.ts
import {
  ref,
  get,
  set,
  push,
  update,
  serverTimestamp as rtdbTimestamp,
} from "firebase/database";
import { database } from "@/lib/firebase";
import {
  collection,
  doc,
  setDoc,
  serverTimestamp as firestoreTimestamp,
} from "firebase/firestore";
import { firestore } from "@/lib/firebase";
import type { CartItem, Sale } from "@/lib/types";

const SALES_PATH = "ventas";
const PRODUCTS_PATH = "productos";
const CLIENTS_PATH = "clientes";
const TRANSACTIONS_PATH = "transacciones";
const SELLERS_PATH = "vendedores";
const COMMISSIONS_PATH = "comisiones";

const COMMISSION_RATE = 0.1;

export const getSales = async (): Promise<Sale[]> => {
  const salesRef = ref(database, SALES_PATH);
  const snapshot = await get(salesRef);

  if (!snapshot.exists()) return [];

  const data = snapshot.val();
  return Object.entries(data).map(([id, value]: [string, any]) => ({
    id,
    ...value,
    createdAt: value.createdAt ? new Date(value.createdAt) : new Date(),
  })).sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
};

export const getSalesBySeller = async (sellerId: string): Promise<Sale[]> => {
  const salesRef = ref(database, SALES_PATH);
  const snapshot = await get(salesRef);
  if (!snapshot.exists()) return [];
  const data = snapshot.val();
  return Object.entries(data)
    .map(([id, value]: [string, any]) => ({
      id,
      ...value,
      createdAt: value.createdAt ? new Date(value.createdAt) : new Date(),
    }))
    .filter((sale) => sale.sellerId === sellerId)
    .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
};

export const getSalesByClient = async (clientId: string): Promise<Sale[]> => {
  const salesRef = ref(database, SALES_PATH);
  const snapshot = await get(salesRef);
  if (!snapshot.exists()) return [];
  const data = snapshot.val();
  return Object.entries(data)
    .map(([id, value]: [string, any]) => ({
      id,
      ...value,
      createdAt: value.createdAt ? new Date(value.createdAt) : new Date(),
    }))
    .filter((sale) => sale.clientId === clientId)
    .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
};

export const getSaleById = async (id: string): Promise<Sale | null> => {
  const saleRef = ref(database, `${SALES_PATH}/${id}`);
  const snapshot = await get(saleRef);
  if (!snapshot.exists()) return null;
  const data = snapshot.val();
  return {
    id,
    ...data,
    createdAt: data.createdAt ? new Date(data.createdAt) : new Date(),
  };
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
  paymentType: "cash" | "credit" | "mixed";
  cashAmount?: number;
  creditAmount?: number;
  source: "direct" | "order";
  createOrder: boolean;
  orderId?: string;
  deliveryMethod: "pickup" | "delivery";
  deliveryAddress: string;
}): Promise<Sale> => {
  const total = data.items.reduce(
    (acc, item) => acc + item.product.price * item.quantity,
    0
  );

  // Generar ID único para Realtime y Firestore
  const newSaleRef = push(ref(database, SALES_PATH));
  const saleId = newSaleRef.key!;

  // Obtener contador para número de venta
  const sales = await getSales();
  const saleNumber = generateSaleNumber(new Date(), sales.length);

  let resolvedClientName = data.clientName ?? "Venta directa";
  let resolvedTaxCategory: any;
  let clientAddress = data.deliveryAddress;

  if (data.clientId) {
    const clientRef = ref(database, `${CLIENTS_PATH}/${data.clientId}`);
    const clientSnap = await get(clientRef);
    if (clientSnap.exists()) {
      const clientData = clientSnap.val();
      resolvedClientName = clientData.name ?? resolvedClientName;
      resolvedTaxCategory = clientData.taxCategory;
      if (data.deliveryMethod === "delivery" && !data.deliveryAddress) {
        clientAddress = clientData.address ?? data.deliveryAddress;
      }
    }
  }

  // Payload para Realtime Database
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
    status: "completed",
    invoiceEmitted: false,
    invoiceStatus: "pending",
    deliveryMethod: data.deliveryMethod,
    deliveryAddress: clientAddress,
    createdAt: new Date().toISOString(),
  };

  // Payload para Firestore (mismos datos, pero con timestamp de Firestore)
  const firestorePayload = {
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
    status: "completed",
    invoiceEmitted: false,
    invoiceStatus: "pending",
    deliveryMethod: data.deliveryMethod,
    deliveryAddress: clientAddress,
    createdAt: firestoreTimestamp(),
  };

  // Ejecutar todas las operaciones atómicamente en Realtime
  const updates: Record<string, any> = {};

  // Crear venta en Realtime
  updates[`${SALES_PATH}/${saleId}`] = salePayload;

  // Actualizar stock
  for (const item of data.items) {
    const productRef = ref(database, `${PRODUCTS_PATH}/${item.product.id}`);
    const productSnap = await get(productRef);
    if (productSnap.exists()) {
      const currentStock = productSnap.val().stock || 0;
      updates[`${PRODUCTS_PATH}/${item.product.id}/stock`] =
        currentStock - item.quantity;
    }
  }

  // Procesar crédito
  const amountToCredit =
    data.paymentType === "credit"
      ? total
      : data.paymentType === "mixed"
      ? data.creditAmount ?? 0
      : 0;

  if (amountToCredit > 0 && data.clientId) {
    const clientRef = ref(database, `${CLIENTS_PATH}/${data.clientId}`);
    const clientSnap = await get(clientRef);
    if (clientSnap.exists()) {
      const currentBalance = clientSnap.val().currentBalance || 0;
      updates[`${CLIENTS_PATH}/${data.clientId}/currentBalance`] =
        currentBalance + amountToCredit;
    }

    // Crear transacción
    const newTransactionRef = push(ref(database, TRANSACTIONS_PATH));
    updates[`${TRANSACTIONS_PATH}/${newTransactionRef.key}`] = {
      clientId: data.clientId,
      type: "debt",
      amount: amountToCredit,
      description: `Venta #${saleNumber}`,
      date: new Date().toISOString(),
      saleId: saleId,
      saleNumber,
    };
  }

  // Comisión para vendedor
  if (data.sellerId) {
    const commissionAmount = total * COMMISSION_RATE;
    const newCommissionRef = push(ref(database, COMMISSIONS_PATH));
    updates[`${COMMISSIONS_PATH}/${newCommissionRef.key}`] = {
      sellerId: data.sellerId,
      saleId: saleId,
      saleNumber,
      saleTotal: total,
      commissionRate: COMMISSION_RATE * 100,
      commissionAmount,
      isPaid: false,
      createdAt: new Date().toISOString(),
    };

    const sellerRef = ref(database, `${SELLERS_PATH}/${data.sellerId}`);
    const sellerSnap = await get(sellerRef);
    if (sellerSnap.exists()) {
      const sellerData = sellerSnap.val();
      updates[`${SELLERS_PATH}/${data.sellerId}/totalSales`] =
        (sellerData.totalSales || 0) + total;
      updates[`${SELLERS_PATH}/${data.sellerId}/totalCommission`] =
        (sellerData.totalCommission || 0) + commissionAmount;
    }
  }

  // Ejecutar actualizaciones en Realtime
  await update(ref(database), updates);

  // Crear documento en Firestore
  const firestoreDocRef = doc(collection(firestore, "ventas"), saleId);
  await setDoc(firestoreDocRef, firestorePayload);

  // Retornar la venta creada
  return {
    id: saleId,
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
    status: "completed",
    invoiceEmitted: false,
    invoiceStatus: "pending",
    deliveryMethod: data.deliveryMethod,
    deliveryAddress: clientAddress,
    createdAt: new Date(),
  };
};

export const updateSaleInvoice = async (
  saleId: string,
  invoiceData: {
    invoiceNumber: string;
    invoicePdfUrl: string;
    invoiceWhatsappUrl?: string;
    afipData?: any;
  }
) => {
  // Actualizar en Realtime
  const saleRef = ref(database, `${SALES_PATH}/${saleId}`);
  await update(saleRef, {
    invoiceEmitted: true,
    invoiceNumber: invoiceData.invoiceNumber,
    invoicePdfUrl: invoiceData.invoicePdfUrl,
    invoiceWhatsappUrl: invoiceData.invoiceWhatsappUrl || null,
    invoiceStatus: "emitted",
    afipData: invoiceData.afipData || null,
    invoiceEmittedAt: new Date().toISOString(),
  });

  // Actualizar en Firestore
  const firestoreRef = doc(firestore, "ventas", saleId);
  await updateDoc(firestoreRef, {
    invoiceEmitted: true,
    invoiceNumber: invoiceData.invoiceNumber,
    invoicePdfUrl: invoiceData.invoicePdfUrl,
    invoiceWhatsappUrl: invoiceData.invoiceWhatsappUrl || null,
    invoiceStatus: "emitted",
    afipData: invoiceData.afipData || null,
    invoiceEmittedAt: new Date().toISOString(),
  });
};

export const updateSaleRemito = async (
  saleId: string,
  remitoData: {
    remitoNumber: string;
    remitoPdfUrl: string;
  }
) => {
  // Actualizar en Realtime
  const saleRef = ref(database, `${SALES_PATH}/${saleId}`);
  await update(saleRef, {
    remitoNumber: remitoData.remitoNumber,
    remitoPdfUrl: remitoData.remitoPdfUrl,
    remitoGeneratedAt: new Date().toISOString(),
  });

  // Actualizar en Firestore
  const firestoreRef = doc(firestore, "ventas", saleId);
  await updateDoc(firestoreRef, {
    remitoNumber: remitoData.remitoNumber,
    remitoPdfUrl: remitoData.remitoPdfUrl,
    remitoGeneratedAt: new Date().toISOString(),
  });
};

export const emitInvoice = async (saleId: string, clientData: any) => {
  const response = await fetch("/api/facturacion", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ saleId, client: clientData }),
  });
  if (!response.ok) throw new Error("Error emitiendo factura");
  return response.json();
};