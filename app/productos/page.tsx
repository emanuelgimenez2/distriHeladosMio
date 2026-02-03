'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { MainLayout } from '@/components/layout/main-layout'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { DataTableSkeleton } from '@/components/ui/data-table-skeleton'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { ProductModal } from '@/components/productos/product-modal'
import { productsApi } from '@/lib/api'
import type { Product } from '@/lib/types'
import { Plus, Search, Pencil, Trash2, ArrowLeft } from 'lucide-react'

export default function ProductosPage() {
  const router = useRouter()
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [modalOpen, setModalOpen] = useState(false)
  const [editingProduct, setEditingProduct] = useState<Product | null>(null)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [productToDelete, setProductToDelete] = useState<Product | null>(null)

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

  const filteredProducts = products.filter(product =>
    product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    product.category.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: 'ARS',
      minimumFractionDigits: 0,
    }).format(amount)
  }

  return (
    <MainLayout title="Productos" description="Gestiona tu catálogo de helados">
      <div className="flex items-center gap-2 mb-4">
        <Button variant="ghost" size="icon" onClick={() => router.back()} aria-label="Volver">
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <span className="text-sm text-muted-foreground">Volver</span>
      </div>
      {/* Header Actions */}
      <div className="flex flex-col sm:flex-row gap-4 justify-between mb-6">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar productos..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <Button onClick={handleCreate} className="gap-2">
          <Plus className="h-4 w-4" />
          Nuevo Producto
        </Button>
      </div>

      {/* Products Table */}
      {loading ? (
        <DataTableSkeleton columns={6} rows={5} />
      ) : (
        <>
          <div className="rounded-lg border border-border bg-card overflow-hidden hidden sm:block">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border bg-muted/30">
                    <th className="text-left p-4 font-medium text-muted-foreground text-sm">Producto</th>
                    <th className="text-left p-4 font-medium text-muted-foreground text-sm">Categoría</th>
                    <th className="text-right p-4 font-medium text-muted-foreground text-sm">Precio</th>
                    <th className="text-right p-4 font-medium text-muted-foreground text-sm">Stock</th>
                    <th className="text-right p-4 font-medium text-muted-foreground text-sm">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {filteredProducts.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="p-8 text-center text-muted-foreground">
                        <div className="space-y-3">
                          <p>No se encontraron productos</p>
                          <Button onClick={handleCreate} className="gap-2">
                            <Plus className="h-4 w-4" />
                            Agregar producto
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    filteredProducts.map((product) => (
                      <tr key={product.id} className="hover:bg-muted/30 transition-colors">
                        <td className="p-4">
                          <div className="flex items-center gap-3">
                            <img
                              src={product.imageUrl || "/placeholder.svg"}
                              alt={product.name}
                              className="w-12 h-12 rounded-lg object-cover"
                            />
                            <div>
                              <p className="font-medium text-foreground">{product.name}</p>
                              <p className="text-sm text-muted-foreground line-clamp-1">{product.description}</p>
                            </div>
                          </div>
                        </td>
                        <td className="p-4">
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-primary/10 text-primary">
                            {product.category}
                          </span>
                        </td>
                        <td className="p-4 text-right font-medium text-foreground">
                          {formatCurrency(product.price)}
                        </td>
                        <td className="p-4 text-right">
                          <span className={`font-medium ${product.stock < 10 ? 'text-destructive' : 'text-foreground'}`}>
                            {product.stock} uds
                          </span>
                        </td>
                        <td className="p-4">
                          <div className="flex justify-end gap-2">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleEdit(product)}
                            >
                              <Pencil className="h-4 w-4" />
                              <span className="sr-only">Editar</span>
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleDelete(product)}
                            >
                              <Trash2 className="h-4 w-4 text-destructive" />
                              <span className="sr-only">Eliminar</span>
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Mobile Grid */}
          <div className="grid grid-cols-2 gap-3 sm:hidden">
            {filteredProducts.length === 0 ? (
              <div className="col-span-2 rounded-lg border border-border bg-card p-6 text-center text-muted-foreground">
                <div className="space-y-3">
                  <p>No se encontraron productos</p>
                  <Button onClick={handleCreate} className="gap-2">
                    <Plus className="h-4 w-4" />
                    Agregar producto
                  </Button>
                </div>
              </div>
            ) : (
              filteredProducts.map((product) => (
                <div key={product.id} className="rounded-lg border border-border bg-card p-3">
                  <img
                    src={product.imageUrl || "/placeholder.svg"}
                    alt={product.name}
                    className="w-full h-24 rounded-md object-cover mb-3"
                  />
                  <div className="space-y-1">
                    <p className="font-medium text-foreground line-clamp-1">{product.name}</p>
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-primary/10 text-primary">
                      {product.category}
                    </span>
                    <p className="text-xs text-muted-foreground line-clamp-2 min-h-[2.5rem]">
                      {product.description}
                    </p>
                  </div>
                  <div className="flex items-center justify-between mt-2">
                    <span className="text-sm font-semibold text-foreground">
                      {formatCurrency(product.price)}
                    </span>
                    <span className={`text-xs font-medium ${product.stock < 10 ? 'text-destructive' : 'text-foreground'}`}>
                      {product.stock} uds
                    </span>
                  </div>
                  <div className="flex gap-2 mt-3">
                    <Button variant="outline" size="sm" className="flex-1" onClick={() => handleEdit(product)}>
                      Editar
                    </Button>
                    <Button variant="ghost" size="sm" className="flex-1 text-destructive" onClick={() => handleDelete(product)}>
                      Eliminar
                    </Button>
                  </div>
                </div>
              ))
            )}
          </div>
        </>
      )}

      {/* Product Modal */}
      <ProductModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        product={editingProduct}
        onSave={handleSave}
      />

      {/* Delete Confirmation */}
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
