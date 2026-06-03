// SPDX-License-Identifier: AGPL-3.0-or-later
import { useEffect, useCallback, useRef } from 'react'
import Head from 'next/head'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Toaster } from 'react-hot-toast'
import useAuthStore from '../lib/authStore'
import GlobalMenu from '../components/GlobalMenu'
import '../styles/globals.css'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: 1, staleTime: 30_000 },
  },
})

const SESSION_TIMEOUT_MS = 30 * 60 * 1000 // 30 minutes d'inactivité

export default function App({ Component, pageProps }) {
  const init = useAuthStore((s) => s.init)
  const logout = useAuthStore((s) => s.logout)
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)
  const timerRef = useRef(null)

  // Initialise l'authentification au démarrage de l'application
  useEffect(() => {
    init()
  }, [init])

  // ── Session timeout : déconnexion automatique après inactivité ────────────
  const resetTimer = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current)
    if (!isAuthenticated) return
    timerRef.current = setTimeout(() => {
      logout()
      window.location.href = '/auth/login?reason=timeout'
    }, SESSION_TIMEOUT_MS)
  }, [isAuthenticated, logout])

  useEffect(() => {
    if (!isAuthenticated) return
    const events = ['mousedown', 'keydown', 'scroll', 'touchstart']
    events.forEach((e) => window.addEventListener(e, resetTimer, { passive: true }))
    resetTimer()
    return () => {
      events.forEach((e) => window.removeEventListener(e, resetTimer))
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [isAuthenticated, resetTimer])

  return (
    <QueryClientProvider client={queryClient}>
      <Head>
        {/* Indispensable pour que les @media (max-width) se déclenchent sur
            téléphone — sans ça le navigateur rend la page en 980px puis
            dézoom, et le site reste « desktop écrasé ». */}
        <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
      </Head>
      <Component {...pageProps} />
      <GlobalMenu />
      <Toaster
        position="top-right"
        toastOptions={{
          style: {
            fontFamily: 'DM Sans, sans-serif',
            fontSize: '14px',
            borderRadius: '10px',
          },
        }}
      />
    </QueryClientProvider>
  )
}
