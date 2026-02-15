"use client";

import { useState, useEffect, useCallback } from "react";
import {
  collection,
  query,
  orderBy,
  getDocs,
  doc,
  getDoc,
  updateDoc,
  serverTimestamp,
  where,
  limit,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { savePdfToDatabase, downloadBase64Pdf } from "@/services/pdf-service";
import { toast } from "sonner";
import { getAuth } from "firebase/auth";

// Tipos
export interface VentaItem {
  name: string;
  quantity: number;
  price: number;
}

export interface Venta {
  id: string;
  clientId?: string;
  clientName?: string;
  clientPhone?: string;
  clientAddress?: string;
  clientCuit?: string;
  clientTaxCategory?: string;
  items: VentaItem[];
  total: number;
  paymentType: "cash" | "credit" | "mixed";
  cashAmount?: number;
  creditAmount?: number;
  createdAt: any;
  invoiceNumber?: string;
  invoiceEmitted?: boolean;
  afipData?: {
    cae?: string;
    caeVencimiento?: string;
    tipoComprobante?: number;
    puntoVenta?: number;
    numeroComprobante?: number;
  };
  remitoNumber?: string;
  remitoPdfBase64?: string;
  invoicePdfBase64?: string;
  sellerName?: string;
  saleNumber?: number;
  deliveryAddress?: string;
  clientData?: {
    name?: string;
    phone?: string;
    cuit?: string;
    address?: string;
    taxCategory?: string;
  };
}

interface FiltrosVentas {
  busqueda: string;
  fechaDesde: string;
  fechaHasta: string;
  tipoPago: string;
}

// Funciones seguras de formato
const safeFormatDate = (date: any): string => {
  if (!date) return "-";
  try {
    let d: Date;
    if (date?.toDate) d = date.toDate();
    else if (typeof date === "string") d = new Date(date);
    else if (typeof date === "number") d = new Date(date);
    else if (date instanceof Date) d = date;
    else if (date?.seconds) d = new Date(date.seconds * 1000);
    else return "-";
    if (isNaN(d.getTime())) return "-";
    return d.toLocaleDateString("es-AR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  } catch {
    return "-";
  }
};

const safeFormatDateTime = (date: any): string => {
  if (!date) return "-";
  try {
    let d: Date;
    if (date?.toDate) d = date.toDate();
    else if (typeof date === "string") d = new Date(date);
    else if (typeof date === "number") d = new Date(date);
    else if (date instanceof Date) d = date;
    else if (date?.seconds) d = new Date(date.seconds * 1000);
    else return "-";
    if (isNaN(d.getTime())) return "-";
    return d.toLocaleString("es-AR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return "-";
  }
};

const safeGetDate = (date: any): Date | null => {
  if (!date) return null;
  try {
    let d: Date;
    if (date?.toDate) d = date.toDate();
    else if (typeof date === "string") d = new Date(date);
    else if (typeof date === "number") d = new Date(date);
    else if (date instanceof Date) d = date;
    else if (date?.seconds) d = new Date(date.seconds * 1000);
    else return null;
    return isNaN(d.getTime()) ? null : d;
  } catch {
    return null;
  }
};

export function useVentas() {
  const [ventas, setVentas] = useState<Venta[]>([]);
  const [cargando, setCargando] = useState(true);
  const [filtros, setFiltros] = useState<FiltrosVentas>({
    busqueda: "",
    fechaDesde: "",
    fechaHasta: "",
    tipoPago: "todos",
  });

  const [modalDetalleAbierto, setModalDetalleAbierto] = useState(false);
  const [ventaSeleccionada, setVentaSeleccionada] = useState<Venta | null>(
    null,
  );
  const [modalEmitirAbierto, setModalEmitirAbierto] = useState(false);
  const [ventaParaEmitir, setVentaParaEmitir] = useState<Venta | null>(null);
  const [tipoDocumento, setTipoDocumento] = useState<"boleta" | "remito">(
    "boleta",
  );
  const [emitiendo, setEmitiendo] = useState(false);

  // Cargar ventas
  const cargarVentas = useCallback(async () => {
    try {
      setCargando(true);
      const q = query(collection(db, "ventas"), orderBy("createdAt", "desc"));
      const snapshot = await getDocs(q);
      const ventasData = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as Venta[];
      setVentas(ventasData);
    } catch (error) {
      console.error("Error cargando ventas:", error);
      toast.error("Error al cargar ventas");
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => {
    cargarVentas();
  }, [cargarVentas]);

  // Filtrado
  const ventasFiltradas = ventas.filter((venta) => {
    const coincideBusqueda =
      !filtros.busqueda ||
      venta.clientName
        ?.toLowerCase()
        .includes(filtros.busqueda.toLowerCase()) ||
      venta.id.toLowerCase().includes(filtros.busqueda.toLowerCase()) ||
      venta.invoiceNumber?.includes(filtros.busqueda);

    let coincideFechaDesde = true;
    let coincideFechaHasta = true;

    if (filtros.fechaDesde) {
      const ventaDate = safeGetDate(venta.createdAt);
      const desdeDate = new Date(filtros.fechaDesde);
      coincideFechaDesde = ventaDate ? ventaDate >= desdeDate : false;
    }

    if (filtros.fechaHasta) {
      const ventaDate = safeGetDate(venta.createdAt);
      const hastaDate = new Date(filtros.fechaHasta);
      hastaDate.setHours(23, 59, 59, 999);
      coincideFechaHasta = ventaDate ? ventaDate <= hastaDate : false;
    }

    const coincideTipoPago =
      filtros.tipoPago === "todos" || venta.paymentType === filtros.tipoPago;

    return (
      coincideBusqueda &&
      coincideFechaDesde &&
      coincideFechaHasta &&
      coincideTipoPago
    );
  });

  const actualizarFiltros = (nuevosFiltros: Partial<FiltrosVentas>) => {
    setFiltros((prev) => ({ ...prev, ...nuevosFiltros }));
  };

  // Modales
  const abrirDetalle = (venta: Venta) => {
    setVentaSeleccionada(venta);
    setModalDetalleAbierto(true);
  };

  const cerrarDetalle = () => {
    setModalDetalleAbierto(false);
    setVentaSeleccionada(null);
  };

  const abrirDetallePorId = useCallback(async (saleId: string) => {
    try {
      const docRef = doc(db, "ventas", saleId);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        const venta = { id: docSnap.id, ...docSnap.data() } as Venta;
        abrirDetalle(venta);
      }
    } catch (error) {
      console.error("Error abriendo detalle:", error);
    }
  }, []);

  const abrirEmitir = (venta: Venta, tipo: "boleta" | "remito" = "boleta") => {
    setVentaParaEmitir(venta);
    setTipoDocumento(tipo);
    setModalEmitirAbierto(true);
  };

  const cerrarEmitir = () => {
    setModalEmitirAbierto(false);
    setVentaParaEmitir(null);
    setEmitiendo(false);
  };

  // ==================== GENERACIÓN DE PDF ====================
  const generarPdfCompleto = async (
    venta: Venta,
    tipo: "boleta" | "remito",
    afipData?: any,
  ): Promise<string> => {
    console.log(`📄 Generando PDF ${tipo} para venta ${venta.id}`);

    try {
      // Construir el HTML completo del documento
      const htmlContent =
        tipo === "boleta"
          ? generarHtmlBoleta(venta, afipData)
          : generarHtmlRemito(venta);

      console.log(
        `📄 HTML generado, longitud: ${htmlContent.length} caracteres`,
      );

      // Llamar a la API que usa Puppeteer (server-side)
      const response = await fetch("/api/generate-pdf", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          html: htmlContent,
          filename:
            tipo === "boleta"
              ? `boleta-${venta.invoiceNumber || venta.id}.pdf`
              : `remito-${venta.remitoNumber || venta.id}.pdf`,
        }),
      });

      if (!response.ok) {
        const errorData = await response
          .json()
          .catch(() => ({ error: "Error desconocido" }));
        throw new Error(errorData.error || `Error HTTP ${response.status}`);
      }

      const data = await response.json();

      if (!data.pdf) {
        throw new Error("La API no devolvió el PDF");
      }

      console.log(
        `✅ PDF ${tipo} generado correctamente, tamaño: ${data.pdf.length} caracteres`,
      );
      console.log(
        `🔍 Primeros 100 caracteres del base64: ${data.pdf.substring(0, 100)}`,
      );
      console.log(
        `🔍 Últimos 20 caracteres del base64: ${data.pdf.substring(data.pdf.length - 20)}`,
      );

      // Validar que sea base64 válido antes de devolverlo
      const base64Regex = /^[A-Za-z0-9+/]*={0,2}$/;
      if (!base64Regex.test(data.pdf)) {
        console.error("❌ El PDF recibido no es base64 válido");
        console.error("🔍 Caracteres inválidos encontrados");
        throw new Error("El PDF recibido de la API no es base64 válido");
      }

      return data.pdf; // Base64 string
    } catch (error: any) {
      console.error(`❌ Error generando PDF ${tipo}:`, error);
      throw new Error(`Error al generar PDF: ${error.message}`);
    }
  };

  // Función para generar HTML de boleta
  const generarHtmlBoleta = (venta: Venta, afipData?: any): string => {
    const isElectronica = !!afipData?.cae;
    const items = venta.items || [];

    const formatCurrency = (amount: number) =>
      new Intl.NumberFormat("es-AR", {
        style: "currency",
        currency: "ARS",
        minimumFractionDigits: 2,
      }).format(amount || 0);

    const getTaxCategoryLabel = (category?: string) => {
      const categories: Record<string, string> = {
        responsable_inscripto: "Responsable Inscripto",
        monotributo: "Monotributo",
        consumidor_final: "Consumidor Final",
        exento: "Exento",
        no_responsable: "No Responsable",
      };
      return categories[category || ""] || "Consumidor Final";
    };

    const getPaymentTypeLabel = (type: string) => {
      const types: Record<string, string> = {
        cash: "Contado",
        credit: "Cuenta Corriente",
        mixed: "Contado y Cuenta Corriente",
      };
      return types[type] || type;
    };

    const pv = venta.invoiceNumber?.split("-")[0] || "0001";
    const nro = venta.invoiceNumber?.split("-")[1] || "00000000";

    const itemsHtml = items
      .map(
        (item) => `
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
      venta.paymentType === "mixed"
        ? `
      <div style="border-top: 1px dashed #000000; padding-top: 8px; margin-top: 8px; font-size: 12px;">
        <div style="display: flex; justify-content: space-between;">
          <span>Efectivo:</span>
          <span>${formatCurrency(venta.cashAmount || 0)}</span>
        </div>
        <div style="display: flex; justify-content: space-between;">
          <span>A Cuenta:</span>
          <span>${formatCurrency(venta.creditAmount || 0)}</span>
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
              <strong>CAE N:</strong> ${afipData.cae || "N/A"}<br>
              <strong>Fecha de Vto. de CAE:</strong> ${afipData.caeVencimiento ? safeFormatDate(afipData.caeVencimiento) : "-"}
            </p>
          </div>
          <div style="display: flex; justify-content: flex-end;">
            <div class="qr-box">
              ${afipData.cae ? `<img src="https://api.qrserver.com/v1/create-qr-code/?size=100x100&data=CAE:${afipData.cae}" alt="QR" style="width: 100%; height: 100%;">` : "QR AFIP"}
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
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: monospace;
      font-size: 11px;
      line-height: 1.4;
      color: black;
      background: white;
      padding: 10mm;
      width: 210mm;
      min-height: 297mm;
    }
    .border-box { border: 2px solid black; margin-bottom: 16px; }
    .grid-3 { display: grid; grid-template-columns: repeat(3, 1fr); }
    .grid-2 { display: grid; grid-template-columns: repeat(2, 1fr); gap: 16px; }
    .border-r { border-right: 2px solid black; }
    .p-4 { padding: 16px; }
    .text-center { text-align: center; }
    .text-right { text-align: right; }
    .doc-type-box {
      border: 2px solid black;
      width: 64px;
      height: 64px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 32px;
      font-weight: bold;
      margin: 0 auto 8px;
    }
    table { width: 100%; border-collapse: collapse; table-layout: fixed; }
    th, td { padding: 8px; border: 1px solid black; }
    thead { background: #f0f0f0; }
    th { font-weight: bold; text-align: left; }
    .qr-box {
      border: 2px solid black;
      width: 96px;
      height: 96px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 10px;
    }
    .totals-box { width: 256px; margin-left: auto; }
  </style>
</head>
<body>
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
          Punto de Venta: ${pv}<br>
          Comp. Nro: ${nro}
        </p>
        <p style="font-size: 9px; line-height: 1.6;">
          Fecha de Emision: ${safeFormatDate(venta.createdAt)}<br>
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
        <p><strong>CUIT:</strong> ${venta.clientCuit || venta.clientData?.cuit || "00-00000000-0"}</p>
        <p><strong>Condicion frente al IVA:</strong> ${getTaxCategoryLabel(venta.clientTaxCategory || venta.clientData?.taxCategory)}</p>
      </div>
      <div>
        <p><strong>Apellido y Nombre / Razon Social:</strong></p>
        <p>${venta.clientName || venta.clientData?.name || "Consumidor Final"}</p>
      </div>
    </div>
    <div class="grid-2" style="margin-top: 8px;">
      <p><strong>Domicilio:</strong> ${venta.clientAddress || venta.clientData?.address || "-"}</p>
      <p><strong>Condicion de venta:</strong> ${getPaymentTypeLabel(venta.paymentType)}</p>
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
        <span>${formatCurrency(venta.total / 1.21)}</span>
      </div>
      <div style="display: flex; justify-content: space-between; margin-bottom: 4px;">
        <span>IVA 21%:</span>
        <span>${formatCurrency(venta.total - venta.total / 1.21)}</span>
      </div>
      <div style="display: flex; justify-content: space-between; font-weight: bold; font-size: 18px; border-top: 1px solid #000; padding-top: 8px;">
        <span>TOTAL:</span>
        <span>${formatCurrency(venta.total)}</span>
      </div>
      ${mixedPaymentHtml}
    </div>
  </div>

  ${electronicHtml}

  <div style="margin-top: 16px; text-align: center; font-size: 9px; color: #6b7280;">
    ${footerHtml}
  </div>
</body>
</html>
    `;
  };

  // Función para generar HTML de remito
  const generarHtmlRemito = (venta: Venta): string => {
    const formatCurrency = (amount: number) =>
      new Intl.NumberFormat("es-AR", {
        style: "currency",
        currency: "ARS",
        minimumFractionDigits: 0,
      }).format(amount || 0);

    const formatTime = (date: any) => {
      if (!date) return "--:--";
      try {
        let d: Date;
        if (date?.toDate) d = date.toDate();
        else if (typeof date === "string") d = new Date(date);
        else if (typeof date === "number") d = new Date(date);
        else if (date instanceof Date) d = date;
        else if (date?.seconds) d = new Date(date.seconds * 1000);
        else return "--:--";
        return isNaN(d.getTime())
          ? "--:--"
          : d.toLocaleTimeString("es-AR", {
              hour: "2-digit",
              minute: "2-digit",
            });
      } catch {
        return "--:--";
      }
    };

    const remitoNumber =
      venta.remitoNumber || `R-${new Date().getFullYear()}-00001`;

    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: system-ui, sans-serif;
      background: white;
      padding: 32px;
      width: 210mm;
      min-height: 297mm;
    }
    .header { border-bottom: 2px solid black; padding-bottom: 16px; margin-bottom: 24px; }
    .company { font-size: 24px; font-weight: bold; }
    .remito-number { font-size: 20px; text-align: right; }
    .info-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 16px; margin-bottom: 24px; }
    .info-box { border: 1px solid #ccc; padding: 12px; border-radius: 4px; }
    table { width: 100%; border-collapse: collapse; margin-bottom: 24px; }
    th, td { padding: 12px; border: 1px solid black; text-align: left; }
    th { background: #f0f0f0; font-weight: bold; }
    .footer { border-top: 2px solid black; padding-top: 16px; text-align: center; color: #666; }
  </style>
</head>
<body>
  <div class="header">
    <div style="display: flex; justify-content: space-between; align-items: center;">
      <div class="company">HELADOS MIO</div>
      <div class="remito-number">REMITO N° ${remitoNumber}</div>
    </div>
  </div>

  <div class="info-grid">
    <div class="info-box">
      <strong>Cliente:</strong><br>
      ${venta.clientName || "Cliente"}<br>
      ${venta.clientPhone || ""}
    </div>
    <div class="info-box">
      <strong>Fecha:</strong> ${safeFormatDate(venta.createdAt)}<br>
      <strong>Hora:</strong> ${formatTime(venta.createdAt)}
    </div>
  </div>

  <div class="info-box" style="margin-bottom: 24px;">
    <strong>Dirección de entrega:</strong><br>
    ${venta.deliveryAddress || venta.clientAddress || venta.clientData?.address || "-"}
  </div>

  <table>
    <thead>
      <tr>
        <th style="width: 80px;">Cantidad</th>
        <th>Producto</th>
        <th style="width: 120px; text-align: right;">Precio Unit.</th>
        <th style="width: 120px; text-align: right;">Subtotal</th>
      </tr>
    </thead>
    <tbody>
      ${venta.items
        .map(
          (item) => `
        <tr>
          <td style="text-align: center;">${item.quantity}</td>
          <td>${item.name}</td>
          <td style="text-align: right;">${formatCurrency(item.price)}</td>
          <td style="text-align: right;">${formatCurrency(item.price * item.quantity)}</td>
        </tr>
      `,
        )
        .join("")}
    </tbody>
    <tfoot>
      <tr>
        <td colspan="3" style="text-align: right; font-weight: bold;">TOTAL:</td>
        <td style="text-align: right; font-weight: bold; font-size: 16px;">${formatCurrency(venta.total)}</td>
      </tr>
    </tfoot>
  </table>

  <div class="footer">
    <p>Comprobante de entrega de mercadería</p>
    <p>HELADOS MIO S.R.L. - CUIT: 30-12345678-9</p>
  </div>
</body>
</html>
    `;
  };

  // ==================== EMITIR DOCUMENTO ====================
  const emitirDocumento = async () => {
    if (!ventaParaEmitir) return;
    setEmitiendo(true);
    const toastId = `generar-${tipoDocumento}`;
    toast.loading(`Generando ${tipoDocumento}...`, { id: toastId });

    try {
      const auth = getAuth();
      const user = auth.currentUser;
      if (!user) throw new Error("Usuario no autenticado");
      const token = await user.getIdToken();

      // hooks/useVentas.ts - línea 257 aproximadamente
      if (tipoDocumento === "boleta") {
        // 1. Emitir en AFIP
        const afipResponse = await fetch("/api/ventas/emitir", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            saleId: ventaParaEmitir.id,
            client: {
              name:
                ventaParaEmitir.clientData?.name || ventaParaEmitir.clientName,
              phone:
                ventaParaEmitir.clientData?.phone ||
                ventaParaEmitir.clientPhone,
              cuit:
                ventaParaEmitir.clientData?.cuit || ventaParaEmitir.clientCuit,
              address:
                ventaParaEmitir.clientData?.address ||
                ventaParaEmitir.clientAddress,
              taxCategory:
                ventaParaEmitir.clientData?.taxCategory ||
                ventaParaEmitir.clientTaxCategory ||
                "consumidor_final",
            },
            emitirAfip: true,
          }),
        });

        if (!afipResponse.ok) {
          let errorText = "";
          try {
            errorText = await afipResponse.text();
          } catch {
            errorText = "Error desconocido";
          }
          throw new Error(
            `Error en AFIP (${afipResponse.status}): ${errorText.substring(0, 200)}`,
          );
        }

        const afipResult = await afipResponse.json();
        const { invoiceNumber, afipData } = afipResult;

        // 2. Generar PDF con los datos de AFIP
        const pdfBase64 = await generarPdfCompleto(
          { ...ventaParaEmitir, invoiceNumber },
          "boleta",
          afipData,
        );

        // 3. Guardar en Firestore
        const ventaRef = doc(db, "ventas", ventaParaEmitir.id);
        await updateDoc(ventaRef, {
          invoicePdfBase64: pdfBase64,
          invoiceNumber,
          invoiceEmitted: true,
          invoiceStatus: "emitted",
          afipData,
          invoiceGeneratedAt: serverTimestamp(),
        });

        // 4. Guardar metadata del PDF
        await savePdfToDatabase(ventaParaEmitir.id, "invoice", {
          base64: pdfBase64,
          filename: `boleta-${invoiceNumber}.pdf`,
          contentType: "application/pdf",
          size: Math.ceil((pdfBase64.length * 3) / 4),
          generatedAt: new Date().toISOString(),
        });

        // 5. Descargar
        downloadBase64Pdf(pdfBase64, `boleta-${invoiceNumber}.pdf`);
        toast.success("Boleta emitida correctamente", { id: toastId });
      } else if (tipoDocumento === "remito") {
        // 1. Generar número de remito
        const remitosQuery = query(
          collection(db, "ventas"),
          where("remitoNumber", "!=", null),
          orderBy("remitoNumber", "desc"),
          limit(1),
        );
        const remitosSnapshot = await getDocs(remitosQuery);
        let ultimoNumero = 0;
        if (!remitosSnapshot.empty) {
          const lastRemito = remitosSnapshot.docs[0].data().remitoNumber;
          const match = lastRemito?.match(/R-\d+-(\d+)/);
          if (match) ultimoNumero = parseInt(match[1], 10);
        }
        const remitoNumber = `R-${new Date().getFullYear()}-${String(ultimoNumero + 1).padStart(5, "0")}`;

        // 2. Generar PDF
        const pdfBase64 = await generarPdfCompleto(
          { ...ventaParaEmitir, remitoNumber },
          "remito",
        );

        // 3. Guardar en Firestore
        const ventaRef = doc(db, "ventas", ventaParaEmitir.id);
        await updateDoc(ventaRef, {
          remitoPdfBase64: pdfBase64,
          remitoNumber,
          remitoGeneratedAt: serverTimestamp(),
        });

        // 4. Guardar metadata del PDF
        await savePdfToDatabase(ventaParaEmitir.id, "remito", {
          base64: pdfBase64,
          filename: `remito-${remitoNumber}.pdf`,
          contentType: "application/pdf",
          size: Math.ceil((pdfBase64.length * 3) / 4),
          generatedAt: new Date().toISOString(),
        });

        // 5. Descargar
        downloadBase64Pdf(pdfBase64, `remito-${remitoNumber}.pdf`);
        toast.success("Remito generado correctamente", { id: toastId });
      }

      await cargarVentas();
      cerrarEmitir();
    } catch (error: any) {
      console.error("Error emitiendo documento:", error);
      toast.error(`Error: ${error.message}`, { id: toastId });
    } finally {
      setEmitiendo(false);
    }
  };

  // Descargar PDF existente
  const descargarPdf = (venta: Venta, tipo: "boleta" | "remito" = "boleta") => {
    const base64 =
      tipo === "boleta" ? venta.invoicePdfBase64 : venta.remitoPdfBase64;
    if (base64) {
      const filename =
        tipo === "boleta"
          ? `boleta-${venta.invoiceNumber || venta.id}.pdf`
          : `remito-${venta.remitoNumber}.pdf`;
      downloadBase64Pdf(base64, filename);
    } else {
      toast.error("El PDF no está disponible. Genérelo primero.");
    }
  };

  const construirUrlWhatsapp = (venta: Venta) => {
    if (!venta.clientPhone) return null;
    const telefono = venta.clientPhone.replace(/\D/g, "");
    const formattedPhone = telefono.startsWith("54")
      ? telefono
      : `54${telefono}`;

    // Crear mensaje con instrucciones para descargar el PDF
    const tieneFactura = venta.invoiceEmitted && venta.invoicePdfBase64;
    const tieneRemito = venta.remitoNumber && venta.remitoPdfBase64;

    let mensaje = `Hola ${venta.clientName || ""},\n\n`;

    if (tieneFactura) {
      mensaje += `Tu factura N° ${venta.invoiceNumber} está lista.\n`;
      mensaje += `Total: $${venta.total.toLocaleString("es-AR")}\n\n`;
    }

    if (tieneRemito) {
      mensaje += `Tu remito N° ${venta.remitoNumber} está listo.\n\n`;
    }

    mensaje += `Para descargar el comprobante, haz clic en el siguiente enlace:\n`;
    mensaje += `${window.location.origin}/ventas?saleId=${venta.id}`;

    return `https://wa.me/${formattedPhone}?text=${encodeURIComponent(mensaje)}`;
  };

  const enviarPorWhatsapp = async (
    venta: Venta,
    tipo: "boleta" | "remito" = "boleta",
  ) => {
    const base64 =
      tipo === "boleta" ? venta.invoicePdfBase64 : venta.remitoPdfBase64;
    const phone = venta.clientPhone;

    if (!base64) {
      toast.error("El PDF no está disponible");
      return;
    }

    if (!phone) {
      toast.error("El cliente no tiene teléfono");
      return;
    }

    try {
      const filename =
        tipo === "boleta"
          ? `Factura-${venta.invoiceNumber || venta.id}.pdf`
          : `Remito-${venta.remitoNumber || venta.id}.pdf`;

      // Limpiar base64 y crear blob
      const cleanBase64 = base64.replace(/\s/g, "");
      const byteCharacters = atob(cleanBase64);
      const byteNumbers = new Array(byteCharacters.length);
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
      }
      const byteArray = new Uint8Array(byteNumbers);
      const blob = new Blob([byteArray], { type: "application/pdf" });

      const cleanPhone = phone.replace(/\D/g, "");
      const formattedPhone = cleanPhone.startsWith("54")
        ? cleanPhone
        : `54${cleanPhone}`;

      // MÓVIL: Intentar compartir nativo
      if (navigator.share) {
        try {
          const file = new File([blob], filename, { type: "application/pdf" });

          if (navigator.canShare && navigator.canShare({ files: [file] })) {
            await navigator.share({
              files: [file],
              title: filename,
              text:
                tipo === "boleta"
                  ? `Factura N° ${venta.invoiceNumber} - Total: $${venta.total.toLocaleString("es-AR")}`
                  : `Remito N° ${venta.remitoNumber}`,
            });
            toast.success("Archivo compartido");
            return;
          }
        } catch (shareError) {
          console.log(
            "Compartir nativo no disponible, usando método alternativo",
          );
        }
      }

      // DESKTOP/FALLBACK: Descargar + abrir WhatsApp con instrucciones
      console.log("💻 Descargando PDF y abriendo WhatsApp");

      // 1. Descargar el PDF
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      // 2. Abrir WhatsApp con mensaje
      const mensaje =
        tipo === "boleta"
          ? `Hola ${venta.clientName || ""}! 👋\n\nTe descargué la *Factura N° ${venta.invoiceNumber}*\nTotal: $${venta.total.toLocaleString("es-AR")}\n\n📎 Adjuntá el archivo PDF que se descargó automáticamente.`
          : `Hola ${venta.clientName || ""}! 👋\n\nTe descargué el *Remito N° ${venta.remitoNumber}*\n\n📎 Adjuntá el archivo PDF que se descargó automáticamente.`;

      window.open(
        `https://wa.me/${formattedPhone}?text=${encodeURIComponent(mensaje)}`,
        "_blank",
      );

      toast.success("PDF descargado. Adjuntalo manualmente en WhatsApp.", {
        duration: 5000,
      });
    } catch (error: any) {
      console.error("❌ Error enviando por WhatsApp:", error);
      toast.error("Error: " + error.message);
    }
  };

  const formatearMoneda = (monto: number) => {
    return new Intl.NumberFormat("es-AR", {
      style: "currency",
      currency: "ARS",
    }).format(monto || 0);
  };

  const formatearFechaHora = (fecha: any) => safeFormatDateTime(fecha);

  const etiquetaPago = (tipo: string) => {
    const etiquetas: Record<string, string> = {
      cash: "Contado",
      credit: "Cuenta Corriente",
      mixed: "Mixto",
    };
    return etiquetas[tipo] || tipo;
  };

  const claseBadgePago = (tipo: string) => {
    const clases: Record<string, string> = {
      cash: "bg-green-100 text-green-800",
      credit: "bg-blue-100 text-blue-800",
      mixed: "bg-purple-100 text-purple-800",
    };
    return clases[tipo] || "bg-gray-100 text-gray-800";
  };

  return {
    ventas,
    ventasFiltradas,
    cargando,
    filtros,
    actualizarFiltros,
    recargar: cargarVentas,
    modalDetalleAbierto,
    ventaSeleccionada,
    abrirDetalle,
    cerrarDetalle,
    abrirDetallePorId,
    modalEmitirAbierto,
    ventaParaEmitir,
    tipoDocumento,
    emitiendo,
    abrirEmitir,
    cerrarEmitir,
    emitirDocumento,
    setTipoDocumento,
    descargarPdf,
    construirUrlWhatsapp,
    enviarPorWhatsapp,
    formatearMoneda,
    formatearFechaHora,
    etiquetaPago,
    claseBadgePago,
  };
}
