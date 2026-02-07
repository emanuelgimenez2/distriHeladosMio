"use client";

import { useEffect, useState, memo } from "react";
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
  invoiceApi,
  remitoApi,
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
} from "lucide-react";
import { toast } from "sonner";

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
  const [clientPhone, setClientPhone] = useState("");
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [saleComplete, setSaleComplete] = useState(false);
  const [invoiceNumber, setInvoiceNumber] = useState("");
  const [invoicePdfUrl, setInvoicePdfUrl] = useState("");
  const [remitoNumber, setRemitoNumber] = useState("");
  const [remitoPdfUrl, setRemitoPdfUrl] = useState("");
  const [docDialogOpen, setDocDialogOpen] = useState(false);
  const [docType, setDocType] = useState<"invoice" | "remito">("invoice");
  const [generatingDoc, setGeneratingDoc] = useState(false);
  const [lastSaleId, setLastSaleId] = useState<string>("");
  const [cartDialogOpen, setCartDialogOpen] = useState(false);

  const [newClientModalOpen, setNewClientModalOpen] = useState(false);
  const [savingClient, setSavingClient] = useState(false);
  const [newClientForm, setNewClientForm] = useState({
    name: "",
    cuit: "",
    phone: "",
    email: "",
    creditLimit: 50000,
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
      ? Math.max(0, cartTotal - cashAmount)
      : paymentType === "credit"
        ? cartTotal
        : 0;

  const filteredProducts = products.filter(
    (product) =>
      product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      product.category.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  const selectedClientData = clients.find((c) => c.id === selectedClient);
  const selectedSellerData = sellers.find((s) => s.id === selectedSeller);

  // SOLUCIÓN 1: Corregir problema del teléfono - usar onChange correctamente
  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setClientPhone(e.target.value);
  };

  // SOLUCIÓN 1: Eliminar este useEffect problemático
  // useEffect(() => {
  //   if (
  //     (paymentType === "credit" || paymentType === "mixed") &&
  //     selectedClientData?.phone
  //   ) {
  //     setClientPhone(selectedClientData.phone);
  //   }
  // }, [paymentType, selectedClientData]);

  useEffect(() => {
    if (paymentType === "cash") {
      setCashAmount(cartTotal);
    } else if (paymentType === "credit") {
      setCashAmount(0);
    } else if (paymentType === "mixed") {
      // Solo actualizar si el cashAmount actual es inválido
      if (cashAmount === 0 || cashAmount >= cartTotal) {
        setCashAmount(Math.floor(cartTotal / 2));
      }
    }
  }, [paymentType, cartTotal]);

  const canProcessSale = () => {
    if (cart.length === 0) return false;
    if (!selectedClient) return false;
    if (!selectedClientData) return false;

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

      const sale = await salesApi.processSale({
        clientId: selectedClient,
        clientName: resolvedClientName,
        clientPhone: resolvedClientPhone,
        sellerId: selectedSeller || undefined,
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
        createOrder: false,
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
    setClientPhone("");
    setSaleComplete(false);
    setInvoiceNumber("");
    setInvoicePdfUrl("");
    setRemitoNumber("");
    setRemitoPdfUrl("");
    setDocDialogOpen(false);
    setGeneratingDoc(false);
    setLastSaleId("");
    loadData();
  };

  const handleGenerateInvoice = async () => {
    if (!lastSaleId) return;
    setGeneratingDoc(true);
    try {
      const invoice = await invoiceApi.createInvoice(lastSaleId, {
        name: selectedClientData?.name,
        phone: clientPhone || selectedClientData?.phone,
        email: selectedClientData?.email,
      });
      setInvoiceNumber(invoice.invoiceNumber);
      setInvoicePdfUrl(invoice.pdfUrl);
      toast.success("Boleta generada correctamente");
    } catch (error) {
      console.error("Error generating invoice:", error);
      toast.error("Error al generar la boleta");
    } finally {
      setGeneratingDoc(false);
      setDocDialogOpen(false);
    }
  };

  const handleGenerateRemito = async () => {
    if (!lastSaleId) return;
    setGeneratingDoc(true);
    try {
      const remito = await remitoApi.createRemito(lastSaleId);
      setRemitoNumber(remito.remitoNumber);
      setRemitoPdfUrl(remito.pdfUrl);
      toast.success("Remito generado correctamente");
    } catch (error) {
      console.error("Error generating remito:", error);
      toast.error("Error al generar el remito");
    } finally {
      setGeneratingDoc(false);
      setDocDialogOpen(false);
    }
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
        phone: newClientForm.phone,
        email: newClientForm.email,
        creditLimit: newClientForm.creditLimit,
        dni: "",
        address: "",
        taxCategory: "consumidor_final",
        notes: "",
      });
      setClients([newClient, ...clients]);
      setSelectedClient(newClient.id);
      setNewClientModalOpen(false);
      setNewClientForm({
        name: "",
        cuit: "",
        phone: "",
        email: "",
        creditLimit: 50000,
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

  // VERSIÓN SUPER COMPACTA DEL CARRITO
  // VERSIÓN SUPER COMPACTA DEL CARRITO
  const CartContent = React.memo(() => (
    <div className="flex flex-col h-full">
      {cart.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center py-6 text-center">
          <div className="h-10 w-10 rounded-full bg-muted/50 flex items-center justify-center mb-2">
            <ShoppingCart className="h-4 w-4 text-muted-foreground/50" />
          </div>
          <p className="text-xs text-muted-foreground">Carrito vacío</p>
          <p className="text-[10px] text-muted-foreground/60 mt-0.5">
            Toca un producto para agregar
          </p>
        </div>
      ) : (
        <>
          {/* Items SUPER COMPACTOS */}
          <div className="flex-1 overflow-y-auto space-y-1 pr-0.5 pb-2 max-h-[160px]">
            {cart.map((item) => (
              <div
                key={item.product.id}
                className="flex items-center gap-1.5 p-1.5 rounded-md bg-muted/20 border border-border/30"
              >
                <img
                  src={item.product.imageUrl || "/placeholder.svg"}
                  alt={item.product.name}
                  className="w-8 h-8 rounded-sm object-cover shrink-0"
                />
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-[11px] text-foreground truncate leading-tight">
                    {item.product.name}
                  </p>
                  <p className="text-[9px] text-muted-foreground">
                    {formatCurrency(item.product.price)}
                  </p>
                </div>
                <div className="flex items-center gap-0.5 shrink-0">
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-5 w-5 rounded-full bg-transparent border-muted-foreground/30"
                    onClick={() => updateQuantity(item.product.id, -1)}
                  >
                    <Minus className="h-2 w-2" />
                  </Button>
                  <span className="w-5 text-center text-[10px] font-semibold text-foreground">
                    {item.quantity}
                  </span>
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-5 w-5 rounded-full bg-transparent border-muted-foreground/30"
                    onClick={() => updateQuantity(item.product.id, 1)}
                  >
                    <Plus className="h-2 w-2" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-5 w-5 ml-0.5 text-destructive hover:text-destructive hover:bg-destructive/5"
                    onClick={() => removeFromCart(item.product.id)}
                  >
                    <Trash2 className="h-2.5 w-2.5" />
                  </Button>
                </div>
              </div>
            ))}
          </div>

          {/* Sección inferior SUPER COMPACTA */}
          <div className="border-t border-border/50 pt-2 mt-auto space-y-1.5">
            {/* Total */}
            <div className="flex justify-between items-center px-1">
              <span className="text-[11px] text-muted-foreground">Total</span>
              <span className="text-lg font-bold text-foreground">
                {formatCurrency(cartTotal)}
              </span>
            </div>

            {/* Cliente - SUPER COMPACTO */}
            <div className="space-y-1">
              <div className="flex items-center justify-between px-1">
                <Label className="text-[9px] text-muted-foreground">
                  Cliente <span className="text-destructive">*</span>
                </Label>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-4 text-[8px] gap-0.5 text-primary px-1.5"
                  onClick={() => setNewClientModalOpen(true)}
                >
                  <UserPlus className="h-2 w-2" />
                  Nuevo
                </Button>
              </div>
              <Select value={selectedClient} onValueChange={setSelectedClient}>
                <SelectTrigger className="h-7 text-xs px-2 py-1">
                  <SelectValue placeholder="Seleccionar cliente" />
                </SelectTrigger>
                <SelectContent>
                  {clients.map((client) => (
                    <SelectItem
                      key={client.id}
                      value={client.id}
                      className="text-xs py-1.5"
                    >
                      {client.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {selectedClientData && (
                <div className="p-1.5 rounded bg-muted/30 text-[9px] space-y-0.5">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Saldo:</span>
                    <span className="text-foreground">
                      {formatCurrency(selectedClientData.currentBalance)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Límite:</span>
                    <span className="text-foreground">
                      {formatCurrency(selectedClientData.creditLimit)}
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* Vendedor - SUPER COMPACTO */}
            <div className="space-y-1">
              <Label className="text-[9px] text-muted-foreground px-1">
                Vendedor
              </Label>
              <Select value={selectedSeller} onValueChange={setSelectedSeller}>
                <SelectTrigger className="h-7 text-xs px-2 py-1">
                  <SelectValue placeholder="Opcional" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none" className="text-xs py-1.5">
                    Sin vendedor
                  </SelectItem>
                  {sellers.map((seller) => (
                    <SelectItem
                      key={seller.id}
                      value={seller.id}
                      className="text-xs py-1.5"
                    >
                      {seller.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Forma de Pago - SUPER COMPACTA */}
            <div className="space-y-1">
              <Label className="text-[9px] text-muted-foreground px-1">
                Forma de Pago
              </Label>
              <div className="grid grid-cols-3 gap-1">
                <Button
                  type="button"
                  variant={paymentType === "cash" ? "default" : "outline"}
                  className={`h-auto py-1 flex-col gap-0 text-[9px] ${paymentType === "cash" ? "bg-emerald-600 hover:bg-emerald-700" : ""}`}
                  onClick={() => setPaymentType("cash")}
                >
                  <Banknote className="h-3 w-3 mb-0.5" />
                  Contado
                </Button>
                <Button
                  type="button"
                  variant={paymentType === "credit" ? "default" : "outline"}
                  className={`h-auto py-1 flex-col gap-0 text-[9px] ${paymentType === "credit" ? "bg-blue-600 hover:bg-blue-700" : ""}`}
                  onClick={() => setPaymentType("credit")}
                >
                  <CreditCard className="h-3 w-3 mb-0.5" />A Cuenta
                </Button>
                <Button
                  type="button"
                  variant={paymentType === "mixed" ? "default" : "outline"}
                  className={`h-auto py-1 flex-col gap-0 text-[9px] ${paymentType === "mixed" ? "bg-amber-600 hover:bg-amber-700" : ""}`}
                  onClick={() => setPaymentType("mixed")}
                >
                  <Sparkles className="h-3 w-3 mb-0.5" />
                  Mixto
                </Button>
              </div>
            </div>

            {/* Mixed Payment - COMPACTO */}
            {paymentType === "mixed" && (
              <div className="space-y-1 p-1.5 rounded bg-amber-500/5 border border-amber-500/10">
                <div className="space-y-0.5">
                  <Label className="text-[9px] text-amber-700">
                    Monto Efectivo
                  </Label>
                  <Input
                    type="number"
                    min="0"
                    max={cartTotal}
                    value={cashAmount}
                    onChange={(e) => setCashAmount(Number(e.target.value) || 0)}
                    className="h-6 text-xs px-2"
                  />
                </div>
                <div className="flex justify-between text-[9px] pt-0.5 border-t border-amber-500/10">
                  <span className="text-amber-700">A Cuenta:</span>
                  <span className="font-semibold text-amber-700">
                    {formatCurrency(creditAmount)}
                  </span>
                </div>
              </div>
            )}

            {/* Teléfono - COMPACTO */}
            {/* Teléfono - COMPACTO */}
            <div className="space-y-1">
              <Label
                htmlFor="phone-input"
                className="text-[9px] text-muted-foreground px-1"
              >
                Teléfono (opcional)
              </Label>
              <Input
                id="phone-input"
                type="text"
                inputMode="tel"
                autoComplete="off"
                placeholder="11 1234 5678"
                value={clientPhone}
                onChange={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setClientPhone(e.target.value);
                }}
                onFocus={(e) => e.stopPropagation()}
                onBlur={(e) => e.stopPropagation()}
                className="h-7 text-xs px-2"
              />
            </div>

            {/* Botón Procesar - COMPACTO */}
            <Button
              className="w-full h-8 text-xs font-semibold mt-1"
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

  // Sale Complete Screen - Versión compacta
  if (saleComplete) {
    return (
      <MainLayout>
        <div className="flex flex-col min-h-[80vh]">
          <div className="mb-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => router.push("/ventas")}
              className="gap-2 text-sm h-8"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              Volver
            </Button>
          </div>

          <div className="flex-1 flex items-center justify-center px-3">
            <Card className="w-full max-w-sm border shadow-sm">
              <CardContent className="pt-6 pb-5 px-4">
                <div className="flex justify-center mb-5">
                  <div className="relative">
                    <div className="absolute inset-0 bg-emerald-500/20 rounded-full animate-ping" />
                    <div className="relative h-16 w-16 rounded-full bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center shadow">
                      <CheckCircle className="h-8 w-8 text-white" />
                    </div>
                  </div>
                </div>

                <h2 className="text-xl font-bold text-center mb-1.5">
                  Venta Exitosa
                </h2>
                <p className="text-sm text-muted-foreground text-center mb-5">
                  Venta procesada correctamente
                </p>

                <div className="rounded-lg bg-muted/30 p-3 mb-4 space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Total</span>
                    <span className="text-lg font-bold">
                      {formatCurrency(cartTotal)}
                    </span>
                  </div>
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-muted-foreground">Forma de pago</span>
                    <Badge
                      variant={
                        paymentType === "cash"
                          ? "default"
                          : paymentType === "credit"
                            ? "secondary"
                            : "outline"
                      }
                      className="text-xs"
                    >
                      {paymentType === "cash"
                        ? "Contado"
                        : paymentType === "credit"
                          ? "A Cuenta"
                          : "Mixto"}
                    </Badge>
                  </div>
                </div>

                <div className="space-y-2.5">
                  {!invoiceNumber && !remitoNumber && (
                    <div className="grid grid-cols-2 gap-2">
                      <Button
                        variant="outline"
                        className="h-9 text-xs gap-1.5"
                        onClick={() => {
                          setDocType("invoice");
                          setDocDialogOpen(true);
                        }}
                      >
                        <FileText className="h-3.5 w-3.5" />
                        Boleta
                      </Button>
                      <Button
                        variant="outline"
                        className="h-9 text-xs gap-1.5"
                        onClick={() => {
                          setDocType("remito");
                          setDocDialogOpen(true);
                        }}
                      >
                        <Receipt className="h-3.5 w-3.5" />
                        Remito
                      </Button>
                    </div>
                  )}

                  <Button
                    variant="outline"
                    className="w-full h-9 text-sm"
                    onClick={() => router.push("/ventas")}
                  >
                    Ver Ventas
                  </Button>

                  <Button
                    className="w-full h-9 text-sm gap-1.5"
                    onClick={handleNewSale}
                  >
                    <Plus className="h-3.5 w-3.5" />
                    Nueva Venta
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>

          <ConfirmDialog
            open={docDialogOpen}
            onOpenChange={setDocDialogOpen}
            title={docType === "invoice" ? "Generar Boleta" : "Generar Remito"}
            description={
              docType === "invoice"
                ? "Se generará la boleta fiscal para esta venta."
                : "Se generará un remito de entrega para esta venta."
            }
            confirmText={generatingDoc ? "Generando..." : "Generar"}
            confirmDisabled={generatingDoc}
            onConfirm={
              docType === "invoice"
                ? handleGenerateInvoice
                : handleGenerateRemito
            }
          />
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout title="Nueva Venta" description="Registra una nueva venta">
      <div className="lg:hidden mb-3">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => router.push("/ventas")}
          className="gap-1.5 -ml-2 h-8"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          <span className="text-sm">Volver</span>
        </Button>
      </div>

      {/* SOLUCIÓN 2: QUITAR EL CARRITO DE PC Y USAR SOLO EL MODAL EN TODOS LOS DISPOSITIVOS */}
      <div className="space-y-4">
        {/* Header con búsqueda y botón de carrito para todas las pantallas */}
        <div className="flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
          {/* Título para desktop */}
          <div className="hidden lg:block">
            <h1 className="text-2xl font-bold text-foreground">Nueva Venta</h1>
            <p className="text-sm text-muted-foreground">
              Registra una nueva venta
            </p>
          </div>

          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              placeholder="Buscar productos..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 h-10 text-sm rounded-lg"
            />
          </div>

          {/* Botón para abrir el modal del carrito - Visible en todos los dispositivos */}
          <Button
            className="gap-2"
            onClick={() => setCartDialogOpen(true)}
            disabled={cart.length === 0}
          >
            <ShoppingCart className="h-4 w-4" />
            <span>Carrito</span>
            {cart.length > 0 && (
              <Badge
                variant="secondary"
                className="ml-1 h-5 w-5 min-w-5 p-0 flex items-center justify-center text-xs"
              >
                {cartItemsCount}
              </Badge>
            )}
          </Button>
        </div>

        {/* Products Grid - MÁS COMPACTO */}
        {loading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2">
            {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((i) => (
              <Skeleton key={i} className="h-36 rounded-lg" />
            ))}
          </div>
        ) : filteredProducts.length === 0 ? (
          <div className="text-center py-12">
            <Package className="h-16 w-16 text-muted-foreground/30 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-foreground mb-2">
              No se encontraron productos
            </h3>
            <p className="text-sm text-muted-foreground">
              {searchQuery
                ? `No hay productos que coincidan con "${searchQuery}"`
                : "No hay productos disponibles"}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2">
            {filteredProducts.map((product) => {
              const inCart = cart.find(
                (item) => item.product.id === product.id,
              );
              return (
                <Card
                  key={product.id}
                  className={`cursor-pointer transition-all duration-150 hover:shadow-md border overflow-hidden ${
                    product.stock === 0 ? "opacity-50 cursor-not-allowed" : ""
                  } ${inCart ? "border-primary shadow-sm" : "border-transparent"}`}
                  onClick={() => product.stock > 0 && addToCart(product)}
                >
                  <CardContent className="p-0">
                    <div className="relative">
                      <img
                        src={product.imageUrl || "/placeholder.svg"}
                        alt={product.name}
                        className="w-full h-24 object-cover"
                      />
                      {inCart && (
                        <div className="absolute top-1.5 right-1.5 h-6 w-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-[10px] font-bold shadow">
                          {inCart.quantity}
                        </div>
                      )}
                      {product.stock <= 5 && product.stock > 0 && (
                        <Badge
                          variant="destructive"
                          className="absolute bottom-1.5 left-1.5 text-[9px] py-0 px-1.5"
                        >
                          Stock bajo
                        </Badge>
                      )}
                      {product.stock === 0 && (
                        <div className="absolute inset-0 bg-background/80 flex items-center justify-center">
                          <Badge variant="secondary" className="text-[10px]">
                            Sin stock
                          </Badge>
                        </div>
                      )}
                    </div>
                    <div className="p-2">
                      <h3 className="font-medium text-xs text-foreground line-clamp-1 mb-1">
                        {product.name}
                      </h3>
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-sm text-foreground">
                          {formatCurrency(product.price)}
                        </span>
                        <span className="text-[9px] text-muted-foreground">
                          {product.stock} uds
                        </span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* Cart Dialog - SOLUCIÓN 2: Modal para todos los dispositivos */}
      <Dialog open={cartDialogOpen} onOpenChange={setCartDialogOpen}>
        <DialogContent className="max-w-md max-h-[85vh] overflow-y-auto p-0 gap-0 sm:max-w-lg">
          <DialogHeader className="px-4 py-3 border-b border-border">
            <DialogDescription className="sr-only">
              Revisa y gestiona los productos en tu carrito de compras
            </DialogDescription>
            <DialogTitle className="flex items-center gap-2 text-base">
              <ShoppingCart className="h-5 w-5 text-primary" />
              Carrito
              {cart.length > 0 && (
                <Badge variant="secondary" className="text-xs">
                  {cartItemsCount} items
                </Badge>
              )}
            </DialogTitle>
          </DialogHeader>

          <div className="px-4 py-3">
            <CartContent />
          </div>
        </DialogContent>
      </Dialog>

      {/* Confirmation Dialog */}
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
        }${selectedSellerData ? ` - Vendedor: ${selectedSellerData.name}` : ""}?`}
        confirmText={processing ? "Procesando..." : "Confirmar"}
        confirmDisabled={processing}
        onConfirm={handleProcessSale}
      />

      {/* New Client Modal */}
      <Dialog open={newClientModalOpen} onOpenChange={setNewClientModalOpen}>
        <DialogContent className="sm:max-w-md max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base">
              <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                <User className="h-4 w-4 text-primary" />
              </div>
              Nuevo Cliente
            </DialogTitle>
            <DialogDescription className="text-sm">
              Crea un cliente con los datos mínimos para continuar
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 pt-1">
            <div className="space-y-1.5">
              <Label htmlFor="newClientName" className="text-sm">
                Nombre <span className="text-destructive">*</span>
              </Label>
              <Input
                id="newClientName"
                value={newClientForm.name}
                onChange={(e) =>
                  setNewClientForm({ ...newClientForm, name: e.target.value })
                }
                placeholder="Nombre del cliente"
                className="h-9 text-sm"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="newClientCuit" className="text-sm">
                CUIT <span className="text-destructive">*</span>
              </Label>
              <Input
                id="newClientCuit"
                value={newClientForm.cuit}
                onChange={(e) =>
                  setNewClientForm({ ...newClientForm, cuit: e.target.value })
                }
                placeholder="20-12345678-9"
                className="h-9 text-sm"
              />
            </div>

            <div className="grid grid-cols-2 gap-2.5">
              <div className="space-y-1.5">
                <Label htmlFor="newClientPhone" className="text-sm">
                  Teléfono
                </Label>
                <Input
                  id="newClientPhone"
                  type="tel"
                  inputMode="tel"
                  value={newClientForm.phone}
                  onChange={(e) =>
                    setNewClientForm({
                      ...newClientForm,
                      phone: e.target.value,
                    })
                  }
                  placeholder="11 1234 5678"
                  className="h-9 text-sm"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="newClientEmail" className="text-sm">
                  Email
                </Label>
                <Input
                  id="newClientEmail"
                  type="email"
                  value={newClientForm.email}
                  onChange={(e) =>
                    setNewClientForm({
                      ...newClientForm,
                      email: e.target.value,
                    })
                  }
                  placeholder="email@ejemplo.com"
                  className="h-9 text-sm"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="newClientLimit" className="text-sm">
                Límite de Crédito
              </Label>
              <div className="relative">
                <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">
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
                  className="pl-7 h-9 text-sm"
                />
              </div>
            </div>

            <div className="flex flex-col-reverse sm:flex-row justify-end gap-2 pt-3 border-t border-border">
              <Button
                type="button"
                variant="outline"
                onClick={() => setNewClientModalOpen(false)}
                disabled={savingClient}
                className="h-9 text-sm"
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
                className="h-9 text-sm"
              >
                {savingClient && (
                  <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
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
