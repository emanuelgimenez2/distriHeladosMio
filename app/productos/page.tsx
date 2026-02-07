"use client";

import { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { MainLayout } from "@/components/layout/main-layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { ProductModal } from "@/components/productos/product-modal";
import { StockHistoryModal } from "@/components/productos/stock-history-modal";
import { InventoryValueHistory } from "@/components/productos/inventory-value-history";
import { productsApi } from "@/lib/api";
import type { Product } from "@/lib/types";
import {
  Plus,
  Search,
  Pencil,
  ArrowLeft,
  Filter,
  X,
  Grid3x3,
  List,
  Package,
  Tag,
  DollarSign,
  AlertCircle,
  CheckCircle2,
  Copy,
  Check,
  History,
  TrendingUp,
  WheatOff,
  EyeOff,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";

// Tipos para los filtros
type PriceFilter = "all" | "0-2800" | "2801-3000" | "3001-3200" | "3201+";
type BaseFilter = "all" | "crema" | "agua";
type StockFilter = "all" | "available" | "low" | "out";
type CategoryFilter = "all" | "Clásicos" | "Premium" | "Especiales" | "Frutas";
type SinTaccFilter = "all" | "sin-tacc" | "con-tacc";
type ViewMode = "grid" | "list";

// Tipos para historiales
export interface StockMovement {
  id: string;
  productId: string;
  productName: string;
  type:
    | "sale"
    | "manual_add"
    | "manual_remove"
    | "deactivation"
    | "creation"
    | "bulk_operation";
  previousStock: number;
  newStock: number;
  change: number;
  date: Date;
  reason?: string;
  saleId?: string;
  saleTotal?: number;
  sellerId?: string;
  sellerName?: string;
  clientId?: string;
  clientName?: string;
  userId?: string;
  userName?: string;
  details?: string;
}

export interface InventorySnapshot {
  id: string;
  date: Date;
  totalValue: number;
  productCount: number;
  lowStockCount: number;
  outOfStockCount: number;
}

export default function ProductosPage() {
  const router = useRouter();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [deactivateDialogOpen, setDeactivateDialogOpen] = useState(false);
  const [productToDeactivate, setProductToDeactivate] =
    useState<Product | null>(null);
  const [bulkDeactivateDialogOpen, setBulkDeactivateDialogOpen] =
    useState(false);

  // Estados para filtros
  const [viewMode, setViewMode] = useState<ViewMode>("grid");
  const [categoryFilter, setCategoryFilter] = useState<CategoryFilter>("all");
  const [priceFilter, setPriceFilter] = useState<PriceFilter>("all");
  const [baseFilter, setBaseFilter] = useState<BaseFilter>("all");
  const [stockFilter, setStockFilter] = useState<StockFilter>("all");
  const [sinTaccFilter, setSinTaccFilter] = useState<SinTaccFilter>("all");
  const [selectedProducts, setSelectedProducts] = useState<string[]>([]);
  const [showFilters, setShowFilters] = useState(false);

  // Estados para historiales
  const [stockHistory, setStockHistory] = useState<StockMovement[]>([]);
  const [inventoryHistory, setInventoryHistory] = useState<InventorySnapshot[]>(
    [],
  );
  const [showStockHistory, setShowStockHistory] = useState(false);
  const [selectedProductHistory, setSelectedProductHistory] =
    useState<Product | null>(null);
  const [showInventoryHistory, setShowInventoryHistory] = useState(false);

  useEffect(() => {
    loadProducts();
    loadStockHistory();
    loadInventoryHistory();
  }, []);

  useEffect(() => {
    if (products.length > 0 && !loading) {
      saveInventorySnapshot();
    }
  }, [products.length]);

  const loadProducts = async () => {
    try {
      const data = await productsApi.getAll();
      setProducts(data);
    } catch (error) {
      console.error("Error loading products:", error);
    } finally {
      setLoading(false);
    }
  };

  const loadStockHistory = () => {
    const saved = localStorage.getItem("stockHistory");
    if (saved) {
      const parsed = JSON.parse(saved);
      setStockHistory(
        parsed.map((h: any) => ({
          ...h,
          date: new Date(h.date),
        })),
      );
    }
  };

  const saveStockHistory = (history: StockMovement[]) => {
    localStorage.setItem("stockHistory", JSON.stringify(history));
    setStockHistory(history);
  };

  const loadInventoryHistory = () => {
    const saved = localStorage.getItem("inventoryHistory");
    if (saved) {
      const parsed = JSON.parse(saved);
      setInventoryHistory(
        parsed.map((h: any) => ({
          ...h,
          date: new Date(h.date),
        })),
      );
    }
  };

  const saveInventorySnapshot = () => {
    const totalValue = products.reduce((sum, p) => sum + p.price * p.stock, 0);
    const lowStockCount = products.filter(
      (p) => p.stock > 0 && p.stock < 10,
    ).length;
    const outOfStockCount = products.filter((p) => p.stock === 0).length;

    const newSnapshot: InventorySnapshot = {
      id: Date.now().toString(),
      date: new Date(),
      totalValue,
      productCount: products.length,
      lowStockCount,
      outOfStockCount,
    };

    const updated = [...inventoryHistory, newSnapshot].slice(-30);
    localStorage.setItem("inventoryHistory", JSON.stringify(updated));
    setInventoryHistory(updated);
  };

  const logStockMovement = (movement: Omit<StockMovement, "id" | "date">) => {
    const newMovement: StockMovement = {
      ...movement,
      id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
      date: new Date(),
    };
    const updated = [newMovement, ...stockHistory].slice(0, 200);
    saveStockHistory(updated);
    return newMovement;
  };

  const logSaleMovement = (
    product: Product,
    quantity: number,
    saleId: string,
    saleTotal: number,
    sellerName?: string,
    clientName?: string,
  ) => {
    return logStockMovement({
      productId: product.id,
      productName: product.name,
      type: "sale",
      previousStock: product.stock + quantity,
      newStock: product.stock,
      change: -quantity,
      reason: `Venta realizada${sellerName ? ` por ${sellerName}` : ""}`,
      saleId,
      saleTotal,
      sellerName,
      clientName,
      details: `Se vendieron ${quantity} unidad(es) por ${formatCurrency(product.price * quantity)}`,
    });
  };

  // NUEVO: Deshabilitar (en lugar de eliminar)
  const logDisableMovement = (product: Product, reason?: string) => {
    return logStockMovement({
      productId: product.id,
      productName: product.name,
      type: "deactivation",
      previousStock: product.stock,
      newStock: product.stock,
      change: 0,
      reason: reason || "Producto deshabilitado",
      details: `Se deshabilitó "${product.name}". Stock conservado: ${product.stock}`,
    });
  };
  const logEnableMovement = (product: Product, reason?: string) => {
    return logStockMovement({
      productId: product.id,
      productName: product.name,
      type: "manual_add",
      previousStock: product.stock,
      newStock: product.stock,
      change: 0,
      reason: reason || "Producto habilitado",
      details: `Se volvió a habilitar "${product.name}"`,
    });
  };

  const logManualAdd = (
    product: Product,
    quantity: number,
    userName?: string,
    reason?: string,
  ) => {
    return logStockMovement({
      productId: product.id,
      productName: product.name,
      type: "manual_add",
      previousStock: product.stock - quantity,
      newStock: product.stock,
      change: quantity,
      reason: reason || "Suma de inventario",
      userName,
      details: `Se agregaron ${quantity} unidad(es) al stock`,
    });
  };

  const logManualRemove = (
    product: Product,
    quantity: number,
    userName?: string,
    reason?: string,
  ) => {
    return logStockMovement({
      productId: product.id,
      productName: product.name,
      type: "manual_remove",
      previousStock: product.stock + quantity,
      newStock: product.stock,
      change: -quantity,
      reason: reason || "Resta de inventario",
      userName,
      details: `Se quitaron ${quantity} unidad(es) del stock`,
    });
  };

  const handleCreate = () => {
    setEditingProduct(null);
    setModalOpen(true);
  };

  const handleEdit = (product: Product) => {
    setEditingProduct(product);
    setModalOpen(true);
  };

  // NUEVO: Abrir diálogo de Deshabilitar
  const handleDeactivate = (product: Product) => {
    setProductToDeactivate(product);
    setDeactivateDialogOpen(true);
  };
  const handleEnable = async (product: Product) => {
    try {
      logEnableMovement(product, "Habilitado manualmente");

      await productsApi.update(product.id, {
        disabled: false,
      } as any);

      setProducts((prev) =>
        prev.map((p) => (p.id === product.id ? { ...p, disabled: false } : p)),
      );

      toast.success(`"${product.name}" habilitado`);
    } catch (error) {
      console.error(error);
      toast.error("Error al habilitar producto");
    }
  };

  // Confirmar deshabilitar producto
  const confirmDeactivate = async () => {
    if (!productToDeactivate) return;

    try {
      // Log del movimiento
      logDisableMovement(productToDeactivate, "Deshabilitado manualmente");

      // Actualizar en Firebase (solo lo necesario)
      await productsApi.update(productToDeactivate.id, {
        disabled: true,
      } as any);

      // Actualizar estado local
      setProducts((prev) =>
        prev.map((p) =>
          p.id === productToDeactivate.id ? { ...p, disabled: true } : p,
        ),
      );

      toast.success(`"${productToDeactivate.name}" deshabilitado`);
    } catch (error) {
      console.error(error);
      toast.error("Error al deshabilitar producto");
    } finally {
      setDeactivateDialogOpen(false);
      setProductToDeactivate(null);
    }
  };

  const handleBulkDeactivate = () => {
    setBulkDeactivateDialogOpen(true);
  };

  const confirmBulkDeactivate = async () => {
    try {
      const productsToDisable = products.filter((p) =>
        selectedProducts.includes(p.id),
      );

      productsToDisable.forEach((product) => {
        logDisableMovement(
          product,
          `Deshabilitado masivo (${selectedProducts.length} productos)`,
        );
      });

      await Promise.all(
        selectedProducts.map((id) =>
          productsApi.update(id, { disabled: true } as any),
        ),
      );

      const updatedProducts = products.map((p) =>
        selectedProducts.includes(p.id) ? { ...p, disabled: true } : p,
      );

      setProducts(updatedProducts);
      setSelectedProducts([]);

      toast.success(`${productsToDisable.length} productos deshabilitados`);
    } catch (error) {
      console.error(error);
      toast.error("Error al deshabilitar productos");
    } finally {
      setBulkDeactivateDialogOpen(false);
    }
  };

  const handleSave = async (productData: Omit<Product, "id" | "createdAt">) => {
    try {
      if (editingProduct) {
        // Detectar cambio de stock
        if (productData.stock !== editingProduct.stock) {
          const change = productData.stock - editingProduct.stock;
          if (change > 0) {
            logManualAdd(
              editingProduct,
              change,
              undefined,
              "Edición desde modal",
            );
          } else if (change < 0) {
            logManualRemove(
              editingProduct,
              Math.abs(change),
              undefined,
              "Edición desde modal",
            );
          }
        }

        const updated = await productsApi.update(
          editingProduct.id,
          productData,
        );
        setProducts(
          products.map((p) => (p.id === editingProduct.id ? updated : p)),
        );
      } else {
        const newProduct = await productsApi.create(productData);
        setProducts([...products, newProduct]);

        logStockMovement({
          productId: newProduct.id,
          productName: newProduct.name,
          type: "creation",
          previousStock: 0,
          newStock: newProduct.stock,
          change: newProduct.stock,
          reason: "Creación de nuevo producto",
          details: `Stock inicial: ${newProduct.stock} unidades`,
        });
      }
      setModalOpen(false);
    } catch (error) {
      console.error("Error saving product:", error);
    }
  };

  const handleViewHistory = (product: Product) => {
    setSelectedProductHistory(product);
    setShowStockHistory(true);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("es-AR", {
      style: "currency",
      currency: "ARS",
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const filteredProducts = useMemo(() => {
    return products.filter((product) => {
      const matchesSearch =
        product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        product.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
        product.description.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesCategory =
        categoryFilter === "all" || product.category === categoryFilter;

      let matchesPrice = true;
      switch (priceFilter) {
        case "0-2800":
          matchesPrice = product.price <= 2800;
          break;
        case "2801-3000":
          matchesPrice = product.price > 2800 && product.price <= 3000;
          break;
        case "3001-3200":
          matchesPrice = product.price > 3000 && product.price <= 3200;
          break;
        case "3201+":
          matchesPrice = product.price > 3200;
          break;
      }

      const matchesBase =
        baseFilter === "all" || (product as any).base === baseFilter;

      const matchesSinTacc =
        sinTaccFilter === "all" ||
        (sinTaccFilter === "sin-tacc" && (product as any).sinTacc === true) ||
        (sinTaccFilter === "con-tacc" && (product as any).sinTacc !== true);

      let matchesStock = true;
      switch (stockFilter) {
        case "available":
          matchesStock = product.stock > 0;
          break;
        case "low":
          matchesStock = product.stock > 0 && product.stock < 10;
          break;
        case "out":
          matchesStock = product.stock === 0;
          break;
      }

      return (
        matchesSearch &&
        matchesCategory &&
        matchesPrice &&
        matchesBase &&
        matchesSinTacc &&
        matchesStock
      );
    });
  }, [
    products,
    searchQuery,
    categoryFilter,
    priceFilter,
    baseFilter,
    sinTaccFilter,
    stockFilter,
  ]);

  const stats = useMemo(() => {
    const totalProducts = filteredProducts.length;
    const totalInventoryValue = filteredProducts.reduce(
      (sum, p) => sum + p.price * p.stock,
      0,
    );
    const lowStockCount = filteredProducts.filter(
      (p) => p.stock > 0 && p.stock < 10,
    ).length;
    const outOfStockCount = filteredProducts.filter(
      (p) => p.stock === 0,
    ).length;

    return {
      totalProducts,
      totalInventoryValue,
      lowStockCount,
      outOfStockCount,
    };
  }, [filteredProducts]);

  const activeFilterCount = [
    categoryFilter !== "all",
    priceFilter !== "all",
    baseFilter !== "all",
    stockFilter !== "all",
    sinTaccFilter !== "all",
  ].filter(Boolean).length;

  const clearFilters = () => {
    setCategoryFilter("all");
    setPriceFilter("all");
    setBaseFilter("all");
    setStockFilter("all");
    setSinTaccFilter("all");
    setSearchQuery("");
  };

  const toggleProductSelection = (productId: string) => {
    setSelectedProducts((prev) =>
      prev.includes(productId)
        ? prev.filter((id) => id !== productId)
        : [...prev, productId],
    );
  };

  const toggleSelectAll = () => {
    if (selectedProducts.length === filteredProducts.length) {
      setSelectedProducts([]);
    } else {
      setSelectedProducts(filteredProducts.map((p) => p.id));
    }
  };

  const handleDuplicate = async (product: Product) => {
    try {
      const { id: _, createdAt: __, ...productData } = product;
      const newProduct = await productsApi.create({
        ...productData,
        name: `${product.name} (copia)`,
      });

      logStockMovement({
        productId: newProduct.id,
        productName: newProduct.name,
        type: "creation",
        previousStock: 0,
        newStock: newProduct.stock,
        change: newProduct.stock,
        reason: `Duplicación`,
        details: `Copia de "${product.name}"`,
      });

      setProducts([...products, newProduct]);
    } catch (error) {
      console.error("Error duplicating product:", error);
    }
  };

  const getStockColor = (stock: number) => {
    if (stock === 0) return "destructive";
    if (stock < 10) return "warning";
    return "success";
  };

  const getStockText = (stock: number) => {
    if (stock === 0) return "Sin stock";
    if (stock < 10) return "Bajo stock";
    return "Disponible";
  };

  const GridSkeleton = () => (
    <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-4 xl:grid-cols-4 gap-2 sm:gap-4">
      {[...Array(8)].map((_, i) => (
        <div
          key={i}
          className="rounded-xl border border-border bg-card overflow-hidden"
        >
          <Skeleton className="h-32 sm:h-48 w-full" />
          <div className="p-2 sm:p-4 space-y-2 sm:space-y-3">
            <Skeleton className="h-3 sm:h-4 w-3/4" />
            <Skeleton className="h-2 sm:h-3 w-1/4" />
            <div className="flex justify-between">
              <Skeleton className="h-2 sm:h-4 w-1/3" />
              <Skeleton className="h-2 sm:h-4 w-1/4" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );

  const ListSkeleton = () => (
    <div className="space-y-3">
      {[...Array(5)].map((_, i) => (
        <div
          key={i}
          className="flex items-center gap-4 p-4 rounded-xl border border-border bg-card"
        >
          <Skeleton className="h-16 w-16 rounded-lg" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-1/3" />
            <Skeleton className="h-3 w-1/4" />
          </div>
        </div>
      ))}
    </div>
  );

  return (
    <MainLayout title="Productos" description="Gestiona tu catálogo de helados">
      {/* Header */}
      <div className="mb-4 sm:mb-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => router.back()}
              aria-label="Volver"
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-foreground">
                Productos
              </h1>
              <p className="text-xs sm:text-sm text-muted-foreground">
                Gestiona tu catálogo de helados
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1 sm:gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowInventoryHistory(true)}
              className="gap-1 sm:gap-2 h-8 sm:h-9 px-2 sm:px-3"
            >
              <TrendingUp className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
              <span className="hidden sm:inline">Valor Inventario</span>
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowFilters(!showFilters)}
              className="gap-1 sm:gap-2 h-8 sm:h-9 px-2 sm:px-3"
            >
              <Filter className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
              <span className="hidden sm:inline">Filtros</span>
              {activeFilterCount > 0 && (
                <Badge
                  variant="secondary"
                  className="ml-0.5 h-4 w-4 sm:h-5 sm:w-5 p-0 flex items-center justify-center text-[10px] sm:text-xs"
                >
                  {activeFilterCount}
                </Badge>
              )}
            </Button>

            <div className="hidden sm:flex border border-border rounded-lg">
              <Button
                variant={viewMode === "grid" ? "secondary" : "ghost"}
                size="sm"
                className="rounded-r-none border-0 h-9"
                onClick={() => setViewMode("grid")}
              >
                <Grid3x3 className="h-4 w-4" />
              </Button>
              <Button
                variant={viewMode === "list" ? "secondary" : "ghost"}
                size="sm"
                className="rounded-l-none border-0 h-9"
                onClick={() => setViewMode("list")}
              >
                <List className="h-4 w-4" />
              </Button>
            </div>

            <Button
              onClick={handleCreate}
              className="gap-1 sm:gap-2 bg-primary hover:bg-primary/90 h-8 sm:h-9 px-2 sm:px-3"
            >
              <Plus className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
              <span className="hidden sm:inline">Nuevo</span>
              <span className="sm:hidden text-xs">Nuevo</span>
            </Button>
          </div>
        </div>

        {/* Barra de búsqueda */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar productos..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 pr-10 h-10 sm:h-11 text-sm"
          />
          {searchQuery && (
            <Button
              variant="ghost"
              size="icon"
              className="absolute right-2 top-1/2 -translate-y-1/2 h-7 w-7"
              onClick={() => setSearchQuery("")}
            >
              <X className="h-3 w-3" />
            </Button>
          )}
        </div>
      </div>

      {/* Filtros */}
      {showFilters && (
        <div className="mb-4 sm:mb-6 p-3 sm:p-4 rounded-xl border border-border bg-card/50 backdrop-blur-sm">
          <div className="flex items-center justify-between mb-3 sm:mb-4">
            <h3 className="font-medium text-sm sm:text-base">Filtros</h3>
            <div className="flex items-center gap-2">
              {activeFilterCount > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={clearFilters}
                  className="gap-1 h-7 sm:h-8 text-xs"
                >
                  <X className="h-3 w-3" />
                  Limpiar
                </Button>
              )}
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 sm:h-8 sm:w-8"
                onClick={() => setShowFilters(false)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4">
            {/* Categorías */}
            <div className="col-span-2 sm:col-span-1">
              <label className="text-xs sm:text-sm font-medium mb-1.5 sm:mb-2 block">
                Categorías
              </label>
              <div className="flex flex-wrap gap-1.5 sm:gap-2">
                {(
                  [
                    "all",
                    "Clásicos",
                    "Premium",
                    "Especiales",
                    "Frutas",
                  ] as const
                ).map((cat) => (
                  <Badge
                    key={cat}
                    variant={categoryFilter === cat ? "default" : "outline"}
                    className="cursor-pointer hover:bg-primary/10 transition-colors text-xs py-0.5"
                    onClick={() => setCategoryFilter(cat)}
                  >
                    {cat === "all" ? "Todas" : cat}
                  </Badge>
                ))}
              </div>
            </div>

            {/* Precio */}
            <div>
              <label className="text-xs sm:text-sm font-medium mb-1.5 sm:mb-2 block">
                Precio
              </label>
              <div className="flex flex-wrap gap-1.5 sm:gap-2">
                {(
                  ["all", "0-2800", "2801-3000", "3001-3200", "3201+"] as const
                ).map((price) => (
                  <Badge
                    key={price}
                    variant={priceFilter === price ? "default" : "outline"}
                    className="cursor-pointer hover:bg-primary/10 transition-colors text-xs py-0.5"
                    onClick={() => setPriceFilter(price)}
                  >
                    {price === "all"
                      ? "Todos"
                      : price === "3201+"
                        ? "+$3.2k"
                        : `$${price.split("-")[1]}`}
                  </Badge>
                ))}
              </div>
            </div>

            {/* Base */}
            <div>
              <label className="text-xs sm:text-sm font-medium mb-1.5 sm:mb-2 block">
                Base
              </label>
              <div className="flex flex-wrap gap-1.5 sm:gap-2">
                {(["all", "crema", "agua"] as const).map((base) => (
                  <Badge
                    key={base}
                    variant={baseFilter === base ? "default" : "outline"}
                    className="cursor-pointer hover:bg-primary/10 transition-colors text-xs py-0.5 capitalize"
                    onClick={() => setBaseFilter(base)}
                  >
                    {base === "all" ? "Todas" : base}
                  </Badge>
                ))}
              </div>
            </div>

            {/* Sin TACC */}
            <div>
              <label className="text-xs sm:text-sm font-medium mb-1.5 sm:mb-2 block">
                Contenido
              </label>
              <div className="flex flex-wrap gap-1.5 sm:gap-2">
                {(
                  [
                    { id: "all", label: "Todos" },
                    { id: "sin-tacc", label: "Sin TACC", icon: WheatOff },
                    { id: "con-tacc", label: "Con TACC" },
                  ] as const
                ).map((option) => (
                  <Badge
                    key={option.id}
                    variant={
                      sinTaccFilter === option.id ? "default" : "outline"
                    }
                    className={cn(
                      "cursor-pointer hover:bg-primary/10 transition-colors gap-1 text-xs py-0.5",
                      option.id === "sin-tacc" &&
                        sinTaccFilter !== "sin-tacc" &&
                        "border-green-200 text-green-700 hover:bg-green-50",
                    )}
                    onClick={() => setSinTaccFilter(option.id as SinTaccFilter)}
                  >
                    {option.icon && <option.icon className="h-3 w-3" />}
                    <span className="hidden sm:inline">{option.label}</span>
                    <span className="sm:hidden">
                      {option.id === "sin-tacc"
                        ? "S/TACC"
                        : option.id === "con-tacc"
                          ? "C/TACC"
                          : "Todos"}
                    </span>
                  </Badge>
                ))}
              </div>
            </div>

            {/* Stock */}
            <div>
              <label className="text-xs sm:text-sm font-medium mb-1.5 sm:mb-2 block">
                Stock
              </label>
              <div className="flex flex-wrap gap-1.5 sm:gap-2">
                {(["all", "available", "low", "out"] as const).map((stock) => (
                  <Badge
                    key={stock}
                    variant={stockFilter === stock ? "default" : "outline"}
                    className={cn(
                      "cursor-pointer transition-colors text-xs py-0.5",
                      stock === "low" &&
                        stockFilter !== stock &&
                        "border-amber-200 text-amber-700 hover:bg-amber-50",
                      stock === "out" &&
                        stockFilter !== stock &&
                        "border-destructive/20 text-destructive hover:bg-destructive/10",
                    )}
                    onClick={() => setStockFilter(stock)}
                  >
                    {stock === "all"
                      ? "Todos"
                      : stock === "available"
                        ? "Disp."
                        : stock === "low"
                          ? "Bajo"
                          : "Sin"}
                  </Badge>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Estadísticas - Responsive */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 sm:gap-3 mb-4 sm:mb-6">
        <div className="rounded-xl bg-gradient-to-br from-blue-50 to-blue-100 border border-blue-200 p-3 sm:p-4">
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="h-8 w-8 sm:h-10 sm:w-10 rounded-lg bg-blue-100 flex items-center justify-center">
              <Package className="h-4 w-4 sm:h-5 sm:w-5 text-blue-600" />
            </div>
            <div>
              <p className="text-[10px] sm:text-sm text-muted-foreground">
                Total
              </p>
              <p className="text-lg sm:text-2xl font-bold text-foreground">
                {stats.totalProducts}
              </p>
            </div>
          </div>
        </div>

        <div className="rounded-xl bg-gradient-to-br from-emerald-50 to-emerald-100 border border-emerald-200 p-3 sm:p-4">
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="h-8 w-8 sm:h-10 sm:w-10 rounded-lg bg-emerald-100 flex items-center justify-center">
              <DollarSign className="h-4 w-4 sm:h-5 sm:w-5 text-emerald-600" />
            </div>
            <div>
              <p className="text-[10px] sm:text-sm text-muted-foreground">
                Valor
              </p>
              <p className="text-lg sm:text-2xl font-bold text-foreground truncate">
                {new Intl.NumberFormat("es-AR", {
                  notation: "compact",
                  compactDisplay: "short",
                  maximumFractionDigits: 1,
                }).format(stats.totalInventoryValue)}
              </p>
            </div>
          </div>
        </div>

        <div className="rounded-xl bg-gradient-to-br from-amber-50 to-amber-100 border border-amber-200 p-3 sm:p-4">
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="h-8 w-8 sm:h-10 sm:w-10 rounded-lg bg-amber-100 flex items-center justify-center">
              <AlertCircle className="h-4 w-4 sm:h-5 sm:w-5 text-amber-600" />
            </div>
            <div>
              <p className="text-[10px] sm:text-sm text-muted-foreground">
                Bajo
              </p>
              <p className="text-lg sm:text-2xl font-bold text-foreground">
                {stats.lowStockCount}
              </p>
            </div>
          </div>
        </div>

        <div className="rounded-xl bg-gradient-to-br from-rose-50 to-rose-100 border border-rose-200 p-3 sm:p-4">
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="h-8 w-8 sm:h-10 sm:w-10 rounded-lg bg-rose-100 flex items-center justify-center">
              <X className="h-4 w-4 sm:h-5 sm:w-5 text-rose-600" />
            </div>
            <div>
              <p className="text-[10px] sm:text-sm text-muted-foreground">
                Sin stock
              </p>
              <p className="text-lg sm:text-2xl font-bold text-foreground">
                {stats.outOfStockCount}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Barra de selección masiva - AHORA CON "Deshabilitar" */}
      {selectedProducts.length > 0 && (
        <div className="mb-4 p-3 rounded-lg border border-border bg-card/80 backdrop-blur-sm flex items-center justify-between">
          <div className="flex items-center gap-3">
            <CheckCircle2 className="h-5 w-5 text-primary" />
            <span className="font-medium text-sm">
              {selectedProducts.length} seleccionados
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              className="gap-2"
              onClick={handleBulkDeactivate}
            >
              <EyeOff className="h-4 w-4" />
              <span className="hidden sm:inline">Deshabilitar</span>
              <span className="sm:hidden">Sacar</span>
            </Button>
          </div>
        </div>
      )}

      {/* Contenido principal */}
      {loading ? (
        viewMode === "grid" ? (
          <GridSkeleton />
        ) : (
          <ListSkeleton />
        )
      ) : (
        <>
          {filteredProducts.length === 0 ? (
            <div className="rounded-xl border-2 border-dashed border-border bg-card/50 p-8 sm:p-12 text-center">
              <div className="max-w-md mx-auto space-y-4">
                <div className="h-12 w-12 sm:h-16 sm:w-16 rounded-full bg-muted flex items-center justify-center mx-auto">
                  <Package className="h-6 w-6 sm:h-8 sm:w-8 text-muted-foreground" />
                </div>
                <div>
                  <h3 className="text-base sm:text-lg font-medium mb-2">
                    No se encontraron productos
                  </h3>
                  <p className="text-muted-foreground text-sm mb-6">
                    {searchQuery || activeFilterCount > 0
                      ? "Prueba ajustando tus filtros"
                      : "Comienza agregando tu primer producto"}
                  </p>
                  <div className="flex flex-col sm:flex-row gap-3 justify-center">
                    <Button onClick={handleCreate} className="gap-2">
                      <Plus className="h-4 w-4" />
                      Agregar
                    </Button>
                    {(searchQuery || activeFilterCount > 0) && (
                      <Button variant="outline" onClick={clearFilters}>
                        Limpiar
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <>
              {/* Vista Grid - SIEMPRE 2 COLUMNAS EN MÓVIL */}
              {viewMode === "grid" ? (
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-4">
                  {filteredProducts.map((product) => {
                    const isSelected = selectedProducts.includes(product.id);
                    const stockColor = getStockColor(product.stock);
                    const imageSrc =
                      product.imageUrl && typeof product.imageUrl === "string"
                        ? product.imageUrl.startsWith("blob:")
                          ? "/placeholder.svg"
                          : product.imageUrl
                        : "/placeholder.svg";

                    return (
                      <div
                        key={product.id}
                        className={cn(
                          "group relative rounded-xl border-2 bg-card overflow-hidden transition-all duration-300 hover:shadow-lg",
                          isSelected
                            ? "border-primary ring-2 ring-primary/20"
                            : "border-border hover:border-primary/50",
                        )}
                      >
                        {/* Checkbox */}
                        <div className="absolute top-2 left-2 z-10">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleProductSelection(product.id);
                            }}
                            className={cn(
                              "h-4 w-4 sm:h-5 sm:w-5 rounded border flex items-center justify-center transition-colors bg-background/80 backdrop-blur",
                              isSelected
                                ? "bg-primary border-primary text-primary-foreground"
                                : "border-border hover:border-primary",
                            )}
                          >
                            {isSelected && (
                              <Check className="h-2.5 w-2.5 sm:h-3 sm:w-3" />
                            )}
                          </button>
                        </div>

                        {/* Badge Sin TACC */}
                        {(product as any).sinTacc && (
                          <div className="absolute top-2 right-2 z-10">
                            <Badge className="bg-green-100 text-green-800 border-green-200 text-[10px] sm:text-xs px-1.5 py-0">
                              <WheatOff className="h-2.5 w-2.5 sm:h-3 sm:w-3 mr-0.5" />
                              <span className="hidden sm:inline">Sin TACC</span>
                              <span className="sm:hidden">S/T</span>
                            </Badge>
                          </div>
                        )}
                        {(product as any).disabled && (
                          <div className="absolute top-8 left-2 z-10">
                            <Badge
                              variant="destructive"
                              className="text-[10px] sm:text-xs px-1.5 py-0 flex items-center gap-1"
                            >
                              <EyeOff className="h-3 w-3" />
                              Deshabilitado
                            </Badge>
                          </div>
                        )}

                        {/* Badge Base */}
                        {(product as any).base && (
                          <div className="absolute top-2 left-1/2 -translate-x-1/2 z-10">
                            <Badge
                              variant="secondary"
                              className="text-[10px] sm:text-xs px-1.5 py-0 capitalize bg-background/80 backdrop-blur"
                            >
                              {(product as any).base}
                            </Badge>
                          </div>
                        )}

                        {/* Imagen */}
                        <div className="relative aspect-[4/3] overflow-hidden bg-muted">
                          <img
                            src={imageSrc}
                            alt={product.name}
                            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                          />

                          {/* Stock badge */}
                          <div className="absolute bottom-2 right-2">
                            <Badge
                              variant={
                                stockColor === "destructive"
                                  ? "destructive"
                                  : stockColor === "warning"
                                    ? "secondary"
                                    : "outline"
                              }
                              className={cn(
                                "font-medium text-[10px] sm:text-xs px-1.5 py-0",
                                stockColor === "warning" &&
                                  "bg-amber-100 text-amber-800 border-amber-200",
                                stockColor === "success" &&
                                  "bg-green-100 text-green-800 border-green-200",
                              )}
                            >
                              {product.stock}
                            </Badge>
                          </div>
                        </div>

                        {/* Contenido */}
                        <div className="p-2 sm:p-4">
                          <div className="mb-1 sm:mb-2">
                            <h3 className="font-semibold text-foreground text-xs sm:text-base line-clamp-1">
                              {product.name}
                            </h3>
                            <p className="text-[10px] sm:text-sm text-muted-foreground line-clamp-1 sm:line-clamp-2 min-h-[1rem] sm:min-h-[2.5rem]">
                              {product.description}
                            </p>
                          </div>

                          <div className="flex items-center justify-between mb-2 sm:mb-4">
                            <Badge
                              variant="outline"
                              className="text-[10px] sm:text-xs px-1.5 py-0"
                            >
                              <Tag className="h-2.5 w-2.5 sm:h-3 sm:w-3 mr-0.5 sm:mr-1" />
                              <span className="truncate max-w-[60px] sm:max-w-none">
                                {product.category}
                              </span>
                            </Badge>
                            <span className="text-sm sm:text-lg font-bold text-primary">
                              {formatCurrency(product.price)}
                            </span>
                          </div>

                          {/* Acciones - Solo Editar y Ver Historial en móvil */}
                          <div className="flex items-center justify-end gap-2 min-w-[140px]">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              onClick={() => handleViewHistory(product)}
                              title="Historial"
                            >
                              <History className="h-3.5 w-3.5" />
                            </Button>

                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              onClick={() => handleDuplicate(product)}
                              title="Duplicar"
                            >
                              <Copy className="h-3.5 w-3.5" />
                            </Button>

                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              onClick={() => handleEdit(product)}
                              title="Editar"
                            >
                              <Pencil className="h-3.5 w-3.5" />
                            </Button>

                            {(product as any).disabled ? (
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-green-600 hover:text-green-700"
                                onClick={() => handleEnable(product)}
                                title="Habilitar producto"
                              >
                                <CheckCircle2 className="h-4 w-4" />
                              </Button>
                            ) : (
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-amber-600 hover:text-amber-700"
                                onClick={() => handleDeactivate(product)}
                                title="Deshabilitar"
                              >
                                <EyeOff className="h-3.5 w-3.5" />
                              </Button>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                /* Vista Lista */
                <div className="space-y-3">
                  {/* Header */}
                  <div className="flex items-center gap-4 p-4 rounded-xl border border-border bg-card">
                    <div className="flex items-center gap-4 flex-1">
                      <button
                        onClick={toggleSelectAll}
                        className={cn(
                          "h-5 w-5 rounded border flex items-center justify-center transition-colors",
                          selectedProducts.length === filteredProducts.length &&
                            selectedProducts.length > 0
                            ? "bg-primary border-primary text-primary-foreground"
                            : "bg-background border-border hover:border-primary",
                        )}
                      >
                        {selectedProducts.length === filteredProducts.length &&
                          selectedProducts.length > 0 && (
                            <Check className="h-3 w-3" />
                          )}
                      </button>
                      <span className="text-sm font-medium text-muted-foreground min-w-[150px]">
                        Producto
                      </span>
                    </div>
                    <span className="text-sm font-medium text-muted-foreground min-w-[100px]">
                      Categoría
                    </span>
                    <span className="text-sm font-medium text-muted-foreground min-w-[100px] text-right">
                      Precio
                    </span>
                    <span className="text-sm font-medium text-muted-foreground min-w-[100px] text-right">
                      Stock
                    </span>
                    <span className="text-sm font-medium text-muted-foreground min-w-[140px] text-right">
                      Acciones
                    </span>
                  </div>

                  {/* Items */}
                  {filteredProducts.map((product) => {
                    const isSelected = selectedProducts.includes(product.id);
                    const stockColor = getStockColor(product.stock);

                    return (
                      <div
                        key={product.id}
                        className={cn(
                          "flex items-center gap-4 p-4 rounded-xl border border-border bg-card transition-all hover:shadow-md",
                          isSelected &&
                            "border-primary border-2 ring-1 ring-primary/20",
                        )}
                      >
                        <div className="flex items-center gap-4 flex-1">
                          <button
                            onClick={() => toggleProductSelection(product.id)}
                            className={cn(
                              "h-5 w-5 rounded border flex items-center justify-center transition-colors",
                              isSelected
                                ? "bg-primary border-primary text-primary-foreground"
                                : "bg-background border-border hover:border-primary",
                            )}
                          >
                            {isSelected && <Check className="h-3 w-3" />}
                          </button>

                          <div className="flex items-center gap-3 min-w-0">
                            <img
                              src={product.imageUrl || "/placeholder.svg"}
                              alt={product.name}
                              className="h-12 w-12 rounded-lg object-cover"
                            />
                            <div className="min-w-0">
                              <div className="flex items-center gap-2">
                                <h4 className="font-medium text-foreground truncate">
                                  {product.name}
                                </h4>
                                {(product as any).sinTacc && (
                                  <WheatOff
                                    className="h-3 w-3 text-green-600"
                                    title="Sin TACC"
                                  />
                                )}
                              </div>
                              <p className="text-sm text-muted-foreground truncate">
                                {product.description}
                              </p>
                            </div>
                          </div>
                        </div>

                        <div className="min-w-[100px]">
                          <Badge variant="outline">{product.category}</Badge>
                          {(product as any).base && (
                            <div className="text-xs text-muted-foreground mt-1 capitalize">
                              {(product as any).base}
                            </div>
                          )}
                        </div>

                        <div className="min-w-[100px] text-right">
                          <span className="font-semibold text-primary">
                            {formatCurrency(product.price)}
                          </span>
                        </div>

                        <div className="min-w-[100px] text-right">
                          <Badge
                            variant={
                              stockColor === "destructive"
                                ? "destructive"
                                : stockColor === "warning"
                                  ? "secondary"
                                  : "outline"
                            }
                            className={cn(
                              "font-medium",
                              stockColor === "warning" &&
                                "bg-amber-100 text-amber-800 border-amber-200",
                            )}
                          >
                            {product.stock} uds
                          </Badge>
                        </div>

                        <div className="flex items-center justify-end gap-2 min-w-[140px]">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => handleViewHistory(product)}
                            title="Historial"
                          >
                            <History className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => handleDuplicate(product)}
                            title="Duplicar"
                          >
                            <Copy className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => handleEdit(product)}
                            title="Editar"
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-green-600 hover:text-green-700"
                            onClick={() => handleEnable(product)}
                            title="Habilitar producto"
                          >
                            <CheckCircle2 className="h-4 w-4" />
                          </Button>
                          ) : (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-amber-600 hover:text-amber-700"
                            onClick={() => handleDeactivate(product)}
                            title="Deshabilitar"
                          >
                            <EyeOff className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </>
          )}
        </>
      )}

      {/* Modales */}
      <ProductModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        product={editingProduct}
        onSave={handleSave}
      />

      <StockHistoryModal
        open={showStockHistory}
        onOpenChange={setShowStockHistory}
        product={selectedProductHistory}
        history={stockHistory.filter(
          (h) => h.productId === selectedProductHistory?.id,
        )}
      />

      <InventoryValueHistory
        open={showInventoryHistory}
        onOpenChange={setShowInventoryHistory}
        history={inventoryHistory}
      />

      {/* Diálogo Deshabilitar Individual */}
      <ConfirmDialog
        open={deactivateDialogOpen}
        onOpenChange={setDeactivateDialogOpen}
        title="Deshabilitar"
        description={`¿Está seguro que desea deshabilitar "${productToDeactivate?.name}"? El producto dejará de mostrarse pero conservará su stock.`}
        confirmText="Deshabilitar"
        onConfirm={confirmDeactivate}
        variant="destructive"
      />

      {/* Diálogo Deshabilitar Masivo */}
      <ConfirmDialog
        open={bulkDeactivateDialogOpen}
        onOpenChange={setBulkDeactivateDialogOpen}
        title="Sacar Productos de Stock"
        description={`¿Está seguro que desea deshabilitar ${selectedProducts.length} productos? Dejarán de mostrarse pero conservarán su stock.`}
        confirmText="Deshabilitar"
        onConfirm={confirmBulkDeactivate}
        variant="destructive"
      />
    </MainLayout>
  );
}
