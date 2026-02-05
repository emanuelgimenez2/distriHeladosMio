'use client'

import { useEffect, useState } from 'react'
import { MainLayout } from '@/components/layout/main-layout'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { DataTableSkeleton } from '@/components/ui/data-table-skeleton'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Label } from '@/components/ui/label'
import { remitoApi, salesApi } from '@/lib/api'
import type { Sale } from '@/lib/types'
import {
  Plus,
  Search,
  Eye,
  MoreVertical,
  ShoppingBag,
  Banknote,
  CreditCard,
  Clock,
  FileText,
  Truck,
  Package,
  User,
  Calendar,
  Loader2,
  CheckCircle,
  Send,
  Download,
} from 'lucide-react'
import { toast } from 'sonner'
import Link from 'next/link'

export default function VentasPage() {
  const [sales, setSales] = useState<Sale[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [invoiceFilter, setInvoiceFilter] = useState<string>('all')
  const [paymentFilter, setPaymentFilter] = useState<string>('all')
  const [sourceFilter, setSourceFilter] = useState<'all' | 'direct' | 'order'>('all')

  // Detail modal state
  const [detailModalOpen, setDetailModalOpen] = useState(false)
  const [selectedSale, setSelectedSale] = useState<Sale | null>(null)

  // Emit document modal state
  const [emitModalOpen, setEmitModalOpen] = useState(false)
  const [saleToEmit, setSaleToEmit] = useState<Sale | null>(null)
  const [documentType, setDocumentType] = useState<'invoice' | 'remito'>('invoice')
  const [emitting, setEmitting] = useState(false)

  useEffect(() => {
    loadSales()
    // Set default date to today
    const today = formatDateInput(new Date())
    setDateFrom(today)
    setDateTo(today)
  }, [])

  // Sync selectedSale with latest sales data
  useEffect(() => {
    if (!selectedSale) return
    const latest = sales.find((s) => s.id === selectedSale.id)
    if (!latest) return
    if (
      latest.invoicePdfUrl !== selectedSale.invoicePdfUrl ||
      latest.invoiceWhatsappUrl !== selectedSale.invoiceWhatsappUrl ||
      latest.remitoPdfUrl !== selectedSale.remitoPdfUrl ||
      latest.remitoNumber !== selectedSale.remitoNumber ||
      latest.invoiceEmitted !== selectedSale.invoiceEmitted
    ) {
      setSelectedSale(latest)
    }
  }, [sales, selectedSale])

  const loadSales = async () => {
    try {
      const data = await salesApi.getAll()
      setSales(data)
    } catch (error) {
      console.error('Error loading sales:', error)
      toast.error('Error al cargar las ventas')
    } finally {
      setLoading(false)
    }
  }

  const formatDateInput = (date: Date) => {
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    return `${year}-${month}-${day}`
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: 'ARS',
      minimumFractionDigits: 0,
    }).format(amount)
  }

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('es-AR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    }).format(new Date(date))
  }

  const formatDateTime = (date: Date) => {
    return new Intl.DateTimeFormat('es-AR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date(date))
  }

  const handleViewDetail = (sale: Sale) => {
    setSelectedSale(sale)
    setDetailModalOpen(true)
  }

  const handleOpenEmitModal = (sale: Sale) => {
    setSaleToEmit(sale)
    setDocumentType(sale.invoiceEmitted ? 'remito' : 'invoice')
    setEmitModalOpen(true)
  }

  const handleEmitDocument = async () => {
    if (!saleToEmit) return
    setEmitting(true)
    try {
      if (documentType === 'invoice') {
        const result = await salesApi.emitInvoice(saleToEmit.id, {
          name: saleToEmit.clientName,
          phone: saleToEmit.clientPhone,
        })
        setSales((prev) =>
          prev.map((s) =>
            s.id === saleToEmit.id
              ? {
                  ...s,
                  invoiceEmitted: true,
                  invoiceNumber: result.invoiceNumber,
                  invoicePdfUrl: result.pdfUrl,
                  invoiceWhatsappUrl: result.whatsappUrl,
                }
              : s
          )
        )
        toast.success('Boleta emitida correctamente')
      } else {
        const result = await remitoApi.createRemito(saleToEmit.id)
        setSales((prev) =>
          prev.map((s) =>
            s.id === saleToEmit.id
              ? {
                  ...s,
                  remitoNumber: result.remitoNumber,
                  remitoPdfUrl: result.pdfUrl,
                }
              : s
          )
        )
        toast.success('Remito generado correctamente')
      }
      setEmitModalOpen(false)
      setSaleToEmit(null)
    } catch (error) {
      console.error('Error emitting document:', error)
      toast.error(documentType === 'invoice' ? 'Error al emitir boleta' : 'Error al generar remito')
    } finally {
      setEmitting(false)
    }
  }

  const buildWhatsappUrl = (phone?: string, pdfUrl?: string, clientName?: string) => {
    if (!phone || !pdfUrl) return null
    const cleanPhone = phone.replace(/[^\d]/g, '')
    if (!cleanPhone) return null
    const message = `Hola${clientName ? ` ${clientName}` : ''}, tu comprobante esta listo: ${pdfUrl}`
    return `https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`
  }

  const isWithinDateRange = (date: Date, from?: string, to?: string) => {
    if (!from && !to) return true
    const value = new Date(date)
    const start = from ? new Date(`${from}T00:00:00`) : null
    const end = to ? new Date(`${to}T23:59:59`) : null
    if (start && value < start) return false
    if (end && value > end) return false
    return true
  }

  const filteredSales = sales
    .filter((sale) => {
      const query = searchQuery.toLowerCase()
      const matchesSearch =
        sale.id.toLowerCase().includes(query) ||
        (sale.clientName?.toLowerCase().includes(query) ?? false) ||
        (sale.sellerName?.toLowerCase().includes(query) ?? false)

      const matchesInvoice =
        invoiceFilter === 'all' ||
        (invoiceFilter === 'emitted' && sale.invoiceEmitted) ||
        (invoiceFilter === 'pending' && !sale.invoiceEmitted)

      const matchesPayment = paymentFilter === 'all' || sale.paymentType === paymentFilter

      const matchesSource =
        sourceFilter === 'all' ||
        (sourceFilter === 'direct' && sale.source !== 'order') ||
        (sourceFilter === 'order' && sale.source === 'order')

      const matchesDate = isWithinDateRange(sale.createdAt, dateFrom, dateTo)

      return matchesSearch && matchesInvoice && matchesPayment && matchesSource && matchesDate
    })
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())

  // Stats calculations
  const totalVentas = filteredSales.reduce((sum, s) => sum + s.total, 0)
  const efectivo = filteredSales.filter((s) => s.paymentType === 'cash').reduce((sum, s) => sum + s.total, 0)
  const ctaCorriente = filteredSales.filter((s) => s.paymentType === 'credit').reduce((sum, s) => sum + s.total, 0)
  const boletasPendientes = filteredSales.filter((s) => !s.invoiceEmitted).length

  // Badge styles
  const getPaymentBadgeStyle = (paymentType: 'cash' | 'credit') => {
    return paymentType === 'cash'
      ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800'
      : 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 border border-amber-200 dark:border-amber-800'
  }

  const getSourceBadgeStyle = (source?: 'direct' | 'order') => {
    return source === 'order'
      ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400 border border-purple-200 dark:border-purple-800'
      : 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 border border-blue-200 dark:border-blue-800'
  }

  const getInvoiceBadgeStyle = (emitted: boolean) => {
    return emitted
      ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800'
      : 'bg-slate-100 text-slate-700 dark:bg-slate-800/50 dark:text-slate-300 border border-slate-200 dark:border-slate-700'
  }

  return (
    <MainLayout title="Ventas" description="Historial de ventas y facturacion">
      {/* Stats Cards - Solo visible en desktop */}
      <div className="hidden lg:grid grid-cols-4 gap-4 mb-6">
        <Card className="bg-gradient-to-br from-primary/5 to-primary/10 border-primary/20">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <ShoppingBag className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Ventas</p>
                <p className="text-2xl font-bold text-foreground">{formatCurrency(totalVentas)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-emerald-500/5 to-emerald-500/10 border-emerald-500/20">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-emerald-500/10">
                <Banknote className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Efectivo</p>
                <p className="text-2xl font-bold text-foreground">{formatCurrency(efectivo)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-amber-500/5 to-amber-500/10 border-amber-500/20">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-amber-500/10">
                <CreditCard className="h-5 w-5 text-amber-600 dark:text-amber-400" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Cuenta Corriente</p>
                <p className="text-2xl font-bold text-foreground">{formatCurrency(ctaCorriente)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-rose-500/5 to-rose-500/10 border-rose-500/20">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-rose-500/10">
                <Clock className="h-5 w-5 text-rose-600 dark:text-rose-400" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Boletas Pendientes</p>
                <p className="text-2xl font-bold text-foreground">{boletasPendientes}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Header Actions - Desktop */}
      <div className="hidden md:flex flex-row gap-4 justify-between mb-6">
        <div className="flex flex-row gap-3 flex-1">
          <div className="relative flex-1 max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por ID o cliente..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 bg-background"
            />
          </div>
          <Input
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            className="w-40 bg-background"
          />
          <Input
            type="date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            className="w-40 bg-background"
          />
          <select
            className="h-10 rounded-md border border-input bg-background px-3 text-sm text-foreground shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            value={invoiceFilter}
            onChange={(e) => setInvoiceFilter(e.target.value)}
          >
            <option value="all">Todas las boletas</option>
            <option value="emitted">Con boleta</option>
            <option value="pending">Sin boleta</option>
          </select>
          <select
            className="h-10 rounded-md border border-input bg-background px-3 text-sm text-foreground shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            value={paymentFilter}
            onChange={(e) => setPaymentFilter(e.target.value)}
          >
            <option value="all">Todos los pagos</option>
            <option value="cash">Efectivo</option>
            <option value="credit">Cuenta Corriente</option>
          </select>
        </div>
        <div className="flex gap-2">
          <Button
            variant={sourceFilter === 'direct' ? 'default' : 'outline'}
            onClick={() => setSourceFilter('direct')}
            className={sourceFilter === 'direct' ? '' : 'bg-transparent'}
          >
            Directas
          </Button>
          <Button
            variant={sourceFilter === 'order' ? 'default' : 'outline'}
            onClick={() => setSourceFilter('order')}
            className={sourceFilter === 'order' ? '' : 'bg-transparent'}
          >
            Pedidos
          </Button>
          <Button
            variant={sourceFilter === 'all' ? 'default' : 'outline'}
            onClick={() => setSourceFilter('all')}
            className={sourceFilter === 'all' ? '' : 'bg-transparent'}
          >
            Todas
          </Button>
          <Button
            variant="outline"
            className="bg-transparent"
            onClick={() => {
              const today = formatDateInput(new Date())
              setDateFrom(today)
              setDateTo(today)
            }}
          >
            <Calendar className="h-4 w-4 mr-2" />
            Hoy
          </Button>
          <Button asChild className="gap-2 shadow-sm">
            <Link href="/ventas/nueva">
              <Plus className="h-4 w-4" />
              Nueva Venta
            </Link>
          </Button>
        </div>
      </div>

      {/* Header Actions - Mobile */}
      <div className="flex md:hidden flex-col gap-3 mb-4">
        <div className="relative w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar venta..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 bg-background"
          />
        </div>
        <div className="grid grid-cols-2 gap-2">
          <Input
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            className="bg-background"
          />
          <Input
            type="date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            className="bg-background"
          />
        </div>
        <div className="grid grid-cols-2 gap-2">
          <select
            className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm text-foreground shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            value={invoiceFilter}
            onChange={(e) => setInvoiceFilter(e.target.value)}
          >
            <option value="all">Todas las boletas</option>
            <option value="emitted">Con boleta</option>
            <option value="pending">Sin boleta</option>
          </select>
          <select
            className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm text-foreground shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            value={paymentFilter}
            onChange={(e) => setPaymentFilter(e.target.value)}
          >
            <option value="all">Todos los pagos</option>
            <option value="cash">Efectivo</option>
            <option value="credit">Cuenta Corriente</option>
          </select>
        </div>
        <div className="flex gap-2">
          <Button
            variant={sourceFilter === 'direct' ? 'default' : 'outline'}
            onClick={() => setSourceFilter('direct')}
            size="sm"
            className={`flex-1 ${sourceFilter === 'direct' ? '' : 'bg-transparent'}`}
          >
            Directas
          </Button>
          <Button
            variant={sourceFilter === 'order' ? 'default' : 'outline'}
            onClick={() => setSourceFilter('order')}
            size="sm"
            className={`flex-1 ${sourceFilter === 'order' ? '' : 'bg-transparent'}`}
          >
            Pedidos
          </Button>
          <Button
            variant={sourceFilter === 'all' ? 'default' : 'outline'}
            onClick={() => setSourceFilter('all')}
            size="sm"
            className={`flex-1 ${sourceFilter === 'all' ? '' : 'bg-transparent'}`}
          >
            Todas
          </Button>
        </div>
      </div>

      {/* Loading State */}
      {loading ? (
        <>
          <div className="hidden md:block">
            <DataTableSkeleton columns={8} rows={5} />
          </div>
          <div className="md:hidden space-y-3 pb-20">
            {[1, 2, 3, 4, 5].map((i) => (
              <Card key={i} className="animate-pulse">
                <CardContent className="p-4">
                  <div className="h-5 bg-muted rounded w-2/3 mb-2" />
                  <div className="h-4 bg-muted rounded w-1/3 mb-3" />
                  <div className="h-4 bg-muted rounded w-1/2" />
                </CardContent>
              </Card>
            ))}
          </div>
        </>
      ) : (
        <>
          {/* Empty State */}
          {filteredSales.length === 0 ? (
            <Card className="border-dashed border-2">
              <CardContent className="flex flex-col items-center justify-center py-16">
                <div className="rounded-full bg-primary/10 p-4 mb-4">
                  <ShoppingBag className="h-10 w-10 text-primary" />
                </div>
                <h3 className="font-semibold text-xl mb-2 text-foreground">No se encontraron ventas</h3>
                <p className="text-muted-foreground text-sm text-center mb-6 max-w-sm">
                  {searchQuery || dateFrom || dateTo || invoiceFilter !== 'all' || paymentFilter !== 'all'
                    ? 'Intenta ajustar los filtros de busqueda para encontrar lo que buscas'
                    : 'Comienza registrando tu primera venta'}
                </p>
                {!searchQuery && !dateFrom && (
                  <Button asChild className="gap-2" size="lg">
                    <Link href="/ventas/nueva">
                      <Plus className="h-5 w-5" />
                      Nueva Venta
                    </Link>
                  </Button>
                )}
              </CardContent>
            </Card>
          ) : (
            <>
              {/* Desktop Table */}
              <div className="hidden md:block rounded-xl border border-border bg-card overflow-hidden shadow-sm">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-border bg-muted/50">
                        <th className="text-left p-4 font-semibold text-muted-foreground text-xs uppercase tracking-wider">
                          Fecha
                        </th>
                        <th className="text-left p-4 font-semibold text-muted-foreground text-xs uppercase tracking-wider">
                          Cliente
                        </th>
                        <th className="text-left p-4 font-semibold text-muted-foreground text-xs uppercase tracking-wider">
                          Vendedor
                        </th>
                        <th className="text-left p-4 font-semibold text-muted-foreground text-xs uppercase tracking-wider">
                          Productos
                        </th>
                        <th className="text-right p-4 font-semibold text-muted-foreground text-xs uppercase tracking-wider">
                          Total
                        </th>
                        <th className="text-center p-4 font-semibold text-muted-foreground text-xs uppercase tracking-wider">
                          Pago
                        </th>
                        <th className="text-center p-4 font-semibold text-muted-foreground text-xs uppercase tracking-wider">
                          Boleta
                        </th>
                        <th className="text-center p-4 font-semibold text-muted-foreground text-xs uppercase tracking-wider">
                          Acciones
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {filteredSales.map((sale) => (
                        <tr key={sale.id} className="hover:bg-muted/40 transition-colors group">
                          <td className="p-4">
                            <div className="flex flex-col gap-1">
                              <span className="text-sm font-medium text-foreground">
                                {formatDate(sale.createdAt)}
                              </span>
                              <span className="text-xs text-muted-foreground">
                                {formatDateTime(sale.createdAt).split(' ')[1]}
                              </span>
                            </div>
                          </td>
                          <td className="p-4">
                            <div className="flex flex-col gap-1">
                              <span className="font-medium text-foreground">
                                {sale.clientName || 'Cliente final'}
                              </span>
                              <span
                                className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium w-fit ${getSourceBadgeStyle(sale.source)}`}
                              >
                                {sale.source === 'order' ? 'Pedido' : 'Directa'}
                              </span>
                            </div>
                          </td>
                          <td className="p-4">
                            <span className="text-sm text-foreground">
                              {sale.sellerName || <span className="text-muted-foreground">Sin vendedor</span>}
                            </span>
                          </td>
                          <td className="p-4">
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                              <Package className="h-4 w-4" />
                              {sale.items.length} {sale.items.length === 1 ? 'producto' : 'productos'}
                            </div>
                          </td>
                          <td className="p-4 text-right">
                            <span className="font-bold text-foreground">{formatCurrency(sale.total)}</span>
                          </td>
                          <td className="p-4">
                            <div className="flex justify-center">
                              <span
                                className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${getPaymentBadgeStyle(sale.paymentType)}`}
                              >
                                {sale.paymentType === 'cash' ? (
                                  <>
                                    <Banknote className="h-3 w-3" />
                                    Efectivo
                                  </>
                                ) : (
                                  <>
                                    <CreditCard className="h-3 w-3" />
                                    Cta. Cte.
                                  </>
                                )}
                              </span>
                            </div>
                          </td>
                          <td className="p-4">
                            <div className="flex justify-center">
                              {sale.invoiceEmitted ? (
                                <span
                                  className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${getInvoiceBadgeStyle(true)}`}
                                >
                                  <CheckCircle className="h-3 w-3" />
                                  {sale.invoiceNumber}
                                </span>
                              ) : (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="h-7 text-xs bg-transparent"
                                  onClick={() => handleOpenEmitModal(sale)}
                                >
                                  <FileText className="h-3 w-3 mr-1" />
                                  Emitir
                                </Button>
                              )}
                            </div>
                          </td>
                          <td className="p-4">
                            <div className="flex justify-center gap-1">
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 hover:bg-primary/10 hover:text-primary"
                                onClick={() => handleViewDetail(sale)}
                              >
                                <Eye className="h-4 w-4" />
                                <span className="sr-only">Ver detalle</span>
                              </Button>
                              {!sale.remitoNumber && (
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8 hover:bg-purple-500/10 hover:text-purple-600"
                                  onClick={() => {
                                    setSaleToEmit(sale)
                                    setDocumentType('remito')
                                    setEmitModalOpen(true)
                                  }}
                                >
                                  <Truck className="h-4 w-4" />
                                  <span className="sr-only">Generar remito</span>
                                </Button>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Mobile Cards */}
              <div className="md:hidden space-y-3 pb-24">
                {filteredSales.map((sale) => (
                  <Card
                    key={sale.id}
                    className="overflow-hidden border-border/60 shadow-sm active:scale-[0.99] transition-transform"
                  >
                    <CardContent className="p-0">
                      {/* Card Header */}
                      <div className="p-4 border-b border-border/50 bg-muted/30">
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex items-center gap-3 min-w-0 flex-1">
                            <div className="h-11 w-11 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                              <ShoppingBag className="h-5 w-5 text-primary" />
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-2">
                                <h3 className="font-semibold text-foreground truncate text-base">
                                  {sale.clientName || 'Cliente final'}
                                </h3>
                              </div>
                              <p className="text-sm text-muted-foreground">{formatDateTime(sale.createdAt)}</p>
                            </div>
                          </div>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-9 w-9 shrink-0 -mr-2">
                                <MoreVertical className="h-5 w-5" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-48">
                              <DropdownMenuItem
                                onClick={() => handleViewDetail(sale)}
                                className="flex items-center gap-2"
                              >
                                <Eye className="h-4 w-4" />
                                Ver detalle
                              </DropdownMenuItem>
                              {!sale.invoiceEmitted && (
                                <DropdownMenuItem
                                  onClick={() => handleOpenEmitModal(sale)}
                                  className="flex items-center gap-2"
                                >
                                  <FileText className="h-4 w-4" />
                                  Emitir boleta
                                </DropdownMenuItem>
                              )}
                              {!sale.remitoNumber && (
                                <DropdownMenuItem
                                  onClick={() => {
                                    setSaleToEmit(sale)
                                    setDocumentType('remito')
                                    setEmitModalOpen(true)
                                  }}
                                  className="flex items-center gap-2"
                                >
                                  <Truck className="h-4 w-4" />
                                  Generar remito
                                </DropdownMenuItem>
                              )}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                        <div className="mt-3 flex flex-wrap gap-2">
                          <span
                            className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${getSourceBadgeStyle(sale.source)}`}
                          >
                            {sale.source === 'order' ? 'Pedido' : 'Directa'}
                          </span>
                          <span
                            className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium ${getPaymentBadgeStyle(sale.paymentType)}`}
                          >
                            {sale.paymentType === 'cash' ? (
                              <>
                                <Banknote className="h-3 w-3" />
                                Efectivo
                              </>
                            ) : (
                              <>
                                <CreditCard className="h-3 w-3" />
                                Cta. Cte.
                              </>
                            )}
                          </span>
                        </div>
                      </div>

                      {/* Card Body */}
                      <div className="p-4 space-y-4">
                        {/* Total */}
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-xs text-muted-foreground uppercase tracking-wide">Total</p>
                            <p className="font-bold text-2xl text-foreground">{formatCurrency(sale.total)}</p>
                          </div>
                          <div className="text-right">
                            <p className="text-xs text-muted-foreground uppercase tracking-wide">Productos</p>
                            <p className="font-semibold text-lg text-foreground flex items-center gap-1 justify-end">
                              <Package className="h-4 w-4" />
                              {sale.items.length}
                            </p>
                          </div>
                        </div>

                        {/* Info Grid */}
                        <div className="grid grid-cols-2 gap-3 text-sm">
                          {sale.sellerName && (
                            <div className="flex items-center gap-2 text-muted-foreground">
                              <User className="h-4 w-4 shrink-0" />
                              <span className="truncate">{sale.sellerName}</span>
                            </div>
                          )}
                          <div className="flex items-center gap-2">
                            {sale.invoiceEmitted ? (
                              <span
                                className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${getInvoiceBadgeStyle(true)}`}
                              >
                                <CheckCircle className="h-3 w-3" />
                                {sale.invoiceNumber}
                              </span>
                            ) : (
                              <span
                                className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${getInvoiceBadgeStyle(false)}`}
                              >
                                <Clock className="h-3 w-3" />
                                Sin boleta
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Quick Actions */}
                        <div className="flex gap-2 pt-1">
                          {!sale.invoiceEmitted && (
                            <Button
                              variant="outline"
                              className="flex-1 h-10 bg-transparent"
                              onClick={() => handleOpenEmitModal(sale)}
                            >
                              <FileText className="h-4 w-4 mr-2" />
                              Emitir
                            </Button>
                          )}
                          <Button className="flex-1 h-10" onClick={() => handleViewDetail(sale)}>
                            <Eye className="h-4 w-4 mr-2" />
                            Ver Detalle
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </>
          )}
        </>
      )}

      {/* FAB for Mobile */}
      <div className="md:hidden fixed bottom-6 right-6 z-50">
        <Button asChild className="h-14 w-14 rounded-full shadow-lg shadow-primary/25" size="icon">
          <Link href="/ventas/nueva">
            <Plus className="h-6 w-6" />
            <span className="sr-only">Nueva Venta</span>
          </Link>
        </Button>
      </div>

      {/* Detail Modal */}
      <Dialog open={detailModalOpen} onOpenChange={setDetailModalOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-3">
              {selectedSale && (
                <>
                  <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                    <ShoppingBag className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="font-semibold">Venta #{selectedSale.id.slice(-6)}</p>
                    <p className="text-sm font-normal text-muted-foreground">
                      {formatDateTime(selectedSale.createdAt)}
                    </p>
                  </div>
                </>
              )}
            </DialogTitle>
          </DialogHeader>

          {selectedSale && (
            <div className="space-y-4 pt-2">
              {/* Badges */}
              <div className="flex flex-wrap gap-2">
                <span
                  className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${getSourceBadgeStyle(selectedSale.source)}`}
                >
                  {selectedSale.source === 'order' ? 'Pedido' : 'Venta Directa'}
                </span>
                <span
                  className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium ${getPaymentBadgeStyle(selectedSale.paymentType)}`}
                >
                  {selectedSale.paymentType === 'cash' ? 'Efectivo' : 'Cuenta Corriente'}
                </span>
              </div>

              {/* Info */}
              <div className="space-y-2 text-sm">
                <div className="flex justify-between p-2 rounded-lg hover:bg-muted transition-colors">
                  <span className="text-muted-foreground">Cliente</span>
                  <span className="font-medium text-foreground">
                    {selectedSale.clientName || 'Cliente final'}
                  </span>
                </div>
                <div className="flex justify-between p-2 rounded-lg hover:bg-muted transition-colors">
                  <span className="text-muted-foreground">Vendedor</span>
                  <span className="font-medium text-foreground">
                    {selectedSale.sellerName || 'Sin vendedor'}
                  </span>
                </div>
                <div className="flex justify-between p-2 rounded-lg hover:bg-muted transition-colors">
                  <span className="text-muted-foreground">Boleta</span>
                  {selectedSale.invoiceEmitted ? (
                    <span className="text-emerald-600 dark:text-emerald-400 font-medium">
                      {selectedSale.invoiceNumber}
                    </span>
                  ) : (
                    <span className="text-muted-foreground">Pendiente</span>
                  )}
                </div>
                <div className="flex justify-between p-2 rounded-lg hover:bg-muted transition-colors">
                  <span className="text-muted-foreground">Remito</span>
                  {selectedSale.remitoNumber ? (
                    <span className="font-medium text-foreground">{selectedSale.remitoNumber}</span>
                  ) : (
                    <span className="text-muted-foreground">Sin remito</span>
                  )}
                </div>
              </div>

              {/* Documents Actions */}
              {(selectedSale.invoicePdfUrl || selectedSale.remitoPdfUrl) && (
                <div className="flex flex-wrap gap-2 pt-2">
                  {selectedSale.invoicePdfUrl && (
                    <>
                      <Button variant="outline" size="sm" asChild className="bg-transparent">
                        <a href={selectedSale.invoicePdfUrl} target="_blank" rel="noreferrer">
                          <Download className="h-4 w-4 mr-2" />
                          Ver Boleta
                        </a>
                      </Button>
                      {buildWhatsappUrl(
                        selectedSale.clientPhone,
                        selectedSale.invoicePdfUrl,
                        selectedSale.clientName
                      ) && (
                        <Button variant="outline" size="sm" asChild className="bg-transparent">
                          <a
                            href={
                              selectedSale.invoiceWhatsappUrl ??
                              buildWhatsappUrl(
                                selectedSale.clientPhone,
                                selectedSale.invoicePdfUrl,
                                selectedSale.clientName
                              ) ??
                              '#'
                            }
                            target="_blank"
                            rel="noreferrer"
                          >
                            <Send className="h-4 w-4 mr-2" />
                            Enviar Boleta
                          </a>
                        </Button>
                      )}
                    </>
                  )}
                  {selectedSale.remitoPdfUrl && (
                    <>
                      <Button variant="outline" size="sm" asChild className="bg-transparent">
                        <a href={selectedSale.remitoPdfUrl} target="_blank" rel="noreferrer">
                          <Truck className="h-4 w-4 mr-2" />
                          Ver Remito
                        </a>
                      </Button>
                      {buildWhatsappUrl(
                        selectedSale.clientPhone,
                        selectedSale.remitoPdfUrl,
                        selectedSale.clientName
                      ) && (
                        <Button variant="outline" size="sm" asChild className="bg-transparent">
                          <a
                            href={
                              buildWhatsappUrl(
                                selectedSale.clientPhone,
                                selectedSale.remitoPdfUrl,
                                selectedSale.clientName
                              ) ?? '#'
                            }
                            target="_blank"
                            rel="noreferrer"
                          >
                            <Send className="h-4 w-4 mr-2" />
                            Enviar Remito
                          </a>
                        </Button>
                      )}
                    </>
                  )}
                </div>
              )}

              {/* Products */}
              <div className="border-t border-border pt-4">
                <h4 className="font-medium text-foreground mb-3 flex items-center gap-2">
                  <Package className="h-4 w-4" />
                  Productos
                </h4>
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {selectedSale.items.map((item, index) => (
                    <div
                      key={index}
                      className="flex justify-between text-sm p-2 rounded-lg bg-muted/50"
                    >
                      <span className="text-foreground">
                        {item.name} <span className="text-muted-foreground">x{item.quantity}</span>
                      </span>
                      <span className="font-medium text-foreground">
                        {formatCurrency(item.price * item.quantity)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Total */}
              <div className="rounded-xl p-4 bg-primary/5 border border-primary/20">
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Total</span>
                  <span className="text-2xl font-bold text-foreground">
                    {formatCurrency(selectedSale.total)}
                  </span>
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-2 pt-2">
                {!selectedSale.invoiceEmitted && (
                  <Button
                    variant="outline"
                    className="flex-1 bg-transparent"
                    onClick={() => {
                      setDetailModalOpen(false)
                      handleOpenEmitModal(selectedSale)
                    }}
                  >
                    <FileText className="h-4 w-4 mr-2" />
                    Emitir Boleta
                  </Button>
                )}
                {!selectedSale.remitoNumber && (
                  <Button
                    variant="outline"
                    className="flex-1 bg-transparent"
                    onClick={() => {
                      setDetailModalOpen(false)
                      setSaleToEmit(selectedSale)
                      setDocumentType('remito')
                      setEmitModalOpen(true)
                    }}
                  >
                    <Truck className="h-4 w-4 mr-2" />
                    Generar Remito
                  </Button>
                )}
                <Button onClick={() => setDetailModalOpen(false)}>Cerrar</Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Emit Document Modal */}
      <Dialog open={emitModalOpen} onOpenChange={setEmitModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Emitir Comprobante</DialogTitle>
          </DialogHeader>

          {saleToEmit && (
            <div className="py-4">
              <div className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Venta</span>
                  <span className="font-mono text-foreground">#{saleToEmit.id.slice(-6)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Cliente</span>
                  <span className="text-foreground">{saleToEmit.clientName || 'Cliente final'}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Fecha</span>
                  <span className="text-foreground">{formatDateTime(saleToEmit.createdAt)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Productos</span>
                  <span className="text-foreground">{saleToEmit.items.length}</span>
                </div>
              </div>

              <div className="mt-4 p-4 bg-muted rounded-lg">
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Total</span>
                  <span className="text-xl font-bold text-foreground">
                    {formatCurrency(saleToEmit.total)}
                  </span>
                </div>
              </div>

              <div className="mt-4 space-y-3">
                <p className="text-sm text-muted-foreground">Selecciona que emitir:</p>
                <RadioGroup
                  value={documentType}
                  onValueChange={(value) => setDocumentType(value as 'invoice' | 'remito')}
                  className="space-y-2"
                >
                  <div className="flex items-center gap-2">
                    <RadioGroupItem value="invoice" id="emit-invoice" disabled={saleToEmit.invoiceEmitted} />
                    <Label htmlFor="emit-invoice" className={saleToEmit.invoiceEmitted ? 'text-muted-foreground' : ''}>
                      Boleta {saleToEmit.invoiceEmitted && '(Ya emitida)'}
                    </Label>
                  </div>
                  <div className="flex items-center gap-2">
                    <RadioGroupItem value="remito" id="emit-remito" disabled={!!saleToEmit.remitoNumber} />
                    <Label htmlFor="emit-remito" className={saleToEmit.remitoNumber ? 'text-muted-foreground' : ''}>
                      Remito {saleToEmit.remitoNumber && '(Ya generado)'}
                    </Label>
                  </div>
                </RadioGroup>
              </div>

              <p className="mt-4 text-sm text-muted-foreground">
                Se generara un {documentType === 'invoice' ? 'comprobante fiscal' : 'remito'} para esta venta.
              </p>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setEmitModalOpen(false)} className="bg-transparent">
              Cancelar
            </Button>
            <Button
              onClick={handleEmitDocument}
              disabled={
                emitting ||
                (documentType === 'invoice' && saleToEmit?.invoiceEmitted) ||
                (documentType === 'remito' && !!saleToEmit?.remitoNumber)
              }
            >
              {emitting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Emitiendo...
                </>
              ) : (
                <>
                  <FileText className="h-4 w-4 mr-2" />
                  {documentType === 'invoice' ? 'Emitir Boleta' : 'Generar Remito'}
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </MainLayout>
  )
}
