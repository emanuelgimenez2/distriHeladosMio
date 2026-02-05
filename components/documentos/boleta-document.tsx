'use client'

import { forwardRef } from 'react'

interface BoletaItem {
  name: string
  quantity: number
  price: number
}

interface BoletaDocumentProps {
  boletaNumber: string
  date: Date
  clientName?: string
  clientCuit?: string
  clientAddress?: string
  clientPhone?: string
  clientTaxCategory?: string
  items: BoletaItem[]
  total: number
  paymentType: 'cash' | 'credit' | 'mixed'
  cashAmount?: number
  creditAmount?: number
  cae?: string
  caeVencimiento?: Date
}

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
    minimumFractionDigits: 2,
  }).format(amount)
}

const formatDate = (date: Date) => {
  return date.toLocaleDateString('es-AR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })
}

const getTaxCategoryLabel = (category?: string) => {
  const categories: Record<string, string> = {
    responsable_inscripto: 'Responsable Inscripto',
    monotributo: 'Monotributo',
    consumidor_final: 'Consumidor Final',
    exento: 'Exento',
    no_responsable: 'No Responsable',
  }
  return categories[category || ''] || 'Consumidor Final'
}

export const BoletaDocument = forwardRef<HTMLDivElement, BoletaDocumentProps>(
  (
    {
      boletaNumber,
      date,
      clientName,
      clientCuit,
      clientAddress,
      clientPhone,
      clientTaxCategory,
      items,
      total,
      paymentType,
      cashAmount,
      creditAmount,
      cae,
      caeVencimiento,
    },
    ref
  ) => {
    return (
      <div
        ref={ref}
        className="bg-white text-black p-8 w-[210mm] min-h-[297mm] mx-auto font-mono text-sm"
        style={{ fontFamily: 'monospace' }}
      >
        {/* Header */}
        <div className="border-2 border-black mb-4">
          <div className="grid grid-cols-3">
            {/* Left - Company Info */}
            <div className="p-4 border-r-2 border-black">
              <h1 className="text-xl font-bold mb-2">HELADOS MIO</h1>
              <p className="text-xs leading-relaxed">
                Razon Social: HELADOS MIO S.R.L.
                <br />
                Domicilio Comercial: Av. Principal 1234
                <br />
                Localidad: Buenos Aires
                <br />
                Condicion frente al IVA: Responsable Inscripto
              </p>
            </div>

            {/* Center - Document Type */}
            <div className="p-4 border-r-2 border-black flex flex-col items-center justify-center">
              <div className="border-2 border-black w-16 h-16 flex items-center justify-center text-3xl font-bold mb-2">
                B
              </div>
              <p className="text-xs text-center">
                Codigo 006
                <br />
                FACTURA
              </p>
            </div>

            {/* Right - Document Info */}
            <div className="p-4">
              <p className="text-lg font-bold mb-2">
                Punto de Venta: 0001
                <br />
                Comp. Nro: {boletaNumber}
              </p>
              <p className="text-xs leading-relaxed">
                Fecha de Emision: {formatDate(date)}
                <br />
                CUIT: 30-12345678-9
                <br />
                Ingresos Brutos: 12345678
                <br />
                Inicio de Actividades: 01/01/2020
              </p>
            </div>
          </div>
        </div>

        {/* Client Info */}
        <div className="border-2 border-black p-4 mb-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p>
                <span className="font-bold">CUIT:</span> {clientCuit || '00-00000000-0'}
              </p>
              <p>
                <span className="font-bold">Condicion frente al IVA:</span>{' '}
                {getTaxCategoryLabel(clientTaxCategory)}
              </p>
            </div>
            <div>
              <p>
                <span className="font-bold">Apellido y Nombre / Razon Social:</span>
              </p>
              <p>{clientName || 'Consumidor Final'}</p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4 mt-2">
            <p>
              <span className="font-bold">Domicilio:</span> {clientAddress || '-'}
            </p>
            <p>
              <span className="font-bold">Condicion de venta:</span>{' '}
              {paymentType === 'cash'
                ? 'Contado'
                : paymentType === 'credit'
                  ? 'Cuenta Corriente'
                  : 'Contado y Cuenta'}
            </p>
          </div>
        </div>

        {/* Items Table */}
        <div className="border-2 border-black mb-4">
          <table className="w-full">
            <thead>
              <tr className="border-b-2 border-black bg-gray-100">
                <th className="text-left p-2 border-r border-black">Cantidad</th>
                <th className="text-left p-2 border-r border-black">Descripcion</th>
                <th className="text-right p-2 border-r border-black">Precio Unit.</th>
                <th className="text-right p-2 border-r border-black">% IVA</th>
                <th className="text-right p-2">Subtotal</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item, index) => (
                <tr key={index} className="border-b border-black">
                  <td className="p-2 border-r border-black text-center">{item.quantity}</td>
                  <td className="p-2 border-r border-black">{item.name}</td>
                  <td className="p-2 border-r border-black text-right">{formatCurrency(item.price)}</td>
                  <td className="p-2 border-r border-black text-right">21.00</td>
                  <td className="p-2 text-right">{formatCurrency(item.price * item.quantity)}</td>
                </tr>
              ))}
              {/* Empty rows to fill space */}
              {items.length < 10 &&
                Array.from({ length: 10 - items.length }).map((_, i) => (
                  <tr key={`empty-${i}`} className="border-b border-black">
                    <td className="p-2 border-r border-black">&nbsp;</td>
                    <td className="p-2 border-r border-black">&nbsp;</td>
                    <td className="p-2 border-r border-black">&nbsp;</td>
                    <td className="p-2 border-r border-black">&nbsp;</td>
                    <td className="p-2">&nbsp;</td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>

        {/* Totals */}
        <div className="border-2 border-black p-4 mb-4">
          <div className="flex justify-end">
            <div className="w-64">
              <div className="flex justify-between mb-1">
                <span>Subtotal:</span>
                <span>{formatCurrency(total / 1.21)}</span>
              </div>
              <div className="flex justify-between mb-1">
                <span>IVA 21%:</span>
                <span>{formatCurrency(total - total / 1.21)}</span>
              </div>
              <div className="flex justify-between font-bold text-lg border-t border-black pt-2">
                <span>TOTAL:</span>
                <span>{formatCurrency(total)}</span>
              </div>
              {paymentType === 'mixed' && (
                <div className="mt-2 pt-2 border-t border-dashed border-black text-xs">
                  <div className="flex justify-between">
                    <span>Efectivo:</span>
                    <span>{formatCurrency(cashAmount || 0)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>A Cuenta:</span>
                    <span>{formatCurrency(creditAmount || 0)}</span>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* CAE Info */}
        <div className="border-2 border-black p-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-xs">
                <span className="font-bold">CAE N:</span> {cae || 'Pendiente de autorizacion'}
              </p>
              <p className="text-xs">
                <span className="font-bold">Fecha de Vto. de CAE:</span>{' '}
                {caeVencimiento ? formatDate(caeVencimiento) : '-'}
              </p>
            </div>
            <div className="flex justify-end">
              {/* QR Code placeholder */}
              <div className="w-24 h-24 border-2 border-black flex items-center justify-center text-xs text-center">
                QR AFIP
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-4 text-center text-xs text-gray-600">
          <p>Comprobante autorizado - AFIP</p>
          <p>Esta factura contribuye al desarrollo del pais. El pago de los impuestos es obligacion de todos.</p>
        </div>
      </div>
    )
  }
)

BoletaDocument.displayName = 'BoletaDocument'
