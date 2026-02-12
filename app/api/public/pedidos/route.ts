//app\api\public\pedidos\route.ts
import { NextResponse } from 'next/server'
import { adminDb } from '@/lib/firebase-admin'

export const runtime = 'nodejs'

export async function POST(request: Request) {
  const body = await request.json().catch(() => null)
  if (!body?.items || !Array.isArray(body.items) || body.items.length === 0) {
    return NextResponse.json({ message: 'Items requeridos' }, { status: 400 })
  }

  const client = body.client || {}
  const dni = String(client.dni || '').trim()
  const name = String(client.name || '').trim()
  const phone = String(client.phone || '').trim()
  const address = String(client.address || '').trim()
  const email = String(client.email || '').trim()

  if (!dni || !name || !phone || !address) {
    return NextResponse.json({ message: 'Datos del cliente incompletos' }, { status: 400 })
  }

  let clientId: string | null = null
  let clientName = name

  const existingClientSnap = await adminDb.collection('clientes').where('dni', '==', dni).limit(1).get()
  if (!existingClientSnap.empty) {
    const doc = existingClientSnap.docs[0]
    clientId = doc.id
    const data = doc.data()
    clientName = data.name || name
  } else {
    const clientRef = await adminDb.collection('clientes').add({
      name,
      dni,
      cuit: dni,
      email,
      phone,
      address,
      taxCategory: 'consumidor_final',
      creditLimit: 0,
      currentBalance: 0,
      createdAt: new Date(),
    })
    clientId = clientRef.id
  }

  const sellerEmail = String(body.sellerEmail || '').trim().toLowerCase()
  let sellerId: string | null = null
  let sellerName: string | null = null

  if (sellerEmail) {
    const sellerSnap = await adminDb.collection('vendedores').where('email', '==', sellerEmail).limit(1).get()
    if (!sellerSnap.empty) {
      const sellerDoc = sellerSnap.docs[0]
      const sellerData = sellerDoc.data()
      sellerId = sellerDoc.id
      sellerName = sellerData.name || null
    }
  }

  const orderRef = await adminDb.collection('pedidos').add({
    saleId: null,
    clientId,
    clientName,
    sellerId,
    sellerName,
    items: body.items,
    status: 'pending',
    address,
    createdAt: new Date(),
    updatedAt: new Date(),
    source: 'public',
  })

  return NextResponse.json({ orderId: orderRef.id })
}
