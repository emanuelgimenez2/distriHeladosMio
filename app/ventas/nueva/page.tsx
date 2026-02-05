'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { MainLayout } from '@/components/layout/main-layout'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { productsApi, clientsApi, salesApi, invoiceApi, remitoApi, sellersApi } from '@/lib/api'
import type { Product, Client, CartItem, Seller } from '@/lib/types'
import { 
  Search, Plus, Minus, Trash2, ShoppingCart, CreditCard, Banknote, 
  Loader2, CheckCircle, UserPlus, User, ArrowLeft, FileText, Receipt
} from 'lucide-react'
import { toast } from 'sonner'

export default function NuevaVentaPage() {
  const router = useRouter()
  const [products, setProducts] = useState<Product[]>([])
  const [clients, setClients] = useState<Client[]>([])
  const [sellers, setSellers] = useState<Seller[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [cart, setCart] = useState<CartItem[]>([])
  const [selectedClient, setSelectedClient] = useState<string>('')
  const [selectedSeller, setSelectedSeller] = useState<string>('')
  const [paymentType, setPaymentType] = useState<'cash' | 'credit'>('cash')
  const [clientPhone, setClientPhone] = useState('')
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false)
  const [processing, setProcessing] = useState(false)
  const [saleComplete, setSaleComplete] = useState(false)
  const [invoiceNumber, setInvoiceNumber] = useState('')
  const [invoicePdfUrl, setInvoicePdfUrl] = useState('')
  const [remitoNumber, setRemitoNumber] = useState('')
  const [remitoPdfUrl, setRemitoPdfUrl] = useState('')
  const [docDialogOpen, setDocDialogOpen] = useState(false)
  const [docType, setDocType] = useState<'invoice' | 'remito'>('invoice')
  const [generatingDoc, setGeneratingDoc] = useState(false)
  const [lastSaleId, setLastSaleId] = useState<string>('')
  
  // New client modal state
  const [newClientModalOpen, setNewClientModalOpen] = useState(false)
  const [savingClient, setSavingClient] = useState(false)
  const [newClientForm, setNewClientForm] = useState({
    name: '',
    cuit: '',
    phone: '',
    email: '',
    creditLimit: 50000,
  })

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      const [productsData, clientsData, sellersData] = await Promise.all([
        productsApi.getAll(),
        clientsApi.getAll(),
        sellersApi.getAll(),
      ])
      setProducts(productsData)
      setClients(clientsData)
      setSellers(sellersData.filter(s => s.isActive))
    } catch (error) {
      console.error('Error loading data:', error)
    } finally {
      setLoading(false)
    }
  }

  const addToCart = (product: Product) => {
    const existing = cart.find(item => item.product.id === product.id)
    if (existing) {
      if (existing.quantity < product.stock) {
        setCart(cart.map(item =>
          item.product.id === product.id
            ? { ...item, quantity: item.quantity + 1 }
            : item
        ))
      }
    } else {
      setCart([...cart, { product, quantity: 1 }])
    }
  }

  const updateQuantity = (productId: string, delta: number) => {
    setCart(cart.map(item => {
      if (item.product.id === productId) {
        const newQuantity = item.quantity + delta
        if (newQuantity <= 0) return item
        if (newQuantity > item.product.stock) return item
        return { ...item, quantity: newQuantity }
      }
      return item
    }))
  }

  const removeFromCart = (productId: string) => {
    setCart(cart.filter(item => item.product.id !== productId))
  }

  const cartTotal = cart.reduce((acc, item) => acc + item.product.price * item.quantity, 0)

  const filteredProducts = products.filter(product =>
    product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    product.category.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const selectedClientData = clients.find(c => c.id === selectedClient)
  const selectedSellerData = sellers.find(s => s.id === selectedSeller)

  useEffect(() => {
    if (paymentType === 'credit' && selectedClientData?.phone) {
      setClientPhone(selectedClientData.phone)
    }
  }, [paymentType, selectedClientData])

  const canProcessSale = () => {
    if (cart.length === 0) return false
    if (paymentType === 'credit') {
      if (!selectedClient) return false
      if (!selectedClientData) return false
      if (selectedClientData.currentBalance + cartTotal > selectedClientData.creditLimit) return false
    }
    return true
  }

  const handleProcessSale = async () => {
    setProcessing(true)
    try {
      const resolvedClientPhone = clientPhone || selectedClientData?.phone
      const resolvedClientName = paymentType === 'credit' ? selectedClientData?.name : undefined
      const resolvedClientEmail = paymentType === 'credit' ? selectedClientData?.email : undefined

      const sale = await salesApi.processSale({
        clientId: paymentType === 'credit' ? selectedClient : undefined,
        clientName: resolvedClientName,
        clientPhone: resolvedClientPhone,
        sellerId: selectedSeller || undefined,
        sellerName: selectedSellerData?.name,
        items: cart,
        paymentType,
        source: 'direct',
        createOrder: false,
      })
      setLastSaleId(sale.id)
      setSaleComplete(true)
      toast.success('Venta procesada correctamente')
    } catch (error) {
      console.error('Error processing sale:', error)
      toast.error('Error al procesar la venta')
    } finally {
      setProcessing(false)
      setConfirmDialogOpen(false)
    }
  }

  const handleNewSale = () => {
    setCart([])
    setSelectedClient('')
    setSelectedSeller('')
    setPaymentType('cash')
    setClientPhone('')
    setSaleComplete(false)
    setInvoiceNumber('')
    setInvoicePdfUrl('')
    setRemitoNumber('')
    setRemitoPdfUrl('')
    setDocDialogOpen(false)
    setGeneratingDoc(false)
    setLastSaleId('')
    loadData()
  }

  const handleGenerateInvoice = async () => {
    if (!lastSaleId) return
    setGeneratingDoc(true)
    try {
      const invoice = await invoiceApi.createInvoice(lastSaleId, {
        name: paymentType === 'credit' ? selectedClientData?.name : undefined,
        phone: clientPhone || selectedClientData?.phone,
        email: paymentType === 'credit' ? selectedClientData?.email : undefined,
      })
      setInvoiceNumber(invoice.invoiceNumber)
      setInvoicePdfUrl(invoice.pdfUrl)
      toast.success('Boleta generada correctamente')
    } catch (error) {
      console.error('Error generating invoice:', error)
      toast.error('Error al generar la boleta')
    } finally {
      setGeneratingDoc(false)
      setDocDialogOpen(false)
    }
  }

  const handleGenerateRemito = async () => {
    if (!lastSaleId) return
    setGeneratingDoc(true)
    try {
      const remito = await remitoApi.createRemito(lastSaleId)
      setRemitoNumber(remito.remitoNumber)
      setRemitoPdfUrl(remito.pdfUrl)
      toast.success('Remito generado correctamente')
    } catch (error) {
      console.error('Error generating remito:', error)
      toast.error('Error al generar el remito')
    } finally {
      setGeneratingDoc(false)
      setDocDialogOpen(false)
    }
  }

  const handleCreateNewClient = async () => {
    if (!newClientForm.name.trim() || !newClientForm.cuit.trim()) {
      toast.error('Nombre y CUIT son requeridos')
      return
    }
    
    setSavingClient(true)
    try {
      const newClient = await clientsApi.create({
        name: newClientForm.name,
        cuit: newClientForm.cuit,
        phone: newClientForm.phone,
        email: newClientForm.email,
        creditLimit: newClientForm.creditLimit,
        dni: '',
        address: '',
        taxCategory: 'consumidor_final',
        notes: '',
      })
      setClients([newClient, ...clients])
      setSelectedClient(newClient.id)
      setNewClientModalOpen(false)
      setNewClientForm({
        name: '',
        cuit: '',
        phone: '',
        email: '',
        creditLimit: 50000,
      })
      toast.success('Cliente creado correctamente')
    } catch (error) {
      console.error('Error creating client:', error)
      toast.error('Error al crear el cliente')
    } finally {
      setSavingClient(false)
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: 'ARS',
      minimumFractionDigits: 0,
    }).format(amount)
  }

  // Sale Complete Screen
  if (saleComplete) {
    return (
      <MainLayout>
        <div className="flex flex-col min-h-[80vh]">
          {/* Back button */}
          <div className="mb-4">
            <Button variant="ghost" size="sm" onClick={() => router.push('/ventas')} className="gap-2">
              <ArrowLeft className="h-4 w-4" />
              Volver
            </Button>
          </div>

          {/* Success Card */}
          <div className="flex-1 flex items-center justify-center px-4">
            <Card className="w-full max-w-md">
              <CardContent className="pt-8 pb-6 px-4 sm:px-6">
                {/* Success Icon */}
                <div className="flex justify-center mb-6">
                  <div className="p-4 rounded-full bg-emerald-500/10">
                    <CheckCircle className="h-14 w-14 text-emerald-500" />
                  </div>
                </div>
                
                {/* Title & Description */}
                <h2 className="text-2xl font-semibold text-foreground text-center mb-2">
                  Venta Completada
                </h2>
                <p className="text-muted-foreground text-center mb-6">
                  La venta se ha procesado correctamente
                </p>
                
                {/* Document Status */}
                <div className="rounded-lg bg-muted/50 p-4 mb-6">
                  <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground mb-1">
                    {invoiceNumber ? (
                      <FileText className="h-4 w-4" />
                    ) : remitoNumber ? (
                      <Receipt className="h-4 w-4" />
                    ) : (
                      <FileText className="h-4 w-4" />
                    )}
                    <span>
                      {invoiceNumber ? 'Boleta generada' : remitoNumber ? 'Remito generado' : 'Documentacion pendiente'}
                    </span>
                  </div>
                  {invoiceNumber && (
                    <p className="text-lg font-semibold text-foreground text-center">{invoiceNumber}</p>
                  )}
                  {remitoNumber && (
                    <p className="text-lg font-semibold text-foreground text-center">{remitoNumber}</p>
                  )}
                  {(invoicePdfUrl || remitoPdfUrl) && (
                    <div className="flex justify-center mt-2">
                      <a
                        href={invoicePdfUrl || remitoPdfUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="text-sm text-primary hover:underline"
                      >
                        {invoicePdfUrl ? 'Ver Boleta' : 'Ver Remito'}
                      </a>
                    </div>
                  )}
                </div>

                {/* Action Buttons - Stacked for mobile */}
                <div className="space-y-3">
                  {!invoiceNumber && !remitoNumber && (
                    <div className="grid grid-cols-2 gap-3">
                      <Button
                        variant="outline"
                        className="w-full gap-2 bg-transparent"
                        onClick={() => {
                          setDocType('invoice')
                          setDocDialogOpen(true)
                        }}
                      >
                        <FileText className="h-4 w-4" />
                        <span className="hidden sm:inline">Generar</span> Boleta
                      </Button>
                      <Button
                        variant="outline"
                        className="w-full gap-2 bg-transparent"
                        onClick={() => {
                          setDocType('remito')
                          setDocDialogOpen(true)
                        }}
                      >
                        <Receipt className="h-4 w-4" />
                        <span className="hidden sm:inline">Generar</span> Remito
                      </Button>
                    </div>
                  )}
                  
                  <Button 
                    variant="outline" 
                    className="w-full bg-transparent"
                    onClick={() => router.push('/ventas')}
                  >
                    Ver Ventas
                  </Button>
                  
                  <Button 
                    className="w-full"
                    onClick={handleNewSale}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Nueva Venta
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Document Generation Dialog */}
        <ConfirmDialog
          open={docDialogOpen}
          onOpenChange={setDocDialogOpen}
          title={docType === 'invoice' ? 'Generar Boleta' : 'Generar Remito'}
          description={
            docType === 'invoice'
              ? 'Se generara la boleta fiscal para esta venta.'
              : 'Se generara un remito de entrega para esta venta.'
          }
          confirmText={generatingDoc ? 'Generando...' : 'Generar'}
          confirmDisabled={generatingDoc}
          onConfirm={docType === 'invoice' ? handleGenerateInvoice : handleGenerateRemito}
        />
      </MainLayout>
    )
  }

  return (
    <MainLayout title="Nueva Venta" description="Registra una nueva venta">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Products Section */}
        <div className="lg:col-span-2 space-y-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar productos..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>

          {/* Products Grid */}
          {loading ? (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <Skeleton key={i} className="h-48" />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {filteredProducts.map((product) => {
                const inCart = cart.find(item => item.product.id === product.id)
                return (
                  <Card
                    key={product.id}
                    className={`cursor-pointer transition-all hover:shadow-md ${
                      product.stock === 0 ? 'opacity-50' : ''
                    } ${inCart ? 'ring-2 ring-primary' : ''}`}
                    onClick={() => product.stock > 0 && addToCart(product)}
                  >
                    <CardContent className="p-4">
                      <img
                        src={product.imageUrl || "/placeholder.svg"}
                        alt={product.name}
                        className="w-full h-24 object-cover rounded-lg mb-3"
                      />
                      <h3 className="font-medium text-sm text-foreground line-clamp-1">
                        {product.name}
                      </h3>
                      <p className="text-xs text-muted-foreground mb-2">
                        Stock: {product.stock} uds
                      </p>
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-foreground">
                          {formatCurrency(product.price)}
                        </span>
                        {inCart && (
                          <span className="text-xs bg-primary text-primary-foreground px-2 py-1 rounded-full">
                            {inCart.quantity}
                          </span>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          )}
        </div>

        {/* Cart Section */}
        <div className="space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <ShoppingCart className="h-5 w-5" />
                Carrito ({cart.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {cart.length === 0 ? (
                <p className="text-muted-foreground text-sm text-center py-8">
                  Agregue productos al carrito
                </p>
              ) : (
                <>
                  <div className="space-y-3 max-h-64 overflow-y-auto">
                    {cart.map((item) => (
                      <div
                        key={item.product.id}
                        className="flex items-center gap-3 p-3 rounded-lg bg-muted/30"
                      >
                        <img
                          src={item.product.imageUrl || "/placeholder.svg"}
                          alt={item.product.name}
                          className="w-12 h-12 rounded-lg object-cover"
                        />
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm text-foreground truncate">
                            {item.product.name}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {formatCurrency(item.product.price)} c/u
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7"
                            onClick={() => updateQuantity(item.product.id, -1)}
                          >
                            <Minus className="h-3 w-3" />
                          </Button>
                          <span className="w-6 text-center text-sm font-medium text-foreground">
                            {item.quantity}
                          </span>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7"
                            onClick={() => updateQuantity(item.product.id, 1)}
                          >
                            <Plus className="h-3 w-3" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7"
                            onClick={() => removeFromCart(item.product.id)}
                          >
                            <Trash2 className="h-3 w-3 text-destructive" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="border-t border-border pt-4">
                    <div className="flex justify-between items-center mb-4">
                      <span className="font-medium text-foreground">Total</span>
                      <span className="text-xl font-bold text-foreground">
                        {formatCurrency(cartTotal)}
                      </span>
                    </div>

                    {/* Seller Selection */}
                    <div className="space-y-3 mb-4">
                      <Label>Vendedor</Label>
                      <Select value={selectedSeller} onValueChange={setSelectedSeller}>
                        <SelectTrigger>
                          <SelectValue placeholder="Seleccionar vendedor (opcional)" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">Sin vendedor</SelectItem>
                          {sellers.map((seller) => (
                            <SelectItem key={seller.id} value={seller.id}>
                              {seller.name} ({seller.commissionRate}%)
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {selectedSellerData && (
                        <p className="text-xs text-muted-foreground">
                          Comision: {formatCurrency(cartTotal * selectedSellerData.commissionRate / 100)}
                        </p>
                      )}
                    </div>

                    {/* Payment Type */}
                    <div className="space-y-3 mb-4">
                      <Label>Tipo de Pago</Label>
                      <div className="grid grid-cols-2 gap-2">
                        <Button
                          type="button"
                          variant={paymentType === 'cash' ? 'default' : 'outline'}
                          className="gap-2"
                          onClick={() => setPaymentType('cash')}
                        >
                          <Banknote className="h-4 w-4" />
                          Contado
                        </Button>
                        <Button
                          type="button"
                          variant={paymentType === 'credit' ? 'default' : 'outline'}
                          className="gap-2"
                          onClick={() => setPaymentType('credit')}
                        >
                          <CreditCard className="h-4 w-4" />
                          A Cuenta
                        </Button>
                      </div>
                    </div>

                    {/* Client Selection (for credit) */}
                    {paymentType === 'credit' && (
                      <div className="space-y-3 mb-4">
                        <div className="flex items-center justify-between">
                          <Label>Cliente</Label>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="h-7 text-xs gap-1"
                            onClick={() => setNewClientModalOpen(true)}
                          >
                            <UserPlus className="h-3.5 w-3.5" />
                            Nuevo
                          </Button>
                        </div>
                        <Select value={selectedClient} onValueChange={setSelectedClient}>
                          <SelectTrigger>
                            <SelectValue placeholder="Seleccionar cliente" />
                          </SelectTrigger>
                          <SelectContent>
                            {clients.map((client) => (
                              <SelectItem key={client.id} value={client.id}>
                                {client.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        {selectedClientData && (
                          <div className="p-3 rounded-lg bg-muted/50 text-sm">
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">Saldo actual</span>
                              <span className="text-foreground">{formatCurrency(selectedClientData.currentBalance)}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">Limite</span>
                              <span className="text-foreground">{formatCurrency(selectedClientData.creditLimit)}</span>
                            </div>
                            <div className="flex justify-between border-t border-border mt-2 pt-2">
                              <span className="text-muted-foreground">Disponible</span>
                              <span className={`font-medium ${
                                selectedClientData.creditLimit - selectedClientData.currentBalance - cartTotal < 0
                                  ? 'text-destructive'
                                  : 'text-emerald-600'
                              }`}>
                                {formatCurrency(selectedClientData.creditLimit - selectedClientData.currentBalance - cartTotal)}
                              </span>
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    <div className="space-y-3 mb-4">
                      <Label htmlFor="phone">Telefono del cliente (opcional)</Label>
                      <Input
                        id="phone"
                        placeholder="Ej: 11 1234 5678"
                        value={clientPhone}
                        onChange={(e) => setClientPhone(e.target.value)}
                      />
                    </div>

                    <Button
                      className="w-full"
                      disabled={!canProcessSale()}
                      onClick={() => setConfirmDialogOpen(true)}
                    >
                      Procesar Venta
                    </Button>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Confirmation Dialog */}
      <ConfirmDialog
        open={confirmDialogOpen}
        onOpenChange={setConfirmDialogOpen}
        title="Confirmar Venta"
        description={`¿Desea procesar la venta por ${formatCurrency(cartTotal)}${
          paymentType === 'credit' && selectedClientData
            ? ` a cuenta de ${selectedClientData.name}`
            : ' en efectivo'
        }${selectedSellerData ? ` (Vendedor: ${selectedSellerData.name})` : ''}?`}
        confirmText={processing ? 'Procesando...' : 'Confirmar'}
        confirmDisabled={processing}
        onConfirm={handleProcessSale}
      />

      {/* New Client Modal */}
      <Dialog open={newClientModalOpen} onOpenChange={setNewClientModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                <User className="h-4 w-4 text-primary" />
              </div>
              Nuevo Cliente Rapido
            </DialogTitle>
            <DialogDescription>
              Crea un cliente con los datos minimos para continuar la venta
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 pt-2">
            <div className="space-y-2">
              <Label htmlFor="newClientName">
                Nombre <span className="text-destructive">*</span>
              </Label>
              <Input
                id="newClientName"
                value={newClientForm.name}
                onChange={(e) => setNewClientForm({ ...newClientForm, name: e.target.value })}
                placeholder="Nombre del cliente"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="newClientCuit">
                CUIT <span className="text-destructive">*</span>
              </Label>
              <Input
                id="newClientCuit"
                value={newClientForm.cuit}
                onChange={(e) => setNewClientForm({ ...newClientForm, cuit: e.target.value })}
                placeholder="20-12345678-9"
              />
            </div>
            
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="newClientPhone">Telefono</Label>
                <Input
                  id="newClientPhone"
                  value={newClientForm.phone}
                  onChange={(e) => setNewClientForm({ ...newClientForm, phone: e.target.value })}
                  placeholder="11 1234 5678"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="newClientEmail">Email</Label>
                <Input
                  id="newClientEmail"
                  type="email"
                  value={newClientForm.email}
                  onChange={(e) => setNewClientForm({ ...newClientForm, email: e.target.value })}
                  placeholder="email@ejemplo.com"
                />
              </div>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="newClientLimit">Limite de Credito</Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">$</span>
                <Input
                  id="newClientLimit"
                  type="number"
                  min="0"
                  step="1000"
                  value={newClientForm.creditLimit}
                  onChange={(e) => setNewClientForm({ ...newClientForm, creditLimit: Number(e.target.value) || 0 })}
                  className="pl-7"
                />
              </div>
            </div>
            
            <div className="flex flex-col-reverse sm:flex-row justify-end gap-3 pt-4 border-t border-border">
              <Button
                type="button"
                variant="outline"
                onClick={() => setNewClientModalOpen(false)}
                disabled={savingClient}
              >
                Cancelar
              </Button>
              <Button 
                onClick={handleCreateNewClient} 
                disabled={savingClient || !newClientForm.name.trim() || !newClientForm.cuit.trim()}
              >
                {savingClient && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Crear y Seleccionar
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </MainLayout>
  )
}
