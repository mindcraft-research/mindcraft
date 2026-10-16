import css from './EtapesEtude.module.css'

// Barre d'étapes d'une étude : préenregistrement → conception → collecte →
// science ouverte. Chaque étape montre où en est l'étude et ouvre l'onglet
// concerné. Purement informative : elle ne bloque rien.
//
// Une seule bande, aux couleurs de la page d'accueil (fond #0B0C17, accent
// indigo) : l'état se lit au symbole (✓ fait, ! à vérifier, numéro à faire)
// et au texte, pas à la couleur.

const INDIGO = '#6366F1'
const date = (d) => new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' })

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
  } else if (meta.noPrereg) prereg = { etat: 'fait', texte: 'Sans préenregistrement', aide: 'Vous avez indiqué que cette étude n’a pas de préenregistrement.' }
  else if (meta.preregistration) prereg = { etat: 'fait', texte: 'Fait ailleurs (lien renseigné)', aide: 'Un lien vers un préenregistrement fait sur une autre plateforme est renseigné dans l’onglet Open Science.' }
  else if (p) prereg = { etat: 'afaire', texte: 'Brouillon' }
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
    <nav aria-label="Étapes de l’étude" className={css.barre}>
      {liste.map((e, i) => (
        <button
          key={e.titre} type="button" onClick={() => onOuvrir?.(e.onglet)}
          title={`${e.aide ? `${e.aide} ` : ''}Ouvrir l’onglet ${e.nomOnglet}.`}
          className={css.etape}
        >
          <span aria-hidden="true" style={{
            flex: '0 0 auto', width: 22, height: 22, borderRadius: '50%', display: 'grid', placeItems: 'center',
            fontSize: 12, fontWeight: 700,
            ...(e.etat === 'afaire'
              ? { color: 'rgba(255,255,255,0.75)', border: '1.5px solid rgba(255,255,255,0.35)' }
              : { color: '#fff', background: INDIGO }),
          }}>{e.etat === 'fait' ? '✓' : e.etat === 'attention' ? '!' : i + 1}</span>
          <span style={{ minWidth: 0 }}>
            <span style={{ display: 'block', fontSize: 13, fontWeight: 700, color: '#fff' }}>{e.titre}</span>
            <span style={{ display: 'block', fontSize: 12, lineHeight: 1.35, color: 'rgba(255,255,255,0.7)' }}>{e.texte}</span>
          </span>
        </button>
      ))}
    </nav>
  )
}
