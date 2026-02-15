// lib/afip.ts
import Afip from "@afipsdk/afip.js";

// Configuración con Access Token
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
  cbteDesde: number;
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
    responsable_inscripto: 1,
    responsable_no_inscripto: 2,
    no_responsable: 3,
    exento: 4,
    consumidor_final: 5,
    monotributo: 6,
    no_categorizado: 7,
    proveedor_exterior: 8,
    cliente_exterior: 9,
    iva_liberado: 10,
    agente_percepcion: 11,
    pequeno_contribuyente: 12,
    monotributo_social: 13,
    pequeno_contribuyente_social: 14,
  };

  return condiciones[taxCategory || ""] || 5;
}

/**
 * Emitir comprobante electrónico en AFIP
 */
export async function emitirComprobante(
  data: AfipInvoiceData,
): Promise<AfipInvoiceResult> {
  try {
    console.log("🚀 [AFIP] Iniciando emisión de comprobante...");
    console.log("🔍 [AFIP] Datos recibidos:", {
      puntoVenta: data.puntoVenta,
      tipoComprobante: data.tipoComprobante,
      importeTotal: data.importeTotal,
    });

    // En modo desarrollo O si no hay access token, simular respuesta
    const isProduction = process.env.NODE_ENV === "production";
    const hasAccessToken = !!process.env.AFIP_ACCESS_TOKEN;

    if (!isProduction || !hasAccessToken) {
      console.log("⚠️ [AFIP] Modo DESARROLLO - Generando CAE simulado");
      
      const caeSimulado = "74123456789012"; // 14 dígitos
      const fechaVencimiento = new Date();
      fechaVencimiento.setDate(fechaVencimiento.getDate() + 10); // Vence en 10 días
      const caeVencimiento = fechaVencimiento.toISOString().split("T")[0]; // YYYY-MM-DD

      const resultado: AfipInvoiceResult = {
        cae: caeSimulado,
        caeVencimiento: caeVencimiento,
        cbteDesde: 17485, // Número de comprobante simulado
        puntoVenta: data.puntoVenta,
        tipoComprobante: data.tipoComprobante,
        fechaComprobante: data.fechaComprobante,
        resultado: "A", // Aprobado
      };

      console.log("✅ [AFIP] CAE simulado generado:", resultado);
      return resultado;
    }

    // Modo PRODUCCIÓN - Lógica real con AFIP SDK
    console.log("🔵 [AFIP] Modo PRODUCCIÓN - Consultando AFIP real");

    const ultimoComprobante = await afip.ElectronicBilling.getLastVoucher(
      data.puntoVenta,
      data.tipoComprobante,
    );
    const numeroComprobante = ultimoComprobante + 1;

    console.log(`📋 [AFIP] Último comprobante: ${ultimoComprobante}, nuevo: ${numeroComprobante}`);

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
    }

    if (data.importeIVA > 0) {
      comprobanteData.Iva = [
        {
          Id: 5, // IVA 21%
          BaseImp: data.importeNeto,
          Importe: data.importeIVA,
        },
      ];
    }

    console.log("📡 [AFIP] Enviando comprobante a AFIP...");
    const response = await afip.ElectronicBilling.createVoucher(comprobanteData);

    console.log("✅ [AFIP] Respuesta de AFIP recibida");

    const resultado: AfipInvoiceResult = {
      cae: response.CAE,
      caeVencimiento: response.CAEFchVto,
      cbteDesde: numeroComprobante,
      puntoVenta: data.puntoVenta,
      tipoComprobante: data.tipoComprobante,
      fechaComprobante: data.fechaComprobante,
      resultado: response.Resultado,
    };

    console.log("✅ [AFIP] Comprobante emitido exitosamente:", {
      cae: resultado.cae,
      numero: numeroComprobante,
    });

    return resultado;
  } catch (error: any) {
    console.error("❌ [AFIP] Error:", error);
    const errorMsg =
      error.response?.data?.Errors?.[0]?.Msg ||
      error.response?.data?.message ||
      error.message ||
      "Error al comunicarse con AFIP";
    throw new Error(`[AFIP] ${errorMsg}`);
  }
}