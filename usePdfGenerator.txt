"use client";

import { useState, useCallback } from "react";

interface PdfResult {
  base64: string;
  blob: Blob;
  url: string;
}

/**
 * Hook para generar PDFs usando la API server-side.
 * Usa Puppeteer en el backend para máxima compatibilidad.
 */
export function usePdfGenerator() {
  const [generating, setGenerating] = useState(false);
  const [progress, setProgress] = useState(0);

  const generatePdf = useCallback(
    async (htmlContent: string, filename: string): Promise<PdfResult> => {
      setGenerating(true);
      setProgress(10);

      try {
        console.log("📄 Enviando HTML a API para generar PDF...");
        console.log(`📊 Tamaño HTML: ${htmlContent.length} caracteres`);

        const response = await fetch("/api/generate-pdf", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            html: htmlContent,
            filename,
          }),
        });

        setProgress(60);

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({
            error: "Error desconocido",
          }));
          console.error("❌ Error en respuesta API:", errorData);
          throw new Error(errorData.error || `Error HTTP ${response.status}`);
        }

        const data = await response.json();
        
        if (!data.pdf) {
          throw new Error("La API no devolvió el PDF");
        }

        console.log("✅ PDF recibido de API");
        console.log(`📊 Tamaño base64: ${data.pdf.length} caracteres`);

        setProgress(80);

        // Convertir base64 a blob
        const byteCharacters = atob(data.pdf);
        const byteNumbers = new Array(byteCharacters.length);
        for (let i = 0; i < byteCharacters.length; i++) {
          byteNumbers[i] = byteCharacters.charCodeAt(i);
        }
        const byteArray = new Uint8Array(byteNumbers);
        const blob = new Blob([byteArray], { type: "application/pdf" });

        console.log(`✅ Blob creado, tamaño: ${blob.size} bytes`);

        const url = URL.createObjectURL(blob);
        setProgress(100);

        return {
          base64: data.pdf,
          blob,
          url,
        };
      } catch (error) {
        console.error("❌ Error en generatePdf:", error);
        throw error;
      } finally {
        setTimeout(() => {
          setGenerating(false);
          setProgress(0);
        }, 500);
      }
    },
    []
  );

  const downloadPdf = useCallback((blob: Blob, filename: string) => {
    console.log("⬇️ Descargando PDF:", filename);
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }, []);

  const shareToWhatsapp = useCallback(
    (phone: string, base64Pdf: string, filename: string) => {
      console.log("📱 Compartiendo por WhatsApp:", phone);
      const cleanPhone = phone.replace(/\D/g, "");
      const formattedPhone = cleanPhone.startsWith("54")
        ? cleanPhone
        : `54${cleanPhone}`;

      // Crear blob para descargar
      const byteCharacters = atob(base64Pdf);
      const byteNumbers = new Array(byteCharacters.length);
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
      }
      const byteArray = new Uint8Array(byteNumbers);
      const blob = new Blob([byteArray], { type: "application/pdf" });

      // Intentar compartir nativo (móviles)
      const file = new File([blob], filename, { type: "application/pdf" });

      if (navigator.share && navigator.canShare({ files: [file] })) {
        navigator.share({ files: [file], title: filename });
      } else {
        // Desktop: descargar + abrir WhatsApp Web
        downloadPdf(blob, filename);

        const message = `Hola, te envío el documento: ${filename}`;
        window.open(
          `https://wa.me/${formattedPhone}?text=${encodeURIComponent(message)}`,
          "_blank"
        );
      }
    },
    [downloadPdf]
  );

  return {
    generatePdf,
    downloadPdf,
    shareToWhatsapp,
    generating,
    progress,
  };
}