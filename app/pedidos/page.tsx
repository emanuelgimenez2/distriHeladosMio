//app\pedidos\page.tsx
"use client";

import React, { useEffect, useState, useCallback, useMemo } from "react";
import { MainLayout } from "@/components/layout/main-layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { DataTableSkeleton } from "@/components/ui/data-table-skeleton";
import { Input } from "@/components/ui/input";
import { ClientModal } from "@/components/clientes/client-modal";
import { ordersApi, salesApi, clientsApi, paymentsApi } from "@/lib/api";
import type { Order, OrderStatus, Client } from "@/lib/types";
import { Package, Search, Calendar, User, Filter, X } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { useRouter } from "next/navigation";
import { OrdersFilters } from "@/components/pedidos/orders-filters";
import { OrderCard } from "@/components/pedidos/order-card";
import { OrderDetailModal } from "@/components/pedidos/order-detail-modal";
import { PaymentModal } from "@/components/pedidos/payment-modal";
import { SuccessModal } from "@/components/pedidos/success-modal";
import { statusConfig, statusFlow } from "@/lib/order-constants";

export const generateOrderNumber = (date: Date, index: number) => {
  const d = new Date(date);
  const year = d.getFullYear().toString().slice(-2);
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}${month}${day}-${String(index + 1).padStart(4, "0")}`;
};

export const formatPrice = (price: number) => {
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
  }).format(price);
};

export const formatDate = (date: Date) => {
  return new Intl.DateTimeFormat("es-AR", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(date));
};

export const formatDateFull = (date: Date) => {
  return new Intl.DateTimeFormat("es-AR", {
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(date));
};

export const calculateOrderTotal = (order: Order) => {
  return order.items.reduce((acc, item) => acc + item.quantity * item.price, 0);
};

export default function PedidosPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [mounted, setMounted] = useState(false);

  // Filtros
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [filterDateFrom, setFilterDateFrom] = useState<string>("");
  const [filterDateTo, setFilterDateTo] = useState<string>("");
  const [filterClient, setFilterClient] = useState<string>("");
  const [filterSeller, setFilterSeller] = useState<string>("");
  const [searchQuery, setSearchQuery] = useState<string>("");

  // Modales
  const [activeModal, setActiveModal] = useState<
    "detail" | "payment" | "success" | null
  >(null);
  const [detailOrder, setDetailOrder] = useState<Order | null>(null);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);

  // Payment state
  const [paymentType, setPaymentType] = useState<"cash" | "credit" | "split">(
    "cash",
  );
  const [cashAmount, setCashAmount] = useState("");
  const [selectedClientId, setSelectedClientId] = useState<string>("");
  const [clientSearch, setClientSearch] = useState("");
  const [showClientModal, setShowClientModal] = useState(false);
  const [processingPayment, setProcessingPayment] = useState(false);

  // Success state
  const [lastSaleResult, setLastSaleResult] = useState<{
    paymentType: string;
    total: number;
    saleId: string;
    client?: Client;
  } | null>(null);

  useEffect(() => {
    setMounted(true);
    loadData();
  }, []);

  useEffect(() => {
    if (selectedOrder?.clientId) {
      setSelectedClientId(selectedOrder.clientId);
      setPaymentType("cash");
    } else if (selectedOrder) {
      setSelectedClientId("");
      setPaymentType("cash");
    }
  }, [selectedOrder]);

  const loadData = async () => {
    try {
      const [ordersData, clientsData] = await Promise.all([
        ordersApi.getAll(),
        clientsApi.getAll(),
      ]);
      const sortedOrders = ordersData.sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      );
      setOrders(sortedOrders);
      setClients(clientsData);
    } catch (error) {
      console.error("Error loading data:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = async (
    orderId: string,
    newStatus: OrderStatus,
  ) => {
    if (newStatus === "completed") {
      const order = orders.find((o) => o.id === orderId);
      if (order) {
        setActiveModal(null);
        setDetailOrder(null);
        setTimeout(() => {
          setSelectedOrder(order);
          setActiveModal("payment");
        }, 50);
      }
      return;
    }

    try {
      const updated = await ordersApi.updateStatus(orderId, newStatus);
      setOrders((prev) => prev.map((o) => (o.id === orderId ? updated : o)));
      if (detailOrder?.id === orderId) {
        setDetailOrder(updated);
      }
    } catch (error) {
      console.error("Error updating order status:", error);
    }
  };

  const handleCompleteOrder = async () => {
    if (!selectedOrder) return;
    setProcessingPayment(true);

    try {
      const total = calculateOrderTotal(selectedOrder);

      // ✅ Siempre usar el clientId del pedido, sin importar el método de pago
      const resolvedClientId = selectedClientId || selectedOrder.clientId;
      const client = clients.find((c) => c.id === resolvedClientId);

      if (
        (paymentType === "credit" || paymentType === "split") &&
        !resolvedClientId
      ) {
        throw new Error("Debe seleccionar un cliente para cuenta corriente");
      }

      const normalizedCashAmount =
        paymentType === "split" ? Number(cashAmount || 0) : 0;
      if (
        paymentType === "split" &&
        (normalizedCashAmount <= 0 || normalizedCashAmount >= total)
      ) {
        throw new Error(
          "El pago en efectivo debe ser mayor a 0 y menor al total",
        );
      }

      const sale = await salesApi.processSale({
        // ✅ clientId y clientName siempre se pasan, sin importar el método de pago
        clientId: resolvedClientId,
        clientName: client?.name || selectedOrder.clientName,
        clientPhone: client?.phone,
        sellerId: selectedOrder.sellerId, // ✅ agregar esta línea
        sellerName: selectedOrder.sellerName, // ✅ agregar esta línea
        items: selectedOrder.items.map((item) => ({
          product: {
            id: item.productId,
            name: item.name,
            price: item.price,
            stock: 100,
            description: "",
            imageUrl: "",
            category: "",
            createdAt: new Date(),
          },
          quantity: item.quantity,
        })),
        paymentType: paymentType === "split" ? "credit" : paymentType,
        source: "order",
        createOrder: false,
        orderId: selectedOrder.id,
        deliveryMethod:
          selectedOrder.address === "Retiro en local" ? "pickup" : "delivery",
        deliveryAddress: selectedOrder.address,
      });

      if (paymentType === "split" && client && normalizedCashAmount > 0) {
        await paymentsApi.registerCashPayment({
          clientId: client.id,
          amount: normalizedCashAmount,
          description: `Pago parcial pedido #${selectedOrder.id}`,
        });
      }

      const updated = await ordersApi.completeOrder(selectedOrder.id, sale.id);
      setOrders((prev) =>
        prev.map((o) => (o.id === selectedOrder.id ? updated : o)),
      );

      setLastSaleResult({
        paymentType,
        total,
        saleId: sale.id,
        client,
      });

      setActiveModal(null);
      setSelectedOrder(null);
      setPaymentType("cash");
      setCashAmount("");
      setSelectedClientId("");

      setTimeout(() => {
        setActiveModal("success");
      }, 50);
    } catch (error) {
      console.error("Error completing order:", error);
      alert(
        error instanceof Error ? error.message : "Error al completar el pedido",
      );
    } finally {
      setProcessingPayment(false);
    }
  };

  const handleGoToSale = () => {
    if (lastSaleResult?.saleId) {
      router.push(`/ventas?saleId=${lastSaleResult.saleId}`);
    }
    setActiveModal(null);
  };

  const handleSaveClient = async (
    clientData: Omit<Client, "id" | "createdAt" | "currentBalance">,
  ) => {
    const newClient = await clientsApi.create(clientData);
    setClients((prev) => [...prev, newClient]);
    setSelectedClientId(newClient.id);
    setShowClientModal(false);
  };

  const closeAllModals = () => {
    setActiveModal(null);
    setDetailOrder(null);
    setSelectedOrder(null);
  };

  const clearFilters = () => {
    setFilterStatus("all");
    setFilterDateFrom("");
    setFilterDateTo("");
    setFilterClient("");
    setFilterSeller("");
    setSearchQuery("");
  };

  const hasActiveFilters = useMemo(() => {
    return (
      filterStatus !== "all" ||
      filterDateFrom ||
      filterDateTo ||
      filterClient ||
      filterSeller ||
      searchQuery
    );
  }, [
    filterStatus,
    filterDateFrom,
    filterDateTo,
    filterClient,
    filterSeller,
    searchQuery,
  ]);

  const filteredOrders = useMemo(() => {
    let filtered = orders;

    if (user?.role === "seller") {
      filtered = filtered.filter((o) => o.sellerId === user.sellerId);
    }

    if (filterStatus !== "all") {
      filtered = filtered.filter((o) => o.status === filterStatus);
    }

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (o) =>
          o.clientName?.toLowerCase().includes(query) ||
          o.sellerName?.toLowerCase().includes(query) ||
          o.id.toLowerCase().includes(query),
      );
    }

    if (filterClient) {
      filtered = filtered.filter((o) => o.clientId === filterClient);
    }

    if (filterSeller) {
      filtered = filtered.filter((o) => o.sellerId === filterSeller);
    }

    if (filterDateFrom) {
      const fromDate = new Date(filterDateFrom);
      fromDate.setHours(0, 0, 0, 0);
      filtered = filtered.filter((o) => new Date(o.createdAt) >= fromDate);
    }

    if (filterDateTo) {
      const toDate = new Date(filterDateTo);
      toDate.setHours(23, 59, 59, 999);
      filtered = filtered.filter((o) => new Date(o.createdAt) <= toDate);
    }

    return filtered;
  }, [
    orders,
    filterStatus,
    searchQuery,
    filterClient,
    filterSeller,
    filterDateFrom,
    filterDateTo,
    user,
  ]);

  const uniqueSellers = useMemo(() => {
    const sellersMap = new Map();
    orders.forEach((o) => {
      if (o.sellerId && o.sellerName) {
        sellersMap.set(o.sellerId, { id: o.sellerId, name: o.sellerName });
      }
    });
    return Array.from(sellersMap.values());
  }, [orders]);

  if (!mounted) {
    return (
      <MainLayout
        title="Pedidos"
        description="Seguimiento de pedidos y entregas"
      >
        <DataTableSkeleton columns={5} rows={5} />
      </MainLayout>
    );
  }

  return (
    <MainLayout title="Pedidos" description="Seguimiento de pedidos y entregas">
      <div className="mb-6 space-y-4">
        <div className="flex flex-col lg:flex-row gap-3 justify-between items-start lg:items-center">
          <div className="flex items-center gap-2 w-full lg:w-auto">
            <div className="relative flex-1 lg:w-80">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por cliente, vendedor o ID..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2"
                >
                  <X className="h-4 w-4 text-muted-foreground hover:text-foreground" />
                </button>
              )}
            </div>
          </div>

          {hasActiveFilters && (
            <Button
              variant="ghost"
              size="sm"
              onClick={clearFilters}
              className="text-muted-foreground"
            >
              <Filter className="h-4 w-4 mr-2" />
              Limpiar filtros
            </Button>
          )}
        </div>

        <OrdersFilters
          filterStatus={filterStatus}
          setFilterStatus={setFilterStatus}
          filterDateFrom={filterDateFrom}
          setFilterDateFrom={setFilterDateFrom}
          filterDateTo={filterDateTo}
          setFilterDateTo={setFilterDateTo}
          filterClient={filterClient}
          setFilterClient={setFilterClient}
          filterSeller={filterSeller}
          setFilterSeller={setFilterSeller}
          clients={clients}
          sellers={uniqueSellers}
          orders={orders}
        />
      </div>

      {loading ? (
        <DataTableSkeleton columns={5} rows={5} />
      ) : filteredOrders.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Package className="h-12 w-12 text-gray-400 mx-auto mb-3" />
            <p className="text-gray-500 mb-2">No hay pedidos</p>
            {hasActiveFilters && (
              <Button variant="outline" onClick={clearFilters}>
                Limpiar filtros
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          <div className="hidden lg:block bg-white border rounded-xl overflow-hidden shadow-sm">
            <table className="w-full">
              <thead className="bg-gray-50/80 border-b">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Pedido
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Cliente
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Productos
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Estado
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Acción
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredOrders.map((order, index) => (
                  <OrderCard
                    key={order.id}
                    order={order}
                    index={index}
                    totalOrders={filteredOrders.length}
                    variant="table"
                    onViewDetails={() => {
                      setDetailOrder(order);
                      setActiveModal("detail");
                    }}
                  />
                ))}
              </tbody>
            </table>
          </div>

          <div className="lg:hidden space-y-3">
            {filteredOrders.map((order, index) => (
              <OrderCard
                key={order.id}
                order={order}
                index={index}
                totalOrders={filteredOrders.length}
                variant="card"
                onViewDetails={() => {
                  setDetailOrder(order);
                  setActiveModal("detail");
                }}
              />
            ))}
          </div>
        </div>
      )}

      <OrderDetailModal
        isOpen={activeModal === "detail"}
        onClose={closeAllModals}
        order={detailOrder}
        onStatusChange={handleStatusChange}
      />

      <PaymentModal
        isOpen={activeModal === "payment"}
        onClose={() => {
          setActiveModal(null);
          setSelectedOrder(null);
        }}
        order={selectedOrder}
        clients={clients}
        clientSearch={clientSearch}
        setClientSearch={setClientSearch}
        selectedClientId={selectedClientId}
        setSelectedClientId={setSelectedClientId}
        paymentType={paymentType}
        setPaymentType={setPaymentType}
        cashAmount={cashAmount}
        setCashAmount={setCashAmount}
        onComplete={handleCompleteOrder}
        processing={processingPayment}
        onNewClient={() => setShowClientModal(true)}
      />

      <SuccessModal
        isOpen={activeModal === "success"}
        onClose={() => setActiveModal(null)}
        saleResult={lastSaleResult}
        onGoToSale={handleGoToSale}
      />

      <ClientModal
        open={showClientModal}
        onOpenChange={setShowClientModal}
        client={null}
        onSave={handleSaveClient}
      />
    </MainLayout>
  );
}
