"use client";

// hooks/useGenerarPdf.tsx
// Genera PDFs directamente en el cliente usando @react-pdf/renderer
// SIN necesidad de Chromium ni ninguna API server-side

import React from "react";
import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  pdf,
} from "@react-pdf/renderer";

// ===================== TIPOS =====================
export interface VentaItem {
  name: string;
  quantity: number;
  price: number;
}

export interface Venta {
  id: string;
  clientId?: string;
  clientName?: string;
  clientPhone?: string;
  clientAddress?: string;
  clientCuit?: string;
  clientTaxCategory?: string;
  items: VentaItem[];
  total: number;
  paymentType: "cash" | "credit" | "mixed";
  cashAmount?: number;
  creditAmount?: number;
  createdAt: any;
  invoiceNumber?: string;
  invoiceEmitted?: boolean;
  remitoNumber?: string;
  deliveryAddress?: string;
  afipData?: {
    cae?: string;
    caeVencimiento?: string;
  };
  clientData?: {
    name?: string;
    phone?: string;
    cuit?: string;
    address?: string;
    taxCategory?: string;
  };
}

// ===================== HELPERS =====================
const formatCurrency = (amount: number) =>
  new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    minimumFractionDigits: 2,
  }).format(amount || 0);

const safeFormatDate = (date: any): string => {
  if (!date) return "-";
  try {
    let d: Date;
    if (date?.toDate) d = date.toDate();
    else if (typeof date === "string") d = new Date(date);
    else if (typeof date === "number") d = new Date(date);
    else if (date instanceof Date) d = date;
    else if (date?.seconds) d = new Date(date.seconds * 1000);
    else return "-";
    if (isNaN(d.getTime())) return "-";
    return d.toLocaleDateString("es-AR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  } catch {
    return "-";
  }
};

const safeFormatTime = (date: any): string => {
  if (!date) return "--:--";
  try {
    let d: Date;
    if (date?.toDate) d = date.toDate();
    else if (typeof date === "string") d = new Date(date);
    else if (date instanceof Date) d = date;
    else if (date?.seconds) d = new Date(date.seconds * 1000);
    else return "--:--";
    return isNaN(d.getTime())
      ? "--:--"
      : d.toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit" });
  } catch {
    return "--:--";
  }
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

// ===================== ESTILOS BOLETA =====================
const boletaStyles = StyleSheet.create({
  page: {
    padding: "10mm",
    fontFamily: "Courier",
    fontSize: 11,
    color: "black",
    backgroundColor: "white",
  },
  header: { flexDirection: "row", border: "2px solid black", marginBottom: 12 },
  headerLeft: { width: "33%", padding: 12, borderRight: "2px solid black" },
  headerCenter: {
    width: "33%",
    padding: 12,
    borderRight: "2px solid black",
    alignItems: "center",
  },
  headerRight: { width: "34%", padding: 12 },
  docTypeBox: {
    border: "2px solid black",
    width: 56,
    height: 56,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 6,
  },
  docTypeText: { fontSize: 28, fontWeight: "bold" },
  companyTitle: { fontSize: 18, fontWeight: "bold", marginBottom: 6 },
  companyInfo: { fontSize: 8, lineHeight: 1.6 },
  invoiceTitle: { fontSize: 16, fontWeight: "bold", marginBottom: 4 },
  invoiceInfo: { fontSize: 8, lineHeight: 1.6 },
  clientSection: { border: "2px solid black", padding: 12, marginBottom: 12 },
  row: { flexDirection: "row", marginBottom: 4 },
  col: { width: "50%" },
  bold: { fontWeight: "bold" },
  text: { fontSize: 10 },
  textXs: { fontSize: 8 },
  textCenter: { textAlign: "center" },
  textRight: { textAlign: "right" },
  table: { border: "2px solid black", marginBottom: 12 },
  tableHeader: {
    flexDirection: "row",
    backgroundColor: "#f0f0f0",
    borderBottom: "1px solid black",
    padding: "6px 8px",
    fontWeight: "bold",
    fontSize: 9,
  },
  tableRow: {
    flexDirection: "row",
    borderBottom: "1px solid black",
    padding: "6px 8px",
    fontSize: 9,
  },
  colQty: { width: "10%", textAlign: "center" },
  colDesc: { width: "45%" },
  colPrice: { width: "15%", textAlign: "right" },
  colIva: { width: "12%", textAlign: "right" },
  colSubtotal: { width: "18%", textAlign: "right" },
  totalsSection: { border: "2px solid black", padding: 12, marginBottom: 12 },
  totalsBox: { width: "55%", marginLeft: "auto" },
  totalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 4,
    fontSize: 10,
  },
  totalRowFinal: {
    flexDirection: "row",
    justifyContent: "space-between",
    fontSize: 16,
    fontWeight: "bold",
    borderTop: "1px solid black",
    paddingTop: 6,
    marginTop: 4,
  },
  caeSection: { border: "2px solid black", padding: 12, marginBottom: 12 },
  warningBox: {
    border: "2px solid black",
    padding: 12,
    marginBottom: 12,
    alignItems: "center",
  },
  warningText: { color: "#dc2626", fontWeight: "bold", fontSize: 12 },
  warningSubText: { color: "#6b7280", fontSize: 8, marginTop: 4 },
  footer: { marginTop: 12, textAlign: "center", fontSize: 8, color: "#6b7280" },
});

// ===================== COMPONENTE BOLETA =====================
const BoletaPDF = ({ venta, afipData }: { venta: Venta; afipData?: any }) => {
  const isElectronica = !!afipData?.cae;
  const items = venta.items || [];
  const emptyRows = Math.max(0, 10 - items.length);
  const pv = venta.invoiceNumber?.split("-")[0] || "0001";
  const nro = venta.invoiceNumber?.split("-")[1] || "00000000";
  const clientCuit =
    venta.clientCuit || venta.clientData?.cuit || "00-00000000-0";
  const clientName =
    venta.clientName || venta.clientData?.name || "Consumidor Final";
  const clientAddress = venta.clientAddress || venta.clientData?.address || "-";
  const taxCategory = venta.clientTaxCategory || venta.clientData?.taxCategory;

  return (
    <Document>
      <Page size="A4" style={boletaStyles.page}>
        {/* HEADER */}
        <View style={boletaStyles.header}>
          <View style={boletaStyles.headerLeft}>
            <Text style={boletaStyles.companyTitle}>HELADOS MIO</Text>
            <Text style={boletaStyles.companyInfo}>
              {"Razon Social: HELADOS MIO S.R.L.\n"}
              {"Domicilio Comercial: Av. Principal 1234\n"}
              {"Localidad: Buenos Aires\n"}
              {"Condicion frente al IVA: Responsable Inscripto"}
            </Text>
          </View>
          <View style={boletaStyles.headerCenter}>
            <View style={boletaStyles.docTypeBox}>
              <Text style={boletaStyles.docTypeText}>
                {isElectronica ? "B" : "X"}
              </Text>
            </View>
            <Text style={[boletaStyles.textXs, boletaStyles.textCenter]}>
              {isElectronica
                ? "Codigo 006\nFACTURA"
                : "Doc. No Valido como Factura\nPRESUPUESTO"}
            </Text>
          </View>
          <View style={boletaStyles.headerRight}>
            <Text style={boletaStyles.invoiceTitle}>
              {"Punto de Venta: " + pv + "\n"}
              {"Comp. Nro: " + nro}
            </Text>
            <Text style={boletaStyles.invoiceInfo}>
              {"Fecha de Emision: " + safeFormatDate(venta.createdAt) + "\n"}
              {"CUIT: 30-12345678-9\n"}
              {"Ingresos Brutos: 12345678\n"}
              {"Inicio de Actividades: 01/01/2020"}
            </Text>
          </View>
        </View>

        {/* CLIENTE */}
        <View style={boletaStyles.clientSection}>
          <View style={boletaStyles.row}>
            <View style={boletaStyles.col}>
              <Text style={boletaStyles.text}>
                <Text style={boletaStyles.bold}>CUIT: </Text>
                {clientCuit}
              </Text>
              <Text style={boletaStyles.text}>
                <Text style={boletaStyles.bold}>Cond. IVA: </Text>
                {getTaxCategoryLabel(taxCategory)}
              </Text>
            </View>
            <View style={boletaStyles.col}>
              <Text style={[boletaStyles.text, boletaStyles.bold]}>
                Apellido y Nombre / Razon Social:
              </Text>
              <Text style={boletaStyles.text}>{clientName}</Text>
            </View>
          </View>
          <View style={[boletaStyles.row, { marginTop: 6 }]}>
            <View style={boletaStyles.col}>
              <Text style={boletaStyles.text}>
                <Text style={boletaStyles.bold}>Domicilio: </Text>
                {clientAddress}
              </Text>
            </View>
            <View style={boletaStyles.col}>
              <Text style={boletaStyles.text}>
                <Text style={boletaStyles.bold}>Cond. venta: </Text>
                {getPaymentTypeLabel(venta.paymentType)}
              </Text>
            </View>
          </View>
        </View>

        {/* TABLA ITEMS */}
        <View style={boletaStyles.table}>
          <View style={boletaStyles.tableHeader}>
            <Text style={boletaStyles.colQty}>Cant.</Text>
            <Text style={boletaStyles.colDesc}>Descripcion</Text>
            <Text style={boletaStyles.colPrice}>Precio Unit.</Text>
            <Text style={boletaStyles.colIva}>% IVA</Text>
            <Text style={boletaStyles.colSubtotal}>Subtotal</Text>
          </View>
          {items.map((item, i) => (
            <View key={i} style={boletaStyles.tableRow}>
              <Text style={boletaStyles.colQty}>{item.quantity}</Text>
              <Text style={boletaStyles.colDesc}>{item.name}</Text>
              <Text style={boletaStyles.colPrice}>
                {formatCurrency(item.price)}
              </Text>
              <Text style={boletaStyles.colIva}>21.00</Text>
              <Text style={boletaStyles.colSubtotal}>
                {formatCurrency(item.price * item.quantity)}
              </Text>
            </View>
          ))}
          {Array.from({ length: emptyRows }).map((_, i) => (
            <View key={`e${i}`} style={boletaStyles.tableRow}>
              <Text style={boletaStyles.colQty}> </Text>
              <Text style={boletaStyles.colDesc}> </Text>
              <Text style={boletaStyles.colPrice}> </Text>
              <Text style={boletaStyles.colIva}> </Text>
              <Text style={boletaStyles.colSubtotal}> </Text>
            </View>
          ))}
        </View>

        {/* TOTALES */}
        <View style={boletaStyles.totalsSection}>
          <View style={boletaStyles.totalsBox}>
            <View style={boletaStyles.totalRow}>
              <Text>Subtotal:</Text>
              <Text>{formatCurrency((venta.total || 0) / 1.21)}</Text>
            </View>
            <View style={boletaStyles.totalRow}>
              <Text>IVA 21%:</Text>
              <Text>
                {formatCurrency((venta.total || 0) - (venta.total || 0) / 1.21)}
              </Text>
            </View>
            <View style={boletaStyles.totalRowFinal}>
              <Text>TOTAL:</Text>
              <Text>{formatCurrency(venta.total || 0)}</Text>
            </View>
            {venta.paymentType === "mixed" && (
              <View
                style={{
                  marginTop: 8,
                  paddingTop: 6,
                  borderTop: "1px dashed black",
                }}
              >
                <View style={boletaStyles.totalRow}>
                  <Text style={boletaStyles.textXs}>Efectivo:</Text>
                  <Text style={boletaStyles.textXs}>
                    {formatCurrency(venta.cashAmount || 0)}
                  </Text>
                </View>
                <View style={boletaStyles.totalRow}>
                  <Text style={boletaStyles.textXs}>A Cuenta:</Text>
                  <Text style={boletaStyles.textXs}>
                    {formatCurrency(venta.creditAmount || 0)}
                  </Text>
                </View>
              </View>
            )}
          </View>
        </View>

        {/* CAE o WARNING */}
        {isElectronica ? (
          <View style={boletaStyles.caeSection}>
            <Text style={boletaStyles.textXs}>
              <Text style={boletaStyles.bold}>CAE N: </Text>
              {afipData.cae || "N/A"}
            </Text>
            <Text style={[boletaStyles.textXs, { marginTop: 4 }]}>
              <Text style={boletaStyles.bold}>Fecha de Vto. de CAE: </Text>
              {afipData.caeVencimiento
                ? safeFormatDate(afipData.caeVencimiento)
                : "-"}
            </Text>
          </View>
        ) : (
          <View style={boletaStyles.warningBox}>
            <Text style={boletaStyles.warningText}>
              DOCUMENTO NO VALIDO COMO FACTURA
            </Text>
            <Text style={boletaStyles.warningSubText}>
              Este documento es un presupuesto. Solicite factura electronica si
              la requiere.
            </Text>
          </View>
        )}

        {/* FOOTER */}
        <View style={boletaStyles.footer}>
          <Text>
            {isElectronica
              ? "Comprobante autorizado por AFIP\nEsta factura contribuye al desarrollo del pais."
              : "Documento interno - No valido fiscalmente"}
          </Text>
        </View>
      </Page>
    </Document>
  );
};

// ===================== ESTILOS REMITO =====================
const remitoStyles = StyleSheet.create({
  page: {
    padding: 32,
    fontFamily: "Helvetica",
    fontSize: 11,
    backgroundColor: "white",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderBottom: "2px solid black",
    paddingBottom: 12,
    marginBottom: 20,
  },
  company: { fontSize: 22, fontWeight: "bold" },
  remitoNumber: { fontSize: 18, fontWeight: "bold" },
  infoGrid: { flexDirection: "row", gap: 12, marginBottom: 20 },
  infoBox: { flex: 1, border: "1px solid #ccc", padding: 10, borderRadius: 4 },
  infoBoxFull: {
    border: "1px solid #ccc",
    padding: 10,
    borderRadius: 4,
    marginBottom: 20,
  },
  bold: { fontWeight: "bold" },
  text: { fontSize: 10, lineHeight: 1.5 },
  table: { marginBottom: 20 },
  tableHeader: {
    flexDirection: "row",
    backgroundColor: "#f0f0f0",
    border: "1px solid black",
    padding: "8px 10px",
    fontWeight: "bold",
    fontSize: 10,
  },
  tableRow: {
    flexDirection: "row",
    border: "1px solid black",
    borderTop: "none",
    padding: "8px 10px",
    fontSize: 10,
  },
  tableFooter: {
    flexDirection: "row",
    border: "1px solid black",
    borderTop: "none",
    padding: "8px 10px",
    fontWeight: "bold",
    fontSize: 12,
    backgroundColor: "#f9f9f9",
  },
  colQty: { width: "12%", textAlign: "center" },
  colProduct: { width: "50%" },
  colPrice: { width: "19%", textAlign: "right" },
  colSubtotal: { width: "19%", textAlign: "right" },
  footer: {
    borderTop: "2px solid black",
    paddingTop: 12,
    textAlign: "center",
    color: "#666666",
    fontSize: 9,
  },
});

// ===================== COMPONENTE REMITO =====================
const RemitoPDF = ({ venta }: { venta: Venta }) => {
  const remitoNumber =
    venta.remitoNumber || `R-${new Date().getFullYear()}-00001`;
  const items = venta.items || [];

  return (
    <Document>
      <Page size="A4" style={remitoStyles.page}>
        {/* HEADER */}
        <View style={remitoStyles.header}>
          <Text style={remitoStyles.company}>HELADOS MIO</Text>
          <Text style={remitoStyles.remitoNumber}>
            REMITO N° {remitoNumber}
          </Text>
        </View>

        {/* INFO GRID */}
        <View style={remitoStyles.infoGrid}>
          <View style={remitoStyles.infoBox}>
            <Text style={[remitoStyles.bold, remitoStyles.text]}>Cliente:</Text>
            <Text style={remitoStyles.text}>
              {venta.clientName || "Cliente"}
            </Text>
            <Text style={remitoStyles.text}>{venta.clientPhone || ""}</Text>
          </View>
          <View style={remitoStyles.infoBox}>
            <Text style={remitoStyles.text}>
              <Text style={remitoStyles.bold}>Fecha: </Text>
              {safeFormatDate(venta.createdAt)}
            </Text>
            <Text style={remitoStyles.text}>
              <Text style={remitoStyles.bold}>Hora: </Text>
              {safeFormatTime(venta.createdAt)}
            </Text>
          </View>
        </View>

        {/* DIRECCION */}
        <View style={remitoStyles.infoBoxFull}>
          <Text style={[remitoStyles.bold, remitoStyles.text]}>
            Direccion de entrega:
          </Text>
          <Text style={remitoStyles.text}>
            {venta.deliveryAddress ||
              venta.clientAddress ||
              venta.clientData?.address ||
              "-"}
          </Text>
        </View>

        {/* TABLA */}
        <View style={remitoStyles.table}>
          <View style={remitoStyles.tableHeader}>
            <Text style={remitoStyles.colQty}>Cant.</Text>
            <Text style={remitoStyles.colProduct}>Producto</Text>
            <Text style={remitoStyles.colPrice}>Precio Unit.</Text>
            <Text style={remitoStyles.colSubtotal}>Subtotal</Text>
          </View>
          {items.map((item, i) => (
            <View key={i} style={remitoStyles.tableRow}>
              <Text style={remitoStyles.colQty}>{item.quantity}</Text>
              <Text style={remitoStyles.colProduct}>{item.name}</Text>
              <Text style={remitoStyles.colPrice}>
                {formatCurrency(item.price)}
              </Text>
              <Text style={remitoStyles.colSubtotal}>
                {formatCurrency(item.price * item.quantity)}
              </Text>
            </View>
          ))}
          <View style={remitoStyles.tableFooter}>
            <Text
              style={{
                ...remitoStyles.colQty,
                ...remitoStyles.colProduct,
                width: "62%",
                textAlign: "right",
              }}
            >
              TOTAL:
            </Text>
            <Text style={remitoStyles.colSubtotal}>
              {formatCurrency(venta.total)}
            </Text>
          </View>
        </View>

        {/* FOOTER */}
        <View style={remitoStyles.footer}>
          <Text>Comprobante de entrega de mercaderia</Text>
          <Text>HELADOS MIO S.R.L. - CUIT: 30-12345678-9</Text>
        </View>
      </Page>
    </Document>
  );
};

// ===================== FUNCIÓN EXPORTABLE =====================
/**
 * Genera un PDF de boleta o remito directamente en el cliente.
 * No usa Chromium ni ninguna API server-side.
 * Retorna el PDF como string base64.
 */
export const generarPdfCliente = async (
  venta: Venta,
  tipo: "boleta" | "remito",
  afipData?: any,
): Promise<string> => {
  console.log(`📄 Generando PDF ${tipo} para venta ${venta.id} (cliente-side)`);

  const doc =
    tipo === "boleta" ? (
      <BoletaPDF venta={venta} afipData={afipData} />
    ) : (
      <RemitoPDF venta={venta} />
    );

  const pdfBlob = await pdf(doc).toBlob();
  const arrayBuffer = await pdfBlob.arrayBuffer();
  const bytes = new Uint8Array(arrayBuffer);

  // Convertir a base64
  let binary = "";
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  const base64 = btoa(binary);

  console.log(
    `✅ PDF ${tipo} generado, tamaño base64: ${base64.length} caracteres`,
  );
  return base64;
};