import Link from 'next/link'
import { useRouter } from 'next/router'
import styles from './StaticLayout.module.css'

const NAV_ITEMS = [
  { href: '/about',       label: 'À propos',             icon: 'M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z' },
  { href: '/docs',        label: 'Documentation',        icon: 'M14 2H6c-1.1 0-1.99.9-1.99 2L4 20c0 1.1.89 2 1.99 2H18c1.1 0 2-.9 2-2V8l-6-6zm2 16H8v-2h8v2zm0-4H8v-2h8v2zm-3-5V3.5L18.5 9H13z' },
  { href: '/terms',       label: 'Termes et Conditions', icon: 'M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4zm0 10.99h7c-.53 4.12-3.28 7.79-7 8.94V12H5V6.3l7-3.11v8.8z' },
  { href: '/help',        label: 'Aide',                 icon: 'M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 17h-2v-2h2v2zm2.07-7.75l-.9.92C13.45 12.9 13 13.5 13 15h-2v-.5c0-1.1.45-2.1 1.17-2.83l1.24-1.26c.37-.36.59-.86.59-1.41 0-1.1-.9-2-2-2s-2 .9-2 2H8c0-2.21 1.79-4 4-4s4 1.79 4 4c0 .88-.36 1.68-.93 2.25z' },
]

export default function StaticLayout({ children, title }) {
  const router = useRouter()

  return (
    <div className={styles.shell}>
      {/* ── Sidebar ── */}
      <aside className={styles.sidebar}>
        <Link href="/auth/login" className={styles.sidebarLogo}>
          <span className={styles.sidebarLogoMark}>
            <svg width="18" height="18" viewBox="0 0 16 16" fill="none">
              <path d="M6.5 2.5H9.5V6.5L12.8 13.5H3.2L6.5 6.5V2.5Z" stroke="white" strokeWidth="1.2" strokeLinejoin="round" fill="rgba(255,255,255,0.1)"/>
              <path d="M5.5 2.5H10.5" stroke="white" strokeWidth="1.2" strokeLinecap="round"/>
              <path d="M4.5 10.5L11.5 10.5L12.8 13.5H3.2Z" fill="rgba(255,255,255,0.3)"/>
              <circle cx="8.5" cy="9" r="1" stroke="rgba(255,255,255,0.7)" strokeWidth="0.9"/>
              <circle cx="6.8" cy="12" r="0.55" fill="rgba(255,255,255,0.6)"/>
            </svg>
          </span>
          <span className={styles.sidebarLogoText}>MindCraft</span>
        </Link>

        <nav className={styles.nav}>
          {NAV_ITEMS.map((item) => {
            const active = router.pathname === item.href
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`${styles.navItem} ${active ? styles.navItemActive : ''}`}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" className={styles.navIcon}>
                  <path d={item.icon} />
                </svg>
                {item.label}
              </Link>
            )
          })}
        </nav>

        <div className={styles.sidebarFooter}>
          <p className={styles.sidebarFooterText}>© 2026 MindCraft</p>
          <p className={styles.sidebarFooterText}>Usage académique</p>
        </div>
      </aside>

      {/* ── Main content ── */}
      <main className={styles.main}>
        <div className={styles.content}>
          {children}
        </div>
      </main>
    </div>
  )
}
