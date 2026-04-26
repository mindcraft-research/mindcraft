import { Html, Head, Main, NextScript } from 'next/document'

/**
 * Document de base de MindCraft.
 * - lang="fr" : indispensable pour le SEO et l'accessibilité (lecteurs d'écran).
 * - Métadonnées partagées par toutes les pages : favicon, theme-color, etc.
 *   Les meta spécifiques à chaque page (title, description, OG) sont définies
 *   dans le <Head> de chaque composant page.
 */
export default function Document() {
  return (
    <Html lang="fr">
      <Head>
        {/* Favicon (à remplacer par un vrai .ico/.png si besoin) */}
        <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
        {/* Couleur de l'interface du navigateur (mobile) */}
        <meta name="theme-color" content="#0B0C17" />
        {/* Référencement */}
        <meta name="robots" content="index,follow" />
      </Head>
      <body>
        <Main />
        <NextScript />
      </body>
    </Html>
  )
}
