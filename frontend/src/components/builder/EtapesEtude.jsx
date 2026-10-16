import css from './EtapesEtude.module.css'

// Barre d'étapes d'une étude : préenregistrement → conception → collecte →
// science ouverte. Chaque étape montre où en est l'étude et ouvre l'onglet
// concerné. Purement informative : elle ne bloque rien.
//
// Verticale, dans la colonne de gauche (sidebar sombre), aux couleurs de la
// sidebar : l'état se lit au symbole (✓ fait, ! à vérifier, numéro à faire)
// et au texte.

const date = (d) => new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' })

// Où se fait le préenregistrement : 'mindcraft' (défaut), 'ailleurs' ou
// 'aucun' (metadata.preregMode). Sans choix enregistré, une étude qui a
// seulement un lien de préenregistrement dans l'onglet Open Science, sans
// préenregistrement MindCraft, est considérée comme « ailleurs ».
export function modePrereg(study) {
  const meta = study?.metadata || {}
  if (['mindcraft', 'ailleurs', 'aucun'].includes(meta.preregMode)) return meta.preregMode
  if (meta.preregistration && !study?.preregistration) return 'ailleurs'
  return 'mindcraft'
}

function etapes(study) {
  const p = study.preregistration
  const meta = study.metadata || {}
  const gel = study.freezes?.[0]
  const { commences = 0, termines = 0 } = study.participants || {}
  const objectif = study.design?.targetN

  // 1. Préenregistrement (MindCraft, fait ailleurs, ou volontairement absent).
  let prereg
  if (p?.withdrawnAt) prereg = { etat: 'attention', texte: 'Retiré' }
  else if (p?.status === 'LOCKED') {
    const n = p._count?.amendments || 0
    prereg = { etat: 'fait', texte: `Verrouillé le ${date(p.lockedAt)}${n ? ` · ${n} amendement${n > 1 ? 's' : ''}` : ''}` }
  } else if (modePrereg(study) === 'aucun') prereg = { etat: 'fait', texte: 'Sans préenregistrement', aide: 'Vous avez indiqué que cette étude n’a pas de préenregistrement.' }
  else if (modePrereg(study) === 'ailleurs') {
    prereg = meta.preregistration
      ? { etat: 'fait', texte: 'Fait ailleurs', aide: `Préenregistrement fait sur une autre plateforme : ${meta.preregistration}` }
      : { etat: 'afaire', texte: 'Fait ailleurs · lien à indiquer' }
  } else if (p) prereg = { etat: 'afaire', texte: 'Brouillon' }
  else prereg = { etat: 'afaire', texte: 'Non commencé' }

  // 2. Conception : version enregistrée au premier participant, ou en cours.
  let conception
  if (!gel) conception = { etat: 'afaire', texte: `En cours · modifiée le ${date(study.updatedAt)}`, onglet: 'builder' }
  else if ((study.version ?? 0) > (gel.version ?? 0)) {
    conception = {
      etat: 'attention', texte: 'Modifiée pendant la collecte', onglet: 'notebook',
      aide: 'Tous les participants n’ont pas vu la même version. Le détail des modifications est dans le cahier de labo.',
    }
  } else {
    conception = {
      etat: 'fait', texte: `Version enregistrée le ${date(gel.createdAt)}`, onglet: 'notebook',
      aide: 'MindCraft a gardé une copie de l’étude telle que vue par le premier participant. Elle est téléchargeable depuis le cahier de labo.',
    }
  }

  // 3. Collecte.
  let collecte
  if (study.status === 'COLLECTING') collecte = { etat: 'afaire', texte: objectif ? `En collecte (${commences}/${objectif})` : `En collecte (${commences} participant${commences > 1 ? 's' : ''})` }
  else if (study.status === 'ARCHIVED') collecte = { etat: 'fait', texte: `Terminée · ${termines} ayant terminé` }
  else collecte = { etat: 'afaire', texte: 'Pas commencée' }

  // 4. Science ouverte : dépôt des données ou du matériel renseigné.
  const science = meta.dataUrl || meta.materialsUrl
    ? { etat: 'fait', texte: 'Dépôt renseigné' }
    : { etat: 'afaire', texte: 'Dépôt à faire' }

  return [
    { titre: 'Préenregistrement', onglet: 'prereg', nomOnglet: 'Préenregistrement', ...prereg },
    { titre: 'Conception', nomOnglet: conception.onglet === 'builder' ? 'Constructeur' : 'Cahier de labo', ...conception },
    { titre: 'Collecte', onglet: 'design', nomOnglet: 'Design (suivi du recrutement)', ...collecte },
    { titre: 'Science ouverte', onglet: 'openscience', nomOnglet: 'Open Science', ...science },
  ]
}

export default function EtapesEtude({ study, onOuvrir }) {
  if (!study) return null
  const liste = etapes(study)
  return (
    <nav aria-label="Avancement de l’étude" className={css.bloc}>
      <div className={css.intitule}>Avancement de l’étude</div>
      <div className={css.liste}>
        {liste.map((e, i) => (
          <button
            key={e.titre} type="button" onClick={() => onOuvrir?.(e.onglet)}
            className={`${css.etape} ${e.etat === 'fait' ? css.fait : ''}`}
            title={`${e.aide ? `${e.aide} ` : ''}Ouvrir l’onglet ${e.nomOnglet}.`}
          >
            <span className={css.pastille} aria-hidden="true">{e.etat === 'fait' ? '✓' : e.etat === 'attention' ? '!' : i + 1}</span>
            <span className={css.textes}>
              <span className={css.titre}>{e.titre}</span>
              <span className={css.etat}>{e.texte}</span>
            </span>
          </button>
        ))}
      </div>
    </nav>
  )
}
