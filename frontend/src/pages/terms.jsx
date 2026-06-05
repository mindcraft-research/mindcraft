import { useState } from 'react'
import StaticLayout from '../components/StaticLayout'
import CitationModal from '../components/CitationModal'
import { CITATION_DATA } from '../lib/citation'
import styles from './static.module.css'

export default function TermsPage() {
  const [citationOpen, setCitationOpen] = useState(false)

  return (
    <StaticLayout title="Termes et Conditions">
      <div className={styles.pageHeader}>
        <h1 className={styles.pageTitle}>Termes et Conditions d'utilisation</h1>
        <p className={styles.pageLead}>
          Dernière mise à jour : avril 2026. En utilisant MindCraft, vous acceptez les présentes conditions.
        </p>
      </div>

      <div className={styles.content}>

        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>Conception et crédits</h2>
          <p className={styles.p}>
            MindCraft a été conçu et développé par <strong>Dayle DAVID, PhD</strong>, Enseignante-Chercheure en psychologie sociale (Université Rennes 2, LP3C).
          </p>
          <p className={styles.p}>
            L'auteur remercie chaleureusement <strong>Arthur Gassen</strong> pour l'expertise et les conseils apportés tout au long du développement de la plateforme.
          </p>
          <p className={styles.p}>
            Par souci de transparence, MindCraft a été développé avec l'assistance de <strong>Claude Code</strong> (Anthropic), un outil d'intelligence artificielle pour le développement logiciel. L'architecture, les choix fonctionnels et le contenu scientifique relèvent de la responsabilité exclusive du concepteur humain.
          </p>
        </section>

        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>1. Objet et champ d'application</h2>
          <p className={styles.p}>
            MindCraft est une plateforme en ligne destinée à la création, la gestion et la collecte de données pour des études en sciences humaines, sociales et comportementales. L'accès à la plateforme est gratuit et réservé à un usage strictement non commercial (recherche, enseignement, apprentissage).
          </p>
        </section>

        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>2. Usage acceptable — projets non commerciaux</h2>
          <p className={styles.p}>
            MindCraft est mis à disposition exclusivement pour des <strong>projets de recherche non commerciaux</strong>. Toute utilisation à des fins commerciales, lucratives ou de collecte de données pour le compte d'organisations privées est strictement interdite.
          </p>
          <p className={styles.p}>Les utilisateurs s'engagent à :</p>
          <ul className={styles.list}>
            <li>Utiliser la plateforme uniquement dans le cadre de projets de recherche légitimes et non commerciaux</li>
            <li>Obtenir les autorisations éthiques nécessaires avant toute collecte de données auprès de participants</li>
            <li>Recueillir le consentement éclairé des participants</li>
            <li>Respecter la réglementation applicable à la protection des données personnelles (RGPD)</li>
            <li>Ne pas tenter de contourner les mesures de sécurité de la plateforme</li>
          </ul>
        </section>

        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>3. Responsabilité des chercheurs</h2>
          <p className={styles.p}>
            En tant qu'utilisateur de MindCraft, vous êtes seul(e) responsable :
          </p>
          <ul className={styles.list}>
            <li>Du contenu des études que vous créez et diffusez</li>
            <li>De l'obtention des autorisations éthiques requises par votre institution</li>
            <li>Du traitement et de la protection des données de vos participants</li>
            <li>De la conformité de votre recherche avec les lois et réglementations en vigueur</li>
            <li>De l'exactitude et de l'intégrité scientifique de vos travaux</li>
          </ul>
        </section>

        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>4. Disponibilité du service et performances</h2>
          <p className={styles.p}>
            MindCraft est fourni <strong>en l'état</strong> (<em>as is</em>), dans le cadre d'un projet à but non lucratif et sans garantie de service commercial. À l'instar d'autres plateformes non-commerciales telles que PsyToolkit, les points suivants s'appliquent :
          </p>
          <ul className={styles.list}>
            <li>Nous ne garantissons pas une disponibilité continue ni ininterrompue du service</li>
            <li>Les performances des serveurs (temps de réponse, latence) peuvent varier selon la charge et ne sauraient être garanties</li>
            <li>Des interruptions de service pour maintenance peuvent survenir sans préavis</li>
            <li>Nous déclinons toute responsabilité en cas de perte de données liée à un dysfonctionnement technique, une interruption de service ou une erreur du serveur</li>
            <li>Il est fortement recommandé d'exporter régulièrement vos données de recherche</li>
          </ul>
          <div className={styles.warnBox}>
            <strong>Recommandation :</strong> Exportez vos données régulièrement depuis l'onglet "Export" du builder. MindCraft ne saurait être tenu responsable de pertes de données liées à des pannes techniques.
          </div>
        </section>

        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>5. Protection des données (RGPD)</h2>

          <h3 className={styles.subsectionTitle} style={{marginTop:16}}>5.1 Principes généraux</h3>
          <p className={styles.p}>
            MindCraft traite les données conformément au Règlement Général sur la Protection des Données (RGPD, UE 2016/679). Les données sont hébergées exclusivement en France. Les participants aux études sont identifiés par des identifiants anonymes (UUID générés aléatoirement). Aucune donnée personnelle des participants n'est collectée par la plateforme elle-même.
          </p>

          <h3 className={styles.subsectionTitle}>5.2 Responsabilité du traitement</h3>
          <p className={styles.p}>
            En tant que chercheur ou chercheuse, vous êtes considéré(e) comme <strong>responsable de traitement</strong> (au sens de l'article 4 du RGPD) des données collectées via vos études. MindCraft agit en qualité de <strong>sous-traitant</strong> (article 28 du RGPD). À ce titre, il vous appartient de :
          </p>
          <ul className={styles.list}>
            <li>Informer vos participants de la collecte de leurs données (article 13)</li>
            <li>Recueillir leur consentement libre, spécifique, éclairé et univoque via le bloc « Consentement » de MindCraft ou tout autre moyen approprié (article 7)</li>
            <li>Ne pas collecter de données à caractère particulièrement sensible sans autorisation éthique spécifique (article 9)</li>
            <li>Respecter le principe de minimisation des données : ne collecter que les données strictement nécessaires à votre recherche (article 5)</li>
            <li>Obtenir les autorisations éthiques nécessaires auprès de votre comité d'éthique avant toute collecte</li>
          </ul>

          <h3 className={styles.subsectionTitle}>5.3 Données collectées par la plateforme</h3>
          <p className={styles.p}>
            MindCraft collecte les données suivantes sur les <strong>utilisateurs inscrits</strong> (chercheurs) :
          </p>
          <ul className={styles.list}>
            <li><strong>Données de compte :</strong> nom d'utilisateur, adresse e-mail, mot de passe (haché avec bcrypt, jamais stocké en clair)</li>
            <li><strong>Données institutionnelles (optionnelles) :</strong> institution, laboratoire, statut, discipline — collectées uniquement à des fins de statistiques anonymisées d'utilisation de la plateforme</li>
            <li><strong>Données techniques :</strong> horodatage de connexion, logs d'activité</li>
          </ul>
          <p className={styles.p}>
            Pour les <strong>participants aux études</strong>, MindCraft ne collecte aucune donnée personnelle. Seules les réponses aux questions et les données expérimentales (temps de réaction, etc.) sont enregistrées, associées à un identifiant anonyme (UUID).
          </p>

          <h3 className={styles.subsectionTitle}>5.4 Droits des utilisateurs (articles 15 à 22)</h3>
          <p className={styles.p}>
            Conformément au RGPD, tout utilisateur inscrit dispose des droits suivants :
          </p>
          <ul className={styles.list}>
            <li><strong>Droit d'accès (article 15) :</strong> vous pouvez consulter vos données depuis la page Paramètres</li>
            <li><strong>Droit de rectification (article 16) :</strong> vous pouvez modifier vos informations de profil à tout moment</li>
            <li><strong>Droit à l'effacement (article 17) :</strong> vous pouvez supprimer votre compte et toutes vos données depuis la page Paramètres. La suppression est définitive et concerne l'ensemble de vos projets, études et données associées</li>
            <li><strong>Droit à la portabilité (article 20) :</strong> vous pouvez exporter l'intégralité de vos données au format JSON depuis la page Paramètres</li>
            <li><strong>Droit de retrait du consentement (article 7) :</strong> les participants peuvent retirer leur consentement à tout moment. Il appartient au chercheur de mettre en place les mécanismes appropriés</li>
          </ul>

          <h3 className={styles.subsectionTitle}>5.5 Mesures de sécurité (article 32)</h3>
          <ul className={styles.list}>
            <li>Chiffrement des mots de passe (bcrypt, 12 itérations)</li>
            <li>Double authentification (2FA) optionnelle via application TOTP</li>
            <li>Tokens JWT signés avec clé secrète, expiration courte (15 minutes)</li>
            <li>Cookies de session httpOnly, secure, sameSite strict</li>
            <li>Protection contre les attaques XSS (sanitisation HTML)</li>
            <li>Limitation du débit (rate limiting) sur les endpoints d'authentification</li>
            <li>En-têtes de sécurité HTTP (Helmet : HSTS, X-Content-Type-Options, etc.)</li>
            <li>Validation des fichiers uploadés (types autorisés, taille maximale)</li>
          </ul>

          <h3 className={styles.subsectionTitle}>5.6 Sous-traitants</h3>
          <p className={styles.p}>
            MindCraft utilise les sous-traitants suivants pour le fonctionnement de la plateforme :
          </p>
          <ul className={styles.list}>
            <li><strong>Resend</strong> (resend.com) — envoi des e-mails transactionnels (vérification de compte, réinitialisation de mot de passe, invitations)</li>
          </ul>
          <p className={styles.p}>
            Aucune donnée personnelle n'est transférée en dehors de l'Union européenne.
          </p>

          <h3 className={styles.subsectionTitle}>5.7 Durée de conservation</h3>
          <ul className={styles.list}>
            <li><strong>Données de compte :</strong> conservées jusqu'à la suppression du compte par l'utilisateur</li>
            <li><strong>Données d'études et de participants :</strong> conservées jusqu'à la suppression de l'étude par le chercheur</li>
            <li><strong>Logs d'activité :</strong> conservés pendant 1 an à des fins de sécurité</li>
          </ul>

          <h3 className={styles.subsectionTitle}>5.8 Notification de violation (articles 33-34)</h3>
          <p className={styles.p}>
            En cas de violation de données à caractère personnel, les utilisateurs concernés seront notifiés dans un délai de 72 heures conformément à l'article 33 du RGPD. La notification sera effectuée par e-mail à l'adresse enregistrée sur le compte.
          </p>

          <h3 className={styles.subsectionTitle}>5.9 Contact — Délégué à la protection des données</h3>
          <p className={styles.p}>
            Pour toute question relative à la protection de vos données ou pour exercer vos droits, contactez :{' '}
            <a href="mailto:contact@mindcraft-research.fr" className={styles.link}>contact@mindcraft-research.fr</a>
          </p>
        </section>

        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>6. Citation de la plateforme</h2>
          <p className={styles.p}>
            Si vous utilisez MindCraft dans le cadre d'une publication scientifique, d'un mémoire, d'une thèse ou d'un rapport, nous vous remercions de citer la plateforme. La citation est essentielle pour la <strong>reconnaissance scientifique</strong> du logiciel libre et soutient la pérennité du projet.
          </p>

          <h3 className={styles.subsectionTitle} style={{ marginTop: '1.5em' }}>
            Citation au format APA (à copier dans vos articles)
          </h3>
          <div className={styles.infoBox} style={{ fontSize: '0.95em', lineHeight: 1.7 }}>
            {CITATION_DATA.authorFamily}, {CITATION_DATA.authorGiven.charAt(0)}. ({CITATION_DATA.year}).{' '}
            <em>{CITATION_DATA.title}</em>
            {' '}(Version {CITATION_DATA.version}) [Computer software]. {CITATION_DATA.publisher}.{' '}
            <a
              href={CITATION_DATA.doiUrl}
              target="_blank"
              rel="noopener noreferrer"
              className={styles.link}
            >
              https://doi.org/{CITATION_DATA.doi}
            </a>
          </div>

          <h3 className={styles.subsectionTitle} style={{ marginTop: '1.5em' }}>
            Identifiants pérennes
          </h3>
          <ul className={styles.list}>
            <li>
              <strong>Version actuelle</strong> : <code>{CITATION_DATA.version}</code> (publiée le {CITATION_DATA.releaseDate})
            </li>
            <li>
              <strong>DOI Zenodo</strong> :{' '}
              <a href={CITATION_DATA.doiUrl} target="_blank" rel="noopener noreferrer" className={styles.link}>
                {CITATION_DATA.doi}
              </a>
            </li>
            <li>
              <strong>SWHID Software Heritage</strong> :{' '}
              <a href={CITATION_DATA.swhUrl} target="_blank" rel="noopener noreferrer" className={styles.link}>
                lien vers l'archive
              </a>
            </li>
            <li>
              <strong>ORCID auteure</strong> : <code>{CITATION_DATA.authorOrcid}</code>
            </li>
            <li>
              <strong>Dépôt source</strong> :{' '}
              <a href={CITATION_DATA.repository} target="_blank" rel="noopener noreferrer" className={styles.link}>
                github.com/mindcraft-research/mindcraft
              </a>
            </li>
          </ul>

          <h3 className={styles.subsectionTitle} style={{ marginTop: '1.5em' }}>
            Autres formats de citation
          </h3>
          <p className={styles.p}>
            Les formats <strong>BibTeX</strong> (LaTeX) et <strong>RIS</strong> (Zotero, EndNote, Mendeley) sont également disponibles via le bouton ci-dessous.
          </p>
          <p className={styles.p}>
            <button
              type="button"
              onClick={() => setCitationOpen(true)}
              style={{
                background: '#4f46e5',
                color: 'white',
                border: 0,
                padding: '10px 20px',
                borderRadius: '8px',
                fontSize: '0.95rem',
                fontWeight: 600,
                cursor: 'pointer',
                marginTop: '8px',
              }}
            >
              Obtenir la citation (APA, BibTeX, RIS)
            </button>
          </p>

          <p className={styles.p} style={{ marginTop: '1em' }}>
            Cette citation contribue à la visibilité du projet et à sa pérennité au sein de la communauté scientifique.
          </p>
        </section>

        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>7. Propriété intellectuelle</h2>
          <p className={styles.p}>
            Les études, blocs, questions et données de recherche créés par les utilisateurs leur appartiennent intégralement. MindCraft ne revendique aucun droit sur les contenus scientifiques produits via la plateforme.
          </p>
          <p className={styles.p}>
            MindCraft est un <strong>logiciel open source</strong>. Le code source est librement accessible, consultable et contribuable sur{' '}
            <a href="https://github.com/mindcraft-research/mindcraft" target="_blank" rel="noopener noreferrer" className={styles.link}>GitHub</a>.
            Toute réutilisation doit respecter la licence associée au projet.
          </p>
        </section>

        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>8. Compte utilisateur</h2>
          <p className={styles.p}>
            L'inscription est gratuite. Elle est ouverte aux étudiant(e)s, chercheur(e)s et praticien(ne)s, en structure académique ou indépendante, dans le cadre d'un usage non commercial. Vous vous engagez à fournir des informations exactes et à maintenir la confidentialité de vos identifiants. Tout usage frauduleux constaté pourra entraîner la suspension du compte sans préavis.
          </p>
        </section>

        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>9. Modifications des conditions</h2>
          <p className={styles.p}>
            Ces conditions peuvent être mises à jour. En cas de modification substantielle, les utilisateurs seront informés par email avec un préavis raisonnable. La poursuite de l'utilisation de la plateforme après notification vaut acceptation des nouvelles conditions.
          </p>
        </section>

        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>10. Contact</h2>
          <p className={styles.p}>
            Pour toute question relative aux présentes conditions ou pour exercer vos droits (accès, rectification, suppression) :{' '}
            <a href="mailto:contact@mindcraft-research.fr" className={styles.link}>contact@mindcraft-research.fr</a>
          </p>
        </section>

      </div>

      <CitationModal
        open={citationOpen}
        onClose={() => setCitationOpen(false)}
      />
    </StaticLayout>
  )
}
