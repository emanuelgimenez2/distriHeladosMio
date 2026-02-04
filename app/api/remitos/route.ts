import { NextResponse } from 'next/server'
import { PDFDocument, StandardFonts } from 'pdf-lib'
import { adminAuth, adminDb } from '@/lib/firebase-admin'

export const runtime = 'nodejs'

const formatCurrency = (value: number) => `$${value.toFixed(2)}`

const buildRemitoPdf = async (data: {
  remitoNumber: string
  saleId: string
  createdAt: Date
  clientName: string
  clientAddress: string
  clientPhone: string
  items: Array<{ name: string; quantity: number; price: number }>
  total: number
}) => {
  const pdfDoc = await PDFDocument.create()
  const page = pdfDoc.addPage([595.28, 841.89]) // A4
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica)
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold)
  const { height } = page.getSize()
  let cursorY = height - 50

  const drawLine = (text: string, size = 11, bold = false) => {
    page.drawText(text, {
      x: 50,
      y: cursorY,
      size,
      font: bold ? fontBold : font,
    })
    cursorY -= size + 8
  }

  drawLine('REMITO - HELADOS MIO', 16, true)
  drawLine(`Numero: ${data.remitoNumber}`)
  drawLine(`Fecha: ${data.createdAt.toLocaleDateString('es-AR')}`)
  drawLine(`Venta: ${data.saleId}`)
  cursorY -= 8
  drawLine('Cliente', 12, true)
  drawLine(`Nombre: ${data.clientName || 'Consumidor final'}`)
  drawLine(`Telefono: ${data.clientPhone || '-'}`)
  drawLine(`Direccion: ${data.clientAddress || '-'}`)
  cursorY -= 8
  drawLine('Detalle', 12, true)

  if (data.items.length === 0) {
    drawLine('Sin items')
  } else {
    for (const item of data.items) {
      const subtotal = item.price * item.quantity
      drawLine(`x${item.quantity} ${item.name} - ${formatCurrency(item.price)} = ${formatCurrency(subtotal)}`)
    }
  }

  cursorY -= 6
  drawLine(`Total: ${formatCurrency(data.total)}`, 12, true)

  const pdfBytes = await pdfDoc.save()
  const pdfBase64 = Buffer.from(pdfBytes).toString('base64')
  return `data:application/pdf;base64,${pdfBase64}`
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
  let clientAddress = ''
  let clientName = sale.clientName || ''
  let clientPhone = sale.clientPhone || ''

  if (sale.clientId) {
    const clientSnapshot = await adminDb.collection('clientes').doc(sale.clientId).get()
    if (clientSnapshot.exists) {
      const clientData = clientSnapshot.data() || {}
      clientAddress = clientData.address || clientAddress
      clientName = clientData.name || clientName
      clientPhone = clientData.phone || clientPhone
    }
  }

  const apiKey = process.env.REMITO_API_KEY
  const apiUrl = process.env.REMITO_API_URL

  if (!apiKey || !apiUrl) {
    const remitoNumber = `REM-${String(Date.now()).slice(-8)}`
    const pdfUrl = await buildRemitoPdf({
      remitoNumber,
      saleId: body.saleId,
      createdAt: new Date(),
      clientName,
      clientAddress,
      clientPhone,
      items: Array.isArray(sale.items) ? sale.items : [],
      total: Number(sale.total || 0),
    })
    return NextResponse.json({ remitoNumber, pdfUrl, mock: true })
  }

  const providerResponse = await fetch(apiUrl, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      saleId: body.saleId,
    }),
  })

  if (!providerResponse.ok) {
    const error = await providerResponse.json().catch(() => ({}))
    return NextResponse.json({ message: error?.message || 'Error del proveedor' }, { status: 502 })
  }

  const providerData = await providerResponse.json()
  const pdfUrl = providerData.pdfUrl || providerData.url
  const remitoNumber = providerData.remitoNumber || providerData.number

  if (!pdfUrl || !remitoNumber) {
    return NextResponse.json({ message: 'Respuesta invalida del proveedor' }, { status: 502 })
  }

  return NextResponse.json({ remitoNumber, pdfUrl })
}
