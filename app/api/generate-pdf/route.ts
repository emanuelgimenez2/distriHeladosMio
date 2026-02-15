import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const maxDuration = 60;

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

    if (isProduction) {
      console.log("📄 [PDF API] Modo PRODUCCIÓN - Usando Chromium minimal");
      
      // ✅ Importar chromium-min que incluye todas las dependencias
      const chromium = (await import("@sparticuz/chromium-min")).default;
      const puppeteerCore = (await import("puppeteer-core")).default;
      
      browser = await puppeteerCore.launch({
        args: chromium.args,
        defaultViewport: chromium.defaultViewport,
        executablePath: await chromium.executablePath(
          "https://github.com/Sparticuz/chromium/releases/download/v126.0.0/chromium-v126.0.0-pack.tar"
        ),
        headless: chromium.headless,
      });
    } else {
      console.log("📄 [PDF API] Modo DESARROLLO - Usando Puppeteer local");
      const puppeteerFull = (await import("puppeteer")).default;
      browser = await puppeteerFull.launch({
        headless: true,
        args: ["--no-sandbox", "--disable-setuid-sandbox"],
      });
    }

    console.log("📄 [PDF API] Creando página...");
    const page = await browser.newPage();

    await page.setViewport({
      width: 794,
      height: 1123,
    });

    console.log("📄 [PDF API] Cargando HTML...");

    await page.setContent(html, {
      waitUntil: ["load", "networkidle0"],
      timeout: 30000, // ✅ Timeout de 30 segundos
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
      preferCSSPageSize: true,
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
    console.error("❌ [PDF API] Stack:", error.stack);

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
        details: error.toString(),
        stack: process.env.NODE_ENV === "development" ? error.stack : undefined,
      },
      { status: 500 },
    );
  }
}