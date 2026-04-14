import { useState } from 'react'
import styles from './OnboardingTour.module.css'

// ─── Illustrations SVG inline ────────────────────────────────────────────────

function IllustrationWelcome() {
  return (
    <svg viewBox="0 0 280 140" fill="none" className={styles.illustration}>
      <rect x="20" y="20" width="240" height="100" rx="12" fill="#f0f0ff" stroke="#6366f1" strokeWidth="1.5" />
      <rect x="30" y="30" width="50" height="80" rx="8" fill="#6366f1" opacity="0.15" />
      <rect x="38" y="42" width="34" height="4" rx="2" fill="#6366f1" opacity="0.5" />
      <rect x="38" y="52" width="28" height="4" rx="2" fill="#6366f1" opacity="0.3" />
      <rect x="38" y="62" width="30" height="4" rx="2" fill="#6366f1" opacity="0.3" />
      <rect x="38" y="72" width="26" height="4" rx="2" fill="#6366f1" opacity="0.3" />
      <rect x="38" y="82" width="32" height="4" rx="2" fill="#6366f1" opacity="0.3" />
      <rect x="90" y="30" width="160" height="80" rx="8" fill="#fff" stroke="#e5e7eb" strokeWidth="1" />
      <text x="170" y="65" textAnchor="middle" fontSize="14" fontWeight="700" fill="#6366f1" fontFamily="sans-serif">MindCraft</text>
      <text x="170" y="82" textAnchor="middle" fontSize="8" fill="#9ca3af" fontFamily="sans-serif">Plateforme de recherche</text>
      <circle cx="45" cy="36" r="3" fill="#6366f1" />
    </svg>
  )
}

function IllustrationProjects() {
  return (
    <svg viewBox="0 0 280 140" fill="none" className={styles.illustration}>
      {[0, 1, 2].map((i) => (
        <g key={i} transform={`translate(${20 + i * 88}, 20)`}>
          <rect width="80" height="100" rx="10" fill={i === 0 ? '#6366f1' : '#f3f4f6'} stroke={i === 0 ? '#6366f1' : '#d1d5db'} strokeWidth="1.5" />
          <rect x="12" y="14" width="56" height="6" rx="3" fill={i === 0 ? '#fff' : '#d1d5db'} opacity={i === 0 ? 0.9 : 0.7} />
          <rect x="12" y="26" width="40" height="4" rx="2" fill={i === 0 ? '#fff' : '#e5e7eb'} opacity={i === 0 ? 0.5 : 0.5} />
          <rect x="12" y="44" width="56" height="24" rx="6" fill={i === 0 ? 'rgba(255,255,255,0.15)' : '#f9fafb'} stroke={i === 0 ? 'rgba(255,255,255,0.3)' : '#e5e7eb'} strokeWidth="1" />
          <text x="40" y="60" textAnchor="middle" fontSize="8" fill={i === 0 ? '#fff' : '#9ca3af'} fontFamily="sans-serif">{['3 études', '1 étude', '2 études'][i]}</text>
          <circle cx="20" cy="82" r="5" fill={i === 0 ? 'rgba(255,255,255,0.3)' : '#e5e7eb'} />
          <circle cx="32" cy="82" r="5" fill={i === 0 ? 'rgba(255,255,255,0.2)' : '#f3f4f6'} />
        </g>
      ))}
    </svg>
  )
}

function IllustrationBuilder() {
  const blocks = [
    { y: 8, color: '#8b5cf6', label: 'Accueil' },
    { y: 34, color: '#0d9488', label: 'Questions' },
    { y: 60, color: '#993C1D', label: 'Tâche' },
    { y: 86, color: '#854F0B', label: 'Logique' },
    { y: 112, color: '#6b7280', label: 'Fin' },
  ]
  return (
    <svg viewBox="0 0 280 140" fill="none" className={styles.illustration}>
      {/* Palette */}
      <rect x="10" y="4" width="60" height="132" rx="8" fill="#f9fafb" stroke="#e5e7eb" strokeWidth="1" />
      {blocks.map((b, i) => (
        <g key={i}>
          <rect x="18" y={b.y + 4} width="44" height="18" rx="4" fill={b.color} opacity="0.15" />
          <rect x="22" y={b.y + 10} width="36" height="5" rx="2" fill={b.color} opacity="0.5" />
        </g>
      ))}
      {/* Canvas */}
      <rect x="80" y="4" width="190" height="132" rx="8" fill="#fff" stroke="#e5e7eb" strokeWidth="1" />
      {blocks.map((b, i) => (
        <g key={i}>
          <rect x="92" y={b.y + 4} width="166" height="20" rx="6" fill="#fff" stroke={b.color} strokeWidth="1.5" opacity="0.8" />
          <rect x="98" y={b.y + 8} width="40" height="5" rx="2" fill={b.color} opacity="0.6" />
          <circle cx="100" cy={b.y + 19} r="1.5" fill={b.color} opacity="0.3" />
          <rect x="98" y={b.y + 16} width="50" height="3" rx="1.5" fill="#e5e7eb" />
        </g>
      ))}
      {/* Arrow */}
      <path d="M55 70 L80 70" stroke="#6366f1" strokeWidth="1.5" strokeDasharray="3 2" markerEnd="url(#arrowhead)" />
      <defs>
        <marker id="arrowhead" markerWidth="6" markerHeight="4" refX="6" refY="2" orient="auto">
          <polygon points="0 0, 6 2, 0 4" fill="#6366f1" />
        </marker>
      </defs>
    </svg>
  )
}

function IllustrationQuestions() {
  return (
    <svg viewBox="0 0 280 140" fill="none" className={styles.illustration}>
      {/* Radio */}
      <g transform="translate(10, 10)">
        <rect width="80" height="55" rx="8" fill="#f0fdf4" stroke="#0d9488" strokeWidth="1" />
        <circle cx="18" cy="18" r="5" stroke="#0d9488" strokeWidth="1.5" fill="none" />
        <circle cx="18" cy="18" r="2.5" fill="#0d9488" />
        <rect x="28" y="15" width="40" height="5" rx="2" fill="#0d9488" opacity="0.4" />
        <circle cx="18" cy="32" r="5" stroke="#d1d5db" strokeWidth="1.5" fill="none" />
        <rect x="28" y="29" width="35" height="5" rx="2" fill="#d1d5db" />
        <circle cx="18" cy="46" r="5" stroke="#d1d5db" strokeWidth="1.5" fill="none" />
        <rect x="28" y="43" width="30" height="5" rx="2" fill="#d1d5db" />
      </g>
      {/* Likert */}
      <g transform="translate(100, 10)">
        <rect width="80" height="55" rx="8" fill="#f0f0ff" stroke="#6366f1" strokeWidth="1" />
        {[0,1,2,3,4].map((i) => (
          <g key={i}>
            <rect x={8 + i * 14} y="18" width="12" height="26" rx="3" fill={i === 3 ? '#6366f1' : '#e5e7eb'} opacity={i === 3 ? 1 : 0.5} />
            <text x={14 + i * 14} y="34" textAnchor="middle" fontSize="7" fill={i === 3 ? '#fff' : '#9ca3af'} fontFamily="sans-serif">{i + 1}</text>
          </g>
        ))}
      </g>
      {/* Slider */}
      <g transform="translate(190, 10)">
        <rect width="80" height="55" rx="8" fill="#fff7ed" stroke="#f59e0b" strokeWidth="1" />
        <line x1="12" y1="30" x2="68" y2="30" stroke="#e5e7eb" strokeWidth="3" strokeLinecap="round" />
        <line x1="12" y1="30" x2="45" y2="30" stroke="#f59e0b" strokeWidth="3" strokeLinecap="round" />
        <circle cx="45" cy="30" r="6" fill="#f59e0b" />
        <text x="40" y="48" textAnchor="middle" fontSize="8" fill="#92400e" fontFamily="sans-serif">68%</text>
      </g>
      {/* Matrix */}
      <g transform="translate(10, 75)">
        <rect width="170" height="55" rx="8" fill="#faf5ff" stroke="#8b5cf6" strokeWidth="1" />
        {[0,1,2].map((row) => (
          <g key={row}>
            <rect x="8" y={10 + row * 16} width="50" height="4" rx="2" fill="#8b5cf6" opacity="0.3" />
            {[0,1,2,3,4].map((col) => (
              <circle key={col} cx={80 + col * 18} cy={12 + row * 16} r={row === 1 && col === 2 ? 4 : 3.5} fill={row === 1 && col === 2 ? '#8b5cf6' : 'none'} stroke="#8b5cf6" strokeWidth="1" opacity={row === 1 && col === 2 ? 1 : 0.3} />
            ))}
          </g>
        ))}
      </g>
      {/* DnD */}
      <g transform="translate(190, 75)">
        <rect width="80" height="55" rx="8" fill="#fef2f2" stroke="#ef4444" strokeWidth="1" />
        <rect x="10" y="10" width="26" height="14" rx="4" fill="#ef4444" opacity="0.2" />
        <rect x="44" y="10" width="26" height="14" rx="4" fill="#ef4444" opacity="0.2" />
        <rect x="20" y="32" width="40" height="12" rx="4" fill="#ef4444" opacity="0.6" />
        <text x="40" y="41" textAnchor="middle" fontSize="7" fill="#fff" fontFamily="sans-serif">Drop</text>
      </g>
    </svg>
  )
}

function IllustrationTask() {
  return (
    <svg viewBox="0 0 280 140" fill="none" className={styles.illustration}>
      {/* Dark screen */}
      <rect x="20" y="8" width="240" height="124" rx="10" fill="#111827" />
      {/* Progress bar */}
      <rect x="30" y="14" width="220" height="3" rx="1.5" fill="#1f2937" />
      <rect x="30" y="14" width="120" height="3" rx="1.5" fill="#1D9E75" />
      {/* Fixation cross */}
      <text x="90" y="75" fontSize="28" fill="#fff" fontFamily="sans-serif" opacity="0.3">+</text>
      {/* Arrow */}
      <path d="M110 68 L130 68" stroke="#4b5563" strokeWidth="1" strokeDasharray="3 2" />
      {/* Stimulus word */}
      <text x="155" y="75" fontSize="18" fontWeight="700" fill="#fff" fontFamily="sans-serif">Renard</text>
      {/* Key labels */}
      <g transform="translate(40, 100)">
        <rect width="36" height="20" rx="4" fill="#374151" stroke="#4b5563" strokeWidth="1" />
        <text x="18" y="14" textAnchor="middle" fontSize="9" fontWeight="600" fill="#4cc9f0" fontFamily="monospace">F</text>
      </g>
      <text x="86" y="114" fontSize="7" fill="#6b7280" fontFamily="sans-serif">Animal</text>
      <g transform="translate(180, 100)">
        <rect width="36" height="20" rx="4" fill="#374151" stroke="#4b5563" strokeWidth="1" />
        <text x="18" y="14" textAnchor="middle" fontSize="9" fontWeight="600" fill="#a78bfa" fontFamily="monospace">J</text>
      </g>
      <text x="226" y="114" fontSize="7" fill="#6b7280" fontFamily="sans-serif">Végétal</text>
      {/* Feedback */}
      <text x="140" y="90" textAnchor="middle" fontSize="10" fill="#1D9E75" fontFamily="sans-serif" opacity="0.5">✓</text>
    </svg>
  )
}

function IllustrationPhysio() {
  return (
    <svg viewBox="0 0 280 140" fill="none" className={styles.illustration}>
      {/* EEG wave */}
      <rect x="20" y="8" width="240" height="60" rx="8" fill="#f0fdf4" stroke="#059669" strokeWidth="1" />
      <path d="M30 38 L50 38 L55 20 L60 50 L65 25 L70 45 L75 30 L80 38 L100 38 L105 22 L110 48 L115 28 L120 42 L125 33 L130 38 L150 38 L155 18 L160 52 L165 24 L170 44 L175 32 L180 38 L200 38 L205 20 L210 50 L215 26 L220 44 L225 34 L230 38 L250 38" stroke="#059669" strokeWidth="1.5" fill="none" />
      <text x="35" y="18" fontSize="7" fill="#059669" fontWeight="600" fontFamily="sans-serif">EEG</text>
      {/* Markers */}
      <rect x="20" y="78" width="240" height="52" rx="8" fill="#f0f0ff" stroke="#6366f1" strokeWidth="1" />
      {[
        { x: 50, label: 'S', color: '#6366f1' },
        { x: 110, label: 'R', color: '#f59e0b' },
        { x: 170, label: 'FB', color: '#1D9E75' },
        { x: 220, label: 'ITI', color: '#9ca3af' },
      ].map((m, i) => (
        <g key={i}>
          <line x1={m.x} y1="82" x2={m.x} y2="125" stroke={m.color} strokeWidth="1.5" strokeDasharray="4 2" />
          <rect x={m.x - 10} y="96" width="20" height="14" rx="4" fill={m.color} />
          <text x={m.x} y="106" textAnchor="middle" fontSize="7" fontWeight="600" fill="#fff" fontFamily="sans-serif">{m.label}</text>
        </g>
      ))}
      <text x="35" y="92" fontSize="7" fill="#6366f1" fontWeight="600" fontFamily="sans-serif">LSL</text>
    </svg>
  )
}

function IllustrationSecurity() {
  return (
    <svg viewBox="0 0 280 140" fill="none" className={styles.illustration}>
      {/* Shield */}
      <path d="M140 15 L190 35 L190 75 C190 105 165 125 140 130 C115 125 90 105 90 75 L90 35 Z" fill="#eef2ff" stroke="#6366f1" strokeWidth="2" />
      {/* Lock */}
      <rect x="122" y="60" width="36" height="28" rx="4" fill="#6366f1" />
      <path d="M128 60 L128 50 C128 42 133 37 140 37 C147 37 152 42 152 50 L152 60" stroke="#6366f1" strokeWidth="3" fill="none" strokeLinecap="round" />
      <circle cx="140" cy="72" r="3" fill="#fff" />
      <line x1="140" y1="75" x2="140" y2="81" stroke="#fff" strokeWidth="2" strokeLinecap="round" />
      {/* Phone left */}
      <rect x="20" y="30" width="40" height="70" rx="6" fill="#f3f4f6" stroke="#d1d5db" strokeWidth="1.5" />
      <rect x="25" y="40" width="30" height="40" rx="2" fill="#fff" />
      <text x="40" y="63" textAnchor="middle" fontSize="14" fontWeight="700" fill="#6366f1" fontFamily="monospace">2FA</text>
      <circle cx="40" cy="92" r="3" stroke="#d1d5db" strokeWidth="1" fill="none" />
      {/* Code digits right */}
      {['4','8','2','7','1','5'].map((d, i) => (
        <g key={i}>
          <rect x={200 + i * 12} y="60" width="10" height="16" rx="3" fill={i < 3 ? '#6366f1' : '#e5e7eb'} />
          <text x={205 + i * 12} y="72" textAnchor="middle" fontSize="9" fontWeight="600" fill={i < 3 ? '#fff' : '#9ca3af'} fontFamily="monospace">{d}</text>
        </g>
      ))}
      <text x="236" y="90" textAnchor="middle" fontSize="7" fill="#9ca3af" fontFamily="sans-serif">Code à 6 chiffres</text>
      {/* Arrow */}
      <path d="M65 70 L85 70" stroke="#6366f1" strokeWidth="1.5" strokeDasharray="3 2" markerEnd="url(#arr2)" />
      <defs><marker id="arr2" markerWidth="6" markerHeight="4" refX="6" refY="2" orient="auto"><polygon points="0 0, 6 2, 0 4" fill="#6366f1" /></marker></defs>
    </svg>
  )
}

function IllustrationFeedback() {
  return (
    <svg viewBox="0 0 280 140" fill="none" className={styles.illustration}>
      {/* Chat bubble */}
      <rect x="60" y="10" width="160" height="100" rx="12" fill="#fff" stroke="#6366f1" strokeWidth="1.5" />
      <polygon points="90,110 100,125 110,110" fill="#fff" stroke="#6366f1" strokeWidth="1.5" strokeLinejoin="round" />
      <line x1="91" y1="110" x2="110" y2="110" stroke="#fff" strokeWidth="2" />
      {/* Type selector */}
      {[
        { x: 74, label: '🐛', bg: '#fef2f2', border: '#fecaca' },
        { x: 118, label: '💡', bg: '#fffbeb', border: '#fde68a' },
        { x: 162, label: '✨', bg: '#eef2ff', border: '#c7d2fe' },
      ].map((t, i) => (
        <g key={i}>
          <rect x={t.x} y="22" width="36" height="28" rx="6" fill={i === 1 ? t.bg : '#f9fafb'} stroke={i === 1 ? t.border : '#e5e7eb'} strokeWidth="1.5" />
          <text x={t.x + 18} y="41" textAnchor="middle" fontSize="14">{t.label}</text>
        </g>
      ))}
      {/* Text area lines */}
      <rect x="74" y="58" width="132" height="40" rx="6" fill="#f9fafb" stroke="#e5e7eb" strokeWidth="1" />
      <rect x="80" y="66" width="90" height="4" rx="2" fill="#d1d5db" />
      <rect x="80" y="76" width="60" height="4" rx="2" fill="#d1d5db" opacity="0.5" />
      {/* Send button */}
      <rect x="158" y="84" width="42" height="10" rx="4" fill="#6366f1" />
      <text x="179" y="92" textAnchor="middle" fontSize="5.5" fontWeight="600" fill="#fff" fontFamily="sans-serif">Envoyer</text>
      {/* Floating button */}
      <circle cx="240" cy="120" r="16" fill="#6366f1" />
      <path d="M234 118 a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v6l-3 3v-3h-7a2 2 0 0 1-2-2z" stroke="#fff" strokeWidth="1.5" fill="none" />
    </svg>
  )
}

function IllustrationDemo() {
  return (
    <svg viewBox="0 0 280 140" fill="none" className={styles.illustration}>
      {/* Study card */}
      <rect x="40" y="10" width="200" height="120" rx="12" fill="#fff" stroke="#6366f1" strokeWidth="2" />
      <rect x="40" y="10" width="200" height="36" rx="12" fill="#6366f1" opacity="0.08" />
      <rect x="40" y="42" width="200" height="2" fill="#6366f1" opacity="0.1" />
      <text x="140" y="33" textAnchor="middle" fontSize="10" fontWeight="700" fill="#1e3a5f" fontFamily="sans-serif">Étude de démonstration</text>
      {/* Block list */}
      {['Accueil', 'Consentement', 'Choix unique', 'Échelles', 'Tâche', '...'].map((label, i) => (
        <g key={i}>
          <rect x="52" y={50 + i * 12} width={8} height={8} rx="2" fill={['#8b5cf6', '#0d9488', '#0d9488', '#0d9488', '#993C1D', '#d1d5db'][i]} opacity="0.6" />
          <text x="66" y={57 + i * 12} fontSize="7" fill="#6b7280" fontFamily="sans-serif">{label}</text>
        </g>
      ))}
      {/* Preview button */}
      <rect x="150" y="98" width="76" height="22" rx="6" fill="#6366f1" />
      <text x="188" y="113" textAnchor="middle" fontSize="8" fontWeight="600" fill="#fff" fontFamily="sans-serif">Explorer →</text>
      {/* Sparkle */}
      <text x="230" y="25" fontSize="16" opacity="0.6">✨</text>
    </svg>
  )
}

// ─── Steps ───────────────────────────────────────────────────────────────────

const STEPS = [
  {
    title: 'Bienvenue sur MindCraft !',
    description: 'Découvrons ensemble les grandes fonctionnalités de la plateforme. Ce tour rapide vous guidera à travers les points essentiels.',
    Illustration: IllustrationWelcome,
  },
  {
    title: 'Vos projets',
    description: 'Organisez vos recherches en projets. Chaque projet peut contenir plusieurs études et être partagé avec des collaborateurs.',
    Illustration: IllustrationProjects,
  },
  {
    title: "Le constructeur d'études",
    description: "Assemblez votre étude en glissant des blocs : message d'accueil, questionnaires, tâches comportementales, logique conditionnelle et message de fin.",
    Illustration: IllustrationBuilder,
  },
  {
    title: '+30 types de questions',
    description: 'Choix unique, choix multiple, échelles de Likert, matrices, curseurs, classement, texte à trous, glisser-déposer, zone cliquable, calcul automatique, et bien plus.',
    Illustration: IllustrationQuestions,
  },
  {
    title: 'Tâches comportementales',
    description: 'Créez des tâches internes (catégorisation, temps de réaction...) avec stimuli textuels ou visuels, ou intégrez des outils externes comme PsyToolkit ou PsychoPy.',
    Illustration: IllustrationTask,
  },
  {
    title: 'Mesures physiologiques',
    description: 'Compatible EEG, ECG, eye-tracking : horodatage haute précision automatique et marqueurs LSL pour synchroniser vos enregistrements.',
    Illustration: IllustrationPhysio,
  },
  {
    title: 'Sécurisez votre compte',
    description: "Nous vous recommandons d'activer la double authentification (2FA) pour protéger vos données de recherche. Vous aurez besoin d'une application gratuite comme Google Authenticator, Microsoft Authenticator ou Authy sur votre téléphone. Rendez-vous dans Paramètres pour l'activer.",
    Illustration: IllustrationSecurity,
  },
  {
    title: 'Votre étude de démonstration',
    description: "Nous avons créé un projet « Démo MindCraft » avec une étude complète. Explorez-la pour découvrir toutes les possibilités ! Vous pourrez la supprimer quand vous le souhaitez.",
    Illustration: IllustrationDemo,
  },
  {
    title: 'Votre avis compte',
    description: "Vous avez repéré un bug, une idée d'amélioration ou une fonctionnalité manquante ? Cliquez sur la bulle en bas à droite de l'écran pour nous en faire part. Chaque retour nous aide à améliorer la plateforme.",
    Illustration: IllustrationFeedback,
  },
]

// ─── Component ───────────────────────────────────────────────────────────────

export default function OnboardingTour({ onComplete }) {
  const [step, setStep] = useState(0)
  const current = STEPS[step]
  const isLast = step === STEPS.length - 1
  const Illust = current.Illustration

  return (
    <div className={styles.overlay}>
      <div className={styles.modal}>
        {/* Progress bar */}
        <div className={styles.progress}>
          <div className={styles.progressFill} style={{ width: `${((step + 1) / STEPS.length) * 100}%` }} />
        </div>

        {/* Step counter */}
        <div className={styles.stepCount}>{step + 1} / {STEPS.length}</div>

        {/* Illustration */}
        <div className={styles.illustrationWrap}>
          <Illust />
        </div>

        {/* Content */}
        <h2 className={styles.title}>{current.title}</h2>
        <p className={styles.description}>{current.description}</p>

        {/* Navigation */}
        <div className={styles.nav}>
          {step > 0 && (
            <button className={styles.backBtn} onClick={() => setStep((s) => s - 1)}>
              ← Précédent
            </button>
          )}
          <button className={styles.nextBtn} onClick={() => (isLast ? onComplete() : setStep((s) => s + 1))}>
            {isLast ? 'Commencer à explorer →' : 'Suivant →'}
          </button>
        </div>

        {/* Skip */}
        <button className={styles.skipBtn} onClick={onComplete}>
          Passer le tour
        </button>
      </div>
    </div>
  )
}
