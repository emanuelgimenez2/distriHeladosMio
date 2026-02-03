"use client"

import { useEffect, useState } from "react"
import { MainLayout } from "@/components/layout/main-layout"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { DataTableSkeleton } from "@/components/ui/data-table-skeleton"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { salesApi } from "@/lib/api"
import type { Sale } from "@/lib/types"
import {
  Search,
  FileText,
  ShoppingBag,
  Banknote,
  CreditCard,
  CheckCircle,
  Clock,
  Loader2,
  Plus,
  Eye,
} from "lucide-react"
import Link from "next/link"

export default function VentasPage() {
  const [sales, setSales] = useState<Sale[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [filterInvoice, setFilterInvoice] = useState<string>("all")
  const [filterPayment, setFilterPayment] = useState<string>("all")
  
  // Invoice modal state
  const [showInvoiceModal, setShowInvoiceModal] = useState(false)
  const [selectedSale, setSelectedSale] = useState<Sale | null>(null)
  const [emittingInvoice, setEmittingInvoice] = useState(false)
  
  // Detail modal state
  const [showDetailModal, setShowDetailModal] = useState(false)
  const [detailSale, setDetailSale] = useState<Sale | null>(null)

  useEffect(() => {
    loadSales()
  }, [])

  const loadSales = async () => {
    try {
      const data = await salesApi.getAll()
      setSales(data)
    } catch (error) {
      console.error("Error loading sales:", error)
    } finally {
      setLoading(false)
    }
  }

  const filteredSales = sales.filter((sale) => {
    const matchesSearch =
      sale.id.toLowerCase().includes(search.toLowerCase()) ||
      (sale.clientName?.toLowerCase().includes(search.toLowerCase()) ?? false)
    
    const matchesInvoice =
      filterInvoice === "all" ||
      (filterInvoice === "emitted" && sale.invoiceEmitted) ||
      (filterInvoice === "pending" && !sale.invoiceEmitted)
    
    const matchesPayment =
      filterPayment === "all" || sale.paymentType === filterPayment

    return matchesSearch && matchesInvoice && matchesPayment
  })

  const handleEmitInvoice = async () => {
    if (!selectedSale) return
    setEmittingInvoice(true)
    try {
      const result = await salesApi.emitInvoice(selectedSale.id, {
        name: selectedSale.clientName,
        phone: selectedSale.clientPhone,
      })
      setSales((prev) =>
        prev.map((s) =>
          s.id === selectedSale.id
            ? { ...s, invoiceEmitted: true, invoiceNumber: result.invoiceNumber }
            : s
        )
      )
      setShowInvoiceModal(false)
      setSelectedSale(null)
    } catch (error) {
      console.error("Error emitting invoice:", error)
    } finally {
      setEmittingInvoice(false)
    }
  }

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat("es-AR", {
      style: "currency",
      currency: "ARS",
    }).format(price)
  }

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat("es-AR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(date))
  }

  const pendingInvoicesCount = sales.filter((s) => !s.invoiceEmitted).length
  const totalSales = sales.reduce((acc, s) => acc + s.total, 0)
  const cashSales = sales.filter((s) => s.paymentType === "cash").reduce((acc, s) => acc + s.total, 0)
  const creditSales = sales.filter((s) => s.paymentType === "credit").reduce((acc, s) => acc + s.total, 0)

  return (
    <MainLayout title="Ventas" description="Historial de ventas y facturación">
      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                <ShoppingBag className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Ventas</p>
                <p className="text-lg font-bold text-foreground">{formatPrice(totalSales)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-success/10 flex items-center justify-center">
                <Banknote className="h-5 w-5 text-success" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Efectivo</p>
                <p className="text-lg font-bold text-foreground">{formatPrice(cashSales)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-accent/10 flex items-center justify-center">
                <CreditCard className="h-5 w-5 text-accent" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Cta. Corriente</p>
                <p className="text-lg font-bold text-foreground">{formatPrice(creditSales)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-warning/10 flex items-center justify-center">
                <Clock className="h-5 w-5 text-warning" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Boletas Pend.</p>
                <p className="text-lg font-bold text-foreground">{pendingInvoicesCount}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4 justify-between mb-6">
        <div className="flex flex-col sm:flex-row gap-4 flex-1">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por ID o cliente..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select value={filterInvoice} onValueChange={setFilterInvoice}>
            <SelectTrigger className="w-full sm:w-48">
              <SelectValue placeholder="Filtrar por boleta" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas las boletas</SelectItem>
              <SelectItem value="emitted">Emitidas</SelectItem>
              <SelectItem value="pending">Pendientes</SelectItem>
            </SelectContent>
          </Select>
          <Select value={filterPayment} onValueChange={setFilterPayment}>
            <SelectTrigger className="w-full sm:w-48">
              <SelectValue placeholder="Filtrar por pago" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos los pagos</SelectItem>
              <SelectItem value="cash">Efectivo</SelectItem>
              <SelectItem value="credit">Cuenta Corriente</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <Button asChild>
          <Link href="/ventas/nueva">
            <Plus className="h-4 w-4 mr-2" />
            Nueva Venta
          </Link>
        </Button>
      </div>

      {/* Sales Table */}
      {loading ? (
        <DataTableSkeleton columns={6} rows={8} />
      ) : filteredSales.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <ShoppingBag className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">No se encontraron ventas</p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>ID</TableHead>
                  <TableHead>Fecha</TableHead>
                  <TableHead>Cliente</TableHead>
                  <TableHead>Vendedor</TableHead>
                  <TableHead>Total</TableHead>
                  <TableHead>Pago</TableHead>
                  <TableHead>Boleta</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredSales.map((sale) => (
                  <TableRow key={sale.id}>
                    <TableCell className="font-mono text-sm">
                      #{sale.id}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {formatDate(sale.createdAt)}
                    </TableCell>
                    <TableCell>
                      {sale.clientName || (
                        <span className="text-muted-foreground">Venta directa</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {sale.sellerName || (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell className="font-medium">
                      {formatPrice(sale.total)}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={sale.paymentType === "cash" ? "default" : "secondary"}
                        className="gap-1"
                      >
                        {sale.paymentType === "cash" ? (
                          <>
                            <Banknote className="h-3 w-3" />
                            Efectivo
                          </>
                        ) : (
                          <>
                            <CreditCard className="h-3 w-3" />
                            Cta. Cte.
                          </>
                        )}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {sale.invoiceEmitted ? (
                        <Badge variant="outline" className="gap-1 text-success border-success">
                          <CheckCircle className="h-3 w-3" />
                          {sale.invoiceNumber}
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="gap-1 text-warning border-warning">
                          <Clock className="h-3 w-3" />
                          Pendiente
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => {
                            setDetailSale(sale)
                            setShowDetailModal(true)
                          }}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        {!sale.invoiceEmitted && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setSelectedSale(sale)
                              setShowInvoiceModal(true)
                            }}
                          >
                            <FileText className="h-4 w-4 mr-1" />
                            Emitir
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </Card>
      )}

      {/* Invoice Emission Modal */}
      <Dialog open={showInvoiceModal} onOpenChange={setShowInvoiceModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Emitir Boleta</DialogTitle>
          </DialogHeader>
          
          {selectedSale && (
            <div className="py-4">
              <div className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Venta</span>
                  <span className="font-mono text-foreground">#{selectedSale.id}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Cliente</span>
                  <span className="text-foreground">
                    {selectedSale.clientName || "Venta directa"}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Fecha</span>
                  <span className="text-foreground">{formatDate(selectedSale.createdAt)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Productos</span>
                  <span className="text-foreground">{selectedSale.items.length}</span>
                </div>
              </div>
              
              <div className="mt-4 p-4 bg-muted rounded-lg">
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Total</span>
                  <span className="text-xl font-bold text-foreground">
                    {formatPrice(selectedSale.total)}
                  </span>
                </div>
              </div>

              <p className="mt-4 text-sm text-muted-foreground">
                Se generará una boleta fiscal para esta venta. Esta acción no puede deshacerse.
              </p>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowInvoiceModal(false)}>
              Cancelar
            </Button>
            <Button onClick={handleEmitInvoice} disabled={emittingInvoice}>
              {emittingInvoice ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Emitiendo...
                </>
              ) : (
                <>
                  <FileText className="h-4 w-4 mr-2" />
                  Emitir Boleta
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Detail Modal */}
      <Dialog open={showDetailModal} onOpenChange={setShowDetailModal}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Detalle de Venta</DialogTitle>
          </DialogHeader>
          
          {detailSale && (
            <div className="py-4">
              <div className="space-y-3 mb-4">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">ID</span>
                  <span className="font-mono text-foreground">#{detailSale.id}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Fecha</span>
                  <span className="text-foreground">{formatDate(detailSale.createdAt)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Cliente</span>
                  <span className="text-foreground">
                    {detailSale.clientName || "Venta directa"}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Vendedor</span>
                  <span className="text-foreground">
                    {detailSale.sellerName || "-"}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Método de Pago</span>
                  <Badge variant={detailSale.paymentType === "cash" ? "default" : "secondary"}>
                    {detailSale.paymentType === "cash" ? "Efectivo" : "Cuenta Corriente"}
                  </Badge>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Boleta</span>
                  {detailSale.invoiceEmitted ? (
                    <span className="text-success">{detailSale.invoiceNumber}</span>
                  ) : (
                    <span className="text-warning">Pendiente</span>
                  )}
                </div>
              </div>

              <div className="border-t border-border pt-4">
                <h4 className="font-medium text-foreground mb-3">Productos</h4>
                <div className="space-y-2">
                  {detailSale.items.map((item, index) => (
                    <div key={index} className="flex justify-between text-sm">
                      <span className="text-foreground">
                        {item.name} x{item.quantity}
                      </span>
                      <span className="text-muted-foreground">
                        {formatPrice(item.price * item.quantity)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="mt-4 p-4 bg-muted rounded-lg">
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Total</span>
                  <span className="text-xl font-bold text-foreground">
                    {formatPrice(detailSale.total)}
                  </span>
                </div>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button onClick={() => setShowDetailModal(false)}>Cerrar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </MainLayout>
  )
}
