// Mention affichée près d'un bouton « Enregistrer » : dit s'il reste des
// modifications à enregistrer. Voir lib/suiviModifications.js.
export default function EtatEnregistrement({ modifie, style }) {
  return (
    <span
      role="status"
      style={{
        fontSize: 12.5,
        color: modifie ? '#B45309' : 'var(--text-muted)',
        fontWeight: modifie ? 600 : 400,
        ...style,
      }}
    >
      {modifie ? '● Modifications non enregistrées' : 'Aucune modification à enregistrer'}
    </span>
  )
}

// Note pour les réglages qui s'enregistrent seuls.
export function NoteEnregistrementAuto({ children, style }) {
  return (
    <p style={{ margin: 0, fontSize: 12.5, color: 'var(--text-muted)', lineHeight: 1.5, ...style }}>
      {children || 'Les réglages de cet onglet s’enregistrent automatiquement.'}
    </p>
  )
}
