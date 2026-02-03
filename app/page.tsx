'use client'

import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { StoreFront } from '@/app/tienda/page'

export default function HomePage() {
  return (
    <StoreFront
      showHeader
      showBackButton={false}
      publicMode
      headerAction={
        <Button asChild>
          <Link href="/login">Login</Link>
        </Button>
      }
    />
  )
}
