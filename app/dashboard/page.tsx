'use client'

import { useEffect, useState } from 'react'
import { MainLayout } from '@/components/layout/main-layout'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { dashboardApi } from '@/lib/api'
import type { Product, Client } from '@/lib/types'
import { DollarSign, Package, AlertTriangle, Users, TrendingUp, ArrowRight, HandCoins } from 'lucide-react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { useAuth } from '@/hooks/use-auth'
import { getCommissionSummaryBySeller } from '@/services/commissions-service'

interface DashboardStats {
  todaySales: number
  todayOrders: number
  lowStockProducts: number
  totalDebt: number
  pendingOrders: number
}

export default function DashboardPage() {
  const { user } = useAuth()
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [lowStockProducts, setLowStockProducts] = useState<Product[]>([])
  const [debtors, setDebtors] = useState<Client[]>([])
  const [loading, setLoading] = useState(true)
  const [commissionSummary, setCommissionSummary] = useState<{
    total: number
    pendingTotal: number
    count: number
    pendingCount: number
  } | null>(null)
  const [loadingCommissions, setLoadingCommissions] = useState(false)

  useEffect(() => {
    const loadData = async () => {
      try {
        const [statsData, lowStock, debtorsData] = await Promise.all([
          dashboardApi.getStats(),
          dashboardApi.getLowStockProducts(),
          dashboardApi.getDebtors(),
        ])
        setStats(statsData)
        setLowStockProducts(lowStock)
        setDebtors(debtorsData)
      } catch (error) {
        console.error('Error loading dashboard:', error)
      } finally {
        setLoading(false)
      }
    }
    loadData()
  }, [])

  useEffect(() => {
    const loadCommissions = async () => {
      if (!user?.sellerId) return
      setLoadingCommissions(true)
      try {
        const summary = await getCommissionSummaryBySeller(user.sellerId)
        setCommissionSummary(summary)
      } catch (error) {
        console.error('Error loading commissions:', error)
      } finally {
        setLoadingCommissions(false)
      }
    }
    loadCommissions()
  }, [user?.sellerId])

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: 'ARS',
      minimumFractionDigits: 0,
    }).format(amount)
  }

  return (
    <MainLayout title="Dashboard" description="Resumen de actividad del día">
      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-8">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Ventas Hoy
            </CardTitle>
            <DollarSign className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            {loading ? (
              <Skeleton className="h-8 w-32" />
            ) : (
              <div className="text-2xl font-bold text-foreground">
                {formatCurrency(stats?.todaySales || 0)}
              </div>
            )}
            <p className="text-xs text-muted-foreground mt-1">
              {stats?.todayOrders || 0} órdenes procesadas
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Stock Bajo
            </CardTitle>
            <AlertTriangle className="h-4 w-4 text-warning" />
          </CardHeader>
          <CardContent>
            {loading ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <div className="text-2xl font-bold text-foreground">
                {stats?.lowStockProducts || 0}
              </div>
            )}
            <p className="text-xs text-muted-foreground mt-1">
              productos con stock crítico
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Saldo Deudores
            </CardTitle>
            <Users className="h-4 w-4 text-accent" />
          </CardHeader>
          <CardContent>
            {loading ? (
              <Skeleton className="h-8 w-32" />
            ) : (
              <div className="text-2xl font-bold text-foreground">
                {formatCurrency(stats?.totalDebt || 0)}
              </div>
            )}
            <p className="text-xs text-muted-foreground mt-1">
              {debtors.length} clientes con saldo
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Pedidos Pendientes
            </CardTitle>
            <Package className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            {loading ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <div className="text-2xl font-bold text-foreground">
                {stats?.pendingOrders || 0}
              </div>
            )}
            <p className="text-xs text-muted-foreground mt-1">
              en proceso de entrega
            </p>
          </CardContent>
        </Card>
        {user?.role === 'seller' && (
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Mis Comisiones
              </CardTitle>
              <HandCoins className="h-4 w-4 text-success" />
            </CardHeader>
            <CardContent>
              {loadingCommissions ? (
                <Skeleton className="h-8 w-32" />
              ) : (
                <>
                  <div className="text-2xl font-bold text-foreground">
                    {formatCurrency(commissionSummary?.total || 0)}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {commissionSummary?.pendingCount || 0} pendientes · {formatCurrency(commissionSummary?.pendingTotal || 0)}
                  </p>
                </>
              )}
            </CardContent>
          </Card>
        )}
      </div>

      {/* Detail Sections */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Low Stock Products */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base font-semibold">Stock Bajo</CardTitle>
            <Link href="/productos">
              <Button variant="ghost" size="sm" className="gap-1">
                Ver todos <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
              </div>
            ) : lowStockProducts.length === 0 ? (
              <p className="text-muted-foreground text-sm">
                No hay productos con stock bajo
              </p>
            ) : (
              <div className="space-y-3">
                {lowStockProducts.map((product) => (
                  <div
                    key={product.id}
                    className="flex items-center justify-between p-3 rounded-lg bg-muted/50"
                  >
                    <div className="flex items-center gap-3">
                      <img
                        src={product.imageUrl || "/placeholder.svg"}
                        alt={product.name}
                        className="w-10 h-10 rounded-lg object-cover"
                      />
                      <div>
                        <p className="font-medium text-sm text-foreground">{product.name}</p>
                        <p className="text-xs text-muted-foreground">{product.category}</p>
                      </div>
                    </div>
                    <span className="text-sm font-semibold text-destructive">
                      {product.stock} uds
                    </span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Debtors */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base font-semibold">Deudores</CardTitle>
            <Link href="/clientes">
              <Button variant="ghost" size="sm" className="gap-1">
                Ver todos <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
              </div>
            ) : debtors.length === 0 ? (
              <p className="text-muted-foreground text-sm">
                No hay clientes con deudas pendientes
              </p>
            ) : (
              <div className="space-y-3">
                {debtors.map((client) => (
                  <Link
                    key={client.id}
                    href={`/clientes/${client.id}`}
                    className="flex items-center justify-between p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
                  >
                    <div>
                      <p className="font-medium text-sm text-foreground">{client.name}</p>
                      <p className="text-xs text-muted-foreground">{client.cuit}</p>
                    </div>
                    <span className="text-sm font-semibold text-foreground">
                      {formatCurrency(client.currentBalance)}
                    </span>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  )
}
