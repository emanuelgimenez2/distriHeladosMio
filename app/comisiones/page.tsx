'use client'

import { useEffect, useState } from 'react'
import { MainLayout } from '@/components/layout/main-layout'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { DataTableSkeleton } from '@/components/ui/data-table-skeleton'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { getCommissionsBySeller } from '@/services/commissions-service'
import { useAuth } from '@/hooks/use-auth'
import type { SellerCommission } from '@/lib/types'

export default function ComisionesPage() {
  const { user } = useAuth()
  const [commissions, setCommissions] = useState<SellerCommission[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const loadCommissions = async () => {
      if (!user?.sellerId) {
        setLoading(false)
        return
      }
      try {
        const data = await getCommissionsBySeller(user.sellerId)
        setCommissions(data)
      } catch (error) {
        console.error('Error loading commissions:', error)
      } finally {
        setLoading(false)
      }
    }
    loadCommissions()
  }, [user?.sellerId])

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: 'ARS',
    }).format(price)
  }

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('es-AR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    }).format(new Date(date))
  }

  const total = commissions.reduce((acc, commission) => acc + commission.commissionAmount, 0)
  const pendingTotal = commissions.filter((commission) => !commission.isPaid).reduce((acc, commission) => acc + commission.commissionAmount, 0)

  return (
    <MainLayout title="Mis Comisiones" description="Resumen y detalle de tus comisiones">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Comisiones Totales</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">{formatPrice(total)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Pendientes de Pago</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-warning">{formatPrice(pendingTotal)}</div>
          </CardContent>
        </Card>
      </div>

      {loading ? (
        <DataTableSkeleton columns={5} rows={6} />
      ) : commissions.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            No hay comisiones registradas
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Fecha</TableHead>
                  <TableHead className="text-right">Venta</TableHead>
                  <TableHead className="text-center">Tasa</TableHead>
                  <TableHead className="text-right">Comisión</TableHead>
                  <TableHead className="text-center">Estado</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {commissions.map((commission) => (
                  <TableRow key={commission.id}>
                    <TableCell>{formatDate(commission.createdAt)}</TableCell>
                    <TableCell className="text-right">{formatPrice(commission.saleTotal)}</TableCell>
                    <TableCell className="text-center">
                      <Badge variant="outline">{commission.commissionRate}%</Badge>
                    </TableCell>
                    <TableCell className="text-right font-medium text-success">
                      {formatPrice(commission.commissionAmount)}
                    </TableCell>
                    <TableCell className="text-center">
                      {commission.isPaid ? (
                        <Badge variant="default" className="bg-success text-success-foreground">
                          Pagada
                        </Badge>
                      ) : (
                        <Badge variant="secondary">Pendiente</Badge>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </MainLayout>
  )
}
