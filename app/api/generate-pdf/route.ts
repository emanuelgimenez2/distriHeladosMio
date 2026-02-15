// app/api/generate-pdf/route.ts
import { NextRequest, NextResponse } from "next/server";
import puppeteer from "puppeteer-core";
import chromium from "@sparticuz/chromium";

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
        { status: 400 },
      );
    }

    console.log("📄 [PDF API] Lanzando Puppeteer...");

    const isProduction = process.env.NODE_ENV === "production";

    browser = await puppeteer.launch({
      args: isProduction
        ? chromium.args
        : ["--no-sandbox", "--disable-setuid-sandbox"],
      executablePath: isProduction
        ? await chromium.executablePath()
        : process.env.PUPPETEER_EXECUTABLE_PATH || undefined,
      headless: true,
    });

    console.log("📄 [PDF API] Creando página...");
    const page = await browser.newPage();

    await page.setViewport({
      width: 794,
      height: 1123,
    });

    console.log("📄 [PDF API] Cargando HTML...");

    await page.setContent(html, {
      waitUntil: ["load", "networkidle0"],
    });

    console.log("📄 [PDF API] Generando PDF...");

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

    const pdfBase64 = Buffer.from(pdfBuffer).toString("base64");

    console.log(
      `✅ [PDF API] Base64 generado, longitud: ${pdfBase64.length} caracteres`,
    );

    await browser.close();

    return NextResponse.json({
      success: true,
      pdf: pdfBase64,
      filename: filename || "document.pdf",
      size: pdfBuffer.length,
    });
  } catch (error: any) {
    console.error("❌ [PDF API] Error:", error);

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
      { status: 500 },
    );
  }
}
