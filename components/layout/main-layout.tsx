'use client'

import React, { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { AppSidebar } from './app-sidebar'
import { useAuth } from '@/hooks/use-auth'
import { Skeleton } from '@/components/ui/skeleton'
import { Button } from '@/components/ui/button'
import { ArrowLeft } from 'lucide-react'

interface MainLayoutProps {
  children: React.ReactNode
  title?: string
  description?: string
}

export function MainLayout({ children, title, description }: MainLayoutProps) {
  const router = useRouter()
  const { user, loading } = useAuth()

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login')
    }
  }, [loading, user, router])

  if (loading || !user) {
    return (
      <div className="min-h-screen bg-background p-6 lg:p-8">
        <div className="space-y-4">
          <Skeleton className="h-7 w-48" />
          <Skeleton className="h-4 w-64" />
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Skeleton className="h-32" />
            <Skeleton className="h-32" />
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <AppSidebar />
      <main className="lg:ml-64 min-h-screen">
        <div className="px-4 pb-6 pt-16 sm:px-6 sm:pt-16 lg:p-8">
          <div className="mb-4 flex items-center gap-2">
            <Button variant="ghost" size="icon" onClick={() => router.back()} aria-label="Volver">
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <span className="text-sm text-muted-foreground">Volver</span>
          </div>
          {(title || description) && (
            <div className="mb-8">
              {title && (
                <h1 className="text-2xl font-semibold text-foreground">{title}</h1>
              )}
              {description && (
                <p className="text-muted-foreground mt-1">{description}</p>
              )}
            </div>
          )}
          {children}
        </div>
      </main>
    </div>
  )
}
