import { useEffect } from 'react'
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

export default function App({ Component, pageProps }) {
  const init = useAuthStore((s) => s.init)

  // Initialise l'authentification au démarrage de l'application
  useEffect(() => {
    init()
  }, [init])

  return (
    <QueryClientProvider client={queryClient}>
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
