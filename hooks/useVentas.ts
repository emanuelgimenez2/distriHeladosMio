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
import { generarPdfCliente } from "@/hooks/useGenerarPdf";
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
      // ✅ Genera el PDF directamente en el cliente
      // SIN llamar a /api/generate-pdf
      // SIN necesitar Chromium
      const pdfBase64 = await generarPdfCliente(venta, tipo, afipData);

      console.log(
        `✅ PDF ${tipo} generado correctamente, tamaño: ${pdfBase64.length} caracteres`,
      );
      return pdfBase64;
    } catch (error: any) {
      console.error(`❌ Error generando PDF ${tipo}:`, error);
      throw new Error(`Error al generar PDF: ${error.message}`);
    }
  };

  // ==================== EMITIR DOCUMENTO ====================
  // hooks/useVentas.ts - Reemplaza la función emitirDocumento completa
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

      if (tipoDocumento === "boleta") {
        // Obtener datos del cliente desde Firestore si existe clientId
        let taxCategory =
          ventaParaEmitir.clientTaxCategory || "consumidor_final";
        let clientName = ventaParaEmitir.clientName || "Cliente";
        let clientCuit = ventaParaEmitir.clientCuit || "";
        let clientPhone = ventaParaEmitir.clientPhone || "";
        let clientAddress = ventaParaEmitir.clientAddress || "";

        if (ventaParaEmitir.clientId) {
          try {
            const clientRef = doc(db, "clientes", ventaParaEmitir.clientId);
            const clientSnap = await getDoc(clientRef);
            if (clientSnap.exists()) {
              const clientData = clientSnap.data();
              taxCategory = clientData.taxCategory || taxCategory;
              clientName = clientData.name || clientName;
              clientCuit = clientData.cuit || clientCuit;
              clientPhone = clientData.phone || clientPhone;
              clientAddress = clientData.address || clientAddress;
            }
          } catch (error) {
            console.warn("No se pudo obtener datos del cliente:", error);
          }
        }

        console.log("📋 Datos del cliente para AFIP:", {
          name: clientName,
          taxCategory,
          cuit: clientCuit,
        });

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
              name: clientName,
              phone: clientPhone,
              cuit: clientCuit,
              address: clientAddress,
              taxCategory: taxCategory,
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
