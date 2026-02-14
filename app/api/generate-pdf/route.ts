import { NextRequest, NextResponse } from "next/server";
import puppeteer from "puppeteer";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  let browser;
  
  try {
    console.log("📄 [PDF API] Iniciando generación...");
    
    const body = await request.json();
    const { html, filename } = body;

    if (!html) {
      return NextResponse.json(
        { error: "HTML no proporcionado" },
        { status: 400 }
      );
    }

    console.log("📄 [PDF API] Lanzando Puppeteer...");
    
    // Lanzar navegador headless
    browser = await puppeteer.launch({
      headless: true,
      args: [
        "--no-sandbox",
        "--disable-setuid-sandbox",
        "--disable-dev-shm-usage",
        "--disable-accelerated-2d-canvas",
        "--disable-gpu",
      ],
    });

    console.log("📄 [PDF API] Creando página...");
    const page = await browser.newPage();

    // Configurar viewport para A4
    await page.setViewport({
      width: 794, // 210mm en px (72 DPI)
      height: 1123, // 297mm en px (72 DPI)
    });

    console.log("📄 [PDF API] Cargando HTML...");
    
    // Cargar el HTML
    await page.setContent(html, {
      waitUntil: ["load", "networkidle0"],
    });

    console.log("📄 [PDF API] Generando PDF...");

    // Generar PDF
    const pdfBuffer = await page.pdf({
      format: "A4",
      printBackground: true,
      margin: {
        top: 0,
        right: 0,
        bottom: 0,
        left: 0,
      },
    });

    console.log(`✅ [PDF API] PDF generado, tamaño: ${pdfBuffer.length} bytes`);

    // Convertir Buffer a base64 correctamente
    const pdfBase64 = Buffer.from(pdfBuffer).toString("base64");
    
    console.log(`✅ [PDF API] Base64 generado, longitud: ${pdfBase64.length} caracteres`);
    console.log(`🔍 [PDF API] Primeros 100 caracteres: ${pdfBase64.substring(0, 100)}`);
    console.log(`🔍 [PDF API] Últimos 20 caracteres: ${pdfBase64.substring(pdfBase64.length - 20)}`);

    // Cerrar navegador
    await browser.close();

    return NextResponse.json({
      success: true,
      pdf: pdfBase64,
      filename: filename || "document.pdf",
      size: pdfBuffer.length,
    });

  } catch (error: any) {
    console.error("❌ [PDF API] Error:", error);
    
    // Cerrar navegador si quedó abierto
    if (browser) {
      try {
        await browser.close();
      } catch (closeError) {
        console.error("Error cerrando navegador:", closeError);
      }
    }

    return NextResponse.json(
      {
        error: error.message || "Error generando PDF",
        stack: process.env.NODE_ENV === "development" ? error.stack : undefined,
      },
      { status: 500 }
    );
  }
}