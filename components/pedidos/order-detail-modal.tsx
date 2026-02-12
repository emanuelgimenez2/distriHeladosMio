"use client";

import React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import {
  statusConfig,
  statusFlow,
  generateOrderNumber,
  formatDateFull,
  calculateOrderTotal,
} from "@/app/pedidos/page";
import type { Order, OrderStatus } from "@/lib/types";
import {
  X,
  User,
  MapPin,
  Calendar,
  Box,
  CheckCircle,
  ChevronRight,
  ArrowRight,
  Clock,
} from "lucide-react";
import { useRouter } from "next/navigation";

interface OrderDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  order: Order | null;
  onStatusChange: (orderId: string, newStatus: OrderStatus) => void;
}

export function OrderDetailModal({
  isOpen,
  onClose,
  order,
  onStatusChange,
}: OrderDetailModalProps) {
  const router = useRouter();

  if (!order) return null;

  const config = statusConfig[order.status];
  const StatusIcon = config.icon || Clock;

  const getNextStatus = (currentStatus: OrderStatus): OrderStatus | null => {
    const currentIndex = statusFlow.indexOf(currentStatus);
    if (currentIndex < statusFlow.length - 1) {
      return statusFlow[currentIndex + 1];
    }
    return null;
  };

  const nextStatus = getNextStatus(order.status);

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto p-0 gap-0">
        <DialogHeader className="p-6 pb-4 border-b">
          <div className="flex items-center justify-between">
            <DialogTitle className="text-xl flex items-center gap-3">
              <span className="font-mono">
                #{generateOrderNumber(order.createdAt, 0)}
              </span>
              <div
                className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full ${config.bgColor} border ${config.borderColor}`}
              >
                <div
                  className={`w-1.5 h-1.5 rounded-full ${config.dotColor}`}
                />
                <span className={`text-xs font-semibold ${config.color}`}>
                  {config.label}
                </span>
              </div>
            </DialogTitle>
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="h-8 w-8 p-0 rounded-full"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </DialogHeader>

        <div className="p-6 space-y-6">
          {/* Sale Link if completed */}
          {order.status === "completed" && order.saleId && (
            <div className="p-4 bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-xl">
              <div className="flex items-start gap-3">
                <div className="p-2 bg-green-100 rounded-lg">
                  <CheckCircle className="h-5 w-5 text-green-600" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-semibold text-green-800 mb-1">
                    Pedido completado con venta
                  </p>
                  <p className="text-xs text-green-600 mb-3">
                    Este pedido tiene una venta asociada. Podés ver los detalles
                    y emitir documentos.
                  </p>
                  <Button
                    variant="outline"
                    className="w-full border-green-300 text-green-700 hover:bg-green-100 bg-white"
                    onClick={() =>
                      router.push(`/ventas?saleId=${order.saleId}`)
                    }
                  >
                    <ArrowRight className="h-4 w-4 mr-2" />
                    Ver Venta y Documentos
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* Info Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="p-4 bg-gray-50 rounded-xl border border-gray-100">
              <Label className="text-xs text-gray-500 uppercase flex items-center gap-1.5 mb-2">
                <User className="h-3.5 w-3.5" />
                Cliente
              </Label>
              <p className="font-semibold text-gray-900">
                {order.clientName || (
                  <span className="text-gray-400 italic">Venta directa</span>
                )}
              </p>
            </div>

            <div className="p-4 bg-gray-50 rounded-xl border border-gray-100">
              <Label className="text-xs text-gray-500 uppercase mb-2 block">
                Vendedor
              </Label>
              <p className="font-semibold text-gray-900">
                {order.sellerName || "Sin asignar"}
              </p>
            </div>
          </div>

          {/* Address & Date */}
          <div className="space-y-3">
            <div className="p-4 bg-gray-50 rounded-xl border border-gray-100">
              <Label className="text-xs text-gray-500 uppercase flex items-center gap-1.5 mb-2">
                <MapPin className="h-3.5 w-3.5" />
                Dirección de entrega
              </Label>
              <p className="text-gray-900 font-medium">{order.address}</p>
            </div>

            <div className="p-4 bg-gray-50 rounded-xl border border-gray-100">
              <Label className="text-xs text-gray-500 uppercase flex items-center gap-1.5 mb-2">
                <Calendar className="h-3.5 w-3.5" />
                Fecha de creación
              </Label>
              <p className="text-gray-900 font-medium">
                {formatDateFull(order.createdAt)}
              </p>
            </div>
          </div>

          {/* Products */}
          <div>
            <Label className="text-xs text-gray-500 uppercase flex items-center gap-1.5 mb-3">
              <Box className="h-3.5 w-3.5" />
              Productos ({order.items.length})
            </Label>
            <div className="bg-gray-50 rounded-xl border border-gray-100 overflow-hidden">
              {order.items.map((item, index) => (
                <div
                  key={index}
                  className="flex justify-between items-center py-3 px-4 border-b last:border-0 hover:bg-gray-100/50 transition-colors"
                >
                  <span className="text-sm font-medium text-gray-900">
                    {item.name}
                  </span>
                  <Badge variant="secondary" className="font-mono">
                    x{item.quantity}
                  </Badge>
                </div>
              ))}
              <div className="py-3 px-4 bg-gray-100/50 border-t flex justify-between items-center">
                <span className="text-sm font-semibold text-gray-700">
                  Total estimado
                </span>
                <span className="font-bold text-gray-900">
                  {new Intl.NumberFormat("es-AR", {
                    style: "currency",
                    currency: "ARS",
                  }).format(calculateOrderTotal(order))}
                </span>
              </div>
            </div>
          </div>

          {/* Timeline */}
          <div>
            <Label className="text-xs text-gray-500 uppercase mb-4 block">
              Progreso del pedido
            </Label>
            <div className="space-y-0">
              {statusFlow.map((status, index) => {
                const isCompleted = statusFlow.indexOf(order.status) >= index;
                const isCurrent = order.status === status;
                const stepConfig = statusConfig[status];
                const StepIcon = stepConfig.icon || Clock;

                return (
                  <div key={status} className="flex items-start gap-4 relative">
                    {/* Connector line */}
                    {index < statusFlow.length - 1 && (
                      <div
                        className={`absolute left-4 top-8 w-0.5 h-8 ${
                          isCompleted ? "bg-green-500" : "bg-gray-200"
                        }`}
                      />
                    )}

                    <div
                      className={`relative z-10 flex items-center justify-center w-8 h-8 rounded-full border-2 flex-shrink-0 ${
                        isCompleted
                          ? `${stepConfig.dotColor} border-transparent`
                          : isCurrent
                            ? `bg-white ${stepConfig.color.replace("text-", "border-")}`
                            : "bg-white border-gray-300"
                      }`}
                    >
                      {isCompleted ? (
                        <CheckCircle className="h-4 w-4 text-white" />
                      ) : (
                        <div
                          className={`w-2 h-2 rounded-full ${isCurrent ? stepConfig.dotColor : "bg-gray-300"}`}
                        />
                      )}
                    </div>

                    <div className="flex-1 pb-6">
                      <p
                        className={`text-sm font-semibold ${
                          isCompleted || isCurrent
                            ? "text-gray-900"
                            : "text-gray-400"
                        }`}
                      >
                        {stepConfig.label}
                      </p>
                      {isCurrent && (
                        <p className="text-xs text-gray-500 mt-0.5">
                          Estado actual
                        </p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Action Button */}
          {nextStatus && (
            <Button
              className="w-full h-12 text-base font-semibold shadow-lg hover:shadow-xl transition-shadow"
              size="lg"
              onClick={() => onStatusChange(order.id, nextStatus)}
            >
              {nextStatus === "completed" ? (
                <>
                  Completar Pedido y Cobrar
                  <ChevronRight className="h-5 w-5 ml-2" />
                </>
              ) : (
                <>
                  Avanzar a {statusConfig[nextStatus].label}
                  <ChevronRight className="h-5 w-5 ml-2" />
                </>
              )}
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
