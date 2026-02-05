'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import {
  LayoutDashboard,
  Package,
  Users,
  ShoppingCart,
  Truck,
  IceCream,
  LogOut,
  Menu,
  X,
  Receipt,
  UserCheck,
  Home,
} from 'lucide-react'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { useAuth } from '@/hooks/use-auth'
import { signOut } from '@/services/auth-service'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'

export function AppSidebar() {
  const pathname = usePathname()
  const [mobileOpen, setMobileOpen] = useState(false)
  const { user } = useAuth()

  const navItems = [
    { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { href: '/productos', label: 'Productos', icon: Package },
    { href: '/clientes', label: 'Clientes', icon: Users },
    { href: '/vendedores', label: 'Vendedores', icon: UserCheck, roles: ['admin'] },
    { href: '/ventas', label: 'Ventas', icon: Receipt },
    { href: '/ventas/nueva', label: 'Nueva Venta', icon: ShoppingCart },
    { href: '/pedidos', label: 'Pedidos', icon: Truck },
    // Comisiones se gestionan dentro de Vendedores
    // Tienda Online es pública, fuera del panel admin
  ].filter((item) => !item.roles || item.roles.includes(user?.role ?? 'customer'))

  return (
    <>
      {/* Mobile toggle */}
      <Button
        variant="ghost"
        size="icon"
        className="fixed top-4 left-4 z-50 lg:hidden bg-sidebar text-sidebar-foreground"
        onClick={() => setMobileOpen(!mobileOpen)}
      >
        {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
      </Button>

      {/* Overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 bg-background/80 backdrop-blur-sm z-40 lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          'fixed top-0 left-0 z-40 h-screen w-64 bg-sidebar text-sidebar-foreground border-r border-sidebar-border transition-transform duration-300 lg:translate-x-0',
          mobileOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="flex items-center gap-3 px-6 py-6 border-b border-sidebar-border">
            <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-sidebar-primary">
              <IceCream className="h-6 w-6 text-sidebar-primary-foreground" />
            </div>
            <div className="min-w-0">
              <h1 className="font-semibold text-sm sm:text-base text-sidebar-foreground truncate">
                Helados Mio
              </h1>
              <p className="text-xs text-sidebar-foreground/60">Distribuidora</p>
            </div>
          </div>

          {/* Navigation */}
          <nav className="flex-1 px-3 py-4 space-y-1">
            {navItems.map((item) => {
              const isActive = pathname === item.href || pathname.startsWith(item.href + '/')
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMobileOpen(false)}
                  className={cn(
                    'flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors',
                    isActive
                      ? 'bg-sidebar-accent text-sidebar-accent-foreground'
                      : 'text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground'
                  )}
                >
                  <item.icon className="h-5 w-5" />
                  {item.label}
                </Link>
              )
            })}
          </nav>

          {/* Footer */}
          <div className="px-3 py-4 border-t border-sidebar-border space-y-3">
            <Link
              href="/"
              onClick={() => setMobileOpen(false)}
              className="flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground transition-colors"
            >
              <Home className="h-5 w-5" />
              Volver al inicio
            </Link>
            {user && (
              <div className="flex items-center gap-3 px-4 py-3 rounded-lg bg-sidebar-accent/20">
                <Avatar className="h-9 w-9">
                  <AvatarImage src={user.photoURL || ''} alt={user.name || 'Usuario'} />
                  <AvatarFallback className="text-xs font-semibold">
                    {(user.name || user.email || 'U').slice(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0">
                  <p className="text-sm font-medium text-sidebar-foreground truncate">
                    {user.name || 'Usuario'}
                  </p>
                  <p className="text-xs text-sidebar-foreground/60 truncate">
                    {user.role === 'admin' ? 'Administrador' : 'Vendedor'}
                  </p>
                </div>
              </div>
            )}
            <button
              type="button"
              onClick={() => signOut()}
              className="flex w-full items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground transition-colors"
            >
              <LogOut className="h-5 w-5" />
              Cerrar Sesión
            </button>
          </div>
        </div>
      </aside>
    </>
  )
}
