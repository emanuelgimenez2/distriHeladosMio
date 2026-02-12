// components/ListaVentas.tsx
"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { DataTableSkeleton } from "@/components/ui/data-table-skeleton";
import {
  Search,
  ShoppingBag,
  User,
  X,
  Calendar,
  Filter,
  Banknote,
  CreditCard,
  Sparkles,
  Receipt,
  Eye,
  Plus,
} from "lucide-react";
import Link from "next/link";
import type { ListaVentasProps } from "../types";

export function ListaVentas({
  ventas,
  cargando,
  filtros,
  onCambiarFiltros,
  onVerDetalle,
  onEmitirDocumento,
}: ListaVentasProps) {
  const { searchQuery, invoiceFilter, paymentFilter, periodFilter } = filtros;

  const payIcon = (pt: string) => {
    if (pt === "cash") return <Banknote className="h-3.5 w-3.5" />;
    if (pt === "credit") return <CreditCard className="h-3.5 w-3.5" />;
    if (pt === "mixed") return <Sparkles className="h-3.5 w-3.5" />;
    return null;
  };

  const payLabel = (pt: string) => {
    if (pt === "cash") return "Contado";
    if (pt === "credit") return "Cta. Corriente";
    if (pt === "mixed") return "Mixto";
    return pt;
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

  const fmtTime = (date: Date) =>
    new Intl.DateTimeFormat("es-AR", {
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(date));

  const hayFiltrosActivos =
    searchQuery ||
    paymentFilter !== "all" ||
    invoiceFilter !== "all" ||
    periodFilter !== "today";

  if (cargando) {
    return <DataTableSkeleton columns={5} rows={8} />;
  }

  return (
    <div className="space-y-4 md:space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-foreground tracking-tight">
            Historial de Ventas
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            {ventas.length}{" "}
            {ventas.length === 1 ? "venta registrada" : "ventas registradas"}
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

      {/* Filtros */}
      <Card className="border-border/60 shadow-sm">
        <CardContent className="p-3 md:p-4">
          <div className="flex flex-col lg:flex-row gap-3">
            {/* Búsqueda */}
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por cliente, vendedor o ID..."
                value={searchQuery}
                onChange={(e) =>
                  onCambiarFiltros({ searchQuery: e.target.value })
                }
                className="pl-10 h-10 bg-background"
              />
              {searchQuery && (
                <button
                  onClick={() => onCambiarFiltros({ searchQuery: "" })}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>

            {/* Grupo de filtros */}
            <div className="flex flex-wrap gap-2">
              <div className="flex items-center gap-2 bg-muted/50 rounded-lg p-1">
                <Filter className="h-4 w-4 text-muted-foreground ml-2" />
                <Select
                  value={periodFilter}
                  onValueChange={(v) =>
                    onCambiarFiltros({ periodFilter: v as any })
                  }
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
                onValueChange={(v) =>
                  onCambiarFiltros({ paymentFilter: v as any })
                }
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
                onValueChange={(v) =>
                  onCambiarFiltros({ invoiceFilter: v as any })
                }
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

          {/* Filtros activos */}
          {hayFiltrosActivos && (
            <div className="flex flex-wrap gap-2 mt-3 pt-3 border-t border-border/50">
              <span className="text-xs text-muted-foreground">
                Filtros activos:
              </span>
              {searchQuery && (
                <Badge variant="secondary" className="text-xs gap-1">
                  Búsqueda: {searchQuery}
                  <button onClick={() => onCambiarFiltros({ searchQuery: "" })}>
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              )}
              {periodFilter !== "today" && (
                <Badge variant="secondary" className="text-xs gap-1">
                  {periodFilter === "week" ? "Esta semana" : "Este mes"}
                  <button
                    onClick={() => onCambiarFiltros({ periodFilter: "today" })}
                  >
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              )}
              {paymentFilter !== "all" && (
                <Badge variant="secondary" className="text-xs gap-1">
                  {payLabel(paymentFilter)}
                  <button
                    onClick={() => onCambiarFiltros({ paymentFilter: "all" })}
                  >
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              )}
              {invoiceFilter !== "all" && (
                <Badge variant="secondary" className="text-xs gap-1">
                  {invoiceFilter === "emitted" ? "Emitidas" : "Pendientes"}
                  <button
                    onClick={() => onCambiarFiltros({ invoiceFilter: "all" })}
                  >
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              )}
              <button
                onClick={() => {
                  onCambiarFiltros({
                    searchQuery: "",
                    paymentFilter: "all",
                    invoiceFilter: "all",
                    periodFilter: "today",
                  });
                }}
                className="text-xs text-primary hover:underline"
              >
                Limpiar todos
              </button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Lista de ventas */}
      <Card className="border-border/60 shadow-sm overflow-hidden">
        {ventas.length === 0 ? (
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
            {/* Header desktop */}
            <div className="hidden md:grid grid-cols-12 gap-4 p-4 bg-muted/30 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              <div className="col-span-2">Venta</div>
              <div className="col-span-3">Cliente</div>
              <div className="col-span-2">Fecha</div>
              <div className="col-span-2 text-right">Total</div>
              <div className="col-span-2 text-center">Pago</div>
              <div className="col-span-1 text-center">Acciones</div>
            </div>

            {/* Items */}
            {ventas.map((venta, index) => (
              <div
                key={venta.id}
                className="group flex flex-col md:grid md:grid-cols-12 gap-2 md:gap-4 p-4 hover:bg-muted/30 transition-colors"
              >
                {/* Mobile */}
                <div className="flex md:hidden items-start justify-between w-full">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                      <Receipt className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <p className="font-semibold text-foreground">
                        Venta N° {venta.saleNumber || ventas.length - index}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {venta.clientName || "Venta directa"}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-foreground">
                      {fmt(venta.total)}
                    </p>
                    <Badge
                      variant="outline"
                      className={`text-[10px] mt-1 ${payBadgeCls(venta.paymentType)}`}
                    >
                      {payLabel(venta.paymentType)}
                    </Badge>
                  </div>
                </div>

                <div className="flex md:hidden items-center justify-between w-full mt-2 pt-2 border-t border-border/50">
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Calendar className="h-3 w-3" />
                    {fmtDate(venta.createdAt)}
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 text-blue-600"
                    onClick={() => onVerDetalle(venta)}
                  >
                    <Eye className="h-4 w-4 mr-1" />
                    Ver detalles
                  </Button>
                </div>

                {/* Desktop */}
                <div className="hidden md:flex md:col-span-2 items-center gap-3">
                  <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                    <Receipt className="h-4 w-4 text-primary" />
                  </div>
                  <div>
                    <p className="font-semibold text-foreground text-sm">
                      N° {venta.saleNumber || ventas.length - index}
                    </p>
                    <p className="text-[10px] text-muted-foreground font-mono">
                      {venta.id.slice(-6)}
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
                      {venta.clientName || "Venta directa"}
                    </p>
                    {venta.sellerName && (
                      <p className="text-[10px] text-muted-foreground truncate">
                        Vendedor: {venta.sellerName}
                      </p>
                    )}
                  </div>
                </div>

                <div className="hidden md:flex md:col-span-2 items-center text-sm text-muted-foreground">
                  <div>
                    <p>{fmtDate(venta.createdAt)}</p>
                    <p className="text-xs">{fmtTime(venta.createdAt)}</p>
                  </div>
                </div>

                <div className="hidden md:flex md:col-span-2 items-center justify-end">
                  <p className="font-bold text-foreground text-base">
                    {fmt(venta.total)}
                  </p>
                </div>

                <div className="hidden md:flex md:col-span-2 items-center justify-center">
                  <Badge
                    variant="outline"
                    className={`gap-1.5 px-2.5 py-1 ${payBadgeCls(venta.paymentType)}`}
                  >
                    {payIcon(venta.paymentType)}
                    {payLabel(venta.paymentType)}
                  </Badge>
                </div>

                <div className="hidden md:flex md:col-span-1 items-center justify-center">
                  {/* BOTÓN VER DETALLES - AHORA ES EL ÚNICO BOTÓN */}
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 text-blue-600 hover:text-blue-700 hover:bg-blue-50 gap-1"
                    onClick={() => onVerDetalle(venta)}
                  >
                    <Eye className="h-4 w-4" />
                    <span className="hidden lg:inline text-xs">Ver</span>
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

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
    </div>
  );
}
