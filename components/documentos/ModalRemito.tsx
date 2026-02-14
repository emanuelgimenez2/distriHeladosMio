"use client";

import { useRef, useState } from "react";
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
  Truck,
  X,
  Download,
  Send,
  Loader2,
  Check,
} from "lucide-react";
import { RemitoDocument } from "@/components/documentos/remito-document";
import { usePdfGenerator } from "@/hooks/usePdfGenerator";
import { savePdfToDatabase } from "@/services/pdf-service";
import { toast } from "sonner";

interface ModalRemitoProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  remitoNumber: string;
  saleData: any;
  saleId: string;
  onPdfGenerated?: () => void;
}

export function ModalRemito({
  open,
  onOpenChange,
  remitoNumber,
  saleData,
  saleId,
  onPdfGenerated,
}: ModalRemitoProps) {
  const remitoRef = useRef<HTMLDivElement>(null);
  const { generatePdf, downloadPdf, shareToWhatsapp, generating, progress } =
    usePdfGenerator();
  const [pdfGenerated, setPdfGenerated] = useState(false);
  const [pdfData, setPdfData] = useState<{
    base64: string;
    blob: Blob;
    url: string;
  } | null>(null);
  const [saving, setSaving] = useState(false);

  const handleGenerateAndSave = async () => {
    if (!remitoRef.current) return;

    try {
      const result = await generatePdf(remitoRef.current, {
        filename: `Remito-${remitoNumber}.pdf`,
        scale: 2,
      });

      setPdfData(result);
      setSaving(true);

      // Guardar en base de datos
      await savePdfToDatabase(saleId, "remito", {
        base64: result.base64,
        filename: `Remito-${remitoNumber}.pdf`,
        contentType: "application/pdf",
        size: result.blob.size,
        generatedAt: new Date().toISOString(),
      });

      setPdfGenerated(true);
      toast.success("Remito guardado correctamente");
      onPdfGenerated?.();
    } catch (error) {
      toast.error("Error al generar el remito");
      console.error(error);
    } finally {
      setSaving(false);
    }
  };

  const handleDownload = () => {
    if (pdfData?.blob) {
      downloadPdf(pdfData.blob, `Remito-${remitoNumber}.pdf`);
      toast.success("Descargando remito...");
    }
  };

  const handleWhatsapp = () => {
    if (!saleData?.clientPhone) {
      toast.error("El cliente no tiene número de teléfono");
      return;
    }

    if (pdfData?.base64) {
      shareToWhatsapp(
        saleData.clientPhone,
        pdfData.base64,
        `Remito-${remitoNumber}.pdf`,
      );
      toast.success("Abriendo WhatsApp...");
    }
  };

  const handlePrint = () => {
    const printWindow = window.open("", "_blank");
    if (!printWindow || !remitoRef.current) return;

    const remitoHTML = remitoRef.current.outerHTML;
    printWindow.document.write(`
      <html>
        <head>
          <title>Remito ${remitoNumber}</title>
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
                window.print();
                window.close();
              }, 100);
            };
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[100vw] w-full h-[100vh] max-h-[100vh] overflow-hidden p-0 border-0 bg-gray-100">
        <DialogHeader className="sr-only">
          <DialogTitle>Remito {remitoNumber}</DialogTitle>
          <DialogDescription>
            Vista previa del remito de entrega
          </DialogDescription>
        </DialogHeader>

        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 bg-white border-b shadow-sm shrink-0 sticky top-0 z-10">
          <div className="flex items-center gap-2">
            <Truck className="h-5 w-5 text-blue-500" />
            <span className="font-semibold">Remito de Entrega</span>
            <span className="hidden sm:inline text-sm text-muted-foreground ml-2">
              {remitoNumber}
            </span>
          </div>

          <div className="flex gap-2">
            {!pdfGenerated ? (
              <Button
                size="sm"
                onClick={handleGenerateAndSave}
                disabled={generating || saving}
                className="gap-2 bg-blue-500 hover:bg-blue-600"
              >
                {generating || saving ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Truck className="h-4 w-4" />
                )}
                <span className="hidden sm:inline">
                  {generating
                    ? `Generando ${progress}%...`
                    : saving
                      ? "Guardando..."
                      : "Generar Remito"}
                </span>
              </Button>
            ) : (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleDownload}
                  className="gap-2"
                >
                  <Download className="h-4 w-4" />
                  <span className="hidden sm:inline">Descargar</span>
                </Button>

                {saleData?.clientPhone && (
                  <Button
                    size="sm"
                    onClick={handleWhatsapp}
                    className="gap-2 bg-green-500 hover:bg-green-600 text-white border-0"
                  >
                    <Send className="h-4 w-4" />
                    <span className="hidden sm:inline">WhatsApp</span>
                  </Button>
                )}

                <Button
                  variant="outline"
                  size="sm"
                  onClick={handlePrint}
                  className="gap-2"
                >
                  <Printer className="h-4 w-4" />
                  <span className="hidden sm:inline">Imprimir</span>
                </Button>
              </>
            )}

            <Button
              variant="ghost"
              size="sm"
              onClick={() => onOpenChange(false)}
              className="gap-2"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Área de visualización */}
        <div className="flex-1 overflow-auto p-2 sm:p-4 md:p-8 flex justify-center items-start bg-gray-200">
          <div className="w-full max-w-[210mm] mx-auto">
            <div
              className="bg-white shadow-2xl origin-top relative"
              style={{
                width: "210mm",
                minHeight: "297mm",
                transform: "scale(var(--scale, 1))",
              }}
            >
              {pdfGenerated && (
                <div className="absolute top-4 right-4 bg-blue-500 text-white px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1 z-10 shadow-lg">
                  <Check className="h-3 w-3" />
                  Guardado
                </div>
              )}

              <RemitoDocument
                ref={remitoRef}
                remitoNumber={remitoNumber}
                date={new Date()}
                saleId={saleId}
                clientName={saleData?.clientName}
                clientAddress={
                  saleData?.deliveryAddress || saleData?.clientAddress
                }
                clientPhone={saleData?.clientPhone}
                sellerName={saleData?.sellerName}
                items={
                  saleData?.items?.map((item: any) => ({
                    name: item.name,
                    quantity: item.quantity,
                    price: item.price,
                  })) || []
                }
                total={saleData?.total || 0}
                notes={saleData?.deliveryNotes}
              />
            </div>
          </div>
        </div>

        {/* CSS responsive */}
        <style jsx global>{`
          @media (max-width: 640px) {
            .flex-1.overflow-auto > div > div {
              --scale: 0.4;
            }
          }
          @media (min-width: 641px) and (max-width: 1024px) {
            .flex-1.overflow-auto > div > div {
              --scale: 0.7;
            }
          }
          @media (min-width: 1025px) {
            .flex-1.overflow-auto > div > div {
              --scale: 1;
            }
          }
        `}</style>
      </DialogContent>
    </Dialog>
  );
}
