import { useState, useEffect } from 'react'
import { CHANGELOG } from '../lib/changelog'
import styles from './WhatsNewPopup.module.css'

// Pop-up « Nouveautés » : présente les entrées du journal (changelog) pas
// encore vues — on mémorise dans le navigateur l'`id` de la dernière entrée
// vue. Si plusieurs nouveautés sont sorties depuis la dernière visite, elles
// sont toutes montrées (MAX_ENTREES au plus), pour qu'aucune ne passe
// inaperçue. Première visite, ou entrée vue trop ancienne : la dernière
// seulement. Fermable ; si le stockage local est indisponible (navigation
// privée…), le pop-up s'affiche à chaque fois.
const STORAGE_KEY = 'mindcraft_whatsnew_seen'
const MAX_ENTREES = 3

export default function WhatsNewPopup() {
  const [open, setOpen] = useState(false)
  const [entrees, setEntrees] = useState([])
  const latest = CHANGELOG[0]

  useEffect(() => {
    if (!latest) return
    let seen = null
    try { seen = localStorage.getItem(STORAGE_KEY) } catch { /* stockage indisponible */ }
    if (seen === latest.id) return
    const iVue = CHANGELOG.findIndex((e) => e.id === seen)
    setEntrees(iVue > 0 ? CHANGELOG.slice(0, Math.min(iVue, MAX_ENTREES)) : [latest])
    setOpen(true)
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
      <div className={styles.corps}>
        {entrees.map((e, k) => (
          <div key={e.id}>
            {/* Même mois que l'entrée précédente : pas de date répétée. */}
            {(k === 0 || entrees[k - 1].date !== e.date) && <div className={styles.date}>{e.date}</div>}
            <ul className={styles.list}>
              {e.items.map((item, i) => <li key={i}>{item}</li>)}
            </ul>
          </div>
        ))}
      </div>
      <button className={styles.ok} onClick={close}>Compris</button>
    </div>
  )
}
