// app/api/public/clientes/route.ts
import { NextResponse } from "next/server";
import { adminFirestore } from "@/lib/firebase-admin";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const dni = searchParams.get("dni")?.trim();
  if (!dni) {
    return NextResponse.json({ found: false });
  }

  const snapshot = await adminFirestore
    .collection("clientes")
    .where("dni", "==", dni)
    .limit(1)
    .get();
  if (snapshot.empty) {
    return NextResponse.json({ found: false });
  }

  const doc = snapshot.docs[0];
  const data = doc.data();
  return NextResponse.json({
    found: true,
    client: {
      id: doc.id,
      name: data.name || "",
      phone: data.phone || "",
      address: data.address || "",
      email: data.email || "",
      cuit: data.cuit || dni,
    },
  });
}
