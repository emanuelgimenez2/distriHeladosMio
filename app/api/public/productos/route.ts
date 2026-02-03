import { NextResponse } from 'next/server'
import { adminDb } from '@/lib/firebase-admin'

export const runtime = 'nodejs'

export async function GET() {
  const snapshot = await adminDb.collection('productos').get()
  const products = snapshot.docs.map((doc) => {
    const data = doc.data()
    return {
      id: doc.id,
      name: data.name,
      description: data.description,
      price: data.price,
      stock: data.stock,
      imageUrl: data.imageUrl,
      category: data.category,
      createdAt: data.createdAt?.toDate ? data.createdAt.toDate().toISOString() : null,
    }
  })

  return NextResponse.json({ products })
}
