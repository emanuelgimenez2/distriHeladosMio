import { doc, updateDoc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { toast } from "sonner";

export interface PdfData {
  base64: string;
  filename: string;
  contentType: string;
  size: number;
  generatedAt: string;
}

/**
 * Guarda el PDF en base64 directamente en Firestore.
 * NO usa compresión porque puede corromper el PDF.
 * 
 * Firestore tiene un límite de 1MB por campo, así que:
 * - PDFs pequeños (<900KB en base64) se guardan directamente
 * - PDFs grandes se deberían guardar en Firebase Storage (no implementado)
 */
export const savePdfToDatabase = async (
  saleId: string,
  type: "invoice" | "remito",
  pdfData: PdfData
): Promise<void> => {
  console.log(`💾 Guardando PDF ${type} para venta ${saleId}`);
  console.log(`📊 Tamaño base64: ${pdfData.base64.length} caracteres (~${Math.ceil(pdfData.base64.length / 1024)}KB)`);
  console.log(`🔍 Primeros 100 caracteres del base64 a guardar: ${pdfData.base64.substring(0, 100)}`);
  console.log(`🔍 Últimos 20 caracteres del base64 a guardar: ${pdfData.base64.substring(pdfData.base64.length - 20)}`);

  // Validar que sea base64 válido ANTES de guardar
  const base64Regex = /^[A-Za-z0-9+/]*={0,2}$/;
  if (!base64Regex.test(pdfData.base64)) {
    console.error("❌ El base64 a guardar contiene caracteres inválidos");
    throw new Error("El base64 contiene caracteres inválidos y no se puede guardar");
  }

  // ADVERTENCIA: Firestore tiene límite de 1MB por documento
  // Base64 aumenta el tamaño ~33%, entonces un PDF de 750KB → ~1MB en base64
  const MAX_BASE64_SIZE = 900000; // ~900KB en base64 = ~675KB de PDF

  if (pdfData.base64.length > MAX_BASE64_SIZE) {
    console.warn(`⚠️ PDF muy grande (${Math.ceil(pdfData.base64.length / 1024)}KB en base64)`);
    console.warn("⚠️ Considera usar Firebase Storage en lugar de Realtime Database");
    // Por ahora, intentaremos guardarlo igual (puede fallar)
  }

  const updateData: Record<string, any> =
    type === "invoice"
      ? {
          invoicePdfBase64: pdfData.base64,
          invoicePdfGeneratedAt: pdfData.generatedAt,
          invoiceFilename: pdfData.filename,
          invoicePdfSize: pdfData.size,
        }
      : {
          remitoPdfBase64: pdfData.base64,
          remitoPdfGeneratedAt: pdfData.generatedAt,
          remitoFilename: pdfData.filename,
          remitoPdfSize: pdfData.size,
        };

  try {
    const docRef = doc(db, "ventas", saleId);
    await updateDoc(docRef, updateData);
    console.log("✅ PDF guardado en Firestore correctamente");
    
    // Verificar que se guardó correctamente leyendo de vuelta
    const verificacion = await getDoc(docRef);
    if (verificacion.exists()) {
      const data = verificacion.data();
      const base64Guardado = type === "invoice" ? data.invoicePdfBase64 : data.remitoPdfBase64;
      console.log(`🔍 Verificando PDF guardado: ${base64Guardado ? 'EXISTE' : 'NO EXISTE'}`);
      if (base64Guardado) {
        console.log(`🔍 Longitud guardada: ${base64Guardado.length} caracteres`);
        console.log(`🔍 Primeros 100 caracteres guardados: ${base64Guardado.substring(0, 100)}`);
        
        // Verificar que sean idénticos
        if (base64Guardado === pdfData.base64) {
          console.log("✅ Base64 guardado es IDÉNTICO al original");
        } else {
          console.error("❌ Base64 guardado es DIFERENTE al original");
          console.error(`   Original: ${pdfData.base64.length} chars`);
          console.error(`   Guardado: ${base64Guardado.length} chars`);
        }
      }
    }
  } catch (error: any) {
    console.error("❌ Error guardando PDF en Firestore:", error);
    
    // Si el error es por tamaño, dar un mensaje más claro
    if (error.code === "invalid-argument" || error.message?.includes("too large")) {
      throw new Error(
        `El PDF es demasiado grande para Firestore (${Math.ceil(pdfData.base64.length / 1024)}KB). ` +
        "Necesitas implementar Firebase Storage para PDFs grandes."
      );
    }
    
    throw error;
  }
};

/**
 * Convierte base64 a Blob para descargas.
 * Valida que el base64 sea válido antes de convertir.
 */
export const base64ToBlob = (
  base64: string,
  contentType: string = "application/pdf"
): Blob => {
  try {
    // Validar que sea base64 válido
    if (!base64 || base64.length === 0) {
      throw new Error("El base64 está vacío");
    }

    console.log(`🔍 Base64 recibido, longitud: ${base64.length} caracteres`);
    console.log(`🔍 Primeros 50 caracteres: ${base64.substring(0, 50)}`);

    // Limpiar el base64 (por si tiene el prefijo data:application/pdf;base64,)
    let cleanBase64 = base64.replace(/^data:.*?;base64,/, "");
    
    // Limpiar espacios en blanco y saltos de línea que podrían corromper el base64
    cleanBase64 = cleanBase64.replace(/\s/g, '');
    
    console.log(`🔍 Base64 limpio, longitud: ${cleanBase64.length} caracteres`);
    console.log(`🔍 Primeros 50 caracteres limpios: ${cleanBase64.substring(0, 50)}`);

    // Validar que sea base64 válido (solo caracteres permitidos)
    const base64Regex = /^[A-Za-z0-9+/]*={0,2}$/;
    if (!base64Regex.test(cleanBase64)) {
      console.error("❌ Base64 contiene caracteres inválidos");
      throw new Error("Base64 contiene caracteres inválidos");
    }

    // Decodificar base64
    const byteCharacters = atob(cleanBase64);
    const byteNumbers = new Array(byteCharacters.length);
    
    for (let i = 0; i < byteCharacters.length; i++) {
      byteNumbers[i] = byteCharacters.charCodeAt(i);
    }
    
    const byteArray = new Uint8Array(byteNumbers);
    const blob = new Blob([byteArray], { type: contentType });

    console.log(`✅ Blob creado correctamente, tamaño: ${blob.size} bytes`);
    
    // Validar que el blob sea un PDF válido
    const reader = new FileReader();
    reader.onloadend = () => {
      const arr = new Uint8Array(reader.result as ArrayBuffer).subarray(0, 4);
      const header = String.fromCharCode.apply(null, Array.from(arr));
      if (!header.startsWith('%PDF')) {
        console.error("⚠️ El blob no parece ser un PDF válido");
      } else {
        console.log("✅ PDF validado correctamente");
      }
    };
    reader.readAsArrayBuffer(blob.slice(0, 4));
    
    return blob;
  } catch (error: any) {
    console.error("❌ Error al convertir base64 a blob:", error);
    console.error("❌ Stack:", error.stack);
    throw new Error(`El formato del PDF es inválido: ${error.message}`);
  }
};

/**
 * Descarga un PDF desde su base64.
 * Crea un blob y dispara la descarga.
 */
export const downloadBase64Pdf = (base64: string, filename: string) => {
  try {
    console.log(`⬇️ Descargando PDF: ${filename}`);
    
    const blob = base64ToBlob(base64);
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    // Liberar memoria
    URL.revokeObjectURL(url);
    
    console.log("✅ Descarga iniciada correctamente");
  } catch (error: any) {
    console.error("❌ Error descargando PDF:", error);
    toast.error("No se pudo descargar el PDF: " + (error.message || "error desconocido"));
  }
};

/**
 * Valida que un base64 corresponda a un PDF válido.
 * Verifica la firma del archivo PDF (%PDF).
 */
export const validatePdfBase64 = (base64: string): boolean => {
  try {
    const cleanBase64 = base64.replace(/^data:.*?;base64,/, "");
    const binaryString = atob(cleanBase64);
    
    // Los PDFs empiezan con %PDF-
    const pdfSignature = "%PDF-";
    const fileStart = binaryString.substring(0, 5);
    
    if (fileStart !== pdfSignature) {
      console.error("❌ El archivo no es un PDF válido (firma incorrecta)");
      return false;
    }
    
    console.log("✅ PDF validado correctamente");
    return true;
  } catch (error) {
    console.error("❌ Error validando PDF:", error);
    return false;
  }
};