'use client'

import { forwardRef } from 'react'
import { Package, Truck, MapPin, Phone, Calendar, Hash } from 'lucide-react'

interface RemitoItem {
  name: string
  quantity: number
  price: number
}

interface RemitoDocumentProps {
  remitoNumber: string
  date: Date
  saleId: string
  clientName?: string
  clientAddress?: string
  clientPhone?: string
  sellerName?: string
  items: RemitoItem[]
  total: number
  notes?: string
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

const formatTime = (date: Date) => {
  return date.toLocaleTimeString('es-AR', {
    hour: '2-digit',
    minute: '2-digit',
  })
}

export const RemitoDocument = forwardRef<HTMLDivElement, RemitoDocumentProps>(
  (
    {
      remitoNumber,
      date,
      saleId,
      clientName,
      clientAddress,
      clientPhone,
      sellerName,
      items,
      total,
      notes,
    },
    ref
  ) => {
    return (
      <div
        ref={ref}
        className="bg-white text-black p-8 w-[210mm] min-h-[297mm] mx-auto"
        style={{ fontFamily: 'system-ui, sans-serif' }}
      >
        {/* Header */}
        <div className="flex justify-between items-start mb-8 pb-6 border-b-2 border-gray-200">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <div className="h-12 w-12 rounded-xl bg-teal-600 flex items-center justify-center">
                <Package className="h-6 w-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">HELADOS MIO</h1>
                <p className="text-sm text-gray-500">Remito de Entrega</p>
              </div>
            </div>
            <div className="mt-4 text-sm text-gray-600">
              <p>Av. Principal 1234</p>
              <p>Buenos Aires, Argentina</p>
              <p>Tel: (011) 4567-8900</p>
            </div>
          </div>

          <div className="text-right">
            <div className="inline-flex items-center gap-2 bg-teal-50 px-4 py-2 rounded-lg mb-3">
              <Hash className="h-4 w-4 text-teal-600" />
              <span className="text-xl font-bold text-teal-600">{remitoNumber}</span>
            </div>
            <div className="text-sm text-gray-600 space-y-1">
              <div className="flex items-center justify-end gap-2">
                <Calendar className="h-4 w-4" />
                <span>
                  {formatDate(date)} - {formatTime(date)}
                </span>
              </div>
              <p className="text-xs text-gray-400">Venta: {saleId.slice(0, 8).toUpperCase()}</p>
            </div>
          </div>
        </div>

        {/* Client & Delivery Info */}
        <div className="grid grid-cols-2 gap-6 mb-8">
          <div className="bg-gray-50 rounded-xl p-5">
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
              Datos del Cliente
            </h3>
            <p className="font-semibold text-gray-900 text-lg">{clientName || 'Consumidor Final'}</p>
            {clientPhone && (
              <div className="flex items-center gap-2 mt-2 text-sm text-gray-600">
                <Phone className="h-4 w-4" />
                <span>{clientPhone}</span>
              </div>
            )}
          </div>

          <div className="bg-gray-50 rounded-xl p-5">
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
              Direccion de Entrega
            </h3>
            <div className="flex items-start gap-2">
              <MapPin className="h-4 w-4 text-gray-400 mt-1" />
              <p className="text-gray-700">{clientAddress || 'Retiro en local'}</p>
            </div>
            {sellerName && (
              <div className="flex items-center gap-2 mt-3 text-sm text-gray-600">
                <Truck className="h-4 w-4" />
                <span>Vendedor: {sellerName}</span>
              </div>
            )}
          </div>
        </div>

        {/* Items Table */}
        <div className="mb-8">
          <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-4">
            Detalle de Productos
          </h3>
          <div className="border border-gray-200 rounded-xl overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50">
                  <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Cant.
                  </th>
                  <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Producto
                  </th>
                  <th className="text-right py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Precio Unit.
                  </th>
                  <th className="text-right py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Subtotal
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {items.map((item, index) => (
                  <tr key={index}>
                    <td className="py-4 px-4">
                      <span className="inline-flex items-center justify-center h-8 w-8 rounded-full bg-teal-100 text-teal-700 font-semibold text-sm">
                        {item.quantity}
                      </span>
                    </td>
                    <td className="py-4 px-4">
                      <p className="font-medium text-gray-900">{item.name}</p>
                    </td>
                    <td className="py-4 px-4 text-right text-gray-600">{formatCurrency(item.price)}</td>
                    <td className="py-4 px-4 text-right font-medium text-gray-900">
                      {formatCurrency(item.price * item.quantity)}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="bg-gray-50">
                  <td colSpan={3} className="py-4 px-4 text-right font-semibold text-gray-700">
                    TOTAL
                  </td>
                  <td className="py-4 px-4 text-right">
                    <span className="text-xl font-bold text-teal-600">{formatCurrency(total)}</span>
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>

        {/* Notes Section */}
        {notes && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-5 mb-8">
            <h3 className="text-xs font-semibold text-amber-700 uppercase tracking-wider mb-2">
              Observaciones
            </h3>
            <p className="text-amber-800">{notes}</p>
          </div>
        )}

        {/* Signatures */}
        <div className="grid grid-cols-2 gap-8 mt-12">
          <div className="text-center">
            <div className="border-t-2 border-gray-300 pt-3">
              <p className="text-sm text-gray-600">Firma del Remitente</p>
              <p className="text-xs text-gray-400 mt-1">HELADOS MIO</p>
            </div>
          </div>
          <div className="text-center">
            <div className="border-t-2 border-gray-300 pt-3">
              <p className="text-sm text-gray-600">Firma del Receptor</p>
              <p className="text-xs text-gray-400 mt-1">Aclaracion y DNI</p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-12 pt-6 border-t border-gray-200 text-center text-xs text-gray-400">
          <p>Este remito no es valido como factura</p>
          <p className="mt-1">
            Documento generado el {formatDate(new Date())} a las {formatTime(new Date())}
          </p>
        </div>
      </div>
    )
  }
)

RemitoDocument.displayName = 'RemitoDocument'
