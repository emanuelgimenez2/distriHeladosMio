'use client'

import { useEffect, useState, useMemo } from 'react'
import { MainLayout } from '@/components/layout/main-layout'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { DataTableSkeleton } from '@/components/ui/data-table-skeleton'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Label } from '@/components/ui/label'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { remitoApi, salesApi, sellersApi } from '@/lib/api'
import type { Sale, Seller } from '@/lib/types'
import {
  Plus,
  Search,
  ShoppingBag,
  Banknote,
  CreditCard,
  FileText,
  Truck,
  Package,
  User,
  Loader2,
  Send,
  Download,
  AlertCircle,
  HelpCircle,
  Shuffle,
} from 'lucide-react'
import { toast } from 'sonner'
import Link from 'next/link'
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts'

interface SellerRanking {
  id: string
  name: string
  totalSold: number
  salesCount: number
  ticketPromedio: number
  percentOfTotal: number
  invoiceStatus: 'pending' | 'partial' | 'emitted'
  paidAmount: number
}

export default function VentasPage() {
  const [sales, setSales] = useState<Sale[]>([])
  const [sellers, setSellers] = useState<Seller[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [invoiceFilter, setInvoiceFilter] = useState<string>('all')
  const [paymentFilter, setPaymentFilter] = useState<string>('all')
  const [sellerFilter, setSellerFilter] = useState<string>('all')
  const [periodFilter, setPeriodFilter] = useState<string>('today')

  const [detailModalOpen, setDetailModalOpen] = useState(false)
  const [selectedSale, setSelectedSale] = useState<Sale | null>(null)

  const [emitModalOpen, setEmitModalOpen] = useState(false)
  const [saleToEmit, setSaleToEmit] = useState<Sale | null>(null)
  const [documentType, setDocumentType] = useState<'invoice' | 'remito'>('invoice')
  const [emitting, setEmitting] = useState(false)

  const [assignModalOpen, setAssignModalOpen] = useState(false)
  const [saleToAssign, setSaleToAssign] = useState<Sale | null>(null)
  const [selectedSellerId, setSelectedSellerId] = useState<string>('')
  const [assigning, setAssigning] = useState(false)

  const [bulkAssignModalOpen, setBulkAssignModalOpen] = useState(false)
  const [bulkSelectedSellerId, setBulkSelectedSellerId] = useState<string>('')
  const [bulkAssigning, setBulkAssigning] = useState(false)

  useEffect(() => {
    loadData()
  }, [])

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

  const loadData = async () => {
    try {
      const [salesData, sellersData] = await Promise.all([
        salesApi.getAll(),
        sellersApi.getAll(),
      ])
      setSales(salesData)
      setSellers(sellersData)
    } catch (error) {
      console.error('Error loading data:', error)
      toast.error('Error al cargar los datos')
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

  const fmt = (amount: number) =>
    new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', minimumFractionDigits: 0 }).format(amount)

  const fmtDate = (date: Date) =>
    new Intl.DateTimeFormat('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' }).format(new Date(date))

  const fmtDateTime = (date: Date) =>
    new Intl.DateTimeFormat('es-AR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date(date))

  const fmtTime = (date: Date) =>
    new Intl.DateTimeFormat('es-AR', { hour: '2-digit', minute: '2-digit' }).format(new Date(date))

  /* ── Handlers ── */

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
              ? { ...s, invoiceEmitted: true, invoiceNumber: result.invoiceNumber, invoicePdfUrl: result.pdfUrl, invoiceWhatsappUrl: result.whatsappUrl }
              : s,
          ),
        )
        toast.success('Boleta emitida correctamente')
      } else {
        const result = await remitoApi.createRemito(saleToEmit.id)
        setSales((prev) =>
          prev.map((s) =>
            s.id === saleToEmit.id
              ? { ...s, remitoNumber: result.remitoNumber, remitoPdfUrl: result.pdfUrl }
              : s,
          ),
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

  const handleEmitAllPending = async () => {
    const pending = filteredSales.filter((s) => !s.invoiceEmitted)
    if (pending.length === 0) { toast.info('No hay boletas pendientes'); return }
    toast.info(`Emitiendo ${pending.length} boletas...`)
    let ok = 0
    for (const sale of pending) {
      try {
        const r = await salesApi.emitInvoice(sale.id, { name: sale.clientName, phone: sale.clientPhone })
        setSales((prev) =>
          prev.map((s) =>
            s.id === sale.id ? { ...s, invoiceEmitted: true, invoiceNumber: r.invoiceNumber, invoicePdfUrl: r.pdfUrl, invoiceWhatsappUrl: r.whatsappUrl } : s,
          ),
        )
        ok++
      } catch (e) { console.error(e) }
    }
    if (ok > 0) toast.success(`${ok} boletas emitidas`)
  }

  const handleOpenAssignModal = (sale: Sale) => {
    setSaleToAssign(sale)
    setSelectedSellerId('')
    setAssignModalOpen(true)
  }

  const handleAssignSeller = async () => {
    if (!saleToAssign || !selectedSellerId) return
    setAssigning(true)
    try {
      const seller = sellers.find((s) => s.id === selectedSellerId)
      if (!seller) throw new Error('Vendedor no encontrado')
      await salesApi.update(saleToAssign.id, { sellerId: selectedSellerId, sellerName: seller.name })
      setSales((prev) =>
        prev.map((s) => (s.id === saleToAssign.id ? { ...s, sellerId: selectedSellerId, sellerName: seller.name } : s)),
      )
      toast.success(`Venta asignada a ${seller.name}`)
      setAssignModalOpen(false)
      setSaleToAssign(null)
      setSelectedSellerId('')
    } catch (error) {
      console.error(error)
      toast.error('Error al asignar vendedor')
    } finally {
      setAssigning(false)
    }
  }

  const handleBulkAssignSeller = async () => {
    if (!bulkSelectedSellerId) return
    setBulkAssigning(true)
    try {
      const seller = sellers.find((s) => s.id === bulkSelectedSellerId)
      if (!seller) throw new Error('Vendedor no encontrado')
      const targets = ventasSinVendedor
      let ok = 0
      for (const sale of targets) {
        try {
          await salesApi.update(sale.id, { sellerId: bulkSelectedSellerId, sellerName: seller.name })
          ok++
        } catch (e) { console.error(e) }
      }
      if (ok > 0) {
        setSales((prev) =>
          prev.map((s) =>
            targets.some((t) => t.id === s.id)
              ? { ...s, sellerId: bulkSelectedSellerId, sellerName: seller.name }
              : s,
          ),
        )
        toast.success(`${ok} ventas asignadas a ${seller.name}`)
      }
      setBulkAssignModalOpen(false)
      setBulkSelectedSellerId('')
    } catch (error) {
      console.error(error)
      toast.error('Error al asignar vendedor')
    } finally {
      setBulkAssigning(false)
    }
  }

  const handleEmitSellerInvoices = async (sellerId: string) => {
    const sellerSales = filteredSales.filter((s) => s.sellerId === sellerId && !s.invoiceEmitted)
    if (sellerSales.length === 0) { toast.info('No hay boletas pendientes para este vendedor'); return }
    toast.info(`Emitiendo ${sellerSales.length} boletas...`)
    let ok = 0
    for (const sale of sellerSales) {
      try {
        const r = await salesApi.emitInvoice(sale.id, { name: sale.clientName, phone: sale.clientPhone })
        setSales((prev) =>
          prev.map((s) =>
            s.id === sale.id ? { ...s, invoiceEmitted: true, invoiceNumber: r.invoiceNumber, invoicePdfUrl: r.pdfUrl, invoiceWhatsappUrl: r.whatsappUrl } : s,
          ),
        )
        ok++
      } catch (e) { console.error(e) }
    }
    if (ok > 0) toast.success(`${ok} boletas emitidas`)
  }

  const buildWhatsappUrl = (phone?: string, pdfUrl?: string, clientName?: string) => {
    if (!phone || !pdfUrl) return null
    const clean = phone.replace(/[^\d]/g, '')
    if (!clean) return null
    const msg = `Hola${clientName ? ` ${clientName}` : ''}, tu comprobante esta listo: ${pdfUrl}`
    return `https://wa.me/${clean}?text=${encodeURIComponent(msg)}`
  }

  /* ── Filtering ── */

  const getDateRangeFromPeriod = (period: string) => {
    const today = new Date()
    const todayStr = formatDateInput(today)
    switch (period) {
      case 'today': return { from: todayStr, to: todayStr }
      case 'week': { const d = new Date(today); d.setDate(d.getDate() - 7); return { from: formatDateInput(d), to: todayStr } }
      case 'month': { const d = new Date(today); d.setMonth(d.getMonth() - 1); return { from: formatDateInput(d), to: todayStr } }
      default: return { from: todayStr, to: todayStr }
    }
  }

  const filteredSales = useMemo(() => {
    const { from, to } = getDateRangeFromPeriod(periodFilter)
    return sales
      .filter((sale) => {
        const q = searchQuery.toLowerCase()
        const matchSearch = sale.id.toLowerCase().includes(q) || (sale.clientName?.toLowerCase().includes(q) ?? false) || (sale.sellerName?.toLowerCase().includes(q) ?? false)
        const matchInvoice = invoiceFilter === 'all' || (invoiceFilter === 'emitted' && sale.invoiceEmitted) || (invoiceFilter === 'pending' && !sale.invoiceEmitted)
        const matchPayment = paymentFilter === 'all' || sale.paymentType === paymentFilter
        const matchSeller = sellerFilter === 'all' || sale.sellerId === sellerFilter
        const value = new Date(sale.createdAt)
        const start = from ? new Date(`${from}T00:00:00`) : null
        const end = to ? new Date(`${to}T23:59:59`) : null
        const matchDate = (!start || value >= start) && (!end || value <= end)
        return matchSearch && matchInvoice && matchPayment && matchSeller && matchDate
      })
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sales, searchQuery, invoiceFilter, paymentFilter, sellerFilter, periodFilter])

  /* ── Stats ── */

  const totalVentas = filteredSales.reduce((s, v) => s + v.total, 0)
  const efectivo = filteredSales.filter((s) => s.paymentType === 'cash').reduce((a, v) => a + v.total, 0)
  const ctaCorriente = filteredSales.filter((s) => s.paymentType === 'credit').reduce((a, v) => a + v.total, 0)
  const mixto = filteredSales.filter((s) => (s.paymentType as string) === 'mixed').reduce((a, v) => a + v.total, 0)
  const boletasPendientes = filteredSales.filter((s) => !s.invoiceEmitted)
  const ventasSinVendedor = filteredSales.filter((s) => !s.sellerId)
  const ventasCount = filteredSales.length
  const ctaPct = totalVentas > 0 ? Math.round((ctaCorriente / totalVentas) * 100) : 0

  const chartData = [
    { name: 'Efectivo', value: efectivo, color: '#10B981' },
    { name: 'Cta. Corriente', value: ctaCorriente, color: '#F59E0B' },
    ...(mixto > 0 ? [{ name: 'Mixto', value: mixto, color: '#8B5CF6' }] : []),
  ]

  const sellerRanking: SellerRanking[] = useMemo(() => {
    const map = new Map<string, { name: string; totalSold: number; salesCount: number; pendingInvoices: number; emittedInvoices: number; paidAmount: number }>()
    filteredSales.forEach((sale) => {
      const sid = sale.sellerId || 'sin-vendedor'
      const sname = sale.sellerName || 'Sin vendedor'
      if (!map.has(sid)) map.set(sid, { name: sname, totalSold: 0, salesCount: 0, pendingInvoices: 0, emittedInvoices: 0, paidAmount: 0 })
      const st = map.get(sid)!
      st.totalSold += sale.total
      st.salesCount += 1
      if (sale.invoiceEmitted) st.emittedInvoices += 1
      else st.pendingInvoices += 1
      if (sale.paymentType === 'cash') st.paidAmount += sale.total
    })
    return Array.from(map.entries())
      .filter(([id]) => id !== 'sin-vendedor')
      .map(([id, st]) => ({
        id,
        name: st.name,
        totalSold: st.totalSold,
        salesCount: st.salesCount,
        ticketPromedio: st.salesCount > 0 ? st.totalSold / st.salesCount : 0,
        percentOfTotal: totalVentas > 0 ? (st.totalSold / totalVentas) * 100 : 0,
        invoiceStatus: (st.pendingInvoices > 0 ? (st.emittedInvoices > 0 ? 'partial' : 'pending') : 'emitted') as 'pending' | 'partial' | 'emitted',
        paidAmount: st.paidAmount,
      }))
      .sort((a, b) => b.totalSold - a.totalSold)
  }, [filteredSales, totalVentas])

  const ventasSinVendedorTotal = ventasSinVendedor.reduce((s, v) => s + v.total, 0)

  /* ── Payment helpers ── */

  const payLabel = (pt: string) => {
    if (pt === 'cash') return 'Contado'
    if (pt === 'credit') return 'Cuenta Corriente'
    if (pt === 'mixed') return 'Mixta'
    return pt
  }

  const payBadgeCls = (pt: string) => {
    if (pt === 'cash') return 'bg-emerald-50 text-emerald-700 border-emerald-300 dark:bg-emerald-900/20 dark:text-emerald-400 dark:border-emerald-700'
    if (pt === 'credit') return 'bg-amber-50 text-amber-700 border-amber-300 dark:bg-amber-900/20 dark:text-amber-400 dark:border-amber-700'
    if (pt === 'mixed') return 'bg-violet-50 text-violet-700 border-violet-300 dark:bg-violet-900/20 dark:text-violet-400 dark:border-violet-700'
    return ''
  }

  const CustomTooltip = ({ active, payload }: { active?: boolean; payload?: Array<{ name: string; value: number; payload: { name: string; value: number; color: string } }> }) => {
    if (active && payload?.[0]) {
      const d = payload[0]
      return (
        <div className="rounded-lg border border-border bg-card p-3 shadow-lg">
          <p className="font-medium text-foreground">{d.payload.name}</p>
          <p className="text-sm text-muted-foreground">{fmt(d.value)}</p>
          <p className="text-sm text-muted-foreground">{totalVentas > 0 ? ((d.value / totalVentas) * 100).toFixed(1) : 0}%</p>
        </div>
      )
    }
    return null
  }

  /* ── RENDER ── */

  return (
    <MainLayout title="Ventas" description="Resumen y gestion de ventas">
      {loading ? (
        <DataTableSkeleton columns={6} rows={5} />
      ) : (
        <div className="space-y-3 sm:space-y-4">

          {/* ═══ ROW 1: Ingresos + Boletas ═══ */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 sm:gap-4">

            {/* Ingresos del Dia */}
            <Card className="md:col-span-2">
              <CardHeader className="pb-2 px-3 sm:px-6 pt-3 sm:pt-6">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm sm:text-base font-semibold">Ingresos del Dia</CardTitle>
                  <HelpCircle className="h-4 w-4 text-muted-foreground" />
                </div>
              </CardHeader>
              <CardContent className="px-3 sm:px-6 pb-3 sm:pb-6">
                <div className="flex flex-col sm:flex-row items-center gap-3 sm:gap-4">

                  {/* Donut */}
                  <div className="relative w-28 h-28 sm:w-32 sm:h-32 shrink-0">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie data={chartData} cx="50%" cy="50%" innerRadius={35} outerRadius={50} paddingAngle={2} dataKey="value">
                          {chartData.map((e, i) => (
                            <Cell key={i} fill={e.color} />
                          ))}
                        </Pie>
                        <Tooltip content={<CustomTooltip />} />
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                      <span className="text-lg sm:text-xl font-bold text-foreground">{ctaPct}%</span>
                      <span className="text-[10px] sm:text-xs text-muted-foreground">Cta Cte</span>
                    </div>
                  </div>

                  {/* KPIs grid */}
                  <div className="grid grid-cols-2 gap-x-4 gap-y-2 sm:gap-y-3 flex-1 w-full min-w-0">
                    <div>
                      <div className="flex items-center gap-1.5 mb-0.5">
                        <Banknote className="h-3.5 w-3.5 text-emerald-600" />
                        <span className="text-[11px] sm:text-xs text-muted-foreground">Efectivo</span>
                      </div>
                      <p className="text-base sm:text-lg font-bold text-foreground truncate">{fmt(efectivo)}</p>
                    </div>
                    <div>
                      <div className="flex items-center gap-1.5 mb-0.5">
                        <CreditCard className="h-3.5 w-3.5 text-amber-600" />
                        <span className="text-[11px] sm:text-xs text-muted-foreground">Cuenta Cte</span>
                      </div>
                      <p className="text-base sm:text-lg font-bold text-foreground truncate">{fmt(ctaCorriente)}</p>
                    </div>
                    <div className="border-t border-border pt-2 col-span-2 grid grid-cols-2 gap-x-4">
                      <div>
                        <span className="text-[11px] sm:text-xs text-muted-foreground">Total Vendido</span>
                        <p className="text-sm sm:text-base font-bold text-foreground truncate">{fmt(totalVentas)}</p>
                      </div>
                      <div>
                        <span className="text-[11px] sm:text-xs text-muted-foreground">Ventas</span>
                        <p className="text-sm sm:text-base font-bold text-foreground">{ventasCount}</p>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Boletas Pendientes */}
            <Card className="border-amber-200 dark:border-amber-800 bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-950/20 dark:to-orange-950/20">
              <CardHeader className="pb-2 px-3 sm:px-6 pt-3 sm:pt-6">
                <CardTitle className="text-sm sm:text-base font-semibold flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 text-red-500" />
                  Boletas pendientes
                </CardTitle>
              </CardHeader>
              <CardContent className="px-3 sm:px-6 pb-3 sm:pb-6 space-y-3">
                <div>
                  <p className="text-2xl sm:text-3xl font-bold text-foreground">{fmt(boletasPendientes.reduce((s, v) => s + v.total, 0))}</p>
                  <p className="text-[11px] sm:text-xs text-muted-foreground">
                    {boletasPendientes.length} pendiente{boletasPendientes.length !== 1 ? 's' : ''} de emision
                  </p>
                </div>
                <Button
                  className="w-full bg-red-500 hover:bg-red-600 text-white text-xs sm:text-sm"
                  size="sm"
                  onClick={handleEmitAllPending}
                  disabled={boletasPendientes.length === 0}
                >
                  Emitir boletas ahora
                </Button>
              </CardContent>
            </Card>
          </div>

          {/* ═══ Ventas sin vendedor alert ═══ */}
          {ventasSinVendedor.length > 0 && (
            <Card className="border-sky-200 dark:border-sky-800 bg-sky-50/50 dark:bg-sky-950/20">
              <CardContent className="p-3 sm:p-4">
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="p-1.5 rounded-md bg-sky-100 dark:bg-sky-900/30 shrink-0">
                      <User className="h-4 w-4 text-sky-600 dark:text-sky-400" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs sm:text-sm font-medium text-foreground">{ventasSinVendedor.length} ventas sin vendedor</p>
                      <p className="text-[11px] sm:text-xs text-muted-foreground truncate">{fmt(ventasSinVendedorTotal)}</p>
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    className="bg-transparent border-sky-300 text-sky-700 hover:bg-sky-100 dark:border-sky-700 dark:text-sky-400 text-xs shrink-0"
                    onClick={() => setBulkAssignModalOpen(true)}
                  >
                    Asignar vendedor
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* ═══ ROW 2: Ranking de Vendedores ═══ */}
          <Card>
            <CardHeader className="pb-2 px-3 sm:px-6 pt-3 sm:pt-6">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <CardTitle className="text-sm sm:text-base font-semibold">Ranking de Vendedores</CardTitle>
                <div className="flex flex-wrap gap-1.5">
                  <Select value={sellerFilter} onValueChange={setSellerFilter}>
                    <SelectTrigger className="h-7 sm:h-8 w-auto min-w-[90px] text-[11px] sm:text-xs px-2">
                      <SelectValue placeholder="Vendedor" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos</SelectItem>
                      {sellers.map((s) => (
                        <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Select value={invoiceFilter} onValueChange={setInvoiceFilter}>
                    <SelectTrigger className="h-7 sm:h-8 w-auto min-w-[100px] text-[11px] sm:text-xs px-2">
                      <SelectValue placeholder="Estado" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Estado boleta</SelectItem>
                      <SelectItem value="emitted">Emitida</SelectItem>
                      <SelectItem value="pending">Pendiente</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select value={periodFilter} onValueChange={setPeriodFilter}>
                    <SelectTrigger className="h-7 sm:h-8 w-auto min-w-[90px] text-[11px] sm:text-xs px-2">
                      <SelectValue placeholder="Periodo" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="today">Hoy</SelectItem>
                      <SelectItem value="week">Esta semana</SelectItem>
                      <SelectItem value="month">Este mes</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardHeader>
            <CardContent className="px-0 pb-0 sm:px-0 sm:pb-0">
              {sellerRanking.length === 0 ? (
                <div className="p-6 text-center text-muted-foreground text-xs sm:text-sm">
                  No hay ventas con vendedor asignado
                </div>
              ) : (
                <>
                  {/* Desktop table - hidden on mobile */}
                  <div className="hidden sm:block overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-border bg-muted/30">
                          <th className="text-left p-2.5 sm:p-3 font-semibold text-muted-foreground text-[11px] uppercase tracking-wider">Vendedor</th>
                          <th className="text-right p-2.5 sm:p-3 font-semibold text-muted-foreground text-[11px] uppercase tracking-wider">Total</th>
                          <th className="text-center p-2.5 sm:p-3 font-semibold text-muted-foreground text-[11px] uppercase tracking-wider">Ventas</th>
                          <th className="text-right p-2.5 sm:p-3 font-semibold text-muted-foreground text-[11px] uppercase tracking-wider hidden md:table-cell">Ticket Prom.</th>
                          <th className="text-center p-2.5 sm:p-3 font-semibold text-muted-foreground text-[11px] uppercase tracking-wider hidden lg:table-cell">% Total</th>
                          <th className="text-right p-2.5 sm:p-3 font-semibold text-muted-foreground text-[11px] uppercase tracking-wider">Pago</th>
                          <th className="text-center p-2.5 sm:p-3 font-semibold text-muted-foreground text-[11px] uppercase tracking-wider">Estado</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border">
                        {sellerRanking.map((seller, idx) => (
                          <tr key={seller.id} className="hover:bg-muted/40 transition-colors">
                            <td className="p-2.5 sm:p-3">
                              <div className="flex items-center gap-2">
                                <span className="text-sm font-bold text-muted-foreground w-5">{idx + 1}</span>
                                <Avatar className="h-7 w-7 sm:h-8 sm:w-8">
                                  <AvatarFallback className="bg-primary/10 text-primary text-xs">{seller.name.charAt(0).toUpperCase()}</AvatarFallback>
                                </Avatar>
                                <span className="text-xs sm:text-sm font-medium text-foreground truncate max-w-[100px] sm:max-w-none">{seller.name}</span>
                              </div>
                            </td>
                            <td className="p-2.5 sm:p-3 text-right">
                              <span className="font-bold text-foreground text-xs sm:text-sm">{fmt(seller.totalSold)}</span>
                            </td>
                            <td className="p-2.5 sm:p-3 text-center">
                              <span className="font-medium text-foreground text-xs sm:text-sm">{seller.salesCount}</span>
                            </td>
                            <td className="p-2.5 sm:p-3 text-right hidden md:table-cell">
                              <span className="text-foreground text-xs sm:text-sm">{fmt(seller.ticketPromedio)}</span>
                            </td>
                            <td className="p-2.5 sm:p-3 hidden lg:table-cell">
                              <div className="flex items-center gap-2">
                                <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
                                  <div className={`h-full rounded-full ${idx === 0 ? 'bg-emerald-500' : 'bg-primary'}`} style={{ width: `${Math.min(seller.percentOfTotal, 100)}%` }} />
                                </div>
                                <span className="text-[11px] text-muted-foreground w-10 text-right">{seller.percentOfTotal.toFixed(0)}%</span>
                              </div>
                            </td>
                            <td className="p-2.5 sm:p-3 text-right">
                              <span className="font-medium text-foreground text-xs sm:text-sm">{fmt(seller.paidAmount)}</span>
                            </td>
                            <td className="p-2.5 sm:p-3 text-center">
                              {seller.invoiceStatus === 'emitted' ? (
                                <Badge variant="outline" className="bg-emerald-50 text-emerald-600 border-emerald-300 dark:bg-emerald-900/20 dark:text-emerald-400 dark:border-emerald-700 text-[10px] sm:text-xs">
                                  Emitida
                                </Badge>
                              ) : (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="h-6 text-[10px] sm:text-xs bg-sky-50 text-sky-600 border-sky-300 hover:bg-sky-100 dark:bg-sky-900/20 dark:text-sky-400 dark:border-sky-700 px-2"
                                  onClick={() => handleEmitSellerInvoices(seller.id)}
                                >
                                  Emitir
                                </Button>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Mobile cards - visible only on small screens */}
                  <div className="sm:hidden divide-y divide-border">
                    {sellerRanking.map((seller, idx) => (
                      <div key={seller.id} className="p-3 flex items-start gap-2.5">
                        <span className="text-sm font-bold text-muted-foreground mt-0.5 w-4 shrink-0">{idx + 1}</span>
                        <Avatar className="h-7 w-7 shrink-0">
                          <AvatarFallback className="bg-primary/10 text-primary text-xs">{seller.name.charAt(0).toUpperCase()}</AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-2">
                            <p className="text-xs font-medium text-foreground truncate">{seller.name}</p>
                            {seller.invoiceStatus === 'emitted' ? (
                              <Badge variant="outline" className="bg-emerald-50 text-emerald-600 border-emerald-300 dark:bg-emerald-900/20 dark:text-emerald-400 dark:border-emerald-700 text-[10px] shrink-0">Emitida</Badge>
                            ) : (
                              <Button
                                variant="outline"
                                size="sm"
                                className="h-5 text-[10px] bg-sky-50 text-sky-600 border-sky-300 hover:bg-sky-100 dark:bg-sky-900/20 dark:text-sky-400 dark:border-sky-700 px-1.5 shrink-0"
                                onClick={() => handleEmitSellerInvoices(seller.id)}
                              >
                                Emitir
                              </Button>
                            )}
                          </div>
                          <div className="flex items-center gap-3 mt-1 text-[11px] text-muted-foreground">
                            <span><span className="font-semibold text-foreground">{fmt(seller.totalSold)}</span></span>
                            <span>{seller.salesCount} ventas</span>
                            <span>{seller.percentOfTotal.toFixed(0)}%</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          {/* ═══ ROW 3: Historial de Ventas ═══ */}
          <Card>
            <CardHeader className="pb-2 px-3 sm:px-6 pt-3 sm:pt-6">
              <div className="flex items-center justify-between gap-2">
                <CardTitle className="text-sm sm:text-base font-semibold">Historial de Ventas</CardTitle>
                <Button size="sm" className="h-7 sm:h-8 text-[11px] sm:text-xs gap-1" asChild>
                  <Link href="/ventas/nueva">
                    <Plus className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
                    <span className="hidden xs:inline">Nueva</span>
                  </Link>
                </Button>
              </div>
            </CardHeader>
            <CardContent className="px-0 pb-0 sm:px-0 sm:pb-0">
              {/* Filters */}
              <div className="px-3 sm:px-6 pb-3 flex flex-col gap-2">
                <div className="relative w-full">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                  <Input
                    placeholder="Buscar por ID o cliente..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-8 h-7 sm:h-8 text-xs sm:text-sm bg-background"
                  />
                </div>
                <div className="flex gap-1.5 flex-wrap">
                  <Select value={invoiceFilter} onValueChange={setInvoiceFilter}>
                    <SelectTrigger className="h-7 sm:h-8 w-auto min-w-[80px] text-[11px] sm:text-xs px-2">
                      <SelectValue placeholder="Estado" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todas</SelectItem>
                      <SelectItem value="emitted">Emitidas</SelectItem>
                      <SelectItem value="pending">Pendientes</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select value={paymentFilter} onValueChange={setPaymentFilter}>
                    <SelectTrigger className="h-7 sm:h-8 w-auto min-w-[80px] text-[11px] sm:text-xs px-2">
                      <SelectValue placeholder="Pago" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos</SelectItem>
                      <SelectItem value="cash">Contado</SelectItem>
                      <SelectItem value="credit">Cuenta Corriente</SelectItem>
                      <SelectItem value="mixed">Mixta</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {filteredSales.length === 0 ? (
                <div className="p-6 sm:p-8 text-center">
                  <ShoppingBag className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                  <p className="text-muted-foreground text-xs sm:text-sm">No se encontraron ventas</p>
                </div>
              ) : (
                <>
                  {/* Desktop table */}
                  <div className="hidden sm:block overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-y border-border bg-muted/30">
                          <th className="text-left p-2.5 sm:p-3 font-semibold text-muted-foreground text-[11px] uppercase tracking-wider">Fecha</th>
                          <th className="text-left p-2.5 sm:p-3 font-semibold text-muted-foreground text-[11px] uppercase tracking-wider">Cliente</th>
                          <th className="text-left p-2.5 sm:p-3 font-semibold text-muted-foreground text-[11px] uppercase tracking-wider hidden md:table-cell">Vendedor</th>
                          <th className="text-left p-2.5 sm:p-3 font-semibold text-muted-foreground text-[11px] uppercase tracking-wider hidden lg:table-cell">Productos</th>
                          <th className="text-right p-2.5 sm:p-3 font-semibold text-muted-foreground text-[11px] uppercase tracking-wider">Total</th>
                          <th className="text-center p-2.5 sm:p-3 font-semibold text-muted-foreground text-[11px] uppercase tracking-wider">Pago</th>
                          <th className="text-center p-2.5 sm:p-3 font-semibold text-muted-foreground text-[11px] uppercase tracking-wider">Estado</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border">
                        {filteredSales.slice(0, 20).map((sale) => (
                          <tr key={sale.id} className="hover:bg-muted/40 transition-colors cursor-pointer" onClick={() => handleViewDetail(sale)}>
                            <td className="p-2.5 sm:p-3">
                              <span className="text-xs sm:text-sm text-foreground">{fmtDate(sale.createdAt)}</span>
                              <span className="block text-[10px] sm:text-xs text-muted-foreground">{fmtTime(sale.createdAt)}</span>
                            </td>
                            <td className="p-2.5 sm:p-3">
                              <div className="flex items-center gap-1.5">
                                <Avatar className="h-6 w-6 sm:h-7 sm:w-7 shrink-0">
                                  <AvatarFallback className="bg-muted text-muted-foreground text-[10px]">
                                    <User className="h-3 w-3" />
                                  </AvatarFallback>
                                </Avatar>
                                <span className="text-xs sm:text-sm font-medium text-foreground truncate max-w-[80px] md:max-w-[120px] lg:max-w-none">{sale.clientName || 'Venta directa'}</span>
                              </div>
                            </td>
                            <td className="p-2.5 sm:p-3 hidden md:table-cell">
                              {sale.sellerName ? (
                                <span className="text-xs sm:text-sm text-foreground">{sale.sellerName}</span>
                              ) : (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-5 text-[10px] sm:text-xs text-sky-600 hover:text-sky-700 hover:bg-sky-50 p-1"
                                  onClick={(e) => { e.stopPropagation(); handleOpenAssignModal(sale) }}
                                >
                                  + Asignar
                                </Button>
                              )}
                            </td>
                            <td className="p-2.5 sm:p-3 hidden lg:table-cell">
                              <span className="text-xs text-muted-foreground flex items-center gap-1">
                                <Package className="h-3 w-3" />
                                {sale.items.length} productos
                              </span>
                            </td>
                            <td className="p-2.5 sm:p-3 text-right">
                              <span className="font-bold text-foreground text-xs sm:text-sm">{fmt(sale.total)}</span>
                            </td>
                            <td className="p-2.5 sm:p-3 text-center">
                              <Badge variant="outline" className={`text-[10px] sm:text-xs ${payBadgeCls(sale.paymentType)}`}>
                                {payLabel(sale.paymentType)}
                              </Badge>
                            </td>
                            <td className="p-2.5 sm:p-3 text-center">
                              {sale.invoiceEmitted ? (
                                <Badge variant="outline" className="bg-emerald-50 text-emerald-600 border-emerald-300 dark:bg-emerald-900/20 dark:text-emerald-400 dark:border-emerald-700 text-[10px] sm:text-xs">Emitida</Badge>
                              ) : (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="h-5 sm:h-6 text-[10px] sm:text-xs bg-sky-50 text-sky-600 border-sky-300 hover:bg-sky-100 dark:bg-sky-900/20 dark:text-sky-400 dark:border-sky-700 px-1.5 sm:px-2"
                                  onClick={(e) => { e.stopPropagation(); handleOpenEmitModal(sale) }}
                                >
                                  Emitir
                                </Button>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Mobile card list */}
                  <div className="sm:hidden divide-y divide-border">
                    {filteredSales.slice(0, 20).map((sale) => (
                      <button
                        type="button"
                        key={sale.id}
                        className="w-full text-left p-3 hover:bg-muted/40 transition-colors"
                        onClick={() => handleViewDetail(sale)}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-1.5">
                              <Avatar className="h-5 w-5 shrink-0">
                                <AvatarFallback className="bg-muted text-muted-foreground text-[9px]">
                                  <User className="h-2.5 w-2.5" />
                                </AvatarFallback>
                              </Avatar>
                              <p className="text-xs font-medium text-foreground truncate">{sale.clientName || 'Venta directa'}</p>
                            </div>
                            <div className="flex items-center gap-2 mt-1 flex-wrap">
                              <span className="text-[10px] text-muted-foreground">{fmtDate(sale.createdAt)} {fmtTime(sale.createdAt)}</span>
                              {sale.sellerName && <span className="text-[10px] text-muted-foreground">- {sale.sellerName}</span>}
                            </div>
                            <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                              <Badge variant="outline" className={`text-[9px] px-1 py-0 ${payBadgeCls(sale.paymentType)}`}>
                                {payLabel(sale.paymentType)}
                              </Badge>
                              {sale.invoiceEmitted ? (
                                <Badge variant="outline" className="bg-emerald-50 text-emerald-600 border-emerald-300 text-[9px] px-1 py-0">Emitida</Badge>
                              ) : (
                                <Badge variant="outline" className="bg-sky-50 text-sky-600 border-sky-300 text-[9px] px-1 py-0">Pendiente</Badge>
                              )}
                              <span className="text-[10px] text-muted-foreground">{sale.items.length} prod.</span>
                            </div>
                          </div>
                          <div className="text-right shrink-0">
                            <p className="text-xs font-bold text-foreground">{fmt(sale.total)}</p>
                            {!sale.invoiceEmitted && (
                              <Button
                                variant="outline"
                                size="sm"
                                className="h-5 text-[10px] bg-sky-50 text-sky-600 border-sky-300 hover:bg-sky-100 px-1.5 mt-1"
                                onClick={(e) => { e.stopPropagation(); handleOpenEmitModal(sale) }}
                              >
                                Emitir
                              </Button>
                            )}
                            {!sale.sellerId && (
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-5 text-[10px] text-sky-600 px-1 mt-0.5"
                                onClick={(e) => { e.stopPropagation(); handleOpenAssignModal(sale) }}
                              >
                                + Asignar
                              </Button>
                            )}
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* FAB Mobile */}
      <div className="sm:hidden fixed bottom-4 right-4 z-50">
        <Button asChild className="h-12 w-12 rounded-full shadow-lg" size="icon">
          <Link href="/ventas/nueva">
            <Plus className="h-5 w-5" />
            <span className="sr-only">Nueva Venta</span>
          </Link>
        </Button>
      </div>

      {/* ═══ MODALS ═══ */}

      {/* Detail Modal */}
      <Dialog open={detailModalOpen} onOpenChange={setDetailModalOpen}>
        <DialogContent className="max-w-[calc(100vw-2rem)] sm:max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2.5">
              {selectedSale && (
                <>
                  <div className="h-8 w-8 sm:h-9 sm:w-9 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                    <ShoppingBag className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm sm:text-base font-semibold truncate">Venta #{selectedSale.id.slice(-6)}</p>
                    <p className="text-[11px] sm:text-xs font-normal text-muted-foreground">{fmtDateTime(selectedSale.createdAt)}</p>
                  </div>
                </>
              )}
            </DialogTitle>
          </DialogHeader>

          {selectedSale && (
            <div className="space-y-3 pt-1">
              <div className="flex flex-wrap gap-1.5">
                <Badge variant="outline" className={`text-[10px] sm:text-xs ${payBadgeCls(selectedSale.paymentType)}`}>
                  {payLabel(selectedSale.paymentType)}
                </Badge>
                {selectedSale.invoiceEmitted && (
                  <Badge variant="outline" className="bg-emerald-50 text-emerald-600 border-emerald-300 text-[10px] sm:text-xs">Emitida</Badge>
                )}
              </div>

              <div className="space-y-1.5 text-xs sm:text-sm">
                {[
                  ['Cliente', selectedSale.clientName || 'Cliente final'],
                  ['Vendedor', selectedSale.sellerName || 'Sin vendedor'],
                  ['Boleta', selectedSale.invoiceEmitted ? (selectedSale.invoiceNumber || 'Emitida') : 'Pendiente'],
                  ['Remito', selectedSale.remitoNumber || 'Sin remito'],
                ].map(([label, value]) => (
                  <div key={label} className="flex justify-between p-1.5 sm:p-2 rounded-md hover:bg-muted transition-colors">
                    <span className="text-muted-foreground">{label}</span>
                    <span className="font-medium text-foreground text-right">{value}</span>
                  </div>
                ))}
              </div>

              {(selectedSale.invoicePdfUrl || selectedSale.remitoPdfUrl) && (
                <div className="flex flex-wrap gap-1.5">
                  {selectedSale.invoicePdfUrl && (
                    <>
                      <Button variant="outline" size="sm" asChild className="bg-transparent h-7 text-xs">
                        <a href={selectedSale.invoicePdfUrl} target="_blank" rel="noreferrer">
                          <Download className="h-3 w-3 mr-1" /> Ver Boleta
                        </a>
                      </Button>
                      {buildWhatsappUrl(selectedSale.clientPhone, selectedSale.invoicePdfUrl, selectedSale.clientName) && (
                        <Button variant="outline" size="sm" asChild className="bg-transparent h-7 text-xs">
                          <a href={selectedSale.invoiceWhatsappUrl ?? buildWhatsappUrl(selectedSale.clientPhone, selectedSale.invoicePdfUrl, selectedSale.clientName) ?? '#'} target="_blank" rel="noreferrer">
                            <Send className="h-3 w-3 mr-1" /> Enviar
                          </a>
                        </Button>
                      )}
                    </>
                  )}
                  {selectedSale.remitoPdfUrl && (
                    <>
                      <Button variant="outline" size="sm" asChild className="bg-transparent h-7 text-xs">
                        <a href={selectedSale.remitoPdfUrl} target="_blank" rel="noreferrer">
                          <Truck className="h-3 w-3 mr-1" /> Ver Remito
                        </a>
                      </Button>
                      {buildWhatsappUrl(selectedSale.clientPhone, selectedSale.remitoPdfUrl, selectedSale.clientName) && (
                        <Button variant="outline" size="sm" asChild className="bg-transparent h-7 text-xs">
                          <a href={buildWhatsappUrl(selectedSale.clientPhone, selectedSale.remitoPdfUrl, selectedSale.clientName) ?? '#'} target="_blank" rel="noreferrer">
                            <Send className="h-3 w-3 mr-1" /> Enviar
                          </a>
                        </Button>
                      )}
                    </>
                  )}
                </div>
              )}

              {/* Products */}
              <div className="border-t border-border pt-3">
                <h4 className="font-medium text-foreground text-xs sm:text-sm mb-2 flex items-center gap-1.5">
                  <Package className="h-3.5 w-3.5" /> Productos
                </h4>
                <div className="space-y-1 max-h-36 overflow-y-auto">
                  {selectedSale.items.map((item, i) => (
                    <div key={i} className="flex justify-between text-[11px] sm:text-xs p-1.5 rounded-md bg-muted/50">
                      <span className="text-foreground truncate mr-2">{item.name} <span className="text-muted-foreground">x{item.quantity}</span></span>
                      <span className="font-medium text-foreground shrink-0">{fmt(item.price * item.quantity)}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Total */}
              <div className="rounded-lg p-3 bg-primary/5 border border-primary/20">
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground text-xs sm:text-sm">Total</span>
                  <span className="text-lg sm:text-xl font-bold text-foreground">{fmt(selectedSale.total)}</span>
                </div>
              </div>

              {/* Actions */}
              <div className="flex flex-wrap gap-1.5 pt-1">
                {!selectedSale.invoiceEmitted && (
                  <Button variant="outline" size="sm" className="flex-1 bg-transparent text-xs h-8" onClick={() => { setDetailModalOpen(false); handleOpenEmitModal(selectedSale) }}>
                    <FileText className="h-3.5 w-3.5 mr-1" /> Emitir Boleta
                  </Button>
                )}
                {!selectedSale.remitoNumber && (
                  <Button variant="outline" size="sm" className="flex-1 bg-transparent text-xs h-8" onClick={() => { setDetailModalOpen(false); setSaleToEmit(selectedSale); setDocumentType('remito'); setEmitModalOpen(true) }}>
                    <Truck className="h-3.5 w-3.5 mr-1" /> Remito
                  </Button>
                )}
                {!selectedSale.sellerId && (
                  <Button variant="outline" size="sm" className="flex-1 bg-transparent text-xs h-8" onClick={() => { setDetailModalOpen(false); handleOpenAssignModal(selectedSale) }}>
                    <User className="h-3.5 w-3.5 mr-1" /> Asignar
                  </Button>
                )}
                <Button size="sm" className="text-xs h-8" onClick={() => setDetailModalOpen(false)}>Cerrar</Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Emit Document Modal */}
      <Dialog open={emitModalOpen} onOpenChange={setEmitModalOpen}>
        <DialogContent className="max-w-[calc(100vw-2rem)] sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-sm sm:text-base">Emitir Comprobante</DialogTitle>
          </DialogHeader>
          {saleToEmit && (
            <div className="space-y-3 pt-1">
              <div className="space-y-2 text-xs sm:text-sm">
                {[
                  ['Venta', `#${saleToEmit.id.slice(-6)}`],
                  ['Cliente', saleToEmit.clientName || 'Cliente final'],
                  ['Fecha', fmtDateTime(saleToEmit.createdAt)],
                  ['Productos', String(saleToEmit.items.length)],
                ].map(([l, v]) => (
                  <div key={l} className="flex justify-between">
                    <span className="text-muted-foreground">{l}</span>
                    <span className="text-foreground font-medium">{v}</span>
                  </div>
                ))}
              </div>
              <div className="p-3 bg-muted rounded-lg flex justify-between items-center">
                <span className="text-muted-foreground text-xs sm:text-sm">Total</span>
                <span className="text-base sm:text-lg font-bold text-foreground">{fmt(saleToEmit.total)}</span>
              </div>
              <div className="space-y-2">
                <p className="text-xs text-muted-foreground">Selecciona que emitir:</p>
                <RadioGroup value={documentType} onValueChange={(v) => setDocumentType(v as 'invoice' | 'remito')} className="space-y-1.5">
                  <div className="flex items-center gap-2">
                    <RadioGroupItem value="invoice" id="emit-invoice" disabled={saleToEmit.invoiceEmitted} />
                    <Label htmlFor="emit-invoice" className={`text-xs sm:text-sm ${saleToEmit.invoiceEmitted ? 'text-muted-foreground' : ''}`}>
                      Boleta {saleToEmit.invoiceEmitted && '(Ya emitida)'}
                    </Label>
                  </div>
                  <div className="flex items-center gap-2">
                    <RadioGroupItem value="remito" id="emit-remito" disabled={!!saleToEmit.remitoNumber} />
                    <Label htmlFor="emit-remito" className={`text-xs sm:text-sm ${saleToEmit.remitoNumber ? 'text-muted-foreground' : ''}`}>
                      Remito {saleToEmit.remitoNumber && '(Ya generado)'}
                    </Label>
                  </div>
                </RadioGroup>
              </div>
              <div className="flex gap-2 pt-1">
                <Button variant="outline" className="flex-1 bg-transparent text-xs h-8" onClick={() => setEmitModalOpen(false)}>Cancelar</Button>
                <Button className="flex-1 text-xs h-8" onClick={handleEmitDocument} disabled={emitting}>
                  {emitting && <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" />}
                  Emitir
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Assign Seller Modal */}
      <Dialog open={assignModalOpen} onOpenChange={setAssignModalOpen}>
        <DialogContent className="max-w-[calc(100vw-2rem)] sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-sm sm:text-base">Asignar Vendedor</DialogTitle>
          </DialogHeader>
          {saleToAssign && (
            <div className="space-y-3 pt-1">
              <div className="space-y-2 text-xs sm:text-sm">
                {[
                  ['Venta', `#${saleToAssign.id.slice(-6)}`],
                  ['Cliente', saleToAssign.clientName || 'Cliente final'],
                  ['Total', fmt(saleToAssign.total)],
                ].map(([l, v]) => (
                  <div key={l} className="flex justify-between">
                    <span className="text-muted-foreground">{l}</span>
                    <span className="text-foreground font-medium">{v}</span>
                  </div>
                ))}
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Seleccionar vendedor</Label>
                <Select value={selectedSellerId} onValueChange={setSelectedSellerId}>
                  <SelectTrigger className="h-8 text-xs sm:text-sm">
                    <SelectValue placeholder="Seleccionar vendedor..." />
                  </SelectTrigger>
                  <SelectContent>
                    {sellers.filter((s) => s.isActive).map((s) => (
                      <SelectItem key={s.id} value={s.id}>
                        <div className="flex items-center gap-2">
                          <Avatar className="h-5 w-5">
                            <AvatarFallback className="text-[10px]">{s.name.charAt(0)}</AvatarFallback>
                          </Avatar>
                          {s.name}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex gap-2 pt-1">
                <Button variant="outline" className="flex-1 bg-transparent text-xs h-8" onClick={() => setAssignModalOpen(false)}>Cancelar</Button>
                <Button className="flex-1 text-xs h-8" onClick={handleAssignSeller} disabled={assigning || !selectedSellerId}>
                  {assigning && <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" />}
                  Asignar
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Bulk Assign Modal */}
      <Dialog open={bulkAssignModalOpen} onOpenChange={setBulkAssignModalOpen}>
        <DialogContent className="max-w-[calc(100vw-2rem)] sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-sm sm:text-base">Asignar Vendedor a Ventas</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 pt-1">
            <div className="space-y-2 text-xs sm:text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Ventas sin vendedor</span>
                <span className="font-bold text-foreground">{ventasSinVendedor.length}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Total</span>
                <span className="font-bold text-foreground">{fmt(ventasSinVendedorTotal)}</span>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Asignar todas a:</Label>
              <Select value={bulkSelectedSellerId} onValueChange={setBulkSelectedSellerId}>
                <SelectTrigger className="h-8 text-xs sm:text-sm">
                  <SelectValue placeholder="Seleccionar vendedor..." />
                </SelectTrigger>
                <SelectContent>
                  {sellers.filter((s) => s.isActive).map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      <div className="flex items-center gap-2">
                        <Avatar className="h-5 w-5">
                          <AvatarFallback className="text-[10px]">{s.name.charAt(0)}</AvatarFallback>
                        </Avatar>
                        {s.name}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex gap-2 pt-1">
              <Button variant="outline" className="flex-1 bg-transparent text-xs h-8" onClick={() => setBulkAssignModalOpen(false)}>Cancelar</Button>
              <Button className="flex-1 text-xs h-8" onClick={handleBulkAssignSeller} disabled={bulkAssigning || !bulkSelectedSellerId}>
                {bulkAssigning && <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" />}
                Asignar a todas
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </MainLayout>
  )
}
