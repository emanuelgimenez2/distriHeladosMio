'use client'

import { useEffect, useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { MainLayout } from '@/components/layout/main-layout'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { ProductModal } from '@/components/productos/product-modal'
import { productsApi } from '@/lib/api'
import type { Product } from '@/lib/types'
import { 
  Plus, 
  Search, 
  Pencil, 
  Trash2, 
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
  Download,
  Check,
  Sliders,
  Eye,
  EyeOff
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Skeleton } from '@/components/ui/skeleton'

// Tipos para los filtros
type PriceFilter = 'all' | '0-2800' | '2801-3000' | '3001-3200' | '3201+'
type BaseFilter = 'all' | 'crema' | 'agua'
type StockFilter = 'all' | 'available' | 'low' | 'out'
type CategoryFilter = 'all' | 'Clásicos' | 'Premium' | 'Especiales' | 'Frutas'
type ViewMode = 'grid' | 'list'

export default function ProductosPage() {
  const router = useRouter()
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [modalOpen, setModalOpen] = useState(false)
  const [editingProduct, setEditingProduct] = useState<Product | null>(null)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [productToDelete, setProductToDelete] = useState<Product | null>(null)
  
  // Estados para filtros
  const [viewMode, setViewMode] = useState<ViewMode>('grid')
  const [categoryFilter, setCategoryFilter] = useState<CategoryFilter>('all')
  const [priceFilter, setPriceFilter] = useState<PriceFilter>('all')
  const [baseFilter, setBaseFilter] = useState<BaseFilter>('all')
  const [stockFilter, setStockFilter] = useState<StockFilter>('all')
  const [selectedProducts, setSelectedProducts] = useState<string[]>([])
  const [showFilters, setShowFilters] = useState(false)

  useEffect(() => {
    loadProducts()
  }, [])

  const loadProducts = async () => {
    try {
      const data = await productsApi.getAll()
      setProducts(data)
    } catch (error) {
      console.error('Error loading products:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleCreate = () => {
    setEditingProduct(null)
    setModalOpen(true)
  }

  const handleEdit = (product: Product) => {
    setEditingProduct(product)
    setModalOpen(true)
  }

  const handleDelete = (product: Product) => {
    setProductToDelete(product)
    setDeleteDialogOpen(true)
  }

  const confirmDelete = async () => {
    if (!productToDelete) return
    try {
      await productsApi.delete(productToDelete.id)
      setProducts(products.filter(p => p.id !== productToDelete.id))
      setSelectedProducts(selectedProducts.filter(id => id !== productToDelete.id))
    } catch (error) {
      console.error('Error deleting product:', error)
    } finally {
      setDeleteDialogOpen(false)
      setProductToDelete(null)
    }
  }

  const handleSave = async (productData: Omit<Product, 'id' | 'createdAt'>) => {
    try {
      if (editingProduct) {
        const updated = await productsApi.update(editingProduct.id, productData)
        setProducts(products.map(p => p.id === editingProduct.id ? updated : p))
      } else {
        const newProduct = await productsApi.create(productData)
        setProducts([...products, newProduct])
      }
      setModalOpen(false)
    } catch (error) {
      console.error('Error saving product:', error)
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: 'ARS',
      minimumFractionDigits: 0,
    }).format(amount)
  }

  // Filtrar productos basado en todos los filtros
  const filteredProducts = useMemo(() => {
    return products.filter(product => {
      // Filtro de búsqueda
      const matchesSearch = 
        product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        product.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
        product.description.toLowerCase().includes(searchQuery.toLowerCase())

      // Filtro de categoría
      const matchesCategory = categoryFilter === 'all' || product.category === categoryFilter

      // Filtro de precio
      let matchesPrice = true
      switch (priceFilter) {
        case '0-2800': matchesPrice = product.price <= 2800; break
        case '2801-3000': matchesPrice = product.price > 2800 && product.price <= 3000; break
        case '3001-3200': matchesPrice = product.price > 3000 && product.price <= 3200; break
        case '3201+': matchesPrice = product.price > 3200; break
      }

      // Filtro de base (detectar de la descripción)
      let matchesBase = true
      if (baseFilter !== 'all') {
        const description = product.description.toLowerCase()
        if (baseFilter === 'crema') {
          matchesBase = description.includes('crema') || description.includes('cremoso') || description.includes('cremosa')
        } else if (baseFilter === 'agua') {
          matchesBase = description.includes('agua') || description.includes('ligero') || description.includes('frutal')
        }
      }

      // Filtro de stock
      let matchesStock = true
      switch (stockFilter) {
        case 'available': matchesStock = product.stock > 0; break
        case 'low': matchesStock = product.stock > 0 && product.stock < 10; break
        case 'out': matchesStock = product.stock === 0; break
      }

      return matchesSearch && matchesCategory && matchesPrice && matchesBase && matchesStock
    })
  }, [products, searchQuery, categoryFilter, priceFilter, baseFilter, stockFilter])

  // Calcular estadísticas
  const stats = useMemo(() => {
    const totalProducts = filteredProducts.length
    const totalInventoryValue = filteredProducts.reduce((sum, p) => sum + (p.price * p.stock), 0)
    const lowStockCount = filteredProducts.filter(p => p.stock > 0 && p.stock < 10).length
    const outOfStockCount = filteredProducts.filter(p => p.stock === 0).length

    return {
      totalProducts,
      totalInventoryValue,
      lowStockCount,
      outOfStockCount
    }
  }, [filteredProducts])

  // Contador de filtros activos
  const activeFilterCount = [
    categoryFilter !== 'all',
    priceFilter !== 'all',
    baseFilter !== 'all',
    stockFilter !== 'all'
  ].filter(Boolean).length

  // Limpiar todos los filtros
  const clearFilters = () => {
    setCategoryFilter('all')
    setPriceFilter('all')
    setBaseFilter('all')
    setStockFilter('all')
    setSearchQuery('')
  }

  // Toggle selección de producto
  const toggleProductSelection = (productId: string) => {
    setSelectedProducts(prev =>
      prev.includes(productId)
        ? prev.filter(id => id !== productId)
        : [...prev, productId]
    )
  }

  // Seleccionar/deseleccionar todos
  const toggleSelectAll = () => {
    if (selectedProducts.length === filteredProducts.length) {
      setSelectedProducts([])
    } else {
      setSelectedProducts(filteredProducts.map(p => p.id))
    }
  }

  // Duplicar producto
  const handleDuplicate = async (product: Product) => {
    try {
      const { id: _, createdAt: __, ...productData } = product
      const newProduct = await productsApi.create({
        ...productData,
        name: `${product.name} (copia)`
      })
      setProducts([...products, newProduct])
    } catch (error) {
      console.error('Error duplicating product:', error)
    }
  }

  // Obtener color del stock
  const getStockColor = (stock: number) => {
    if (stock === 0) return 'destructive'
    if (stock < 10) return 'warning'
    return 'success'
  }

  // Obtener texto del stock
  const getStockText = (stock: number) => {
    if (stock === 0) return 'Sin stock'
    if (stock < 10) return 'Bajo stock'
    return 'Disponible'
  }

  // Loading skeleton para grid
  const GridSkeleton = () => (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
      {[...Array(8)].map((_, i) => (
        <div key={i} className="rounded-xl border border-border bg-card overflow-hidden">
          <Skeleton className="h-48 w-full" />
          <div className="p-4 space-y-3">
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-3 w-1/4" />
            <div className="flex justify-between">
              <Skeleton className="h-4 w-1/3" />
              <Skeleton className="h-4 w-1/4" />
            </div>
            <div className="flex gap-2">
              <Skeleton className="h-9 flex-1" />
              <Skeleton className="h-9 flex-1" />
            </div>
          </div>
        </div>
      ))}
    </div>
  )

  // Loading skeleton para lista
  const ListSkeleton = () => (
    <div className="space-y-3">
      {[...Array(5)].map((_, i) => (
        <div key={i} className="flex items-center gap-4 p-4 rounded-xl border border-border bg-card">
          <Skeleton className="h-16 w-16 rounded-lg" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-1/3" />
            <Skeleton className="h-3 w-1/4" />
          </div>
          <div className="space-y-2">
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-3 w-16" />
          </div>
          <div className="flex gap-2">
            <Skeleton className="h-9 w-9" />
            <Skeleton className="h-9 w-9" />
            <Skeleton className="h-9 w-9" />
          </div>
        </div>
      ))}
    </div>
  )

  return (
    <MainLayout title="Productos" description="Gestiona tu catálogo de helados">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => router.back()} aria-label="Volver">
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold text-foreground">Productos</h1>
              <p className="text-sm text-muted-foreground">Gestiona tu catálogo de helados</p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => setShowFilters(!showFilters)}
              className="gap-2"
            >
              <Filter className="h-4 w-4" />
              Filtros
              {activeFilterCount > 0 && (
                <Badge variant="secondary" className="ml-1 h-5 w-5 p-0">
                  {activeFilterCount}
                </Badge>
              )}
            </Button>
            
            <div className="flex border border-border rounded-lg">
              <Button
                variant={viewMode === 'grid' ? 'secondary' : 'ghost'}
                size="sm"
                className="rounded-r-none border-0"
                onClick={() => setViewMode('grid')}
              >
                <Grid3x3 className="h-4 w-4" />
              </Button>
              <Button
                variant={viewMode === 'list' ? 'secondary' : 'ghost'}
                size="sm"
                className="rounded-l-none border-0"
                onClick={() => setViewMode('list')}
              >
                <List className="h-4 w-4" />
              </Button>
            </div>
            
            <Button onClick={handleCreate} className="gap-2 bg-primary hover:bg-primary/90">
              <Plus className="h-4 w-4" />
              <span className="hidden sm:inline">Nuevo Producto</span>
              <span className="sm:hidden">Nuevo</span>
            </Button>
          </div>
        </div>

        {/* Barra de búsqueda */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar productos por nombre, categoría o descripción..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 pr-10 h-11"
          />
          {searchQuery && (
            <Button
              variant="ghost"
              size="icon"
              className="absolute right-2 top-1/2 -translate-y-1/2 h-7 w-7"
              onClick={() => setSearchQuery('')}
            >
              <X className="h-3 w-3" />
            </Button>
          )}
        </div>
      </div>

      {/* Filtros (collapsible) */}
      {showFilters && (
        <div className="mb-6 p-4 rounded-xl border border-border bg-card/50 backdrop-blur-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-medium">Filtros avanzados</h3>
            <div className="flex items-center gap-2">
              {activeFilterCount > 0 && (
                <Button variant="ghost" size="sm" onClick={clearFilters} className="gap-1 h-8">
                  <X className="h-3 w-3" />
                  Limpiar ({activeFilterCount})
                </Button>
              )}
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={() => setShowFilters(false)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Categorías */}
            <div>
              <label className="text-sm font-medium mb-2 block">Categorías</label>
              <div className="flex flex-wrap gap-2">
                {(['all', 'Clásicos', 'Premium', 'Especiales', 'Frutas'] as const).map((cat) => (
                  <Badge
                    key={cat}
                    variant={categoryFilter === cat ? 'default' : 'outline'}
                    className="cursor-pointer hover:bg-primary/10 transition-colors"
                    onClick={() => setCategoryFilter(cat)}
                  >
                    {cat === 'all' ? 'Todas' : cat}
                  </Badge>
                ))}
              </div>
            </div>

            {/* Precio */}
            <div>
              <label className="text-sm font-medium mb-2 block">Precio</label>
              <div className="flex flex-wrap gap-2">
                {(['all', '0-2800', '2801-3000', '3001-3200', '3201+'] as const).map((price) => (
                  <Badge
                    key={price}
                    variant={priceFilter === price ? 'default' : 'outline'}
                    className="cursor-pointer hover:bg-primary/10 transition-colors"
                    onClick={() => setPriceFilter(price)}
                  >
                    {price === 'all' ? 'Todos' : price === '3201+' ? 'Más de $3.200' : `Hasta $${price.split('-')[1]}`}
                  </Badge>
                ))}
              </div>
            </div>

            {/* Base */}
            <div>
              <label className="text-sm font-medium mb-2 block">Base</label>
              <div className="flex flex-wrap gap-2">
                {(['all', 'crema', 'agua'] as const).map((base) => (
                  <Badge
                    key={base}
                    variant={baseFilter === base ? 'default' : 'outline'}
                    className="cursor-pointer hover:bg-primary/10 transition-colors"
                    onClick={() => setBaseFilter(base)}
                  >
                    {base === 'all' ? 'Todas' : base === 'crema' ? 'Crema' : 'Agua'}
                  </Badge>
                ))}
              </div>
            </div>

            {/* Stock */}
            <div>
              <label className="text-sm font-medium mb-2 block">Stock</label>
              <div className="flex flex-wrap gap-2">
                {(['all', 'available', 'low', 'out'] as const).map((stock) => (
                  <Badge
                    key={stock}
                    variant={stockFilter === stock ? 'default' : 'outline'}
                    className={cn(
                      "cursor-pointer transition-colors",
                      stock === 'low' && stockFilter !== stock && "border-amber-200 text-amber-700 hover:bg-amber-50",
                      stock === 'out' && stockFilter !== stock && "border-destructive/20 text-destructive hover:bg-destructive/10"
                    )}
                    onClick={() => setStockFilter(stock)}
                  >
                    {stock === 'all' ? 'Todos' : 
                     stock === 'available' ? 'Disponibles' : 
                     stock === 'low' ? 'Bajo stock' : 'Sin stock'}
                  </Badge>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Estadísticas */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <div className="rounded-xl bg-gradient-to-br from-blue-50 to-blue-100 border border-blue-200 p-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-blue-100 flex items-center justify-center">
              <Package className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Total productos</p>
              <p className="text-2xl font-bold text-foreground">{stats.totalProducts}</p>
            </div>
          </div>
        </div>

        <div className="rounded-xl bg-gradient-to-br from-emerald-50 to-emerald-100 border border-emerald-200 p-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-emerald-100 flex items-center justify-center">
              <DollarSign className="h-5 w-5 text-emerald-600" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Valor inventario</p>
              <p className="text-2xl font-bold text-foreground">{formatCurrency(stats.totalInventoryValue)}</p>
            </div>
          </div>
        </div>

        <div className="rounded-xl bg-gradient-to-br from-amber-50 to-amber-100 border border-amber-200 p-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-amber-100 flex items-center justify-center">
              <AlertCircle className="h-5 w-5 text-amber-600" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Bajo stock</p>
              <p className="text-2xl font-bold text-foreground">{stats.lowStockCount}</p>
            </div>
          </div>
        </div>

        <div className="rounded-xl bg-gradient-to-br from-rose-50 to-rose-100 border border-rose-200 p-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-rose-100 flex items-center justify-center">
              <X className="h-5 w-5 text-rose-600" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Sin stock</p>
              <p className="text-2xl font-bold text-foreground">{stats.outOfStockCount}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Barra de selección masiva */}
      {selectedProducts.length > 0 && (
        <div className="mb-4 p-3 rounded-lg border border-border bg-card/80 backdrop-blur-sm flex items-center justify-between">
          <div className="flex items-center gap-3">
            <CheckCircle2 className="h-5 w-5 text-primary" />
            <span className="font-medium">{selectedProducts.length} productos seleccionados</span>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" className="gap-2">
              <Copy className="h-4 w-4" />
              Duplicar
            </Button>
            <Button variant="outline" size="sm" className="gap-2">
              <Download className="h-4 w-4" />
              Exportar
            </Button>
            <Button variant="destructive" size="sm" className="gap-2">
              <Trash2 className="h-4 w-4" />
              Eliminar
            </Button>
          </div>
        </div>
      )}

      {/* Contenido principal */}
      {loading ? (
        viewMode === 'grid' ? <GridSkeleton /> : <ListSkeleton />
      ) : (
        <>
          {filteredProducts.length === 0 ? (
            <div className="rounded-xl border-2 border-dashed border-border bg-card/50 p-12 text-center">
              <div className="max-w-md mx-auto space-y-4">
                <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center mx-auto">
                  <Package className="h-8 w-8 text-muted-foreground" />
                </div>
                <div>
                  <h3 className="text-lg font-medium mb-2">No se encontraron productos</h3>
                  <p className="text-muted-foreground mb-6">
                    {searchQuery || activeFilterCount > 0 
                      ? 'Prueba ajustando tus filtros de búsqueda' 
                      : 'Comienza agregando tu primer producto'}
                  </p>
                  <div className="flex flex-col sm:flex-row gap-3 justify-center">
                    <Button onClick={handleCreate} className="gap-2">
                      <Plus className="h-4 w-4" />
                      Agregar producto
                    </Button>
                    {(searchQuery || activeFilterCount > 0) && (
                      <Button variant="outline" onClick={clearFilters}>
                        Limpiar filtros
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <>
              {/* Vista Grid */}
              {viewMode === 'grid' ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                  {filteredProducts.map((product) => {
                    const isSelected = selectedProducts.includes(product.id)
                    const stockColor = getStockColor(product.stock)
                    
                    return (
                      <div
                        key={product.id}
                        className={cn(
                          "group rounded-xl border-2 bg-card overflow-hidden transition-all duration-300 hover:shadow-lg hover:-translate-y-1",
                          isSelected 
                            ? "border-primary border-2 ring-2 ring-primary/20" 
                            : "border-border hover:border-primary/50"
                        )}
                      >
                        {/* Checkbox de selección */}
                        <div className="absolute top-3 left-3 z-10">
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              toggleProductSelection(product.id)
                            }}
                            className={cn(
                              "h-5 w-5 rounded border flex items-center justify-center transition-colors",
                              isSelected
                                ? "bg-primary border-primary text-primary-foreground"
                                : "bg-background border-border hover:border-primary"
                            )}
                          >
                            {isSelected && <Check className="h-3 w-3" />}
                          </button>
                        </div>

                        {/* Imagen del producto */}
                        <div className="relative h-48 overflow-hidden bg-gradient-to-br from-muted/30 to-muted/10">
                          <img
                            src={product.imageUrl || "/placeholder.svg"}
                            alt={product.name}
                            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                          />
                          <div className="absolute top-3 right-3">
                            <Badge 
                              variant={stockColor === 'destructive' ? 'destructive' : 
                                      stockColor === 'warning' ? 'secondary' : 'outline'}
                              className={cn(
                                "font-medium",
                                stockColor === 'warning' && "bg-amber-100 text-amber-800 border-amber-200"
                              )}
                            >
                              {getStockText(product.stock)}
                            </Badge>
                          </div>
                        </div>

                        {/* Contenido */}
                        <div className="p-4">
                          <div className="mb-2">
                            <div className="flex items-center justify-between mb-1">
                              <h3 className="font-semibold text-foreground line-clamp-1">
                                {product.name}
                              </h3>
                              <span className="text-lg font-bold text-primary">
                                {formatCurrency(product.price)}
                              </span>
                            </div>
                            <p className="text-sm text-muted-foreground line-clamp-2 min-h-[2.5rem] mb-3">
                              {product.description}
                            </p>
                          </div>

                          <div className="flex items-center justify-between mb-4">
                            <Badge variant="outline" className="text-xs">
                              <Tag className="h-3 w-3 mr-1" />
                              {product.category}
                            </Badge>
                            <div className="flex items-center gap-1 text-sm">
                              <Package className="h-4 w-4 text-muted-foreground" />
                              <span className={cn(
                                "font-medium",
                                product.stock === 0 && "text-destructive",
                                product.stock > 0 && product.stock < 10 && "text-amber-600",
                                product.stock >= 10 && "text-emerald-600"
                              )}>
                                {product.stock} unidades
                              </span>
                            </div>
                          </div>

                          {/* Acciones */}
                          <div className="flex gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              className="flex-1 gap-2 hover:bg-primary/10"
                              onClick={() => handleEdit(product)}
                            >
                              <Pencil className="h-3.5 w-3.5" />
                              Editar
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              className="flex-1 gap-2 hover:bg-destructive/10 hover:text-destructive"
                              onClick={() => handleDelete(product)}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                              Eliminar
                            </Button>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              ) : (
                /* Vista Lista */
                <div className="space-y-3">
                  {/* Header de lista */}
                  <div className="flex items-center gap-4 p-4 rounded-xl border border-border bg-card">
                    <div className="flex items-center gap-4 flex-1">
                      <button
                        onClick={toggleSelectAll}
                        className={cn(
                          "h-5 w-5 rounded border flex items-center justify-center transition-colors",
                          selectedProducts.length === filteredProducts.length && selectedProducts.length > 0
                            ? "bg-primary border-primary text-primary-foreground"
                            : "bg-background border-border hover:border-primary"
                        )}
                      >
                        {selectedProducts.length === filteredProducts.length && selectedProducts.length > 0 && (
                          <Check className="h-3 w-3" />
                        )}
                      </button>
                      <span className="text-sm font-medium text-muted-foreground min-w-[150px]">Producto</span>
                    </div>
                    <span className="text-sm font-medium text-muted-foreground min-w-[100px]">Categoría</span>
                    <span className="text-sm font-medium text-muted-foreground min-w-[100px] text-right">Precio</span>
                    <span className="text-sm font-medium text-muted-foreground min-w-[100px] text-right">Stock</span>
                    <span className="text-sm font-medium text-muted-foreground min-w-[140px] text-right">Acciones</span>
                  </div>

                  {/* Items de lista */}
                  {filteredProducts.map((product) => {
                    const isSelected = selectedProducts.includes(product.id)
                    const stockColor = getStockColor(product.stock)
                    
                    return (
                      <div
                        key={product.id}
                        className={cn(
                          "flex items-center gap-4 p-4 rounded-xl border border-border bg-card transition-all hover:shadow-md",
                          isSelected && "border-primary border-2 ring-1 ring-primary/20"
                        )}
                      >
                        {/* Checkbox y producto */}
                        <div className="flex items-center gap-4 flex-1">
                          <button
                            onClick={() => toggleProductSelection(product.id)}
                            className={cn(
                              "h-5 w-5 rounded border flex items-center justify-center transition-colors",
                              isSelected
                                ? "bg-primary border-primary text-primary-foreground"
                                : "bg-background border-border hover:border-primary"
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
                              <h4 className="font-medium text-foreground truncate">{product.name}</h4>
                              <p className="text-sm text-muted-foreground truncate">{product.description}</p>
                            </div>
                          </div>
                        </div>

                        {/* Categoría */}
                        <Badge variant="outline" className="min-w-[100px]">
                          {product.category}
                        </Badge>

                        {/* Precio */}
                        <div className="min-w-[100px] text-right">
                          <span className="font-semibold text-primary">
                            {formatCurrency(product.price)}
                          </span>
                        </div>

                        {/* Stock */}
                        <div className="min-w-[100px] text-right">
                          <Badge 
                            variant={stockColor === 'destructive' ? 'destructive' : 
                                    stockColor === 'warning' ? 'secondary' : 'outline'}
                            className={cn(
                              "font-medium",
                              stockColor === 'warning' && "bg-amber-100 text-amber-800 border-amber-200"
                            )}
                          >
                            {product.stock} uds
                          </Badge>
                        </div>

                        {/* Acciones */}
                        <div className="flex items-center justify-end gap-2 min-w-[140px]">
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
                            className="h-8 w-8 text-destructive hover:text-destructive"
                            onClick={() => handleDelete(product)}
                            title="Eliminar"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </>
          )}
        </>
      )}

      {/* Modal de producto */}
      <ProductModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        product={editingProduct}
        onSave={handleSave}
      />

      {/* Diálogo de confirmación de eliminación */}
      <ConfirmDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        title="Eliminar Producto"
        description={`¿Está seguro que desea eliminar "${productToDelete?.name}"? Esta acción no se puede deshacer.`}
        confirmText="Eliminar"
        onConfirm={confirmDelete}
        variant="destructive"
      />
    </MainLayout>
  )
}