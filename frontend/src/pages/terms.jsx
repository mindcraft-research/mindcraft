import StaticLayout from '../components/StaticLayout'
import styles from './static.module.css'

// Note : la section « Citer MindCraft » (anciennement section 6 de
// ces termes) a été entièrement déplacée vers /about#citer-mindcraft.
// Les sections suivantes (Propriété intellectuelle, Compte utilisateur,
// Modifications, Contact) ont été renumérotées de 7-10 à 6-9.
//
// Écriture inclusive : point médian (chercheur·euse·s, participant·e·s),
// comme dans le reste de MindCraft.

export default function TermsPage() {
  return (
    <StaticLayout title="Termes et Conditions">
      <div className={styles.pageHeader}>
        <h1 className={styles.pageTitle}>Termes et Conditions d'utilisation</h1>
        <p className={styles.pageLead}>
          Dernière mise à jour : novembre 2026. En utilisant MindCraft, vous acceptez les présentes conditions.
        </p>
      </div>

      <div className={styles.content}>

        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>Conception et crédits</h2>
          <p className={styles.p}>
            MindCraft a été conçu et développé par <strong>Dayle DAVID, PhD</strong>, Enseignante-Chercheure en psychologie sociale (Université Rennes 2, LP3C).
          </p>
          <p className={styles.p}>
            Dayle DAVID remercie chaleureusement <strong>Arthur Gassen</strong> pour l'expertise et les conseils apportés tout au long du développement de la plateforme.
          </p>
          <p className={styles.p}>
            Par souci de transparence, MindCraft a été développé avec l'assistance de <strong>Claude Code</strong> (Anthropic), un outil d'intelligence artificielle pour le développement logiciel. L'architecture, les choix fonctionnels et le contenu scientifique relèvent de la seule responsabilité de Dayle DAVID.
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
          <p className={styles.p}>Les utilisateur·rice·s s'engagent à :</p>
          <ul className={styles.list}>
            <li>Utiliser la plateforme uniquement dans le cadre de projets de recherche légitimes et non commerciaux</li>
            <li>Obtenir les autorisations éthiques nécessaires avant toute collecte de données auprès de participant·e·s</li>
            <li>Recueillir le consentement éclairé des participant·e·s</li>
            <li>Respecter la réglementation applicable à la protection des données personnelles (RGPD)</li>
            <li>Ne pas tenter de contourner les mesures de sécurité de la plateforme</li>
          </ul>
        </section>

        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>3. Responsabilité des chercheur·euse·s</h2>
          <p className={styles.p}>
            En tant qu'utilisateur·rice de MindCraft, vous êtes seul·e responsable :
          </p>
          <ul className={styles.list}>
            <li>Du contenu des études que vous créez et diffusez</li>
            <li>De l'obtention des autorisations éthiques requises par votre institution</li>
            <li>Du traitement et de la protection des données de vos participant·e·s</li>
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
            MindCraft traite les données conformément au Règlement Général sur la Protection des Données (RGPD, UE 2016/679). Les données des études sont hébergées en France, et aucune donnée personnelle n'est transférée hors de l'Union européenne (voir 5.6). La plateforme ne collecte aucune donnée d'identification des participant·e·s aux études (ni nom, ni adresse e-mail, ni adresse IP) : chaque participant·e est identifié·e par un identifiant aléatoire (UUID). Les données sont donc anonymes du point de vue de MindCraft ; l'anonymat du jeu de données final dépend de la conception de l'étude par le·la chercheur·euse (voir 5.3).
          </p>

          <h3 className={styles.subsectionTitle}>5.2 Responsabilité du traitement</h3>
          <p className={styles.p}>
            En tant que chercheur·euse, vous êtes considéré·e comme <strong>responsable de traitement</strong> (au sens de l'article 4 du RGPD) des données collectées via vos études. MindCraft agit en qualité de <strong>sous-traitant</strong> (article 28 du RGPD). À ce titre, il vous appartient de :
          </p>
          <ul className={styles.list}>
            <li>Informer vos participant·e·s de la collecte de leurs données (article 13)</li>
            <li>Recueillir leur consentement libre, spécifique, éclairé et univoque via le bloc « Consentement » de MindCraft ou tout autre moyen approprié (article 7)</li>
            <li>Ne pas collecter de données à caractère particulièrement sensible sans autorisation éthique spécifique (article 9)</li>
            <li>Respecter le principe de minimisation des données : ne collecter que les données strictement nécessaires à votre recherche (article 5)</li>
            <li>Obtenir les autorisations éthiques nécessaires auprès de votre comité d'éthique avant toute collecte</li>
          </ul>

          <h3 className={styles.subsectionTitle}>5.3 Données collectées par la plateforme</h3>
          <p className={styles.p}>
            MindCraft collecte les données suivantes sur les <strong>utilisateur·rice·s inscrit·e·s</strong> (chercheur·euse·s) :
          </p>
          <ul className={styles.list}>
            <li><strong>Données de compte :</strong> nom d'utilisateur, adresse e-mail, mot de passe (haché avec bcrypt, jamais stocké en clair)</li>
            <li><strong>Données institutionnelles (optionnelles) :</strong> institution, laboratoire, statut, discipline — collectées uniquement à des fins de statistiques anonymisées d'utilisation de la plateforme</li>
            <li><strong>Données techniques :</strong> horodatage de connexion, logs d'activité</li>
          </ul>
          <p className={styles.p}>
            Pour les <strong>participant·e·s aux études</strong>, MindCraft ne collecte aucune donnée d'identification (ni nom, ni adresse e-mail, ni adresse IP). Sont enregistrés, associés à un identifiant aléatoire (UUID) :
          </p>
          <ul className={styles.list}>
            <li><strong>Données de l'étude :</strong> réponses aux questions et données expérimentales (temps de réaction, essais, résultats de tâches)</li>
            <li><strong>Données de déroulement :</strong> condition expérimentale, ordre des blocs, horodatages (début, fin, arrivée sur chaque page), statut de la passation, langue de passation</li>
            <li><strong>Type d'appareil :</strong> ordinateur, mobile ou tablette, déduit du navigateur — le texte complet d'identification du navigateur n'est pas conservé. Exporté uniquement si le·la chercheur·euse le demande</li>
          </ul>
          <p className={styles.p}>
            Ces données sont anonymes du point de vue de MindCraft. L'anonymat du jeu de données final dépend en revanche de la conception de l'étude par le·la chercheur·euse, responsable de traitement (voir 5.2) : recours à une plateforme de recrutement (par exemple Prolific, dont l'identifiant remplace alors l'UUID), questions permettant d'identifier une personne, contenu des réponses libres.
          </p>

          <h3 className={styles.subsectionTitle}>5.4 Droits des utilisateur·rice·s (articles 15 à 22)</h3>
          <p className={styles.p}>
            Conformément au RGPD, tout·e utilisateur·rice inscrit·e dispose des droits suivants :
          </p>
          <ul className={styles.list}>
            <li><strong>Droit d'accès (article 15) :</strong> vous pouvez consulter vos données depuis la page Paramètres</li>
            <li><strong>Droit de rectification (article 16) :</strong> vous pouvez modifier vos informations de profil à tout moment</li>
            <li><strong>Droit à l'effacement (article 17) :</strong> vous pouvez supprimer votre compte et toutes vos données depuis la page Paramètres. La suppression est définitive et concerne l'ensemble de vos projets, études et données associées, à l'exception des préenregistrements que vous avez verrouillés (voir 5.7)</li>
            <li><strong>Droit à la portabilité (article 20) :</strong> vous pouvez exporter l'intégralité de vos données au format JSON depuis la page Paramètres</li>
            <li><strong>Droit de retrait du consentement (article 7) :</strong> les participant·e·s peuvent retirer leur consentement à tout moment. Il appartient à l'équipe de recherche de mettre en place les mécanismes appropriés</li>
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
            <li><strong>Scaleway</strong> (scaleway.com) — hébergement de la plateforme et de la base de données, en France (région Paris)</li>
            <li><strong>Resend</strong> (resend.com) — envoi des e-mails transactionnels aux utilisateur·rice·s inscrit·e·s (vérification de compte, réinitialisation de mot de passe, invitations) et, si le·la chercheur·euse le demande au verrouillage d'un préenregistrement, d'un unique message avec le PDF aux co-auteur·rice·s dont l'adresse a été indiquée, depuis l'Union européenne (région Irlande). Aucun e-mail n'est envoyé aux participant·e·s des études</li>
          </ul>
          <p className={styles.p}>
            Aucune donnée personnelle n'est transférée en dehors de l'Union européenne.
          </p>

          <h3 className={styles.subsectionTitle}>5.7 Durée de conservation</h3>
          <ul className={styles.list}>
            <li><strong>Données de compte :</strong> conservées jusqu'à la suppression du compte par l'utilisateur·rice</li>
            <li><strong>Données d'études et de participant·e·s :</strong> conservées jusqu'à la suppression de l'étude par le·la chercheur·euse</li>
            <li><strong>Préenregistrements verrouillés :</strong> conservés même après la suppression de l'étude ou du compte, pour que les revues, les relecteur·rice·s et les lecteur·rice·s puissent toujours les vérifier. Ils contiennent le texte rédigé et la liste des auteur·rice·s indiquée par le·la chercheur·euse. Une demande de retrait peut être adressée via le contact ci-dessous : le contenu est alors effacé, et le lien indique la date et le motif du retrait. Les brouillons non verrouillés sont supprimés avec l'étude</li>
            <li><strong>Logs d'activité :</strong> conservés pendant 1 an à des fins de sécurité</li>
          </ul>

          <h3 className={styles.subsectionTitle}>5.8 Notification de violation (articles 33-34)</h3>
          <p className={styles.p}>
            En cas de violation de données à caractère personnel, les utilisateur·rice·s concerné·e·s sont prévenu·e·s dans les meilleurs délais après que MindCraft en a pris connaissance, par e-mail à l'adresse enregistrée sur le compte, avec les éléments nécessaires à leur propre notification à la CNIL.
          </p>

          <h3 className={styles.subsectionTitle}>5.9 Contact — Protection des données</h3>
          <p className={styles.p}>
            Pour toute question relative à la protection de vos données ou pour exercer vos droits, contactez :{' '}
            <a href="mailto:contact@mindcraft-research.fr" className={styles.link}>contact@mindcraft-research.fr</a>
          </p>

          <h3 className={styles.subsectionTitle} id="sous-traitance">5.10 Accord de sous-traitance (article 28 du RGPD)</h3>
          <p className={styles.p}>
            Cette section constitue l'acte juridique prévu à l'article 28.3 du RGPD. Il lie le·la chercheur·euse, ou l'établissement pour le compte duquel l'étude est menée (le « responsable de traitement »), et l'exploitante de MindCraft, Dayle DAVID (le « sous-traitant »). Il s'applique dès la création d'une étude, et pendant toute sa durée.
          </p>
          <p className={styles.p}><strong>Description du traitement</strong></p>
          <ul className={styles.list}>
            <li><strong>Objet :</strong> héberger les études et recueillir les réponses des participant·e·s pour le compte du responsable de traitement</li>
            <li><strong>Durée :</strong> tant que l'étude existe sur MindCraft</li>
            <li><strong>Nature :</strong> collecte, stockage, export et suppression des données</li>
            <li><strong>Finalité :</strong> celle de l'étude, définie par le responsable de traitement</li>
            <li><strong>Données :</strong> réponses, données de déroulement (condition, horodatages, statut), type d'appareil si le·la chercheur·euse le demande, et les données que l'étude demande elle-même. Les participant·e·s sont identifié·e·s par un identifiant aléatoire : MindCraft ne collecte ni leur nom, ni leur adresse e-mail</li>
            <li><strong>Personnes concernées :</strong> les participant·e·s aux études</li>
          </ul>
          <p className={styles.p}><strong>Engagements de MindCraft</strong></p>
          <ol className={styles.list}>
            <li><strong>Instructions.</strong> Les instructions du responsable de traitement sont la configuration de son étude dans MindCraft : questions, design, exports, suppressions. MindCraft ne traite les données que pour faire fonctionner l'étude. Il n'en fait ni analyse, ni revente, ni publicité, ni entraînement de modèles. MindCraft n'a pas accès au contenu des études dans l'application et n'en contrôle pas la conformité, qui relève du responsable de traitement. Si une obligation légale imposait de transmettre des données, MindCraft en informerait le responsable de traitement, sauf si la loi l'interdit. Si une instruction qui lui est adressée directement lui paraît contraire au RGPD, il le signale.</li>
            <li><strong>Confidentialité.</strong> Seule l'exploitante de MindCraft a accès aux serveurs et à la base de données, et elle est tenue à la confidentialité. Dans l'application, seule l'équipe de l'étude voit les données.</li>
            <li><strong>Sécurité.</strong> MindCraft applique les mesures décrites en 5.5 (hébergement en France, connexions chiffrées, mots de passe chiffrés, double authentification, accès par rôle) et les tient à jour.</li>
            <li><strong>Sous-traitants ultérieurs.</strong> Ceux listés en 5.6 : Scaleway (hébergement, France) et Resend (e-mails aux chercheur·euse·s uniquement, Union européenne), liés par leurs propres accords aux mêmes obligations. Tout ajout ou changement est annoncé au moins 30 jours à l'avance dans les « Nouveautés » de MindCraft. Un·e chercheur·euse qui s'y oppose peut exporter puis supprimer ses données.</li>
            <li><strong>Droits des participant·e·s.</strong> MindCraft n'identifie pas les participant·e·s. Le responsable de traitement peut exporter les données et supprimer lui-même celles d'un·e participant·e, à partir de son identifiant (« Réinitialiser les données » › « Un seul participant »). Il indique ses coordonnées aux participant·e·s dans sa note d'information. Une demande reçue directement par MindCraft est renvoyée vers ces coordonnées.</li>
            <li><strong>Assistance.</strong> MindCraft fournit les informations utiles à une analyse d'impact. En cas de violation de données, il prévient le responsable de traitement dans les meilleurs délais après en avoir pris connaissance, avec les éléments nécessaires à la notification à la CNIL (voir 5.8).</li>
            <li><strong>Fin du traitement.</strong> Le responsable de traitement peut exporter et supprimer ses données à tout moment. Elles sont supprimées avec l'étude ou le compte. Les sauvegardes de la base, quotidiennes, sont conservées 7 jours : les données supprimées en disparaissent au plus tard 7 jours après. Les préenregistrements verrouillés sont conservés (voir 5.7) ; ils ne contiennent aucune donnée de participant·e.</li>
            <li><strong>Contrôle.</strong> MindCraft met à disposition les informations qui prouvent le respect de ces engagements : ces conditions, sa documentation et son code source, qui est public. Il répond aux questions et questionnaires du responsable de traitement ou de son DPO. Une inspection peut être organisée d'un commun accord, avec un préavis raisonnable et aux frais du demandeur.</li>
          </ol>
          <p className={styles.p}>
            <strong>Obligations du responsable de traitement :</strong> informer les participant·e·s et leur indiquer ses coordonnées, recueillir leur consentement, ne collecter que les données nécessaires, obtenir les autorisations éthiques et répondre aux demandes des participant·e·s (voir 5.2).
          </p>
        </section>

        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>6. Propriété intellectuelle</h2>
          <p className={styles.p}>
            Les études, blocs, questions et données de recherche créés par les utilisateur·rice·s leur appartiennent intégralement. MindCraft ne revendique aucun droit sur les contenus scientifiques produits via la plateforme.
          </p>
          <p className={styles.p}>
            MindCraft est un <strong>logiciel open source</strong>. Le code source est librement accessible, consultable et contribuable sur{' '}
            <a href="https://github.com/mindcraft-research/mindcraft" target="_blank" rel="noopener noreferrer" className={styles.link}>GitHub</a>.
            Toute réutilisation doit respecter la licence associée au projet.
          </p>
        </section>

        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>7. Compte utilisateur</h2>
          <p className={styles.p}>
            L'inscription est gratuite. Elle est ouverte aux étudiant·e·s, chercheur·euse·s et praticien·ne·s, en structure académique ou indépendante, dans le cadre d'un usage non commercial. Vous vous engagez à fournir des informations exactes et à maintenir la confidentialité de vos identifiants. Tout usage frauduleux constaté pourra entraîner la suspension du compte sans préavis.
          </p>
        </section>

        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>8. Modifications des conditions</h2>
          <p className={styles.p}>
            Ces conditions peuvent être mises à jour. En cas de modification substantielle, les utilisateur·rice·s en sont informé·e·s dans les « Nouveautés » de MindCraft, avec un préavis raisonnable. La poursuite de l'utilisation de la plateforme après cette annonce vaut acceptation des nouvelles conditions.
          </p>
        </section>

        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>9. Contact</h2>
          <p className={styles.p}>
            Pour toute question relative aux présentes conditions ou pour exercer vos droits (accès, rectification, suppression) :{' '}
            <a href="mailto:contact@mindcraft-research.fr" className={styles.link}>contact@mindcraft-research.fr</a>
          </p>
        </section>

      </div>
    </StaticLayout>
  )
}
