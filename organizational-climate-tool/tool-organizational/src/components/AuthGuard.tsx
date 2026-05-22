"use client"

import { useEffect } from "react"
import { useRouter, usePathname } from "next/navigation"
import { useAuth } from "@/context/AuthContext"
import { Skeleton } from "@/components/ui/skeleton"

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useAuth()
  const router = useRouter()
  const pathname = usePathname()

  useEffect(() => {
    if (pathname?.startsWith('/responder')) {
      return;
    }

    if (!isLoading && !isAuthenticated) {
      const redirectUrl = pathname !== '/login' ? `?redirect=${encodeURIComponent(pathname)}` : ''
      router.replace(`/login${redirectUrl}`)
    }
  }, [isAuthenticated, isLoading, pathname, router])

  if (pathname?.startsWith('/responder')) {
    return <>{children}</>
  }

  if (isLoading) {
    return (
      <div className="flex flex-col gap-4 p-8">
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-64 w-full" />
        <Skeleton className="h-32 w-full" />
      </div>
    )
  }

  if (!isAuthenticated) {
    return null
  }

  return <>{children}</>
}
