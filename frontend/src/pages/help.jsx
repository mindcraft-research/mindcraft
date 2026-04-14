import StaticLayout from '../components/StaticLayout'
import styles from './static.module.css'

const faqs = [
  { q: "Je n'arrive pas à me connecter.", a: "Vérifiez que votre adresse email et votre mot de passe sont corrects. Si vous avez oublié votre mot de passe, utilisez le lien \"Mot de passe oublié ?\" sur la page de connexion. Si le problème persiste, contactez-nous." },
  { q: "Comment inviter un collaborateur sur mon projet ?", a: "Depuis la page du projet, cliquez sur \"Inviter\" dans la section Équipe (sidebar droite). Entrez l'adresse email de votre collaborateur et choisissez son rôle : Éditeur (peut modifier l'étude) ou Lecteur (consultation uniquement). Il recevra un lien d'invitation valable 48h." },
  { q: "Comment partager mon étude avec des participants ?", a: "L'étude doit être au statut \"En collecte\". Depuis le builder, cliquez sur \"Lien de participation\" (en haut à droite). Copiez l'URL standard ou l'URL Prolific selon votre plateforme de recrutement." },
  { q: "Mes participants voient \"Cette étude n'est pas disponible\".", a: "Vérifiez que le statut de l'étude est bien \"En collecte\" (COLLECTING). Les études en Brouillon, En révision, Validées ou Archivées ne sont pas accessibles aux participants. Utilisez le bouton \"Lien de participation\" pour changer le statut." },
  { q: "Comment exporter mes données ?", a: "Dans le builder, cliquez sur l'onglet \"Export\". Choisissez le format : CSV (compatible Excel/R/SPSS), Excel (.xlsx) ou Codebook PDF (dictionnaire des variables). Les fichiers sont générés à la demande." },
  { q: "Puis-je utiliser MindCraft avec Prolific ?", a: "Oui. L'URL de participation générée par MindCraft contient automatiquement le paramètre PROLIFIC_PID. Configurez l'URL de complétion Prolific dans le bloc Debriefing pour la redirection automatique." },
  { q: "Comment créer un design expérimental ?", a: "Dans le builder, allez dans l'onglet \"Design expérimental\". Choisissez le type de plan (inter, intra ou mixte), définissez vos facteurs et leurs niveaux, puis assignez les blocs de stimuli à chaque niveau. MindCraft se charge du contrebalancement automatique." },
  { q: "Comment intégrer une tâche externe (PsychoPy, PsyToolkit, etc.) ?", a: "Dans le bloc Tâche comportementale, allez dans l'onglet \"Tâche externe\". Choisissez le mode iFrame (tâche intégrée dans la page) ou Redirection. Configurez l'URL et le mode de détection de fin (bouton, message postMessage, ou durée)." },
  { q: "Les données des participants sont-elles sécurisées ?", a: "Oui. Les données sont hébergées en France, conformément au RGPD. Les participants sont identifiés par un identifiant anonyme (UUID ou ID Prolific). Aucune donnée n'est partagée avec des tiers." },
  { q: "Comment signaler un bug ou suggérer une amélioration ?", a: "Écrivez-nous à contact@mindcraft-research.fr en décrivant : la page concernée, le comportement observé, le message d'erreur éventuel, et votre navigateur. Nous répondons dans les meilleurs délais." },
]

export default function HelpPage() {
  return (
    <StaticLayout title="Aide">
      <div className={styles.pageHeader}>
        <h1 className={styles.pageTitle}>Aide & Support</h1>
        <p className={styles.pageLead}>
          Trouvez des réponses aux questions fréquentes. Vous ne trouvez pas votre réponse ?{' '}
          <a href="mailto:contact@mindcraft-research.fr" className={styles.link}>Contactez-nous directement</a>.
        </p>
      </div>

      <div className={styles.content}>
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>Questions fréquentes</h2>
          <div className={styles.faqList}>
            {faqs.map((faq) => (
              <div key={faq.q} className={styles.faqItem}>
                <h3 className={styles.faqQ}>{faq.q}</h3>
                <p className={styles.faqA}>{faq.a}</p>
              </div>
            ))}
          </div>
        </section>

        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>Nous contacter</h2>
          <div className={styles.contactCard}>
            <p className={styles.p}>Pour toute question non couverte par la FAQ, un signalement de problème ou une suggestion d'amélioration :</p>
            <a href="mailto:contact@mindcraft-research.fr" className={styles.contactBtn}>
              ✉ contact@mindcraft-research.fr
            </a>
          </div>
        </section>
      </div>
    </StaticLayout>
  )
}
