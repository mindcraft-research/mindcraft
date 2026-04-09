import { useEffect } from 'react'
import { useRouter } from 'next/router'
import useAuthStore from '../lib/authStore'

export default function IndexPage() {
  const router = useRouter()
  const { isAuthenticated, isLoading } = useAuthStore()

  useEffect(() => {
    if (!isLoading) {
      router.replace(isAuthenticated ? '/dashboard' : '/auth/login')
    }
  }, [isAuthenticated, isLoading, router])

  return null
}
