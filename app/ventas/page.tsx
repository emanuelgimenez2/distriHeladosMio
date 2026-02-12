// app/ventas/page.tsx
"use client";

import { MainLayout } from "@/components/layout/main-layout";
import { useVentas } from "@/hooks/useVentas";
import { ListaVentas } from "@/components/ListaVentas";
import { ModalDetalleVenta } from "@/components/ModalDetalleVenta";
import { ModalEmitirDocumento } from "@/components/ModalEmitirDocumento";
import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";

export default function VentasPage() {
  const searchParams = useSearchParams();
  const saleIdFromUrl = searchParams.get("saleId");
  const [mounted, setMounted] = useState(false);

  const {
    ventasFiltradas,
    cargando,
    filtros,
    actualizarFiltros,
    recargar,
    // Modales
    modalDetalleAbierto,
    ventaSeleccionada,
    abrirDetalle,
    cerrarDetalle,
    abrirDetallePorId,
    // Emitir
    modalEmitirAbierto,
    ventaParaEmitir,
    tipoDocumento,
    emitiendo,
    abrirEmitir,
    cerrarEmitir,
    emitirDocumento,
    setTipoDocumento,
    // Helpers
    descargarPdf,
    construirUrlWhatsapp,
    formatearMoneda,
    formatearFechaHora,
    etiquetaPago,
    claseBadgePago,
  } = useVentas();

  useEffect(() => {
    setMounted(true);
  }, []);

  // Abrir detalle automáticamente si viene saleId en URL
  useEffect(() => {
    if (saleIdFromUrl && !cargando && mounted) {
      abrirDetallePorId(saleIdFromUrl);
    }
  }, [saleIdFromUrl, cargando, abrirDetallePorId, mounted]);

  if (!mounted) {
    return (
      <MainLayout title="Ventas" description="Historial y gestión de ventas">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-muted rounded w-1/4"></div>
          <div className="h-32 bg-muted rounded"></div>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout title="Ventas" description="Historial y gestión de ventas">
      <ListaVentas
        ventas={ventasFiltradas}
        cargando={cargando}
        filtros={filtros}
        onCambiarFiltros={actualizarFiltros}
        onVerDetalle={abrirDetalle}
        onEmitirDocumento={abrirEmitir}
      />

      <ModalDetalleVenta
        abierto={modalDetalleAbierto}
        venta={ventaSeleccionada}
        onCerrar={cerrarDetalle}
        onEmitirBoleta={(venta) => {
          cerrarDetalle();
          // Pequeño delay para evitar problemas de DOM
          setTimeout(() => abrirEmitir(venta), 100);
        }}
        onGenerarRemito={(venta) => {
          cerrarDetalle();
          setTimeout(() => {
            abrirEmitir(venta);
            setTipoDocumento("remito");
          }, 100);
        }}
        onDescargarPdf={descargarPdf}
        onEnviarWhatsapp={construirUrlWhatsapp}
        formatearMoneda={formatearMoneda}
        formatearFechaHora={formatearFechaHora}
        etiquetaPago={etiquetaPago}
        claseBadgePago={claseBadgePago}
      />

      <ModalEmitirDocumento
        abierto={modalEmitirAbierto}
        venta={ventaParaEmitir}
        tipoDocumento={tipoDocumento}
        emitiendo={emitiendo}
        onCerrar={cerrarEmitir}
        onConfirmar={emitirDocumento}
        onCambiarTipo={setTipoDocumento}
        formatearMoneda={formatearMoneda}
      />
    </MainLayout>
  );
}
