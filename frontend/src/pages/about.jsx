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
            MindCraft est une plateforme dédiée à la conception et à la collecte de données expérimentales en psychologie et en sciences comportementales. Elle a été pensée pour rendre l'expérimentation accessible à toutes et à tous — sans compétences en programmation, sans coût logiciel. L'analyse des données reste à la charge du/de la chercheur(e), qui pourra exploiter les exports (CSV, Excel, codebook PDF) avec les outils statistiques de son choix (R, Python, JASP, SPSS…).
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

        {/* ── Contributeurs & remerciements ────────────────────────────
          Section qui crédite les personnes qui font avancer MindCraft.
          Deux cartes côte à côte (responsive : empilées sur mobile).

          Pour l'instant, la 2e carte reste générique : aucun nom de
          testeur·euse n'est affiché sans son accord explicite. Quand
          un accord est obtenu, dupliquer la structure .contribPerson
          dans la 2e carte et y ajouter ses pastilles via .contribTags
          / .contribTag (classes déjà définies dans static.module.css).
        ─────────────────────────────────────────────────────────────── */}
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>
            <span className={styles.sectionIcon}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z"/></svg>
            </span>
            Contributeurs &amp; remerciements
          </h2>
          <p className={styles.p}>
            MindCraft est un projet ouvert. Il avance grâce aux retours, aux tests et aux idées de sa communauté.
          </p>

          <div className={styles.contribGrid}>
            <div className={styles.contribCard}>
              <p className={styles.contribCardLabel}>Conception &amp; développement</p>
              <div className={styles.contribPerson}>
                <span className={styles.contribAvatar} aria-hidden="true">DD</span>
                <div className={styles.contribPersonText}>
                  <p className={styles.contribName}>Dayle David</p>
                  <p className={styles.contribRole}>Conception, développement et maintenance</p>
                  <p className={styles.contribAffil}>LP3C — Université Rennes 2</p>
                </div>
              </div>
            </div>

            <div className={styles.contribCard}>
              <p className={styles.contribCardLabel}>Avec les retours de</p>
              <div className={styles.contribPerson}>
                <span className={styles.contribAvatarCommunity} aria-hidden="true">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                    <circle cx="9" cy="8" r="3.5" stroke="currentColor" strokeWidth="1.7" />
                    <circle cx="17" cy="9" r="2.8" stroke="currentColor" strokeWidth="1.7" />
                    <path d="M3 19c0-3 2.5-5 6-5s6 2 6 5" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round"/>
                    <path d="M14.5 16.5c.5-.3 1.5-.5 2.5-.5 2.5 0 4 1.5 4 3.5" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round"/>
                  </svg>
                </span>
                <div className={styles.contribPersonText}>
                  <p className={styles.contribName}>La communauté de test</p>
                  <p className={styles.contribRole}>
                    Les personnes qui prennent le temps de tester MindCraft, de signaler des bugs et de suggérer des améliorations.
                  </p>
                  {/*
                    Quand on aura les accords, les pastilles s'ajouteront ici :
                    <div className={styles.contribTags}>
                      <span className={styles.contribTag}>bugs</span>
                      <span className={styles.contribTag}>suggestions</span>
                    </div>
                  */}
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ── Publications ────────────────────────────────────────────────
          Recense les publications scientifiques utilisant MindCraft.
          À ce jour aucune publi peer-reviewed n'est parue, mais la
          section existe déjà avec :
            - Une explication transparente du statut actuel
            - Les premiers travaux scientifiques liés (rapport de
              validation temporelle)
            - Comment citer la plateforme (CITATION.cff)
            - Une invitation à se faire lister

          Pour ajouter une nouvelle publication, dupliquer un bloc
          .publicationItem dans .publicationsList. Migration vers une
          page dédiée /publications : il suffira de déplacer cette
          section dans un nouveau fichier pages/publications.jsx (les
          styles CSS sont déjà dans static.module.css et réutilisables).
        ──────────────────────────────────────────────────────────────── */}
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>
            <span className={styles.sectionIcon}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M19 2H5c-1.11 0-2 .9-2 2v14c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V4c0-1.1-.89-2-2-2zM7 7h10v2H7V7zm0 4h10v2H7v-2zm0 4h7v2H7v-2z"/></svg>
            </span>
            Publications
          </h2>
          <p className={styles.p}>
            Cette section recense les publications scientifiques utilisant MindCraft, au fur et à mesure de leur parution. À ce jour, aucun article peer-reviewed n'a encore été publié.
          </p>

          <h3 className={styles.subsectionTitle} style={{ marginTop: '1.2em' }}>
            Premiers travaux scientifiques liés à la plateforme
          </h3>
          <ul className={styles.publicationsList}>
            <li className={styles.publicationItem}>
              <p className={styles.publicationTitle}>
                Validation de la précision temporelle de MindCraft — Premier rapport de benchmark
              </p>
              <p className={styles.publicationMeta}>
                David, D. (2026). <em>Rapport technique</em>. Université Rennes 2.
              </p>
              <p className={styles.publicationLinks}>
                <a
                  href="https://github.com/mindcraft-research/mindcraft/tree/main/docs/timing-validation"
                  target="_blank" rel="noopener noreferrer"
                  className={styles.link}
                >
                  Méthodologie, données brutes, analyses et rapport complet
                </a>
                {' · '}
                <a
                  href="https://github.com/mindcraft-research/mindcraft/blob/main/docs/timing-validation/05-reports/2026-06-05_resume-executif.pdf"
                  target="_blank" rel="noopener noreferrer"
                  className={styles.link}
                >
                  Résumé exécutif (PDF, 2 pages)
                </a>
              </p>
            </li>
          </ul>

          <h3 className={styles.subsectionTitle} style={{ marginTop: '1.5em' }}>
            Citer la plateforme
          </h3>
          <p className={styles.p}>
            Si MindCraft a été utile à vos travaux, le fichier <a
              href="https://github.com/mindcraft-research/mindcraft/blob/main/CITATION.cff"
              target="_blank" rel="noopener noreferrer"
              className={styles.link}
            ><code>CITATION.cff</code></a> à la racine du dépôt fournit les informations bibliographiques (APA, BibTeX, RIS). Sur GitHub, le bouton <strong>« Cite this repository »</strong> dans la barre latérale du dépôt génère automatiquement la citation au format souhaité. La <a href="/terms#citation" className={styles.link}>section 6 des mentions légales</a> détaille également les formats disponibles.
          </p>

          <div className={styles.tipBox}>
            <strong>Vous avez publié un travail utilisant MindCraft ?</strong> Écrivez-nous à <a href="mailto:contact@mindcraft-research.fr" className={styles.link}>contact@mindcraft-research.fr</a> pour être listé·e dans cette section.
          </div>
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
