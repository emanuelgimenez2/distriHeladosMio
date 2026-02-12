"use client";

import React from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { statusConfig, statusFlow } from "@/app/pedidos/page";
import type { Client, Order } from "@/lib/types";
import { Calendar, User, Store, Filter } from "lucide-react";

interface OrdersFiltersProps {
  filterStatus: string;
  setFilterStatus: (value: string) => void;
  filterDateFrom: string;
  setFilterDateFrom: (value: string) => void;
  filterDateTo: string;
  setFilterDateTo: (value: string) => void;
  filterClient: string;
  setFilterClient: (value: string) => void;
  filterSeller: string;
  setFilterSeller: (value: string) => void;
  clients: Client[];
  sellers: { id: string; name: string }[];
  orders: Order[];
}

export function OrdersFilters({
  filterStatus,
  setFilterStatus,
  filterDateFrom,
  setFilterDateFrom,
  filterDateTo,
  setFilterDateTo,
  filterClient,
  setFilterClient,
  filterSeller,
  setFilterSeller,
  clients,
  sellers,
  orders,
}: OrdersFiltersProps) {
  const getStatusCount = (status: string) => {
    if (status === "all") return orders.length;
    return orders.filter((o) => o.status === status).length;
  };

  return (
    <div className="space-y-3">
      {/* Stats Cards */}
      <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
        <button
          onClick={() => setFilterStatus("all")}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border-2 transition-all whitespace-nowrap min-w-fit ${
            filterStatus === "all"
              ? "border-gray-900 bg-gray-900 text-white shadow-lg"
              : "bg-white border-gray-200 hover:border-gray-300 text-gray-700"
          }`}
        >
          <Filter className="h-4 w-4" />
          <span className="font-semibold">{getStatusCount("all")}</span>
          <span className="text-sm opacity-90">Todos</span>
        </button>

        {statusFlow.map((status) => {
          const count = getStatusCount(status);
          const config = statusConfig[status];
          const isActive = filterStatus === status;

          return (
            <button
              key={status}
              onClick={() => setFilterStatus(status)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border-2 transition-all whitespace-nowrap min-w-fit ${
                isActive
                  ? `${config.bgColor} ${config.borderColor} ${config.color} shadow-md ring-2 ring-offset-1`
                  : "bg-white border-gray-200 hover:border-gray-300"
              }`}
            >
              <div className={`w-2.5 h-2.5 rounded-full ${config.dotColor}`} />
              <span
                className={`font-semibold ${isActive ? config.color : "text-gray-900"}`}
              >
                {count}
              </span>
              <span
                className={`text-sm ${isActive ? "opacity-90" : "text-gray-500"}`}
              >
                {config.label}
              </span>
            </button>
          );
        })}
      </div>

      {/* Advanced Filters */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 p-4 bg-gray-50/80 rounded-xl border border-gray-200">
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-gray-600 flex items-center gap-1.5">
            <Calendar className="h-3.5 w-3.5" />
            Desde
          </label>
          <Input
            type="date"
            value={filterDateFrom}
            onChange={(e) => setFilterDateFrom(e.target.value)}
            className="bg-white"
          />
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-medium text-gray-600 flex items-center gap-1.5">
            <Calendar className="h-3.5 w-3.5" />
            Hasta
          </label>
          <Input
            type="date"
            value={filterDateTo}
            onChange={(e) => setFilterDateTo(e.target.value)}
            className="bg-white"
          />
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-medium text-gray-600 flex items-center gap-1.5">
            <User className="h-3.5 w-3.5" />
            Cliente
          </label>
          <Select
            value={filterClient || "all-clients"}
            onValueChange={(value) =>
              setFilterClient(value === "all-clients" ? "" : value)
            }
          >
            <SelectTrigger className="bg-white">
              <SelectValue placeholder="Todos los clientes" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all-clients">Todos los clientes</SelectItem>
              {clients.map((client) => (
                <SelectItem key={client.id} value={client.id}>
                  {client.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-medium text-gray-600 flex items-center gap-1.5">
            <Store className="h-3.5 w-3.5" />
            Vendedor
          </label>
          <Select
            value={filterSeller || "all-sellers"}
            onValueChange={(value) =>
              setFilterSeller(value === "all-sellers" ? "" : value)
            }
          >
            <SelectTrigger className="bg-white">
              <SelectValue placeholder="Todos los vendedores" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all-sellers">Todos los vendedores</SelectItem>
              {sellers.map((seller) => (
                <SelectItem key={seller.id} value={seller.id}>
                  {seller.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
    </div>
  );
}
