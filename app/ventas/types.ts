"use client";

import type { Sale, Client } from "@/lib/types";

// Tipos extendidos para ventas con detalles de pago mixto
export interface Venta extends Sale {
  saleNumber?: number;
  cashAmount?: number;
  creditAmount?: number;
}

// Tipos de pago
export type TipoPago = "cash" | "credit" | "mixed";

// Estado de boleta
export type EstadoBoleta = "all" | "emitted" | "pending";

// Filtros de ventas
export interface FiltrosVentas {
  searchQuery: string;
  invoiceFilter: EstadoBoleta;
  paymentFilter: "all" | TipoPago;
  periodFilter: "today" | "week" | "month";
}

// Props para modales
export interface ModalDetalleProps {
  abierto: boolean;
  venta: Venta | null;
  onCerrar: () => void;
  onEmitirBoleta: (venta: Venta) => void;
  onGenerarRemito: (venta: Venta) => void;
  onDescargarPdf: (url: string, nombre: string) => void;
  onEnviarWhatsapp: (phone?: string, pdfUrl?: string, clientName?: string) => string | null;
}

export interface ModalEmitirProps {
  abierto: boolean;
  venta: Venta | null;
  tipoDocumento: "invoice" | "remito";
  emitiendo: boolean;
  onCerrar: () => void;
  onConfirmar: () => void;
  onCambiarTipo: (tipo: "invoice" | "remito") => void;
}

// Props para lista de ventas
export interface ListaVentasProps {
  ventas: Venta[];
  cargando: boolean;
  filtros: FiltrosVentas;
  onCambiarFiltros: (filtros: Partial<FiltrosVentas>) => void;
  onVerDetalle: (venta: Venta) => void;
  onEmitirDocumento: (venta: Venta) => void;
}