'use client'

import React, { useMemo, useState } from 'react'
import Link from 'next/link'
import { MainLayout } from '@/components/layout/main-layout'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  XAxis,
} from 'recharts'
import {
  AlertTriangle,
  ArrowRight,
  Calendar,
  CreditCard,
  DollarSign,
  IceCream,
  Package,
  Search,
  ShoppingCart,
  TrendingDown,
  TrendingUp,
  Truck,
  Users,
} from 'lucide-react'
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart'

type OrderStatus = 'preparando' | 'listo' | 'en_camino'

type PendingOrder = {
  id: string
  client: string
  status: OrderStatus
  eta: string
  items: number
}

const formatCurrency = (amount: number) =>
  new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
    minimumFractionDigits: 0,
  }).format(amount)

const statusMeta: Record<OrderStatus, { label: string; color: string }> = {
  preparando: { label: 'Preparando', color: 'bg-amber-500/15 text-amber-700' },
  listo: { label: 'Listo', color: 'bg-emerald-500/15 text-emerald-700' },
  en_camino: { label: 'En camino', color: 'bg-sky-500/15 text-sky-700' },
}

export default function DashboardPage() {
  const [dateFilter, setDateFilter] = useState<'hoy' | 'semana' | 'mes' | 'custom'>('hoy')
  const [debtorQuery, setDebtorQuery] = useState('')
  const [debtorPage, setDebtorPage] = useState(1)
  const [selectedOrder, setSelectedOrder] = useState<PendingOrder | null>(null)

  const kpis = [
    {
      id: 'ventas',
      title: 'Ventas hoy',
      value: formatCurrency(280000),
      change: 12.4,
      positive: true,
      detail: '38 órdenes procesadas',
      icon: DollarSign,
      sparkline: [12, 18, 24, 22, 28, 30, 36],
    },
    {
      id: 'stock',
      title: 'Stock bajo',
      value: '7 productos',
      change: -8.2,
      positive: false,
      detail: '3 críticos hoy',
      icon: AlertTriangle,
      sparkline: [9, 11, 10, 8, 7, 6, 7],
    },
    {
      id: 'deuda',
      title: 'Deudores',
      value: formatCurrency(520000),
      change: 4.1,
      positive: false,
      detail: '12 clientes con saldo',
      icon: Users,
      sparkline: [6, 7, 8, 9, 10, 11, 12],
    },
    {
      id: 'pendientes',
      title: 'Pedidos pendientes',
      value: '14',
      change: 6.7,
      positive: true,
      detail: '4 en camino',
      icon: Truck,
      sparkline: [8, 9, 11, 10, 12, 13, 14],
    },
  ]

  const salesWeekly = [
    { day: 'Lun', current: 180000, previous: 140000 },
    { day: 'Mar', current: 210000, previous: 160000 },
    { day: 'Mié', current: 190000, previous: 175000 },
    { day: 'Jue', current: 260000, previous: 190000 },
    { day: 'Vie', current: 300000, previous: 240000 },
    { day: 'Sáb', current: 340000, previous: 280000 },
    { day: 'Dom', current: 280000, previous: 220000 },
  ]

  const salesByHour = [
    { hour: '08', total: 12000 },
    { hour: '10', total: 18000 },
    { hour: '12', total: 24000 },
    { hour: '14', total: 31000 },
    { hour: '16', total: 28000 },
    { hour: '18', total: 36000 },
    { hour: '20', total: 32000 },
  ]

  const monthlyComparison = [
    { month: 'Ago', total: 2200000 },
    { month: 'Sep', total: 2400000 },
    { month: 'Oct', total: 2650000 },
    { month: 'Nov', total: 2780000 },
    { month: 'Dic', total: 3100000 },
    { month: 'Ene', total: 2950000 },
  ]

  const productDistribution = [
    { name: 'Clásicos', value: 38 },
    { name: 'Premium', value: 24 },
    { name: 'Frutas', value: 20 },
    { name: 'Especiales', value: 18 },
  ]

  const lowStock = [
    {
      id: '1',
      name: 'Helado de Pistacho',
      category: 'Premium',
      stock: 3,
      min: 12,
      imageUrl: 'https://images.unsplash.com/photo-1501443762994-82bd5dace89a?w=200&h=200&fit=crop',
    },
    {
      id: '2',
      name: 'Dulce de Leche Granizado',
      category: 'Clásicos',
      stock: 5,
      min: 15,
      imageUrl: 'https://images.unsplash.com/photo-1495147466023-ac5c588e2e94?w=200&h=200&fit=crop',
    },
    {
      id: '3',
      name: 'Frambuesa',
      category: 'Frutas',
      stock: 7,
      min: 18,
      imageUrl: 'https://images.unsplash.com/photo-1486427944299-d1955d23e34d?w=200&h=200&fit=crop',
    },
  ]

  const debtors = [
    { id: '1', name: 'Heladería Roma', amount: 180000, daysLate: 12 },
    { id: '2', name: 'Café La Plaza', amount: 120000, daysLate: 9 },
    { id: '3', name: 'Helados Sur', amount: 98000, daysLate: 7 },
    { id: '4', name: 'Resto Central', amount: 76000, daysLate: 5 },
    { id: '5', name: 'La Piamontesa', amount: 52000, daysLate: 3 },
    { id: '6', name: 'Bar Palermo', amount: 41000, daysLate: 2 },
  ]

  const topProducts = [
    { id: '1', name: 'Dulce de Leche', category: 'Clásicos', units: 420, revenue: 1200000 },
    { id: '2', name: 'Pistacho', category: 'Premium', units: 310, revenue: 980000 },
    { id: '3', name: 'Frambuesa', category: 'Frutas', units: 290, revenue: 720000 },
    { id: '4', name: 'Cookies & Cream', category: 'Especiales', units: 260, revenue: 680000 },
  ]

  const pendingOrders: PendingOrder[] = [
    { id: 'P-2045', client: 'Heladería Roma', status: 'preparando', eta: '45 min', items: 12 },
    { id: 'P-2046', client: 'Café La Plaza', status: 'listo', eta: '20 min', items: 8 },
    { id: 'P-2047', client: 'Resto Central', status: 'en_camino', eta: '30 min', items: 16 },
    { id: 'P-2048', client: 'Bar Palermo', status: 'preparando', eta: '50 min', items: 6 },
  ]

  const filteredDebtors = useMemo(() => {
    return debtors.filter((debtor) =>
      debtor.name.toLowerCase().includes(debtorQuery.toLowerCase())
    )
  }, [debtorQuery, debtors])

  const pageSize = 4
  const pagedDebtors = filteredDebtors.slice((debtorPage - 1) * pageSize, debtorPage * pageSize)
  const totalPages = Math.max(1, Math.ceil(filteredDebtors.length / pageSize))

  const categoryColors = ['#0ea5e9', '#22c55e', '#14b8a6', '#6366f1']

  return (
    <MainLayout title="Dashboard" description="Resumen ejecutivo y operación diaria">
      <div className="space-y-8">
        {/* Resumen ejecutivo */}
        <section className="rounded-3xl border border-border/60 bg-gradient-to-r from-sky-500/10 via-white to-cyan-500/10 p-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Distribuidora de helados</p>
              <h2 className="text-2xl font-semibold text-foreground">Resumen ejecutivo</h2>
              <p className="text-sm text-muted-foreground">
                Vista rápida del rendimiento, stock y pedidos críticos.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              {['hoy', 'semana', 'mes', 'custom'].map((option) => (
                <Button
                  key={option}
                  size="sm"
                  variant={dateFilter === option ? 'default' : 'outline'}
                  className="rounded-full capitalize"
                  onClick={() => setDateFilter(option as typeof dateFilter)}
                >
                  {option === 'custom' ? 'Personalizado' : option}
                </Button>
              ))}
              <Button size="sm" variant="outline" className="rounded-full gap-2">
                <Calendar className="h-4 w-4" />
                1 Feb - 7 Feb
              </Button>
            </div>
          </div>
        </section>

        {/* Acciones rápidas */}
        <section className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <IceCream className="h-4 w-4 text-sky-500" />
            Panel del administrador
          </div>
          <div className="flex flex-wrap gap-2">
            <Button className="rounded-full">Nueva venta</Button>
            <Button variant="outline" className="rounded-full">
              Ajustar stock
            </Button>
            <Button variant="outline" className="rounded-full">
              Ver pedidos
            </Button>
          </div>
        </section>

        {/* KPIs */}
        <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {kpis.map((kpi) => {
            const Icon = kpi.icon
            return (
              <Card key={kpi.id} className="border-border/60 shadow-sm">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    {kpi.title}
                  </CardTitle>
                  <div className="h-9 w-9 rounded-full bg-sky-500/10 flex items-center justify-center">
                    <Icon className="h-4 w-4 text-sky-600" />
                  </div>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="text-2xl font-semibold text-foreground">{kpi.value}</div>
                  <div className="flex items-center gap-2 text-xs">
                    <span
                      className={`flex items-center gap-1 font-medium ${
                        kpi.positive ? 'text-emerald-600' : 'text-rose-500'
                      }`}
                    >
                      {kpi.positive ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                      {Math.abs(kpi.change)}%
                    </span>
                    <span className="text-muted-foreground">vs período anterior</span>
                  </div>
                  <p className="text-xs text-muted-foreground">{kpi.detail}</p>
                  {/* Mini sparkline */}
                  <div className="h-10">
                    <ResponsiveContainer>
                      <AreaChart data={kpi.sparkline.map((value, index) => ({ index, value }))}>
                        <defs>
                          <linearGradient id={`spark-${kpi.id}`} x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#38bdf8" stopOpacity={0.4} />
                            <stop offset="95%" stopColor="#38bdf8" stopOpacity={0.05} />
                          </linearGradient>
                        </defs>
                        <Area
                          dataKey="value"
                          type="monotone"
                          stroke="#0284c7"
                          fill={`url(#spark-${kpi.id})`}
                          strokeWidth={2}
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </section>

        {/* Gráficos */}
        <section className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Card className="lg:col-span-2 border-border/60 shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-base font-semibold">Ventas y comparativa semanal</CardTitle>
              <Badge variant="secondary" className="rounded-full">
                +9% vs semana anterior
              </Badge>
            </CardHeader>
            <CardContent>
              <ChartContainer
                config={{
                  current: { label: 'Semana actual', color: '#0ea5e9' },
                  previous: { label: 'Semana anterior', color: '#94a3b8' },
                }}
                className="h-56 w-full"
              >
                <LineChart data={salesWeekly} margin={{ left: 8, right: 8 }}>
                  <CartesianGrid vertical={false} strokeDasharray="3 3" />
                  <XAxis dataKey="day" tickLine={false} axisLine={false} />
                  <ChartTooltip
                    content={<ChartTooltipContent />}
                    formatter={(value) => formatCurrency(Number(value))}
                  />
                  <Line dataKey="previous" stroke="#94a3b8" strokeWidth={2} dot={false} />
                  <Line dataKey="current" stroke="#0ea5e9" strokeWidth={3} dot={false} />
                </LineChart>
              </ChartContainer>
            </CardContent>
          </Card>

          <Card className="border-border/60 shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-base font-semibold">Distribución de productos</CardTitle>
              <Package className="h-4 w-4 text-sky-500" />
            </CardHeader>
            <CardContent>
              <div className="h-56 w-full">
                <ResponsiveContainer>
                  <PieChart>
                    <Pie
                      data={productDistribution}
                      dataKey="value"
                      nameKey="name"
                      innerRadius={45}
                      outerRadius={70}
                      paddingAngle={2}
                    >
                      {productDistribution.map((entry, index) => (
                        <Cell key={entry.name} fill={categoryColors[index % categoryColors.length]} />
                      ))}
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
                <div className="mt-3 grid grid-cols-2 gap-2 text-xs text-muted-foreground">
                  {productDistribution.map((item, index) => (
                    <div key={item.name} className="flex items-center gap-2">
                      <span
                        className="h-2 w-2 rounded-full"
                        style={{ backgroundColor: categoryColors[index % categoryColors.length] }}
                      />
                      <span className="truncate">{item.name}</span>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-border/60 shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-base font-semibold">Comparativa mensual</CardTitle>
              <TrendingUp className="h-4 w-4 text-emerald-600" />
            </CardHeader>
            <CardContent>
              <ChartContainer
                config={{ total: { label: 'Ventas', color: '#14b8a6' } }}
                className="h-44 w-full"
              >
                <BarChart data={monthlyComparison} margin={{ left: 8, right: 8 }}>
                  <CartesianGrid vertical={false} strokeDasharray="3 3" />
                  <XAxis dataKey="month" tickLine={false} axisLine={false} />
                  <ChartTooltip
                    content={<ChartTooltipContent />}
                    formatter={(value) => formatCurrency(Number(value))}
                  />
                  <Bar dataKey="total" fill="#14b8a6" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ChartContainer>
            </CardContent>
          </Card>

          <Card className="border-border/60 shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-base font-semibold">Ventas hoy (por hora)</CardTitle>
              <ShoppingCart className="h-4 w-4 text-sky-600" />
            </CardHeader>
            <CardContent>
              <ChartContainer
                config={{ total: { label: 'Ventas', color: '#38bdf8' } }}
                className="h-44 w-full"
              >
                <AreaChart data={salesByHour} margin={{ left: 8, right: 8 }}>
                  <defs>
                    <linearGradient id="fillToday" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#38bdf8" stopOpacity={0.35} />
                      <stop offset="95%" stopColor="#38bdf8" stopOpacity={0.05} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid vertical={false} strokeDasharray="3 3" />
                  <XAxis dataKey="hour" tickLine={false} axisLine={false} />
                  <ChartTooltip
                    content={<ChartTooltipContent />}
                    formatter={(value) => formatCurrency(Number(value))}
                  />
                  <Area dataKey="total" stroke="#0284c7" fill="url(#fillToday)" strokeWidth={2} />
                </AreaChart>
              </ChartContainer>
            </CardContent>
          </Card>
        </section>

        {/* Secciones operativas */}
        <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card className="border-border/60 shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-base font-semibold">Stock bajo</CardTitle>
              <Button variant="ghost" size="sm" className="gap-1">
                Ver todos <ArrowRight className="h-4 w-4" />
              </Button>
            </CardHeader>
            <CardContent className="space-y-4">
              {lowStock.map((product) => {
                const percent = Math.min(100, Math.round((product.stock / product.min) * 100))
                return (
                  <div key={product.id} className="rounded-xl border border-border/60 p-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <img
                          src={product.imageUrl}
                          alt={product.name}
                          className="h-12 w-12 rounded-lg object-cover"
                        />
                        <div>
                          <p className="text-sm font-medium text-foreground">{product.name}</p>
                          <p className="text-xs text-muted-foreground">{product.category}</p>
                        </div>
                      </div>
                      <Badge className="bg-rose-500/15 text-rose-600">
                        {product.stock} uds
                      </Badge>
                    </div>
                    <div className="mt-3 h-2 rounded-full bg-muted">
                      <div
                        className="h-2 rounded-full bg-rose-500/70"
                        style={{ width: `${percent}%` }}
                      />
                    </div>
                    <div className="mt-2 flex items-center justify-between text-xs text-muted-foreground">
                      <span>Mínimo {product.min} uds</span>
                      <Button size="sm" variant="outline" className="h-7 rounded-full px-3">
                        Reabastecer
                      </Button>
                    </div>
                  </div>
                )
              })}
            </CardContent>
          </Card>

          <Card className="border-border/60 shadow-sm">
            <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <CardTitle className="text-base font-semibold">Deudores</CardTitle>
                <p className="text-xs text-muted-foreground">Top clientes con deuda activa</p>
              </div>
              <div className="relative w-full sm:w-56">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar cliente"
                  className="pl-9"
                  value={debtorQuery}
                  onChange={(event) => {
                    setDebtorQuery(event.target.value)
                    setDebtorPage(1)
                  }}
                />
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {pagedDebtors.map((debtor) => (
                <div
                  key={debtor.id}
                  className="flex items-center justify-between rounded-xl border border-border/60 px-3 py-2"
                >
                  <div>
                    <p className="text-sm font-medium text-foreground">{debtor.name}</p>
                    <p className="text-xs text-muted-foreground">{debtor.daysLate} días de mora</p>
                  </div>
                  <span className="text-sm font-semibold text-foreground">
                    {formatCurrency(debtor.amount)}
                  </span>
                </div>
              ))}
              <div className="flex items-center justify-between pt-2 text-xs text-muted-foreground">
                <span>Página {debtorPage} de {totalPages}</span>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-7"
                    disabled={debtorPage === 1}
                    onClick={() => setDebtorPage((page) => Math.max(1, page - 1))}
                  >
                    Anterior
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-7"
                    disabled={debtorPage === totalPages}
                    onClick={() => setDebtorPage((page) => Math.min(totalPages, page + 1))}
                  >
                    Siguiente
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </section>

        <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card className="border-border/60 shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-base font-semibold">Productos más vendidos</CardTitle>
              <Button variant="ghost" size="sm" className="gap-1">
                Ver ranking <ArrowRight className="h-4 w-4" />
              </Button>
            </CardHeader>
            <CardContent className="space-y-3">
              {topProducts.map((product) => (
                <div
                  key={product.id}
                  className="flex items-center justify-between rounded-xl border border-border/60 px-3 py-2"
                >
                  <div>
                    <p className="text-sm font-medium text-foreground">{product.name}</p>
                    <p className="text-xs text-muted-foreground">{product.category}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold text-foreground">{product.units} uds</p>
                    <p className="text-xs text-muted-foreground">
                      {formatCurrency(product.revenue)}
                    </p>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card className="border-border/60 shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-base font-semibold">Pedidos pendientes</CardTitle>
              <Badge variant="secondary" className="rounded-full">
                {pendingOrders.length} en curso
              </Badge>
            </CardHeader>
            <CardContent className="space-y-3">
              {pendingOrders.map((order) => (
                <button
                  key={order.id}
                  type="button"
                  onClick={() => setSelectedOrder(order)}
                  className="w-full text-left rounded-xl border border-border/60 px-3 py-2 transition hover:bg-muted/50"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-foreground">{order.client}</p>
                      <p className="text-xs text-muted-foreground">{order.id}</p>
                    </div>
                    <span className={`text-xs font-medium rounded-full px-2 py-1 ${statusMeta[order.status].color}`}>
                      {statusMeta[order.status].label}
                    </span>
                  </div>
                  <div className="mt-2 flex items-center justify-between text-xs text-muted-foreground">
                    <span>{order.items} productos</span>
                    <span>Entrega en {order.eta}</span>
                  </div>
                </button>
              ))}
            </CardContent>
          </Card>
        </section>
      </div>

      {/* Modal de detalle */}
      <Dialog open={Boolean(selectedOrder)} onOpenChange={() => setSelectedOrder(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Detalle del pedido</DialogTitle>
          </DialogHeader>
          {selectedOrder && (
            <div className="space-y-4">
              <div className="rounded-xl border border-border/60 p-3">
                <p className="text-sm font-medium text-foreground">{selectedOrder.client}</p>
                <p className="text-xs text-muted-foreground">{selectedOrder.id}</p>
              </div>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div className="rounded-xl bg-muted/60 p-3">
                  <p className="text-xs text-muted-foreground">Estado</p>
                  <p className="font-medium text-foreground">{statusMeta[selectedOrder.status].label}</p>
                </div>
                <div className="rounded-xl bg-muted/60 p-3">
                  <p className="text-xs text-muted-foreground">ETA</p>
                  <p className="font-medium text-foreground">{selectedOrder.eta}</p>
                </div>
                <div className="rounded-xl bg-muted/60 p-3">
                  <p className="text-xs text-muted-foreground">Productos</p>
                  <p className="font-medium text-foreground">{selectedOrder.items}</p>
                </div>
                <div className="rounded-xl bg-muted/60 p-3">
                  <p className="text-xs text-muted-foreground">Pago</p>
                  <p className="font-medium text-foreground">Cuenta corriente</p>
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setSelectedOrder(null)}>
              Cerrar
            </Button>
            <Button>Actualizar estado</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </MainLayout>
  )
}
