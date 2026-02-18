// lib/types.ts
export type UserRole = "admin" | "seller" | "customer";

export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  sellerId?: string;
  isActive: boolean;
  createdAt: Date;
}

export type InvoiceStatus = "pending" | "generated" | "sent_whatsapp";

export interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  stock: number;
  imageUrl: string;
  category: string;
  createdAt: Date;
}

export interface Client {
  id: string;
  name: string;
  dni?: string;
  cuit: string;
  email: string;
  phone: string;
  address: string;
  taxCategory:
    | "responsable_inscripto"
    | "monotributo"
    | "consumidor_final"
    | "exento"
    | "no_responsable";
  creditLimit: number;
  currentBalance: number;
  createdAt: Date;
}

export interface Transaction {
  id: string;
  clientId: string;
  type: "debt" | "payment";
  amount: number;
  description: string;
  date: Date;
  saleId?: string;
}

export interface CartItem {
  product: Product;
  quantity: number;
}

export interface Sale {
  id: string;
  saleNumber?: string;
  clientId?: string;
  clientName?: string;
  clientPhone?: string;
  clientCuit?: string;
  clientDni?: string;
  clientEmail?: string;
  clientAddress?: string;
  clientTaxCategory?: Client["taxCategory"];
  sellerId?: string;
  sellerName?: string;
  source?: "direct" | "order";
  items: { productId: string; quantity: number; price: number; name: string }[];
  total: number;
  paymentType: "cash" | "credit" | "mixed";
  cashAmount?: number;
  creditAmount?: number;
  status: "completed" | "pending";
  invoiceNumber?: string;
  remitoNumber?: string;
  invoiceEmitted: boolean;
  invoiceStatus?: InvoiceStatus;
  invoicePdfUrl?: string;
  invoiceWhatsappUrl?: string;
  remitoPdfUrl?: string;
  orderId?: string;
  deliveryMethod?: "pickup" | "delivery";
  deliveryAddress?: string;
  createdAt: Date;
}

export interface Order {
  id: string;
  saleId?: string;
  clientId?: string;
  clientName?: string;
  sellerId?: string;
  sellerName?: string;
  items: { productId: string; quantity: number; name: string; price: number }[];
  status: "pending" | "preparation" | "delivery" | "completed";
  address: string;
  createdAt: Date;
  updatedAt: Date;
}

export type OrderStatus = "pending" | "preparation" | "delivery" | "completed";

export interface Seller {
  id: string;
  name: string;
  email: string;
  phone: string;
  commissionRate: number;
  isActive: boolean;
  totalSales: number;
  totalCommission: number;
  createdAt: Date;
}

export interface SellerCommission {
  id: string;
  sellerId: string;
  saleId: string;
  saleNumber?: string;
  saleTotal: number;
  commissionRate: number;
  commissionAmount: number;
  isPaid: boolean;
  paidAt?: Date;
  createdAt: Date;
}
