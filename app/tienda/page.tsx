"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Checkbox } from "@/components/ui/checkbox"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
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
  ChevronDown,
  LayoutDashboard,
  LogOut,
  Menu,
  SlidersHorizontal,
} from "lucide-react"
import Image from "next/image"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { useAuth } from '@/hooks/use-auth'
import { signOut } from '@/services/auth-service'

type StoreFrontProps = {
  showHeader?: boolean
  showBackButton?: boolean
  headerAction?: React.ReactNode
  publicMode?: boolean
}

const getInitials = (value?: string) => {
  if (!value) return "U"
  return value
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("")
}

const getFirstName = (value?: string) => {
  if (!value) return "Usuario"
  return value.split(" ").filter(Boolean)[0] || "Usuario"
}

export function StoreFront({
  showHeader = true,
  showBackButton = true,
  headerAction,
  publicMode = false,
}: StoreFrontProps) {
  const router = useRouter()
  const isPublicStore = publicMode
  const { user } = useAuth()
  const [products, setProducts] = useState<Product[]>([])
  const [clients, setClients] = useState<Client[]>([])
  const [cart, setCart] = useState<CartItem[]>([])
  const [search, setSearch] = useState("")
  const [categoryFilter, setCategoryFilter] = useState("all")
  const [priceFilter, setPriceFilter] = useState("all")
  const [baseFilter, setBaseFilter] = useState("all")
  const [onlyInStock, setOnlyInStock] = useState(false)
  const [onlyLowStock, setOnlyLowStock] = useState(false)
  const [loading, setLoading] = useState(true)
  const [isCartOpen, setIsCartOpen] = useState(false)
  const [isFilterOpen, setIsFilterOpen] = useState(false)
  
  // Payment modal state
  const [showPaymentModal, setShowPaymentModal] = useState(false)
  const [paymentType, setPaymentType] = useState<"cash" | "credit">("cash")
  const [selectedClient, setSelectedClient] = useState<string>("")
  const [processingPayment, setProcessingPayment] = useState(false)
  const [publicDni, setPublicDni] = useState('')
  const [publicName, setPublicName] = useState('')
  const [publicEmail, setPublicEmail] = useState('')
  const [publicPhone, setPublicPhone] = useState('')
  const [publicAddress, setPublicAddress] = useState('')
  const [publicCuit, setPublicCuit] = useState('')
  const [publicTaxCategory, setPublicTaxCategory] = useState<'responsable_inscripto' | 'monotributo' | 'consumidor_final' | 'exento' | 'no_responsable'>('consumidor_final')
  const [sellerMatchName, setSellerMatchName] = useState<string | null>(null)
  const [publicClientFound, setPublicClientFound] = useState(false)
  const [publicLookupLoading, setPublicLookupLoading] = useState(false)
  
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

  useEffect(() => {
    const loadSellerMatch = async () => {
      if (!isPublicStore || !user?.email) return
      try {
        const response = await fetch(`/api/public/vendedores?email=${encodeURIComponent(user.email)}`)
        const data = await response.json()
        setSellerMatchName(data.found ? data.sellerName : null)
      } catch (error) {
        console.error('Error loading seller match:', error)
      }
    }
    loadSellerMatch()
  }, [isPublicStore, user?.email])

  useEffect(() => {
    if (!isPublicStore) return
    if (!publicDni || publicDni.trim().length < 7) {
      setPublicClientFound(false)
      return
    }

    const handler = setTimeout(async () => {
      try {
        setPublicLookupLoading(true)
        const response = await fetch(`/api/public/clientes?dni=${encodeURIComponent(publicDni.trim())}`)
        const data = await response.json()
        if (data.found) {
          setPublicName(data.client.name || '')
          setPublicEmail(data.client.email || '')
          setPublicPhone(data.client.phone || '')
          setPublicAddress(data.client.address || '')
          setPublicCuit(data.client.cuit || publicDni.trim())
          setPublicTaxCategory((data.client.taxCategory || 'consumidor_final') as typeof publicTaxCategory)
          setPublicClientFound(true)
        } else {
          setPublicClientFound(false)
        }
      } catch (error) {
        console.error('Error buscando cliente:', error)
      } finally {
        setPublicLookupLoading(false)
      }
    }, 400)

    return () => clearTimeout(handler)
  }, [isPublicStore, publicDni])

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

  const categories = Array.from(new Set(products.map((p) => p.category))).sort()
  const priceRanges = [
    { id: "all", label: "Todos" },
    { id: "up-2800", label: "Hasta $2.800", min: 0, max: 2800 },
    { id: "2801-3000", label: "$2.801 - $3.000", min: 2801, max: 3000 },
    { id: "3001-3200", label: "$3.001 - $3.200", min: 3001, max: 3200 },
    { id: "3201-plus", label: "Más de $3.200", min: 3201, max: Infinity },
  ] as const

  const getBaseType = (product: Product) => {
    const text = `${product.name} ${product.description}`.toLowerCase()
    if (text.includes("sorbete") || text.includes("agua")) return "agua"
    return "crema"
  }

  const activeFiltersCount =
    (categoryFilter !== "all" ? 1 : 0) +
    (priceFilter !== "all" ? 1 : 0) +
    (baseFilter !== "all" ? 1 : 0) +
    (onlyInStock ? 1 : 0) +
    (onlyLowStock ? 1 : 0)

  const filteredProducts = products.filter((p) => {
    const matchesSearch =
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.category.toLowerCase().includes(search.toLowerCase())
    const matchesCategory = categoryFilter === "all" || p.category === categoryFilter
    const baseType = getBaseType(p)
    const matchesBase = baseFilter === "all" || baseType === baseFilter
    const matchesStock = !onlyInStock || p.stock > 0
    const matchesLowStock = !onlyLowStock || (p.stock > 0 && p.stock < 10)
    const range = priceRanges.find((item) => item.id === priceFilter)
    const matchesPrice =
      !range || range.id === "all"
        ? true
        : p.price >= (range.min ?? 0) && p.price <= (range.max ?? Infinity)
    return matchesSearch && matchesCategory && matchesBase && matchesStock && matchesLowStock && matchesPrice
  })

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
              cuit: publicCuit,
              email: publicEmail,
              phone: publicPhone,
              address: publicAddress,
              taxCategory: publicTaxCategory,
            },
            total: cartTotal,
            sellerEmail: user?.email ?? null,
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
        setPublicEmail('')
        setPublicPhone('')
        setPublicAddress('')
        setPublicCuit('')
        setPublicTaxCategory('consumidor_final')
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
    (cartTotal <= 100000 || publicCuit.trim().length > 0) &&
    publicEmail.trim().length > 0 &&
    publicPhone.trim().length > 0 &&
    publicAddress.trim().length > 0 &&
    publicTaxCategory.trim().length > 0

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
  const userInitials = getInitials(user?.name || user?.email)
  const displayName = getFirstName(user?.name || user?.email)
  const showAdminLink = user?.role === "admin" || user?.role === "seller"

  const handleSignOut = async () => {
    await signOut()
    router.refresh()
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      {showHeader && (
        <header className="sticky top-0 z-40 border-b border-border/60 bg-card/80 backdrop-blur supports-[backdrop-filter]:bg-card/70 shadow-sm">
          <div className="container mx-auto px-4 py-4 sm:py-5">
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
                <div className="h-10 w-10 rounded-full bg-primary/10 ring-1 ring-primary/20 flex items-center justify-center">
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
                    className="pl-10 rounded-full bg-muted/50 focus-visible:bg-background transition-colors"
                  />
                </div>
              </div>

              <div className="flex items-center gap-2 sm:gap-3">
                {headerAction}
                <div className="sm:hidden">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="outline" size="icon" className="rounded-full">
                        <Menu className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-48">
                      {user ? (
                        <>
                          <DropdownMenuLabel className="flex items-center gap-2">
                            <Avatar className="h-7 w-7">
                              <AvatarImage src={user.photoURL || ""} alt={displayName} />
                              <AvatarFallback className="text-xs font-semibold">
                                {userInitials}
                              </AvatarFallback>
                            </Avatar>
                            <span className="text-sm font-medium truncate">{displayName}</span>
                          </DropdownMenuLabel>
                          <DropdownMenuSeparator />
                          {showAdminLink && (
                            <DropdownMenuItem asChild>
                              <Link href="/dashboard" className="flex items-center gap-2">
                                <LayoutDashboard className="h-4 w-4" />
                                Panel Admin
                              </Link>
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuSeparator />
                          <DropdownMenuItem variant="destructive" onSelect={handleSignOut}>
                            <LogOut className="h-4 w-4" />
                            Cerrar sesión
                          </DropdownMenuItem>
                        </>
                      ) : (
                        <DropdownMenuItem asChild>
                          <Link href="/login">Ingresar</Link>
                        </DropdownMenuItem>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>

                <div className="hidden sm:block">
                  {user ? (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          className="h-10 px-2 rounded-full border border-transparent hover:border-border/60"
                        >
                          <Avatar className="h-8 w-8">
                            <AvatarImage src={user.photoURL || ""} alt={displayName} />
                            <AvatarFallback className="text-xs font-semibold">
                              {userInitials}
                            </AvatarFallback>
                          </Avatar>
                          <span className="flex items-center ml-2 mr-1 text-left">
                            <span className="text-sm font-medium leading-none truncate max-w-[8rem]">
                              {displayName}
                            </span>
                          </span>
                          <ChevronDown className="h-4 w-4 text-muted-foreground" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-56">
                        <DropdownMenuLabel className="flex items-center gap-2">
                          <Avatar className="h-8 w-8">
                            <AvatarImage src={user.photoURL || ""} alt={displayName} />
                            <AvatarFallback className="text-xs font-semibold">
                              {userInitials}
                            </AvatarFallback>
                          </Avatar>
                          <div className="min-w-0">
                            <p className="text-sm font-medium truncate">{displayName}</p>
                          </div>
                        </DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        {showAdminLink && (
                          <DropdownMenuItem asChild>
                            <Link href="/dashboard" className="flex items-center gap-2">
                              <LayoutDashboard className="h-4 w-4" />
                              Panel Admin
                            </Link>
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuSeparator />
                        <DropdownMenuItem variant="destructive" onSelect={handleSignOut}>
                          <LogOut className="h-4 w-4" />
                          Cerrar sesión
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  ) : (
                    <Button asChild size="sm" className="rounded-full px-4">
                      <Link href="/login">Ingresar</Link>
                    </Button>
                  )}
                </div>
                <Button variant="outline" className="relative bg-transparent rounded-full" onClick={openCart}>
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

      <Dialog open={isCartOpen} onOpenChange={setIsCartOpen}>
        <DialogContent className="sm:max-w-lg bg-card/90 backdrop-blur border border-border/60 shadow-xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center">
                <ShoppingCart className="h-5 w-5 text-primary" />
              </div>
              Carrito de Compras
            </DialogTitle>
          </DialogHeader>

          {cart.length === 0 ? (
            <div className="flex flex-col items-center justify-center text-center py-8">
              <ShoppingCart className="h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-muted-foreground">Tu carrito está vacío</p>
              <p className="text-sm text-muted-foreground mt-1">
                Agrega productos para continuar
              </p>
            </div>
          ) : (
            <>
              <div className="max-h-[55vh] overflow-auto space-y-3 pr-1">
                {cart.map((item) => (
                  <div
                    key={item.product.id}
                    className="flex gap-3 rounded-xl border border-border/60 bg-background/70 p-3"
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

              <DialogFooter className="flex-col gap-4 border-t border-border/60 pt-4 sm:flex-row sm:items-center">
                <div className="flex justify-between items-center w-full sm:w-auto sm:min-w-[200px]">
                  <span className="text-muted-foreground">Total</span>
                  <span className="text-xl font-bold text-foreground">
                    {formatPrice(cartTotal)}
                  </span>
                </div>
                <Button className="w-full sm:w-auto" size="lg" onClick={handleCheckout}>
                  Finalizar Compra
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      <main className={`container mx-auto px-4 ${showHeader ? 'py-8' : 'py-6 sm:py-8'}`}>
        <div className="mb-6 rounded-3xl border border-border/60 bg-gradient-to-r from-primary/10 via-background to-primary/5 p-5 sm:p-6">
          <h2 className="text-3xl sm:text-4xl font-bold text-foreground text-balance">
            Nuestros Helados
          </h2>
          <p className="text-muted-foreground mt-1">
            {filteredProducts.length} productos disponibles
          </p>
          <div className="mt-4 lg:hidden">
            <Button
              size="sm"
              variant="outline"
              className="rounded-full px-3 flex items-center gap-2"
              onClick={() => setIsFilterOpen(true)}
            >
              <SlidersHorizontal className="h-4 w-4" />
              Filtros
              {activeFiltersCount > 0 && (
                <Badge variant="secondary" className="ml-1 rounded-full px-2 text-[10px]">
                  {activeFiltersCount}
                </Badge>
              )}
            </Button>
          </div>
        </div>

        <div className="lg:grid lg:grid-cols-[240px_minmax(0,1fr)] lg:gap-6 lg:items-start">
          <aside className="hidden lg:block">
            <div className="sticky top-24 rounded-2xl border border-border/60 bg-card/70 p-4 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <p className="text-sm font-semibold text-foreground">Filtros</p>
                {activeFiltersCount > 0 && (
                  <Badge variant="secondary" className="rounded-full px-2 text-[10px]">
                    {activeFiltersCount}
                  </Badge>
                )}
              </div>

              <div className="space-y-5">
                <div>
                  <p className="text-xs uppercase tracking-wide text-muted-foreground mb-2">
                    Categorías
                  </p>
                  <div className="flex flex-col gap-2">
                    <Button
                      size="sm"
                      variant={categoryFilter === "all" ? "default" : "outline"}
                      className="justify-start rounded-full"
                      onClick={() => setCategoryFilter("all")}
                    >
                      Todos
                    </Button>
                    {categories.map((category) => (
                      <Button
                        key={category}
                        size="sm"
                        variant={categoryFilter === category ? "default" : "outline"}
                        className="justify-start rounded-full"
                        onClick={() => setCategoryFilter(category)}
                      >
                        {category}
                      </Button>
                    ))}
                  </div>
                </div>

                <div>
                  <p className="text-xs uppercase tracking-wide text-muted-foreground mb-2">
                    Precio
                  </p>
                  <div className="flex flex-col gap-2">
                    {priceRanges.map((range) => (
                      <Button
                        key={range.id}
                        size="sm"
                        variant={priceFilter === range.id ? "default" : "outline"}
                        className="justify-start rounded-full"
                        onClick={() => setPriceFilter(range.id)}
                      >
                        {range.label}
                      </Button>
                    ))}
                  </div>
                </div>

                <div>
                  <p className="text-xs uppercase tracking-wide text-muted-foreground mb-2">
                    Base
                  </p>
                  <div className="flex flex-col gap-2">
                    {[
                      { id: "all", label: "Todas" },
                      { id: "crema", label: "Crema" },
                      { id: "agua", label: "Agua" },
                    ].map((item) => (
                      <Button
                        key={item.id}
                        size="sm"
                        variant={baseFilter === item.id ? "default" : "outline"}
                        className="justify-start rounded-full"
                        onClick={() => setBaseFilter(item.id)}
                      >
                        {item.label}
                      </Button>
                    ))}
                  </div>
                </div>

                <div>
                  <p className="text-xs uppercase tracking-wide text-muted-foreground mb-2">
                    Disponibilidad
                  </p>
                  <div className="space-y-2">
                    <label className="flex items-center gap-2 text-sm text-foreground">
                      <Checkbox
                        checked={onlyInStock}
                        onCheckedChange={(value) => setOnlyInStock(Boolean(value))}
                      />
                      Solo disponibles
                    </label>
                    <label className="flex items-center gap-2 text-sm text-foreground">
                      <Checkbox
                        checked={onlyLowStock}
                        onCheckedChange={(value) => setOnlyLowStock(Boolean(value))}
                      />
                      Pocas unidades
                    </label>
                  </div>
                </div>

                <Button
                  size="sm"
                  variant="ghost"
                  className="justify-start"
                  onClick={() => {
                    setCategoryFilter("all")
                    setPriceFilter("all")
                    setBaseFilter("all")
                    setOnlyInStock(false)
                    setOnlyLowStock(false)
                  }}
                >
                  Limpiar filtros
                </Button>
              </div>
            </div>
          </aside>

          <div className="min-w-0 grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-1 sm:gap-4 auto-rows-min content-start items-start">
            {filteredProducts.map((product) => {
              const inCart = cart.find((item) => item.product.id === product.id)
              const isOutOfStock = product.stock === 0

              return (
                <Card
                  key={product.id}
                  className={`group overflow-hidden ${isOutOfStock ? "opacity-60" : ""} rounded-md border border-border/60 bg-card/80 shadow-sm transition hover:shadow-md hover:-translate-y-0.5`}
                >
                  <div className="relative aspect-[4/3] sm:aspect-square bg-muted">
                    <Image
                      src={product.imageUrl || "/placeholder.svg"}
                      alt={product.name}
                      fill
                      className="object-cover transition-transform duration-300 group-hover:scale-105"
                    />
                    {product.stock < 10 && product.stock > 0 && (
                      <Badge className="absolute top-2 right-2 bg-warning text-warning-foreground text-[10px]">
                        Pocas unidades
                      </Badge>
                    )}
                    {isOutOfStock && (
                      <div className="absolute inset-0 bg-background/80 flex items-center justify-center">
                        <Badge variant="secondary">Agotado</Badge>
                      </div>
                    )}
                  </div>
                  <CardContent className="p-1.5 sm:p-3">
                    <Badge variant="secondary" className="mb-1 text-[7px] uppercase tracking-wide">
                      {product.category}
                    </Badge>
                    <h3 className="font-semibold text-foreground line-clamp-1 text-[11px] sm:text-sm">
                      {product.name}
                    </h3>
                    <p className="text-[9px] text-muted-foreground line-clamp-1 mt-0.5">
                      {product.description}
                    </p>
                    <div className="flex items-center justify-between mt-1.5">
                      <span className="text-[11px] sm:text-base font-bold text-foreground">
                        {formatPrice(product.price)}
                      </span>
                      {inCart ? (
                        <div className="flex items-center gap-1">
                          <Button
                            variant="outline"
                            size="icon"
                          className="h-4 w-4 bg-transparent"
                            onClick={() => updateQuantity(product.id, -1)}
                          >
                          <Minus className="h-2.5 w-2.5" />
                          </Button>
                        <span className="w-4 text-center text-[9px] font-medium">
                            {inCart.quantity}
                          </span>
                          <Button
                            variant="outline"
                            size="icon"
                          className="h-4 w-4 bg-transparent"
                            onClick={() => updateQuantity(product.id, 1)}
                            disabled={inCart.quantity >= product.stock}
                          >
                          <Plus className="h-2.5 w-2.5" />
                          </Button>
                        </div>
                      ) : (
                        <Button
                          size="sm"
                        className="h-5 px-1 text-[9px]"
                          onClick={() => addToCart(product)}
                          disabled={isOutOfStock}
                        >
                        <Plus className="h-2.5 w-2.5 mr-0.5" />
                          Agregar
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        </div>
      </main>

      <Dialog open={isFilterOpen} onOpenChange={setIsFilterOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Filtros</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <p className="text-xs uppercase tracking-wide text-muted-foreground mb-2">
                Categorías
              </p>
              <div className="flex flex-wrap gap-2">
                <Button
                  size="sm"
                  variant={categoryFilter === "all" ? "default" : "outline"}
                  className="rounded-full px-3"
                  onClick={() => setCategoryFilter("all")}
                >
                  Todos
                </Button>
                {categories.map((category) => (
                  <Button
                    key={category}
                    size="sm"
                    variant={categoryFilter === category ? "default" : "outline"}
                    className="rounded-full px-3"
                    onClick={() => setCategoryFilter(category)}
                  >
                    {category}
                  </Button>
                ))}
              </div>
            </div>

            <div>
              <p className="text-xs uppercase tracking-wide text-muted-foreground mb-2">
                Precio
              </p>
              <div className="flex flex-wrap gap-2">
                {priceRanges.map((range) => (
                  <Button
                    key={range.id}
                    size="sm"
                    variant={priceFilter === range.id ? "default" : "outline"}
                    className="rounded-full px-3"
                    onClick={() => setPriceFilter(range.id)}
                  >
                    {range.label}
                  </Button>
                ))}
              </div>
            </div>

            <div>
              <p className="text-xs uppercase tracking-wide text-muted-foreground mb-2">
                Base
              </p>
              <div className="flex flex-wrap gap-2">
                {[
                  { id: "all", label: "Todas" },
                  { id: "crema", label: "Crema" },
                  { id: "agua", label: "Agua" },
                ].map((item) => (
                  <Button
                    key={item.id}
                    size="sm"
                    variant={baseFilter === item.id ? "default" : "outline"}
                    className="rounded-full px-3"
                    onClick={() => setBaseFilter(item.id)}
                  >
                    {item.label}
                  </Button>
                ))}
              </div>
            </div>

            <div>
              <p className="text-xs uppercase tracking-wide text-muted-foreground mb-2">
                Disponibilidad
              </p>
              <div className="space-y-2">
                <label className="flex items-center gap-2 text-sm text-foreground">
                  <Checkbox
                    checked={onlyInStock}
                    onCheckedChange={(value) => setOnlyInStock(Boolean(value))}
                  />
                  Solo disponibles
                </label>
                <label className="flex items-center gap-2 text-sm text-foreground">
                  <Checkbox
                    checked={onlyLowStock}
                    onCheckedChange={(value) => setOnlyLowStock(Boolean(value))}
                  />
                  Pocas unidades
                </label>
              </div>
            </div>
          </div>

          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setCategoryFilter("all")
                setPriceFilter("all")
                setBaseFilter("all")
                setOnlyInStock(false)
                setOnlyLowStock(false)
              }}
            >
              Limpiar
            </Button>
            <Button onClick={() => setIsFilterOpen(false)}>Aplicar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Payment Method Modal */}
      <Dialog open={showPaymentModal} onOpenChange={setShowPaymentModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{isPublicStore ? 'Confirmar Pedido' : 'Método de Pago'}</DialogTitle>
          </DialogHeader>
          
          <div className="py-4">
            {isPublicStore ? (
              <div className="space-y-3">
                {sellerMatchName && (
                  <div className="rounded-lg border border-success/30 bg-success/10 px-3 py-2 text-sm text-success">
                    Pedido registrado a vendedor: <span className="font-medium">{sellerMatchName}</span>
                  </div>
                )}
                <div className="space-y-2">
                  <Label htmlFor="dni">DNI</Label>
                  <Input
                    id="dni"
                    placeholder="Ej: 30123456"
                    value={publicDni}
                    onChange={(e) => setPublicDni(e.target.value)}
                  />
                  {publicLookupLoading ? (
                    <p className="text-xs text-muted-foreground">Buscando cliente...</p>
                  ) : publicClientFound ? (
                    <p className="text-xs text-success">Cliente encontrado. Datos autocompletados.</p>
                  ) : (
                    <p className="text-xs text-muted-foreground">
                      Si existe, se autocompletan los datos.
                    </p>
                  )}
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
                {cartTotal > 100000 && (
                  <div className="space-y-2">
                    <Label htmlFor="cuit">CUIL / CUIT</Label>
                    <Input
                      id="cuit"
                      placeholder="CUIL o CUIT"
                      value={publicCuit}
                      onChange={(e) => setPublicCuit(e.target.value)}
                      required
                    />
                    <p className="text-xs text-muted-foreground">
                      Requerido para pedidos mayores a $100.000
                    </p>
                  </div>
                )}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="email@ejemplo.com"
                      value={publicEmail}
                      onChange={(e) => setPublicEmail(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="phone">Teléfono</Label>
                    <Input
                      id="phone"
                      placeholder="011-4555-1234"
                      value={publicPhone}
                      onChange={(e) => setPublicPhone(e.target.value)}
                    />
                  </div>
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
                <div className="space-y-2">
                  <Label htmlFor="taxCategory">Categoría Fiscal</Label>
                  <select
                    id="taxCategory"
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                    value={publicTaxCategory}
                    onChange={(e) => setPublicTaxCategory(e.target.value as typeof publicTaxCategory)}
                  >
                    <option value="responsable_inscripto">Responsable Inscripto</option>
                    <option value="monotributo">Monotributo</option>
                    <option value="consumidor_final">Consumidor Final</option>
                    <option value="exento">Exento</option>
                    <option value="no_responsable">No Responsable</option>
                  </select>
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
        <DialogContent className="sm:max-w-md bg-card/90 backdrop-blur border border-border/60 shadow-xl">
          <DialogHeader>
            <DialogTitle className="sr-only">
              {isPublicStore ? 'Pedido Recibido' : 'Venta Completada'}
            </DialogTitle>
          </DialogHeader>
          <div className="text-center py-2">
            <div className="mx-auto h-16 w-16 rounded-full bg-success/10 flex items-center justify-center mb-4 ring-1 ring-success/20">
              <CheckCircle className="h-8 w-8 text-success" />
            </div>
            <h2 className="text-xl font-bold text-foreground mb-1">
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
              <div className="mt-5 rounded-xl border border-border/60 bg-background/70 px-4 py-3 text-left">
                <p className="text-sm font-medium text-foreground">¡Gracias por tu pedido!</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Te vamos a contactar para coordinar la entrega. Podés cerrar esta ventana y seguir navegando.
                </p>
              </div>
            ) : (
              <div className="mt-5 p-4 bg-muted/60 rounded-xl">
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

          <DialogFooter className="flex-col sm:flex-row gap-2 pt-2">
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
