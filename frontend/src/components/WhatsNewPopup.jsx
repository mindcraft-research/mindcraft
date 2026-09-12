import { useState, useEffect } from 'react'
import { CHANGELOG } from '../lib/changelog'
import styles from './WhatsNewPopup.module.css'

// Pop-up « Nouveautés » : présente la dernière entrée du journal (changelog).
// Affichée une seule fois par version — on mémorise dans le navigateur l'`id`
// de la dernière entrée vue. Dès que l'entrée en tête change d'`id`, le pop-up
// réapparaît pour tout le monde. Fermable ; sans effet si le stockage local
// est indisponible (navigation privée…), auquel cas il s'affiche à chaque fois.
const STORAGE_KEY = 'mindcraft_whatsnew_seen'

export default function WhatsNewPopup() {
  const [open, setOpen] = useState(false)
  const latest = CHANGELOG[0]

  useEffect(() => {
    if (!latest) return
    let seen = null
    try { seen = localStorage.getItem(STORAGE_KEY) } catch { /* stockage indisponible */ }
    if (seen !== latest.id) setOpen(true)
  }, [latest])

  const close = () => {
    try { localStorage.setItem(STORAGE_KEY, latest.id) } catch { /* stockage indisponible */ }
    setOpen(false)
  }

  if (!open || !latest) return null

  return (
    <div className={styles.card} role="dialog" aria-label="Nouveautés de MindCraft">
      <div className={styles.head}>
        <span className={styles.title}>✨ Nouveautés</span>
        <button className={styles.close} onClick={close} title="Fermer" aria-label="Fermer">✕</button>
      </div>
      <div className={styles.date}>{latest.date}</div>
      <ul className={styles.list}>
        {latest.items.map((item, i) => <li key={i}>{item}</li>)}
      </ul>
      <button className={styles.ok} onClick={close}>Compris</button>
    </div>
  )
}
