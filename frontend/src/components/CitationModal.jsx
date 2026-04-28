// SPDX-License-Identifier: AGPL-3.0-or-later
import { useState, useEffect } from 'react'
import {
  CITATION_DATA,
  buildAPA,
  buildBibTeX,
  buildRIS,
} from '../lib/citation'
import styles from './CitationModal.module.css'

const FORMATS = [
  { id: 'apa', label: 'APA', build: buildAPA },
  { id: 'bibtex', label: 'BibTeX', build: buildBibTeX },
  { id: 'ris', label: 'RIS', build: buildRIS },
]

export default function CitationModal({ open, onClose }) {
  const [activeTab, setActiveTab] = useState('apa')
  const [copied, setCopied] = useState(false)

  // Réinitialiser l'état "copié" quand on change d'onglet
  useEffect(() => {
    setCopied(false)
  }, [activeTab])

  // Fermer avec la touche Escape
  useEffect(() => {
    if (!open) return
    const handler = (e) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [open, onClose])

  if (!open) return null

  const format = FORMATS.find((f) => f.id === activeTab) || FORMATS[0]
  const text = format.build(CITATION_DATA)

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // Fallback : sélectionner le texte si clipboard.writeText échoue
      const el = document.getElementById('citation-text')
      if (el) {
        const range = document.createRange()
        range.selectNodeContents(el)
        const sel = window.getSelection()
        sel.removeAllRanges()
        sel.addRange(range)
      }
    }
  }

  return (
    <div
      className={styles.backdrop}
      onClick={onClose}
      role="presentation"
    >
      <div
        className={styles.modal}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="citation-modal-title"
      >
        <div className={styles.header}>
          <h2 id="citation-modal-title" className={styles.title}>
            Citer MindCraft
          </h2>
          <button
            type="button"
            className={styles.closeButton}
            onClick={onClose}
            aria-label="Fermer la fenêtre de citation"
          >
            ×
          </button>
        </div>

        <div className={styles.metadata}>
          <div className={styles.metaRow}>
            <span className={styles.metaLabel}>Version</span>
            <span className={styles.metaValue}>{CITATION_DATA.version}</span>
          </div>
          <div className={styles.metaRow}>
            <span className={styles.metaLabel}>Date</span>
            <span className={styles.metaValue}>
              {CITATION_DATA.releaseDate}
            </span>
          </div>
          <div className={styles.metaRow}>
            <span className={styles.metaLabel}>DOI</span>
            <a
              href={CITATION_DATA.doiUrl}
              target="_blank"
              rel="noopener noreferrer"
              className={styles.metaLink}
            >
              {CITATION_DATA.doi}
            </a>
          </div>
          <div className={styles.metaRow}>
            <span className={styles.metaLabel}>SWHID</span>
            <a
              href={CITATION_DATA.swhUrl}
              target="_blank"
              rel="noopener noreferrer"
              className={styles.metaLinkMono}
              title={CITATION_DATA.swhid}
            >
              {CITATION_DATA.swhid.slice(0, 24)}…
            </a>
          </div>
          <div className={styles.metaRow}>
            <span className={styles.metaLabel}>Dépôt</span>
            <a
              href={CITATION_DATA.repository}
              target="_blank"
              rel="noopener noreferrer"
              className={styles.metaLink}
            >
              github.com/mindcraft-research/mindcraft
            </a>
          </div>
        </div>

        <div className={styles.tabs} role="tablist">
          {FORMATS.map((f) => (
            <button
              key={f.id}
              type="button"
              role="tab"
              aria-selected={activeTab === f.id}
              className={`${styles.tab} ${activeTab === f.id ? styles.tabActive : ''}`}
              onClick={() => setActiveTab(f.id)}
            >
              {f.label}
            </button>
          ))}
        </div>

        <pre id="citation-text" className={styles.codeBlock}>
          <code>{text}</code>
        </pre>

        <div className={styles.actions}>
          <button
            type="button"
            className={styles.copyButton}
            onClick={handleCopy}
          >
            {copied ? '✓ Copié !' : 'Copier dans le presse-papier'}
          </button>
          <button
            type="button"
            className={styles.cancelButton}
            onClick={onClose}
          >
            Fermer
          </button>
        </div>

        <p className={styles.footer}>
          Format APA pour articles · BibTeX pour LaTeX · RIS pour Zotero,
          EndNote, Mendeley.
        </p>
      </div>
    </div>
  )
}
