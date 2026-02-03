'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { MainLayout } from '@/components/layout/main-layout'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { DataTableSkeleton } from '@/components/ui/data-table-skeleton'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { ClientModal } from '@/components/clientes/client-modal'
import { clientsApi } from '@/lib/api'
import type { Client } from '@/lib/types'
import { Plus, Search, Pencil, Trash2, Eye } from 'lucide-react'

export default function ClientesPage() {
  const [clients, setClients] = useState<Client[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [modalOpen, setModalOpen] = useState(false)
  const [editingClient, setEditingClient] = useState<Client | null>(null)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [clientToDelete, setClientToDelete] = useState<Client | null>(null)

  useEffect(() => {
    loadClients()
  }, [])

  const loadClients = async () => {
    try {
      const data = await clientsApi.getAll()
      setClients(data)
    } catch (error) {
      console.error('Error loading clients:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleCreate = () => {
    setEditingClient(null)
    setModalOpen(true)
  }

  const handleEdit = (client: Client) => {
    setEditingClient(client)
    setModalOpen(true)
  }

  const handleDelete = (client: Client) => {
    setClientToDelete(client)
    setDeleteDialogOpen(true)
  }

  const confirmDelete = async () => {
    if (!clientToDelete) return
    try {
      await clientsApi.delete(clientToDelete.id)
      setClients(clients.filter(c => c.id !== clientToDelete.id))
    } catch (error) {
      console.error('Error deleting client:', error)
    } finally {
      setDeleteDialogOpen(false)
      setClientToDelete(null)
    }
  }

  const handleSave = async (clientData: Omit<Client, 'id' | 'createdAt' | 'currentBalance'>) => {
    try {
      if (editingClient) {
        const updated = await clientsApi.update(editingClient.id, clientData)
        setClients(clients.map(c => c.id === editingClient.id ? updated : c))
      } else {
        const newClient = await clientsApi.create(clientData)
        setClients([...clients, newClient])
      }
      setModalOpen(false)
    } catch (error) {
      console.error('Error saving client:', error)
    }
  }

  const filteredClients = clients.filter(client =>
    client.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    client.cuit.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: 'ARS',
      minimumFractionDigits: 0,
    }).format(amount)
  }

  return (
    <MainLayout title="Clientes" description="Gestiona tus clientes y sus cuentas corrientes">
      {/* Header Actions */}
      <div className="flex flex-col sm:flex-row gap-4 justify-between mb-6">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por nombre o CUIT..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <Button onClick={handleCreate} className="gap-2">
          <Plus className="h-4 w-4" />
          Nuevo Cliente
        </Button>
      </div>

      {/* Clients Table */}
      {loading ? (
        <DataTableSkeleton columns={6} rows={5} />
      ) : (
        <div className="rounded-lg border border-border bg-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border bg-muted/30">
                  <th className="text-left p-4 font-medium text-muted-foreground text-sm">Cliente</th>
                  <th className="text-left p-4 font-medium text-muted-foreground text-sm">CUIT</th>
                  <th className="text-left p-4 font-medium text-muted-foreground text-sm">Contacto</th>
                  <th className="text-right p-4 font-medium text-muted-foreground text-sm">Límite Crédito</th>
                  <th className="text-right p-4 font-medium text-muted-foreground text-sm">Saldo Deuda</th>
                  <th className="text-right p-4 font-medium text-muted-foreground text-sm">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filteredClients.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="p-8 text-center text-muted-foreground">
                      No se encontraron clientes
                    </td>
                  </tr>
                ) : (
                  filteredClients.map((client) => (
                    <tr key={client.id} className="hover:bg-muted/30 transition-colors">
                      <td className="p-4">
                        <div>
                          <p className="font-medium text-foreground">{client.name}</p>
                          <p className="text-sm text-muted-foreground">{client.address}</p>
                        </div>
                      </td>
                      <td className="p-4 text-foreground">{client.cuit}</td>
                      <td className="p-4">
                        <div>
                          <p className="text-sm text-foreground">{client.email}</p>
                          <p className="text-sm text-muted-foreground">{client.phone}</p>
                        </div>
                      </td>
                      <td className="p-4 text-right font-medium text-foreground">
                        {formatCurrency(client.creditLimit)}
                      </td>
                      <td className="p-4 text-right">
                        <span className={`font-medium ${client.currentBalance > 0 ? 'text-destructive' : 'text-success'}`}>
                          {formatCurrency(client.currentBalance)}
                        </span>
                      </td>
                      <td className="p-4">
                        <div className="flex justify-end gap-2">
                          <Link href={`/clientes/${client.id}`}>
                            <Button variant="ghost" size="icon">
                              <Eye className="h-4 w-4" />
                              <span className="sr-only">Ver cuenta</span>
                            </Button>
                          </Link>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleEdit(client)}
                          >
                            <Pencil className="h-4 w-4" />
                            <span className="sr-only">Editar</span>
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDelete(client)}
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
      )}

      {/* Client Modal */}
      <ClientModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        client={editingClient}
        onSave={handleSave}
      />

      {/* Delete Confirmation */}
      <ConfirmDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        title="Eliminar Cliente"
        description={`¿Está seguro que desea eliminar a "${clientToDelete?.name}"? Esta acción no se puede deshacer.`}
        confirmText="Eliminar"
        onConfirm={confirmDelete}
        variant="destructive"
      />
    </MainLayout>
  )
}
