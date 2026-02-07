"use client";

import React, { useEffect, useState, useRef } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import type { Product } from "@/lib/types";
import { Loader2, Upload, ImageIcon, X, Check } from "lucide-react";
import { cn } from "@/lib/utils";

interface ProductModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  product: Product | null;
  onSave: (product: Omit<Product, "id" | "createdAt">) => Promise<void>;
}

const CATEGORIES = ["Clásicos", "Premium", "Especiales", "Frutas"] as const;
const BASES = [
  { id: "crema", label: "Crema", description: "Base cremosa y suave" },
  { id: "agua", label: "Agua", description: "Base ligera y refrescante" },
] as const;

export function ProductModal({
  open,
  onOpenChange,
  product,
  onSave,
}: ProductModalProps) {
  const [loading, setLoading] = useState(false);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [formData, setFormData] = useState({
    name: "",
    description: "",
    price: 0,
    stock: 0,
    imageUrl: "",
    category: "",
    base: "crema" as "crema" | "agua",
    sinTacc: false,
  });

  // Limpiar preview cuando se cierra el modal
  useEffect(() => {
    if (!open) {
      setImagePreview(null);
    }
  }, [open]);

  useEffect(() => {
    if (product) {
      setFormData({
        name: product.name,
        description: product.description,
        price: product.price,
        stock: product.stock,
        imageUrl: product.imageUrl,
        category: product.category,
        base: (product as any).base || "crema",
        sinTacc: (product as any).sinTacc || false,
      });
      setImagePreview(product.imageUrl || null);
    } else {
      setFormData({
        name: "",
        description: "",
        price: 0,
        stock: 0,
        imageUrl: "",
        category: "",
        base: "crema",
        sinTacc: false,
      });
      setImagePreview(null);
    }
  }, [product, open]);

  const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const base64 = await fileToBase64(file);

    setImagePreview(base64);
    setFormData((prev) => ({ ...prev, imageUrl: base64 }));
  };

  const clearImage = () => {
    setImagePreview(null);
    setFormData((prev) => ({ ...prev, imageUrl: "" }));
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await onSave(formData);
    } finally {
      setLoading(false);
    }
  };
  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };
  const isEditing = !!product;
  const isValid =
    formData.name.trim() && formData.category && formData.price > 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto p-0 gap-0">
        {/* Header */}
        <DialogHeader className="px-6 pt-6 pb-4 border-b border-border/50">
          <DialogTitle className="text-xl font-semibold">
            {isEditing ? "Editar Producto" : "Nuevo Producto"}
          </DialogTitle>
          <DialogDescription className="text-sm text-muted-foreground">
            {isEditing
              ? "Actualizá la información del producto"
              : "Completá la información básica para crear el producto"}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="px-6 py-4 space-y-6">
          {/* Sección: Información Básica */}
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name" className="text-sm font-medium">
                Nombre <span className="text-destructive">*</span>
              </Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
                placeholder="Ej: Helado de Chocolate Suizo"
                className="h-11"
                autoFocus
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description" className="text-sm font-medium">
                Descripción
              </Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) =>
                  setFormData({ ...formData, description: e.target.value })
                }
                placeholder="Breve descripción del sabor y características..."
                rows={2}
                className="resize-none"
              />
              <p className="text-xs text-muted-foreground">
                Ayuda a los clientes a entender qué hace especial a este
                producto
              </p>
            </div>
          </div>

          <Separator />

          {/* Sección: Clasificación */}
          <div className="space-y-4">
            <div>
              <Label className="text-sm font-medium mb-3 block">
                Categoría <span className="text-destructive">*</span>
              </Label>
              <div className="grid grid-cols-2 gap-2">
                {CATEGORIES.map((cat) => (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setFormData({ ...formData, category: cat })}
                    className={cn(
                      "relative flex items-center justify-center px-4 py-3 rounded-lg border-2 text-sm font-medium transition-all",
                      formData.category === cat
                        ? "border-primary bg-primary/5 text-primary"
                        : "border-border bg-background hover:border-primary/30 hover:bg-muted/50",
                    )}
                  >
                    {formData.category === cat && (
                      <Check className="absolute left-2 h-4 w-4" />
                    )}
                    {cat}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <Label className="text-sm font-medium mb-3 block">
                Base del helado
              </Label>
              <div className="grid grid-cols-2 gap-3">
                {BASES.map((base) => (
                  <button
                    key={base.id}
                    type="button"
                    onClick={() =>
                      setFormData({
                        ...formData,
                        base: base.id as "crema" | "agua",
                      })
                    }
                    className={cn(
                      "flex flex-col items-start p-4 rounded-lg border-2 text-left transition-all",
                      formData.base === base.id
                        ? "border-primary bg-primary/5"
                        : "border-border bg-background hover:border-primary/30",
                    )}
                  >
                    <span
                      className={cn(
                        "font-semibold mb-1",
                        formData.base === base.id
                          ? "text-primary"
                          : "text-foreground",
                      )}
                    >
                      {base.label}
                    </span>
                    <span className="text-xs text-muted-foreground leading-relaxed">
                      {base.description}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* Sin TACC Switch */}
            <div className="flex items-center justify-between p-4 rounded-lg border border-border bg-muted/30">
              <div className="space-y-0.5">
                <Label
                  htmlFor="sin-tacc"
                  className="text-sm font-medium cursor-pointer"
                >
                  Producto Sin TACC
                </Label>
                <p className="text-xs text-muted-foreground">
                  Apto para celíacos
                </p>
              </div>
              <Switch
                id="sin-tacc"
                checked={formData.sinTacc}
                onCheckedChange={(checked) =>
                  setFormData({ ...formData, sinTacc: checked })
                }
              />
            </div>
          </div>

          <Separator />

          {/* Sección: Precio y Stock */}
          <div className="space-y-4">
            <Label className="text-sm font-medium">Precio y Stock</Label>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label
                  htmlFor="price"
                  className="text-xs text-muted-foreground"
                >
                  Precio (ARS)
                </Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground font-medium">
                    $
                  </span>
                  <Input
                    id="price"
                    type="number"
                    min="0"
                    step="100"
                    value={formData.price || ""}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        price: Number(e.target.value),
                      })
                    }
                    className="pl-7 h-11"
                    placeholder="0"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label
                  htmlFor="stock"
                  className="text-xs text-muted-foreground"
                >
                  Unidades disponibles
                </Label>
                <Input
                  id="stock"
                  type="number"
                  min="0"
                  value={formData.stock || ""}
                  onChange={(e) =>
                    setFormData({ ...formData, stock: Number(e.target.value) })
                  }
                  className="h-11"
                  placeholder="0"
                />
              </div>
            </div>
          </div>

          <Separator />

          {/* Sección: Imagen */}
          <div className="space-y-3">
            <Label className="text-sm font-medium">Imagen del producto</Label>

            {imagePreview ? (
              <div className="relative aspect-video rounded-lg overflow-hidden border border-border bg-muted group">
                <img
                  src={imagePreview}
                  alt="Preview"
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    Cambiar
                  </Button>
                  <Button
                    type="button"
                    variant="destructive"
                    size="sm"
                    onClick={clearImage}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
                <Badge className="absolute top-2 right-2 bg-black/60 text-white border-0">
                  Vista previa
                </Badge>
              </div>
            ) : (
              <div
                onClick={() => fileInputRef.current?.click()}
                className="relative aspect-video rounded-lg border-2 border-dashed border-border bg-muted/50 hover:bg-muted hover:border-primary/30 transition-colors cursor-pointer flex flex-col items-center justify-center gap-2 group"
              >
                <div className="h-12 w-12 rounded-full bg-background border border-border flex items-center justify-center group-hover:scale-110 transition-transform">
                  <Upload className="h-5 w-5 text-muted-foreground" />
                </div>
                <div className="text-center">
                  <p className="text-sm font-medium text-foreground">
                    Subir imagen
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Click para seleccionar archivo
                  </p>
                </div>
              </div>
            )}

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleImageChange}
              className="hidden"
            />

            {/* Input alternativo por URL */}
            {!imagePreview && (
              <div className="space-y-2">
                <Label
                  htmlFor="imageUrl"
                  className="text-xs text-muted-foreground"
                >
                  O pegá una URL
                </Label>
                <div className="relative">
                  <ImageIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="imageUrl"
                    value={formData.imageUrl}
                    onChange={(e) => {
                      setFormData({ ...formData, imageUrl: e.target.value });
                      setImagePreview(e.target.value);
                    }}
                    placeholder="https://..."
                    className="pl-9 text-sm"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="flex justify-end gap-3 pt-2 border-t border-border/50">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={loading || !isValid}
              className="min-w-[120px]"
            >
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isEditing ? "Guardar Cambios" : "Crear Producto"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
