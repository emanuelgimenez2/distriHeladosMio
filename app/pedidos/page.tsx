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
import { ordersApi, salesApi, clientsApi, paymentsApi } from '@/lib/api'
import type { Order, OrderStatus, Client } from '@/lib/types'
import { Clock, ChefHat, Truck, CheckCircle, Package, Banknote, CreditCard, FileText, Loader2, UserPlus } from 'lucide-react'

const statusConfig: Record<OrderStatus, { label: string; icon: React.ElementType; color: string }> = {
  pending: { label: 'Pendiente', icon: Clock, color: 'bg-warning/10 text-warning' },
  preparation: { label: 'Preparación', icon: ChefHat, color: 'bg-primary/10 text-primary' },
  delivery: { label: 'En Reparto', icon: Truck, color: 'bg-accent/10 text-accent' },
  completed: { label: 'Completado', icon: CheckCircle, color: 'bg-success/10 text-success' },
}

const statusFlow: OrderStatus[] = ['pending', 'preparation', 'delivery', 'completed']

export default function PedidosPage() {
  const [orders, setOrders] = useState<Order[]>([])
  const [clients, setClients] = useState<Client[]>([])
  const [loading, setLoading] = useState(true)
  const [filterStatus, setFilterStatus] = useState<string>('all')
  
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
        setShowPaymentModal(true)
      }
      return
    }
    
    try {
      const updated = await ordersApi.updateStatus(orderId, newStatus)
      setOrders(orders.map(o => o.id === orderId ? updated : o))
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
      // Update order status
      const updated = await ordersApi.updateStatus(selectedOrder.id, 'completed')
      setOrders(orders.map(o => o.id === selectedOrder.id ? updated : o))
      
      const total = calculateOrderTotal(selectedOrder)
      const client = clients.find(c => c.id === selectedClientId)

      if ((paymentType === 'credit' || paymentType === 'split') && !client) {
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
      })

      if (paymentType === 'split' && client && normalizedCashAmount > 0) {
        await paymentsApi.registerCashPayment({
          clientId: client.id,
          amount: normalizedCashAmount,
          description: `Pago parcial pedido #${selectedOrder.id}`,
        })
      }
      
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
    } catch (error) {
      console.error('Error completing order:', error)
    } finally {
      setProcessingPayment(false)
    }
  }

  const handleEmitInvoice = async () => {
    if (!lastSaleResult) return
    setEmittingInvoice(true)
    try {
      const result = await salesApi.emitInvoice(lastSaleResult.saleId, {
        name: lastSaleResult.client?.name,
        phone: lastSaleResult.client?.phone,
        email: lastSaleResult.client?.email,
      })
      setInvoiceEmitted(true)
      setInvoiceNumber(result.invoiceNumber)
    } catch (error) {
      console.error('Error emitting invoice:', error)
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
    return client.cuit.toLowerCase().includes(query) || client.name.toLowerCase().includes(query)
  })

  const handleSaveClient = async (clientData: Omit<Client, 'id' | 'createdAt' | 'currentBalance'>) => {
    const newClient = await clientsApi.create(clientData)
    setClients((prev) => [...prev, newClient])
    setSelectedClientId(newClient.id)
    setShowClientModal(false)
  }

  const filteredOrders = filterStatus === 'all'
    ? orders
    : orders.filter(o => o.status === filterStatus)

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
      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4 justify-between mb-6">
        <div className="flex items-center gap-4">
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Filtrar por estado" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos los estados</SelectItem>
              {statusFlow.map((status) => (
                <SelectItem key={status} value={status}>
                  {statusConfig[status].label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Status Summary */}
        <div className="flex gap-2 flex-wrap">
          {statusFlow.map((status) => {
            const count = orders.filter(o => o.status === status).length
            const config = statusConfig[status]
            return (
              <div
                key={status}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm ${config.color}`}
              >
                <config.icon className="h-4 w-4" />
                <span>{count}</span>
              </div>
            )
          })}
        </div>
      </div>

      {/* Orders List */}
      {loading ? (
        <DataTableSkeleton columns={5} rows={5} />
      ) : filteredOrders.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Package className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">No hay pedidos para mostrar</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4 max-w-4xl mx-auto">
          {filteredOrders.map((order) => {
            const config = statusConfig[order.status]
            const nextStatus = getNextStatus(order.status)
            
            return (
              <Card key={order.id} className="overflow-hidden">
                <CardContent className="p-0">
                  <div className="flex flex-col lg:flex-row">
                    {/* Order Info */}
                    <div className="flex-1 p-3 sm:p-4 lg:p-5">
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <h3 className="font-semibold text-foreground">
                            Pedido #{order.id}
                          </h3>
                          <p className="text-sm text-muted-foreground">
                            {order.clientName || 'Venta directa'}
                          </p>
                        </div>
                        <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs sm:text-sm ${config.color}`}>
                          <config.icon className="h-4 w-4" />
                          {config.label}
                        </div>
                      </div>

                      {/* Items */}
                      <div className="mb-3">
                        <p className="text-xs text-muted-foreground md:hidden">
                          {order.items.length} productos
                        </p>
                        <div className="hidden md:block space-y-1">
                          {order.items.map((item, index) => (
                            <div key={index} className="flex justify-between text-sm">
                              <span className="text-foreground">{item.name}</span>
                              <span className="text-muted-foreground">x{item.quantity}</span>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Address & Time */}
                      <div className="flex flex-wrap gap-3 text-xs sm:text-sm">
                        <div>
                          <span className="text-muted-foreground">Dirección: </span>
                          <span className="text-foreground">{order.address}</span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Creado: </span>
                          <span className="text-foreground">{formatDate(order.createdAt)}</span>
                        </div>
                      </div>
                    </div>

                    {/* Status Timeline */}
                    <div className="border-t lg:border-t-0 lg:border-l border-border p-3 sm:p-4 lg:p-5 lg:w-64 bg-muted/20">
                      <p className="text-xs sm:text-sm font-medium text-foreground mb-3 hidden md:block">
                        Progreso
                      </p>

                      <div className="space-y-2 hidden md:block">
                        {statusFlow.map((status, index) => {
                          const isCompleted = statusFlow.indexOf(order.status) >= index
                          const isCurrent = order.status === status
                          const stepConfig = statusConfig[status]
                          
                          return (
                            <div key={status} className="flex items-center gap-3">
                              <div className={`flex items-center justify-center w-7 h-7 rounded-full ${
                                isCompleted 
                                  ? stepConfig.color
                                  : 'bg-muted text-muted-foreground'
                              }`}>
                                <stepConfig.icon className="h-4 w-4" />
                              </div>
                              <div className="flex-1">
                                <p className={`text-xs ${
                                  isCompleted ? 'text-foreground font-medium' : 'text-muted-foreground'
                                }`}>
                                  {stepConfig.label}
                                </p>
                              </div>
                              {isCurrent && index < statusFlow.length - 1 && (
                                <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                              )}
                            </div>
                          )
                        })}
                      </div>

                      {/* Action Button */}
                      {nextStatus && (
                        <Button
                          className="w-full mt-3"
                          onClick={() => handleStatusChange(order.id, nextStatus)}
                        >
                          {nextStatus === 'completed' ? 'Completar Pedido' : `Avanzar a ${statusConfig[nextStatus].label}`}
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      {/* Payment Modal */}
      <Dialog open={showPaymentModal} onOpenChange={setShowPaymentModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Completar Pedido</DialogTitle>
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
                
                <div className={`flex items-center space-x-3 p-4 rounded-lg border border-border ${selectedOrder?.clientId ? 'hover:bg-muted/50 cursor-pointer' : 'opacity-60'}`}>
                  <RadioGroupItem value="credit" id="credit-order" disabled={!selectedOrder?.clientId} />
                  <Label htmlFor="credit-order" className="flex items-center gap-3 cursor-pointer flex-1">
                    <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                      <CreditCard className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <p className="font-medium text-foreground">Cuenta Corriente</p>
                      <p className="text-sm text-muted-foreground">
                        {selectedOrder?.clientId ? 'Se suma a deudores' : 'Requiere cliente'}
                      </p>
                    </div>
                  </Label>
                </div>

                <div className={`flex items-center space-x-3 p-4 rounded-lg border border-border ${selectedOrder?.clientId ? 'hover:bg-muted/50 cursor-pointer' : 'opacity-60'}`}>
                  <RadioGroupItem value="split" id="split-order" disabled={!selectedOrder?.clientId} />
                  <Label htmlFor="split-order" className="flex items-center gap-3 cursor-pointer flex-1">
                    <div className="h-10 w-10 rounded-full bg-warning/10 flex items-center justify-center">
                      <Banknote className="h-5 w-5 text-warning" />
                    </div>
                    <div>
                      <p className="font-medium text-foreground">Pago Parcial</p>
                      <p className="text-sm text-muted-foreground">
                        {selectedOrder?.clientId ? 'Parte en efectivo y el resto a cuenta' : 'Requiere cliente'}
                      </p>
                    </div>
                  </Label>
                </div>
              </RadioGroup>

              {(paymentType === 'credit' || paymentType === 'split') && (
                <div className="mt-4 space-y-3">
                  <Label>Cliente</Label>
                  <Input
                    placeholder="Buscar por DNI/CUIT o nombre"
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
                      No se encontró el cliente. Puedes crearlo con “Nuevo”.
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

            {invoiceEmitted && invoiceNumber && (
              <div className="mt-4 p-3 bg-success/10 rounded-lg">
                <p className="text-sm text-success font-medium">
                  Boleta emitida: {invoiceNumber}
                </p>
              </div>
            )}
          </div>

          <DialogFooter className="flex-col sm:flex-row gap-2">
            {!invoiceEmitted && (
              <Button
                variant="outline"
                className="w-full sm:w-auto bg-transparent"
                onClick={handleEmitInvoice}
                disabled={emittingInvoice}
              >
                {emittingInvoice ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Emitiendo...
                  </>
                ) : (
                  <>
                    <FileText className="h-4 w-4 mr-2" />
                    Emitir Boleta
                  </>
                )}
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
