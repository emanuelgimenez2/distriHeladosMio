'use client'

import { useEffect, useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { MainLayout } from '@/components/layout/main-layout'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
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
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet'
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
  Loader2, CheckCircle, UserPlus, User, ArrowLeft, FileText, Receipt,
  Sparkles, Package, Percent, X
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
  const [paymentType, setPaymentType] = useState<'cash' | 'credit' | 'mixed'>('cash')
  const [cashAmount, setCashAmount] = useState<number>(0)
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
  const [cartSheetOpen, setCartSheetOpen] = useState(false)

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
      setSellers(sellersData.filter((s) => s.isActive))
    } catch (error) {
      console.error('Error loading data:', error)
    } finally {
      setLoading(false)
    }
  }

  const addToCart = (product: Product) => {
    const existing = cart.find((item) => item.product.id === product.id)
    if (existing) {
      if (existing.quantity < product.stock) {
        setCart(
          cart.map((item) =>
            item.product.id === product.id ? { ...item, quantity: item.quantity + 1 } : item
          )
        )
      }
    } else {
      setCart([...cart, { product, quantity: 1 }])
    }
  }

  const updateQuantity = (productId: string, delta: number) => {
    setCart(
      cart.map((item) => {
        if (item.product.id === productId) {
          const newQuantity = item.quantity + delta
          if (newQuantity <= 0) return item
          if (newQuantity > item.product.stock) return item
          return { ...item, quantity: newQuantity }
        }
        return item
      })
    )
  }

  const removeFromCart = (productId: string) => {
    setCart(cart.filter((item) => item.product.id !== productId))
  }

  const cartTotal = cart.reduce((acc, item) => acc + item.product.price * item.quantity, 0)
  const cartItemsCount = cart.reduce((acc, item) => acc + item.quantity, 0)
  const creditAmount = paymentType === 'mixed' ? Math.max(0, cartTotal - cashAmount) : paymentType === 'credit' ? cartTotal : 0

  const filteredProducts = products.filter(
    (product) =>
      product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      product.category.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const selectedClientData = clients.find((c) => c.id === selectedClient)
  const selectedSellerData = sellers.find((s) => s.id === selectedSeller)

  useEffect(() => {
    if ((paymentType === 'credit' || paymentType === 'mixed') && selectedClientData?.phone) {
      setClientPhone(selectedClientData.phone)
    }
  }, [paymentType, selectedClientData])

  // Reset cash amount when changing payment type
  useEffect(() => {
    if (paymentType === 'cash') {
      setCashAmount(cartTotal)
    } else if (paymentType === 'credit') {
      setCashAmount(0)
    } else if (paymentType === 'mixed') {
      setCashAmount(Math.floor(cartTotal / 2))
    }
  }, [paymentType, cartTotal])

  // MODIFICADO: Cliente requerido para todos los tipos de pago
  const canProcessSale = () => {
    if (cart.length === 0) return false
    // Cliente requerido para TODOS los tipos de pago (incluido contado)
    if (!selectedClient) return false
    if (!selectedClientData) return false
    
    if (paymentType === 'credit' || paymentType === 'mixed') {
      const amountToCredit = paymentType === 'credit' ? cartTotal : creditAmount
      if (selectedClientData.currentBalance + amountToCredit > selectedClientData.creditLimit) return false
    }
    if (paymentType === 'mixed' && cashAmount <= 0) return false
    if (paymentType === 'mixed' && cashAmount >= cartTotal) return false
    return true
  }

  const handleProcessSale = async () => {
    setProcessing(true)
    try {
      const resolvedClientPhone = clientPhone || selectedClientData?.phone
      const resolvedClientName = selectedClientData?.name

      const sale = await salesApi.processSale({
        clientId: selectedClient,
        clientName: resolvedClientName,
        clientPhone: resolvedClientPhone,
        sellerId: selectedSeller || undefined,
        sellerName: selectedSellerData?.name,
        items: cart,
        paymentType,
        cashAmount: paymentType === 'mixed' ? cashAmount : paymentType === 'cash' ? cartTotal : undefined,
        creditAmount: paymentType === 'mixed' ? creditAmount : paymentType === 'credit' ? cartTotal : undefined,
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
    setCashAmount(0)
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
        name: selectedClientData?.name,
        phone: clientPhone || selectedClientData?.phone,
        email: selectedClientData?.email,
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

  // Cart content component (used in both desktop and mobile)
  const CartContent = () => (
    <div className="flex flex-col h-full">
      {cart.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center py-12 text-center">
          <div className="h-16 w-16 rounded-full bg-muted/50 flex items-center justify-center mb-4">
            <ShoppingCart className="h-8 w-8 text-muted-foreground/50" />
          </div>
          <p className="text-muted-foreground text-sm">El carrito esta vacio</p>
          <p className="text-muted-foreground/60 text-xs mt-1">Toca un producto para agregarlo</p>
        </div>
      ) : (
        <>
          {/* Cart Items */}
          <div className="flex-1 overflow-y-auto space-y-2 pr-1 pb-4">
            {cart.map((item) => (
              <div
                key={item.product.id}
                className="flex items-center gap-3 p-3 rounded-xl bg-muted/30 border border-border/50"
              >
                <img
                  src={item.product.imageUrl || '/placeholder.svg'}
                  alt={item.product.name}
                  className="w-14 h-14 rounded-lg object-cover shrink-0"
                />
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm text-foreground truncate">{item.product.name}</p>
                  <p className="text-xs text-muted-foreground">{formatCurrency(item.product.price)}</p>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-7 w-7 rounded-full bg-transparent"
                    onClick={() => updateQuantity(item.product.id, -1)}
                  >
                    <Minus className="h-3 w-3" />
                  </Button>
                  <span className="w-8 text-center text-sm font-semibold text-foreground">
                    {item.quantity}
                  </span>
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-7 w-7 rounded-full bg-transparent"
                    onClick={() => updateQuantity(item.product.id, 1)}
                  >
                    <Plus className="h-3 w-3" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 ml-1 text-destructive hover:text-destructive hover:bg-destructive/10"
                    onClick={() => removeFromCart(item.product.id)}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            ))}
          </div>

          {/* Total */}
          <div className="border-t border-border pt-4 mt-auto space-y-4 bg-background">
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">Total</span>
              <span className="text-2xl font-bold text-foreground">{formatCurrency(cartTotal)}</span>
            </div>

            {/* MODIFICADO: Cliente requerido para todos los pagos */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-xs text-muted-foreground">
                  Cliente <span className="text-destructive">*</span>
                </Label>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-6 text-xs gap-1 text-primary"
                  onClick={() => setNewClientModalOpen(true)}
                >
                  <UserPlus className="h-3 w-3" />
                  Nuevo
                </Button>
              </div>
              <Select value={selectedClient} onValueChange={setSelectedClient}>
                <SelectTrigger className="h-10">
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
                <div className="p-3 rounded-xl bg-muted/50 text-sm space-y-1">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Saldo actual</span>
                    <span className="text-foreground">{formatCurrency(selectedClientData.currentBalance)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Limite</span>
                    <span className="text-foreground">{formatCurrency(selectedClientData.creditLimit)}</span>
                  </div>
                  {(paymentType === 'credit' || paymentType === 'mixed') && (
                    <div className="flex justify-between pt-2 border-t border-border">
                      <span className="text-muted-foreground">Disponible</span>
                      <span
                        className={`font-semibold ${
                          selectedClientData.creditLimit - selectedClientData.currentBalance - creditAmount < 0
                            ? 'text-destructive'
                            : 'text-emerald-600'
                        }`}
                      >
                        {formatCurrency(
                          selectedClientData.creditLimit - selectedClientData.currentBalance - creditAmount
                        )}
                      </span>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Seller Selection */}
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">Vendedor</Label>
              <Select value={selectedSeller} onValueChange={setSelectedSeller}>
                <SelectTrigger className="h-10">
                  <SelectValue placeholder="Seleccionar (opcional)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Sin vendedor</SelectItem>
                  {sellers.map((seller) => (
                    <SelectItem key={seller.id} value={seller.id}>
                      <span className="flex items-center gap-2">
                        {seller.name}
                        <Badge variant="secondary" className="text-xs">
                          {seller.commissionRate}%
                        </Badge>
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {selectedSellerData && (
                <div className="flex items-center gap-2 text-xs text-emerald-600 bg-emerald-500/10 px-3 py-2 rounded-lg">
                  <Percent className="h-3.5 w-3.5" />
                  <span>
                    Comision: {formatCurrency((cartTotal * selectedSellerData.commissionRate) / 100)}
                  </span>
                </div>
              )}
            </div>

            {/* Payment Type */}
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">Forma de Pago</Label>
              <div className="grid grid-cols-3 gap-2">
                <Button
                  type="button"
                  variant={paymentType === 'cash' ? 'default' : 'outline'}
                  className={`h-auto py-3 flex-col gap-1 ${paymentType === 'cash' ? 'bg-emerald-600 hover:bg-emerald-700' : ''}`}
                  onClick={() => setPaymentType('cash')}
                >
                  <Banknote className="h-4 w-4" />
                  <span className="text-xs">Contado</span>
                </Button>
                <Button
                  type="button"
                  variant={paymentType === 'credit' ? 'default' : 'outline'}
                  className={`h-auto py-3 flex-col gap-1 ${paymentType === 'credit' ? 'bg-blue-600 hover:bg-blue-700' : ''}`}
                  onClick={() => setPaymentType('credit')}
                >
                  <CreditCard className="h-4 w-4" />
                  <span className="text-xs">A Cuenta</span>
                </Button>
                <Button
                  type="button"
                  variant={paymentType === 'mixed' ? 'default' : 'outline'}
                  className={`h-auto py-3 flex-col gap-1 ${paymentType === 'mixed' ? 'bg-amber-600 hover:bg-amber-700' : ''}`}
                  onClick={() => setPaymentType('mixed')}
                >
                  <Sparkles className="h-4 w-4" />
                  <span className="text-xs">Mixto</span>
                </Button>
              </div>
            </div>

            {/* Mixed Payment Amounts */}
            {paymentType === 'mixed' && (
              <div className="space-y-3 p-4 rounded-xl bg-amber-500/10 border border-amber-500/20">
                <div className="space-y-2">
                  <Label className="text-xs text-amber-700">Monto en Efectivo</Label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
                    <Input
                      type="number"
                      min="0"
                      max={cartTotal}
                      value={cashAmount}
                      onChange={(e) => setCashAmount(Number(e.target.value) || 0)}
                      className="pl-7 h-10"
                    />
                  </div>
                </div>
                <div className="flex justify-between text-sm pt-2 border-t border-amber-500/20">
                  <span className="text-amber-700">A Cuenta:</span>
                  <span className="font-semibold text-amber-700">{formatCurrency(creditAmount)}</span>
                </div>
              </div>
            )}

            {/* Phone - CORREGIDO: Input normal sin comportamiento raro */}
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">Telefono (opcional)</Label>
              <Input
                type="tel"
                inputMode="tel"
                placeholder="11 1234 5678"
                value={clientPhone}
                onChange={(e) => setClientPhone(e.target.value)}
                className="h-10"
                // Prevenir scroll en focus para mobile
                onFocus={(e) => {
                  // Prevenir que el input se mueva al enfocar
                  e.target.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
                }}
              />
            </div>

            {/* Process Button */}
            <Button
              className="w-full h-12 text-base font-semibold"
              disabled={!canProcessSale()}
              onClick={() => setConfirmDialogOpen(true)}
            >
              Procesar Venta
            </Button>
          </div>
        </>
      )}
    </div>
  )

  // Sale Complete Screen
  if (saleComplete) {
    return (
      <MainLayout>
        <div className="flex flex-col min-h-[80vh]">
          {/* Back button */}
          <div className="mb-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => router.push('/ventas')}
              className="gap-2"
            >
              <ArrowLeft className="h-4 w-4" />
              Volver a Ventas
            </Button>
          </div>

          {/* Success Card */}
          <div className="flex-1 flex items-center justify-center px-4">
            <Card className="w-full max-w-md border-0 shadow-lg">
              <CardContent className="pt-10 pb-8 px-6">
                {/* Success Animation */}
                <div className="flex justify-center mb-8">
                  <div className="relative">
                    <div className="absolute inset-0 bg-emerald-500/20 rounded-full animate-ping" />
                    <div className="relative h-20 w-20 rounded-full bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center shadow-lg">
                      <CheckCircle className="h-10 w-10 text-white" />
                    </div>
                  </div>
                </div>

                {/* Title & Description */}
                <h2 className="text-2xl font-bold text-foreground text-center mb-2">Venta Exitosa</h2>
                <p className="text-muted-foreground text-center mb-8">
                  La venta ha sido procesada correctamente
                </p>

                {/* Sale Summary */}
                <div className="rounded-xl bg-muted/50 p-5 mb-6 space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">Total</span>
                    <span className="text-xl font-bold text-foreground">{formatCurrency(cartTotal)}</span>
                  </div>
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-muted-foreground">Forma de pago</span>
                    <Badge variant={paymentType === 'cash' ? 'default' : paymentType === 'credit' ? 'secondary' : 'outline'}>
                      {paymentType === 'cash' ? 'Contado' : paymentType === 'credit' ? 'A Cuenta' : 'Mixto'}
                    </Badge>
                  </div>
                  {paymentType === 'mixed' && (
                    <>
                      <div className="flex justify-between items-center text-sm">
                        <span className="text-muted-foreground">Efectivo</span>
                        <span className="text-foreground">{formatCurrency(cashAmount)}</span>
                      </div>
                      <div className="flex justify-between items-center text-sm">
                        <span className="text-muted-foreground">A Cuenta</span>
                        <span className="text-foreground">{formatCurrency(creditAmount)}</span>
                      </div>
                    </>
                  )}
                </div>

                {/* Document Status */}
                <div className="rounded-xl border border-border p-4 mb-6">
                  <div className="flex items-center justify-center gap-2 text-sm">
                    {invoiceNumber ? (
                      <>
                        <FileText className="h-4 w-4 text-emerald-600" />
                        <span className="text-emerald-600 font-medium">Boleta: {invoiceNumber}</span>
                      </>
                    ) : remitoNumber ? (
                      <>
                        <Receipt className="h-4 w-4 text-blue-600" />
                        <span className="text-blue-600 font-medium">Remito: {remitoNumber}</span>
                      </>
                    ) : (
                      <>
                        <FileText className="h-4 w-4 text-muted-foreground" />
                        <span className="text-muted-foreground">Documentacion pendiente</span>
                      </>
                    )}
                  </div>
                  {(invoicePdfUrl || remitoPdfUrl) && (
                    <div className="flex justify-center mt-3">
                      <a
                        href={invoicePdfUrl || remitoPdfUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="text-sm text-primary hover:underline font-medium"
                      >
                        Ver documento
                      </a>
                    </div>
                  )}
                </div>

                {/* Action Buttons */}
                <div className="space-y-3">
                  {!invoiceNumber && !remitoNumber && (
                    <div className="grid grid-cols-2 gap-3">
                      <Button
                        variant="outline"
                        className="h-12 gap-2 bg-transparent"
                        onClick={() => {
                          setDocType('invoice')
                          setDocDialogOpen(true)
                        }}
                      >
                        <FileText className="h-4 w-4" />
                        Boleta
                      </Button>
                      <Button
                        variant="outline"
                        className="h-12 gap-2 bg-transparent"
                        onClick={() => {
                          setDocType('remito')
                          setDocDialogOpen(true)
                        }}
                      >
                        <Receipt className="h-4 w-4" />
                        Remito
                      </Button>
                    </div>
                  )}

                  <Button variant="outline" className="w-full h-12 bg-transparent" onClick={() => router.push('/ventas')}>
                    Ver Ventas
                  </Button>

                  <Button className="w-full h-12 gap-2" onClick={handleNewSale}>
                    <Plus className="h-4 w-4" />
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
      {/* Back button - Mobile */}
      <div className="lg:hidden mb-4">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => router.push('/ventas')}
          className="gap-2 -ml-2"
        >
          <ArrowLeft className="h-4 w-4" />
          Volver
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Products Section */}
        <div className="lg:col-span-2 space-y-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar productos..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-11 h-12 text-base rounded-xl"
            />
          </div>

          {/* Products Grid */}
          {loading ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <Skeleton key={i} className="h-44 rounded-xl" />
              ))}
            </div>
          ) : filteredProducts.length === 0 ? (
            <div className="text-center py-12">
              <Package className="h-12 w-12 text-muted-foreground/30 mx-auto mb-4" />
              <p className="text-muted-foreground">No se encontraron productos</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 pb-24 lg:pb-4">
              {filteredProducts.map((product) => {
                const inCart = cart.find((item) => item.product.id === product.id)
                return (
                  <Card
                    key={product.id}
                    className={`cursor-pointer transition-all duration-200 hover:shadow-lg border-2 overflow-hidden ${
                      product.stock === 0 ? 'opacity-50 cursor-not-allowed' : ''
                    } ${inCart ? 'border-primary shadow-md' : 'border-transparent'}`}
                    onClick={() => product.stock > 0 && addToCart(product)}
                  >
                    <CardContent className="p-0">
                      <div className="relative">
                        <img
                          src={product.imageUrl || '/placeholder.svg'}
                          alt={product.name}
                          className="w-full h-28 object-cover"
                        />
                        {inCart && (
                          <div className="absolute top-2 right-2 h-7 w-7 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold shadow-lg">
                            {inCart.quantity}
                          </div>
                        )}
                        {product.stock <= 5 && product.stock > 0 && (
                          <Badge
                            variant="destructive"
                            className="absolute bottom-2 left-2 text-[10px] py-0.5"
                          >
                            Stock bajo
                          </Badge>
                        )}
                        {product.stock === 0 && (
                          <div className="absolute inset-0 bg-background/80 flex items-center justify-center">
                            <Badge variant="secondary">Sin stock</Badge>
                          </div>
                        )}
                      </div>
                      <div className="p-3">
                        <h3 className="font-medium text-sm text-foreground line-clamp-1 mb-1">
                          {product.name}
                        </h3>
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-foreground">{formatCurrency(product.price)}</span>
                          <span className="text-[10px] text-muted-foreground">{product.stock} uds</span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          )}
        </div>

        {/* Cart Section - Desktop */}
        <div className="hidden lg:block">
          <Card className="sticky top-4">
            <CardContent className="p-5">
              <div className="flex items-center gap-2 mb-4 pb-4 border-b border-border">
                <ShoppingCart className="h-5 w-5 text-primary" />
                <h2 className="font-semibold text-foreground">Carrito</h2>
                {cart.length > 0 && (
                  <Badge variant="secondary" className="ml-auto">
                    {cartItemsCount} items
                  </Badge>
                )}
              </div>
              <div className="max-h-[calc(100vh-200px)] overflow-y-auto">
                <CartContent />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Cart FAB - Mobile - CORREGIDO: Sheet mejorado para no romperse */}
        <div className="lg:hidden fixed bottom-6 right-6 z-50">
          <Sheet open={cartSheetOpen} onOpenChange={setCartSheetOpen}>
            <SheetTrigger asChild>
              <Button
                size="lg"
                className="h-16 w-16 rounded-full shadow-xl relative"
                disabled={cart.length === 0}
              >
                <ShoppingCart className="h-6 w-6" />
                {cart.length > 0 && (
                  <span className="absolute -top-1 -right-1 h-6 w-6 rounded-full bg-destructive text-destructive-foreground text-xs font-bold flex items-center justify-center">
                    {cartItemsCount}
                  </span>
                )}
              </Button>
            </SheetTrigger>
            {/* CORREGIDO: Sheet con altura fija y mejor manejo de overflow */}
            <SheetContent 
              side="bottom" 
              className="h-[85vh] sm:h-[90vh] rounded-t-3xl flex flex-col p-0"
            >
              <SheetHeader className="px-6 py-4 border-b border-border shrink-0">
                <div className="flex items-center justify-between">
                  <SheetTitle className="flex items-center gap-2">
                    <ShoppingCart className="h-5 w-5 text-primary" />
                    Carrito
                    {cart.length > 0 && (
                      <Badge variant="secondary">{cartItemsCount} items</Badge>
                    )}
                  </SheetTitle>
                </div>
              </SheetHeader>
              {/* CORREGIDO: Contenedor con scroll proper y padding bottom para evitar que se corte */}
              <div className="flex-1 overflow-y-auto px-6 py-4 pb-32">
                <CartContent />
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>

      {/* Confirmation Dialog */}
      <ConfirmDialog
        open={confirmDialogOpen}
        onOpenChange={setConfirmDialogOpen}
        title="Confirmar Venta"
        description={`¿Procesar venta por ${formatCurrency(cartTotal)}${
          paymentType === 'cash'
            ? ' en efectivo'
            : paymentType === 'credit'
              ? ` a cuenta de ${selectedClientData?.name || 'cliente'}`
              : ` (${formatCurrency(cashAmount)} efectivo + ${formatCurrency(creditAmount)} a cuenta)`
        }${selectedSellerData ? ` - Vendedor: ${selectedSellerData.name}` : ''}?`}
        confirmText={processing ? 'Procesando...' : 'Confirmar'}
        confirmDisabled={processing}
        onConfirm={handleProcessSale}
      />

      {/* New Client Modal */}
      <Dialog open={newClientModalOpen} onOpenChange={setNewClientModalOpen}>
        <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                <User className="h-5 w-5 text-primary" />
              </div>
              Nuevo Cliente
            </DialogTitle>
            <DialogDescription>
              Crea un cliente con los datos minimos para continuar
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
                className="h-10"
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
                className="h-10"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="newClientPhone">Telefono</Label>
                <Input
                  id="newClientPhone"
                  type="tel"
                  inputMode="tel"
                  value={newClientForm.phone}
                  onChange={(e) => setNewClientForm({ ...newClientForm, phone: e.target.value })}
                  placeholder="11 1234 5678"
                  className="h-10"
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
                  className="h-10"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="newClientLimit">Limite de Credito</Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">
                  $
                </span>
                <Input
                  id="newClientLimit"
                  type="number"
                  min="0"
                  step="1000"
                  value={newClientForm.creditLimit}
                  onChange={(e) =>
                    setNewClientForm({ ...newClientForm, creditLimit: Number(e.target.value) || 0 })
                  }
                  className="pl-7 h-10"
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
                Crear Cliente
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </MainLayout>
  )
}