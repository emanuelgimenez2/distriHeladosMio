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
    primary: rgb(0.26, 0.52, 0.96),
    primaryLight: rgb(0.85, 0.90, 0.98),
    accent: rgb(1, 0.35, 0.55),
    accentLight: rgb(1, 0.93, 0.95),
    success: rgb(0.20, 0.78, 0.55),
    dark: rgb(0.13, 0.13, 0.18),
    darkMuted: rgb(0.35, 0.35, 0.42),
    gray: rgb(0.52, 0.52, 0.58),
    grayLight: rgb(0.75, 0.75, 0.78),
    bgGray: rgb(0.97, 0.97, 0.98),
    white: rgb(1, 1, 1),
  }

  let y = height - 40

  // ===== HEADER PREMIUM =====
  
  page.drawRectangle({
    x: 0,
    y: height - 200,
    width: width,
    height: 200,
    color: c.white,
  })

  // Gradiente visual con rectángulos superpuestos
  page.drawRectangle({
    x: 0,
    y: height - 6,
    width: width,
    height: 6,
    color: c.primary,
  })
  
  page.drawRectangle({
    x: 0,
    y: height - 8,
    width: width * 0.65,
    height: 2,
    color: c.accent,
  })

  // Logo icono minimalista
  const logoSize = 52
  const logoX = 45
  const logoY = height - 90
  
  page.drawRectangle({
    x: logoX,
    y: logoY,
    width: logoSize,
    height: logoSize,
    color: c.primary,
  })
  
  page.drawRectangle({
    x: logoX + 4,
    y: logoY + 4,
    width: logoSize - 8,
    height: logoSize - 8,
    color: c.primaryLight,
  })
  
  page.drawText('H', {
    x: logoX + 16,
    y: logoY + 16,
    size: 32,
    font: fontBold,
    color: c.primary,
  })

  // Branding
  page.drawText('Helados Mio', {
    x: logoX + logoSize + 18,
    y: logoY + 30,
    size: 26,
    font: fontBold,
    color: c.dark,
  })
  
  page.drawText('DISTRIBUIDORA ARTESANAL PREMIUM', {
    x: logoX + logoSize + 18,
    y: logoY + 12,
    size: 9,
    font: font,
    color: c.gray,
  })

  // Badge remito premium
  const badgeX = width - 190
  const badgeY = height - 120
  
  page.drawRectangle({
    x: badgeX,
    y: badgeY,
    width: 160,
    height: 90,
    color: c.bgGray,
  })
  
  page.drawRectangle({
    x: badgeX,
    y: badgeY + 50,
    width: 160,
    height: 40,
    color: c.primary,
  })

  page.drawText('REMITO', {
    x: badgeX + 50,
    y: badgeY + 67,
    size: 11,
    font: fontBold,
    color: c.white,
  })
  
  page.drawText(data.remitoNumber, {
    x: badgeX + 18,
    y: badgeY + 26,
    size: 16,
    font: fontBold,
    color: c.dark,
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
  
  page.drawText(`${dateStr} · ${timeStr}`, {
    x: badgeX + 18,
    y: badgeY + 8,
    size: 9,
    font: font,
    color: c.gray,
  })

  y = height - 230

  // ===== INFORMACIÓN CLIENTE/ENTREGA MODERNA =====
  
  const cardH = 95
  const cardW = (width - 110) / 2
  const cardY = y - cardH
  const gap = 10

  // Card Cliente
  page.drawRectangle({
    x: 45,
    y: cardY,
    width: cardW,
    height: cardH,
    color: c.white,
    borderColor: rgb(0.88, 0.88, 0.92),
    borderWidth: 1.5,
  })
  
  page.drawRectangle({
    x: 45,
    y: cardY + cardH - 32,
    width: cardW,
    height: 32,
    color: c.primaryLight,
  })
  
  page.drawCircle({
    x: 60,
    y: cardY + cardH - 16,
    size: 5,
    color: c.primary,
  })

  page.drawText('INFORMACIÓN DEL CLIENTE', {
    x: 70,
    y: cardY + cardH - 20,
    size: 8.5,
    font: fontBold,
    color: c.primary,
  })
  
  page.drawText(data.clientName || 'Consumidor Final', {
    x: 60,
    y: cardY + 50,
    size: 13,
    font: fontBold,
    color: c.dark,
    maxWidth: cardW - 30,
  })
  
  if (data.clientPhone) {
    page.drawText(`Tel: ${data.clientPhone}`, {
      x: 60,
      y: cardY + 32,
      size: 9.5,
      font: font,
      color: c.gray,
    })
  }
  
  if (data.clientAddress) {
    page.drawText(data.clientAddress, {
      x: 60,
      y: cardY + 16,
      size: 9,
      font: font,
      color: c.darkMuted,
      maxWidth: cardW - 30,
    })
  }

  // Card Entrega
  const card2X = 55 + cardW
  page.drawRectangle({
    x: card2X,
    y: cardY,
    width: cardW,
    height: cardH,
    color: c.white,
    borderColor: rgb(0.88, 0.88, 0.92),
    borderWidth: 1.5,
  })
  
  page.drawRectangle({
    x: card2X,
    y: cardY + cardH - 32,
    width: cardW,
    height: 32,
    color: c.accentLight,
  })
  
  page.drawCircle({
    x: card2X + 15,
    y: cardY + cardH - 16,
    size: 5,
    color: c.accent,
  })

  page.drawText('DATOS DE ENTREGA', {
    x: card2X + 25,
    y: cardY + cardH - 20,
    size: 8.5,
    font: fontBold,
    color: c.accent,
  })
  
  page.drawText(data.clientAddress || 'Retiro en local', {
    x: card2X + 15,
    y: cardY + 50,
    size: 12,
    font: fontBold,
    color: c.dark,
    maxWidth: cardW - 30,
  })
  
  if (data.sellerName) {
    page.drawText(`Vendedor: ${data.sellerName}`, {
      x: card2X + 15,
      y: cardY + 32,
      size: 9.5,
      font: font,
      color: c.gray,
    })
  }
  
  page.drawText(`ID: ${data.saleId.slice(0, 18)}...`, {
    x: card2X + 15,
    y: cardY + 16,
    size: 8,
    font: font,
    color: c.grayLight,
  })

  y = cardY - 50

  // ===== TABLA PRODUCTOS ULTRA PREMIUM =====
  
  page.drawText('Detalle de Productos', {
    x: 45,
    y: y,
    size: 15,
    font: fontBold,
    color: c.dark,
  })
  
  page.drawRectangle({
    x: 45,
    y: y - 6,
    width: 80,
    height: 3,
    color: c.primary,
  })

  y -= 40

  // Header tabla con estilo glassmorphism
  const thY = y
  page.drawRectangle({
    x: 45,
    y: thY - 8,
    width: width - 90,
    height: 34,
    color: c.dark,
  })

  const col = {
    qty: 70,
    prod: 130,
    unit: width - 210,
    sub: width - 115,
  }

  page.drawText('CANT', { 
    x: col.qty, 
    y: thY + 1, 
    size: 9, 
    font: fontBold, 
    color: c.white,
  })
  page.drawText('PRODUCTO', { 
    x: col.prod, 
    y: thY + 1, 
    size: 9, 
    font: fontBold, 
    color: c.white,
  })
  page.drawText('P. UNIT', { 
    x: col.unit, 
    y: thY + 1, 
    size: 9, 
    font: fontBold, 
    color: c.white,
  })
  page.drawText('SUBTOTAL', { 
    x: col.sub, 
    y: thY + 1, 
    size: 9, 
    font: fontBold, 
    color: c.white,
  })

  y -= 45

  // Items con diseño premium
  let alt = false
  for (const item of data.items) {
    const rh = 32
    
    if (alt) {
      page.drawRectangle({
        x: 48,
        y: y - 5,
        width: width - 96,
        height: rh,
        color: c.bgGray,
      })
    }

    // Badge cantidad minimalista
    page.drawRectangle({
      x: col.qty - 2,
      y: y + 1,
      width: 32,
      height: 20,
      color: c.primary,
    })
    
    const qtyStr = String(item.quantity)
    const qtyOffset = qtyStr.length > 1 ? 8 : 11
    page.drawText(qtyStr, {
      x: col.qty + qtyOffset,
      y: y + 6,
      size: 10,
      font: fontBold,
      color: c.white,
    })

    page.drawText(item.name, { 
      x: col.prod, 
      y: y + 5, 
      size: 10.5, 
      font: fontBold, 
      color: c.dark,
      maxWidth: col.unit - col.prod - 20,
    })
    
    page.drawText(formatCurrency(item.price), { 
      x: col.unit, 
      y: y + 5, 
      size: 10, 
      font: font, 
      color: c.darkMuted,
    })
    
    page.drawText(formatCurrency(item.price * item.quantity), { 
      x: col.sub, 
      y: y + 5, 
      size: 11, 
      font: fontBold, 
      color: c.dark,
    })

    y -= rh
    alt = !alt
  }

  // ===== TOTAL PREMIUM =====
  
  y -= 30
  
  page.drawRectangle({
    x: 45,
    y: y - 15,
    width: width - 90,
    height: 60,
    color: c.success,
  })
  
  page.drawRectangle({
    x: 52,
    y: y - 8,
    width: width - 104,
    height: 46,
    color: rgb(1, 1, 1),
    opacity: 0.15,
  })

  page.drawText('TOTAL A PAGAR', {
    x: 70,
    y: y + 13,
    size: 13,
    font: fontBold,
    color: c.white,
  })
  
  const totalStr = formatCurrency(data.total)
  page.drawText(totalStr, {
    x: width - 220,
    y: y + 8,
    size: 26,
    font: fontBold,
    color: c.white,
  })

  // ===== FIRMAS ELEGANTES =====
  
  y -= 100
  const sigW = 210
  const sigGap = (width - 90 - sigW * 2) / 2
  const lineY = y + 50

  // Firma izquierda
  page.drawRectangle({
    x: 45,
    y: lineY - 2,
    width: sigW,
    height: 1.5,
    color: c.grayLight,
  })
  
  page.drawCircle({
    x: 45 + sigW / 2,
    y: lineY - 1,
    size: 4,
    color: c.primary,
  })

  page.drawText('Firma y Sello', {
    x: 45 + (sigW - 75) / 2,
    y: lineY - 22,
    size: 10,
    font: fontBold,
    color: c.dark,
  })
  page.drawText('Helados Mio', {
    x: 45 + (sigW - 60) / 2,
    y: lineY - 38,
    size: 8.5,
    font: font,
    color: c.gray,
  })

  // Firma derecha
  const sig2X = 45 + sigW + sigGap
  page.drawRectangle({
    x: sig2X,
    y: lineY - 2,
    width: sigW,
    height: 1.5,
    color: c.grayLight,
  })
  
  page.drawCircle({
    x: sig2X + sigW / 2,
    y: lineY - 1,
    size: 4,
    color: c.accent,
  })

  page.drawText('Firma del Cliente', {
    x: sig2X + (sigW - 95) / 2,
    y: lineY - 22,
    size: 10,
    font: fontBold,
    color: c.dark,
  })
  page.drawText('Aclaración y DNI', {
    x: sig2X + (sigW - 80) / 2,
    y: lineY - 38,
    size: 8.5,
    font: font,
    color: c.gray,
  })

  // ===== FOOTER MINIMALISTA =====
  
  y = 55
  
  page.drawLine({
    start: { x: width * 0.25, y: y + 25 },
    end: { x: width * 0.75, y: y + 25 },
    thickness: 0.5,
    color: rgb(0.88, 0.88, 0.92),
  })

  page.drawText('Gracias por elegirnos  •  Helados Mio  •  Calidad Artesanal', {
    x: (width - 310) / 2,
    y: y + 5,
    size: 9,
    font: font,
    color: c.gray,
  })
  
  page.drawText('Este documento no es válido como factura fiscal', {
    x: (width - 245) / 2,
    y: y - 12,
    size: 7.5,
    font: font,
    color: c.grayLight,
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