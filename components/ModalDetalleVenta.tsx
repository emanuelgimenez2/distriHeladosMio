"use client";

import { useState } from "react";
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
  Loader2,
} from "lucide-react";
import { ModalBoleta } from "./documentos/modal-boleta";
import { downloadBase64Pdf } from "@/services/pdf-service";
import { toast } from "sonner";
import type { Venta } from "../types";

interface ModalDetalleVentaProps {
  abierto: boolean;
  venta: Venta | null;
  onCerrar: () => void;
  onEmitirBoleta: (venta: Venta) => void; // recibe Venta y abre modal de emisión con tipo "boleta"
  onGenerarRemito: (venta: Venta) => void; // recibe Venta y abre modal de emisión con tipo "remito"
  onDescargarPdf: (url: string, nombre: string) => void;
  onEnviarWhatsapp: (
    phone?: string,
    pdfUrl?: string,
    clientName?: string,
  ) => string | null;
  formatearMoneda: (monto: number) => string;
  formatearFechaHora: (fecha: any) => string;
  etiquetaPago: (tipo: string) => string;
  claseBadgePago: (tipo: string) => string;
}

export function ModalDetalleVenta({
  abierto,
  venta,
  onCerrar,
  onEmitirBoleta,
  onGenerarRemito,
  formatearMoneda,
  formatearFechaHora,
  etiquetaPago,
  claseBadgePago,
}: ModalDetalleVentaProps) {
  const [showBoletaModal, setShowBoletaModal] = useState(false);
  const [downloading, setDownloading] = useState<"invoice" | "remito" | null>(
    null,
  );

  if (!venta) return null;

  const handleDownloadFromDb = async (type: "invoice" | "remito") => {
    setDownloading(type);
    try {
      const base64Field =
        type === "invoice" ? "invoicePdfBase64" : "remitoPdfBase64";
      const filenameField =
        type === "invoice" ? "invoiceFilename" : "remitoFilename";

      if (venta[base64Field]) {
        downloadBase64Pdf(
          venta[base64Field],
          venta[filenameField] || `${type}-${venta.id}.pdf`,
        );
        toast.success("Descargando archivo...");
      } else {
        // Si no está en base64, abrir el modal para generarlo
        if (type === "invoice") {
          // Llamar a onEmitirBoleta para abrir el modal de emisión
          onEmitirBoleta(venta);
        } else {
          toast.error("Remito no generado aún");
        }
      }
    } finally {
      setDownloading(null);
    }
  };

  const handleWhatsappWithPdf = async (type: "invoice" | "remito") => {
    const base64Field =
      type === "invoice" ? "invoicePdfBase64" : "remitoPdfBase64";
    const filenameField =
      type === "invoice" ? "invoiceFilename" : "remitoFilename";

    if (!venta[base64Field]) {
      toast.error("Primero debes generar el PDF");
      if (type === "invoice") onEmitirBoleta(venta);
      return;
    }

    if (!venta.clientPhone) {
      toast.error("El cliente no tiene número de teléfono");
      return;
    }

    try {
      toast.loading("Subiendo PDF a Drive...");

      const res = await fetch("/api/drive", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          base64: venta[base64Field],
          filename: venta[filenameField] || `${type}-${venta.id}.pdf`,
        }),
      });

      if (!res.ok) throw new Error("Error al subir a Drive");
      const { downloadUrl } = await res.json();

      const phone = venta.clientPhone.replace(/\D/g, "");
      const formattedPhone = phone.startsWith("54") ? phone : `54${phone}`;
      const docName = type === "invoice" ? "comprobante" : "remito";
      const msg = `Hola ${venta.clientName}! Te envío tu ${docName}.\n\n📄 Descargar: ${downloadUrl}`;

      toast.dismiss();
      toast.success("✅ Link generado");
      window.open(
        `https://wa.me/${formattedPhone}?text=${encodeURIComponent(msg)}`,
        "_blank",
      );
    } catch (e: any) {
      toast.dismiss();
      toast.error("Error: " + e.message);
    }
  };

  return (
    <>
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

            {/* Documentos */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Boleta */}
              <div
                className={`p-4 rounded-xl border ${venta.invoiceEmitted ? "bg-emerald-50/50 border-emerald-200" : "bg-amber-50/50 border-amber-200"}`}
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
                  className={`font-semibold ${venta.invoiceEmitted ? "text-emerald-700" : "text-amber-700"}`}
                >
                  {venta.invoiceEmitted
                    ? venta.invoiceNumber || "Emitida"
                    : "Pendiente"}
                </p>

                {venta.invoiceEmitted && (
                  <div className="flex flex-col gap-2 mt-3">
                    {venta.invoicePdfBase64 ? (
                      <>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDownloadFromDb("invoice")}
                          disabled={downloading === "invoice"}
                          className="w-full gap-1.5 text-xs"
                        >
                          {downloading === "invoice" ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <Download className="h-3.5 w-3.5" />
                          )}
                          Descargar PDF
                        </Button>
                        {venta.clientPhone && (
                          <Button
                            size="sm"
                            onClick={() => handleWhatsappWithPdf("invoice")}
                            className="w-full gap-1.5 text-xs bg-green-500 hover:bg-green-600 text-white"
                          >
                            <Send className="h-3.5 w-3.5" />
                            Enviar WhatsApp
                          </Button>
                        )}
                      </>
                    ) : (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => onEmitirBoleta(venta)} // 🔹 Abre el modal de emisión con boleta
                        className="w-full gap-1.5 text-xs"
                      >
                        <Eye className="h-3.5 w-3.5" />
                        Generar PDF
                      </Button>
                    )}
                  </div>
                )}
              </div>

              {/* Remito */}
              <div
                className={`p-4 rounded-xl border ${venta.remitoNumber ? "bg-blue-50/50 border-blue-200" : "bg-muted/50 border-border"}`}
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
                  className={`font-semibold ${venta.remitoNumber ? "text-blue-700" : "text-muted-foreground"}`}
                >
                  {venta.remitoNumber || "Sin remito"}
                </p>

                {!venta.remitoNumber && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onGenerarRemito(venta)} // 🔹 Abre el modal de emisión con remito
                    className="w-full gap-1.5 text-xs mt-3"
                  >
                    <Truck className="h-3.5 w-3.5" />
                    Generar Remito
                  </Button>
                )}
              </div>
            </div>

            {/* Productos */}
            <div className="space-y-3">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                <Package className="h-3.5 w-3.5" />
                Productos ({venta.items.length})
              </p>
              <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                {venta.items.map((item, i) => (
                  <div
                    key={i}
                    className="flex items-center justify-between p-3 rounded-lg bg-muted/40"
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

            {/* Pago mixto */}
            {venta.paymentType === "mixed" && (
              <div className="p-4 rounded-xl bg-amber-50/50 border border-amber-200 space-y-2">
                <p className="text-xs font-medium text-amber-800 uppercase tracking-wider">
                  Detalle de Pago Mixto
                </p>
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-2 text-sm text-amber-700">
                    <Banknote className="h-4 w-4" />
                    Efectivo
                  </div>
                  <span className="font-semibold text-amber-800">
                    {formatearMoneda(venta.cashAmount || 0)}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-2 text-sm text-amber-700">
                    <CreditCard className="h-4 w-4" />
                    Cuenta Corriente
                  </div>
                  <span className="font-semibold text-amber-800">
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

            {/* Botones de acción */}
            <div className="flex flex-col gap-2">
              {!venta.invoiceEmitted && (
                <Button
                  className="w-full gap-1.5"
                  onClick={() => onEmitirBoleta(venta)} // 🔹 Boleta
                >
                  <FileText className="h-4 w-4" />
                  Emitir Boleta
                </Button>
              )}
              {!venta.remitoNumber && (
                <Button
                  variant="outline"
                  className="w-full gap-1.5"
                  onClick={() => onGenerarRemito(venta)} // 🔹 Remito
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

      {/* Modal de Boleta (se abre desde el hook) */}
      {/* El modal de boleta ya no se maneja aquí, se maneja desde el hook a través de emitirDocumento */}
      {/* Por eso quitamos <ModalBoleta /> de aquí */}
    </>
  );
}
