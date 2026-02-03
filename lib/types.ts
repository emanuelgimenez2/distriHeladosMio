export type UserRole = 'admin' | 'seller'

export interface User {
  id: string
  email: string
  name: string
  role: UserRole
  sellerId?: string // If role is 'seller', links to Seller record
  isActive: boolean
  createdAt: Date
}

export type InvoiceStatus = 'pending' | 'generated' | 'sent_whatsapp'

export interface Product {
  id: string
  name: string
  description: string
  price: number
  stock: number
  imageUrl: string
  category: string
  createdAt: Date
}

export interface Client {
  id: string
  name: string
  cuit: string
  email: string
  phone: string
  address: string
  creditLimit: number
  currentBalance: number
  createdAt: Date
}

export interface Transaction {
  id: string
  clientId: string
  type: 'debt' | 'payment'
  amount: number
  description: string
  date: Date
  saleId?: string
}

export interface CartItem {
  product: Product
  quantity: number
}

export interface Sale {
  id: string
  clientId?: string
  clientName?: string
  clientPhone?: string
  sellerId?: string
  sellerName?: string
  items: { productId: string; quantity: number; price: number; name: string }[]
  total: number
  paymentType: 'cash' | 'credit'
  status: 'completed' | 'pending'
  invoiceNumber?: string
  invoiceEmitted: boolean
  invoiceStatus?: InvoiceStatus
  invoicePdfUrl?: string
  invoiceWhatsappUrl?: string
  createdAt: Date
}

export interface Order {
  id: string
  saleId?: string
  clientId?: string
  clientName?: string
  items: { productId: string; quantity: number; name: string }[]
  status: 'pending' | 'preparation' | 'delivery' | 'completed'
  address: string
  createdAt: Date
  updatedAt: Date
}

export type OrderStatus = Order['status']

export interface Seller {
  id: string
  name: string
  email: string
  phone: string
  commissionRate: number // Percentage (e.g., 10 = 10%)
  isActive: boolean
  totalSales: number
  totalCommission: number
  createdAt: Date
}

export interface SellerCommission {
  id: string
  sellerId: string
  saleId: string
  saleTotal: number
  commissionRate: number
  commissionAmount: number
  isPaid: boolean
  paidAt?: Date
  createdAt: Date
}
