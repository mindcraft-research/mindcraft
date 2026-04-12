import { create } from 'zustand'
import api from './api'

const useAuthStore = create((set) => ({
  user: null,
  isLoading: true,
  isAuthenticated: false,

  // ── Initialisation au chargement de l'app ──────────────────────────────────
  init: async () => {
    const token = localStorage.getItem('accessToken')
    if (!token) {
      set({ isLoading: false, isAuthenticated: false })
      return
    }

    try {
      const { data } = await api.get('/api/auth/me')
      set({ user: data.user, isAuthenticated: true, isLoading: false })
    } catch {
      localStorage.removeItem('accessToken')
      set({ user: null, isAuthenticated: false, isLoading: false })
    }
  },

  // ── Connexion ──────────────────────────────────────────────────────────────
  login: async (login, password) => {
    const { data } = await api.post('/api/auth/login', { login, password })
    if (data.requiresTwoFactor) {
      return data // Don't set tokens, return for 2FA flow
    }
    localStorage.setItem('accessToken', data.accessToken)
    set({ user: data.user, isAuthenticated: true })
    return data
  },

  // ── Inscription ────────────────────────────────────────────────────────────
  register: async (username, email, password) => {
    const { data } = await api.post('/api/auth/register', { username, email, password })
    // Don't set tokens — user must verify email first
    return data
  },

  // ── Finaliser l'onboarding ─────────────────────────────────────────────────
  completeOnboarding: async () => {
    try {
      await api.patch('/api/auth/onboarding/complete')
      set((state) => ({ user: { ...state.user, onboardingCompleted: true } }))
    } catch {}
  },

  // ── Déconnexion ────────────────────────────────────────────────────────────
  logout: async () => {
    try {
      await api.post('/api/auth/logout')
    } finally {
      localStorage.removeItem('accessToken')
      set({ user: null, isAuthenticated: false })
    }
  },
}))

export default useAuthStore
