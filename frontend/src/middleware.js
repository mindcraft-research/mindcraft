// SPDX-License-Identifier: AGPL-3.0-or-later
import { NextResponse } from 'next/server'

/**
 * Middleware Next.js — exécuté sur chaque requête.
 *
 * Rôle :
 *   1. Forcer HTTPS : si une requête arrive en HTTP, on redirige en
 *      HTTPS (308 Permanent Redirect). Sans ça, un visiteur qui tape
 *      `http://www.mindcraft-research.fr` peut atterrir sur la version
 *      non sécurisée, où le CORS de l'API rejette les requêtes
 *      (Access-Control-Allow-Origin n'accepte que l'origine HTTPS).
 *
 *   2. Activer HSTS : informe le navigateur qu'il doit toujours utiliser
 *      HTTPS pour ce domaine pendant 1 an, même si l'utilisateur tape
 *      explicitement http:// ou clique sur un vieux lien.
 *
 *      Note : HSTS n'est ajouté QUE quand la requête est déjà en HTTPS
 *      (sinon il est ignoré, c'est la spec).
 *
 * Le header `x-forwarded-proto` est positionné par les reverse proxies
 * en amont (Scaleway serverless containers, Cloudflare, Nginx…) selon
 * le protocole utilisé par le client.
 */
export function middleware(req) {
  const proto = req.headers.get('x-forwarded-proto')
  const host = req.headers.get('host') || ''
  const hostname = host.split(':')[0]

  // 1) Redirection HTTP → HTTPS en production publique
  // On laisse passer dans deux cas :
  //   - NODE_ENV !== production (dev local avec `npm run dev`)
  //   - le hostname est local (localhost / 127.0.0.1) — utile pour les
  //     visiteurs qui testent l'image Docker via `docker compose up`
  //     où Next.js tourne en production mais le trafic reste en HTTP.
  const isLocalhost = hostname === 'localhost' || hostname === '127.0.0.1'
  if (
    process.env.NODE_ENV === 'production' &&
    proto === 'http' &&
    !isLocalhost
  ) {
    // On reconstruit l'URL à partir du host public (sans le port
    // interne du conteneur Next.js, qui sinon fuirait dans la
    // redirection : https://example.com:3000/ → cassé).
    const target = `https://${hostname}${req.nextUrl.pathname}${req.nextUrl.search}`
    return NextResponse.redirect(target, 308)
  }

  // 2) HSTS — uniquement si on est déjà en HTTPS
  const res = NextResponse.next()
  if (proto === 'https') {
    res.headers.set(
      'Strict-Transport-Security',
      'max-age=31536000; includeSubDomains'
    )
  }
  return res
}

// Le middleware s'applique à toutes les routes sauf les ressources
// statiques de Next (qui sont déjà servies via le bon protocole) et
// le favicon.
export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.svg|favicon.ico).*)'],
}
