import { NextRequest, NextResponse } from "next/server";
import { adminAuth, adminFirestore } from "@/lib/firebase-admin";
import { emitirComprobante } from "@/lib/afip";

export async function POST(request: NextRequest) {
  try {
    console.log("🚀 [AFIP API] Iniciando emisión de comprobante...");

    // Verificar auth
    const authHeader = request.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json({ message: "No autorizado" }, { status: 401 });
    }

    const token = authHeader.substring(7);
    try {
      await adminAuth.verifyIdToken(token);
    } catch {
      return NextResponse.json({ message: "Token inválido" }, { status: 401 });
    }

    const body = await request.json();
    const { saleId, client, emitirAfip } = body;

    if (!saleId) {
      return NextResponse.json({ message: "Falta saleId" }, { status: 400 });
    }

    console.log(`📄 [AFIP API] Procesando venta ${saleId}, emitirAfip: ${emitirAfip}`);

    // Obtener venta de Firestore
    const ventaRef = adminFirestore.collection("ventas").doc(saleId);
    const ventaSnap = await ventaRef.get();

    if (!ventaSnap.exists) {
      return NextResponse.json({ message: "Venta no encontrada" }, { status: 404 });
    }

    const sale = ventaSnap.data() || {};

    // Obtener datos del cliente
    let clientData: any = client || {};
    if (sale.clientId && !client?.name) {
      const clientSnap = await adminFirestore
        .collection("clientes")
        .doc(sale.clientId)
        .get();
      if (clientSnap.exists) {
        const c = clientSnap.data() || {};
        clientData = {
          name: c.name,
          phone: c.phone,
          email: c.email,
          taxCategory: c.taxCategory,
          cuit: c.cuit,
          dni: c.dni,
        };
      }
    }

    let afipResponse = null;
    let invoiceNumber = null;

    // Solo emitir en AFIP si se solicita explícitamente
    if (emitirAfip) {
      console.log("💰 [AFIP API] Preparando datos para AFIP...");

      const importeTotal = sale.total || 0;
      const importeNeto = importeTotal / 1.21;
      const importeIVA = importeTotal - importeNeto;

      const taxCategoryMapping: Record<string, number> = {
        consumidor_final: 5,
        responsable_inscripto: 1,
        monotributista: 6,
        exento: 4,
        no_categorizado: 7,
        cliente_exterior: 9,
      };

      const esConsumidorFinal =
        !clientData.cuit || clientData.taxCategory === "consumidor_final";
      const tipoDoc = esConsumidorFinal ? 99 : 80;
      const nroDoc = esConsumidorFinal
        ? 0
        : parseInt(clientData.cuit.replace(/\D/g, ""));

      const comprobanteData = {
        puntoVenta: 1,
        tipoComprobante: 6, // Factura B
        fechaComprobante: new Date().toISOString().split("T")[0],
        concepto: 1, // Productos
        tipoDocumento: tipoDoc,
        numeroDocumento: nroDoc,
        importeTotal,
        importeNeto,
        importeIVA,
        importeExento: 0,
        CondicionIVAReceptor:
          taxCategoryMapping[clientData.taxCategory] || 5,
      };

      console.log("📡 [AFIP API] Enviando a AFIP:", {
        puntoVenta: comprobanteData.puntoVenta,
        tipoComprobante: comprobanteData.tipoComprobante,
        importeTotal: comprobanteData.importeTotal,
        tipoDoc,
        nroDoc,
      });

      try {
        afipResponse = await emitirComprobante(comprobanteData);
        
        invoiceNumber = `${String(comprobanteData.puntoVenta).padStart(4, "0")}-${String(afipResponse.cbteDesde).padStart(8, "0")}`;

        console.log("✅ [AFIP API] Comprobante emitido:", {
          invoiceNumber,
          cae: afipResponse.cae,
          caeVencimiento: afipResponse.caeVencimiento,
        });

        // VERIFICAR que el CAE no esté vacío
        if (!afipResponse.cae || !afipResponse.caeVencimiento) {
          console.error("❌ [AFIP API] CAE vacío recibido de AFIP");
          throw new Error("AFIP no devolvió CAE válido");
        }

      } catch (afipError: any) {
        console.error("❌ [AFIP API] Error en AFIP:", afipError);
        return NextResponse.json(
          { message: "Error en AFIP", error: afipError.message },
          { status: 500 }
        );
      }
    }

    // Preparar datos de actualización
    const updateData: any = {
      clientData: {
        name: clientData.name,
        phone: clientData.phone,
        email: clientData.email || "",
        taxCategory: clientData.taxCategory,
        cuit: clientData.cuit || "",
        dni: clientData.dni || "",
      },
      updatedAt: new Date().toISOString(),
    };

    if (afipResponse) {
      updateData.invoiceNumber = invoiceNumber;
      updateData.invoiceEmitted = true;
      updateData.invoiceStatus = "emitted";
      updateData.afipData = {
        cae: afipResponse.cae || "",
        caeVencimiento: afipResponse.caeVencimiento || "",
        tipoComprobante: 6,
        puntoVenta: 1,
        numeroComprobante: afipResponse.cbteDesde || 0,
      };
      
      console.log("📋 [AFIP API] Datos AFIP a guardar:", updateData.afipData);
    }

    console.log("💾 [AFIP API] Guardando en Firestore...");
    await ventaRef.update(updateData);

    console.log("✅ [AFIP API] Proceso completado exitosamente");

    return NextResponse.json({
      success: true,
      invoiceNumber,
      afipData: afipResponse
        ? {
            cae: afipResponse.cae || "",
            caeVencimiento: afipResponse.caeVencimiento || "",
            tipoComprobante: 6,
            puntoVenta: 1,
            numeroComprobante: afipResponse.cbteDesde || 0,
          }
        : null,
      message: emitirAfip ? "Factura emitida en AFIP" : "Datos actualizados",
    });
  } catch (error: any) {
    console.error("❌ [AFIP API] Error general:", error);
    return NextResponse.json(
      { message: "Error interno", error: error.message },
      { status: 500 }
    );
  }
}