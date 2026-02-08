// app/api/facturacion/route.ts
import { NextRequest, NextResponse } from "next/server";
import { emitirComprobante } from "@/lib/afip";

export async function POST(request: NextRequest) {
  console.log("📥 POST /api/facturacion - Iniciando");

  try {
    // 1. Obtener y validar token del header
    const authHeader = request.headers.get("Authorization");
    console.log(
      "🔑 Authorization header recibido:",
      authHeader ? "Presente" : "Ausente",
    );

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      console.log("❌ No hay token de autorización válido");
      return NextResponse.json(
        { message: "No autorizado - Token requerido" },
        { status: 401 },
      );
    }

    const token = authHeader.substring(7);
    console.log(
      "✅ Token presente (primeros 20 chars):",
      token.substring(0, 20) + "...",
    );

    // 2. Leer el cuerpo de la solicitud
    const body = await request.json();
    console.log("📦 Body recibido:", JSON.stringify(body, null, 2));

    const { saleId, client } = body;

    if (!saleId) {
      return NextResponse.json(
        { message: "Falta el ID de la venta (saleId)" },
        { status: 400 },
      );
    }

    // 3. Obtener datos de la venta desde Firestore usando adminDb
    console.log(`🔍 Buscando venta con ID: ${saleId}`);
    const { adminDb } = await import("@/lib/firebase-admin");
    let saleSnap;

    try {
      saleSnap = await adminDb.collection("ventas").doc(saleId).get();
    } catch (firestoreError) {
      console.error("❌ Error de Firestore:", firestoreError);
      return NextResponse.json(
        {
          message: "Error al acceder a la base de datos",
          error:
            firestoreError instanceof Error
              ? firestoreError.message
              : "Error desconocido de Firestore",
        },
        { status: 500 },
      );
    }

    if (!saleSnap.exists) {
      console.log(`❌ Venta con ID ${saleId} no encontrada`);
      return NextResponse.json(
        { message: "Venta no encontrada" },
        { status: 404 },
      );
    }

    const saleData = saleSnap.data() || {};
    console.log("📦 Datos de la venta:", saleData);

    // 4. Procesar datos del cliente
    let clientData = client || {};

    // Si no se envió cliente, usar datos de la venta
    if (!clientData.name && saleData.clientName) {
      clientData.name = saleData.clientName;
    }
    if (!clientData.phone && saleData.clientPhone) {
      clientData.phone = saleData.clientPhone;
    }
    if (!clientData.taxCategory && saleData.clientTaxCategory) {
      clientData.taxCategory = saleData.clientTaxCategory;
    }

    console.log("👤 Datos del cliente:", clientData);

    // 5. Validaciones básicas del cliente
    if (!clientData.name) {
      return NextResponse.json(
        { message: "El cliente debe tener al menos un nombre" },
        { status: 400 },
      );
    }

    // 6. Validar taxCategory (¡IMPORTANTE!)
    if (!clientData.taxCategory) {
      console.warn(
        '⚠️ No se especificó taxCategory, usando "consumidor_final" por defecto',
      );
      clientData.taxCategory = "consumidor_final";
    }

    // 7. Preparar datos para AFIP
    const importeTotal = saleData.total || 0;
    const importeNeto = importeTotal / 1.21; // Asumiendo 21% IVA
    const importeIVA = importeTotal - importeNeto;

    // Mapear categoría fiscal a código AFIP
    const taxCategoryMapping: Record<string, number> = {
      consumidor_final: 5,
      responsable_inscripto: 1,
      monotributista: 6,
      exento: 4,
      no_categorizado: 7,
      cliente_exterior: 9,
    };

    const taxCategory = clientData.taxCategory;
    const condicionIVAReceptor = taxCategoryMapping[taxCategory] || 5;

    console.log("💰 Importes calculados:", {
      importeTotal,
      importeNeto,
      importeIVA,
    });
    console.log("🏷️ Condición IVA receptor:", {
      taxCategory,
      codigoAFIP: condicionIVAReceptor,
    });

    // Para Consumidor Final siempre usar DocTipo 99 y DocNro 0
    const esConsumidorFinal =
      !clientData.cuit || clientData.taxCategory === "consumidor_final";
    const tipoDoc = esConsumidorFinal ? 99 : 80;
    const nroDoc = esConsumidorFinal
      ? 0
      : parseInt(clientData.cuit.replace(/\D/g, ""));

    const comprobanteData: AfipInvoiceData = {
      puntoVenta: 1,
      tipoComprobante: 6,
      fechaComprobante: new Date().toISOString().split("T")[0],
      concepto: 1,
      tipoDocumento: tipoDoc,
      numeroDocumento: nroDoc,
      importeTotal,
      importeNeto,
      importeIVA,
      importeExento: 0,
      CondicionIVAReceptor: condicionIVAReceptor, // Agregar al interface
      datosAdicionales: {
        clientName: clientData.name,
        clientPhone: clientData.phone,
        saleId,
      },
    };

    console.log("🔄 Enviando a AFIP:", comprobanteData);

    console.log(
      "🔄 Enviando a AFIP:",
      JSON.stringify(comprobanteData, null, 2),
    );

    // 9. Crear comprobante en AFIP
    let afipResponse;
    try {
      afipResponse = await emitirComprobante(comprobanteData);
      console.log("✅ [AFIP] Respuesta recibida:", afipResponse);
    } catch (afipError) {
      console.error("❌ Error de AFIP:", afipError);
      return NextResponse.json(
        {
          message: "Error al emitir comprobante en AFIP",
          error:
            afipError instanceof Error
              ? afipError.message
              : "Error desconocido de AFIP",
        },
        { status: 500 },
      );
    }

    // 10. Generar número de factura
    // 10. Generar número de factura
    const invoiceNumber = `${comprobanteData.puntoVenta.toString().padStart(4, "0")}-${afipResponse.cbteDesde.toString().padStart(8, "0")}`;

    // 11. Actualizar la venta en Firestore
    try {
      await adminDb
        .collection("ventas")
        .doc(saleId)
        .update({
          invoiceNumber,
          invoiceEmitted: true,
          invoiceStatus: "emitted",
          afipData: {
            cae: afipResponse.CAE,
            caeVencimiento: afipResponse.CAEFchVto,
            tipoComprobante: comprobanteData.tipoComprobante,
            puntoVenta: comprobanteData.puntoVenta,
            numeroComprobante: afipResponse.cbteDesde,
          },
          clientData: {
            name: clientData.name,
            phone: clientData.phone,
            email: clientData.email || "",
            taxCategory: clientData.taxCategory,
            cuit: clientData.cuit || "",
            dni: clientData.dni || "",
          },
        });
      console.log("✅ Venta actualizada en Firestore");
    } catch (updateError) {
      console.error("❌ Error al actualizar venta en Firestore:", updateError);
      return NextResponse.json(
        {
          message:
            "Factura emitida en AFIP pero error al guardar en base de datos",
          error:
            updateError instanceof Error
              ? updateError.message
              : "Error desconocido al actualizar",
        },
        { status: 500 },
      );
    }

    // 12. Generar URL del PDF
    const pdfUrl = `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/api/facturacion/pdf/${saleId}`;
    const whatsappUrl = clientData.phone
      ? `https://wa.me/${clientData.phone.replace(/\D/g, "")}?text=${encodeURIComponent(`Su factura ${invoiceNumber} está lista para descargar: ${pdfUrl}`)}`
      : undefined;
    // 13. Preparar respuesta
    const responseData = {
      invoiceNumber,
      pdfUrl,
      whatsappUrl,
      saleId,
      afipData: {
        cae: afipResponse.CAE,
        caeVencimiento: afipResponse.CAEFchVto,
        tipoComprobante: comprobanteData.tipoComprobante,
        puntoVenta: comprobanteData.puntoVenta,
        numeroComprobante: afipResponse.cbteDesde,
      },
    };

    console.log("✅ Factura generada exitosamente:", responseData);

    return NextResponse.json(responseData, { status: 200 });
  } catch (error) {
    console.error("💥 Error inesperado en /api/facturacion:", error);
    console.error(
      "💥 Error stack:",
      error instanceof Error ? error.stack : "No stack",
    );

    return NextResponse.json(
      {
        message: "Error interno del servidor",
        error: error instanceof Error ? error.message : "Error desconocido",
        timestamp: new Date().toISOString(),
      },
      { status: 500 },
    );
  }
}

export const dynamic = "force-dynamic";
