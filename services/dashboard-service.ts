import { collection, getDocs, query, where } from 'firebase/firestore'
import { firestore } from '@/lib/firebase'
import type { Client, Product } from '@/lib/types'
import { toDate } from '@/services/firestore-helpers'

const PRODUCTS_COLLECTION = 'productos'
const CLIENTS_COLLECTION = 'clientes'
const SALES_COLLECTION = 'ventas'

export const getDashboardStats = async () => {
  const [productsSnapshot, clientsSnapshot, salesSnapshot] = await Promise.all([
    getDocs(collection(firestore, PRODUCTS_COLLECTION)),
    getDocs(collection(firestore, CLIENTS_COLLECTION)),
    getDocs(collection(firestore, SALES_COLLECTION)),
  ])

  const products = productsSnapshot.docs.map((docSnap) => docSnap.data() as Product)
  const clients = clientsSnapshot.docs.map((docSnap) => docSnap.data() as Client)
  const sales = salesSnapshot.docs.map((docSnap) => docSnap.data())

  const today = new Date()
  const todaySales = sales.filter((sale) => {
    const date = toDate(sale.createdAt)
    return (
      date.getDate() === today.getDate() &&
      date.getMonth() === today.getMonth() &&
      date.getFullYear() === today.getFullYear()
    )
  })

  return {
    todaySales: todaySales.reduce((acc, sale) => acc + (sale.total ?? 0), 0),
    todayOrders: todaySales.length,
    lowStockProducts: products.filter((p) => p.stock < 10).length,
    totalDebt: clients.reduce((acc, c) => acc + (c.currentBalance ?? 0), 0),
    pendingOrders: 0,
  }
}

export const getLowStockProducts = async (): Promise<Product[]> => {
  const snapshot = await getDocs(collection(firestore, PRODUCTS_COLLECTION))
  return snapshot.docs
    .map((docSnap) => {
      const data = docSnap.data()
      return {
        id: docSnap.id,
        name: data.name,
        description: data.description,
        price: data.price,
        stock: data.stock,
        imageUrl: data.imageUrl,
        category: data.category,
        createdAt: toDate(data.createdAt),
      }
    })
    .filter((product) => product.stock < 10)
}

export const getDebtors = async (): Promise<Client[]> => {
  const snapshot = await getDocs(query(collection(firestore, CLIENTS_COLLECTION), where('currentBalance', '>', 0)))
  return snapshot.docs.map((docSnap) => {
    const data = docSnap.data()
    return {
      id: docSnap.id,
      name: data.name,
      cuit: data.cuit,
      email: data.email,
      phone: data.phone,
      address: data.address,
      creditLimit: data.creditLimit,
      currentBalance: data.currentBalance ?? 0,
      createdAt: toDate(data.createdAt),
    }
  })
}
