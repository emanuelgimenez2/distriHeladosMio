import { NextResponse } from 'next/server'
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib'
import { adminAuth, adminDb } from '@/lib/firebase-admin'

export const runtime = 'nodejs'

const formatCurrency = (value: number) => 
  new Intl.NumberFormat('es-AR', { 
    style: 'currency', 
    currency: 'ARS',
    minimumFractionDigits: 0 
  }).format(value)

const buildRemitoPdf = async (data: {
  remitoNumber: string
  saleId: string
  createdAt: Date
  clientName: string
  clientAddress: string
  clientPhone: string
  sellerName?: string
  items: Array<{ name: string; quantity: number; price: number }>
  total: number
}) => {
  const pdfDoc = await PDFDocument.create()
  const page = pdfDoc.addPage([595.28, 841.89])
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica)
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold)
  const { height, width } = page.getSize()
  
  const c = {
    black: rgb(0.067, 0.067, 0.067),
    gray: rgb(0.902, 0.914, 0.922),
    midGray: rgb(0.467, 0.467, 0.467),
    celeste: rgb(0.847, 0.929, 0.969),
    zebra: rgb(0.969, 0.973, 0.976),
    white: rgb(1, 1, 1),
  }

  const margin = 45.35

  // Marco doble exterior
  page.drawRectangle({
    x: 8,
    y: 8,
    width: width - 16,
    height: height - 16,
    borderColor: c.black,
    borderWidth: 1.5,
  })
  
  page.drawRectangle({
    x: 14,
    y: 14,
    width: width - 28,
    height: height - 28,
    borderColor: c.gray,
    borderWidth: 1,
  })

  let y = height - 70

  // REMITO centrado
  const remitoText = 'REMITO'
  const remitoWidth = fontBold.widthOfTextAtSize(remitoText, 48)
  
  page.drawLine({
    start: { x: (width - remitoWidth) / 2 - 100, y: y + 10 },
    end: { x: (width - remitoWidth) / 2 - 20, y: y + 10 },
    thickness: 0.8,
    color: c.gray,
  })
  
  page.drawLine({
    start: { x: (width + remitoWidth) / 2 + 20, y: y + 10 },
    end: { x: (width + remitoWidth) / 2 + 100, y: y + 10 },
    thickness: 0.8,
    color: c.gray,
  })

  page.drawText(remitoText, {
    x: (width - remitoWidth) / 2,
    y: y - 5,
    size: 48,
    font: fontBold,
    color: c.black,
  })

  page.drawLine({
    start: { x: margin + 40, y: y - 25 },
    end: { x: width - margin - 40, y: y - 25 },
    thickness: 1,
    color: c.gray,
  })

  y -= 90

  // Logo y branding izquierda
  const logoSize = 60
  const logoX = margin + 20
  const logoY = y - 10
  
  page.drawRectangle({
    x: logoX,
    y: logoY - logoSize,
    width: logoSize,
    height: logoSize,
    borderColor: c.celeste,
    borderWidth: 2,
    color: c.white,
  })
  
  page.drawText('H', {
    x: logoX + 18,
    y: logoY - 42,
    size: 36,
    font: fontBold,
    color: c.black,
  })

  page.drawText('Helados Mio', {
    x: logoX + logoSize + 20,
    y: logoY - 30,
    size: 28,
    font: fontBold,
    color: c.black,
  })
  
  page.drawText('DISTRIBUIDORA ARTESANAL PREMIUM', {
    x: logoX + logoSize + 20,
    y: logoY - 50,
    size: 8,
    font: font,
    color: c.midGray,
  })

  // Tarjeta N° REMITO derecha
  const cardX = width - margin - 240
  const cardY = logoY - 60
  const cardW = 220
  const cardH = 90
  
  page.drawRectangle({
    x: cardX,
    y: cardY,
    width: cardW,
    height: cardH,
    color: c.white,
    borderColor: c.gray,
    borderWidth: 1,
  })
  
  page.drawRectangle({
    x: cardX,
    y: cardY + cardH - 35,
    width: cardW,
    height: 35,
    color: c.celeste,
  })

  page.drawText('N° REMITO', {
    x: cardX + 70,
    y: cardY + cardH - 22,
    size: 9,
    font: fontBold,
    color: c.black,
  })
  
  page.drawText(data.remitoNumber, {
    x: cardX + 30,
    y: cardY + 38,
    size: 20,
    font: fontBold,
    color: c.black,
  })

  const dateStr = data.createdAt.toLocaleDateString('es-AR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  })
  const timeStr = data.createdAt.toLocaleTimeString('es-AR', { 
    hour: '2-digit', 
    minute: '2-digit' 
  })
  
  page.drawText(`${dateStr} - ${timeStr}`, {
    x: cardX + 35,
    y: cardY + 15,
    size: 9,
    font: font,
    color: c.midGray,
  })

  y = cardY - 50

  // Cards cliente y entrega
  const cardClientW = (width - 2 * margin - 20) / 2
  const cardClientH = 100
  const cardClientY = y - cardClientH

  // Card Cliente
  page.drawRectangle({
    x: margin,
    y: cardClientY,
    width: cardClientW,
    height: cardClientH,
    color: c.white,
    borderColor: c.gray,
    borderWidth: 1,
  })
  
  page.drawRectangle({
    x: margin,
    y: cardClientY + cardClientH - 35,
    width: cardClientW,
    height: 35,
    color: c.celeste,
  })
  
  page.drawCircle({
    x: margin + 15,
    y: cardClientY + cardClientH - 17,
    size: 4,
    color: c.black,
  })

  page.drawText('INFORMACIÓN DEL CLIENTE', {
    x: margin + 28,
    y: cardClientY + cardClientH - 22,
    size: 9,
    font: fontBold,
    color: c.black,
  })
  
  page.drawText(data.clientName || 'kiosko pedro', {
    x: margin + 15,
    y: cardClientY + 45,
    size: 14,
    font: fontBold,
    color: c.black,
  })
  
  page.drawText('Opcional (6ormén: Opcional)', {
    x: margin + 15,
    y: cardClientY + 20,
    size: 9,
    font: font,
    color: c.midGray,
  })

  // Card Entrega
  const card2X = margin + cardClientW + 20
  page.drawRectangle({
    x: card2X,
    y: cardClientY,
    width: cardClientW,
    height: cardClientH,
    color: c.white,
    borderColor: c.gray,
    borderWidth: 1,
  })
  
  page.drawRectangle({
    x: card2X,
    y: cardClientY + cardClientH - 35,
    width: cardClientW,
    height: 35,
    color: c.celeste,
  })
  
  page.drawCircle({
    x: card2X + 15,
    y: cardClientY + cardClientH - 17,
    size: 4,
    color: c.black,
  })

  page.drawText('DATOS DE ENTREGA', {
    x: card2X + 28,
    y: cardClientY + cardClientH - 22,
    size: 9,
    font: fontBold,
    color: c.black,
  })
  
  page.drawText(data.clientAddress || 'Retiro en local', {
    x: card2X + 15,
    y: cardClientY + 45,
    size: 13,
    font: fontBold,
    color: c.black,
  })
  
  page.drawText(`ID: ${data.saleId.slice(0, 18)}...`, {
    x: card2X + 15,
    y: cardClientY + 20,
    size: 8,
    font: font,
    color: c.midGray,
  })

  y = cardClientY - 50

  // DETALLE DE PRODUCTOS
  page.drawText('DETALLE DE PRODUCTOS', {
    x: margin,
    y: y,
    size: 15,
    font: fontBold,
    color: c.black,
  })
  
  page.drawLine({
    start: { x: margin, y: y - 8 },
    end: { x: width - margin, y: y - 8 },
    thickness: 1,
    color: c.gray,
  })

  y -= 50

  // Header tabla
  const thY = y
  const tableWidth = width - 2 * margin
  
  page.drawRectangle({
    x: margin,
    y: thY - 8,
    width: tableWidth,
    height: 34,
    color: c.black,
  })

  const col = {
    cant: margin + 50,
    producto: margin + 135,
    precioUnit: width - margin - 170,
    subtotal: width - margin - 70,
  }

  page.drawText('CANT', { 
    x: col.cant - 15, 
    y: thY + 2, 
    size: 10, 
    font: fontBold, 
    color: c.white,
  })
  page.drawText('PRODUCTO', { 
    x: col.producto, 
    y: thY + 2, 
    size: 10, 
    font: fontBold, 
    color: c.white,
  })
  page.drawText('PRECIO UNITARIO', { 
    x: col.precioUnit - 50, 
    y: thY + 2, 
    size: 10, 
    font: fontBold, 
    color: c.white,
  })
  page.drawText('SUBTOTAL', { 
    x: col.subtotal - 30, 
    y: thY + 2, 
    size: 10, 
    font: fontBold, 
    color: c.white,
  })

  y -= 50

  // Items
  let alt = false
  for (const item of data.items) {
    const rh = 38
    
    if (alt) {
      page.drawRectangle({
        x: margin + 2,
        y: y - 5,
        width: tableWidth - 4,
        height: rh,
        color: c.zebra,
      })
    }

    // Badge cantidad
    page.drawRectangle({
      x: col.cant - 20,
      y: y + 3,
      width: 32,
      height: 24,
      color: c.celeste,
    })
    
    const qtyStr = String(item.quantity)
    const qtyWidth = fontBold.widthOfTextAtSize(qtyStr, 11)
    page.drawText(qtyStr, {
      x: col.cant - 4 - qtyWidth / 2,
      y: y + 9,
      size: 11,
      font: fontBold,
      color: c.black,
    })

    page.drawText(item.name, { 
      x: col.producto, 
      y: y + 8, 
      size: 11, 
      font: fontBold, 
      color: c.black,
    })
    
    page.drawText(formatCurrency(item.price), { 
      x: col.precioUnit, 
      y: y + 8, 
      size: 10, 
      font: font, 
      color: c.black,
    })
    
    page.drawText(formatCurrency(item.price * item.quantity), { 
      x: col.subtotal, 
      y: y + 8, 
      size: 11, 
      font: fontBold, 
      color: c.black,
    })

    y -= rh
    alt = !alt
  }

  // TOTAL
  y -= 30
  
  const totalBoxW = 280
  const totalBoxH = 60
  const totalBoxX = width - margin - totalBoxW
  
  page.drawRectangle({
    x: totalBoxX,
    y: y - 15,
    width: totalBoxW,
    height: totalBoxH,
    color: c.celeste,
    borderColor: c.gray,
    borderWidth: 1,
  })

  page.drawText('TOTAL', {
    x: totalBoxX + 20,
    y: y + 15,
    size: 12,
    font: fontBold,
    color: c.black,
  })
  
  const totalStr = formatCurrency(data.total)
  const totalWidth = fontBold.widthOfTextAtSize(totalStr, 24)
  page.drawText(totalStr, {
    x: totalBoxX + totalBoxW - totalWidth - 20,
    y: y + 10,
    size: 24,
    font: fontBold,
    color: c.black,
  })

  // Footer
  y -= 80
  
  page.drawLine({
    start: { x: width * 0.25, y: y + 10 },
    end: { x: width * 0.75, y: y + 10 },
    thickness: 0.5,
    color: c.gray,
  })

  const footerText = 'Gracias por elegirnos • Helados Mio • Calidad artesanal'
  const footerWidth = font.widthOfTextAtSize(footerText, 9)
  page.drawText(footerText, {
    x: (width - footerWidth) / 2,
    y: y - 10,
    size: 9,
    font: font,
    color: c.midGray,
  })
  
  const legalText = 'Este documento no es válido como factura fiscal'
  const legalWidth = font.widthOfTextAtSize(legalText, 7.5)
  page.drawText(legalText, {
    x: (width - legalWidth) / 2,
    y: y - 27,
    size: 7.5,
    font: font,
    color: c.midGray,
  })

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
  let sellerName = sale.sellerName || ''

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
      sellerName,
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