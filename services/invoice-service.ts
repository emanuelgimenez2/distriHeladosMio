// services/invoice-service.ts
import { getAuthToken } from "@/services/auth-service";

export interface InvoiceClient {
  name?: string;
  phone?: string;
  email?: string;
  taxCategory?: string;
  cuit?: string;
  dni?: string;
}

export interface InvoiceResult {
  invoiceNumber: string;
  pdfUrl: string;
  whatsappUrl?: string;
  mock?: boolean;
  saleId?: string;
  afipData?: {
    cae: string;
    caeVencimiento: string;
    tipoComprobante: number;
  };
}

export const createInvoice = async (payload: {
  saleId: string;
  client?: InvoiceClient;
}): Promise<InvoiceResult> => {
  const token = await getAuthToken();

  console.log("🚀 Enviando a /api/facturacion:", payload);
  console.log("🔑 Token obtenido en cliente:", token ? `Sí (${token.substring(0, 20)}...)` : "No");

  const response = await fetch("/api/facturacion", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(payload),
  });

  console.log("📡 Response status:", response.status);

  if (!response.ok) {
    let errorMessage = "Error generando la factura";
    
    try {
      // Primero intentamos obtener el texto crudo
      const errorText = await response.text();
      console.error("❌ Raw error response text:", errorText);
      
      // Verificamos si es JSON válido
      if (errorText && errorText.trim() !== '') {
        try {
          const error = JSON.parse(errorText);
          console.error("❌ Parsed error response:", error);
          errorMessage = error?.message || 
                         error?.error || 
                         error?.errorMsg || 
                         errorText;
        } catch (parseError) {
          // Si no es JSON, usamos el texto crudo
          console.error("❌ Response is not JSON, using raw text");
          errorMessage = errorText || `Error ${response.status}: ${response.statusText}`;
        }
      } else {
        // Respuesta vacía
        console.error("❌ Empty response body");
        errorMessage = `Error ${response.status}: ${response.statusText || "Respuesta vacía del servidor"}`;
      }
    } catch (e) {
      console.error("❌ Error al procesar la respuesta:", e);
      errorMessage = `Error ${response.status}: No se pudo leer la respuesta del servidor`;
    }
    
    throw new Error(errorMessage);
  }

  const data = await response.json();
  console.log("✅ Factura creada exitosamente:", data);
  return data;
};

export const createRemito = async (payload: { saleId: string }) => {
  const token = await getAuthToken();
  const response = await fetch("/api/remitos", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    let errorMessage = "Error generando el remito";
    try {
      const errorText = await response.text();
      if (errorText) {
        try {
          const error = JSON.parse(errorText);
          errorMessage = error?.message || error?.error || errorText;
        } catch {
          errorMessage = errorText;
        }
      } else {
        errorMessage = `Error ${response.status}: ${response.statusText}`;
      }
    } catch {
      errorMessage = `Error ${response.status}: No se pudo leer la respuesta`;
    }
    throw new Error(errorMessage);
  }

  return response.json() as Promise<{
    remitoNumber: string;
    pdfUrl: string;
  }>;
};