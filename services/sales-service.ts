// services/sales-service.ts
import {
  collection,
  doc,
  setDoc,
  getDoc,
  getDocs,
  query,
  where,
  orderBy,
  updateDoc,
  serverTimestamp,
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
  const salesRef = collection(firestore, SALES_PATH);
  const snapshot = await getDocs(query(salesRef, orderBy("createdAt", "desc")));

  return snapshot.docs.map((doc) => {
    const data = doc.data();
    return {
      id: doc.id,
      ...data,
      createdAt: data.createdAt?.toDate ? data.createdAt.toDate() : new Date(),
    } as Sale;
  });
};

export const getSalesBySeller = async (sellerId: string): Promise<Sale[]> => {
  const salesRef = collection(firestore, SALES_PATH);
  const q = query(
    salesRef,
    where("sellerId", "==", sellerId),
    orderBy("createdAt", "desc"),
  );
  const snapshot = await getDocs(q);

  return snapshot.docs.map((doc) => {
    const data = doc.data();
    return {
      id: doc.id,
      ...data,
      createdAt: data.createdAt?.toDate ? data.createdAt.toDate() : new Date(),
    } as Sale;
  });
};

export const getSalesByClient = async (clientId: string): Promise<Sale[]> => {
  const salesRef = collection(firestore, SALES_PATH);
  const q = query(
    salesRef,
    where("clientId", "==", clientId),
    orderBy("createdAt", "desc"),
  );
  const snapshot = await getDocs(q);

  return snapshot.docs.map((doc) => {
    const data = doc.data();
    return {
      id: doc.id,
      ...data,
      createdAt: data.createdAt?.toDate ? data.createdAt.toDate() : new Date(),
    } as Sale;
  });
};

export const getSaleById = async (id: string): Promise<Sale | null> => {
  const saleRef = doc(firestore, SALES_PATH, id);
  const snapshot = await getDoc(saleRef);

  if (!snapshot.exists()) return null;

  const data = snapshot.data();
  return {
    id: snapshot.id,
    ...data,
    createdAt: data.createdAt?.toDate ? data.createdAt.toDate() : new Date(),
  } as Sale;
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
    0,
  );

  const sales = await getSales();
  const saleNumber = generateSaleNumber(new Date(), sales.length);

  let resolvedClientName = data.clientName ?? "Venta directa";
  let resolvedTaxCategory: any;
  let resolvedClientPhone = data.clientPhone ?? null;
  let resolvedClientCuit: string | null = null;
  let resolvedClientAddress: string | null = null;
  let resolvedClientEmail: string | null = null;
  let resolvedClientDni: string | null = null;
  let clientAddress = data.deliveryAddress;

  // ✅ Tomar TODOS los datos del cliente desde Firestore
  if (data.clientId) {
    const clientRef = doc(firestore, CLIENTS_PATH, data.clientId);
    const clientSnap = await getDoc(clientRef);
    if (clientSnap.exists()) {
      const clientData = clientSnap.data();
      resolvedClientName = clientData.name ?? resolvedClientName;
      resolvedTaxCategory = clientData.taxCategory ?? null;
      resolvedClientPhone = clientData.phone ?? resolvedClientPhone ?? null;
      resolvedClientCuit = clientData.cuit ?? null;
      resolvedClientAddress = clientData.address ?? null;
      resolvedClientEmail = clientData.email ?? null;
      resolvedClientDni = clientData.dni ?? null;

      if (data.deliveryMethod === "delivery" && !data.deliveryAddress) {
        clientAddress = clientData.address ?? data.deliveryAddress;
      }
    }
  }

  const saleRef = doc(collection(firestore, SALES_PATH));
  const saleId = saleRef.id;

  const salePayload = {
    saleNumber,
    clientId: data.clientId ?? null,
    clientName: resolvedClientName ?? null,
    clientPhone: resolvedClientPhone ?? null,
    clientCuit: resolvedClientCuit ?? null,
    clientDni: resolvedClientDni ?? null,
    clientEmail: resolvedClientEmail ?? null,
    clientAddress: resolvedClientAddress ?? null,
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
    createdAt: serverTimestamp(),
  };

  await setDoc(saleRef, salePayload);

  // Actualizar stock
  for (const item of data.items) {
    const productRef = doc(firestore, PRODUCTS_PATH, item.product.id);
    const productSnap = await getDoc(productRef);
    if (productSnap.exists()) {
      const currentStock = productSnap.data().stock || 0;
      await updateDoc(productRef, {
        stock: currentStock - item.quantity,
      });
    }
  }

  // Procesar crédito
  const amountToCredit =
    data.paymentType === "credit"
      ? total
      : data.paymentType === "mixed"
        ? (data.creditAmount ?? 0)
        : 0;

  if (amountToCredit > 0 && data.clientId) {
    const clientRef = doc(firestore, CLIENTS_PATH, data.clientId);
    const clientSnap = await getDoc(clientRef);
    if (clientSnap.exists()) {
      const currentBalance = clientSnap.data().currentBalance || 0;
      await updateDoc(clientRef, {
        currentBalance: currentBalance + amountToCredit,
      });
    }

    const transactionRef = doc(collection(firestore, TRANSACTIONS_PATH));
    await setDoc(transactionRef, {
      clientId: data.clientId,
      type: "debt",
      amount: amountToCredit,
      description: `Venta #${saleNumber}`,
      date: serverTimestamp(),
      saleId: saleId,
      saleNumber,
    });
  }

  // Comisión para vendedor
  if (data.sellerId) {
    const commissionAmount = total * COMMISSION_RATE;
    const commissionRef = doc(collection(firestore, COMMISSIONS_PATH));
    await setDoc(commissionRef, {
      sellerId: data.sellerId,
      saleId: saleId,
      saleNumber,
      saleTotal: total,
      commissionRate: COMMISSION_RATE * 100,
      commissionAmount,
      isPaid: false,
      createdAt: serverTimestamp(),
    });

    const sellerRef = doc(firestore, SELLERS_PATH, data.sellerId);
    const sellerSnap = await getDoc(sellerRef);
    if (sellerSnap.exists()) {
      const sellerData = sellerSnap.data();
      await updateDoc(sellerRef, {
        totalSales: (sellerData.totalSales || 0) + total,
        totalCommission: (sellerData.totalCommission || 0) + commissionAmount,
      });
    }
  }

  return {
    id: saleId,
    saleNumber,
    clientId: data.clientId,
    clientName: resolvedClientName,
    clientPhone: resolvedClientPhone ?? undefined,
    clientCuit: resolvedClientCuit ?? undefined,
    clientDni: resolvedClientDni ?? undefined,
    clientEmail: resolvedClientEmail ?? undefined,
    clientAddress: resolvedClientAddress ?? undefined,
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
  },
) => {
  const saleRef = doc(firestore, SALES_PATH, saleId);
  await updateDoc(saleRef, {
    invoiceEmitted: true,
    invoiceNumber: invoiceData.invoiceNumber,
    invoicePdfUrl: invoiceData.invoicePdfUrl,
    invoiceWhatsappUrl: invoiceData.invoiceWhatsappUrl || null,
    invoiceStatus: "emitted",
    afipData: invoiceData.afipData || null,
    invoiceEmittedAt: serverTimestamp(),
  });
};

export const updateSaleRemito = async (
  saleId: string,
  remitoData: {
    remitoNumber: string;
    remitoPdfUrl: string;
  },
) => {
  const saleRef = doc(firestore, SALES_PATH, saleId);
  await updateDoc(saleRef, {
    remitoNumber: remitoData.remitoNumber,
    remitoPdfUrl: remitoData.remitoPdfUrl,
    remitoGeneratedAt: serverTimestamp(),
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
