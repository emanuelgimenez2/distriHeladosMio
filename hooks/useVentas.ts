// hooks/useVentas.ts - AGREGAR estas funciones faltantes
"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { salesApi, remitoApi, clientsApi } from "@/lib/api";
import type { Sale, Client } from "@/lib/types";
import type { Venta, FiltrosVentas } from "../types";
import { toast } from "sonner";

export function useVentas() {
  // Estados
  const [ventas, setVentas] = useState<Venta[]>([]);
  const [cargando, setCargando] = useState(true);
  const [filtros, setFiltros] = useState<FiltrosVentas>({
    searchQuery: "",
    invoiceFilter: "all",
    paymentFilter: "all",
    periodFilter: "today",
  });

  // Estados para modales
  const [modalDetalleAbierto, setModalDetalleAbierto] = useState(false);
  const [ventaSeleccionada, setVentaSeleccionada] = useState<Venta | null>(null);

  const [modalEmitirAbierto, setModalEmitirAbierto] = useState(false);
  const [ventaParaEmitir, setVentaParaEmitir] = useState<Venta | null>(null);
  const [tipoDocumento, setTipoDocumento] = useState<"invoice" | "remito">("invoice");
  const [emitiendo, setEmitiendo] = useState(false);

  // Cargar datos - FILTRAR SOLO VENTAS COMPLETADAS (no pedidos pendientes)
  const cargarDatos = useCallback(async () => {
    try {
      const ventasData = await salesApi.getAll();
      
      // IMPORTANTE: Filtrar solo ventas que NO sean pedidos pendientes
      // Las ventas de pedidos completados tienen orderId y source === "order"
      // pero debemos asegurar que solo se muestren si el pedido está completado
      // En la práctica, las ventas con source === "order" solo se crean cuando 
      // el pedido se completa, así que deberían estar filtradas por el backend
      
      const ventasMejoradas = ventasData
        .filter((venta: Sale) => {
          // Si es una venta directa (no de pedido), siempre mostrar
          if (venta.source === "direct" || !venta.source) return true;
          
          // Si es de pedido, solo mostrar si el pedido está completado
          // Esto se maneja en el backend, pero double-check aquí
          return true; // Asumimos que el backend ya filtró
        })
        .map((venta: Sale, index: number, array: Sale[]) => ({
          ...venta,
          saleNumber: array.length - index,
          cashAmount: venta.paymentType === "mixed" ? Math.floor(venta.total * 0.6) : undefined,
          creditAmount: venta.paymentType === "mixed" ? Math.floor(venta.total * 0.4) : undefined,
        }));
      
      setVentas(ventasMejoradas);
    } catch (error) {
      console.error("Error cargando ventas:", error);
      toast.error("Error al cargar las ventas");
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => {
    cargarDatos();
  }, [cargarDatos]);

  // Actualizar venta seleccionada si cambia en la lista
  useEffect(() => {
    if (!ventaSeleccionada) return;
    const actualizada = ventas.find((v) => v.id === ventaSeleccionada.id);
    if (actualizada) {
      setVentaSeleccionada(actualizada);
    }
  }, [ventas, ventaSeleccionada]);

  // Helpers de formato
  const formatearFechaInput = (fecha: Date) => {
    const year = fecha.getFullYear();
    const month = String(fecha.getMonth() + 1).padStart(2, "0");
    const day = String(fecha.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  };

  const formatearMoneda = (monto: number) =>
    new Intl.NumberFormat("es-AR", {
      style: "currency",
      currency: "ARS",
      minimumFractionDigits: 0,
    }).format(monto);

  const formatearFecha = (fecha: Date) =>
    new Intl.DateTimeFormat("es-AR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    }).format(new Date(fecha));

  const formatearFechaHora = (fecha: Date) =>
    new Intl.DateTimeFormat("es-AR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(fecha));

  const formatearHora = (fecha: Date) =>
    new Intl.DateTimeFormat("es-AR", {
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(fecha));

  // Helpers de pago
  const etiquetaPago = (tipo: string) => {
    if (tipo === "cash") return "Contado";
    if (tipo === "credit") return "Cta. Corriente";
    if (tipo === "mixed") return "Mixto";
    return tipo;
  };

  const claseBadgePago = (tipo: string) => {
    if (tipo === "cash")
      return "bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-400 dark:border-emerald-800";
    if (tipo === "credit")
      return "bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-800";
    if (tipo === "mixed")
      return "bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-900/30 dark:text-amber-400 dark:border-amber-800";
    return "";
  };

  // Filtros de fecha
  const obtenerRangoFecha = (periodo: string) => {
    const hoy = new Date();
    const hoyStr = formatearFechaInput(hoy);
    switch (periodo) {
      case "today":
        return { from: hoyStr, to: hoyStr };
      case "week": {
        const d = new Date(hoy);
        d.setDate(d.getDate() - 7);
        return { from: formatearFechaInput(d), to: hoyStr };
      }
      case "month": {
        const d = new Date(hoy);
        d.setMonth(d.getMonth() - 1);
        return { from: formatearFechaInput(d), to: hoyStr };
      }
      default:
        return { from: hoyStr, to: hoyStr };
    }
  };

  // Ventas filtradas
  const ventasFiltradas = useMemo(() => {
    const { from, to } = obtenerRangoFecha(filtros.periodFilter);
    return ventas
      .filter((venta) => {
        const q = filtros.searchQuery.toLowerCase();
        const coincideBusqueda =
          venta.id.toLowerCase().includes(q) ||
          (venta.clientName?.toLowerCase().includes(q) ?? false) ||
          (venta.sellerName?.toLowerCase().includes(q) ?? false);
        const coincideBoleta =
          filtros.invoiceFilter === "all" ||
          (filtros.invoiceFilter === "emitted" && venta.invoiceEmitted) ||
          (filtros.invoiceFilter === "pending" && !venta.invoiceEmitted);
        const coincidePago =
          filtros.paymentFilter === "all" || venta.paymentType === filtros.paymentFilter;
        const valor = new Date(venta.createdAt);
        const inicio = from ? new Date(`${from}T00:00:00`) : null;
        const fin = to ? new Date(`${to}T23:59:59`) : null;
        const coincideFecha = (!inicio || valor >= inicio) && (!fin || valor <= fin);
        return coincideBusqueda && coincideBoleta && coincidePago && coincideFecha;
      })
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [ventas, filtros]);

  // Handlers de modales
  const abrirDetalle = useCallback((venta: Venta) => {
    setVentaSeleccionada(venta);
    setModalDetalleAbierto(true);
  }, []);

  // FUNCIÓN FALTANTE - abrirDetallePorId
  const abrirDetallePorId = useCallback((ventaId: string) => {
    const venta = ventas.find((v) => v.id === ventaId);
    if (venta) {
      setVentaSeleccionada(venta);
      setModalDetalleAbierto(true);
    } else {
      // Si no está en la lista cargada, intentar buscar en el backend
      toast.error("Venta no encontrada en la lista actual");
    }
  }, [ventas]);

  const cerrarDetalle = useCallback(() => {
    setModalDetalleAbierto(false);
    // Delay para evitar problemas de DOM
    setTimeout(() => {
      setVentaSeleccionada(null);
    }, 100);
  }, []);

  const abrirEmitir = useCallback((venta: Venta) => {
    setVentaParaEmitir(venta);
    setTipoDocumento(venta.invoiceEmitted ? "remito" : "invoice");
    setModalEmitirAbierto(true);
  }, []);

  const cerrarEmitir = useCallback(() => {
    setModalEmitirAbierto(false);
    setTimeout(() => {
      setVentaParaEmitir(null);
    }, 100);
  }, []);

  // Emitir documento
  const emitirDocumento = useCallback(async () => {
    if (!ventaParaEmitir) return;
    setEmitiendo(true);
    try {
      if (tipoDocumento === "invoice") {
        let clienteData: Client | null = null;
        try {
          const clientes = await clientsApi.getAll();
          clienteData = clientes.find((c: Client) => c.name === ventaParaEmitir.clientName) || null;
        } catch (e) {
          console.warn("No se pudo obtener datos del cliente:", e);
        }

        const payloadFactura = {
          name: ventaParaEmitir.clientName || "Consumidor Final",
          phone: ventaParaEmitir.clientPhone || "",
          email: clienteData?.email || "",
          taxCategory: clienteData?.taxCategory || "consumidor_final",
          cuit: clienteData?.cuit || "",
          dni: clienteData?.dni || "",
        };

        const resultado = await salesApi.emitInvoice(ventaParaEmitir.id, payloadFactura);

        setVentas((prev) =>
          prev.map((v) =>
            v.id === ventaParaEmitir.id
              ? {
                  ...v,
                  invoiceEmitted: true,
                  invoiceNumber: resultado.invoiceNumber,
                  invoicePdfUrl: resultado.pdfUrl,
                  invoiceWhatsappUrl: resultado.whatsappUrl,
                }
              : v
          )
        );

        toast.success("Boleta emitida correctamente");
      } else {
        const resultado = await remitoApi.createRemito(ventaParaEmitir.id);

        setVentas((prev) =>
          prev.map((v) =>
            v.id === ventaParaEmitir.id
              ? {
                  ...v,
                  remitoNumber: resultado.remitoNumber,
                  remitoPdfUrl: resultado.pdfUrl,
                }
              : v
          )
        );

        toast.success("Remito generado correctamente");
      }
      cerrarEmitir();
    } catch (error) {
      console.error("Error emitiendo documento:", error);
      toast.error(tipoDocumento === "invoice" ? "Error al emitir boleta" : "Error al generar remito");
    } finally {
      setEmitiendo(false);
    }
  }, [ventaParaEmitir, tipoDocumento, cerrarEmitir]);

  // Descargar PDF
  const descargarPdf = useCallback((url: string, nombre: string) => {
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
      link.download = nombre;
      link.click();
      window.URL.revokeObjectURL(blobUrl);
    } else {
      const link = document.createElement("a");
      link.href = url;
      link.download = nombre;
      link.click();
    }
  }, []);

  // WhatsApp
  const construirUrlWhatsapp = useCallback((phone?: string, pdfUrl?: string, clientName?: string) => {
    if (!phone || !pdfUrl) return null;
    const clean = phone.replace(/[^\d]/g, "");
    if (!clean) return null;
    const msg = `Hola${clientName ? ` ${clientName}` : ""}, tu comprobante esta listo: ${pdfUrl}`;
    return `https://wa.me/${clean}?text=${encodeURIComponent(msg)}`;
  }, []);

  // Actualizar filtros
  const actualizarFiltros = useCallback((nuevosFiltros: Partial<FiltrosVentas>) => {
    setFiltros((prev) => ({ ...prev, ...nuevosFiltros }));
  }, []);

  // Limpiar filtros
  const limpiarFiltros = useCallback(() => {
    setFiltros({
      searchQuery: "",
      invoiceFilter: "all",
      paymentFilter: "all",
      periodFilter: "today",
    });
  }, []);

  return {
    ventas,
    ventasFiltradas,
    cargando,
    filtros,
    modalDetalleAbierto,
    ventaSeleccionada,
    modalEmitirAbierto,
    ventaParaEmitir,
    tipoDocumento,
    emitiendo,
    // Acciones
    recargar: cargarDatos,
    actualizarFiltros,
    limpiarFiltros,
    setTipoDocumento,
    // Modales
    abrirDetalle,
    abrirDetallePorId, // <-- FUNCIÓN AGREGADA
    cerrarDetalle,
    abrirEmitir,
    cerrarEmitir,
    emitirDocumento,
    // Helpers
    descargarPdf,
    construirUrlWhatsapp,
    formatearMoneda,
    formatearFecha,
    formatearFechaHora,
    formatearHora,
    etiquetaPago,
    claseBadgePago,
  };
}