import { NextResponse } from 'next/server'
import { adminAuth, adminDb } from '@/lib/firebase-admin'

export const runtime = 'nodejs'

const buildWhatsappUrl = (phone: string, pdfUrl: string, clientName?: string) => {
  if (!phone) return undefined
  const cleanPhone = phone.replace(/[^\d]/g, '')
  if (!cleanPhone) return undefined
  const message = `Hola${clientName ? ` ${clientName}` : ''}, tu factura esta lista: ${pdfUrl}`
  return `https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`
}

export async function POST(request: Request) {
  const authorization = request.headers.get('authorization')
  if (!authorization?.startsWith('Bearer ')) {
    return NextResponse.json({ message: 'No autorizado' }, { status: 401 })
  }

  const token = authorization.replace('Bearer ', '')
  try {
    await adminAuth.verifyIdToken(token)
  } catch {
    return NextResponse.json({ message: 'Token invalido' }, { status: 401 })
  }

  const body = await request.json().catch(() => null)
  if (!body?.saleId) {
    return NextResponse.json({ message: 'saleId requerido' }, { status: 400 })
  }

  const saleSnapshot = await adminDb.collection('ventas').doc(body.saleId).get()
  if (!saleSnapshot.exists) {
    return NextResponse.json({ message: 'Venta no encontrada' }, { status: 404 })
  }

  const sale = saleSnapshot.data() || {}
  const client = body.client || {}

  const apiKey = process.env.FACTURA_API_KEY
  const apiUrl = process.env.FACTURA_API_URL

  if (!apiKey || !apiUrl) {
    const mockInvoiceNumber = `SIM-${String(Date.now()).slice(-8)}`
    const mockPdfUrl = `https://example.com/facturas/${mockInvoiceNumber}.pdf`
    const whatsappUrl = buildWhatsappUrl(
      client.phone ?? sale.clientPhone ?? '',
      mockPdfUrl,
      client.name ?? sale.clientName
    )
    return NextResponse.json({
      invoiceNumber: mockInvoiceNumber,
      pdfUrl: mockPdfUrl,
      whatsappUrl,
      mock: true,
    })
  }

  const providerResponse = await fetch(apiUrl, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      saleId: body.saleId,
      total: sale.total,
      items: sale.items,
      client: {
        name: client.name ?? sale.clientName,
        phone: client.phone ?? sale.clientPhone,
        email: client.email ?? sale.clientEmail,
      },
    }),
  })

  if (!providerResponse.ok) {
    const error = await providerResponse.json().catch(() => ({}))
    return NextResponse.json({ message: error?.message || 'Error del proveedor' }, { status: 502 })
  }

  const providerData = await providerResponse.json()
  const pdfUrl = providerData.pdfUrl || providerData.url
  const invoiceNumber = providerData.invoiceNumber || providerData.number

  if (!pdfUrl || !invoiceNumber) {
    return NextResponse.json({ message: 'Respuesta invalida del proveedor' }, { status: 502 })
  }

  const whatsappUrl = buildWhatsappUrl(client.phone ?? sale.clientPhone ?? '', pdfUrl, client.name ?? sale.clientName)

  return NextResponse.json({
    invoiceNumber,
    pdfUrl,
    whatsappUrl,
  })
}
