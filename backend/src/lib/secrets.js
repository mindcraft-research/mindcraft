// SPDX-License-Identifier: AGPL-3.0-or-later
// ─── CLÉ DE SIGNATURE DES SESSIONS (JWT_SECRET) ──────────────────────────────
// Les valeurs d'exemple (docker-compose.yml, .env.example) sont publiques :
// avec elles, n'importe qui pourrait fabriquer une session. Le serveur refuse
// donc de démarrer avec l'une d'elles, sauf en développement ou en test.

const EXEMPLES = /please_change_me|CHANGE_THIS/i
const LONGUEUR_CONSEILLEE = 32

// null si la clé convient, sinon 'manquante', 'exemple' ou 'courte'.
function problemeSecretJwt(secret) {
  if (!secret) return 'manquante'
  if (EXEMPLES.test(secret)) return 'exemple'
  if (secret.length < LONGUEUR_CONSEILLEE) return 'courte'
  return null
}

// Le serveur peut-il démarrer ? { ok, message } — message à afficher sinon null.
function verifierSecretJwt(secret, nodeEnv) {
  const probleme = problemeSecretJwt(secret)
  const local = nodeEnv === 'development' || nodeEnv === 'test'
  if (probleme === 'manquante') {
    return { ok: false, message: 'JWT_SECRET manquant : définissez une clé aléatoire (au moins 32 caractères).' }
  }
  if (probleme === 'exemple') {
    return local
      ? { ok: true, message: 'JWT_SECRET est la valeur d\'exemple : acceptée en développement seulement.' }
      : { ok: false, message: 'JWT_SECRET est la valeur d\'exemple (publique) : remplacez-la par une clé aléatoire (au moins 32 caractères). Démarrage refusé.' }
  }
  if (probleme === 'courte') {
    return { ok: true, message: `JWT_SECRET fait moins de ${LONGUEUR_CONSEILLEE} caractères : une clé plus longue est conseillée.` }
  }
  return { ok: true, message: null }
}

module.exports = { problemeSecretJwt, verifierSecretJwt }
