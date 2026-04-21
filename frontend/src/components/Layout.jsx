import { useEffect } from 'react'
import { useRouter } from 'next/router'
import Link from 'next/link'
import toast from 'react-hot-toast'
import useAuthStore from '../lib/authStore'
import FeedbackWidget from './FeedbackWidget'
import FlaskLogo from './FlaskLogo'
import styles from './Layout.module.css'

export default function Layout({ children }) {
  const router = useRouter()
  const { user, isAuthenticated, isLoading, logout } = useAuthStore()

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/auth/login')
    }
  }, [isLoading, isAuthenticated, router])

  const handleLogout = async () => {
    await logout()
    toast.success('À bientôt !')
    router.push('/auth/login')
  }

  if (isLoading) {
    return (
      <div className={styles.loadingScreen}>
        <div className={styles.spinner} />
      </div>
    )
  }

  if (!isAuthenticated) return null

  const isBuilderRoute = router.pathname.startsWith('/studies/')
  const isActive = router.pathname === '/dashboard' ||
    router.pathname.startsWith('/projects') ||
    router.pathname.startsWith('/studies')

  return (
    <div className={styles.layout}>
      {/* ── Sidebar ─────────────────────────────────────────────────────────── */}
      <aside className={styles.sidebar}>
        <Link href="/dashboard" className={styles.logo}>
          <span className={styles.logoMark}>
            <FlaskLogo size={16} />
          </span>
          <span className={styles.logoText}>MindCraft</span>
        </Link>

        <div className={styles.sidebarDivider} />

        <nav className={styles.nav}>
          <Link
            href="/dashboard"
            className={`${styles.navItem} ${isActive ? styles.navItemActive : ''}`}
          >
            <span className={styles.navIcon}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                <rect x="3" y="3" width="7" height="7" rx="1.5" stroke="currentColor" strokeWidth="1.9"/>
                <rect x="14" y="3" width="7" height="7" rx="1.5" stroke="currentColor" strokeWidth="1.9"/>
                <rect x="3" y="14" width="7" height="7" rx="1.5" stroke="currentColor" strokeWidth="1.9"/>
                <rect x="14" y="14" width="7" height="7" rx="1.5" stroke="currentColor" strokeWidth="1.9"/>
              </svg>
            </span>
            Projets
          </Link>
          {user?.role === 'ADMIN' && (
            <Link href="/admin" className={`${styles.navItem} ${router.pathname === '/admin' ? styles.navItemActive : ''}`}>
              <span className={styles.navIcon}>
                <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
                  <path d="M8 1.5a6.5 6.5 0 100 13 6.5 6.5 0 000-13z" stroke="currentColor" strokeWidth="1.3"/>
                  <path d="M8 5v3h3" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
                </svg>
              </span>
              Administration
            </Link>
          )}
        </nav>

        <div className={styles.sidebarSpacer} />

        <div className={styles.sidebarFooter}>
          <div className={styles.userRow}>
            <div className={styles.avatar}>
              {user?.username?.[0]?.toUpperCase()}
            </div>
            <span className={styles.username}>{user?.username}</span>
          </div>
          <Link href="/settings" className={styles.settingsBtn} title="Paramètres du compte">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M6.5 1.5h3l.4 1.7.9.4 1.5-.9 2.1 2.1-.9 1.5.4.9 1.7.4v3l-1.7.4-.4.9.9 1.5-2.1 2.1-1.5-.9-.9.4-.4 1.7h-3l-.4-1.7-.9-.4-1.5.9-2.1-2.1.9-1.5-.4-.9-1.7-.4v-3l1.7-.4.4-.9-.9-1.5 2.1-2.1 1.5.9.9-.4.4-1.7z" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round"/>
              <circle cx="8" cy="8" r="2" stroke="currentColor" strokeWidth="1.2"/>
            </svg>
          </Link>
          <button onClick={handleLogout} className={styles.logoutBtn} title="Déconnexion">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none">
              <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round"/>
              <polyline points="16 17 21 12 16 7" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"/>
              <line x1="21" y1="12" x2="9" y2="12" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round"/>
            </svg>
          </button>
        </div>
      </aside>

      {/* ── Main ────────────────────────────────────────────────────────────── */}
      <main className={`${styles.main} ${isBuilderRoute ? styles.mainFull : ''}`}>
        <div className="container">
          {children}
        </div>
      </main>

      {/* ── Feedback widget ─────────────────────────────────────────────────── */}
      <FeedbackWidget />
    </div>
  )
}
