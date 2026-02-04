'use client'

import React from "react"

import { useEffect, useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import type { Client } from '@/lib/types'
import { Loader2 } from 'lucide-react'

interface ClientModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  client: Client | null
  onSave: (client: Omit<Client, 'id' | 'createdAt' | 'currentBalance'>) => Promise<void>
}

export function ClientModal({ open, onOpenChange, client, onSave }: ClientModalProps) {
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    name: '',
    dni: '',
    cuit: '',
    email: '',
    phone: '',
    address: '',
    taxCategory: 'consumidor_final' as const,
    creditLimit: 0,
  })

  useEffect(() => {
    if (client) {
      setFormData({
        name: client.name,
        dni: client.dni || '',
        cuit: client.cuit,
        email: client.email,
        phone: client.phone,
        address: client.address,
        taxCategory: client.taxCategory,
        creditLimit: client.creditLimit,
      })
    } else {
      setFormData({
        name: '',
        dni: '',
        cuit: '',
        email: '',
        phone: '',
        address: '',
        taxCategory: 'consumidor_final',
        creditLimit: 50000,
      })
    }
  }, [client, open])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      await onSave(formData)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {client ? 'Editar Cliente' : 'Nuevo Cliente'}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Nombre / Razón Social</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="Helados Mio"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="dni">DNI</Label>
            <Input
              id="dni"
              value={formData.dni}
              onChange={(e) => setFormData({ ...formData, dni: e.target.value })}
              placeholder="DNI"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="cuit">CUIL / CUIT</Label>
            <Input
              id="cuit"
              value={formData.cuit}
              onChange={(e) => setFormData({ ...formData, cuit: e.target.value })}
              placeholder="CUIL o CUIT"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="email@ejemplo.com"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">Teléfono</Label>
              <Input
                id="phone"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                placeholder="011-4555-1234"
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="address">Dirección</Label>
            <Input
              id="address"
              value={formData.address}
              onChange={(e) => setFormData({ ...formData, address: e.target.value })}
              placeholder="Av. Corrientes 1234, CABA"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="taxCategory">Categoría Fiscal</Label>
            <select
              id="taxCategory"
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              value={formData.taxCategory}
              onChange={(e) => setFormData({ ...formData, taxCategory: e.target.value as typeof formData.taxCategory })}
              required
            >
              <option value="responsable_inscripto">Responsable Inscripto</option>
              <option value="monotributo">Monotributo</option>
              <option value="consumidor_final">Consumidor Final</option>
              <option value="exento">Exento</option>
              <option value="no_responsable">No Responsable</option>
            </select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="creditLimit">Límite de Crédito (ARS)</Label>
            <Input
              id="creditLimit"
              type="number"
              min="0"
              value={formData.creditLimit}
              onChange={(e) => setFormData({ ...formData, creditLimit: Number(e.target.value) })}
              required
            />
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {client ? 'Guardar Cambios' : 'Crear Cliente'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
