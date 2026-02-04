'use client'

import React from 'react'
import { useEffect, useState } from 'react'
import { MainLayout } from '@/components/layout/main-layout'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { DataTableSkeleton } from '@/components/ui/data-table-skeleton'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Switch } from '@/components/ui/switch'
import { sellersApi, salesApi } from '@/lib/api'
import type { Sale, Seller, SellerCommission } from '@/lib/types'
import {
  Plus,
  Search,
  MoreHorizontal,
  Pencil,
  Trash2,
  Users,
  DollarSign,
  TrendingUp,
  Percent,
  Eye,
  Banknote,
  Loader2,
  CheckCircle,
} from 'lucide-react'

export default function VendedoresPage() {
  const [sellers, setSellers] = useState<Seller[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [editingSeller, setEditingSeller] = useState<Seller | null>(null)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  
  // Detail modal
  const [showDetailModal, setShowDetailModal] = useState(false)
  const [selectedSeller, setSelectedSeller] = useState<Seller | null>(null)
  const [commissions, setCommissions] = useState<SellerCommission[]>([])
  const [loadingCommissions, setLoadingCommissions] = useState(false)
  const [sales, setSales] = useState<Sale[]>([])
  const [loadingSales, setLoadingSales] = useState(false)
  const [payingAll, setPayingAll] = useState(false)

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    commissionRate: 10,
    isActive: true,
  })

  useEffect(() => {
    loadSellers()
  }, [])

  const loadSellers = async () => {
    try {
      const data = await sellersApi.getAll()
      setSellers(data)
    } catch (error) {
      console.error('Error loading sellers:', error)
    } finally {
      setLoading(false)
    }
  }

  const loadSellerCommissions = async (sellerId: string) => {
    setLoadingCommissions(true)
    try {
      const data = await sellersApi.getCommissions(sellerId)
      setCommissions(data.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()))
    } catch (error) {
      console.error('Error loading commissions:', error)
    } finally {
      setLoadingCommissions(false)
    }
  }

  const loadSellerSales = async (sellerId: string) => {
    setLoadingSales(true)
    try {
      const data = await salesApi.getBySeller(sellerId)
      setSales(data.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()))
    } catch (error) {
      console.error('Error loading sales:', error)
    } finally {
      setLoadingSales(false)
    }
  }

  const handleViewDetail = async (seller: Seller) => {
    setSelectedSeller(seller)
    setShowDetailModal(true)
    await Promise.all([loadSellerCommissions(seller.id), loadSellerSales(seller.id)])
  }

  const handlePayCommission = async (commissionId: string) => {
    try {
      await sellersApi.payCommission(commissionId)
      if (selectedSeller) {
        await loadSellerCommissions(selectedSeller.id)
        await loadSellers()
      }
    } catch (error) {
      console.error('Error paying commission:', error)
    }
  }

  const handlePayAllCommissions = async () => {
    if (!selectedSeller) return
    setPayingAll(true)
    try {
      await sellersApi.payAllCommissions(selectedSeller.id)
      await loadSellerCommissions(selectedSeller.id)
      await loadSellers()
    } catch (error) {
      console.error('Error paying all commissions:', error)
    } finally {
      setPayingAll(false)
    }
  }

  const openCreateModal = () => {
    setEditingSeller(null)
    setFormData({
      name: '',
      email: '',
      phone: '',
      commissionRate: 10,
      isActive: true,
    })
    setShowModal(true)
  }

  const openEditModal = (seller: Seller) => {
    setEditingSeller(seller)
    setFormData({
      name: seller.name,
      email: seller.email,
      phone: seller.phone,
      commissionRate: seller.commissionRate,
      isActive: seller.isActive,
    })
    setShowModal(true)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      if (editingSeller) {
        const updated = await sellersApi.update(editingSeller.id, formData)
        setSellers(sellers.map(s => s.id === editingSeller.id ? updated : s))
      } else {
        const newSeller = await sellersApi.create(formData)
        setSellers([...sellers, newSeller])
      }
      setShowModal(false)
    } catch (error) {
      console.error('Error saving seller:', error)
    }
  }

  const handleDelete = async () => {
    if (!deleteId) return
    try {
      await sellersApi.delete(deleteId)
      setSellers(sellers.filter(s => s.id !== deleteId))
      setDeleteId(null)
    } catch (error) {
      console.error('Error deleting seller:', error)
    }
  }

  const handleToggleActive = async (seller: Seller) => {
    try {
      const updated = await sellersApi.update(seller.id, { isActive: !seller.isActive })
      setSellers(sellers.map(s => s.id === seller.id ? updated : s))
    } catch (error) {
      console.error('Error toggling seller status:', error)
    }
  }

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: 'ARS',
    }).format(price)
  }

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString('es-AR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    })
  }

  const formatPaymentType = (type: Sale['paymentType']) => {
    return type === 'cash' ? 'Efectivo' : 'Cuenta Corriente'
  }

  const filteredSellers = sellers.filter(seller =>
    seller.name.toLowerCase().includes(search.toLowerCase()) ||
    seller.email.toLowerCase().includes(search.toLowerCase())
  )

  const activeSellers = sellers.filter(s => s.isActive).length
  const totalSales = sellers.reduce((acc, s) => acc + s.totalSales, 0)
  const totalCommissions = sellers.reduce((acc, s) => acc + s.totalCommission, 0)
  const avgCommissionRate = sellers.length > 0
    ? sellers.reduce((acc, s) => acc + s.commissionRate, 0) / sellers.length
    : 0

  const pendingCommissions = commissions.filter(c => !c.isPaid)
  const pendingTotal = pendingCommissions.reduce((acc, c) => acc + c.commissionAmount, 0)

  return (
    <MainLayout>
      <div className="flex flex-col gap-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Vendedores</h1>
            <p className="text-muted-foreground">Gestiona tu equipo de ventas y comisiones</p>
          </div>
          <Button onClick={openCreateModal}>
            <Plus className="h-4 w-4 mr-2" />
            Nuevo Vendedor
          </Button>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Users className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Vendedores Activos</p>
                  <p className="text-2xl font-bold text-foreground">{activeSellers}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="h-12 w-12 rounded-lg bg-success/10 flex items-center justify-center">
                  <TrendingUp className="h-6 w-6 text-success" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Ventas Totales</p>
                  <p className="text-2xl font-bold text-foreground">{formatPrice(totalSales)}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="h-12 w-12 rounded-lg bg-warning/10 flex items-center justify-center">
                  <DollarSign className="h-6 w-6 text-warning" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Comisiones Totales</p>
                  <p className="text-2xl font-bold text-foreground">{formatPrice(totalCommissions)}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="h-12 w-12 rounded-lg bg-accent/10 flex items-center justify-center">
                  <Percent className="h-6 w-6 text-accent" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Comisión Promedio</p>
                  <p className="text-2xl font-bold text-foreground">{avgCommissionRate.toFixed(1)}%</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Search */}
        <Card>
          <CardContent className="pt-6">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar vendedor por nombre o email..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10"
              />
            </div>
          </CardContent>
        </Card>

        {/* Table */}
        {loading ? (
          <DataTableSkeleton columns={7} rows={6} />
        ) : (
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Vendedor</TableHead>
                    <TableHead>Contacto</TableHead>
                    <TableHead className="text-center">Comisión</TableHead>
                    <TableHead className="text-right">Ventas</TableHead>
                    <TableHead className="text-right">Comisiones</TableHead>
                    <TableHead className="text-center">Estado</TableHead>
                    <TableHead className="w-[80px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredSellers.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                        No se encontraron vendedores
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredSellers.map((seller) => (
                      <TableRow key={seller.id}>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                              <span className="text-sm font-semibold text-primary">
                                {seller.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                              </span>
                            </div>
                            <div>
                              <p className="font-medium text-foreground">{seller.name}</p>
                              <p className="text-sm text-muted-foreground">
                                Desde {formatDate(seller.createdAt)}
                              </p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <p className="text-sm text-foreground">{seller.email}</p>
                          <p className="text-sm text-muted-foreground">{seller.phone}</p>
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge variant="secondary">{seller.commissionRate}%</Badge>
                        </TableCell>
                        <TableCell className="text-right font-medium text-foreground">
                          {formatPrice(seller.totalSales)}
                        </TableCell>
                        <TableCell className="text-right font-medium text-success">
                          {formatPrice(seller.totalCommission)}
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge variant={seller.isActive ? 'default' : 'secondary'}>
                            {seller.isActive ? 'Activo' : 'Inactivo'}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => handleViewDetail(seller)}>
                                <Eye className="h-4 w-4 mr-2" />
                                Ver Detalle
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => openEditModal(seller)}>
                                <Pencil className="h-4 w-4 mr-2" />
                                Editar
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => setDeleteId(seller.id)}
                                className="text-destructive"
                              >
                                <Trash2 className="h-4 w-4 mr-2" />
                                Eliminar
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Create/Edit Modal */}
      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editingSeller ? 'Editar Vendedor' : 'Nuevo Vendedor'}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit}>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="name">Nombre Completo</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  required
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="phone">Teléfono</Label>
                <Input
                  id="phone"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  required
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="commissionRate">Porcentaje de Comisión (%)</Label>
                <Input
                  id="commissionRate"
                  type="number"
                  min="0"
                  max="100"
                  step="0.5"
                  value={formData.commissionRate}
                  onChange={(e) => setFormData({ ...formData, commissionRate: Number(e.target.value) })}
                  required
                />
              </div>
              <div className="flex items-center justify-between">
                <Label htmlFor="isActive">Vendedor Activo</Label>
                <Switch
                  id="isActive"
                  checked={formData.isActive}
                  onCheckedChange={(checked) => setFormData({ ...formData, isActive: checked })}
                />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setShowModal(false)}>
                Cancelar
              </Button>
              <Button type="submit">
                {editingSeller ? 'Guardar Cambios' : 'Crear Vendedor'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Detail Modal */}
      <Dialog open={showDetailModal} onOpenChange={setShowDetailModal}>
        <DialogContent className="sm:max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Detalle del Vendedor</DialogTitle>
          </DialogHeader>
          
          {selectedSeller && (
            <div className="py-4">
              {/* Seller Info */}
              <div className="flex items-center gap-4 mb-6">
                <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center">
                  <span className="text-xl font-semibold text-primary">
                    {selectedSeller.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                  </span>
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-foreground">{selectedSeller.name}</h3>
                  <p className="text-sm text-muted-foreground">{selectedSeller.email}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <Badge variant={selectedSeller.isActive ? 'default' : 'secondary'}>
                      {selectedSeller.isActive ? 'Activo' : 'Inactivo'}
                    </Badge>
                    <Badge variant="outline">{selectedSeller.commissionRate}% comisión</Badge>
                  </div>
                </div>
              </div>

              {/* Stats */}
              <div className="grid grid-cols-2 gap-4 mb-6">
                <Card>
                  <CardContent className="pt-4">
                    <p className="text-sm text-muted-foreground">Ventas Totales</p>
                    <p className="text-xl font-bold text-foreground">{formatPrice(selectedSeller.totalSales)}</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-4">
                    <p className="text-sm text-muted-foreground">Comisiones Ganadas</p>
                    <p className="text-xl font-bold text-success">{formatPrice(selectedSeller.totalCommission)}</p>
                  </CardContent>
                </Card>
              </div>

              {/* Pending Commissions Summary */}
              {pendingCommissions.length > 0 && (
                <Card className="mb-4 border-warning">
                  <CardContent className="pt-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-muted-foreground">Comisiones Pendientes de Pago</p>
                        <p className="text-xl font-bold text-warning">{formatPrice(pendingTotal)}</p>
                        <p className="text-sm text-muted-foreground">{pendingCommissions.length} comisiones</p>
                      </div>
                      <Button onClick={handlePayAllCommissions} disabled={payingAll}>
                        {payingAll ? (
                          <>
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            Pagando...
                          </>
                        ) : (
                          <>
                            <Banknote className="h-4 w-4 mr-2" />
                            Pagar Todas
                          </>
                        )}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Commissions List */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Historial de Comisiones</CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  {loadingCommissions ? (
                    <div className="p-8 text-center">
                      <Loader2 className="h-6 w-6 animate-spin mx-auto text-muted-foreground" />
                    </div>
                  ) : commissions.length === 0 ? (
                    <p className="p-8 text-center text-muted-foreground">
                      No hay comisiones registradas
                    </p>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Fecha</TableHead>
                          <TableHead className="text-right">Venta</TableHead>
                          <TableHead className="text-center">Tasa</TableHead>
                          <TableHead className="text-right">Comisión</TableHead>
                          <TableHead className="text-center">Estado</TableHead>
                          <TableHead></TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {commissions.map((commission) => (
                          <TableRow key={commission.id}>
                            <TableCell className="text-foreground">
                              {formatDate(commission.createdAt)}
                            </TableCell>
                            <TableCell className="text-right text-foreground">
                              {formatPrice(commission.saleTotal)}
                            </TableCell>
                            <TableCell className="text-center">
                              <Badge variant="outline">{commission.commissionRate}%</Badge>
                            </TableCell>
                            <TableCell className="text-right font-medium text-success">
                              {formatPrice(commission.commissionAmount)}
                            </TableCell>
                            <TableCell className="text-center">
                              {commission.isPaid ? (
                                <Badge variant="default" className="bg-success text-success-foreground">
                                  <CheckCircle className="h-3 w-3 mr-1" />
                                  Pagada
                                </Badge>
                              ) : (
                                <Badge variant="secondary">Pendiente</Badge>
                              )}
                            </TableCell>
                            <TableCell>
                              {!commission.isPaid && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handlePayCommission(commission.id)}
                                >
                                  Pagar
                                </Button>
                              )}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </CardContent>
              </Card>

              {/* Sales List */}
              <Card className="mt-4">
                <CardHeader>
                  <CardTitle className="text-base">Ventas del Vendedor</CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  {loadingSales ? (
                    <div className="p-8 text-center">
                      <Loader2 className="h-6 w-6 animate-spin mx-auto text-muted-foreground" />
                    </div>
                  ) : sales.length === 0 ? (
                    <p className="p-8 text-center text-muted-foreground">
                      No hay ventas registradas
                    </p>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Fecha</TableHead>
                          <TableHead>Cliente</TableHead>
                          <TableHead className="text-right">Total</TableHead>
                          <TableHead className="text-center">Pago</TableHead>
                          <TableHead className="text-center">Boleta</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {sales.map((sale) => (
                          <TableRow key={sale.id}>
                            <TableCell className="text-foreground">
                              {formatDate(sale.createdAt)}
                            </TableCell>
                            <TableCell className="text-foreground">
                              {sale.clientName || 'Venta directa'}
                            </TableCell>
                            <TableCell className="text-right text-foreground">
                              {formatPrice(sale.total)}
                            </TableCell>
                            <TableCell className="text-center">
                              <Badge variant={sale.paymentType === 'cash' ? 'default' : 'secondary'}>
                                {formatPaymentType(sale.paymentType)}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-center">
                              {sale.invoiceEmitted ? (
                                <Badge variant="outline" className="text-success border-success">
                                  Emitida
                                </Badge>
                              ) : (
                                <Badge variant="outline" className="text-warning border-warning">
                                  Pendiente
                                </Badge>
                              )}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </CardContent>
              </Card>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDetailModal(false)}>
              Cerrar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <ConfirmDialog
        open={!!deleteId}
        onOpenChange={() => setDeleteId(null)}
        onConfirm={handleDelete}
        title="Eliminar Vendedor"
        description="¿Estás seguro de que deseas eliminar este vendedor? Esta acción no se puede deshacer."
      />
    </MainLayout>
  )
}
