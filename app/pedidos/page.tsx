'use client'

import React from "react"

import { useEffect, useState } from 'react'
import { MainLayout } from '@/components/layout/main-layout'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { DataTableSkeleton } from '@/components/ui/data-table-skeleton'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { ClientModal } from '@/components/clientes/client-modal'
import { ordersApi, salesApi, clientsApi, paymentsApi, remitoApi } from '@/lib/api'
import type { Order, OrderStatus, Client } from '@/lib/types'
import { Clock, ChefHat, Truck, CheckCircle, Package, Banknote, CreditCard, FileText, Loader2, UserPlus, Eye, X, User, MapPin, Calendar, Box } from 'lucide-react'
import { useAuth } from '@/hooks/use-auth'

const statusConfig: Record<OrderStatus, { label: string; icon: React.ElementType; color: string; dotColor: string }> = {
  pending: { label: 'Pendiente', icon: Clock, color: 'text-amber-600', dotColor: 'bg-amber-500' },
  preparation: { label: 'Preparación', icon: ChefHat, color: 'text-blue-600', dotColor: 'bg-blue-500' },
  delivery: { label: 'En Reparto', icon: Truck, color: 'text-orange-600', dotColor: 'bg-orange-500' },
  completed: { label: 'Completado', icon: CheckCircle, color: 'text-green-600', dotColor: 'bg-green-500' },
}

const statusFlow: OrderStatus[] = ['pending', 'preparation', 'delivery', 'completed']

export default function PedidosPage() {
  const { user } = useAuth()
  const [orders, setOrders] = useState<Order[]>([])
  const [clients, setClients] = useState<Client[]>([])
  const [loading, setLoading] = useState(true)
  const [filterStatus, setFilterStatus] = useState<string>('all')
  
  // Detail modal state
  const [showDetailModal, setShowDetailModal] = useState(false)
  const [detailOrder, setDetailOrder] = useState<Order | null>(null)
  
  // Payment modal state
  const [showPaymentModal, setShowPaymentModal] = useState(false)
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null)
  const [paymentType, setPaymentType] = useState<'cash' | 'credit' | 'split'>('cash')
  const [cashAmount, setCashAmount] = useState('')
  const [selectedClientId, setSelectedClientId] = useState<string>('')
  const [clientSearch, setClientSearch] = useState('')
  const [showClientModal, setShowClientModal] = useState(false)
  const [processingPayment, setProcessingPayment] = useState(false)
  
  // Success modal state
  const [showSuccessModal, setShowSuccessModal] = useState(false)
  const [lastSaleResult, setLastSaleResult] = useState<{ paymentType: string; total: number; saleId: string; client?: Client } | null>(null)
  const [emittingInvoice, setEmittingInvoice] = useState(false)
  const [invoiceEmitted, setInvoiceEmitted] = useState(false)
  const [invoiceNumber, setInvoiceNumber] = useState<string | null>(null)
  const [invoicePdfUrl, setInvoicePdfUrl] = useState<string | null>(null)
  const [invoiceWhatsappUrl, setInvoiceWhatsappUrl] = useState<string | null>(null)
  const [remitoEmitted, setRemitoEmitted] = useState(false)
  const [remitoNumber, setRemitoNumber] = useState<string | null>(null)
  const [remitoPdfUrl, setRemitoPdfUrl] = useState<string | null>(null)
  const [remitoWhatsappUrl, setRemitoWhatsappUrl] = useState<string | null>(null)
  const [documentType, setDocumentType] = useState<'invoice' | 'remito'>('invoice')

  useEffect(() => {
    loadData()
  }, [])

  useEffect(() => {
    if (selectedOrder?.clientId) {
      setSelectedClientId(selectedOrder.clientId)
      setPaymentType('cash')
    } else if (selectedOrder) {
      setSelectedClientId('')
      setPaymentType('cash')
    }
  }, [selectedOrder])

  const loadData = async () => {
    try {
      const [ordersData, clientsData] = await Promise.all([
        ordersApi.getAll(),
        clientsApi.getAll(),
      ])
      setOrders(ordersData)
      setClients(clientsData)
    } catch (error) {
      console.error('Error loading data:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleStatusChange = async (orderId: string, newStatus: OrderStatus) => {
    // If completing the order, show payment modal
    if (newStatus === 'completed') {
      const order = orders.find(o => o.id === orderId)
      if (order) {
        setSelectedOrder(order)
        setShowDetailModal(false)
        setShowPaymentModal(true)
      }
      return
    }
    
    try {
      const updated = await ordersApi.updateStatus(orderId, newStatus)
      setOrders(orders.map(o => o.id === orderId ? updated : o))
      if (detailOrder?.id === orderId) {
        setDetailOrder(updated)
      }
    } catch (error) {
      console.error('Error updating order status:', error)
    }
  }

  const calculateOrderTotal = (order: Order) => {
    // In real app, this would come from the order data
    return order.items.reduce((acc, item) => acc + item.quantity * 2500, 0) // Mock price
  }

  const handleCompleteOrder = async () => {
    if (!selectedOrder) return
    setProcessingPayment(true)
    
    try {
      const total = calculateOrderTotal(selectedOrder)
      const client = clients.find(c => c.id === selectedClientId)

      if ((paymentType === 'credit' || paymentType === 'split') && !selectedClientId) {
        throw new Error('Debe seleccionar un cliente para cuenta corriente')
      }

      const normalizedCashAmount = paymentType === 'split' ? Number(cashAmount || 0) : 0
      if (paymentType === 'split' && (normalizedCashAmount <= 0 || normalizedCashAmount >= total)) {
        throw new Error('El pago en efectivo debe ser mayor a 0 y menor al total')
      }
      
      // Process the sale based on payment type
      const sale = await salesApi.processSale({
        clientId: paymentType === 'cash' ? undefined : client?.id,
        clientName: paymentType === 'cash' ? undefined : client?.name,
        clientPhone: paymentType === 'cash' ? undefined : client?.phone,
        items: selectedOrder.items.map(item => ({
          product: {
            id: item.productId,
            name: item.name,
            price: 2500, // Mock price
            stock: 100,
            description: '',
            imageUrl: '',
            category: '',
            createdAt: new Date(),
          },
          quantity: item.quantity,
        })),
        paymentType: paymentType === 'split' ? 'credit' : paymentType,
        source: 'order',
        createOrder: false,
        orderId: selectedOrder.id,
      })

      if (paymentType === 'split' && client && normalizedCashAmount > 0) {
        await paymentsApi.registerCashPayment({
          clientId: client.id,
          amount: normalizedCashAmount,
          description: `Pago parcial pedido #${selectedOrder.id}`,
        })
      }

      // Update order status to completed
      const updated = await ordersApi.updateStatus(selectedOrder.id, 'completed')
      setOrders(orders.map(o => o.id === selectedOrder.id ? updated : o))
      
      setLastSaleResult({
        paymentType,
        total,
        saleId: sale.id,
        client,
      })
      
      setShowPaymentModal(false)
      setShowSuccessModal(true)
      setSelectedOrder(null)
      setPaymentType('cash')
      setCashAmount('')
      setSelectedClientId('')
      setInvoiceEmitted(false)
      setInvoiceNumber(null)
      setInvoicePdfUrl(null)
      setInvoiceWhatsappUrl(null)
      setRemitoEmitted(false)
      setRemitoNumber(null)
      setRemitoPdfUrl(null)
      setRemitoWhatsappUrl(null)
      setDocumentType('invoice')
    } catch (error) {
      console.error('Error completing order:', error)
      alert(error instanceof Error ? error.message : 'Error al completar el pedido')
    } finally {
      setProcessingPayment(false)
    }
  }

  const buildWhatsappUrl = (phone?: string, pdfUrl?: string, clientName?: string) => {
    if (!phone || !pdfUrl) return null
    const cleanPhone = phone.replace(/[^\d]/g, '')
    if (!cleanPhone) return null
    const message = `Hola${clientName ? ` ${clientName}` : ''}, tu comprobante esta listo: ${pdfUrl}`
    return `https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`
  }

  const handleGenerateDocument = async () => {
    if (!lastSaleResult) return
    setEmittingInvoice(true)
    try {
      if (documentType === 'invoice') {
        const result = await salesApi.emitInvoice(lastSaleResult.saleId, {
          name: lastSaleResult.client?.name,
          phone: lastSaleResult.client?.phone,
          email: lastSaleResult.client?.email,
          taxCategory: lastSaleResult.client?.taxCategory,
        })
        setInvoiceEmitted(true)
        setInvoiceNumber(result.invoiceNumber)
        setInvoicePdfUrl(result.pdfUrl)
        setInvoiceWhatsappUrl(
          result.whatsappUrl ??
            buildWhatsappUrl(lastSaleResult.client?.phone, result.pdfUrl, lastSaleResult.client?.name)
        )
      } else {
        const result = await remitoApi.createRemito(lastSaleResult.saleId)
        setRemitoEmitted(true)
        setRemitoNumber(result.remitoNumber)
        setRemitoPdfUrl(result.pdfUrl)
        setRemitoWhatsappUrl(
          buildWhatsappUrl(lastSaleResult.client?.phone, result.pdfUrl, lastSaleResult.client?.name)
        )
      }
    } catch (error) {
      console.error('Error emitting document:', error)
      alert('Error al emitir el documento')
    } finally {
      setEmittingInvoice(false)
    }
  }

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: 'ARS',
    }).format(price)
  }

  const filteredClients = clients.filter((client) => {
    const query = clientSearch.trim().toLowerCase()
    if (!query) return true
    return (
      (client.dni?.toLowerCase().includes(query) ?? false) ||
      client.name.toLowerCase().includes(query)
    )
  })

  const handleSaveClient = async (clientData: Omit<Client, 'id' | 'createdAt' | 'currentBalance'>) => {
    const newClient = await clientsApi.create(clientData)
    setClients((prev) => [...prev, newClient])
    setSelectedClientId(newClient.id)
    setShowClientModal(false)
  }

  const filteredOrders = (filterStatus === 'all'
    ? orders
    : orders.filter(o => o.status === filterStatus)
  ).filter((order) => {
    if (user?.role === 'seller') {
      return order.sellerId === user.sellerId
    }
    return true
  })

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('es-AR', {
      day: '2-digit',
      month: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date(date))
  }

  const getNextStatus = (currentStatus: OrderStatus): OrderStatus | null => {
    const currentIndex = statusFlow.indexOf(currentStatus)
    if (currentIndex < statusFlow.length - 1) {
      return statusFlow[currentIndex + 1]
    }
    return null
  }

  return (
    <MainLayout title="Pedidos" description="Seguimiento de pedidos y entregas">
      {/* Filters & Stats */}
      <div className="mb-6 space-y-4">
        <div className="flex flex-col sm:flex-row gap-3 justify-between">
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="w-full sm:w-48">
              <SelectValue placeholder="Filtrar por estado" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              {statusFlow.map((status) => (
                <SelectItem key={status} value={status}>
                  {statusConfig[status].label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <div className="flex gap-2 overflow-x-auto pb-2 sm:pb-0">
            {statusFlow.map((status) => {
              const count = orders.filter(o => o.status === status).length
              const config = statusConfig[status]
              return (
                <div
                  key={status}
                  className="flex items-center gap-2 px-3 py-1.5 bg-white border rounded-lg whitespace-nowrap"
                >
                  <div className={`w-2 h-2 rounded-full ${config.dotColor}`} />
                  <span className="text-sm font-medium">{count}</span>
                  <span className="text-xs text-gray-500 hidden sm:inline">{config.label}</span>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* Orders List */}
      {loading ? (
        <DataTableSkeleton columns={5} rows={5} />
      ) : filteredOrders.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Package className="h-12 w-12 text-gray-400 mx-auto mb-3" />
            <p className="text-gray-500">No hay pedidos</p>
          </CardContent>
        </Card>
      ) : (
        <div className="bg-white border rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Pedido
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider hidden md:table-cell">
                    Cliente
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider hidden lg:table-cell">
                    Productos
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider hidden sm:table-cell">
                    Estado
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Acción
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {filteredOrders.map((order) => {
                  const config = statusConfig[order.status]
                  return (
                    <tr key={order.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-4">
                        <div>
                          <p className="font-semibold text-gray-900">#{order.id}</p>
                          <p className="text-xs text-gray-500 mt-0.5">{formatDate(order.createdAt)}</p>
                          <div className="sm:hidden mt-2">
                            <div className="flex items-center gap-2">
                              <div className={`w-2 h-2 rounded-full ${config.dotColor}`} />
                              <span className={`text-xs font-medium ${config.color}`}>
                                {config.label}
                              </span>
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-4 hidden md:table-cell">
                        <p className="text-sm font-medium text-gray-900">
                          {order.clientName || 'Venta directa'}
                        </p>
                        <p className="text-xs text-gray-500 mt-0.5">
                          {order.sellerName || 'Sin vendedor'}
                        </p>
                      </td>
                      <td className="px-4 py-4 hidden lg:table-cell">
                        <p className="text-sm text-gray-600">
                          {order.items.length} {order.items.length === 1 ? 'producto' : 'productos'}
                        </p>
                      </td>
                      <td className="px-4 py-4 hidden sm:table-cell">
                        <div className="flex items-center gap-2">
                          <div className={`w-2 h-2 rounded-full ${config.dotColor}`} />
                          <span className={`text-sm font-medium ${config.color}`}>
                            {config.label}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-4 text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setDetailOrder(order)
                            setShowDetailModal(true)
                          }}
                          className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                        >
                          <Eye className="h-4 w-4 mr-1" />
                          Ver
                        </Button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Detail Modal */}
      <Dialog open={showDetailModal} onOpenChange={setShowDetailModal}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <div className="flex items-center justify-between">
              <DialogTitle className="text-xl">Pedido #{detailOrder?.id}</DialogTitle>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowDetailModal(false)}
                className="h-8 w-8 p-0"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
            <p className="text-sm text-gray-500 sr-only">Detalles completos del pedido</p>
          </DialogHeader>

          {detailOrder && (
            <div className="space-y-6">
              {/* Status */}
              <div>
                <Label className="text-xs text-gray-500 uppercase tracking-wide mb-2 block">
                  Estado actual
                </Label>
                <div className="flex items-center gap-2">
                  {React.createElement(statusConfig[detailOrder.status].icon, {
                    className: `h-5 w-5 ${statusConfig[detailOrder.status].color}`
                  })}
                  <span className={`font-semibold ${statusConfig[detailOrder.status].color}`}>
                    {statusConfig[detailOrder.status].label}
                  </span>
                </div>
              </div>

              {/* Client Info */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Label className="text-xs text-gray-500 uppercase tracking-wide mb-2 flex items-center gap-1">
                    <User className="h-3 w-3" />
                    Cliente
                  </Label>
                  <p className="font-medium text-gray-900">
                    {detailOrder.clientName || 'Venta directa'}
                  </p>
                </div>
                <div>
                  <Label className="text-xs text-gray-500 uppercase tracking-wide mb-2 block">
                    Vendedor
                  </Label>
                  <p className="font-medium text-gray-900">
                    {detailOrder.sellerName || 'Sin asignar'}
                  </p>
                </div>
              </div>

              {/* Address & Date */}
              <div className="space-y-3">
                <div>
                  <Label className="text-xs text-gray-500 uppercase tracking-wide mb-2 flex items-center gap-1">
                    <MapPin className="h-3 w-3" />
                    Dirección de entrega
                  </Label>
                  <p className="text-gray-900">{detailOrder.address}</p>
                </div>
                <div>
                  <Label className="text-xs text-gray-500 uppercase tracking-wide mb-2 flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    Fecha de creación
                  </Label>
                  <p className="text-gray-900">{formatDate(detailOrder.createdAt)}</p>
                </div>
              </div>

              {/* Products */}
              <div>
                <Label className="text-xs text-gray-500 uppercase tracking-wide mb-3 flex items-center gap-1">
                  <Box className="h-3 w-3" />
                  Productos
                </Label>
                <div className="bg-gray-50 rounded-lg p-4 space-y-2">
                  {detailOrder.items.map((item, index) => (
                    <div key={index} className="flex justify-between items-center">
                      <span className="text-sm text-gray-900">{item.name}</span>
                      <span className="font-semibold text-gray-900">x{item.quantity}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Timeline */}
              <div>
                <Label className="text-xs text-gray-500 uppercase tracking-wide mb-3 block">
                  Progreso
                </Label>
                <div className="space-y-2">
                  {statusFlow.map((status, index) => {
                    const isCompleted = statusFlow.indexOf(detailOrder.status) >= index
                    const isCurrent = detailOrder.status === status
                    const stepConfig = statusConfig[status]
                    
                    return (
                      <div key={status} className="flex items-center gap-3">
                        <div className={`flex items-center justify-center w-8 h-8 rounded-full border-2 ${
                          isCompleted 
                            ? `${stepConfig.dotColor} border-transparent`
                            : 'bg-white border-gray-300'
                        }`}>
                          {isCompleted ? (
                            <CheckCircle className="h-4 w-4 text-white" />
                          ) : (
                            <div className="w-2 h-2 rounded-full bg-gray-300" />
                          )}
                        </div>
                        <div className="flex-1">
                          <p className={`text-sm font-medium ${
                            isCompleted ? 'text-gray-900' : 'text-gray-400'
                          }`}>
                            {stepConfig.label}
                          </p>
                        </div>
                        {isCurrent && (
                          <Badge variant="secondary" className="text-xs">
                            Actual
                          </Badge>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>

              {/* Action Button */}
              {getNextStatus(detailOrder.status) && (
                <Button
                  className="w-full"
                  onClick={() => handleStatusChange(detailOrder.id, getNextStatus(detailOrder.status)!)}
                >
                  {getNextStatus(detailOrder.status) === 'completed' 
                    ? 'Completar Pedido' 
                    : `Avanzar a ${statusConfig[getNextStatus(detailOrder.status)!].label}`}
                </Button>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Payment Modal */}
      <Dialog open={showPaymentModal} onOpenChange={setShowPaymentModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Completar Pedido</DialogTitle>
            <p className="text-sm text-gray-500 sr-only">Seleccionar método de pago para completar el pedido</p>
          </DialogHeader>
          
          {selectedOrder && (
            <div className="py-4">
              <div className="mb-4 p-3 bg-muted rounded-lg">
                <p className="text-sm text-muted-foreground">Pedido #{selectedOrder.id}</p>
                <p className="font-medium text-foreground">
                  {selectedOrder.clientName || 'Venta directa'}
                </p>
              </div>

              <p className="text-sm text-muted-foreground mb-3">Seleccionar método de pago:</p>
              
              <RadioGroup
                value={paymentType}
                onValueChange={(v) => setPaymentType(v as 'cash' | 'credit' | 'split')}
                className="space-y-3"
              >
                <div className="flex items-center space-x-3 p-4 rounded-lg border border-border hover:bg-muted/50 cursor-pointer">
                  <RadioGroupItem value="cash" id="cash-order" />
                  <Label htmlFor="cash-order" className="flex items-center gap-3 cursor-pointer flex-1">
                    <div className="h-10 w-10 rounded-full bg-success/10 flex items-center justify-center">
                      <Banknote className="h-5 w-5 text-success" />
                    </div>
                    <div>
                      <p className="font-medium text-foreground">Efectivo</p>
                      <p className="text-sm text-muted-foreground">Se registra en caja</p>
                    </div>
                  </Label>
                </div>
                
                <div className="flex items-center space-x-3 p-4 rounded-lg border border-border hover:bg-muted/50 cursor-pointer">
                  <RadioGroupItem value="credit" id="credit-order" />
                  <Label htmlFor="credit-order" className="flex items-center gap-3 cursor-pointer flex-1">
                    <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                      <CreditCard className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <p className="font-medium text-foreground">Cuenta Corriente</p>
                      <p className="text-sm text-muted-foreground">Se suma a deudores</p>
                    </div>
                  </Label>
                </div>

                <div className="flex items-center space-x-3 p-4 rounded-lg border border-border hover:bg-muted/50 cursor-pointer">
                  <RadioGroupItem value="split" id="split-order" />
                  <Label htmlFor="split-order" className="flex items-center gap-3 cursor-pointer flex-1">
                    <div className="h-10 w-10 rounded-full bg-warning/10 flex items-center justify-center">
                      <Banknote className="h-5 w-5 text-warning" />
                    </div>
                    <div>
                      <p className="font-medium text-foreground">Pago Parcial</p>
                      <p className="text-sm text-muted-foreground">Parte en efectivo y el resto a cuenta</p>
                    </div>
                  </Label>
                </div>
              </RadioGroup>

              {(paymentType === 'credit' || paymentType === 'split') && (
                <div className="mt-4 space-y-3">
                  <Label>Cliente</Label>
                  <Input
                    placeholder="Buscar por DNI o nombre"
                    value={clientSearch}
                    onChange={(e) => setClientSearch(e.target.value)}
                  />
                  <div className="flex gap-2">
                    <Select value={selectedClientId} onValueChange={setSelectedClientId}>
                      <SelectTrigger className="flex-1">
                        <SelectValue placeholder="Seleccionar cliente" />
                      </SelectTrigger>
                      <SelectContent>
                        {filteredClients.map((client) => (
                          <SelectItem key={client.id} value={client.id}>
                            {client.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Button type="button" variant="outline" onClick={() => setShowClientModal(true)}>
                      <UserPlus className="h-4 w-4 mr-2" />
                      Nuevo
                    </Button>
                  </div>
                  {clientSearch && filteredClients.length === 0 && (
                    <p className="text-xs text-muted-foreground">
                      No se encontró el cliente. Puedes crearlo con "Nuevo".
                    </p>
                  )}
                </div>
              )}

              {paymentType === 'split' && (
                <div className="mt-4 space-y-2">
                  <Label htmlFor="cashAmount">Monto en efectivo (ARS)</Label>
                  <Input
                    id="cashAmount"
                    type="number"
                    min="1"
                    value={cashAmount}
                    onChange={(e) => setCashAmount(e.target.value)}
                    placeholder="0"
                  />
                  <p className="text-xs text-muted-foreground">
                    El resto ({formatPrice(Math.max(calculateOrderTotal(selectedOrder) - Number(cashAmount || 0), 0))}) quedara en cuenta corriente.
                  </p>
                </div>
              )}

              <div className="mt-4 p-4 bg-muted rounded-lg">
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Total del pedido</span>
                  <span className="text-xl font-bold text-foreground">
                    {formatPrice(calculateOrderTotal(selectedOrder))}
                  </span>
                </div>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowPaymentModal(false)}>
              Cancelar
            </Button>
            <Button onClick={handleCompleteOrder} disabled={processingPayment}>
              {processingPayment ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Procesando...
                </>
              ) : (
                'Confirmar'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ClientModal
        open={showClientModal}
        onOpenChange={setShowClientModal}
        client={null}
        onSave={handleSaveClient}
      />

      {/* Success Modal */}
      <Dialog open={showSuccessModal} onOpenChange={setShowSuccessModal}>
        <DialogContent className="sm:max-w-md">
          <p className="text-sm text-gray-500 sr-only">Pedido completado exitosamente</p>
          <div className="text-center py-4">
            <div className="mx-auto h-16 w-16 rounded-full bg-success/10 flex items-center justify-center mb-4">
              <CheckCircle className="h-8 w-8 text-success" />
            </div>
            <h2 className="text-xl font-bold text-foreground mb-2">
              Pedido Completado
            </h2>
            <p className="text-muted-foreground">
              {lastSaleResult?.paymentType === 'cash'
                ? 'El pago se registró en caja'
                : 'Se sumó a la cuenta corriente del cliente'}
            </p>
            
            <div className="mt-6 p-4 bg-muted rounded-lg">
              <div className="flex justify-between items-center mb-2">
                <span className="text-muted-foreground">Total</span>
                <span className="text-lg font-bold text-foreground">
                  {formatPrice(lastSaleResult?.total || 0)}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Método</span>
                <Badge variant={lastSaleResult?.paymentType === 'cash' ? 'default' : 'secondary'}>
                  {lastSaleResult?.paymentType === 'cash' ? 'Efectivo' : 'Cuenta Corriente'}
                </Badge>
              </div>
            </div>

            <div className="mt-4 p-4 bg-muted rounded-lg">
              <p className="text-sm text-muted-foreground mb-3">Seleccioná qué emitir:</p>
              <RadioGroup
                value={documentType}
                onValueChange={(value) => setDocumentType(value as 'invoice' | 'remito')}
                className="space-y-2"
              >
                <div className="flex items-center gap-2">
                  <RadioGroupItem value="invoice" id="order-invoice" />
                  <Label htmlFor="order-invoice">Boleta</Label>
                </div>
                <div className="flex items-center gap-2">
                  <RadioGroupItem value="remito" id="order-remito" />
                  <Label htmlFor="order-remito">Remito</Label>
                </div>
              </RadioGroup>
            </div>

            {invoiceEmitted && invoiceNumber && (
              <div className="mt-4 p-3 bg-success/10 rounded-lg">
                <p className="text-sm text-success font-medium">
                  Boleta emitida: {invoiceNumber}
                </p>
              </div>
            )}
            {remitoEmitted && remitoNumber && (
              <div className="mt-4 p-3 bg-success/10 rounded-lg">
                <p className="text-sm text-success font-medium">
                  Remito emitido: {remitoNumber}
                </p>
              </div>
            )}
          </div>

          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button
              variant="outline"
              className="w-full sm:w-auto bg-transparent"
              onClick={handleGenerateDocument}
              disabled={
                emittingInvoice ||
                (documentType === 'invoice' && invoiceEmitted) ||
                (documentType === 'remito' && remitoEmitted)
              }
            >
              {emittingInvoice ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Emitiendo...
                </>
              ) : (
                <>
                  <FileText className="h-4 w-4 mr-2" />
                  {documentType === 'invoice' ? 'Emitir Boleta' : 'Emitir Remito'}
                </>
              )}
            </Button>
            {invoiceWhatsappUrl && (
              <Button className="w-full sm:w-auto" asChild>
                <a href={invoiceWhatsappUrl} target="_blank" rel="noreferrer">
                  Enviar Boleta por WhatsApp
                </a>
              </Button>
            )}
            {remitoWhatsappUrl && (
              <Button className="w-full sm:w-auto" asChild>
                <a href={remitoWhatsappUrl} target="_blank" rel="noreferrer">
                  Enviar Remito por WhatsApp
                </a>
              </Button>
            )}
            <Button
              className="w-full sm:w-auto"
              onClick={() => setShowSuccessModal(false)}
            >
              Cerrar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </MainLayout>
  )
}