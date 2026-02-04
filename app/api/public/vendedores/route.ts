import { NextResponse } from 'next/server'
import { adminDb } from '@/lib/firebase-admin'

export const runtime = 'nodejs'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const email = searchParams.get('email')?.toLowerCase().trim()
  if (!email) {
    return NextResponse.json({ found: false })
  }

  const snapshot = await adminDb.collection('vendedores').where('email', '==', email).limit(1).get()
  if (snapshot.empty) {
    return NextResponse.json({ found: false })
  }

  const doc = snapshot.docs[0]
  const data = doc.data()
  return NextResponse.json({
    found: true,
    sellerId: doc.id,
    sellerName: data.name || '',
  })
}
