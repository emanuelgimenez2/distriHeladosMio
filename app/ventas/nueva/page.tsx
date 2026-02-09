// app/ventas/nueva/page.tsx
"use client";

import { useEffect, useState, memo, useRef } from "react";
import React from "react";
import { useRouter } from "next/navigation";
import { MainLayout } from "@/components/layout/main-layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  productsApi,
  clientsApi,
  salesApi,
  sellersApi,
} from "@/lib/api";
import type { Product, Client, CartItem, Seller } from "@/lib/types";
import {
  Search,
  Plus,
  Minus,
  Trash2,
  ShoppingCart,
  CreditCard,
  Banknote,
  Loader2,
  CheckCircle,
  UserPlus,
  User,
  ArrowLeft,
  FileText,
  Receipt,
  Sparkles,
  Package,
  X,
  Eye,
  EyeOff,
  Edit3,
  Truck,
  Home,
  MapPin,
} from "lucide-react";
import { toast } from "sonner";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";

export default function NuevaVentaPage() {
  const router = useRouter();
  const [products, setProducts] = useState<Product[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [sellers, setSellers] = useState<Seller[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [cart, setCart] = useState<CartItem[]>([]);
  const [selectedClient, setSelectedClient] = useState<string>("");
  const [selectedSeller, setSelectedSeller] = useState<string>("");
  const [paymentType, setPaymentType] = useState<"cash" | "credit" | "mixed">(
    "cash",
  );
  const [cashAmount, setCashAmount] = useState<number>(0);
  const [creditAmountInput, setCreditAmountInput] = useState<number>(0);
  const [clientPhone, setClientPhone] = useState("");
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [saleComplete, setSaleComplete] = useState(false);
  const [lastSaleId, setLastSaleId] = useState<string>("");
  const [cartDialogOpen, setCartDialogOpen] = useState(false);
  const [showDisabled, setShowDisabled] = useState(false);
  const [editingQuantity, setEditingQuantity] = useState<{
    [key: string]: boolean;
  }>({});

  const [deliveryMethod, setDeliveryMethod] = useState<"pickup" | "delivery">("pickup");
  const [deliveryAddress, setDeliveryAddress] = useState<"saved" | "new">("saved");
  const [newAddress, setNewAddress] = useState("");

  const [newClientModalOpen, setNewClientModalOpen] = useState(false);
  const [savingClient, setSavingClient] = useState(false);
  const [newClientForm, setNewClientForm] = useState({
    name: "",
    cuit: "",
    dni: "",
    phone: "",
    email: "",
    creditLimit: 50000,
    taxCategory: "consumidor_final" as "consumidor_final" | "monotributo" | "responsable_inscripto" | "exento" | "no_responsable",
    address: "",
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [productsData, clientsData, sellersData] = await Promise.all([
        productsApi.getAll(),
        clientsApi.getAll(),
        sellersApi.getAll(),
      ]);
      setProducts(productsData);
      setClients(clientsData);
      setSellers(sellersData.filter((s) => s.isActive));
    } catch (error) {
      console.error("Error loading data:", error);
    } finally {
      setLoading(false);
    }
  };

  const addToCart = (product: Product) => {
    const existing = cart.find((item) => item.product.id === product.id);
    if (existing) {
      if (existing.quantity < product.stock) {
        setCart(
          cart.map((item) =>
            item.product.id === product.id
              ? { ...item, quantity: item.quantity + 1 }
              : item,
          ),
        );
      }
    } else {
      setCart([...cart, { product, quantity: 1 }]);
    }
  };

  const updateQuantity = (productId: string, delta: number) => {
    setCart(
      cart.map((item) => {
        if (item.product.id === productId) {
          const newQuantity = item.quantity + delta;
          if (newQuantity <= 0) return item;
          if (newQuantity > item.product.stock) return item;
          return { ...item, quantity: newQuantity };
        }
        return item;
      }),
    );
  };

  const setQuantityDirect = (productId: string, value: number) => {
    const item = cart.find((i) => i.product.id === productId);
    if (!item) return;

    const newQuantity = Math.max(1, Math.min(value, item.product.stock));
    setCart(
      cart.map((i) =>
        i.product.id === productId ? { ...i, quantity: newQuantity } : i,
      ),
    );
  };

  const removeFromCart = (productId: string) => {
    setCart(cart.filter((item) => item.product.id !== productId));
  };

  const cartTotal = cart.reduce(
    (acc, item) => acc + item.product.price * item.quantity,
    0,
  );
  const cartItemsCount = cart.reduce((acc, item) => acc + item.quantity, 0);
  
  const creditAmount =
    paymentType === "mixed"
      ? creditAmountInput
      : paymentType === "credit"
        ? cartTotal
        : 0;

  const filteredProducts = products.filter((product) => {
    const matchesSearch =
      product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      product.category.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesDisabled = showDisabled || !(product as any).disabled;

    return matchesSearch && matchesDisabled;
  });

  const enabledProducts = filteredProducts.filter((p) => !(p as any).disabled);
  const disabledProducts = filteredProducts.filter((p) => (p as any).disabled);

  const selectedClientData = clients.find((c) => c.id === selectedClient);
  const selectedSellerData = sellers.find((s) => s.id === selectedSeller);

  useEffect(() => {
    if (paymentType === "cash") {
      setCashAmount(cartTotal);
      setCreditAmountInput(0);
    } else if (paymentType === "credit") {
      setCashAmount(0);
      setCreditAmountInput(cartTotal);
    } else if (paymentType === "mixed") {
      if (cashAmount === 0 || cashAmount >= cartTotal) {
        const halfTotal = Math.floor(cartTotal / 2);
        setCashAmount(halfTotal);
        setCreditAmountInput(cartTotal - halfTotal);
      } else {
        setCreditAmountInput(cartTotal - cashAmount);
      }
    }
  }, [paymentType, cartTotal]);

  const handleCashAmountChange = (value: number) => {
    const validValue = Math.max(0, Math.min(value, cartTotal));
    setCashAmount(validValue);
    setCreditAmountInput(cartTotal - validValue);
  };

  const handleCreditAmountChange = (value: number) => {
    const validValue = Math.max(0, Math.min(value, cartTotal));
    setCreditAmountInput(validValue);
    setCashAmount(cartTotal - validValue);
  };

  const canProcessSale = () => {
    if (cart.length === 0) return false;
    if (!selectedClient) return false;
    if (!selectedClientData) return false;

    if (deliveryMethod === "delivery") {
      if (deliveryAddress === "saved" && !selectedClientData.address) return false;
      if (deliveryAddress === "new" && !newAddress.trim()) return false;
    }

    if (paymentType === "credit" || paymentType === "mixed") {
      const amountToCredit =
        paymentType === "credit" ? cartTotal : creditAmount;
      if (
        selectedClientData.currentBalance + amountToCredit >
        selectedClientData.creditLimit
      )
        return false;
    }
    if (paymentType === "mixed" && cashAmount <= 0) return false;
    if (paymentType === "mixed" && cashAmount >= cartTotal) return false;
    return true;
  };

  const handleProcessSale = async () => {
    setProcessing(true);
    try {
      const resolvedClientPhone = clientPhone || selectedClientData?.phone;
      const resolvedClientName = selectedClientData?.name;
      const resolvedAddress = deliveryMethod === "delivery"
        ? (deliveryAddress === "saved" ? selectedClientData?.address : newAddress)
        : "Retiro en local";

      const sale = await salesApi.processSale({
        clientId: selectedClient,
        clientName: resolvedClientName,
        clientPhone: resolvedClientPhone,
        sellerId:
          selectedSeller && selectedSeller !== "none"
            ? selectedSeller
            : undefined,
        sellerName: selectedSellerData?.name,
        items: cart,
        paymentType,
        cashAmount:
          paymentType === "mixed"
            ? cashAmount
            : paymentType === "cash"
              ? cartTotal
              : undefined,
        creditAmount:
          paymentType === "mixed"
            ? creditAmount
            : paymentType === "credit"
              ? cartTotal
              : undefined,
        source: "direct",
        createOrder: deliveryMethod === "delivery",
        deliveryMethod,
        deliveryAddress: resolvedAddress,
      });
      setLastSaleId(sale.id);
      setSaleComplete(true);
      toast.success("Venta procesada correctamente");
    } catch (error) {
      console.error("Error processing sale:", error);
      toast.error("Error al procesar la venta");
    } finally {
      setProcessing(false);
      setConfirmDialogOpen(false);
    }
  };

  const handleNewSale = () => {
    setCart([]);
    setSelectedClient("");
    setSelectedSeller("");
    setPaymentType("cash");
    setCashAmount(0);
    setCreditAmountInput(0);
    setClientPhone("");
    setDeliveryMethod("pickup");
    setDeliveryAddress("saved");
    setNewAddress("");
    setSaleComplete(false);
    setLastSaleId("");
    loadData();
  };

  const handleCreateNewClient = async () => {
    if (!newClientForm.name.trim() || !newClientForm.cuit.trim()) {
      toast.error("Nombre y CUIT son requeridos");
      return;
    }

    setSavingClient(true);
    try {
      const newClient = await clientsApi.create({
        name: newClientForm.name,
        cuit: newClientForm.cuit,
        dni: newClientForm.dni,
        phone: newClientForm.phone,
        email: newClientForm.email,
        creditLimit: newClientForm.creditLimit,
        address: newClientForm.address,
        taxCategory: newClientForm.taxCategory,
        notes: "",
      });
      setClients([newClient, ...clients]);
      setSelectedClient(newClient.id);
      setNewClientModalOpen(false);
      setNewClientForm({
        name: "",
        cuit: "",
        dni: "",
        phone: "",
        email: "",
        creditLimit: 50000,
        taxCategory: "consumidor_final",
        address: "",
      });
      toast.success("Cliente creado correctamente");
    } catch (error) {
      console.error("Error creating client:", error);
      toast.error("Error al crear el cliente");
    } finally {
      setSavingClient(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("es-AR", {
      style: "currency",
      currency: "ARS",
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const getRemainingStock = (item: CartItem) => {
    return item.product.stock - item.quantity;
  };

  const CartContent = React.memo(() => (
    <div className="flex flex-col h-full">
      {cart.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center py-8 text-center">
          <div className="h-16 w-16 rounded-full bg-gradient-to-br from-muted/30 to-muted/10 flex items-center justify-center mb-3">
            <ShoppingCart className="h-8 w-8 text-muted-foreground/40" />
          </div>
          <p className="text-sm font-medium text-muted-foreground">
            Carrito vacío
          </p>
          <p className="text-xs text-muted-foreground/60 mt-1">
            Selecciona productos para comenzar
          </p>
        </div>
      ) : (
        <>
          <div className="flex-1 overflow-y-auto space-y-2 pr-1 pb-3 max-h-[200px]">
            {cart.map((item) => {
              const remaining = getRemainingStock(item);
              const isEditing = editingQuantity[item.product.id];

              return (
                <div
                  key={item.product.id}
                  className="group relative flex items-start gap-3 p-3 rounded-lg bg-card border border-border/50 hover:border-border transition-all"
                >
                  <img
                    src={item.product.imageUrl || "/placeholder.svg"}
                    alt={item.product.name}
                    className="w-14 h-14 rounded-md object-cover shrink-0 border border-border/30"
                  />

                  <div className="flex-1 min-w-0 space-y-1.5">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm text-foreground truncate leading-tight">
                          {item.product.name}
                        </p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {formatCurrency(item.product.price)} c/u
                        </p>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-muted-foreground hover:text-destructive hover:bg-destructive/5 shrink-0"
                        onClick={() => removeFromCart(item.product.id)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>

                    <div className="flex items-center gap-2">
                      <div className="flex items-center gap-1 bg-muted/30 rounded-lg p-0.5 border border-primary/20">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 rounded-md hover:bg-background"
                          onClick={() => updateQuantity(item.product.id, -1)}
                          disabled={item.quantity <= 1}
                        >
                          <Minus className="h-3 w-3" />
                        </Button>

                        <Input
                          type="number"
                          min="1"
                          max={item.product.stock}
                          value={item.quantity}
                          onChange={(e) => {
                            const val = parseInt(e.target.value) || 1;
                            setQuantityDirect(item.product.id, val);
                          }}
                          className="h-7 w-16 text-center text-sm font-semibold px-1 bg-background/50 border-border/50 focus-visible:ring-1 focus-visible:ring-primary"
                        />

                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 rounded-md hover:bg-background"
                          onClick={() => updateQuantity(item.product.id, 1)}
                          disabled={item.quantity >= item.product.stock}
                        >
                          <Plus className="h-3 w-3" />
                        </Button>
                      </div>

                      <div className="flex-1 flex items-center justify-between gap-2">
                        <span
                          className={cn(
                            "text-xs font-medium",
                            remaining > 15
                              ? "text-emerald-600"
                              : "text-destructive",
                          )}
                        >
                          Quedan {remaining}
                        </span>
                        <span className="text-sm font-bold text-foreground">
                          {formatCurrency(item.product.price * item.quantity)}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="border-t border-border pt-3 mt-auto space-y-3">
            <div className="flex justify-between items-center px-1">
              <span className="text-sm font-medium text-muted-foreground">
                Total
              </span>
              <span className="text-2xl font-bold text-foreground">
                {formatCurrency(cartTotal)}
              </span>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-medium text-foreground">
                  Cliente <span className="text-destructive">*</span>
                </Label>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-6 text-xs gap-1 text-primary px-2 hover:bg-primary/5"
                  onClick={() => setNewClientModalOpen(true)}
                >
                  <UserPlus className="h-3 w-3" />
                  Nuevo
                </Button>
              </div>
              <Select value={selectedClient} onValueChange={setSelectedClient}>
                <SelectTrigger className="h-9 text-sm">
                  <SelectValue placeholder="Seleccionar cliente" />
                </SelectTrigger>
                <SelectContent>
                  {clients.map((client) => (
                    <SelectItem
                      key={client.id}
                      value={client.id}
                      className="text-sm"
                    >
                      {client.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {selectedClientData && (
                <div className="p-2 rounded-lg bg-muted/40 text-xs space-y-1">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Saldo actual:</span>
                    <span className="font-medium text-foreground">
                      {formatCurrency(selectedClientData.currentBalance)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Límite:</span>
                    <span className="font-medium text-foreground">
                      {formatCurrency(selectedClientData.creditLimit)}
                    </span>
                  </div>
                </div>
              )}
            </div>

            <div className="space-y-2">
              <Label className="text-xs font-medium text-foreground">
                Vendedor (opcional)
              </Label>
              <Select value={selectedSeller} onValueChange={setSelectedSeller}>
                <SelectTrigger className="h-9 text-sm">
                  <SelectValue placeholder="Sin vendedor" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none" className="text-sm">
                    Sin vendedor
                  </SelectItem>
                  {sellers.map((seller) => (
                    <SelectItem
                      key={seller.id}
                      value={seller.id}
                      className="text-sm"
                    >
                      {seller.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="text-xs font-medium text-foreground">
                Método de Entrega
              </Label>
              <div className="grid grid-cols-2 gap-2">
                <Button
                  type="button"
                  variant={deliveryMethod === "pickup" ? "default" : "outline"}
                  className={cn(
                    "h-auto py-2 flex-col gap-1 text-xs font-medium transition-all",
                    deliveryMethod === "pickup" &&
                      "bg-primary hover:bg-primary/90 shadow-md",
                  )}
                  onClick={() => setDeliveryMethod("pickup")}
                >
                  <Home className="h-4 w-4" />
                  Retiro
                </Button>
                <Button
                  type="button"
                  variant={deliveryMethod === "delivery" ? "default" : "outline"}
                  className={cn(
                    "h-auto py-2 flex-col gap-1 text-xs font-medium transition-all",
                    deliveryMethod === "delivery" &&
                      "bg-primary hover:bg-primary/90 shadow-md",
                  )}
                  onClick={() => setDeliveryMethod("delivery")}
                >
                  <Truck className="h-4 w-4" />
                  A Enviar
                </Button>
              </div>
            </div>

            {deliveryMethod === "delivery" && (
              <div className="space-y-2 p-3 rounded-lg bg-primary/5 border border-primary/20">
                <Label className="text-xs font-medium text-foreground">
                  Dirección de Entrega
                </Label>
                <div className="space-y-2">
                  {selectedClientData?.address && (
                    <Button
                      type="button"
                      variant={deliveryAddress === "saved" ? "default" : "outline"}
                      className="w-full h-auto py-2 px-3 text-xs font-medium justify-start"
                      onClick={() => setDeliveryAddress("saved")}
                    >
                      <MapPin className="h-3.5 w-3.5 mr-2 shrink-0" />
                      <span className="truncate text-left">{selectedClientData.address}</span>
                    </Button>
                  )}
                  <Button
                    type="button"
                    variant={deliveryAddress === "new" ? "default" : "outline"}
                    className="w-full h-auto py-2 flex-col gap-1 text-xs font-medium"
                    onClick={() => setDeliveryAddress("new")}
                  >
                    <MapPin className="h-3.5 w-3.5" />
                    Nueva Dirección
                  </Button>
                  {deliveryAddress === "new" && (
                    <Textarea
                      placeholder="Ingresa la dirección de entrega..."
                      value={newAddress}
                      onChange={(e) => setNewAddress(e.target.value)}
                      className="min-h-[60px] text-sm resize-none"
                    />
                  )}
                </div>
              </div>
            )}

            <div className="space-y-2">
              <Label className="text-xs font-medium text-foreground">
                Forma de Pago
              </Label>
              <div className="grid grid-cols-3 gap-2">
                <Button
                  type="button"
                  variant={paymentType === "cash" ? "default" : "outline"}
                  className={cn(
                    "h-auto py-2 flex-col gap-1 text-xs font-medium transition-all",
                    paymentType === "cash" &&
                      "bg-emerald-600 hover:bg-emerald-700 shadow-md",
                  )}
                  onClick={() => setPaymentType("cash")}
                >
                  <Banknote className="h-4 w-4" />
                  Contado
                </Button>
                <Button
                  type="button"
                  variant={paymentType === "credit" ? "default" : "outline"}
                  className={cn(
                    "h-auto py-2 flex-col gap-1 text-xs font-medium transition-all",
                    paymentType === "credit" &&
                      "bg-blue-600 hover:bg-blue-700 shadow-md",
                  )}
                  onClick={() => setPaymentType("credit")}
                >
                  <CreditCard className="h-4 w-4" />A Cuenta
                </Button>
                <Button
                  type="button"
                  variant={paymentType === "mixed" ? "default" : "outline"}
                  className={cn(
                    "h-auto py-2 flex-col gap-1 text-xs font-medium transition-all",
                    paymentType === "mixed" &&
                      "bg-amber-600 hover:bg-amber-700 shadow-md",
                  )}
                  onClick={() => setPaymentType("mixed")}
                >
                  <Sparkles className="h-4 w-4" />
                  Mixto
                </Button>
              </div>
            </div>

            {paymentType === "cash" && (
              <div className="space-y-2 p-3 rounded-lg bg-emerald-50/50 border border-emerald-200/50">
                <Label className="text-xs font-medium text-emerald-900">
                  Monto en Efectivo
                </Label>
                <Input
                  type="number"
                  min="0"
                  max={cartTotal}
                  value={cashAmount}
                  onChange={(e) => handleCashAmountChange(Number(e.target.value) || 0)}
                  className="h-9 text-sm border-emerald-200 focus-visible:ring-emerald-500"
                />
              </div>
            )}

            {paymentType === "credit" && (
              <div className="space-y-2 p-3 rounded-lg bg-blue-50/50 border border-blue-200/50">
                <Label className="text-xs font-medium text-blue-900">
                  Monto A Cuenta
                </Label>
                <Input
                  type="number"
                  min="0"
                  max={cartTotal}
                  value={creditAmountInput}
                  onChange={(e) => setCreditAmountInput(Number(e.target.value) || 0)}
                  className="h-9 text-sm border-blue-200 focus-visible:ring-blue-500"
                />
              </div>
            )}

            {paymentType === "mixed" && (
              <div className="space-y-2 p-3 rounded-lg bg-amber-50/50 border border-amber-200/50">
                <div className="space-y-2">
                  <Label className="text-xs font-medium text-amber-900">
                    Monto en Efectivo
                  </Label>
                  <Input
                    type="number"
                    min="0"
                    max={cartTotal}
                    value={cashAmount}
                    onChange={(e) => handleCashAmountChange(Number(e.target.value) || 0)}
                    className="h-9 text-sm border-amber-200 focus-visible:ring-amber-500"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs font-medium text-amber-900">
                    Monto A Cuenta
                  </Label>
                  <Input
                    type="number"
                    min="0"
                    max={cartTotal}
                    value={creditAmountInput}
                    onChange={(e) => handleCreditAmountChange(Number(e.target.value) || 0)}
                    className="h-9 text-sm border-amber-200 focus-visible:ring-amber-500"
                  />
                </div>
                <div className="flex justify-between text-xs pt-1 border-t border-amber-200/50">
                  <span className="text-amber-800 font-medium">Total:</span>
                  <span className="font-bold text-amber-900">
                    {formatCurrency(cashAmount + creditAmountInput)}
                  </span>
                </div>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="phone-input" className="text-xs font-medium text-foreground">
                Teléfono (opcional)
              </Label>
              <Input
                id="phone-input"
                type="tel"
                inputMode="tel"
                autoComplete="tel"
                placeholder="11 1234 5678"
                value={clientPhone}
                onChange={(e) => setClientPhone(e.target.value)}
                className="h-9 text-sm"
              />
            </div>

            <Button
              className="w-full h-10 text-sm font-semibold shadow-md"
              disabled={!canProcessSale()}
              onClick={() => setConfirmDialogOpen(true)}
            >
              Procesar Venta
            </Button>
          </div>
        </>
      )}
    </div>
  ));

  CartContent.displayName = "CartContent";

  if (saleComplete) {
    return (
      <MainLayout>
        <div className="flex flex-col min-h-[80vh]">
          <div className="mb-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => router.push("/ventas")}
              className="gap-2 text-sm h-9"
            >
              <ArrowLeft className="h-4 w-4" />
              Volver
            </Button>
          </div>

          <div className="flex-1 flex items-center justify-center px-4">
            <Card className="w-full max-w-md border-2 shadow-xl">
              <CardContent className="pt-8 pb-6 px-6">
                <div className="flex justify-center mb-6">
                  <div className="relative">
                    <div className="absolute inset-0 bg-emerald-500/20 rounded-full animate-ping" />
                    <div className="relative h-20 w-20 rounded-full bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center shadow-lg">
                      <CheckCircle className="h-10 w-10 text-white" />
                    </div>
                  </div>
                </div>

                <h2 className="text-2xl font-bold text-center mb-2">
                  ¡Venta Exitosa!
                </h2>
                <p className="text-sm text-muted-foreground text-center mb-6">
                  La venta se procesó correctamente
                </p>

                <div className="rounded-xl bg-gradient-to-br from-muted/30 to-muted/10 p-4 mb-5 space-y-2.5">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground font-medium">
                      Total
                    </span>
                    <span className="text-2xl font-bold text-foreground">
                      {formatCurrency(cartTotal)}
                    </span>
                  </div>
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-muted-foreground">Forma de pago</span>
                    <Badge
                      variant={
                        paymentType === "cash"
                          ? "default"
                          : paymentType === "credit"
                            ? "secondary"
                            : "outline"
                      }
                      className="text-xs font-medium"
                    >
                      {paymentType === "cash"
                        ? "Contado"
                        : paymentType === "credit"
                          ? "A Cuenta"
                          : "Mixto"}
                    </Badge>
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-2.5">
                    <Button
                      variant="outline"
                      className="h-10 text-sm gap-2"
                      onClick={() => router.push(`/ventas?saleId=${lastSaleId}`)}
                    >
                      <FileText className="h-4 w-4" />
                      Boleta
                    </Button>
                    <Button
                      variant="outline"
                      className="h-10 text-sm gap-2"
                      onClick={() => router.push(`/ventas?saleId=${lastSaleId}`)}
                    >
                      <Receipt className="h-4 w-4" />
                      Remito
                    </Button>
                  </div>

                  <Button
                    variant="outline"
                    className="w-full h-10 text-sm gap-2"
                    onClick={() => router.push("/ventas")}
                  >
                    <Eye className="h-4 w-4" />
                    Ver Todas las Ventas
                  </Button>

                  <Button
                    className="w-full h-10 text-sm gap-2 shadow-md"
                    onClick={handleNewSale}
                  >
                    <Plus className="h-4 w-4" />
                    Nueva Venta
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout title="Nueva Venta" description="Registra una nueva venta">
      <div className="space-y-4 pb-24 lg:pb-4">
        <div className="flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => router.push("/ventas")}
              className="h-9 w-9"
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold text-foreground">Nueva Venta</h1>
              <p className="text-sm text-muted-foreground">
                Registra una nueva venta
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-border bg-card">
              <EyeOff className="h-3.5 w-3.5 text-muted-foreground" />
              <span className="text-xs font-medium text-muted-foreground">
                Deshabilitados
              </span>
              <Switch
                checked={showDisabled}
                onCheckedChange={setShowDisabled}
                className="scale-75"
              />
            </div>
          </div>
        </div>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar productos..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 pr-10 h-11 text-sm rounded-xl border-2 focus-visible:ring-2"
          />
          {searchQuery && (
            <Button
              variant="ghost"
              size="icon"
              className="absolute right-2 top-1/2 -translate-y-1/2 h-7 w-7"
              onClick={() => setSearchQuery("")}
            >
              <X className="h-3.5 w-3.5" />
            </Button>
          )}
        </div>

        {loading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
            {[...Array(10)].map((_, i) => (
              <Skeleton key={i} className="h-52 rounded-xl" />
            ))}
          </div>
        ) : filteredProducts.length === 0 ? (
          <div className="text-center py-16">
            <div className="h-20 w-20 rounded-full bg-muted/50 flex items-center justify-center mx-auto mb-4">
              <Package className="h-10 w-10 text-muted-foreground/40" />
            </div>
            <h3 className="text-lg font-semibold text-foreground mb-2">
              No se encontraron productos
            </h3>
            <p className="text-sm text-muted-foreground">
              {searchQuery
                ? `No hay productos que coincidan con "${searchQuery}"`
                : "No hay productos disponibles"}
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {enabledProducts.length > 0 && (
              <div>
                <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
                  <div className="h-1 flex-1 bg-gradient-to-r from-primary/20 to-transparent rounded" />
                  <span>Habilitados</span>
                  <div className="h-1 flex-1 bg-gradient-to-l from-primary/20 to-transparent rounded" />
                </h3>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
                  {enabledProducts.map((product) => {
                    const inCart = cart.find((item) => item.product.id === product.id);

                    return (
                      <Card
                        key={product.id}
                        className={cn(
                          "group cursor-pointer transition-all duration-200 hover:shadow-lg border-2 overflow-hidden",
                          product.stock === 0 ? "opacity-40 cursor-not-allowed" : "",
                          inCart
                            ? "border-primary ring-2 ring-primary/20 shadow-md"
                            : "border-transparent hover:border-border",
                        )}
                        onClick={() => product.stock > 0 && addToCart(product)}
                      >
                        <CardContent className="p-0">
                          <div className="relative aspect-square overflow-hidden bg-muted">
                            <img
                              src={product.imageUrl || "/placeholder.svg"}
                              alt={product.name}
                              className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                            />
                            {inCart && (
                              <div className="absolute top-2 right-2 h-7 w-7 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold shadow-lg ring-2 ring-background">
                                {inCart.quantity}
                              </div>
                            )}
                            {product.stock <= 5 && product.stock > 0 && (
                              <Badge
                                variant="destructive"
                                className="absolute bottom-2 left-2 text-[10px] py-0 px-2 shadow-md"
                              >
                                Bajo stock
                              </Badge>
                            )}
                            {product.stock === 0 && (
                              <div className="absolute inset-0 bg-background/90 backdrop-blur-sm flex items-center justify-center">
                                <Badge variant="secondary" className="text-xs font-medium">
                                  Sin stock
                                </Badge>
                              </div>
                            )}
                          </div>
                          <div className="p-3">
                            <h3 className="font-semibold text-sm text-foreground line-clamp-2 mb-1.5 min-h-[2.5rem]">
                              {product.name}
                            </h3>
                            <div className="flex items-center justify-between">
                              <span className="font-bold text-base text-primary">
                                {formatCurrency(product.price)}
                              </span>
                              <span className="text-xs text-muted-foreground font-medium">
                                {product.stock} uds
                              </span>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              </div>
            )}

            {showDisabled && disabledProducts.length > 0 && (
              <div>
                <h3 className="text-sm font-semibold text-muted-foreground mb-3 flex items-center gap-2">
                  <div className="h-1 flex-1 bg-gradient-to-r from-muted-foreground/20 to-transparent rounded" />
                  <span>Deshabilitados</span>
                  <div className="h-1 flex-1 bg-gradient-to-l from-muted-foreground/20 to-transparent rounded" />
                </h3>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
                  {disabledProducts.map((product) => {
                    const inCart = cart.find((item) => item.product.id === product.id);

                    return (
                      <Card
                        key={product.id}
                        className={cn(
                          "group cursor-pointer transition-all duration-200 hover:shadow-lg border-2 overflow-hidden opacity-60 border-dashed",
                          product.stock === 0 ? "opacity-40 cursor-not-allowed" : "",
                          inCart
                            ? "border-primary ring-2 ring-primary/20 shadow-md"
                            : "border-transparent hover:border-border",
                        )}
                        onClick={() => product.stock > 0 && addToCart(product)}
                      >
                        <CardContent className="p-0">
                          <div className="relative aspect-square overflow-hidden bg-muted">
                            <img
                              src={product.imageUrl || "/placeholder.svg"}
                              alt={product.name}
                              className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                            />
                            <div className="absolute top-2 left-2">
                              <Badge
                                variant="secondary"
                                className="text-[10px] px-1.5 py-0 bg-background/80 backdrop-blur"
                              >
                                <EyeOff className="h-2.5 w-2.5 mr-0.5" />
                                Oculto
                              </Badge>
                            </div>
                            {inCart && (
                              <div className="absolute top-2 right-2 h-7 w-7 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold shadow-lg ring-2 ring-background">
                                {inCart.quantity}
                              </div>
                            )}
                            {product.stock <= 5 && product.stock > 0 && (
                              <Badge
                                variant="destructive"
                                className="absolute bottom-2 left-2 text-[10px] py-0 px-2 shadow-md"
                              >
                                Bajo stock
                              </Badge>
                            )}
                            {product.stock === 0 && (
                              <div className="absolute inset-0 bg-background/90 backdrop-blur-sm flex items-center justify-center">
                                <Badge variant="secondary" className="text-xs font-medium">
                                  Sin stock
                                </Badge>
                              </div>
                            )}
                          </div>
                          <div className="p-3">
                            <h3 className="font-semibold text-sm text-foreground line-clamp-2 mb-1.5 min-h-[2.5rem]">
                              {product.name}
                            </h3>
                            <div className="flex items-center justify-between">
                              <span className="font-bold text-base text-primary">
                                {formatCurrency(product.price)}
                              </span>
                              <span className="text-xs text-muted-foreground font-medium">
                                {product.stock} uds
                              </span>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      <div className="fixed bottom-6 right-6 z-50">
        <Button
          size="lg"
          className={cn(
            "h-16 w-16 rounded-full shadow-2xl transition-all duration-300 relative",
            cart.length > 0
              ? "bg-primary hover:bg-primary/90 scale-100"
              : "bg-muted/50 scale-90 opacity-50",
          )}
          onClick={() => setCartDialogOpen(true)}
          disabled={cart.length === 0}
        >
          <ShoppingCart className="h-7 w-7 text-white" />
          {cart.length > 0 && (
            <div className="absolute -top-1 -right-1 h-6 w-6 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center text-[11px] font-bold ring-2 ring-background">
              {cartItemsCount}
            </div>
          )}
        </Button>
      </div>

      <Dialog open={cartDialogOpen} onOpenChange={setCartDialogOpen}>
        <DialogContent
          className="max-w-sm sm:max-w-md max-h-[85vh] sm:max-h-[90vh] overflow-y-auto p-0 gap-0"
          onOpenAutoFocus={(e) => e.preventDefault()}
        >
          <DialogHeader className="px-4 sm:px-5 py-3 sm:py-4 border-b border-border bg-muted/30">
            <DialogTitle className="flex items-center gap-2 text-base sm:text-lg">
              <ShoppingCart className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
              Carrito
              {cart.length > 0 && (
                <Badge variant="secondary" className="text-xs">
                  {cartItemsCount} items
                </Badge>
              )}
            </DialogTitle>
            <DialogDescription className="sr-only">
              Revisa y gestiona los productos en tu carrito
            </DialogDescription>
          </DialogHeader>

          <div className="px-4 sm:px-5 py-3 sm:py-4">
            <CartContent />
          </div>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={confirmDialogOpen}
        onOpenChange={setConfirmDialogOpen}
        title="Confirmar Venta"
        description={`¿Procesar venta por ${formatCurrency(cartTotal)}${
          paymentType === "cash"
            ? " en efectivo"
            : paymentType === "credit"
              ? ` a cuenta de ${selectedClientData?.name || "cliente"}`
              : ` (${formatCurrency(cashAmount)} efectivo + ${formatCurrency(creditAmount)} a cuenta)`
        }${selectedSellerData ? ` - Vendedor: ${selectedSellerData.name}` : ""}${deliveryMethod === "delivery" ? " - A Enviar" : " - Retiro en local"}?`}
        confirmText={processing ? "Procesando..." : "Confirmar"}
        confirmDisabled={processing}
        onConfirm={handleProcessSale}
      />

      <Dialog open={newClientModalOpen} onOpenChange={setNewClientModalOpen}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-lg">
              <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center">
                <User className="h-5 w-5 text-primary" />
              </div>
              Nuevo Cliente
            </DialogTitle>
            <DialogDescription className="text-sm">
              Completa los datos del cliente
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 pt-2">
            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-foreground border-b pb-2">
                Datos Principales
              </h3>
              
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label htmlFor="newClientName" className="text-sm font-medium">
                    Nombre <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="newClientName"
                    value={newClientForm.name}
                    onChange={(e) =>
                      setNewClientForm({ ...newClientForm, name: e.target.value })
                    }
                    placeholder="Nombre del cliente"
                    className="h-10 text-sm"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="newClientCuit" className="text-sm font-medium">
                    CUIT <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="newClientCuit"
                    value={newClientForm.cuit}
                    onChange={(e) =>
                      setNewClientForm({ ...newClientForm, cuit: e.target.value })
                    }
                    placeholder="20-12345678-9"
                    className="h-10 text-sm"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="newClientDni" className="text-sm font-medium">
                  DNI
                </Label>
                <Input
                  id="newClientDni"
                  value={newClientForm.dni}
                  onChange={(e) =>
                    setNewClientForm({ ...newClientForm, dni: e.target.value })
                  }
                  placeholder="12345678"
                  className="h-10 text-sm"
                />
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-medium">Categoría Fiscal</Label>
                <Select 
                  value={newClientForm.taxCategory} 
                  onValueChange={(value: any) => setNewClientForm({ ...newClientForm, taxCategory: value })}
                >
                  <SelectTrigger className="h-10 text-sm">
                    <SelectValue placeholder="Seleccionar categoría" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="consumidor_final" className="text-sm">
                      Consumidor Final
                    </SelectItem>
                    <SelectItem value="monotributo" className="text-sm">
                      Monotributista
                    </SelectItem>
                    <SelectItem value="responsable_inscripto" className="text-sm">
                      Responsable Inscripto
                    </SelectItem>
                    <SelectItem value="exento" className="text-sm">
                      Exento
                    </SelectItem>
                    <SelectItem value="no_responsable" className="text-sm">
                      No Responsable
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-foreground border-b pb-2">
                Contacto
              </h3>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label htmlFor="newClientPhone" className="text-sm font-medium">
                    Teléfono
                  </Label>
                  <Input
                    id="newClientPhone"
                    type="tel"
                    inputMode="tel"
                    autoComplete="tel"
                    value={newClientForm.phone}
                    onChange={(e) =>
                      setNewClientForm({
                        ...newClientForm,
                        phone: e.target.value,
                      })
                    }
                    placeholder="11 1234 5678"
                    className="h-10 text-sm"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="newClientEmail" className="text-sm font-medium">
                    Email
                  </Label>
                  <Input
                    id="newClientEmail"
                    type="email"
                    autoComplete="email"
                    value={newClientForm.email}
                    onChange={(e) =>
                      setNewClientForm({
                        ...newClientForm,
                        email: e.target.value,
                      })
                    }
                    placeholder="email@ejemplo.com"
                    className="h-10 text-sm"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="newClientAddress" className="text-sm font-medium">
                  Dirección
                </Label>
                <Textarea
                  id="newClientAddress"
                  value={newClientForm.address}
                  onChange={(e) =>
                    setNewClientForm({
                      ...newClientForm,
                      address: e.target.value,
                    })
                  }
                  placeholder="Calle, número, piso, depto..."
                  className="min-h-[60px] text-sm resize-none"
                />
              </div>
            </div>

            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-foreground border-b pb-2">
                Límite de Crédito
              </h3>

              <div className="space-y-2">
                <Label htmlFor="newClientLimit" className="text-sm font-medium">
                  Límite ($)
                </Label>
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
                      setNewClientForm({
                        ...newClientForm,
                        creditLimit: Number(e.target.value) || 0,
                      })
                    }
                    className="pl-8 h-10 text-sm"
                  />
                </div>
              </div>
            </div>

            <div className="flex flex-col-reverse sm:flex-row justify-end gap-2.5 pt-4 border-t border-border">
              <Button
                type="button"
                variant="outline"
                onClick={() => setNewClientModalOpen(false)}
                disabled={savingClient}
                className="h-10 text-sm"
              >
                Cancelar
              </Button>
              <Button
                onClick={handleCreateNewClient}
                disabled={
                  savingClient ||
                  !newClientForm.name.trim() ||
                  !newClientForm.cuit.trim()
                }
                className="h-10 text-sm shadow-md"
              >
                {savingClient && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                Crear Cliente
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </MainLayout>
  );
}