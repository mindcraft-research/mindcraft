// Piping : insertion des réponses précédentes dans les textes affichés.
//
// Le·la chercheur·euse écrit un jeton ${CODE} dans un intitulé, une consigne,
// un contenu d'affichage ou un libellé de choix ; à la passation, il est
// remplacé par la réponse déjà donnée à la question `CODE` (blocs précédents
// ou question antérieure du même bloc).
//
// Exemple : « Selon vous, que signifie « ${MotsAssocies} » ? » →
//           « Selon vous, que signifie « mer, bateau, poisson » ? »

const TOKEN = /\$\{\s*([A-Za-z0-9_]+)\s*\}/g

// Met en forme une valeur de réponse pour l'affichage dans un texte.
export function formatPipeValue(v) {
  if (v === null || v === undefined) return ''
  if (Array.isArray(v)) return v.map((x) => String(x)).join(', ')
  if (typeof v === 'object') return Object.values(v).map((x) => String(x)).join(', ')
  return String(v)
}

// Remplace les jetons ${CODE} d'un texte par les valeurs du contexte de réponses.
// Un jeton dont le code est inconnu est remplacé par une chaîne vide (le champ
// n'a pas encore été répondu, ou le code n'existe pas).
export function pipeText(text, ctx) {
  if (typeof text !== 'string' || text.indexOf('${') === -1) return text
  return text.replace(TOKEN, (_, code) => formatPipeValue(ctx?.[code]))
}

// Applique le piping à une question complète : intitulé, contenu, libellés de
// choix et d'items de matrice. Renvoie un nouvel objet (ne mute pas l'original).
export function pipeQuestion(q, ctx) {
  if (!q) return q
  const piped = { ...q, text: pipeText(q.text, ctx) }
  if (Array.isArray(q.choices)) {
    piped.choices = q.choices.map((c) => (c && typeof c.label === 'string' ? { ...c, label: pipeText(c.label, ctx) } : c))
  }
  if (Array.isArray(q.matrixItems)) {
    piped.matrixItems = q.matrixItems.map((it) => (it && typeof it.label === 'string' ? { ...it, label: pipeText(it.label, ctx) } : it))
  }
  return piped
}
