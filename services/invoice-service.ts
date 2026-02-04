import { getAuthToken } from '@/services/auth-service'

export const createInvoice = async (payload: {
  saleId: string
  client?: { name?: string; phone?: string; email?: string; taxCategory?: string }
}) => {
  const token = await getAuthToken()
  const response = await fetch('/api/facturacion', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(payload),
  })

  if (!response.ok) {
    const error = await response.json().catch(() => ({}))
    throw new Error(error?.message || 'Error generando la factura')
  }

  return response.json() as Promise<{
    invoiceNumber: string
    pdfUrl: string
    whatsappUrl?: string
  }>
}

export const createRemito = async (payload: { saleId: string }) => {
  const token = await getAuthToken()
  const response = await fetch('/api/remitos', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(payload),
  })

  if (!response.ok) {
    const error = await response.json().catch(() => ({}))
    throw new Error(error?.message || 'Error generando el remito')
  }

  return response.json() as Promise<{
    remitoNumber: string
    pdfUrl: string
  }>
}
