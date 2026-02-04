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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { productsApi, clientsApi, salesApi, invoiceApi, remitoApi } from '@/lib/api'
import type { Product, Client, CartItem } from '@/lib/types'
import { Search, Plus, Minus, Trash2, ShoppingCart, CreditCard, Banknote, Loader2, CheckCircle } from 'lucide-react'

export default function NuevaVentaPage() {
  const router = useRouter()
  const [products, setProducts] = useState<Product[]>([])
  const [clients, setClients] = useState<Client[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [cart, setCart] = useState<CartItem[]>([])
  const [selectedClient, setSelectedClient] = useState<string>('')
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

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      const [productsData, clientsData] = await Promise.all([
        productsApi.getAll(),
        clientsApi.getAll(),
      ])
      setProducts(productsData)
      setClients(clientsData)
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
        items: cart,
        paymentType,
        source: 'direct',
        createOrder: false,
      })
      setLastSaleId(sale.id)
      setSaleComplete(true)
    } catch (error) {
      console.error('Error processing sale:', error)
    } finally {
      setProcessing(false)
      setConfirmDialogOpen(false)
    }
  }

  const handleNewSale = () => {
    setCart([])
    setSelectedClient('')
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
        taxCategory: selectedClientData?.taxCategory,
      })
      setInvoiceNumber(invoice.invoiceNumber)
      setInvoicePdfUrl(invoice.pdfUrl)
    } catch (error) {
      console.error('Error generating invoice:', error)
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
    } catch (error) {
      console.error('Error generating remito:', error)
    } finally {
      setGeneratingDoc(false)
      setDocDialogOpen(false)
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: 'ARS',
      minimumFractionDigits: 0,
    }).format(amount)
  }

  if (saleComplete) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <Card className="max-w-md w-full text-center">
            <CardContent className="pt-8 pb-6">
              <div className="flex justify-center mb-4">
                <div className="p-4 rounded-full bg-success/10">
                  <CheckCircle className="h-12 w-12 text-success" />
                </div>
              </div>
              <h2 className="text-2xl font-semibold text-foreground mb-2">Venta Completada</h2>
              <p className="text-muted-foreground mb-4">
                La venta se ha procesado correctamente
              </p>
              <div className="p-4 rounded-lg bg-muted/50 mb-6">
                <p className="text-sm text-muted-foreground">
                  {invoiceNumber ? 'Boleta generada' : remitoNumber ? 'Remito generado' : 'Documentación pendiente'}
                </p>
                {invoiceNumber && (
                  <p className="text-lg font-semibold text-foreground">{invoiceNumber}</p>
                )}
                {remitoNumber && (
                  <p className="text-lg font-semibold text-foreground">{remitoNumber}</p>
                )}
                {invoicePdfUrl && (
                  <a
                    href={invoicePdfUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-2 inline-flex text-sm text-primary hover:underline"
                  >
                    Ver Boleta
                  </a>
                )}
                {remitoPdfUrl && (
                  <a
                    href={remitoPdfUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-2 inline-flex text-sm text-primary hover:underline"
                  >
                    Ver Remito
                  </a>
                )}
              </div>
              <div className="flex gap-3 justify-center">
                {!invoiceNumber && !remitoNumber && (
                  <>
                    <Button
                      variant="outline"
                      onClick={() => {
                        setDocType('invoice')
                        setDocDialogOpen(true)
                      }}
                    >
                      Generar Boleta
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => {
                        setDocType('remito')
                        setDocDialogOpen(true)
                      }}
                    >
                      Generar Remito
                    </Button>
                  </>
                )}
                <Button variant="outline" onClick={() => router.push('/pedidos')}>
                  Ver Pedidos
                </Button>
                <Button onClick={handleNewSale}>
                  Nueva Venta
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
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
                        <Label>Cliente</Label>
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
                              <span className="text-muted-foreground">Límite</span>
                              <span className="text-foreground">{formatCurrency(selectedClientData.creditLimit)}</span>
                            </div>
                            <div className="flex justify-between border-t border-border mt-2 pt-2">
                              <span className="text-muted-foreground">Disponible</span>
                              <span className={`font-medium ${
                                selectedClientData.creditLimit - selectedClientData.currentBalance - cartTotal < 0
                                  ? 'text-destructive'
                                  : 'text-success'
                              }`}>
                                {formatCurrency(selectedClientData.creditLimit - selectedClientData.currentBalance - cartTotal)}
                              </span>
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    <div className="space-y-3 mb-4">
                      <Label htmlFor="phone">Teléfono del cliente (opcional)</Label>
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
        }?`}
        confirmText={processing ? 'Procesando...' : 'Confirmar'}
        confirmDisabled={processing}
        onConfirm={handleProcessSale}
      />

      <ConfirmDialog
        open={docDialogOpen}
        onOpenChange={setDocDialogOpen}
        title={docType === 'invoice' ? 'Generar boleta' : 'Generar remito'}
        description={
          docType === 'invoice'
            ? '¿Desea generar la boleta para esta venta?'
            : '¿Desea generar un remito para esta venta?'
        }
        confirmText={generatingDoc ? 'Generando...' : 'Generar'}
        confirmDisabled={generatingDoc}
        onConfirm={docType === 'invoice' ? handleGenerateInvoice : handleGenerateRemito}
      />
    </MainLayout>
  )
}
