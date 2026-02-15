import { NextRequest, NextResponse } from "next/server";
import { adminAuth, adminFirestore } from "@/lib/firebase-admin";
import { emitirComprobante } from "@/lib/afip";

export async function POST(request: NextRequest) {
  try {
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
      const clientSnap = await adminFirestore.collection("clientes").doc(sale.clientId).get();
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

      const esConsumidorFinal = !clientData.cuit || clientData.taxCategory === "consumidor_final";
      const tipoDoc = esConsumidorFinal ? 99 : 80;
      const nroDoc = esConsumidorFinal ? 0 : parseInt(clientData.cuit.replace(/\D/g, ""));

      const comprobanteData = {
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
        CondicionIVAReceptor: taxCategoryMapping[clientData.taxCategory] || 5,
      };

      try {
        afipResponse = await emitirComprobante(comprobanteData);
        invoiceNumber = `${String(comprobanteData.puntoVenta).padStart(4, "0")}-${String(afipResponse.cbteDesde).padStart(8, "0")}`;
      } catch (afipError: any) {
        console.error("Error AFIP:", afipError);
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
    cae: afipResponse.cae,                    // ✅ minúscula
    caeVencimiento: afipResponse.caeVencimiento, // ✅ ya estaba correcto
    tipoComprobante: 6,
    puntoVenta: 1,
    numeroComprobante: afipResponse.cbteDesde,  // ✅ minúscula
  };
}

    await ventaRef.update(updateData);

 return NextResponse.json({
  success: true,
  invoiceNumber,
  afipData: afipResponse ? {
    cae: afipResponse.cae,                    // ✅ minúscula
    caeVencimiento: afipResponse.caeVencimiento, // ✅ ya estaba correcto
  } : null,
  message: emitirAfip ? "Factura emitida en AFIP" : "Datos actualizados",
});

  } catch (error: any) {
    console.error("Error:", error);
    return NextResponse.json(
      { message: "Error interno", error: error.message },
      { status: 500 }
    );
  }
}