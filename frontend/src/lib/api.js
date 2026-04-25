import axios from 'axios'

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3002',
  withCredentials: true, // Nécessaire pour envoyer les cookies (refresh token)
})

// ─── INTERCEPTEUR DE REQUÊTES ─────────────────────────────────────────────────
// Ajoute automatiquement le token d'accès à chaque requête

api.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('accessToken')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
  }
  return config
})

// ─── INTERCEPTEUR DE RÉPONSES ─────────────────────────────────────────────────
// Renouvelle automatiquement le token d'accès si expiré (401)

let isRefreshing = false
let failedQueue = []

const processQueue = (error, token = null) => {
  failedQueue.forEach((prom) => {
    if (error) prom.reject(error)
    else prom.resolve(token)
  })
  failedQueue = []
}

// Routes qui ne doivent JAMAIS déclencher un refresh automatique :
// - /api/auth/refresh : sinon boucle infinie quand le refresh token a expiré
// - /api/auth/login   : 401 = mauvais identifiants, à laisser passer
// - /api/auth/me      : appelée par authStore.init() au boot ; un 401 ici
//                       signifie simplement « pas connecté », pas besoin
//                       de tenter un refresh + redirect (cas typique :
//                       token expiré au repos, on veut juste afficher la
//                       landing publique)
const NO_AUTO_REFRESH = [
  '/api/auth/refresh',
  '/api/auth/login',
  '/api/auth/me',
]

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config
    const url = originalRequest?.url || ''
    const skipAutoRefresh = NO_AUTO_REFRESH.some((p) => url.includes(p))

    if (error.response?.status === 401 && !originalRequest._retry && !skipAutoRefresh) {
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject })
        })
          .then((token) => {
            originalRequest.headers.Authorization = `Bearer ${token}`
            return api(originalRequest)
          })
          .catch((err) => Promise.reject(err))
      }

      originalRequest._retry = true
      isRefreshing = true

      try {
        const { data } = await api.post('/api/auth/refresh')
        localStorage.setItem('accessToken', data.accessToken)
        processQueue(null, data.accessToken)
        originalRequest.headers.Authorization = `Bearer ${data.accessToken}`
        return api(originalRequest)
      } catch (refreshError) {
        processQueue(refreshError, null)
        localStorage.removeItem('accessToken')
        if (typeof window !== 'undefined') {
          window.location.href = '/auth/login'
        }
        return Promise.reject(refreshError)
      } finally {
        isRefreshing = false
      }
    }

    // Sur un 401 explicite de /api/auth/me ou /api/auth/refresh on
    // nettoie le token côté client pour éviter de boucler à la prochaine
    // requête sur la même session « zombie ».
    if (error.response?.status === 401 && skipAutoRefresh) {
      try { localStorage.removeItem('accessToken') } catch {}
    }

    return Promise.reject(error)
  }
)

export default api
