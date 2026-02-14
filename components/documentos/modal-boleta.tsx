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
import {
  Printer,
  FileText,
  X,
  Download,
  Send,
  Loader2,
  Check,
} from "lucide-react";
import { usePdfGenerator } from "@/hooks/usePdfGenerator";
import { savePdfToDatabase } from "@/services/pdf-service";
import { toast } from "sonner";

interface ModalBoletaProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  invoiceNumber: string;
  invoiceData: any;
  clientData?: any;
  saleData?: any;
  saleId: string;
  onPdfGenerated?: () => void;
}

// Función para generar HTML de la boleta
const generateBoletaHtml = (props: any): string => {
  const {
    invoiceNumber,
    date,
    clientName,
    clientCuit,
    clientAddress,
    clientTaxCategory,
    items,
    total,
    paymentType,
    cashAmount,
    creditAmount,
    cae,
    caeVencimiento,
  } = props;

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat("es-AR", {
      style: "currency",
      currency: "ARS",
      minimumFractionDigits: 2,
    }).format(amount);

  const formatDate = (d: Date | string) =>
    new Date(d).toLocaleDateString("es-AR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });

  const isElectronica = !!cae;
  const [pv, nro] = invoiceNumber.split("-");

  const itemsHtml = items
    .map(
      (item: any) => `
    <tr>
      <td class="text-center">${item.quantity}</td>
      <td>${item.name}</td>
      <td class="text-right">${formatCurrency(item.price)}</td>
      <td class="text-right">21.00</td>
      <td class="text-right">${formatCurrency(item.price * item.quantity)}</td>
    </tr>
  `,
    )
    .join("");

  const emptyRows = Array.from({ length: Math.max(0, 10 - items.length) })
    .map(
      () => `
    <tr><td>&nbsp;</td><td>&nbsp;</td><td>&nbsp;</td><td>&nbsp;</td><td>&nbsp;</td></tr>
  `,
    )
    .join("");

  const mixedPaymentHtml =
    paymentType === "mixed"
      ? `
    <div style="border-top: 1px dashed #000000; padding-top: 8px; margin-top: 8px; font-size: 12px;">
      <div style="display: flex; justify-content: space-between;">
        <span>Efectivo:</span>
        <span>${formatCurrency(cashAmount || 0)}</span>
      </div>
      <div style="display: flex; justify-content: space-between;">
        <span>A Cuenta:</span>
        <span>${formatCurrency(creditAmount || 0)}</span>
      </div>
    </div>
  `
      : "";

  const electronicHtml = isElectronica
    ? `
    <div class="border-box p-4">
      <div class="grid-2">
        <div>
          <p style="font-size: 9px;">
            <strong>CAE N:</strong> ${cae || "N/A"}<br>
            <strong>Fecha de Vto. de CAE:</strong> ${caeVencimiento ? formatDate(caeVencimiento) : "-"}
          </p>
        </div>
        <div style="display: flex; justify-content: flex-end;">
          <div class="qr-box">
            ${cae ? `<img src="https://api.qrserver.com/v1/create-qr-code/?size=100x100&data=CAE:${cae}" alt="QR" style="width: 100%; height: 100%;">` : "QR AFIP"}
          </div>
        </div>
      </div>
    </div>
  `
    : `
    <div class="border-box p-4 text-center">
      <p style="font-weight: bold; color: #dc2626; font-size: 14px;">DOCUMENTO NO VALIDO COMO FACTURA</p>
      <p style="font-size: 9px; color: #6b7280;">Este documento es un presupuesto. Solicite factura electrónica si la requiere.</p>
    </div>
  `;

  const footerHtml = isElectronica
    ? `
    <p>Comprobante autorizado por AFIP</p>
    <p>Esta factura contribuye al desarrollo del pais. El pago de los impuestos es obligacion de todos.</p>
  `
    : `
    <p>Documento interno - No válido fiscalmente</p>
  `;

  return `
    <div class="border-box">
      <div class="grid-3">
        <div class="p-4 border-r">
          <h1 style="font-size: 20px; font-weight: bold; margin-bottom: 8px;">HELADOS MIO</h1>
          <p style="font-size: 9px; line-height: 1.6;">
            Razon Social: HELADOS MIO S.R.L.<br>
            Domicilio Comercial: Av. Principal 1234<br>
            Localidad: Buenos Aires<br>
            Condicion frente al IVA: Responsable Inscripto
          </p>
        </div>
        <div class="p-4 border-r text-center">
          <div class="doc-type-box">${isElectronica ? "B" : "X"}</div>
          <p style="font-size: 9px;">
            ${isElectronica ? "Codigo 006" : "Documento No Valido como Factura"}<br>
            ${isElectronica ? "FACTURA" : "PRESUPUESTO"}
          </p>
        </div>
        <div class="p-4">
          <p style="font-size: 18px; font-weight: bold; margin-bottom: 8px;">
            Punto de Venta: ${pv || "0001"}<br>
            Comp. Nro: ${nro || invoiceNumber}
          </p>
          <p style="font-size: 9px; line-height: 1.6;">
            Fecha de Emision: ${formatDate(date)}<br>
            CUIT: 30-12345678-9<br>
            Ingresos Brutos: 12345678<br>
            Inicio de Actividades: 01/01/2020
          </p>
        </div>
      </div>
    </div>

    <div class="border-box p-4">
      <div class="grid-2">
        <div>
          <p><strong>CUIT:</strong> ${clientCuit || "00-00000000-0"}</p>
          <p><strong>Condicion frente al IVA:</strong> ${clientTaxCategory || "Consumidor Final"}</p>
        </div>
        <div>
          <p><strong>Apellido y Nombre / Razon Social:</strong></p>
          <p>${clientName || "Consumidor Final"}</p>
        </div>
      </div>
      <div class="grid-2" style="margin-top: 8px;">
        <p><strong>Domicilio:</strong> ${clientAddress || "-"}</p>
        <p><strong>Condicion de venta:</strong> ${paymentType === "cash" ? "Contado" : paymentType === "credit" ? "Cuenta Corriente" : "Mixto"}</p>
      </div>
    </div>

    <div class="border-box">
      <table>
        <thead>
          <tr>
            <th style="width: 80px;">Cantidad</th>
            <th>Descripcion</th>
            <th style="width: 100px;" class="text-right">Precio Unit.</th>
            <th style="width: 80px;" class="text-right">% IVA</th>
            <th style="width: 100px;" class="text-right">Subtotal</th>
          </tr>
        </thead>
        <tbody>
          ${itemsHtml}
          ${emptyRows}
        </tbody>
      </table>
    </div>

    <div class="border-box p-4">
      <div class="totals-box">
        <div style="display: flex; justify-content: space-between; margin-bottom: 4px;">
          <span>Subtotal:</span>
          <span>${formatCurrency(total / 1.21)}</span>
        </div>
        <div style="display: flex; justify-content: space-between; margin-bottom: 4px;">
          <span>IVA 21%:</span>
          <span>${formatCurrency(total - total / 1.21)}</span>
        </div>
        <div style="display: flex; justify-content: space-between; font-weight: bold; font-size: 18px; border-top: 1px solid #000; padding-top: 8px;">
          <span>TOTAL:</span>
          <span>${formatCurrency(total)}</span>
        </div>
        ${mixedPaymentHtml}
      </div>
    </div>

    ${electronicHtml}

    <div style="margin-top: 16px; text-align: center; font-size: 9px; color: #6b7280;">
      ${footerHtml}
    </div>
  `;
};

export function ModalBoleta({
  open,
  onOpenChange,
  invoiceNumber,
  invoiceData,
  clientData,
  saleData,
  saleId,
  onPdfGenerated,
}: ModalBoletaProps) {
  const { generatePdf, downloadPdf, shareToWhatsapp, generating, progress } =
    usePdfGenerator();
  const [pdfGenerated, setPdfGenerated] = useState(false);
  const [pdfData, setPdfData] = useState<{
    base64: string;
    blob: Blob;
    url: string;
  } | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleGenerateAndSave = async () => {
    console.log("🚀 Iniciando generación de PDF...");
    setError(null);

    try {
      // Generar HTML
      const html = generateBoletaHtml({
        invoiceNumber,
        date: new Date(),
        clientName: clientData?.name || saleData?.clientName,
        clientCuit: clientData?.cuit,
        clientAddress: clientData?.address,
        clientTaxCategory: clientData?.taxCategory,
        items: saleData?.items || [],
        total: saleData?.total || 0,
        paymentType: saleData?.paymentType || "cash",
        cashAmount: saleData?.cashAmount,
        creditAmount: saleData?.creditAmount,
        cae: invoiceData?.cae,
        caeVencimiento: invoiceData?.caeVencimiento,
      });

      console.log("📄 HTML generado, llamando a API...");
      const result = await generatePdf(html, `Boleta-${invoiceNumber}.pdf`);
      console.log("✅ PDF generado:", result.blob.size, "bytes");

      setPdfData(result);
      setSaving(true);

      // Guardar en base de datos
      console.log("💾 Guardando en Firebase...");
      await savePdfToDatabase(saleId, "invoice", {
        base64: result.base64,
        filename: `Boleta-${invoiceNumber}.pdf`,
        contentType: "application/pdf",
        size: result.blob.size,
        generatedAt: new Date().toISOString(),
      });

      setPdfGenerated(true);
      toast.success("✅ PDF generado y guardado correctamente");
      onPdfGenerated?.();
    } catch (err: any) {
      console.error("❌ Error completo:", err);
      setError(err.message || "Error desconocido");
      toast.error(
        "❌ Error al generar el PDF: " + (err.message || "Error desconocido"),
      );
    } finally {
      setSaving(false);
    }
  };

  const handleDownload = () => {
    if (pdfData?.blob) {
      downloadPdf(pdfData.blob, `Boleta-${invoiceNumber}.pdf`);
      toast.success("⬇️ Descargando PDF...");
    }
  };

  const handleWhatsapp = () => {
    const phone = clientData?.phone || saleData?.clientPhone;
    if (!phone) {
      toast.error("El cliente no tiene número de teléfono");
      return;
    }

    if (pdfData?.base64) {
      shareToWhatsapp(phone, pdfData.base64, `Boleta-${invoiceNumber}.pdf`);
      toast.success("📱 Abriendo WhatsApp...");
    }
  };

  const handlePrint = () => {
    if (pdfData?.url) {
      const printWindow = window.open(pdfData.url, "_blank");
      if (printWindow) {
        printWindow.onload = () => {
          printWindow.print();
        };
      }
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Boleta Electrónica {invoiceNumber}
          </DialogTitle>
          <DialogDescription>
            Genera y descarga el PDF de la boleta
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Error */}
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
              <p className="font-bold">Error:</p>
              <p className="text-sm">{error}</p>
            </div>
          )}

          {/* Preview del HTML */}
          <div className="bg-gray-100 rounded-lg p-4">
            <p className="text-xs font-mono text-gray-600 mb-2">
              Vista previa del contenido:
            </p>
            <div className="bg-white border rounded p-4 max-h-48 overflow-y-auto">
              <p className="text-xs text-gray-500">
                Cliente: {clientData?.name || saleData?.clientName || "N/A"}
                <br />
                Total: ${saleData?.total || 0}
                <br />
                Items: {saleData?.items?.length || 0}
                <br />
                CAE: {invoiceData?.cae ? "Sí" : "No"}
              </p>
            </div>
          </div>

          {/* Botones */}
          <div className="flex flex-wrap gap-2">
            {!pdfGenerated ? (
              <Button
                onClick={handleGenerateAndSave}
                disabled={generating || saving}
                className="gap-2"
              >
                {generating || saving ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <FileText className="h-4 w-4" />
                )}
                {generating
                  ? `Generando ${progress}%...`
                  : saving
                    ? "Guardando..."
                    : "Generar PDF"}
              </Button>
            ) : (
              <>
                <Button
                  variant="outline"
                  onClick={handleDownload}
                  className="gap-2"
                >
                  <Download className="h-4 w-4" />
                  Descargar
                </Button>

                {(clientData?.phone || saleData?.clientPhone) && (
                  <Button
                    onClick={handleWhatsapp}
                    className="gap-2 bg-green-500 hover:bg-green-600 text-white"
                  >
                    <Send className="h-4 w-4" />
                    WhatsApp
                  </Button>
                )}

                <Button
                  variant="outline"
                  onClick={handlePrint}
                  className="gap-2"
                >
                  <Printer className="h-4 w-4" />
                  Imprimir
                </Button>

                <div className="flex items-center gap-1 text-green-600 text-sm ml-auto">
                  <Check className="h-4 w-4" />
                  Guardado en Firebase
                </div>
              </>
            )}

            <Button
              variant="ghost"
              onClick={() => onOpenChange(false)}
              className="ml-auto"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
