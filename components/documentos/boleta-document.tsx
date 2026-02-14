import { forwardRef } from "react";

interface BoletaItem {
  name: string;
  quantity: number;
  price: number;
}

interface BoletaDocumentProps {
  boletaNumber: string;
  date: Date;
  clientName?: string;
  clientCuit?: string;
  clientAddress?: string;
  clientPhone?: string;
  clientTaxCategory?: string;
  items: BoletaItem[];
  total: number;
  paymentType: "cash" | "credit" | "mixed";
  cashAmount?: number;
  creditAmount?: number;
  cae?: string;
  caeVencimiento?: string | Date;
  barcodeData?: string;
}

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    minimumFractionDigits: 2,
  }).format(amount);
};

const formatDate = (date: Date | string) => {
  const d = typeof date === "string" ? new Date(date) : date;
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

export const BoletaDocument = forwardRef<HTMLDivElement, BoletaDocumentProps>(
  (
    {
      boletaNumber,
      date,
      clientName,
      clientCuit,
      clientAddress,
      clientPhone,
      clientTaxCategory,
      items,
      total,
      paymentType,
      cashAmount,
      creditAmount,
      cae,
      caeVencimiento,
      barcodeData,
    },
    ref,
  ) => {
    const isElectronica = !!cae;

    // ESTILOS INLINE CON COLORES HEX - Compatible con html2canvas
    const styles = {
      container: {
        backgroundColor: "#ffffff",
        color: "#000000",
        padding: "10mm",
        width: "210mm",
        minHeight: "297mm",
        fontFamily: "monospace",
        fontSize: "11px",
        lineHeight: 1.4,
        boxSizing: "border-box" as const,
      },
      borderBox: {
        border: "2px solid #000000",
        marginBottom: "16px",
      },
      grid3: {
        display: "grid",
        gridTemplateColumns: "repeat(3, 1fr)",
      },
      grid2: {
        display: "grid",
        gridTemplateColumns: "repeat(2, 1fr)",
        gap: "16px",
      },
      borderR: {
        borderRight: "2px solid #000000",
      },
      p4: {
        padding: "16px",
      },
      textCenter: {
        textAlign: "center" as const,
      },
      textRight: {
        textAlign: "right" as const,
      },
      fontBold: {
        fontWeight: "bold",
      },
      textXl: {
        fontSize: "20px",
      },
      textLg: {
        fontSize: "18px",
      },
      textXs: {
        fontSize: "9px",
      },
      mb2: {
        marginBottom: "8px",
      },
      mb4: {
        marginBottom: "16px",
      },
      mt2: {
        marginTop: "8px",
      },
      mt4: {
        marginTop: "16px",
      },
      docTypeBox: {
        border: "2px solid #000000",
        width: "64px",
        height: "64px",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize: "32px",
        fontWeight: "bold",
        margin: "0 auto 8px",
      },
      table: {
        width: "100%",
        borderCollapse: "collapse" as const,
        tableLayout: "fixed" as const,
      },
      th: {
        padding: "8px",
        border: "1px solid #000000",
        fontWeight: "bold",
        textAlign: "left" as const,
        backgroundColor: "#f0f0f0",
      },
      td: {
        padding: "8px",
        border: "1px solid #000000",
      },
      textRed: {
        color: "#dc2626",
      },
      textGray: {
        color: "#6b7280",
      },
      borderT: {
        borderTop: "1px dashed #000000",
        paddingTop: "8px",
      },
      qrBox: {
        border: "2px solid #000000",
        width: "96px",
        height: "96px",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize: "10px",
      },
      totalsBox: {
        width: "256px",
        marginLeft: "auto",
      },
    };

    return (
      <div ref={ref} style={styles.container}>
        <div style={styles.borderBox}>
          <div style={styles.grid3}>
            <div style={{ ...styles.p4, ...styles.borderR }}>
              <h1
                style={{ ...styles.textXl, ...styles.fontBold, ...styles.mb2 }}
              >
                HELADOS MIO
              </h1>
              <p style={{ ...styles.textXs, lineHeight: 1.6 }}>
                Razon Social: HELADOS MIO S.R.L.
                <br />
                Domicilio Comercial: Av. Principal 1234
                <br />
                Localidad: Buenos Aires
                <br />
                Condicion frente al IVA: Responsable Inscripto
              </p>
            </div>

            <div
              style={{ ...styles.p4, ...styles.borderR, ...styles.textCenter }}
            >
              <div style={styles.docTypeBox}>{isElectronica ? "B" : "X"}</div>
              <p style={styles.textXs}>
                {isElectronica
                  ? "Codigo 006"
                  : "Documento No Valido como Factura"}
                <br />
                {isElectronica ? "FACTURA" : "PRESUPUESTO"}
              </p>
            </div>

            <div style={styles.p4}>
              <p
                style={{ ...styles.textLg, ...styles.fontBold, ...styles.mb2 }}
              >
                Punto de Venta: {boletaNumber.split("-")[0] || "0001"}
                <br />
                Comp. Nro: {boletaNumber.split("-")[1] || boletaNumber}
              </p>
              <p style={{ ...styles.textXs, lineHeight: 1.6 }}>
                Fecha de Emision: {formatDate(date)}
                <br />
                CUIT: 30-12345678-9
                <br />
                Ingresos Brutos: 12345678
                <br />
                Inicio de Actividades: 01/01/2020
              </p>
            </div>
          </div>
        </div>

        <div style={{ ...styles.borderBox, ...styles.p4 }}>
          <div style={styles.grid2}>
            <div>
              <p>
                <span style={styles.fontBold}>CUIT:</span>{" "}
                {clientCuit || "00-00000000-0"}
              </p>
              <p>
                <span style={styles.fontBold}>Condicion frente al IVA:</span>{" "}
                {getTaxCategoryLabel(clientTaxCategory)}
              </p>
            </div>
            <div>
              <p style={styles.fontBold}>Apellido y Nombre / Razon Social:</p>
              <p>{clientName || "Consumidor Final"}</p>
            </div>
          </div>
          <div style={{ ...styles.grid2, ...styles.mt2 }}>
            <p>
              <span style={styles.fontBold}>Domicilio:</span>{" "}
              {clientAddress || "-"}
            </p>
            <p>
              <span style={styles.fontBold}>Condicion de venta:</span>{" "}
              {getPaymentTypeLabel(paymentType)}
            </p>
          </div>
        </div>

        <div style={styles.borderBox}>
          <table style={styles.table}>
            <thead>
              <tr>
                <th style={{ ...styles.th, width: "80px" }}>Cantidad</th>
                <th style={styles.th}>Descripcion</th>
                <th
                  style={{ ...styles.th, ...styles.textRight, width: "100px" }}
                >
                  Precio Unit.
                </th>
                <th
                  style={{ ...styles.th, ...styles.textRight, width: "80px" }}
                >
                  % IVA
                </th>
                <th
                  style={{ ...styles.th, ...styles.textRight, width: "100px" }}
                >
                  Subtotal
                </th>
              </tr>
            </thead>
            <tbody>
              {items.map((item, index) => (
                <tr key={index}>
                  <td style={{ ...styles.td, textAlign: "center" }}>
                    {item.quantity}
                  </td>
                  <td style={styles.td}>{item.name}</td>
                  <td style={{ ...styles.td, ...styles.textRight }}>
                    {formatCurrency(item.price)}
                  </td>
                  <td style={{ ...styles.td, ...styles.textRight }}>21.00</td>
                  <td style={{ ...styles.td, ...styles.textRight }}>
                    {formatCurrency(item.price * item.quantity)}
                  </td>
                </tr>
              ))}
              {Array.from({ length: Math.max(0, 10 - items.length) }).map(
                (_, i) => (
                  <tr key={`empty-${i}`}>
                    <td style={styles.td}>&nbsp;</td>
                    <td style={styles.td}>&nbsp;</td>
                    <td style={styles.td}>&nbsp;</td>
                    <td style={styles.td}>&nbsp;</td>
                    <td style={styles.td}>&nbsp;</td>
                  </tr>
                ),
              )}
            </tbody>
          </table>
        </div>

        <div style={{ ...styles.borderBox, ...styles.p4 }}>
          <div style={styles.totalsBox}>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                marginBottom: "4px",
              }}
            >
              <span>Subtotal:</span>
              <span>{formatCurrency((total || 0) / 1.21)}</span>
            </div>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                marginBottom: "4px",
              }}
            >
              <span>IVA 21%:</span>
              <span>{formatCurrency((total || 0) - (total || 0) / 1.21)}</span>
            </div>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                fontWeight: "bold",
                fontSize: "18px",
                borderTop: "1px solid #000000",
                paddingTop: "8px",
              }}
            >
              <span>TOTAL:</span>
              <span>{formatCurrency(total || 0)}</span>
            </div>
            {paymentType === "mixed" && (
              <div
                style={{
                  ...styles.borderT,
                  marginTop: "8px",
                  fontSize: "12px",
                }}
              >
                <div
                  style={{ display: "flex", justifyContent: "space-between" }}
                >
                  <span>Efectivo:</span>
                  <span>{formatCurrency(cashAmount || 0)}</span>
                </div>
                <div
                  style={{ display: "flex", justifyContent: "space-between" }}
                >
                  <span>A Cuenta:</span>
                  <span>{formatCurrency(creditAmount || 0)}</span>
                </div>
              </div>
            )}
          </div>
        </div>

        {isElectronica ? (
          <div style={{ ...styles.borderBox, ...styles.p4 }}>
            <div style={styles.grid2}>
              <div>
                <p style={styles.textXs}>
                  <span style={styles.fontBold}>CAE N:</span> {cae}
                  <br />
                  <span style={styles.fontBold}>
                    Fecha de Vto. de CAE:
                  </span>{" "}
                  {caeVencimiento ? formatDate(caeVencimiento) : "-"}
                </p>
              </div>
              <div style={{ display: "flex", justifyContent: "flex-end" }}>
                <div style={styles.qrBox}>
                  {barcodeData ? (
                    <img
                      src={`https://api.qrserver.com/v1/create-qr-code/?size=100x100&data=${encodeURIComponent(barcodeData)}`}
                      alt="QR AFIP"
                      style={{ width: "100%", height: "100%" }}
                    />
                  ) : (
                    "QR AFIP"
                  )}
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div
            style={{ ...styles.borderBox, ...styles.p4, ...styles.textCenter }}
          >
            <p
              style={{
                ...styles.fontBold,
                ...styles.textRed,
                fontSize: "14px",
              }}
            >
              DOCUMENTO NO VALIDO COMO FACTURA
            </p>
            <p style={{ ...styles.textXs, ...styles.textGray }}>
              Este documento es un presupuesto. Solicite factura electrónica si
              la requiere.
            </p>
          </div>
        )}

        <div
          style={{
            ...styles.mt4,
            ...styles.textCenter,
            ...styles.textXs,
            ...styles.textGray,
          }}
        >
          {isElectronica ? (
            <>
              <p>Comprobante autorizado por AFIP</p>
              <p>
                Esta factura contribuye al desarrollo del pais. El pago de los
                impuestos es obligacion de todos.
              </p>
            </>
          ) : (
            <p>Documento interno - No válido fiscalmente</p>
          )}
        </div>
      </div>
    );
  },
);

BoletaDocument.displayName = "BoletaDocument";
