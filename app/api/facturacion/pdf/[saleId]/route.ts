// app/api/facturacion/pdf/[saleId]/route.ts
import { NextResponse } from "next/server";
import { adminAuth, adminDb } from "@/lib/firebase-admin";
import puppeteer from "puppeteer";

export const runtime = "nodejs";

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    minimumFractionDigits: 2,
  }).format(amount);
};

const formatDate = (date: Date | string | any) => {
  let d: Date;
  if (typeof date === "string") {
    d = new Date(date);
  } else if (date?.toDate) {
    d = date.toDate(); // Firestore Timestamp
  } else {
    d = date;
  }
  return d.toLocaleDateString("es-AR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
};

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

export async function GET(
  request: Request,
  context: { params: Promise<{ saleId: string }> },
) {
  try {
    const authHeader = request.headers.get("authorization");
    if (authHeader?.startsWith("Bearer ")) {
      try {
        await adminAuth.verifyIdToken(authHeader.replace("Bearer ", ""));
      } catch {
        console.log("⚠️ Auth falló, permitiendo en modo desarrollo");
      }
    }

    const { saleId } = await context.params;
    console.log("📄 Generando PDF para venta:", saleId);

    const saleSnapshot = await adminDb.collection("ventas").doc(saleId).get();
    if (!saleSnapshot.exists) {
      return NextResponse.json(
        { error: "Venta no encontrada" },
        { status: 404 },
      );
    }

    const sale = saleSnapshot.data() || {};

    let clientData: any = {};
    if (sale.clientId) {
      const clientSnapshot = await adminDb
        .collection("clientes")
        .doc(sale.clientId)
        .get();
      if (clientSnapshot.exists) {
        clientData = clientSnapshot.data();
      }
    }

    const isElectronica = !!sale.afipData?.cae;
    const items = sale.items || [];

    // Generar HTML idéntico al componente BoletaDocument
    const html = `
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
    .font-bold { font-weight: bold; }
    .text-xl { font-size: 20px; }
    .text-lg { font-size: 18px; }
    .text-xs { font-size: 9px; }
    .mb-2 { margin-bottom: 8px; }
    .mb-4 { margin-bottom: 16px; }
    .mt-2 { margin-top: 8px; }
    .mt-4 { margin-top: 16px; }
    .leading-relaxed { line-height: 1.6; }
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
    .text-red { color: #dc2626; }
    .text-gray { color: #6b7280; }
    .border-t { border-top: 1px dashed black; padding-top: 8px; }
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
  <!-- Header -->
  <div class="border-box">
    <div class="grid-3">
      <!-- Left - Company Info -->
      <div class="p-4 border-r">
        <h1 class="text-xl font-bold mb-2">HELADOS MIO</h1>
        <p class="text-xs leading-relaxed">
          Razon Social: HELADOS MIO S.R.L.<br>
          Domicilio Comercial: Av. Principal 1234<br>
          Localidad: Buenos Aires<br>
          Condicion frente al IVA: Responsable Inscripto
        </p>
      </div>

      <!-- Center - Document Type -->
      <div class="p-4 border-r">
        <div class="doc-type-box">${isElectronica ? "B" : "X"}</div>
        <p class="text-xs text-center">
          ${isElectronica ? "Codigo 006" : "Documento No Valido como Factura"}<br>
          ${isElectronica ? "FACTURA" : "PRESUPUESTO"}
        </p>
      </div>

      <!-- Right - Document Info -->
      <div class="p-4">
        <p class="text-lg font-bold mb-2">
          Punto de Venta: ${sale.invoiceNumber?.split("-")[0] || "0001"}<br>
          Comp. Nro: ${sale.invoiceNumber?.split("-")[1] || sale.invoiceNumber || "00000000"}
        </p>
        <p class="text-xs leading-relaxed">
          Fecha de Emision: ${formatDate(sale.createdAt || new Date())}<br>
          CUIT: 30-12345678-9<br>
          Ingresos Brutos: 12345678<br>
          Inicio de Actividades: 01/01/2020
        </p>
      </div>
    </div>
  </div>

  <!-- Client Info -->
  <div class="border-box p-4">
    <div class="grid-2">
      <div>
        <p><span class="font-bold">CUIT:</span> ${clientData.cuit || sale.clientCuit || "00-00000000-0"}</p>
        <p><span class="font-bold">Condicion frente al IVA:</span> ${getTaxCategoryLabel(clientData.taxCategory || sale.clientTaxCategory)}</p>
      </div>
      <div>
        <p class="font-bold">Apellido y Nombre / Razon Social:</p>
        <p>${sale.clientName || clientData.name || "Consumidor Final"}</p>
      </div>
    </div>
    <div class="grid-2 mt-2">
      <p><span class="font-bold">Domicilio:</span> ${clientData.address || sale.clientAddress || "-"}</p>
      <p><span class="font-bold">Condicion de venta:</span> ${getPaymentTypeLabel(sale.paymentType || "cash")}</p>
    </div>
  </div>

  <!-- Items Table -->
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
        ${items
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
          .join("")}
        ${Array.from({ length: Math.max(0, 10 - items.length) })
          .map(
            () => `
          <tr>
            <td>&nbsp;</td>
            <td>&nbsp;</td>
            <td>&nbsp;</td>
            <td>&nbsp;</td>
            <td>&nbsp;</td>
          </tr>
        `,
          )
          .join("")}
      </tbody>
    </table>
  </div>

  <!-- Totals -->
  <div class="border-box p-4">
    <div class="totals-box">
      <div style="display: flex; justify-content: space-between; margin-bottom: 4px;">
        <span>Subtotal:</span>
        <span>${formatCurrency((sale.total || 0) / 1.21)}</span>
      </div>
      <div style="display: flex; justify-content: space-between; margin-bottom: 4px;">
        <span>IVA 21%:</span>
        <span>${formatCurrency((sale.total || 0) - (sale.total || 0) / 1.21)}</span>
      </div>
      <div style="display: flex; justify-content: space-between; font-weight: bold; font-size: 18px; border-top: 1px solid black; padding-top: 8px;">
        <span>TOTAL:</span>
        <span>${formatCurrency(sale.total || 0)}</span>
      </div>
      ${
        sale.paymentType === "mixed"
          ? `
        <div class="border-t mt-2 text-xs">
          <div style="display: flex; justify-content: space-between;">
            <span>Efectivo:</span>
            <span>${formatCurrency(sale.cashAmount || 0)}</span>
          </div>
          <div style="display: flex; justify-content: space-between;">
            <span>A Cuenta:</span>
            <span>${formatCurrency(sale.creditAmount || 0)}</span>
          </div>
        </div>
      `
          : ""
      }
    </div>
  </div>

  <!-- CAE Info -->
  ${
    isElectronica
      ? `
    <div class="border-box p-4">
      <div class="grid-2">
        <div>
          <p class="text-xs">
            <span class="font-bold">CAE N:</span> ${sale.afipData?.cae || "N/A"}<br>
            <span class="font-bold">Fecha de Vto. de CAE:</span> ${sale.afipData?.caeVencimiento ? formatDate(sale.afipData.caeVencimiento) : "-"}
          </p>
        </div>
        <div style="display: flex; justify-content: flex-end;">
          <div class="qr-box">
            <img src="https://api.qrserver.com/v1/create-qr-code/?size=100x100&data=CAE:${sale.afipData?.cae}" alt="QR AFIP" style="width: 100%; height: 100%;">
          </div>
        </div>
      </div>
    </div>
  `
      : `
    <div class="border-box p-4 text-center">
      <p class="font-bold text-red">DOCUMENTO NO VALIDO COMO FACTURA</p>
      <p class="text-xs text-gray">Este documento es un presupuesto. Solicite factura electrónica si la requiere.</p>
    </div>
  `
  }

  <!-- Footer -->
  <div class="mt-4 text-center text-xs text-gray">
    ${
      isElectronica
        ? `
      <p>Comprobante autorizado por AFIP</p>
      <p>Esta factura contribuye al desarrollo del pais. El pago de los impuestos es obligacion de todos.</p>
    `
        : `
      <p>Documento interno - No válido fiscalmente</p>
    `
    }
  </div>
</body>
</html>
    `;

    // Generar PDF con Puppeteer
    const browser = await puppeteer.launch({
      headless: true,
      args: ["--no-sandbox", "--disable-setuid-sandbox"],
    });

    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: "networkidle0" });

    const pdfBuffer = await page.pdf({
      format: "A4",
      printBackground: true,
      margin: { top: 0, right: 0, bottom: 0, left: 0 },
    });

    await browser.close();

    return new NextResponse(pdfBuffer, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="factura-${sale.invoiceNumber || saleId}.pdf"`,
      },
    });
  } catch (error: any) {
    console.error("Error generando PDF:", error);
    return NextResponse.json(
      { error: error.message || "Error generando PDF" },
      { status: 500 },
    );
  }
}
