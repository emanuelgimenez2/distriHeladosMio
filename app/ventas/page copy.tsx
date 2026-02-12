"use client";

import { useEffect, useState, useMemo } from "react";
import { MainLayout } from "@/components/layout/main-layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DataTableSkeleton } from "@/components/ui/data-table-skeleton";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { RemitoDocument } from "@/components/documentos/remito-document";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { salesApi, remitoApi, clientsApi } from "@/lib/api";
import type { Sale, Client } from "@/lib/types";
import {
  Plus,
  Search,
  ShoppingBag,
  Package,
  User,
  Loader2,
  Send,
  Download,
  FileText,
  Truck,
  X,
  Calendar,
  Filter,
  CreditCard,
  Banknote,
  Sparkles,
  Receipt,
  ArrowUpRight,
  Clock,
  Printer,
} from "lucide-react";
import { toast } from "sonner";
import Link from "next/link";
import { BoletaDocument } from "@/components/documentos/boleta-document";
import { useRef } from "react";

// Types for mixed payment
interface SaleWithMixedDetails extends Sale {
  saleNumber?: number;
  cashAmount?: number;
  creditAmount?: number;
}

export default function VentasPage() {
  const [sales, setSales] = useState<SaleWithMixedDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [invoiceFilter, setInvoiceFilter] = useState<string>("all");
  const [paymentFilter, setPaymentFilter] = useState<string>("all");
  const [periodFilter, setPeriodFilter] = useState<string>("today");

  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [selectedSale, setSelectedSale] = useState<SaleWithMixedDetails | null>(
    null,
  );

  const [emitModalOpen, setEmitModalOpen] = useState(false);
  const [saleToEmit, setSaleToEmit] = useState<SaleWithMixedDetails | null>(
    null,
  );
  const [documentType, setDocumentType] = useState<"invoice" | "remito">(
    "invoice",
  );
  const [emitting, setEmitting] = useState(false);

  // Estado para el modal de boleta
  const [showBoletaModal, setShowBoletaModal] = useState(false);
  const [lastInvoice, setLastInvoice] = useState<any>(null);
  const [selectedClientData, setSelectedClientData] = useState<Client | null>(
    null,
  );
  const boletaRef = useRef<HTMLDivElement>(null);

  // Estado para el modal de remito
  const [showRemitoModal, setShowRemitoModal] = useState(false);
  const [lastRemito, setLastRemito] = useState<any>(null);
  const remitoRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (!selectedSale) return;
    const latest = sales.find((s) => s.id === selectedSale.id);
    if (!latest) return;
    if (
      latest.invoicePdfUrl !== selectedSale.invoicePdfUrl ||
      latest.invoiceWhatsappUrl !== selectedSale.invoiceWhatsappUrl ||
      latest.remitoPdfUrl !== selectedSale.remitoPdfUrl ||
      latest.remitoNumber !== selectedSale.remitoNumber ||
      latest.invoiceEmitted !== selectedSale.invoiceEmitted
    ) {
      setSelectedSale(latest);
    }
  }, [sales, selectedSale]);

  const loadData = async () => {
    try {
      const salesData = await salesApi.getAll();
      // Mock data for mixed payments - in real app, this comes from API
      const enhancedSales = salesData.map((sale: Sale, index: number) => ({
        ...sale,
        // Simulating sale number (N° 1, N° 2, etc.)
        saleNumber: salesData.length - index,
        // Mock mixed payment data for demonstration
        cashAmount:
          sale.paymentType === "mixed"
            ? Math.floor(sale.total * 0.6)
            : undefined,
        creditAmount:
          sale.paymentType === "mixed"
            ? Math.floor(sale.total * 0.4)
            : undefined,
      }));
      setSales(enhancedSales);
    } catch (error) {
      console.error("Error loading data:", error);
      toast.error("Error al cargar los datos");
    } finally {
      setLoading(false);
    }
  };

  const formatDateInput = (date: Date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  };

  const fmt = (amount: number) =>
    new Intl.NumberFormat("es-AR", {
      style: "currency",
      currency: "ARS",
      minimumFractionDigits: 0,
    }).format(amount);

  const fmtDate = (date: Date) =>
    new Intl.DateTimeFormat("es-AR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    }).format(new Date(date));

  const fmtDateTime = (date: Date) =>
    new Intl.DateTimeFormat("es-AR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(date));

  const fmtTime = (date: Date) =>
    new Intl.DateTimeFormat("es-AR", {
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(date));

  /* ── Handlers ── */

  const handleViewDetail = (sale: SaleWithMixedDetails) => {
    setSelectedSale(sale);
    setDetailModalOpen(true);
  };

  const handleOpenEmitModal = (sale: SaleWithMixedDetails) => {
    setSaleToEmit(sale);
    setDocumentType(sale.invoiceEmitted ? "remito" : "invoice");
    setEmitModalOpen(true);
  };

  // FUNCIÓN CORREGIDA: Para emitir documento con datos completos del cliente
  const handleEmitDocument = async () => {
    if (!saleToEmit) return;
    setEmitting(true);
    try {
      if (documentType === "invoice") {
        // OBTENER DATOS COMPLETOS DEL CLIENTE
        let clientData: Client | null = null;
        try {
          const clients = await clientsApi.getAll();
          clientData =
            clients.find((c: Client) => c.name === saleToEmit.clientName) ||
            null;
        } catch (e) {
          console.warn("No se pudo obtener datos del cliente:", e);
        }

        const invoicePayload = {
          name: saleToEmit.clientName || "Consumidor Final",
          phone: saleToEmit.clientPhone || "",
          email: clientData?.email || "",
          taxCategory: clientData?.taxCategory || "consumidor_final",
          cuit: clientData?.cuit || "",
          dni: clientData?.dni || "",
        };

        console.log("📤 Enviando datos de facturación:", invoicePayload);

        const result = await salesApi.emitInvoice(
          saleToEmit.id,
          invoicePayload,
        );

        setSales((prev) =>
          prev.map((s) =>
            s.id === saleToEmit.id
              ? {
                  ...s,
                  invoiceEmitted: true,
                  invoiceNumber: result.invoiceNumber,
                  invoicePdfUrl: result.pdfUrl,
                  invoiceWhatsappUrl: result.whatsappUrl,
                }
              : s,
          ),
        );

        setLastInvoice(result);
        setSelectedClientData(clientData);

        toast.success("Boleta emitida correctamente");
        setEmitModalOpen(false);
        setSaleToEmit(null);
      } else {
        // LÓGICA MEJORADA PARA REMITO
        const result = await remitoApi.createRemito(saleToEmit.id);

        setSales((prev) =>
          prev.map((s) =>
            s.id === saleToEmit.id
              ? {
                  ...s,
                  remitoNumber: result.remitoNumber,
                  remitoPdfUrl: result.pdfUrl,
                }
              : s,
          ),
        );

        // Guardar datos del remito para mostrar en modal
        setLastRemito({
          remitoNumber: result.remitoNumber,
          pdfUrl: result.pdfUrl,
          sale: saleToEmit,
        });

        toast.success("Remito generado correctamente");
        setEmitModalOpen(false);
        setSaleToEmit(null);

        // Mostrar modal de remito
        setShowRemitoModal(true);
      }
    } catch (error) {
      console.error("Error emitting document:", error);
      toast.error(
        documentType === "invoice"
          ? "Error al emitir boleta"
          : "Error al generar remito",
      );
    } finally {
      setEmitting(false);
    }
  };
  const downloadPdf = (url: string, filename: string) => {
    if (url.startsWith("data:application/pdf;base64,")) {
      const base64 = url.split(",")[1];
      const byteCharacters = atob(base64);
      const byteNumbers = new Array(byteCharacters.length);
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
      }
      const byteArray = new Uint8Array(byteNumbers);
      const blob = new Blob([byteArray], { type: "application/pdf" });
      const blobUrl = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = blobUrl;
      link.download = filename;
      link.click();
      window.URL.revokeObjectURL(blobUrl);
    } else {
      // Si es una URL normal, forzar descarga
      const link = document.createElement("a");
      link.href = url;
      link.download = filename;
      link.click();
    }
  };
  // Función para imprimir boleta
  const handlePrintBoleta = () => {
    const printWindow = window.open("", "_blank");
    if (!printWindow) return;

    const boletaHTML = boletaRef.current?.outerHTML;
    printWindow.document.write(`
    <html>
      <head>
        <title>Boleta ${lastInvoice?.invoiceNumber || ""}</title>
        <style>
          @media print {
            body { margin: 0; }
            .no-print { display: none; }
          }
        </style>
      </head>
      <body>
        ${boletaHTML}
        <script>
          window.onload = () => {
            setTimeout(() => {
              window.print()
              window.close()
            }, 100)
          }
        </script>
      </body>
    </html>
  `);
    printWindow.document.close();
  };

  // Función para imprimir remito
  const handlePrintRemito = () => {
    const printWindow = window.open("", "_blank");
    if (!printWindow) return;

    const remitoHTML = remitoRef.current?.outerHTML;
    printWindow.document.write(`
    <html>
      <head>
        <title>Remito ${lastRemito?.remitoNumber || ""}</title>
        <style>
          @media print {
            body { margin: 0; }
            .no-print { display: none; }
          }
        </style>
      </head>
      <body>
        ${remitoHTML}
        <script>
          window.onload = () => {
            setTimeout(() => {
              window.print()
              window.close()
            }, 100)
          }
        </script>
      </body>
    </html>
  `);
    printWindow.document.close();
  };

  // Función para descargar PDF del remito
  const handleDownloadRemitoPdf = () => {
    if (!lastRemito?.pdfUrl) return;
    downloadPdf(lastRemito.pdfUrl, `Remito-${lastRemito.remitoNumber}.pdf`);
  };

  const buildWhatsappUrl = (
    phone?: string,
    pdfUrl?: string,
    clientName?: string,
  ) => {
    if (!phone || !pdfUrl) return null;
    const clean = phone.replace(/[^\d]/g, "");
    if (!clean) return null;
    const msg = `Hola${clientName ? ` ${clientName}` : ""}, tu comprobante esta listo: ${pdfUrl}`;
    return `https://wa.me/${clean}?text=${encodeURIComponent(msg)}`;
  };

  /* ── Filtering ── */

  const getDateRangeFromPeriod = (period: string) => {
    const today = new Date();
    const todayStr = formatDateInput(today);
    switch (period) {
      case "today":
        return { from: todayStr, to: todayStr };
      case "week": {
        const d = new Date(today);
        d.setDate(d.getDate() - 7);
        return { from: formatDateInput(d), to: todayStr };
      }
      case "month": {
        const d = new Date(today);
        d.setMonth(d.getMonth() - 1);
        return { from: formatDateInput(d), to: todayStr };
      }
      default:
        return { from: todayStr, to: todayStr };
    }
  };

  const filteredSales = useMemo(() => {
    const { from, to } = getDateRangeFromPeriod(periodFilter);
    return sales
      .filter((sale) => {
        const q = searchQuery.toLowerCase();
        const matchSearch =
          sale.id.toLowerCase().includes(q) ||
          (sale.clientName?.toLowerCase().includes(q) ?? false) ||
          (sale.sellerName?.toLowerCase().includes(q) ?? false);
        const matchInvoice =
          invoiceFilter === "all" ||
          (invoiceFilter === "emitted" && sale.invoiceEmitted) ||
          (invoiceFilter === "pending" && !sale.invoiceEmitted);
        const matchPayment =
          paymentFilter === "all" || sale.paymentType === paymentFilter;
        const value = new Date(sale.createdAt);
        const start = from ? new Date(`${from}T00:00:00`) : null;
        const end = to ? new Date(`${to}T23:59:59`) : null;
        const matchDate = (!start || value >= start) && (!end || value <= end);
        return matchSearch && matchInvoice && matchPayment && matchDate;
      })
      .sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      );
  }, [sales, searchQuery, invoiceFilter, paymentFilter, periodFilter]);

  /* ── Payment helpers ── */

  const payLabel = (pt: string) => {
    if (pt === "cash") return "Contado";
    if (pt === "credit") return "Cta. Corriente";
    if (pt === "mixed") return "Mixto";
    return pt;
  };

  const payIcon = (pt: string) => {
    if (pt === "cash") return <Banknote className="h-3.5 w-3.5" />;
    if (pt === "credit") return <CreditCard className="h-3.5 w-3.5" />;
    if (pt === "mixed") return <Sparkles className="h-3.5 w-3.5" />;
    return null;
  };

  const payBadgeCls = (pt: string) => {
    if (pt === "cash")
      return "bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-400 dark:border-emerald-800";
    if (pt === "credit")
      return "bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-800";
    if (pt === "mixed")
      return "bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-900/30 dark:text-amber-400 dark:border-amber-800";
    return "";
  };

  /* ── RENDER ── */

  return (
    <MainLayout title="Ventas" description="Historial y gestión de ventas">
      {loading ? (
        <DataTableSkeleton columns={5} rows={8} />
      ) : (
        <div className="space-y-4 md:space-y-6 max-w-7xl mx-auto">
          {/* Header Section */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-foreground tracking-tight">
                Historial de Ventas
              </h1>
              <p className="text-muted-foreground text-sm mt-1">
                {filteredSales.length}{" "}
                {filteredSales.length === 1
                  ? "venta registrada"
                  : "ventas registradas"}
                {periodFilter === "today" && " hoy"}
              </p>
            </div>
            <Button
              asChild
              className="w-full sm:w-auto gap-2 shadow-lg shadow-primary/20"
            >
              <Link href="/ventas/nueva">
                <Plus className="h-4 w-4" />
                Nueva Venta
              </Link>
            </Button>
          </div>

          {/* Filters Bar */}
          <Card className="border-border/60 shadow-sm">
            <CardContent className="p-3 md:p-4">
              <div className="flex flex-col lg:flex-row gap-3">
                {/* Search */}
                <div className="relative flex-1 min-w-[200px]">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Buscar por cliente, vendedor o ID..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10 h-10 bg-background"
                  />
                  {searchQuery && (
                    <button
                      onClick={() => setSearchQuery("")}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  )}
                </div>

                {/* Filter Group */}
                <div className="flex flex-wrap gap-2">
                  <div className="flex items-center gap-2 bg-muted/50 rounded-lg p-1">
                    <Filter className="h-4 w-4 text-muted-foreground ml-2" />
                    <Select
                      value={periodFilter}
                      onValueChange={setPeriodFilter}
                    >
                      <SelectTrigger className="h-8 w-[120px] border-0 bg-transparent focus:ring-0 focus:ring-offset-0">
                        <Calendar className="h-3.5 w-3.5 mr-2 text-muted-foreground" />
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="today">Hoy</SelectItem>
                        <SelectItem value="week">Esta semana</SelectItem>
                        <SelectItem value="month">Este mes</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <Select
                    value={paymentFilter}
                    onValueChange={setPaymentFilter}
                  >
                    <SelectTrigger className="h-10 w-[130px]">
                      <SelectValue placeholder="Pago" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos los pagos</SelectItem>
                      <SelectItem value="cash">Contado</SelectItem>
                      <SelectItem value="credit">Cta. Corriente</SelectItem>
                      <SelectItem value="mixed">Mixto</SelectItem>
                    </SelectContent>
                  </Select>

                  <Select
                    value={invoiceFilter}
                    onValueChange={setInvoiceFilter}
                  >
                    <SelectTrigger className="h-10 w-[130px]">
                      <SelectValue placeholder="Estado" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos los estados</SelectItem>
                      <SelectItem value="emitted">Emitidas</SelectItem>
                      <SelectItem value="pending">Pendientes</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Active Filters */}
              {(searchQuery ||
                paymentFilter !== "all" ||
                invoiceFilter !== "all" ||
                periodFilter !== "today") && (
                <div className="flex flex-wrap gap-2 mt-3 pt-3 border-t border-border/50">
                  <span className="text-xs text-muted-foreground">
                    Filtros activos:
                  </span>
                  {searchQuery && (
                    <Badge variant="secondary" className="text-xs gap-1">
                      Búsqueda: {searchQuery}
                      <button onClick={() => setSearchQuery("")}>
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  )}
                  {periodFilter !== "today" && (
                    <Badge variant="secondary" className="text-xs gap-1">
                      {periodFilter === "week" ? "Esta semana" : "Este mes"}
                      <button onClick={() => setPeriodFilter("today")}>
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  )}
                  {paymentFilter !== "all" && (
                    <Badge variant="secondary" className="text-xs gap-1">
                      {payLabel(paymentFilter)}
                      <button onClick={() => setPaymentFilter("all")}>
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  )}
                  {invoiceFilter !== "all" && (
                    <Badge variant="secondary" className="text-xs gap-1">
                      {invoiceFilter === "emitted" ? "Emitidas" : "Pendientes"}
                      <button onClick={() => setInvoiceFilter("all")}>
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  )}
                  <button
                    onClick={() => {
                      setSearchQuery("");
                      setPaymentFilter("all");
                      setInvoiceFilter("all");
                      setPeriodFilter("today");
                    }}
                    className="text-xs text-primary hover:underline"
                  >
                    Limpiar todos
                  </button>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Sales List */}
          <Card className="border-border/60 shadow-sm overflow-hidden">
            {filteredSales.length === 0 ? (
              <div className="p-12 text-center">
                <div className="h-16 w-16 rounded-full bg-muted/50 flex items-center justify-center mx-auto mb-4">
                  <ShoppingBag className="h-8 w-8 text-muted-foreground/50" />
                </div>
                <h3 className="text-lg font-medium text-foreground mb-1">
                  No se encontraron ventas
                </h3>
                <p className="text-muted-foreground text-sm">
                  Intenta ajustar los filtros o busca con otros términos
                </p>
              </div>
            ) : (
              <div className="divide-y divide-border/50">
                {/* Desktop Header */}
                <div className="hidden md:grid grid-cols-12 gap-4 p-4 bg-muted/30 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  <div className="col-span-2">Venta</div>
                  <div className="col-span-3">Cliente</div>
                  <div className="col-span-2">Fecha</div>
                  <div className="col-span-2 text-right">Total</div>
                  <div className="col-span-2 text-center">Pago</div>
                  <div className="col-span-1 text-center">Doc</div>
                </div>

                {/* Sales Items */}
                {filteredSales.map((sale, index) => (
                  <div
                    key={sale.id}
                    onClick={() => handleViewDetail(sale)}
                    className="group flex flex-col md:grid md:grid-cols-12 gap-2 md:gap-4 p-4 hover:bg-muted/30 transition-colors cursor-pointer"
                  >
                    {/* Mobile Layout */}
                    <div className="flex md:hidden items-start justify-between w-full">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                          <Receipt className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                          <p className="font-semibold text-foreground">
                            Venta N°{" "}
                            {sale.saleNumber || filteredSales.length - index}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {sale.clientName || "Venta directa"}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-foreground">
                          {fmt(sale.total)}
                        </p>
                        <Badge
                          variant="outline"
                          className={`text-[10px] mt-1 ${payBadgeCls(sale.paymentType)}`}
                        >
                          {payLabel(sale.paymentType)}
                        </Badge>
                      </div>
                    </div>

                    <div className="flex md:hidden items-center justify-between w-full mt-2 pt-2 border-t border-border/50">
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Clock className="h-3 w-3" />
                        {fmtDate(sale.createdAt)}
                      </div>
                      {sale.invoiceEmitted ? (
                        <Badge
                          variant="outline"
                          className="bg-emerald-100 text-emerald-700 border-emerald-200 text-[10px]"
                        >
                          Emitida
                        </Badge>
                      ) : (
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-7 text-xs bg-sky-50 text-sky-600 border-sky-200 hover:bg-sky-100"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleOpenEmitModal(sale);
                          }}
                        >
                          Emitir
                        </Button>
                      )}
                    </div>

                    {/* Desktop Layout */}
                    <div className="hidden md:flex md:col-span-2 items-center gap-3">
                      <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                        <Receipt className="h-4 w-4 text-primary" />
                      </div>
                      <div>
                        <p className="font-semibold text-foreground text-sm">
                          N° {sale.saleNumber || filteredSales.length - index}
                        </p>
                        <p className="text-[10px] text-muted-foreground font-mono">
                          {sale.id.slice(-6)}
                        </p>
                      </div>
                    </div>

                    <div className="hidden md:flex md:col-span-3 items-center gap-2">
                      <Avatar className="h-8 w-8">
                        <AvatarFallback className="bg-muted text-muted-foreground text-xs">
                          <User className="h-3.5 w-3.5" />
                        </AvatarFallback>
                      </Avatar>
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">
                          {sale.clientName || "Venta directa"}
                        </p>
                        {sale.sellerName && (
                          <p className="text-[10px] text-muted-foreground truncate">
                            Vendedor: {sale.sellerName}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="hidden md:flex md:col-span-2 items-center text-sm text-muted-foreground">
                      <div>
                        <p>{fmtDate(sale.createdAt)}</p>
                        <p className="text-xs">{fmtTime(sale.createdAt)}</p>
                      </div>
                    </div>

                    <div className="hidden md:flex md:col-span-2 items-center justify-end">
                      <p className="font-bold text-foreground text-base">
                        {fmt(sale.total)}
                      </p>
                    </div>

                    <div className="hidden md:flex md:col-span-2 items-center justify-center">
                      <Badge
                        variant="outline"
                        className={`gap-1.5 px-2.5 py-1 ${payBadgeCls(sale.paymentType)}`}
                      >
                        {payIcon(sale.paymentType)}
                        {payLabel(sale.paymentType)}
                      </Badge>
                    </div>

                    <div className="hidden md:flex md:col-span-1 items-center justify-center">
                      {sale.invoiceEmitted ? (
                        <div
                          className="h-8 w-8 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center"
                          title="Boleta emitida"
                        >
                          <FileText className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                        </div>
                      ) : (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 rounded-full hover:bg-sky-100 hover:text-sky-600"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleOpenEmitModal(sale);
                          }}
                          title="Emitir boleta"
                        >
                          <ArrowUpRight className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>
      )}

      {/* FAB Mobile */}
      <div className="md:hidden fixed bottom-6 right-6 z-50">
        <Button
          asChild
          className="h-14 w-14 rounded-full shadow-xl"
          size="icon"
        >
          <Link href="/ventas/nueva">
            <Plus className="h-6 w-6" />
          </Link>
        </Button>
      </div>

      {/* Detail Modal - Redesigned */}
      <Dialog open={detailModalOpen} onOpenChange={setDetailModalOpen}>
        <DialogContent className="max-w-lg p-0 gap-0 overflow-hidden">
          {selectedSale && (
            <>
              {/* Header */}
              <div className="bg-gradient-to-br from-primary/5 to-primary/10 p-6 border-b border-border/50">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="h-12 w-12 rounded-xl bg-white dark:bg-background shadow-sm flex items-center justify-center">
                      <Receipt className="h-6 w-6 text-primary" />
                    </div>
                    <div>
                      <DialogTitle className="text-xl font-bold text-foreground">
                        Venta N° {selectedSale.saleNumber || "?"}
                      </DialogTitle>
                      <DialogDescription className="text-sm text-muted-foreground flex items-center gap-1 mt-0.5">
                        <Clock className="h-3.5 w-3.5" />
                        {fmtDateTime(selectedSale.createdAt)}
                      </DialogDescription>
                    </div>
                  </div>
                  <Badge
                    variant="outline"
                    className={`${payBadgeCls(selectedSale.paymentType)} px-3 py-1`}
                  >
                    {payLabel(selectedSale.paymentType)}
                  </Badge>
                </div>
              </div>

              {/* Content */}
              <div className="p-6 space-y-6">
                {/* Client & Seller Info */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      Cliente
                    </p>
                    <div className="flex items-center gap-2">
                      <Avatar className="h-8 w-8">
                        <AvatarFallback className="bg-primary/10 text-primary text-xs">
                          {(selectedSale.clientName || "C")
                            .charAt(0)
                            .toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <p className="font-medium text-foreground">
                        {selectedSale.clientName || "Cliente final"}
                      </p>
                    </div>
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      Vendedor
                    </p>
                    <p
                      className={`font-medium ${selectedSale.sellerName ? "text-foreground" : "text-muted-foreground italic"}`}
                    >
                      {selectedSale.sellerName || "Sin vendedor"}
                    </p>
                  </div>
                </div>

                {/* Documents Status */}
                <div className="grid grid-cols-2 gap-3">
                  <div
                    className={`p-3 rounded-xl border ${selectedSale.invoiceEmitted ? "bg-emerald-50/50 border-emerald-200 dark:bg-emerald-900/20 dark:border-emerald-800" : "bg-amber-50/50 border-amber-200 dark:bg-amber-900/20 dark:border-amber-800"}`}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <FileText
                        className={`h-4 w-4 ${selectedSale.invoiceEmitted ? "text-emerald-600" : "text-amber-600"}`}
                      />
                      <span className="text-xs font-medium text-muted-foreground">
                        Boleta
                      </span>
                    </div>
                    <p
                      className={`font-semibold ${selectedSale.invoiceEmitted ? "text-emerald-700 dark:text-emerald-400" : "text-amber-700 dark:text-amber-400"}`}
                    >
                      {selectedSale.invoiceEmitted
                        ? selectedSale.invoiceNumber || "Emitida"
                        : "Pendiente"}
                    </p>
                  </div>
                  <div
                    className={`p-3 rounded-xl border ${selectedSale.remitoNumber ? "bg-blue-50/50 border-blue-200 dark:bg-blue-900/20 dark:border-blue-800" : "bg-muted/50 border-border"}`}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <Truck
                        className={`h-4 w-4 ${selectedSale.remitoNumber ? "text-blue-600" : "text-muted-foreground"}`}
                      />
                      <span className="text-xs font-medium text-muted-foreground">
                        Remito
                      </span>
                    </div>
                    <p
                      className={`font-semibold ${selectedSale.remitoNumber ? "text-blue-700 dark:text-blue-400" : "text-muted-foreground"}`}
                    >
                      {selectedSale.remitoNumber || "Sin remito"}
                    </p>
                  </div>
                </div>

                {/* Products */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                      <Package className="h-3.5 w-3.5" />
                      Productos ({selectedSale.items.length})
                    </p>
                  </div>
                  <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                    {selectedSale.items.map((item, i) => (
                      <div
                        key={i}
                        className="flex items-center justify-between p-3 rounded-lg bg-muted/40 hover:bg-muted/60 transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          <div className="h-10 w-10 rounded-lg bg-background border border-border/50 flex items-center justify-center text-xs font-medium text-muted-foreground">
                            x{item.quantity}
                          </div>
                          <div>
                            <p className="font-medium text-sm text-foreground">
                              {item.name}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {fmt(item.price)} c/u
                            </p>
                          </div>
                        </div>
                        <p className="font-semibold text-foreground">
                          {fmt(item.price * item.quantity)}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Payment Details - Show breakdown for mixed */}
                {selectedSale.paymentType === "mixed" && (
                  <div className="p-4 rounded-xl bg-amber-50/50 border border-amber-200 dark:bg-amber-900/20 dark:border-amber-800 space-y-2">
                    <p className="text-xs font-medium text-amber-800 dark:text-amber-400 uppercase tracking-wider">
                      Detalle de Pago Mixto
                    </p>
                    <div className="flex justify-between items-center">
                      <div className="flex items-center gap-2 text-sm text-amber-700 dark:text-amber-300">
                        <Banknote className="h-4 w-4" />
                        Efectivo
                      </div>
                      <span className="font-semibold text-amber-800 dark:text-amber-400">
                        {fmt(selectedSale.cashAmount || 0)}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <div className="flex items-center gap-2 text-sm text-amber-700 dark:text-amber-300">
                        <CreditCard className="h-4 w-4" />
                        Cuenta Corriente
                      </div>
                      <span className="font-semibold text-amber-800 dark:text-amber-400">
                        {fmt(selectedSale.creditAmount || 0)}
                      </span>
                    </div>
                  </div>
                )}

                {/* Total */}
                <div className="flex items-center justify-between p-4 rounded-xl bg-foreground text-background">
                  <span className="font-medium">Total</span>
                  <span className="text-2xl font-bold">
                    {fmt(selectedSale.total)}
                  </span>
                </div>

                {/* Document Actions */}
                {/* Document Actions */}
                {(selectedSale.invoicePdfUrl || selectedSale.remitoPdfUrl) && (
                  <div className="flex flex-wrap gap-2">
                    {selectedSale.invoicePdfUrl && (
                      <>
                        <Button
                          variant="outline"
                          size="sm"
                          asChild
                          className="flex-1 gap-1.5"
                        >
                          <a
                            href={selectedSale.invoicePdfUrl}
                            target="_blank"
                            rel="noreferrer"
                          >
                            <Download className="h-4 w-4" /> Descargar
                          </a>
                        </Button>
                        {buildWhatsappUrl(
                          selectedSale.clientPhone,
                          selectedSale.invoicePdfUrl,
                          selectedSale.clientName,
                        ) && (
                          <Button
                            variant="outline"
                            size="sm"
                            asChild
                            className="flex-1 gap-1.5 bg-green-50 text-green-700 border-green-200 hover:bg-green-100 hover:text-green-800"
                          >
                            <a
                              href={
                                selectedSale.invoiceWhatsappUrl ??
                                buildWhatsappUrl(
                                  selectedSale.clientPhone,
                                  selectedSale.invoicePdfUrl,
                                  selectedSale.clientName,
                                ) ??
                                "#"
                              }
                              target="_blank"
                              rel="noreferrer"
                            >
                              <Send className="h-4 w-4" /> WhatsApp
                            </a>
                          </Button>
                        )}
                      </>
                    )}
                    {/* MODIFICADO: Cambiado de "Ver Remito" a "Descargar Remito" */}
                    {selectedSale.remitoPdfUrl && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          if (selectedSale.remitoPdfUrl) {
                            // Si es base64, convertir a blob y descargar
                            if (
                              selectedSale.remitoPdfUrl.startsWith(
                                "data:application/pdf;base64,",
                              )
                            ) {
                              const base64 =
                                selectedSale.remitoPdfUrl.split(",")[1];
                              const byteCharacters = atob(base64);
                              const byteNumbers = new Array(
                                byteCharacters.length,
                              );
                              for (let i = 0; i < byteCharacters.length; i++) {
                                byteNumbers[i] = byteCharacters.charCodeAt(i);
                              }
                              const byteArray = new Uint8Array(byteNumbers);
                              const blob = new Blob([byteArray], {
                                type: "application/pdf",
                              });
                              const url = window.URL.createObjectURL(blob);
                              const link = document.createElement("a");
                              link.href = url;
                              link.download = `Remito-${selectedSale.remitoNumber || "sin-numero"}.pdf`;
                              link.click();
                              window.URL.revokeObjectURL(url);
                            } else {
                              // Si es URL normal, forzar la descarga
                              const link = document.createElement("a");
                              link.href = selectedSale.remitoPdfUrl;
                              link.download = `Remito-${selectedSale.remitoNumber || "sin-numero"}.pdf`;
                              link.click();
                            }
                          }
                        }}
                        className="flex-1 gap-1.5"
                      >
                        <Download className="h-4 w-4" /> Descargar Remito
                      </Button>
                    )}
                  </div>
                )}

                {/* Action Buttons */}
                <div className="flex gap-2 pt-2">
                  {!selectedSale.invoiceEmitted && (
                    <Button
                      className="flex-1 gap-1.5"
                      onClick={() => {
                        setDetailModalOpen(false);
                        handleOpenEmitModal(selectedSale);
                      }}
                    >
                      <FileText className="h-4 w-4" />
                      Emitir Boleta
                    </Button>
                  )}
                  {!selectedSale.remitoNumber && (
                    <Button
                      variant="outline"
                      className="flex-1 gap-1.5"
                      onClick={() => {
                        setDetailModalOpen(false);
                        setSaleToEmit(selectedSale);
                        setDocumentType("remito");
                        setEmitModalOpen(true);
                      }}
                    >
                      <Truck className="h-4 w-4" />
                      Generar Remito
                    </Button>
                  )}
                  {selectedSale.invoiceEmitted && selectedSale.remitoNumber && (
                    <Button
                      variant="outline"
                      className="w-full"
                      onClick={() => setDetailModalOpen(false)}
                    >
                      Cerrar
                    </Button>
                  )}
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Emit Document Modal */}
      <Dialog open={emitModalOpen} onOpenChange={setEmitModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-lg">
              <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                {documentType === "invoice" ? (
                  <FileText className="h-5 w-5 text-primary" />
                ) : (
                  <Truck className="h-5 w-5 text-primary" />
                )}
              </div>
              {documentType === "invoice" ? "Emitir Boleta" : "Generar Remito"}
            </DialogTitle>
            <DialogDescription>
              Selecciona el tipo de documento a generar para esta venta.
            </DialogDescription>
          </DialogHeader>
          {saleToEmit && (
            <div className="space-y-4 pt-2">
              <div className="p-4 rounded-xl bg-muted/50 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Venta</span>
                  <span className="font-medium">
                    N° {saleToEmit.saleNumber}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Cliente</span>
                  <span className="font-medium">
                    {saleToEmit.clientName || "Cliente final"}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Total</span>
                  <span className="font-bold text-lg">
                    {fmt(saleToEmit.total)}
                  </span>
                </div>
              </div>

              <div className="space-y-3">
                <p className="text-sm font-medium">Tipo de documento:</p>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={() => setDocumentType("invoice")}
                    disabled={saleToEmit.invoiceEmitted}
                    className={`p-4 rounded-xl border-2 text-left transition-all ${
                      documentType === "invoice"
                        ? "border-primary bg-primary/5"
                        : "border-border hover:border-primary/50"
                    } ${saleToEmit.invoiceEmitted ? "opacity-50 cursor-not-allowed" : ""}`}
                  >
                    <FileText
                      className={`h-6 w-6 mb-2 ${documentType === "invoice" ? "text-primary" : "text-muted-foreground"}`}
                    />
                    <p
                      className={`font-semibold ${documentType === "invoice" ? "text-foreground" : "text-muted-foreground"}`}
                    >
                      Boleta
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {saleToEmit.invoiceEmitted
                        ? "Ya emitida"
                        : "Factura fiscal digital"}
                    </p>
                  </button>
                  <button
                    onClick={() => setDocumentType("remito")}
                    disabled={!!saleToEmit.remitoNumber}
                    className={`p-4 rounded-xl border-2 text-left transition-all ${
                      documentType === "remito"
                        ? "border-primary bg-primary/5"
                        : "border-border hover:border-primary/50"
                    } ${saleToEmit.remitoNumber ? "opacity-50 cursor-not-allowed" : ""}`}
                  >
                    <Truck
                      className={`h-6 w-6 mb-2 ${documentType === "remito" ? "text-primary" : "text-muted-foreground"}`}
                    />
                    <p
                      className={`font-semibold ${documentType === "remito" ? "text-foreground" : "text-muted-foreground"}`}
                    >
                      Remito
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {saleToEmit.remitoNumber
                        ? "Ya generado"
                        : "Comprobante de entrega"}
                    </p>
                  </button>
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => setEmitModalOpen(false)}
                >
                  Cancelar
                </Button>
                <Button
                  className="flex-1 gap-2"
                  onClick={handleEmitDocument}
                  disabled={
                    emitting ||
                    (documentType === "invoice" && saleToEmit.invoiceEmitted) ||
                    (documentType === "remito" && saleToEmit.remitoNumber)
                  }
                >
                  {emitting && <Loader2 className="h-4 w-4 animate-spin" />}
                  {documentType === "invoice"
                    ? "Emitir Boleta"
                    : "Generar Remito"}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Modal de Boleta para Imprimir */}
      <Dialog open={showBoletaModal} onOpenChange={setShowBoletaModal}>
        <DialogContent className="max-w-[100vw] w-full h-[100vh] max-h-[100vh] overflow-hidden p-0 border-0 bg-gray-100">
          <DialogHeader className="sr-only">
            <DialogTitle>
              Boleta Electrónica {lastInvoice?.invoiceNumber}
            </DialogTitle>
            <DialogDescription>
              Vista previa de la boleta para imprimir
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col h-full">
            {/* Header fijo */}
            <div className="flex items-center justify-between px-6 py-3 bg-white border-b shadow-sm shrink-0">
              <div className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-primary" />
                <span className="font-semibold">Boleta Electrónica</span>
                <span className="text-sm text-muted-foreground ml-2">
                  {lastInvoice?.invoiceNumber}
                </span>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowBoletaModal(false)}
                >
                  Cerrar
                </Button>
                <Button size="sm" onClick={handlePrintBoleta} className="gap-2">
                  <Printer className="h-4 w-4" />
                  Imprimir
                </Button>
              </div>
            </div>

            {/* Área de visualización con scroll */}
            <div className="flex-1 overflow-auto p-4 md:p-8 flex justify-center items-start bg-gray-200">
              {lastInvoice?.afipData && (
                <div
                  className="bg-white shadow-2xl"
                  style={{ width: "210mm", minHeight: "297mm" }}
                >
                  <BoletaDocument
                    ref={boletaRef}
                    boletaNumber={lastInvoice.invoiceNumber}
                    date={new Date()}
                    clientName={
                      selectedClientData?.name || saleToEmit?.clientName
                    }
                    clientCuit={selectedClientData?.cuit}
                    clientAddress={selectedClientData?.address}
                    clientPhone={
                      saleToEmit?.clientPhone || selectedClientData?.phone
                    }
                    clientTaxCategory={selectedClientData?.taxCategory}
                    items={
                      saleToEmit?.items.map((item: any) => ({
                        name: item.name,
                        quantity: item.quantity,
                        price: item.price,
                      })) || []
                    }
                    total={saleToEmit?.total || 0}
                    paymentType={saleToEmit?.paymentType || "cash"}
                    cashAmount={saleToEmit?.cashAmount}
                    creditAmount={saleToEmit?.creditAmount}
                    cae={lastInvoice.afipData.cae}
                    caeVencimiento={lastInvoice.afipData.caeVencimiento}
                  />
                </div>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Modal de Remito para Visualizar/Imprimir */}
      {/* Modal de Remito para Visualizar/Imprimir */}
      <Dialog open={showRemitoModal} onOpenChange={setShowRemitoModal}>
        <DialogContent className="max-w-[100vw] w-full h-[100vh] max-h-[100vh] overflow-hidden p-0 border-0 bg-gray-100">
          <DialogHeader className="sr-only">
            <DialogTitle>Remito {lastRemito?.remitoNumber}</DialogTitle>
            <DialogDescription>
              Vista previa del remito para imprimir
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col h-full">
            {/* Header fijo */}
            <div className="flex items-center justify-between px-6 py-3 bg-white border-b shadow-sm shrink-0">
              <div className="flex items-center gap-2">
                <Truck className="h-5 w-5 text-primary" />
                <span className="font-semibold">Remito de Entrega</span>
                <span className="text-sm text-muted-foreground ml-2">
                  {lastRemito?.remitoNumber}
                </span>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowRemitoModal(false)}
                >
                  Cerrar
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleDownloadRemitoPdf}
                  className="gap-2"
                >
                  <Download className="h-4 w-4" />
                  Descargar
                </Button>
                <Button size="sm" onClick={handlePrintRemito} className="gap-2">
                  <Printer className="h-4 w-4" />
                  Imprimir
                </Button>
              </div>
            </div>

            {/* Área de visualización con scroll */}
            <div className="flex-1 overflow-auto p-4 md:p-8 flex justify-center items-start bg-gray-200">
              {lastRemito?.sale && (
                <div
                  className="bg-white shadow-2xl"
                  style={{ width: "210mm", minHeight: "297mm" }}
                >
                  <RemitoDocument
                    ref={remitoRef}
                    remitoNumber={lastRemito.remitoNumber}
                    date={new Date()}
                    saleId={lastRemito.sale.id}
                    clientName={lastRemito.sale.clientName}
                    clientAddress={lastRemito.sale.clientAddress}
                    clientPhone={lastRemito.sale.clientPhone}
                    sellerName={lastRemito.sale.sellerName}
                    items={
                      lastRemito.sale.items.map((item: any) => ({
                        name: item.name,
                        quantity: item.quantity,
                        price: item.price,
                      })) || []
                    }
                    total={lastRemito.sale.total || 0}
                    notes={lastRemito.sale.notes}
                  />
                </div>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </MainLayout>
  );
}
