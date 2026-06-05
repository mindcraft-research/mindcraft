// SPDX-License-Identifier: AGPL-3.0-or-later
import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import Head from 'next/head'
import useAuthStore from '../lib/authStore'
import FlaskLogo from '../components/FlaskLogo'
import { CITATION_DATA } from '../lib/citation'
import styles from './landing.module.css'

/* ── Hook : observer un element pour declencher des animations au scroll ─────── */
function useInView(threshold = 0.15) {
  const ref = useRef(null)
  const [inView, setInView] = useState(false)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const obs = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) {
        setInView(true)
        obs.disconnect()
      }
    }, { threshold })
    obs.observe(el)
    return () => obs.disconnect()
  }, [threshold])
  return [ref, inView]
}

/* ── Feature cards data ──────────────────────────────────────────────────────── */
const features = [
  {
    icon: '🧩',
    bg: '#EEF2FF',
    title: 'No-code',
    desc: 'Plus de 30 types de questions, des tâches comportementales complexes et un design builder visuel. Aucune compétence en programmation requise.',
  },
  {
    icon: '🔬',
    bg: '#F0FDF4',
    title: 'Open Science',
    desc: "Pré-enregistrement, DOI, approbation éthique, codebook reproductible. L'interopérabilité et la transparence au coeur de la plateforme.",
  },
  {
    icon: '🔒',
    bg: '#FEF2F2',
    title: 'Sécurisé & RGPD',
    desc: "Données hébergées en France (Scaleway). Double authentification (2FA). Consentement éclairé intégré. Aucune donnée transmise à des tiers.",
  },
  {
    icon: '🤝',
    bg: '#FFFBEB',
    title: 'Collaboratif',
    desc: "Invitez vos collègues sur vos projets, attribuez des rôles (propriétaire, éditeur, lecteur) et co-construisez vos études.",
  },
]

/* ── Bannière cookies ────────────────────────────────────────────────────────── */
function CookieBanner() {
  const [visible, setVisible] = useState(false)
  useEffect(() => {
    if (typeof window !== 'undefined' && !localStorage.getItem('mindcraft-cookies-ack')) {
      // Léger délai pour laisser la page se charger
      const t = setTimeout(() => setVisible(true), 600)
      return () => clearTimeout(t)
    }
  }, [])
  const accept = () => {
    try { localStorage.setItem('mindcraft-cookies-ack', '1') } catch {}
    setVisible(false)
  }
  if (!visible) return null
  return (
    <div className={styles.cookieBanner} role="dialog" aria-label="Information cookies">
      <p className={styles.cookieText}>
        MindCraft n'utilise que des cookies essentiels à l'authentification. Aucune donnée n'est partagée avec des tiers.
      </p>
      <button className={styles.cookieBtn} onClick={accept}>
        J'ai compris
      </button>
    </div>
  )
}

/* ── Composant : grille Capabilities avec animation de scroll ──────────────── */
function CapabilitiesGrid() {
  const [ref, inView] = useInView(0.15)
  return (
    <div ref={ref} className={`${styles.capGrid} ${inView ? styles.visible : ''}`}>
      {capabilities.map((c, i) => (
        <div key={c.label} className={styles.capItem} style={{ transitionDelay: `${i * 90}ms` }}>
          <span className={styles.capIcon}>{c.icon}</span>
          <p className={styles.capText}>
            <strong>{c.label}</strong><br />{c.desc}
          </p>
        </div>
      ))}
    </div>
  )
}

/* ── Capabilities list ───────────────────────────────────────────────────────── */
const capabilities = [
  { icon: '📋', label: 'Questionnaires', desc: '30+ types de questions (Likert, matrice, curseur, classement, texte...)' },
  { icon: '⚡', label: 'Tâches', desc: "Amorçage, catégorisation, IAT, temps de réaction, séquence d'essais configurable" },
  { icon: '🧠', label: 'Physiologie', desc: 'Marqueurs LSL en temps réel pour EEG, ECG, EMG, eye-tracking' },
  { icon: '📐', label: 'Design', desc: 'Plans inter/intra/mixtes, contrebalancement automatique, logique conditionnelle' },
  { icon: '📊', label: 'Export', desc: 'CSV, Excel multi-feuilles, codebook PDF automatique avec design et matériel' },
  { icon: '💻', label: 'Open source', desc: 'Code source disponible sur GitHub. Gratuit. Pour toujours.' },
]

export default function LandingPage() {
  // La landing est rendue côté serveur dès le premier byte : son contenu
  // ne dépend pas de l'état d'authentification, qui ne sert qu'à adapter
  // quelques CTAs après hydratation côté client. Aucun blocage pendant
  // la vérification d'auth — sinon les crawlers (Google, IA) et les
  // utilisateurs sur réseau lent ne voient qu'une page blanche.
  const { isAuthenticated } = useAuthStore()

  return (
    <>
      <Head>
        <title>MindCraft — Plateforme de recherche expérimentale</title>
        <meta name="description" content="Plateforme collaborative, open source et gratuite pour concevoir des études et collecter des données en SHS et sciences expérimentales. Sans coder, sans payer." />
        <link rel="canonical" href="https://www.mindcraft-research.fr/" />
        {/* Open Graph (Facebook, LinkedIn, WhatsApp, Slack…) */}
        <meta property="og:type" content="website" />
        <meta property="og:site_name" content="MindCraft" />
        <meta property="og:locale" content="fr_FR" />
        <meta property="og:url" content="https://www.mindcraft-research.fr/" />
        <meta property="og:title" content="MindCraft — Plateforme de recherche expérimentale" />
        <meta property="og:description" content="Plateforme collaborative, open source et gratuite pour concevoir des études et collecter des données en SHS et sciences expérimentales. Sans coder." />
        <meta property="og:image" content="https://www.mindcraft-research.fr/og-image.svg" />
        <meta property="og:image:width" content="1200" />
        <meta property="og:image:height" content="630" />
        <meta property="og:image:alt" content="MindCraft — plateforme open source pour la recherche expérimentale" />
        {/* Twitter / X */}
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="MindCraft — Plateforme de recherche expérimentale" />
        <meta name="twitter:description" content="Plateforme collaborative, open source et gratuite pour concevoir des études et collecter des données en SHS. Sans coder." />
        <meta name="twitter:image" content="https://www.mindcraft-research.fr/og-image.svg" />
      </Head>

      {/* ── Navigation ──────────────────────────────────────────────────────── */}
      <nav className={styles.nav}>
        <div className={styles.navLogo}>
          <span className={styles.navLogoMark}><FlaskLogo /></span>
          <span className={styles.navLogoText}>MindCraft</span>
        </div>
        <div className={styles.navLinks}>
          <Link href="/about" className={styles.navLink}>A propos</Link>
          <Link href="/docs" className={styles.navLink}>Documentation</Link>
          {isAuthenticated ? (
            <Link href="/dashboard" className={styles.navCta}>Tableau de bord</Link>
          ) : (
            <>
              <Link href="/auth/login" className={styles.navLink}>Connexion</Link>
              <Link href="/auth/register" className={styles.navCta}>Commencer</Link>
            </>
          )}
        </div>
      </nav>

      {/* ── Hero ────────────────────────────────────────────────────────────── */}
      <section className={styles.hero}>
        {/* ── Logo animé ──────────────────────────────────────────────── */}
        <div className={styles.heroLogo}>
          <div className={styles.heroLogoMark}>
            <FlaskLogo size={50} />
            <div className={styles.bubble1} />
            <div className={styles.bubble2} />
            <div className={styles.bubble3} />
            <div className={styles.bubble4} />
            <div className={styles.bubble5} />
            <div className={styles.bubble6} />
            <div className={styles.bubble7} />
            <div className={styles.bubble8} />
            <div className={styles.bubble9} />
            <div className={styles.bubble10} />
            <div className={styles.bubble11} />
            <div className={styles.bubble12} />
          </div>
          <span className={styles.heroLogoText}>MindCraft</span>
        </div>

        <h1 className={styles.heroTitle}>
          L'<span className={styles.heroGradient}>expérimentation</span> à la portée de toutes et de tous
        </h1>

        <p className={styles.heroSub}>
          Accessible sans coder, ni payer.
        </p>

        <div className={styles.heroPills}>
          {['Questionnaires', 'Tâches comportementales', 'Mesures physiologiques', 'Open Science'].map((p, i) => (
            <span key={p} className={styles.heroPill}>
              <span className={styles.heroPillDot} style={{ animationDelay: `${i * 0.35}s` }}>•</span> {p}
            </span>
          ))}
        </div>

        <div className={styles.heroCtas}>
          {isAuthenticated ? (
            <Link href="/dashboard" className={styles.ctaPrimary}>
              Mon tableau de bord
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M3 8h10m0 0L9 4m4 4L9 12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
            </Link>
          ) : (
            <Link href="/auth/register" className={styles.ctaPrimary}>
              Créer un compte
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M3 8h10m0 0L9 4m4 4L9 12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
            </Link>
          )}
          <Link href="/docs" className={styles.ctaSecondary}>
            Lire la documentation
          </Link>
        </div>

        <div className={styles.heroBadge}>
          {/* Version centralisée dans lib/citation.js — source unique
              partagée avec la modale de citation, la page Mentions
              légales, l'export BibTeX/RIS et CITATION.cff. */}
          <span>v{CITATION_DATA.version}</span>
          <span style={{ opacity: 0.4 }}>|</span>
          <span>Open source & gratuit</span>
        </div>
      </section>

      {/* ── Features ────────────────────────────────────────────────────────── */}
      <section className={styles.features}>
        <p className={styles.sectionLabel}>Pourquoi MindCraft</p>
        <h2 className={styles.sectionTitle}>Quatre piliers</h2>
        <p className={styles.sectionSub}>
          Une plateforme conçue par des chercheur(e)s, pour des chercheur(e)s. Tout ce dont vous avez besoin pour vos études, centralisé et accessible.
        </p>

        <div className={styles.featureGrid}>
          {features.map((f) => (
            <div key={f.title} className={styles.featureCard}>
              <div className={styles.featureIcon} style={{ background: f.bg }}>
                {f.icon}
              </div>
              <h3 className={styles.featureCardTitle}>{f.title}</h3>
              <p className={styles.featureCardDesc}>{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Capabilities ────────────────────────────────────────────────────── */}
      <section className={styles.capabilities}>
        <p className={styles.sectionLabel}>Fonctionnalités</p>
        <h2 className={styles.sectionTitle}>Tout est intégré</h2>
        <p className={styles.sectionSub}>
          Du questionnaire à l'export, en passant par le design expérimental et la synchronisation physiologique.
        </p>

        <CapabilitiesGrid />
      </section>

      {/* ── À propos ──────────────────────────────────────────────────────── */}
      <section className={styles.about}>
        <div className={styles.aboutInner}>
          <div className={styles.aboutText}>
            <p className={styles.sectionLabel}>À propos</p>
            <h2 className={styles.sectionTitle} style={{ textAlign: 'left' }}>Née d'un besoin, conçue pour la communauté</h2>
            <p className={styles.aboutDesc}>
              MindCraft a été conçue par <strong>Dayle David</strong>, enseignante-chercheure en psychologie sociale.
            </p>
            <p className={styles.aboutDesc}>
              Face aux outils existants — souvent coûteux ou réservés à celles et ceux qui maîtrisent un langage de programmation — l'objectif était simple : offrir une plateforme moderne, gratuite et accessible, pensée par et pour les chercheur(e)s.
            </p>
          </div>
          {/* Mock-up UI illustration */}
          <div className={styles.mockup}>
            <div className={styles.mockupBar}>
              <div className={styles.mockupDots}>
                <span /><span /><span />
              </div>
              <div className={styles.mockupUrl}>mindcraft-research.fr</div>
            </div>
            <div className={styles.mockupBody}>
              {/* Sidebar */}
              <div className={styles.mockupSidebar}>
                <div className={styles.mockupSidebarLogo}>
                  <div className={styles.mockupSidebarIcon} />
                  <div className={styles.mockupSidebarText} />
                </div>
                <div className={styles.mockupSidebarItems}>
                  {[0.7, 0.5, 0.6, 0.4, 0.55].map((w, i) => (
                    <div key={i} className={styles.mockupSidebarItem} style={{ opacity: i === 1 ? 1 : 0.4 }}>
                      <div className={styles.mockupSidebarDot} style={{ background: i === 1 ? 'var(--brand-light)' : 'rgba(255,255,255,.3)' }} />
                      <div className={styles.mockupSidebarLine} style={{ width: `${w * 100}%` }} />
                    </div>
                  ))}
                </div>
              </div>
              {/* Main content */}
              <div className={styles.mockupMain}>
                {/* Blocks timeline */}
                <div className={styles.mockupBlocks}>
                  <div className={styles.mockupBlock} style={{ borderLeftColor: '#6366F1' }}>
                    <div className={styles.mockupBlockBadge} style={{ background: '#EEF2FF', color: '#4F46E5' }}>Questionnaire</div>
                    <div className={styles.mockupBlockLines}>
                      <div style={{ width: '80%' }} /><div style={{ width: '60%' }} /><div style={{ width: '70%' }} />
                    </div>
                  </div>
                  <div className={styles.mockupBlock} style={{ borderLeftColor: '#F59E0B' }}>
                    <div className={styles.mockupBlockBadge} style={{ background: '#FEF3C7', color: '#B45309' }}>Tâche</div>
                    <div className={styles.mockupBlockLines}>
                      <div style={{ width: '65%' }} /><div style={{ width: '85%' }} />
                    </div>
                  </div>
                  <div className={styles.mockupBlock} style={{ borderLeftColor: '#10B981' }}>
                    <div className={styles.mockupBlockBadge} style={{ background: '#ECFDF5', color: '#059669' }}>Mesures physiologiques</div>
                    <div className={styles.mockupBlockLines}>
                      <div style={{ width: '75%' }} />
                    </div>
                  </div>
                </div>
                {/* Inspector panel */}
                <div className={styles.mockupInspector}>
                  <div className={styles.mockupInspectorTitle} />
                  <div className={styles.mockupInspectorTabs}>
                    <span className={styles.mockupTabActive} />
                    <span className={styles.mockupTab} />
                    <span className={styles.mockupTab} />
                  </div>
                  <div className={styles.mockupInspectorFields}>
                    <div className={styles.mockupField}><div className={styles.mockupFieldLabel} /><div className={styles.mockupFieldInput} /></div>
                    <div className={styles.mockupField}><div className={styles.mockupFieldLabel} /><div className={styles.mockupFieldInput} /></div>
                    <div className={styles.mockupField}><div className={styles.mockupFieldLabel} /><div className={styles.mockupFieldToggle}><span /></div></div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Contributeurs & remerciements ───────────────────────────────────── */}
      {/*
        Section qui crédite les personnes qui font avancer MindCraft. Deux
        sous-blocs côte à côte (responsive : empilés sur mobile). Pour
        l'instant, le bloc « retours » reste générique : les noms
        individuels ne seront ajoutés qu'avec accord explicite de chaque
        personne (cf. README, section Remerciements).
      */}
      <section className={styles.contributors}>
        <p className={styles.sectionLabel} style={{ color: '#5E59E9' }}>Contributeurs</p>
        <h2 className={styles.sectionTitle}>Contributeurs &amp; remerciements</h2>
        <p className={styles.sectionSub}>
          MindCraft est un projet ouvert. Il avance grâce aux retours, aux tests et aux idées de sa communauté.
        </p>

        <div className={styles.contribGrid}>
          {/* ── Sous-bloc 1 : Conception & développement ───────────── */}
          <div className={styles.contribCard}>
            <p className={styles.contribCardLabel}>Conception &amp; développement</p>
            <div className={styles.contribPerson}>
              <span className={styles.contribAvatar} aria-hidden="true">DD</span>
              <div className={styles.contribPersonText}>
                <p className={styles.contribName}>Dayle David</p>
                <p className={styles.contribRole}>Conception, développement et maintenance</p>
                <p className={styles.contribAffil}>LP3C — Université Rennes 2</p>
              </div>
            </div>
          </div>

          {/* ── Sous-bloc 2 : Avec les retours de ──────────────────── */}
          {/*
            Structure prête à accueillir des cartes nominatives : chaque
            futur·e contributeur·rice obtiendra un .contribPerson avec
            son avatar/initiale, son nom et une ou plusieurs pastilles
            « bugs » / « suggestions ». Tant qu'aucun nom n'est confirmé
            par accord explicite, on affiche uniquement le libellé
            générique « la communauté de test ».
          */}
          <div className={styles.contribCard}>
            <p className={styles.contribCardLabel}>Avec les retours de</p>
            <div className={styles.contribPerson}>
              <span className={styles.contribAvatarCommunity} aria-hidden="true">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                  <circle cx="9" cy="8" r="3.5" stroke="currentColor" strokeWidth="1.7" />
                  <circle cx="17" cy="9" r="2.8" stroke="currentColor" strokeWidth="1.7" />
                  <path d="M3 19c0-3 2.5-5 6-5s6 2 6 5" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round"/>
                  <path d="M14.5 16.5c.5-.3 1.5-.5 2.5-.5 2.5 0 4 1.5 4 3.5" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round"/>
                </svg>
              </span>
              <div className={styles.contribPersonText}>
                <p className={styles.contribName}>La communauté de test</p>
                <p className={styles.contribRole}>
                  Les personnes qui prennent le temps de tester MindCraft, de signaler des bugs et de suggérer des améliorations.
                </p>
                {/*
                  Quand on aura les accords, les pastilles s'ajouteront ici :
                  <div className={styles.contribTags}>
                    <span className={styles.contribTag}>bugs</span>
                    <span className={styles.contribTag}>suggestions</span>
                  </div>
                */}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── CTA ─────────────────────────────────────────────────────────────── */}
      <section className={styles.cta}>
        <div className={styles.ctaBox}>
          <h2 className={styles.ctaTitle}>
            {isAuthenticated ? 'Prêt à concevoir votre prochaine étude ?' : 'Prêt à expérimenter ?'}
          </h2>
          <p className={styles.ctaDesc}>
            {isAuthenticated
              ? 'Retrouvez vos projets et explorez le projet de démonstration depuis votre tableau de bord.'
              : 'Créez votre compte en quelques secondes. Un projet de démonstration vous attend pour découvrir toutes les fonctionnalités.'}
          </p>
          <div className={styles.ctaButtons}>
            <Link href={isAuthenticated ? '/dashboard' : '/auth/register'} className={styles.ctaPrimary}>
              {isAuthenticated ? 'Mon tableau de bord' : 'Commencer'}
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M3 8h10m0 0L9 4m4 4L9 12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
            </Link>
            <a href="mailto:contact@mindcraft-research.fr" className={styles.ctaSecondary}>
              Nous contacter
            </a>
          </div>
        </div>
      </section>

      {/* ── Footer ──────────────────────────────────────────────────────────── */}
      <footer className={styles.footer}>
        <div className={styles.footerLeft}>
          <span className={styles.navLogoMark} style={{ width: 26, height: 26, borderRadius: 7 }}>
            <FlaskLogo size={12} />
          </span>
          <span className={styles.footerText}>
            © 2026 MindCraft ·{' '}
            <a
              href="https://github.com/mindcraft-research/mindcraft/blob/main/LICENSE"
              target="_blank"
              rel="noopener noreferrer"
              className={styles.footerLink}
            >
              AGPL-3.0
            </a>{' '}
            ·{' '}
            <Link href="/terms" className={styles.footerLink}>
              CGU non-commerciales
            </Link>
          </span>
        </div>
        <div className={styles.footerLinks}>
          <Link href="/about" className={styles.footerLink}>A propos</Link>
          <Link href="/docs" className={styles.footerLink}>Documentation</Link>
          <Link href="/terms" className={styles.footerLink}>CGU</Link>
          <a href="mailto:contact@mindcraft-research.fr" className={styles.footerLink}>Contact</a>
        </div>
      </footer>

      {/* Bannière cookies */}
      <CookieBanner />
    </>
  )
}
