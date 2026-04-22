import StaticLayout from '../components/StaticLayout'
import styles from './static.module.css'

export default function AboutPage() {
  return (
    <StaticLayout title="À propos">
      <div className={styles.pageHeader}>
        <h1 className={styles.pageTitle}>À propos de MindCraft</h1>
        <p className={styles.pageLead}>
          Une plateforme libre, conçue pour les étudiant(e)s et les chercheur(e)s en sciences humaines, sociales et comportementales.
        </p>
      </div>

      <div className={styles.content}>
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>
            <span className={styles.sectionIcon}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z"/></svg>
            </span>
            Objectif
          </h2>
          <p className={styles.p}>
            MindCraft est une plateforme dédiée à la conception, la collecte et l'analyse de données expérimentales en psychologie et en sciences comportementales. Elle a été pensée pour rendre l'expérimentation accessible à toutes et à tous — sans compétences en programmation, sans coût logiciel.
          </p>
          <p className={styles.p}>
            La plateforme s'adresse aux <strong>étudiant(e)s</strong> (licence, master, doctorat), aux <strong>chercheur(e)s</strong> et aux <strong>praticien(ne)s</strong>, qu'ils ou elles travaillent en institution académique ou en structure indépendante. Son utilisation est strictement réservée à des <strong>projets non commerciaux</strong>.
          </p>
        </section>

        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>
            <span className={styles.sectionIcon}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M9 11.75c-.69 0-1.25.56-1.25 1.25s.56 1.25 1.25 1.25 1.25-.56 1.25-1.25-.56-1.25-1.25-1.25zm6 0c-.69 0-1.25.56-1.25 1.25s.56 1.25 1.25 1.25 1.25-.56 1.25-1.25-.56-1.25-1.25-1.25zM12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8 0-.29.02-.58.05-.86 2.36-1.05 4.23-2.98 5.21-5.37C11.07 8.33 14.05 10 17.42 10c.78 0 1.53-.09 2.25-.26.21.71.33 1.47.33 2.26 0 4.41-3.59 8-8 8z"/></svg>
            </span>
            Public visé
          </h2>
          <ul className={styles.list}>
            <li><strong>Étudiant(e)s en licence, master et doctorat</strong> en psychologie, sciences cognitives, sciences humaines et sociales</li>
            <li><strong>Chercheur(e)s</strong> en structure académique ou indépendante, souhaitant un outil simple pour la collecte de données</li>
            <li><strong>Enseignant(e)s-chercheur(e)s</strong> désirant impliquer leurs étudiants dans des projets de recherche</li>
            <li><strong>Praticien(ne)s</strong> en psychologie, sciences comportementales ou disciplines connexes, dans un cadre non lucratif</li>
          </ul>
          <div className={styles.warnBox}>
            <strong>Usage exclusivement non commercial.</strong> MindCraft est mis à disposition gratuitement pour des projets de recherche. Toute utilisation à des fins commerciales est interdite.
          </div>
        </section>

        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>
            <span className={styles.sectionIcon}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-7 3c1.93 0 3.5 1.57 3.5 3.5S13.93 13 12 13s-3.5-1.57-3.5-3.5S10.07 6 12 6zm7 13H5v-.23c0-.62.28-1.2.76-1.58C7.47 15.82 9.64 15 12 15s4.53.82 6.24 2.19c.48.38.76.97.76 1.58V19z"/></svg>
            </span>
            Principes fondateurs
          </h2>
          <ul className={styles.list}>
            <li><strong>Accessibilité</strong> — Aucune compétence en programmation requise. Interface intuitive pour créer des études complexes.</li>
            <li><strong>Reproductibilité</strong> — Support natif des pratiques open science : préenregistrement, DOI, données ouvertes, mots-clés.</li>
            <li><strong>Protection des données</strong> — Conformité RGPD. Données hébergées en France. Participants identifiés de manière anonyme.</li>
            <li><strong>Collaboration</strong> — Gestion d'équipes avec rôles (propriétaire, éditeur, lecteur) intégrée.</li>
            <li><strong>Transparence</strong> — Projet ouvert, développé sans but commercial.</li>
          </ul>
        </section>

        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>
            <span className={styles.sectionIcon}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 14.5v-9l6 4.5-6 4.5z"/></svg>
            </span>
            Fonctionnalités
          </h2>
          <ul className={styles.list}>
            <li>Création et gestion de projets de recherche collaboratifs</li>
            <li>Éditeur de blocs (questionnaires, tâches comportementales, logique de branchement)</li>
            <li>30+ types de questions (Likert, matrice, slider, classement par drag-and-drop, etc.)</li>
            <li>Tâches comportementales avec mesure des temps de réaction</li>
            <li>Design expérimental inter, intra et mixte avec contrebalancement automatique</li>
            <li>Intégration Prolific et autres plateformes de recrutement</li>
            <li>Export des données en CSV, Excel et codebook PDF</li>
            <li>Métadonnées Open Science (DOI, préenregistrement, mots-clés)</li>
          </ul>
        </section>

        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>
            <span className={styles.sectionIcon}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M20 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 14H4v-6h16v6zm0-10H4V6h16v2z"/></svg>
            </span>
            Contact
          </h2>
          <p className={styles.p}>
            Pour toute question, suggestion ou signalement de problème :{' '}
            <a href="mailto:contact@mindcraft-research.fr" className={styles.link}>contact@mindcraft-research.fr</a>
          </p>
        </section>
      </div>
    </StaticLayout>
  )
}
