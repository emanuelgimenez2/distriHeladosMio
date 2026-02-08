// lib/afip.ts
import Afip from "@afipsdk/afip.js";

// Configuración con Access Token (modo desarrollo con CUIT de prueba)
export const afip = new Afip({
  CUIT: parseInt(process.env.AFIP_CUIT || "20409378472"),
  access_token: process.env.AFIP_ACCESS_TOKEN || "",
});

// Tipos de comprobantes AFIP
export const COMPROBANTES = {
  FACTURA_A: 1,
  FACTURA_B: 6,
  FACTURA_C: 11,
  NOTA_DEBITO_A: 2,
  NOTA_CREDITO_A: 3,
} as const;

// Tipos de documentos
export const TIPOS_DOCUMENTO = {
  CUIT: 80,
  CUIL: 86,
  DNI: 96,
  CONSUMIDOR_FINAL: 99,
} as const;

// Tipos de concepto
export const CONCEPTOS = {
  PRODUCTOS: 1,
  SERVICIOS: 2,
  PRODUCTOS_Y_SERVICIOS: 3,
} as const;

// Condiciones IVA (para el EMISOR)
export const CONDICIONES_IVA = {
  IVA_RESPONSABLE_INSCRIPTO: 1,
  IVA_SUJETO_EXENTO: 4,
  CONSUMIDOR_FINAL: 5,
  MONOTRIBUTO: 6,
} as const;

export interface AfipInvoiceData {
  puntoVenta: number;
  tipoComprobante: number;
  numeroComprobante?: number;
  fechaComprobante: string;
  concepto: number;
  tipoDocumento: number;
  numeroDocumento: number;
  importeTotal: number;
  importeNeto: number;
  importeIVA: number;
  importeExento?: number;
  CondicionIVAReceptor?: number;
  items?: Array<{
    descripcion: string;
    cantidad: number;
    precioUnitario: number;
  }>;
}

export interface AfipInvoiceResult {
  cae: string;
  caeVencimiento: string;
  numeroComprobante: number;
  puntoVenta: number;
  tipoComprobante: number;
  fechaComprobante: string;
  resultado: string;
}

/**
 * Obtiene el código de condición de IVA para el receptor según taxCategory
 */
export function getCondicionIvaReceptor(taxCategory?: string): number {
  const condiciones: Record<string, number> = {
    responsable_inscripto: 1, // IVA Responsable Inscripto
    responsable_no_inscripto: 2, // IVA Responsable no Inscripto
    no_responsable: 3, // IVA no Responsable
    exento: 4, // IVA Sujeto Exento
    consumidor_final: 5, // Consumidor Final
    monotributo: 6, // Responsable Monotributo
    no_categorizado: 7, // Sujeto no Categorizado
    proveedor_exterior: 8, // Proveedor del Exterior
    cliente_exterior: 9, // Cliente del Exterior
    iva_liberado: 10, // IVA Liberado
    agente_percepcion: 11, // Agente de Percepción
    pequeno_contribuyente: 12, // Pequeño Contribuyente Eventual
    monotributo_social: 13, // Monotributista Social
    pequeno_contribuyente_social: 14, // Pequeño Contribuyente Eventual Social
  };

  // Si no hay categoría o no está en el mapa, usar Consumidor Final (5)
  const codigo = condiciones[taxCategory || ""];
  return codigo || 5; // Por defecto: Consumidor Final
}

/**
 * Obtener etiqueta legible para condición IVA
 */
export function getCondicionIvaLabel(codigo: number): string {
  const etiquetas: Record<number, string> = {
    1: "IVA Responsable Inscripto",
    2: "IVA Responsable no Inscripto",
    3: "IVA no Responsable",
    4: "IVA Sujeto Exento",
    5: "Consumidor Final",
    6: "Responsable Monotributo",
    7: "Sujeto no Categorizado",
    8: "Proveedor del Exterior",
    9: "Cliente del Exterior",
    10: "IVA Liberado",
    11: "Agente de Percepción",
    12: "Pequeño Contribuyente Eventual",
    13: "Monotributista Social",
    14: "Pequeño Contribuyente Eventual Social",
  };

  return etiquetas[codigo] || "Consumidor Final";
}

/**
 * Emitir comprobante electrónico en AFIP
 */
export async function emitirComprobante(
  data: AfipInvoiceData,
): Promise<AfipInvoiceResult> {
  try {
    console.log("🚀 [AFIP] Iniciando emisión de comprobante...");
    console.log(
      "🚀 [AFIP] Access Token presente:",
      !!process.env.AFIP_ACCESS_TOKEN,
    );
    console.log("🚀 [AFIP] CUIT configurado:", process.env.AFIP_CUIT);
    console.log("🚀 [AFIP] Condición IVA receptor:", data.condicionIVA);

    // En modo desarrollo (no producción), podemos simular respuesta
    // En modo desarrollo (no producción), podemos simular respuesta
    if (
      process.env.AFIP_PRODUCTION === "false" ||
      !process.env.AFIP_ACCESS_TOKEN
    ) {
      console.log("🔄 [AFIP] Modo desarrollo - Simulando respuesta AFIP");
      return {
        CAE: "12345678901234",
        CAEFchVto: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000)
          .toISOString()
          .split("T")[0],
        cbteDesde: 17485, // ← Esta línea
        puntoVenta: data.puntoVenta,
        tipoComprobante: data.tipoComprobante,
        fechaComprobante: data.fechaComprobante,
        Resultado: "A",
      };
    }

    // Obtener último número de comprobante
    console.log("📡 [AFIP] Consultando último comprobante...");
    const ultimoComprobante = await afip.ElectronicBilling.getLastVoucher(
      data.puntoVenta,
      data.tipoComprobante,
    );
    console.log("📡 [AFIP] Último comprobante:", ultimoComprobante);

    const numeroComprobante = ultimoComprobante + 1;
    console.log("📡 [AFIP] Nuevo número de comprobante:", numeroComprobante);

    // Preparar datos del comprobante
    const comprobanteData: any = {
      CantReg: 1,
      PtoVta: data.puntoVenta,
      CbteTipo: data.tipoComprobante,
      Concepto: data.concepto,
      DocTipo: data.tipoDocumento,
      DocNro: data.numeroDocumento,
      CbteDesde: numeroComprobante,
      CbteHasta: numeroComprobante,
      CbteFch: parseInt(data.fechaComprobante.replace(/-/g, "")),
      ImpTotal: data.importeTotal,
      ImpTotConc: 0,
      ImpNeto: data.importeNeto,
      ImpOpEx: data.importeExento || 0,
      ImpIVA: data.importeIVA,
      ImpTrib: 0,
      MonId: "PES",
      MonCotiz: 1,
      // AQUÍ ESTÁ LA CLAVE: CondicionIVAReceptor es OBLIGATORIO desde 2024
      CondicionIVAReceptor: data.CondicionIVAReceptor || 5, // Por defecto: Consumidor Final
    };

    console.log("📊 [AFIP] Datos preparados:", {
      CondicionIVAReceptor: comprobanteData.CondicionIVAReceptor,
      etiqueta: getCondicionIvaLabel(comprobanteData.CondicionIVAReceptor),
    });

    // Si hay IVA, agregar detalle
    if (data.importeIVA > 0) {
      comprobanteData.Iva = [
        {
          Id: 5, // IVA 21%
          BaseImp: data.importeNeto,
          Importe: data.importeIVA,
        },
      ];
    }

    console.log(
      "📤 [AFIP] Enviando comprobante:",
      JSON.stringify(comprobanteData, null, 2),
    );
    // Crear comprobante en AFIP
    const response =
      await afip.ElectronicBilling.createVoucher(comprobanteData);

    console.log(
      "✅ [AFIP] Respuesta recibida:",
      JSON.stringify(response, null, 2),
    );

    return {
      CAE: response.CAE,
      CAEFchVto: response.CAEFchVto,
      cbteDesde: numeroComprobante,
      puntoVenta: data.puntoVenta,
      tipoComprobante: data.tipoComprobante,
      fechaComprobante: data.fechaComprobante,
      resultado: response.Resultado,
    };
  } catch (error: any) {
    console.error("❌ [AFIP] Error completo:", error);

    // Detalles específicos de error AFIP
    if (error.response?.data?.Errors) {
      console.error(
        "❌ [AFIP] Errores detallados:",
        JSON.stringify(error.response.data.Errors, null, 2),
      );
    }

    if (error.response?.data?.Observaciones) {
      console.error(
        "❌ [AFIP] Observaciones:",
        JSON.stringify(error.response.data.Observaciones, null, 2),
      );
    }

    // Mensaje de error más específico
    const errorMsg =
      error.response?.data?.Errors?.[0]?.Msg ||
      error.response?.data?.message ||
      error.message ||
      "Error al comunicarse con AFIP";

    console.error("❌ [AFIP] Error mensaje:", errorMsg);

    throw new Error(`[AFIP] ${errorMsg}`);
  }
}

/**
 * Obtener información del punto de venta
 */
export async function getPuntoVentaInfo(puntoVenta: number) {
  try {
    const info = await afip.ElectronicBilling.getVoucherTypes();
    return info;
  } catch (error) {
    console.error("Error obteniendo info punto venta:", error);
    return null;
  }
}

/**
 * Verificar estado del servidor AFIP
 */
export async function checkAfipStatus() {
  try {
    const serverStatus = await afip.ElectronicBilling.getServerStatus();
    const authStatus = await afip.ElectronicBilling.getAuthStatus();

    return {
      server: serverStatus,
      auth: authStatus,
      cuit: process.env.AFIP_CUIT,
      hasToken: !!process.env.AFIP_ACCESS_TOKEN,
      production: process.env.AFIP_PRODUCTION === "true",
    };
  } catch (error) {
    console.error("Error verificando estado AFIP:", error);
    throw error;
  }
}

// Exportar todas las funciones y constantes
export {
  afip,
  COMPROBANTES,
  CONCEPTOS,
  TIPOS_DOCUMENTO,
  CONDICIONES_IVA,
  getCondicionIvaReceptor,
  getCondicionIvaLabel,
  emitirComprobante,
  getPuntoVentaInfo,
  checkAfipStatus,
};
