// app/api/afip/test/route.ts
import { NextResponse } from "next/server";
import { afip } from "@/lib/afip";

export async function GET() {
  try {
    console.log("🔍 Probando conexión con AFIP...");
    
    // Verificar si podemos obtener el último comprobante
    const ultimo = await afip.ElectronicBilling.getLastVoucher(1, 6);
    
    return NextResponse.json({
      success: true,
      message: "Conexión exitosa con AFIP",
      ultimoComprobante: ultimo,
      cuit: process.env.AFIP_CUIT,
      hasToken: !!process.env.AFIP_ACCESS_TOKEN,
    });
  } catch (error: any) {
    return NextResponse.json({
      success: false,
      error: error.message,
      stack: error.stack,
    }, { status: 500 });
  }
}