"use client";

import { useRef } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Printer, FileText, X } from "lucide-react";
import { BoletaDocument } from "./boleta-document";

interface ModalBoletaProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  invoiceNumber: string;
  invoiceData: any;
  clientData?: any;
  saleData?: any;
}

export function ModalBoleta({
  open,
  onOpenChange,
  invoiceNumber,
  invoiceData,
  clientData,
  saleData,
}: ModalBoletaProps) {
  const boletaRef = useRef<HTMLDivElement>(null);

  const handlePrint = () => {
    const printWindow = window.open("", "_blank");
    if (!printWindow) return;

    const boletaHTML = boletaRef.current?.outerHTML;
    printWindow.document.write(`
      <html>
        <head>
          <title>Boleta ${invoiceNumber}</title>
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
          <DialogTitle>Boleta Electrónica {invoiceNumber}</DialogTitle>
          <DialogDescription>
            Vista previa de la boleta para imprimir
          </DialogDescription>
        </DialogHeader>

        {/* Header Sticky */}
        <div className="flex items-center justify-between px-4 py-3 bg-white border-b shadow-sm shrink-0 sticky top-0 z-10">
          <div className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-primary" />
            <span className="font-semibold">Boleta Electrónica</span>
            <span className="hidden sm:inline text-sm text-muted-foreground ml-2">
              {invoiceNumber}
            </span>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => onOpenChange(false)}
              className="gap-2"
            >
              <X className="h-4 w-4" />
              <span className="hidden sm:inline">Cerrar</span>
            </Button>
            <Button size="sm" onClick={handlePrint} className="gap-2">
              <Printer className="h-4 w-4" />
              <span className="hidden sm:inline">Imprimir</span>
            </Button>
          </div>
        </div>

        {/* Área de visualización con scroll */}
        <div className="flex-1 overflow-auto p-2 sm:p-4 md:p-8 flex justify-center items-start bg-gray-200">
          <div className="w-full max-w-[210mm] mx-auto">
            <div 
              className="bg-white shadow-2xl origin-top"
              style={{
                width: "210mm",
                minHeight: "297mm",
                transform: "scale(var(--scale, 1))",
              }}
            >
              <BoletaDocument
                ref={boletaRef}
                boletaNumber={invoiceNumber}
                date={new Date()}
                clientName={clientData?.name || saleData?.clientName}
                clientCuit={clientData?.cuit}
                clientAddress={clientData?.address}
                clientPhone={saleData?.clientPhone || clientData?.phone}
                clientTaxCategory={clientData?.taxCategory}
                items={saleData?.items?.map((item: any) => ({
                  name: item.name,
                  quantity: item.quantity,
                  price: item.price,
                })) || []}
                total={saleData?.total || 0}
                paymentType={saleData?.paymentType || "cash"}
                cashAmount={saleData?.cashAmount}
                creditAmount={saleData?.creditAmount}
                cae={invoiceData?.cae}
                caeVencimiento={invoiceData?.caeVencimiento}
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