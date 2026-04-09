import StaticLayout from '../components/StaticLayout'
import styles from './static.module.css'

export default function TermsPage() {
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
            MindCraft a été conçu et développé par <strong>Dr. Dayle DAVID</strong>, Maîtresse de conférences en psychologie sociale.
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
            MindCraft est une plateforme académique en ligne destinée à la création, la gestion et la collecte de données pour des études en sciences humaines et sociales. L'accès à la plateforme est gratuit et réservé à un usage académique non commercial.
          </p>
        </section>

        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>2. Usage acceptable — projets non commerciaux</h2>
          <p className={styles.p}>
            MindCraft est mis à disposition exclusivement pour des <strong>projets de recherche académique non commerciaux</strong>. Toute utilisation à des fins commerciales, lucratives ou de collecte de données pour le compte d'organisations privées est strictement interdite.
          </p>
          <p className={styles.p}>Les utilisateurs s'engagent à :</p>
          <ul className={styles.list}>
            <li>Utiliser la plateforme uniquement dans le cadre de projets de recherche académiques légitimes</li>
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
            MindCraft est fourni <strong>en l'état</strong> (<em>as is</em>), dans le cadre d'un projet académique sans garantie de service commercial. À l'instar d'autres plateformes académiques telles que PsyToolkit, les points suivants s'appliquent :
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
          <p className={styles.p}>
            MindCraft traite les données conformément au Règlement Général sur la Protection des Données (RGPD, UE 2016/679). Les données sont hébergées en France. Les participants aux études sont identifiés par des identifiants anonymes (UUID générés aléatoirement).
          </p>
          <p className={styles.p}>
            En tant que chercheur ou chercheuse, vous êtes considéré(e) comme <strong>responsable de traitement</strong> des données collectées via vos études. À ce titre, il vous appartient de :
          </p>
          <ul className={styles.list}>
            <li>Informer vos participants de la collecte de leurs données</li>
            <li>Recueillir leur consentement via le bloc "Consentement" de MindCraft ou tout autre moyen approprié</li>
            <li>Ne pas collecter de données à caractère particulièrement sensible sans autorisation éthique spécifique</li>
          </ul>
        </section>

        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>6. Citation de la plateforme</h2>
          <p className={styles.p}>
            Si vous utilisez MindCraft dans le cadre d'une publication scientifique, nous vous remercions de citer la plateforme de la manière suivante :
          </p>
          <div className={styles.infoBox}>
            David, D. (2026). <em>MindCraft [Logiciel, version 1.0]</em>. Disponible sur : https://github.com/mindcraft-research/mindcraft
          </div>
          <p className={styles.p}>
            Cette citation contribue à la visibilité du projet et à sa pérennité dans le milieu académique.
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
            L'inscription est gratuite et réservée aux membres de la communauté académique. Vous vous engagez à fournir des informations exactes et à maintenir la confidentialité de vos identifiants. Tout usage frauduleux constaté pourra entraîner la suspension du compte sans préavis.
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
    </StaticLayout>
  )
}
