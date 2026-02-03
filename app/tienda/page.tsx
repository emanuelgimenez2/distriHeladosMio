"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
  SheetFooter,
} from "@/components/ui/sheet"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Label } from "@/components/ui/label"
import { productsApi, salesApi, clientsApi } from "@/lib/api"
import type { Product, CartItem, Client } from "@/lib/types"
import {
  ShoppingCart,
  Plus,
  Minus,
  Trash2,
  Search,
  IceCream,
  CheckCircle,
  Banknote,
  CreditCard,
  FileText,
  Loader2,
  ArrowLeft,
} from "lucide-react"
import Image from "next/image"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

type StoreFrontProps = {
  showHeader?: boolean
  showBackButton?: boolean
  headerAction?: React.ReactNode
  publicMode?: boolean
}

export function StoreFront({
  showHeader = true,
  showBackButton = true,
  headerAction,
  publicMode = false,
}: StoreFrontProps) {
  const router = useRouter()
  const isPublicStore = publicMode
  const [products, setProducts] = useState<Product[]>([])
  const [clients, setClients] = useState<Client[]>([])
  const [cart, setCart] = useState<CartItem[]>([])
  const [search, setSearch] = useState("")
  const [loading, setLoading] = useState(true)
  const [isCartOpen, setIsCartOpen] = useState(false)
  
  // Payment modal state
  const [showPaymentModal, setShowPaymentModal] = useState(false)
  const [paymentType, setPaymentType] = useState<"cash" | "credit">("cash")
  const [selectedClient, setSelectedClient] = useState<string>("")
  const [processingPayment, setProcessingPayment] = useState(false)
  const [publicDni, setPublicDni] = useState('')
  const [publicName, setPublicName] = useState('')
  const [publicPhone, setPublicPhone] = useState('')
  const [publicAddress, setPublicAddress] = useState('')
  
  // Success modal state
  const [showSuccessModal, setShowSuccessModal] = useState(false)
  const [lastSale, setLastSale] = useState<{ id: string; total: number; paymentType: string } | null>(null)
  const [publicOrderId, setPublicOrderId] = useState<string | null>(null)
  const [emittingInvoice, setEmittingInvoice] = useState(false)
  const [invoiceEmitted, setInvoiceEmitted] = useState(false)
  const [invoiceNumber, setInvoiceNumber] = useState<string | null>(null)

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      if (isPublicStore) {
        const response = await fetch('/api/public/productos')
        if (!response.ok) {
          throw new Error('Error cargando productos')
        }
        const data = await response.json()
        setProducts(data.products || [])
        setClients([])
        return
      }

      const [productsData, clientsData] = await Promise.all([
        productsApi.getAll(),
        clientsApi.getAll(),
      ])
      setProducts(productsData)
      setClients(clientsData)
    } catch (error) {
      console.error("Error loading data:", error)
    } finally {
      setLoading(false)
    }
  }

  const filteredProducts = products.filter(
    (p) =>
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.category.toLowerCase().includes(search.toLowerCase())
  )

  const addToCart = (product: Product) => {
    setCart((prev) => {
      const existing = prev.find((item) => item.product.id === product.id)
      if (existing) {
        return prev.map((item) =>
          item.product.id === product.id
            ? { ...item, quantity: item.quantity + 1 }
            : item
        )
      }
      return [...prev, { product, quantity: 1 }]
    })
  }

  const updateQuantity = (productId: string, delta: number) => {
    setCart((prev) =>
      prev
        .map((item) =>
          item.product.id === productId
            ? { ...item, quantity: Math.max(0, item.quantity + delta) }
            : item
        )
        .filter((item) => item.quantity > 0)
    )
  }

  const removeFromCart = (productId: string) => {
    setCart((prev) => prev.filter((item) => item.product.id !== productId))
  }

  const cartTotal = cart.reduce(
    (acc, item) => acc + item.product.price * item.quantity,
    0
  )

  const cartCount = cart.reduce((acc, item) => acc + item.quantity, 0)

  const handleCheckout = () => {
    setIsCartOpen(false)
    setShowPaymentModal(true)
  }

  const processPayment = async () => {
    setProcessingPayment(true)
    try {
      if (isPublicStore) {
        const response = await fetch('/api/public/pedidos', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            items: cart.map((item) => ({
              productId: item.product.id,
              quantity: item.quantity,
              name: item.product.name,
            })),
            client: {
              dni: publicDni,
              name: publicName,
              phone: publicPhone,
              address: publicAddress,
            },
          }),
        })
        if (!response.ok) {
          throw new Error('Error creando pedido')
        }
        const data = await response.json()
        setPublicOrderId(data.orderId)
        setShowPaymentModal(false)
        setShowSuccessModal(true)
        setCart([])
        setPublicDni('')
        setPublicName('')
        setPublicPhone('')
        setPublicAddress('')
        return
      }

      const client = clients.find((c) => c.id === selectedClient)
      const sale = await salesApi.processSale({
        clientId: paymentType === "credit" ? selectedClient : undefined,
        clientName: paymentType === "credit" ? client?.name : undefined,
        items: cart,
        paymentType,
      })
      
      setLastSale({
        id: sale.id,
        total: sale.total,
        paymentType: sale.paymentType,
      })
      setShowPaymentModal(false)
      setShowSuccessModal(true)
      setCart([])
      setPaymentType("cash")
      setSelectedClient("")
      setInvoiceEmitted(false)
      setInvoiceNumber(null)
      
      // Reload products to update stock
      const productsData = await productsApi.getAll()
      setProducts(productsData)
    } catch (error) {
      console.error("Error processing sale:", error)
    } finally {
      setProcessingPayment(false)
    }
  }

  const handleEmitInvoice = async () => {
    if (!lastSale) return
    setEmittingInvoice(true)
    try {
      const result = await salesApi.emitInvoice(lastSale.id)
      setInvoiceEmitted(true)
      setInvoiceNumber(result.invoiceNumber)
    } catch (error) {
      console.error("Error emitting invoice:", error)
    } finally {
      setEmittingInvoice(false)
    }
  }

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat("es-AR", {
      style: "currency",
      currency: "ARS",
    }).format(price)
  }

  const publicFormValid =
    publicDni.trim().length > 0 &&
    publicName.trim().length > 0 &&
    publicPhone.trim().length > 0 &&
    publicAddress.trim().length > 0

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <IceCream className="h-12 w-12 text-primary animate-bounce" />
          <p className="text-muted-foreground">Cargando productos...</p>
        </div>
      </div>
    )
  }

  const openCart = () => setIsCartOpen(true)

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      {showHeader && (
        <header className="sticky top-0 z-40 bg-card border-b border-border">
          <div className="container mx-auto px-4 py-4">
            {showBackButton && (
              <div className="flex items-center gap-2 mb-3 sm:mb-0">
                <Button
                  variant="ghost"
                  size="icon"
                  className="sm:hidden"
                  onClick={() => router.back()}
                  aria-label="Volver"
                >
                  <ArrowLeft className="h-4 w-4" />
                </Button>
                <span className="text-xs text-muted-foreground sm:hidden">Volver</span>
              </div>
            )}
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-3 min-w-0">
                <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <IceCream className="h-6 w-6 text-primary" />
                </div>
                <div className="min-w-0">
                  <h1 className="text-lg sm:text-xl font-bold text-foreground truncate">
                    Helados Mio
                  </h1>
                  <p className="text-xs text-muted-foreground">Tienda Online</p>
                </div>
              </div>

              <div className="flex-1 max-w-md hidden sm:block">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Buscar helados..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>

              <div className="flex items-center gap-2">
                {headerAction}
                <Button variant="outline" className="relative bg-transparent" onClick={openCart}>
                  <ShoppingCart className="h-5 w-5" />
                  {cartCount > 0 && (
                    <Badge className="absolute -top-2 -right-2 h-5 w-5 p-0 flex items-center justify-center text-xs">
                      {cartCount}
                    </Badge>
                  )}
                </Button>
              </div>
            </div>

            {/* Mobile Search */}
            <div className="mt-4 sm:hidden">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar helados..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
          </div>
        </header>
      )}

      {/* Products Grid */}
      {!showHeader && (
        <Button
          variant="outline"
          className="fixed bottom-6 right-6 z-40 h-12 w-12 rounded-full p-0 bg-card shadow-md"
          onClick={openCart}
          aria-label="Abrir carrito"
        >
          <ShoppingCart className="h-5 w-5" />
          {cartCount > 0 && (
            <Badge className="absolute -top-2 -right-2 h-5 w-5 p-0 flex items-center justify-center text-xs">
              {cartCount}
            </Badge>
          )}
        </Button>
      )}

      <Sheet open={isCartOpen} onOpenChange={setIsCartOpen}>
        <SheetContent className="flex flex-col">
          <SheetHeader>
            <SheetTitle>Carrito de Compras</SheetTitle>
          </SheetHeader>

          {cart.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center text-center py-8">
              <ShoppingCart className="h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-muted-foreground">Tu carrito está vacío</p>
              <p className="text-sm text-muted-foreground mt-1">
                Agrega productos para continuar
              </p>
            </div>
          ) : (
            <>
              <div className="flex-1 overflow-auto py-4 space-y-4">
                {cart.map((item) => (
                  <div
                    key={item.product.id}
                    className="flex gap-3 pb-4 border-b border-border"
                  >
                    <div className="relative h-16 w-16 rounded-lg overflow-hidden bg-muted flex-shrink-0">
                      <Image
                        src={item.product.imageUrl || "/placeholder.svg"}
                        alt={item.product.name}
                        fill
                        className="object-cover"
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="font-medium text-foreground truncate">
                        {item.product.name}
                      </h4>
                      <p className="text-sm text-muted-foreground">
                        {formatPrice(item.product.price)}
                      </p>
                      <div className="flex items-center gap-2 mt-2">
                        <Button
                          variant="outline"
                          size="icon"
                          className="h-7 w-7 bg-transparent"
                          onClick={() => updateQuantity(item.product.id, -1)}
                        >
                          <Minus className="h-3 w-3" />
                        </Button>
                        <span className="w-8 text-center text-sm font-medium">
                          {item.quantity}
                        </span>
                        <Button
                          variant="outline"
                          size="icon"
                          className="h-7 w-7 bg-transparent"
                          onClick={() => updateQuantity(item.product.id, 1)}
                          disabled={item.quantity >= item.product.stock}
                        >
                          <Plus className="h-3 w-3" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-destructive ml-auto"
                          onClick={() => removeFromCart(item.product.id)}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <SheetFooter className="flex-col gap-4 border-t border-border pt-4">
                <div className="flex justify-between items-center w-full">
                  <span className="text-muted-foreground">Total</span>
                  <span className="text-xl font-bold text-foreground">
                    {formatPrice(cartTotal)}
                  </span>
                </div>
                <Button className="w-full" size="lg" onClick={handleCheckout}>
                  Finalizar Compra
                </Button>
              </SheetFooter>
            </>
          )}
        </SheetContent>
      </Sheet>

      <main className={`container mx-auto px-4 ${showHeader ? 'py-8' : 'py-6 sm:py-8'}`}>
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-foreground text-balance">
            Nuestros Helados
          </h2>
          <p className="text-muted-foreground mt-1">
            {filteredProducts.length} productos disponibles
          </p>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4 lg:gap-6">
          {filteredProducts.map((product) => {
            const inCart = cart.find((item) => item.product.id === product.id)
            const isOutOfStock = product.stock === 0

            return (
              <Card
                key={product.id}
                className={`overflow-hidden ${isOutOfStock ? "opacity-60" : ""} rounded-xl`}
              >
                <div className="relative aspect-[4/3] sm:aspect-square bg-muted">
                  <Image
                    src={product.imageUrl || "/placeholder.svg"}
                    alt={product.name}
                    fill
                    className="object-cover"
                  />
                  {product.stock < 10 && product.stock > 0 && (
                    <Badge className="absolute top-2 right-2 bg-warning text-warning-foreground">
                      Pocas unidades
                    </Badge>
                  )}
                  {isOutOfStock && (
                    <div className="absolute inset-0 bg-background/80 flex items-center justify-center">
                      <Badge variant="secondary">Agotado</Badge>
                    </div>
                  )}
                </div>
                <CardContent className="p-3 sm:p-4">
                  <Badge variant="secondary" className="mb-2 text-xs">
                    {product.category}
                  </Badge>
                  <h3 className="font-semibold text-foreground line-clamp-1 text-sm sm:text-base">
                    {product.name}
                  </h3>
                  <p className="text-xs sm:text-sm text-muted-foreground line-clamp-2 mt-1 min-h-[2.5rem]">
                    {product.description}
                  </p>
                  <div className="flex items-center justify-between mt-3 sm:mt-4">
                    <span className="text-base sm:text-lg font-bold text-foreground">
                      {formatPrice(product.price)}
                    </span>
                    {inCart ? (
                      <div className="flex items-center gap-1">
                        <Button
                          variant="outline"
                          size="icon"
                          className="h-7 w-7 sm:h-8 sm:w-8 bg-transparent"
                          onClick={() => updateQuantity(product.id, -1)}
                        >
                          <Minus className="h-4 w-4" />
                        </Button>
                        <span className="w-7 sm:w-8 text-center text-xs sm:text-sm font-medium">
                          {inCart.quantity}
                        </span>
                        <Button
                          variant="outline"
                          size="icon"
                          className="h-7 w-7 sm:h-8 sm:w-8 bg-transparent"
                          onClick={() => updateQuantity(product.id, 1)}
                          disabled={inCart.quantity >= product.stock}
                        >
                          <Plus className="h-4 w-4" />
                        </Button>
                      </div>
                    ) : (
                      <Button
                        size="sm"
                        onClick={() => addToCart(product)}
                        disabled={isOutOfStock}
                      >
                        <Plus className="h-4 w-4 mr-1" />
                        Agregar
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      </main>

      {/* Payment Method Modal */}
      <Dialog open={showPaymentModal} onOpenChange={setShowPaymentModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{isPublicStore ? 'Confirmar Pedido' : 'Método de Pago'}</DialogTitle>
          </DialogHeader>
          
          <div className="py-4">
            {isPublicStore ? (
              <div className="space-y-3">
                <div className="space-y-2">
                  <Label htmlFor="dni">DNI</Label>
                  <Input
                    id="dni"
                    placeholder="Ej: 30123456"
                    value={publicDni}
                    onChange={(e) => setPublicDni(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="name">Nombre y Apellido</Label>
                  <Input
                    id="name"
                    placeholder="Ej: Juan Perez"
                    value={publicName}
                    onChange={(e) => setPublicName(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone">Teléfono</Label>
                  <Input
                    id="phone"
                    placeholder="Ej: 11 1234 5678"
                    value={publicPhone}
                    onChange={(e) => setPublicPhone(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="address">Dirección</Label>
                  <Input
                    id="address"
                    placeholder="Calle y número"
                    value={publicAddress}
                    onChange={(e) => setPublicAddress(e.target.value)}
                  />
                </div>
              </div>
            ) : (
              <>
                <RadioGroup
                  value={paymentType}
                  onValueChange={(v) => setPaymentType(v as "cash" | "credit")}
                  className="space-y-3"
                >
                  <div className="flex items-center space-x-3 p-4 rounded-lg border border-border hover:bg-muted/50 cursor-pointer">
                    <RadioGroupItem value="cash" id="cash" />
                    <Label htmlFor="cash" className="flex items-center gap-3 cursor-pointer flex-1">
                      <div className="h-10 w-10 rounded-full bg-success/10 flex items-center justify-center">
                        <Banknote className="h-5 w-5 text-success" />
                      </div>
                      <div>
                        <p className="font-medium text-foreground">Efectivo</p>
                        <p className="text-sm text-muted-foreground">Pago inmediato en caja</p>
                      </div>
                    </Label>
                  </div>
                  
                  <div className="flex items-center space-x-3 p-4 rounded-lg border border-border hover:bg-muted/50 cursor-pointer">
                    <RadioGroupItem value="credit" id="credit" />
                    <Label htmlFor="credit" className="flex items-center gap-3 cursor-pointer flex-1">
                      <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                        <CreditCard className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <p className="font-medium text-foreground">Cuenta Corriente</p>
                        <p className="text-sm text-muted-foreground">Se suma a la deuda del cliente</p>
                      </div>
                    </Label>
                  </div>
                </RadioGroup>

                {paymentType === "credit" && (
                  <div className="mt-4 space-y-2">
                    <Label>Seleccionar Cliente</Label>
                    <Select value={selectedClient} onValueChange={setSelectedClient}>
                      <SelectTrigger>
                        <SelectValue placeholder="Buscar cliente..." />
                      </SelectTrigger>
                      <SelectContent>
                        {clients.map((client) => (
                          <SelectItem key={client.id} value={client.id}>
                            {client.name} - {client.cuit}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {selectedClient && (
                      <p className="text-sm text-muted-foreground">
                        Saldo actual:{" "}
                        <span className="font-medium text-foreground">
                          {formatPrice(clients.find((c) => c.id === selectedClient)?.currentBalance || 0)}
                        </span>
                      </p>
                    )}
                  </div>
                )}
              </>
            )}

            <div className="mt-6 p-4 bg-muted rounded-lg">
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Total a pagar</span>
                <span className="text-xl font-bold text-foreground">
                  {formatPrice(cartTotal)}
                </span>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowPaymentModal(false)}>
              Cancelar
            </Button>
            <Button
              onClick={processPayment}
              disabled={
                processingPayment ||
                (!isPublicStore && paymentType === "credit" && !selectedClient) ||
                (isPublicStore && !publicFormValid)
              }
            >
              {processingPayment ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Procesando...
                </>
              ) : (
                isPublicStore ? "Confirmar Pedido" : "Confirmar Pago"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Success Modal */}
      <Dialog open={showSuccessModal} onOpenChange={setShowSuccessModal}>
        <DialogContent className="sm:max-w-md">
          <div className="text-center py-4">
            <div className="mx-auto h-16 w-16 rounded-full bg-success/10 flex items-center justify-center mb-4">
              <CheckCircle className="h-8 w-8 text-success" />
            </div>
            <h2 className="text-xl font-bold text-foreground mb-2">
              {isPublicStore ? 'Pedido Recibido' : 'Venta Completada'}
            </h2>
            {isPublicStore ? (
              <p className="text-muted-foreground">
                Tu pedido fue generado correctamente. Te contactaremos para coordinar la entrega.
              </p>
            ) : (
              <p className="text-muted-foreground">
                {lastSale?.paymentType === "cash"
                  ? "El pago se registró en caja"
                  : "Se sumó a la cuenta corriente del cliente"}
              </p>
            )}
            
            {isPublicStore ? (
              publicOrderId && (
                <div className="mt-6 p-4 bg-muted rounded-lg">
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">Pedido</span>
                    <span className="text-sm font-medium text-foreground">#{publicOrderId}</span>
                  </div>
                </div>
              )
            ) : (
              <div className="mt-6 p-4 bg-muted rounded-lg">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-muted-foreground">Total</span>
                  <span className="text-lg font-bold text-foreground">
                    {formatPrice(lastSale?.total || 0)}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Método</span>
                  <Badge variant={lastSale?.paymentType === "cash" ? "default" : "secondary"}>
                    {lastSale?.paymentType === "cash" ? "Efectivo" : "Cuenta Corriente"}
                  </Badge>
                </div>
              </div>
            )}

            {invoiceEmitted && invoiceNumber && (
              <div className="mt-4 p-3 bg-success/10 rounded-lg">
                <p className="text-sm text-success font-medium">
                  Boleta emitida: {invoiceNumber}
                </p>
              </div>
            )}
          </div>

          <DialogFooter className="flex-col sm:flex-row gap-2">
            {!isPublicStore && !invoiceEmitted && (
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
    </div>
  )
}

export default function TiendaPage() {
  return <StoreFront />
}
