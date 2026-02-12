// components/ModalDetalleVenta.tsx
"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Package,
  User,
  FileText,
  Truck,
  Banknote,
  CreditCard,
  Clock,
  Download,
  Send,
  Eye,
} from "lucide-react";
import type { ModalDetalleProps, Venta } from "../types";

interface ModalDetalleVentaProps extends ModalDetalleProps {
  formatearMoneda: (monto: number) => string;
  formatearFechaHora: (fecha: Date) => string;
  etiquetaPago: (tipo: string) => string;
  claseBadgePago: (tipo: string) => string;
}

export function ModalDetalleVenta({
  abierto,
  venta,
  onCerrar,
  onEmitirBoleta,
  onGenerarRemito,
  onDescargarPdf,
  onEnviarWhatsapp,
  formatearMoneda,
  formatearFechaHora,
  etiquetaPago,
  claseBadgePago,
}: ModalDetalleVentaProps) {
  if (!venta) return null;

  const urlWhatsappBoleta = onEnviarWhatsapp(
    venta.clientPhone,
    venta.invoicePdfUrl || venta.invoiceWhatsappUrl || undefined,
    venta.clientName,
  );

  const urlWhatsappRemito = onEnviarWhatsapp(
    venta.clientPhone,
    venta.remitoPdfUrl || undefined,
    venta.clientName,
  );

  return (
    <Dialog open={abierto} onOpenChange={onCerrar}>
      <DialogContent className="max-w-lg p-0 gap-0 overflow-hidden max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="bg-gradient-to-br from-primary/5 to-primary/10 p-6 border-b border-border/50">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="h-12 w-12 rounded-xl bg-white dark:bg-background shadow-sm flex items-center justify-center">
                <FileText className="h-6 w-6 text-primary" />
              </div>
              <div>
                <DialogTitle className="text-xl font-bold text-foreground">
                  Venta N° {venta.saleNumber || "?"}
                </DialogTitle>
                <DialogDescription className="text-sm text-muted-foreground flex items-center gap-1 mt-0.5">
                  <Clock className="h-3.5 w-3.5" />
                  {formatearFechaHora(venta.createdAt)}
                </DialogDescription>
              </div>
            </div>
            <Badge
              variant="outline"
              className={`${claseBadgePago(venta.paymentType)} px-3 py-1`}
            >
              {etiquetaPago(venta.paymentType)}
            </Badge>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Cliente y Vendedor */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Cliente
              </p>
              <div className="flex items-center gap-2">
                <Avatar className="h-8 w-8">
                  <AvatarFallback className="bg-primary/10 text-primary text-xs">
                    {(venta.clientName || "C").charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <p className="font-medium text-foreground">
                  {venta.clientName || "Cliente final"}
                </p>
              </div>
            </div>
            <div className="space-y-1">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Vendedor
              </p>
              <p
                className={`font-medium ${venta.sellerName ? "text-foreground" : "text-muted-foreground italic"}`}
              >
                {venta.sellerName || "Sin vendedor"}
              </p>
            </div>
          </div>

          {/* Documentos con botones PDF/WhatsApp - LAYOUT RESPONSIVE */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Boleta */}
            <div
              className={`p-4 rounded-xl border ${
                venta.invoiceEmitted
                  ? "bg-emerald-50/50 border-emerald-200 dark:bg-emerald-900/20 dark:border-emerald-800"
                  : "bg-amber-50/50 border-amber-200 dark:bg-amber-900/20 dark:border-amber-800"
              }`}
            >
              <div className="flex items-center gap-2 mb-2">
                <FileText
                  className={`h-4 w-4 ${venta.invoiceEmitted ? "text-emerald-600" : "text-amber-600"}`}
                />
                <span className="text-xs font-medium text-muted-foreground">
                  Boleta
                </span>
              </div>
              <p
                className={`font-semibold ${
                  venta.invoiceEmitted
                    ? "text-emerald-700 dark:text-emerald-400"
                    : "text-amber-700 dark:text-amber-400"
                }`}
              >
                {venta.invoiceEmitted
                  ? venta.invoiceNumber || "Emitida"
                  : "Pendiente"}
              </p>

              {/* Botones PDF/WhatsApp - APILADOS EN MÓVIL */}
              {venta.invoiceEmitted && venta.invoicePdfUrl && (
                <div className="flex flex-col gap-2 mt-3">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      onDescargarPdf(
                        venta.invoicePdfUrl!,
                        `Boleta-${venta.invoiceNumber}.pdf`,
                      )
                    }
                    className="w-full gap-1.5 text-xs"
                  >
                    <Download className="h-3.5 w-3.5" />
                    Descargar PDF
                  </Button>
                  {urlWhatsappBoleta && (
                    <Button
                      size="sm"
                      asChild
                      className="w-full gap-1.5 text-xs bg-green-500 hover:bg-green-600 text-white border-0"
                    >
                      <a
                        href={urlWhatsappBoleta}
                        target="_blank"
                        rel="noreferrer"
                      >
                        <Send className="h-3.5 w-3.5" />
                        Enviar por WhatsApp
                      </a>
                    </Button>
                  )}
                </div>
              )}
            </div>

            {/* Remito */}
            <div
              className={`p-4 rounded-xl border ${
                venta.remitoNumber
                  ? "bg-blue-50/50 border-blue-200 dark:bg-blue-900/20 dark:border-blue-800"
                  : "bg-muted/50 border-border"
              }`}
            >
              <div className="flex items-center gap-2 mb-2">
                <Truck
                  className={`h-4 w-4 ${venta.remitoNumber ? "text-blue-600" : "text-muted-foreground"}`}
                />
                <span className="text-xs font-medium text-muted-foreground">
                  Remito
                </span>
              </div>
              <p
                className={`font-semibold ${
                  venta.remitoNumber
                    ? "text-blue-700 dark:text-blue-400"
                    : "text-muted-foreground"
                }`}
              >
                {venta.remitoNumber || "Sin remito"}
              </p>

              {/* Botones PDF/WhatsApp - APILADOS EN MÓVIL */}
              {venta.remitoNumber && venta.remitoPdfUrl && (
                <div className="flex flex-col gap-2 mt-3">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      onDescargarPdf(
                        venta.remitoPdfUrl!,
                        `Remito-${venta.remitoNumber}.pdf`,
                      )
                    }
                    className="w-full gap-1.5 text-xs"
                  >
                    <Download className="h-3.5 w-3.5" />
                    Descargar PDF
                  </Button>
                  {urlWhatsappRemito && (
                    <Button
                      size="sm"
                      asChild
                      className="w-full gap-1.5 text-xs bg-green-500 hover:bg-green-600 text-white border-0"
                    >
                      <a
                        href={urlWhatsappRemito}
                        target="_blank"
                        rel="noreferrer"
                      >
                        <Send className="h-3.5 w-3.5" />
                        Enviar por WhatsApp
                      </a>
                    </Button>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Productos */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                <Package className="h-3.5 w-3.5" />
                Productos ({venta.items.length})
              </p>
            </div>
            <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
              {venta.items.map((item, i) => (
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
                        {formatearMoneda(item.price)} c/u
                      </p>
                    </div>
                  </div>
                  <p className="font-semibold text-foreground">
                    {formatearMoneda(item.price * item.quantity)}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* Detalle de pago mixto */}
          {venta.paymentType === "mixed" && (
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
                  {formatearMoneda(venta.cashAmount || 0)}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-2 text-sm text-amber-700 dark:text-amber-300">
                  <CreditCard className="h-4 w-4" />
                  Cuenta Corriente
                </div>
                <span className="font-semibold text-amber-800 dark:text-amber-400">
                  {formatearMoneda(venta.creditAmount || 0)}
                </span>
              </div>
            </div>
          )}

          {/* Total */}
          <div className="flex items-center justify-between p-4 rounded-xl bg-foreground text-background">
            <span className="font-medium">Total</span>
            <span className="text-2xl font-bold">
              {formatearMoneda(venta.total)}
            </span>
          </div>

          {/* Botones de acción - AHORA PERMITE AMBOS */}
          <div className="flex flex-col gap-2">
            {!venta.invoiceEmitted && (
              <Button
                className="w-full gap-1.5"
                onClick={() => onEmitirBoleta(venta)}
              >
                <FileText className="h-4 w-4" />
                Emitir Boleta
              </Button>
            )}
            {!venta.remitoNumber && (
              <Button
                variant="outline"
                className="w-full gap-1.5"
                onClick={() => onGenerarRemito(venta)}
              >
                <Truck className="h-4 w-4" />
                Generar Remito
              </Button>
            )}
            {venta.invoiceEmitted && venta.remitoNumber && (
              <Button variant="outline" className="w-full" onClick={onCerrar}>
                Cerrar
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
