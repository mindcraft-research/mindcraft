import StaticLayout from '../components/StaticLayout'
import styles from './static.module.css'

export default function DocsPage() {
  const todayLong = new Date().toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })

  // Téléchargement du PDF : on utilise simplement window.print() qui ouvre la
  // boîte de dialogue d'impression du navigateur. L'utilisateur·rice choisit
  // « Enregistrer en PDF » comme destination. Les règles @media print du CSS
  // (cf. static.module.css) prennent le relais : page de garde visible,
  // sommaire et UI chrome masqués, sauts de page respectés. Solution simple,
  // sans lib externe, qui donne un PDF de qualité native navigateur.
  const handleDownloadPDF = () => {
    window.print()
  }

  return (
    <StaticLayout title="Documentation">
      <div className={styles.pageHeader}>
        <h1 className={styles.pageTitle}>Documentation MindCraft</h1>
        <p className={styles.pageLead}>
          Guide complet de la plateforme — de la création de compte à la collecte et l'export des données.
        </p>
      </div>

      <div className={styles.actionsBar}>
        <button className="btn btn-secondary btn-sm" onClick={handleDownloadPDF}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" style={{marginRight:6}}>
            <path d="M19 9h-4V3H9v6H5l7 7 7-7zM5 18v2h14v-2H5z"/>
          </svg>
          Télécharger le guide (PDF)
        </button>
      </div>

      <div id="docs-content" className={styles.content}>

        {/* ─── PAGE DE GARDE (PDF UNIQUEMENT) ───────────────────────────────── */}
        <div className={styles.coverPage}>
          <div className={styles.coverLogo}>
            <svg width="64" height="64" viewBox="0 0 16 16" fill="none" aria-hidden="true">
              <path d="M6.5 2.5H9.5V6.5L12.8 13.5H3.2L6.5 6.5V2.5Z" stroke="currentColor" strokeWidth="0.9" strokeLinejoin="round" fill="currentColor" fillOpacity="0.08"/>
              <path d="M5.5 2.5H10.5" stroke="currentColor" strokeWidth="0.9" strokeLinecap="round"/>
              <path d="M4.5 10.5L11.5 10.5L12.8 13.5H3.2Z" fill="currentColor" fillOpacity="0.28"/>
              <circle cx="8.5" cy="9" r="1" stroke="currentColor" strokeOpacity="0.65" strokeWidth="0.7"/>
              <circle cx="6.8" cy="12" r="0.55" fill="currentColor" fillOpacity="0.55"/>
            </svg>
          </div>
          <h1 className={styles.coverTitle}>MindCraft</h1>
          <p className={styles.coverSubtitle}>Guide utilisateur</p>
          <div className={styles.coverDivider} />
          <p className={styles.coverDate}>Version téléchargée le {todayLong}</p>
          <div className={styles.coverFooter}>
            <p><a href="https://www.mindcraft-research.fr">www.mindcraft-research.fr</a></p>
            <p>Code source publié sous licence AGPL-3.0-or-later</p>
          </div>
        </div>

        {/* ─── SOMMAIRE INTERACTIF ─────────────────────────────────────────── */}
        <nav className={styles.toc} aria-label="Sommaire">
          <h2 className={styles.tocTitle}>Sommaire</h2>
          <ol className={styles.tocList}>
            {[
              { num: 1,  title: 'Démarrage rapide' },
              { num: 2,  title: "L'éditeur de blocs" },
              { num: 3,  title: 'Types de questions' },
              { num: 4,  title: 'Tâche comportementale' },
              { num: 5,  title: 'Mesures physiologiques' },
              { num: 6,  title: 'Design expérimental' },
              { num: 7,  title: 'Randomisation' },
              { num: 8,  title: 'Logique conditionnelle' },
              { num: 9,  title: 'Prévisualisation par bloc' },
              { num: 10, title: 'Collecte et recrutement' },
              { num: 11, title: 'Export des données' },
              { num: 12, title: 'Open Science' },
              { num: 13, title: 'Collaboration' },
              { num: 14, title: 'Citer MindCraft' },
            ].map(({ num, title }) => (
              <li key={num} className={styles.tocItem}>
                <a href={`#section-${num}`} className={styles.tocLink}>
                  <span className={styles.tocNum}>{num}.</span>
                  <span className={styles.tocLabel}>{title}</span>
                </a>
              </li>
            ))}
          </ol>
        </nav>

        {/* ── 1. DÉMARRAGE ── */}
        <section id="section-1" className={styles.section}>
          <h2 className={styles.sectionTitle}>
            <span className={styles.sectionIcon}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 14.5v-9l6 4.5-6 4.5z"/></svg>
            </span>
            1. Démarrage rapide
          </h2>

          <div className={styles.subsection}>
            <h3 className={styles.subsectionTitle}>1.1 Créer un compte</h3>
            <div className={styles.steps}>
              <div className={styles.step}>
                <div className={styles.stepNum}>1</div>
                <div className={styles.stepBody}>
                  <p className={styles.stepTitle}>Accéder à la page d'inscription</p>
                  <p className={styles.stepDesc}>Depuis la page de connexion, cliquez sur "Créer un compte". Renseignez votre nom d'utilisateur, adresse email académique et mot de passe.</p>
                </div>
              </div>
              <div className={styles.step}>
                <div className={styles.stepNum}>2</div>
                <div className={styles.stepBody}>
                  <p className={styles.stepTitle}>Valider votre inscription</p>
                  <p className={styles.stepDesc}>Après soumission du formulaire, vous êtes redirigé(e) vers le tableau de bord. Votre compte est immédiatement actif.</p>
                </div>
              </div>
              <div className={styles.step}>
                <div className={styles.stepNum}>3</div>
                <div className={styles.stepBody}>
                  <p className={styles.stepTitle}>Accéder au tableau de bord</p>
                  <p className={styles.stepDesc}>Le tableau de bord liste vos projets (projets dont vous êtes propriétaire et projets partagés). C'est le point d'entrée principal de la plateforme.</p>
                </div>
              </div>
            </div>
          </div>

          <div className={styles.subsection}>
            <h3 className={styles.subsectionTitle}>1.2 Créer un premier projet</h3>
            <div className={styles.steps}>
              <div className={styles.step}>
                <div className={styles.stepNum}>1</div>
                <div className={styles.stepBody}>
                  <p className={styles.stepTitle}>Nouveau projet</p>
                  <p className={styles.stepDesc}>Depuis le tableau de bord, cliquez sur "Nouveau projet". Donnez-lui un nom (obligatoire, 100 caractères maximum) et optionnellement une description (500 caractères maximum). Un compteur indique le nombre de caractères restants en bas du champ description. Si un champ est invalide, un message explicite apparaît sous le champ concerné — la fenêtre reste ouverte pour permettre la correction.</p>
                </div>
              </div>
              <div className={styles.step}>
                <div className={styles.stepNum}>2</div>
                <div className={styles.stepBody}>
                  <p className={styles.stepTitle}>Page du projet</p>
                  <p className={styles.stepDesc}>Vous arrivez sur la page du projet. Vous pouvez y créer des études, inviter des collaborateurs et consulter l'activité récente.</p>
                </div>
              </div>
              <div className={styles.step}>
                <div className={styles.stepNum}>3</div>
                <div className={styles.stepBody}>
                  <p className={styles.stepTitle}>Créer une étude</p>
                  <p className={styles.stepDesc}>Cliquez sur "Nouvelle étude". Nommez-la. L'éditeur de blocs s'ouvre automatiquement.</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ── 2. ÉDITEUR DE BLOCS ── */}
        <section id="section-2" className={styles.section}>
          <h2 className={styles.sectionTitle}>
            <span className={styles.sectionIcon}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-7 3c1.93 0 3.5 1.57 3.5 3.5S13.93 13 12 13s-3.5-1.57-3.5-3.5S10.07 6 12 6zm7 13H5v-.23c0-.62.28-1.2.76-1.58C7.47 15.82 9.64 15 12 15s4.53.82 6.24 2.19c.48.38.76.97.76 1.58V19z"/></svg>
            </span>
            2. L'éditeur de blocs
          </h2>

          <p className={styles.p}>
            L'éditeur de blocs (ou "builder") est l'interface principale de création d'une étude. Il se compose de trois zones :
          </p>
          <ul className={styles.list}>
            <li><strong>Palette de blocs (gauche)</strong> — Cliquez sur un type de bloc pour l'ajouter à la fin de votre étude.</li>
            <li><strong>Zone centrale</strong> — Affiche la structure de votre étude (onglet "Structure") ou la configuration du bloc sélectionné (onglet "Configurer").</li>
            <li><strong>Barre d'onglets supérieure</strong> — Naviguez entre Constructeur, Design, Mesures physio, Open Science et Export.</li>
          </ul>

          <div className={styles.infoBox}>
            <strong>Deux façons d'ajouter un bloc :</strong>
            <ul style={{ marginTop: 6, marginBottom: 0 }}>
              <li>Cliquer sur un type dans la <strong>palette de gauche</strong> → le bloc s'ajoute <strong>à la fin</strong> de la liste.</li>
              <li>Cliquer sur le bouton <strong>« + Insérer ici »</strong> qui apparaît au survol entre deux blocs → le bloc s'insère <strong>directement à la position choisie</strong>.</li>
            </ul>
          </div>

          <div className={styles.infoBox}>
            <strong>Réordonner les blocs :</strong> saisissez la poignée à gauche d'un bloc (six points) et glissez-la vers la position souhaitée. Une <strong>ligne bleue</strong> apparaît pendant le déplacement pour indiquer où le bloc va être inséré. Les blocs s'exécutent dans l'ordre défini.
          </div>

          <div className={styles.subsection}>
            <h3 className={styles.subsectionTitle}>2.1 Types de blocs disponibles</h3>
            <div className={styles.blockGrid}>
              <div className={styles.blockCard}>
                <span className={styles.blockCardBadge} style={{background:'#DDD6FE',color:'#4F46E5'}}>ACCUEIL</span>
                <p className={styles.blockCardTitle}>Message d'accueil</p>
                <p className={styles.blockCardDesc}>Page d'introduction ou consignes. Titre, texte libre (HTML) et bouton de démarrage personnalisable.</p>
              </div>
              <div className={styles.blockCard}>
                <span className={styles.blockCardBadge} style={{background:'#A7F3D0',color:'#059669'}}>QUESTIONNAIRE</span>
                <p className={styles.blockCardTitle}>Questionnaire</p>
                <p className={styles.blockCardDesc}>Bloc de questions. 30+ types disponibles. Ordre aléatoire configurable.</p>
              </div>
              <div className={styles.blockCard}>
                <span className={styles.blockCardBadge} style={{background:'#BFDBFE',color:'#2563EB'}}>TÂCHE</span>
                <p className={styles.blockCardTitle}>Tâche comportementale</p>
                <p className={styles.blockCardDesc}>Présentation de stimuli avec mesure de temps de réaction. Phases entraînement / test.</p>
              </div>
              <div className={styles.blockCard}>
                <span className={styles.blockCardBadge} style={{background:'#FDE68A',color:'#D97706'}}>LOGIQUE</span>
                <p className={styles.blockCardTitle}>Logique</p>
                <p className={styles.blockCardDesc}>Branchement conditionnel basé sur les réponses précédentes. Routage dynamique.</p>
              </div>
              <div className={styles.blockCard}>
                <span className={styles.blockCardBadge} style={{background:'#F1F5F9',color:'#64748B'}}>DEBRIEFING</span>
                <p className={styles.blockCardTitle}>Message de fin</p>
                <p className={styles.blockCardDesc}>Page de conclusion. Redirection automatique vers la plateforme de recrutement ou une URL personnalisée.</p>
              </div>
            </div>
          </div>
        </section>

        {/* ── 3. TYPES DE QUESTIONS ── */}
        <section id="section-3" className={styles.section}>
          <h2 className={styles.sectionTitle}>
            <span className={styles.sectionIcon}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 17h-2v-2h2v2zm2.07-7.75l-.9.92C13.45 12.9 13 13.5 13 15h-2v-.5c0-1.1.45-2.1 1.17-2.83l1.24-1.26c.37-.36.59-.86.59-1.41 0-1.1-.9-2-2-2s-2 .9-2 2H8c0-2.21 1.79-4 4-4s4 1.79 4 4c0 .88-.36 1.68-.93 2.25z"/></svg>
            </span>
            3. Types de questions
          </h2>

          <p className={styles.p}>
            Les types de questions sont organisés en cinq catégories : choix, texte, numérique, échelles &amp; matrices, et spécial. Chaque question peut être marquée comme obligatoire et ses choix peuvent être randomisés (sauf les choix ancrés).
          </p>

          <div className={styles.infoBox}>
            <strong>Validation des champs obligatoires.</strong> Lors de la création ou modification d'une question, les champs obligatoires (code, texte, au moins un choix avec libellé) sont vérifiés <em>avant</em> la sauvegarde. Si un champ manque, la fenêtre reste ouverte, les champs concernés sont encadrés en rouge avec un message d'aide, et toute saisie déjà entrée est conservée.
          </div>

          <div className={styles.tipBox}>
            <strong>Édition rapide du code.</strong> Dans la liste des questions d'un bloc, le code de chaque question est cliquable. Un clic dessus permet de le modifier directement sans avoir à ouvrir la fenêtre complète de la question. Appuyer sur <kbd>Entrée</kbd> pour valider, sur <kbd>Échap</kbd> pour annuler. Si le code saisi est déjà utilisé par une autre question du même bloc, un message d'erreur apparaît et la modification n'est pas appliquée.
          </div>

          <div className={styles.tipBox}>
            <strong>Étiquettes visuelles.</strong> Chaque question affiche dans la liste des étiquettes qui rappellent ses options activées : <em>obligatoire</em>, <em>📌 ancré</em> (position fixe quand l'ordre des questions du bloc est randomisé), <em>🔀 ordre questions</em> (ordre des questions du bloc randomisé), <em>🔀 ordre choix</em> ou <em>🔀 ordre items</em> (ordre interne à la question — choix pour radio/cases à cocher, items pour les matrices — mélangé pour chaque participant·e), <em>⚡ si X</em> (condition d'affichage active).
          </div>

          <div className={styles.tipBox}>
            <strong>Coller plusieurs items d'un coup.</strong> Pour les questions à choix (radio, case à cocher, etc.) et les matrices, un bouton <em>📋 Coller plusieurs modalités / items</em> est disponible à côté du bouton <em>+ Ajouter</em>. Il ouvre une zone de texte dans laquelle vous pouvez coller un contenu préparé ailleurs (Word, Excel, courriel…) : <strong>chaque ligne non vide devient un nouvel item</strong>. Les codes sont auto-générés (1, 2, 3… pour les choix, item1, item2… pour les matrices). Cela évite de saisir un à un une longue liste d'items.
          </div>

          <div className={styles.tipBox}>
            <strong>Réorganiser les modalités / items par glisser-déposer.</strong> Une poignée <em>⠿</em> est affichée à gauche de chaque modalité de réponse (pour les questions à choix) et de chaque item (pour les matrices). Cliquer-glisser cette poignée pour déplacer la ligne vers le haut ou vers le bas. L'ordre est mis à jour immédiatement dans le formulaire ; la modification est sauvegardée quand vous cliquez sur <em>Enregistrer</em>.
          </div>

          <div className={styles.tipBox}>
            <strong>Dupliquer une question vers un autre bloc.</strong> Le bouton <em>Dupliquer</em> (icône 📋) de chaque question crée par défaut une copie dans le bloc courant. Si l'étude contient d'autres blocs de type <em>Questionnaire</em>, une petite flèche <em>▾</em> apparaît à côté du bouton : elle ouvre un menu qui permet de choisir le bloc de destination. Pratique pour répliquer une question dans plusieurs étapes de l'étude (par exemple pré-test / post-test) sans avoir à la recréer.
          </div>

          {/* 3.1 Choix */}
          <div className={styles.subsection}>
            <h3 className={styles.subsectionTitle}>3.1 Choix</h3>
            <div className={styles.blockGrid} style={{gridTemplateColumns:'repeat(auto-fill, minmax(200px, 1fr))'}}>

              {/* Radio */}
              <div className={styles.blockCard}>
                <span className={styles.blockCardBadge} style={{background:'var(--gray-100)',color:'var(--gray-600)'}}>RADIO</span>
                <p className={styles.blockCardTitle}>Radio (choix unique)</p>
                <p className={styles.blockCardDesc}>Une seule réponse parmi plusieurs options. Idéal : genre, condition.</p>
                <div style={{marginTop:8, padding:'8px 10px', background:'var(--gray-50)', borderRadius:6, border:'1px solid var(--border)', fontSize:11, color:'var(--text-secondary)'}}>
                  <div style={{display:'flex', gap:8, alignItems:'center'}}>
                    <span style={{width:10,height:10,borderRadius:'50%',border:'1.5px solid var(--gray-300)',display:'inline-block',flexShrink:0}}></span>
                    <span style={{fontSize:10}}>Option A</span>
                    <span style={{width:10,height:10,borderRadius:'50%',border:'1.5px solid var(--brand)',background:'var(--brand)',display:'inline-block',flexShrink:0}}></span>
                    <span style={{fontSize:10}}>Option B</span>
                    <span style={{width:10,height:10,borderRadius:'50%',border:'1.5px solid var(--gray-300)',display:'inline-block',flexShrink:0}}></span>
                    <span style={{fontSize:10}}>Option C</span>
                  </div>
                </div>
              </div>

              {/* Case à cocher */}
              <div className={styles.blockCard}>
                <span className={styles.blockCardBadge} style={{background:'var(--gray-100)',color:'var(--gray-600)'}}>CHECKBOX</span>
                <p className={styles.blockCardTitle}>Case à cocher</p>
                <p className={styles.blockCardDesc}>Plusieurs réponses possibles. Idéal : connaissances préalables, symptômes.</p>
                <div style={{marginTop:8, padding:'8px 10px', background:'var(--gray-50)', borderRadius:6, border:'1px solid var(--border)', fontSize:11, color:'var(--text-secondary)'}}>
                  <div style={{display:'flex', flexDirection:'column', gap:4}}>
                    {[['Option A',false],['Option B',true],['Option C',false]].map(([label,checked],i)=>(
                      <div key={i} style={{display:'flex',alignItems:'center',gap:5}}>
                        <span style={{width:10,height:10,borderRadius:2,border:`1.5px solid ${checked?'var(--brand)':'var(--gray-300)'}`,background:checked?'var(--brand)':'transparent',display:'inline-flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>
                          {checked && <svg width="7" height="7" viewBox="0 0 10 10" fill="white"><path d="M1 5l3 3 5-5" strokeWidth="1.5" stroke="white" fill="none"/></svg>}
                        </span>
                        <span style={{fontSize:10}}>{label}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Likert */}
              <div className={styles.blockCard}>
                <span className={styles.blockCardBadge} style={{background:'var(--gray-100)',color:'var(--gray-600)'}}>LIKERT</span>
                <p className={styles.blockCardTitle}>Likert</p>
                <p className={styles.blockCardDesc}>N points avec labels extrêmes. Idéal : accord, intensité émotionnelle.</p>
                <div style={{marginTop:8, padding:'8px 10px', background:'var(--gray-50)', borderRadius:6, border:'1px solid var(--border)', fontSize:11, color:'var(--text-secondary)'}}>
                  <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', gap:2, marginBottom:3}}>
                    {[1,2,3,4,5].map(n=>(
                      <span key={n} style={{width:14,height:14,borderRadius:'50%',border:`1.5px solid var(--brand)`,background:n===3?'var(--brand)':'transparent',display:'inline-block',flexShrink:0}}></span>
                    ))}
                  </div>
                  <div style={{display:'flex', justifyContent:'space-between'}}>
                    <span style={{fontSize:9}}>Pas du tout d'accord</span>
                    <span style={{fontSize:9}}>Tout à fait d'accord</span>
                  </div>
                </div>
              </div>

              {/* Consentement */}
              <div className={styles.blockCard}>
                <span className={styles.blockCardBadge} style={{background:'var(--gray-100)',color:'var(--gray-600)'}}>CONSENTEMENT</span>
                <p className={styles.blockCardTitle}>Consentement</p>
                <p className={styles.blockCardDesc}>Boutons Accepter / Refuser distincts. Idéal : formulaire RGPD.</p>
                <div style={{marginTop:8, padding:'8px 10px', background:'var(--gray-50)', borderRadius:6, border:'1px solid var(--border)', fontSize:11, color:'var(--text-secondary)'}}>
                  <div style={{display:'flex', gap:6}}>
                    <div style={{padding:'4px 10px', background:'#16a34a', color:'white', borderRadius:5, fontSize:10, fontWeight:600}}>J'accepte</div>
                    <div style={{padding:'4px 10px', background:'#dc2626', color:'white', borderRadius:5, fontSize:10, fontWeight:600}}>Je refuse</div>
                  </div>
                </div>
              </div>

              {/* Select */}
              <div className={styles.blockCard}>
                <span className={styles.blockCardBadge} style={{background:'var(--gray-100)',color:'var(--gray-600)'}}>SELECT</span>
                <p className={styles.blockCardTitle}>Liste déroulante</p>
                <p className={styles.blockCardDesc}>Menu déroulant au lieu de boutons radio. Idéal : quand beaucoup d'options (pays, langues).</p>
                <div style={{marginTop:8, padding:'8px 10px', background:'var(--gray-50)', borderRadius:6, border:'1px solid var(--border)', fontSize:11, color:'var(--text-secondary)'}}>
                  <div style={{border:'1px solid var(--border)', borderRadius:4, padding:'4px 8px', background:'white', display:'flex', alignItems:'center', justifyContent:'space-between', fontSize:10}}>
                    <span style={{color:'var(--text-secondary)'}}>Sélectionnez...</span>
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="var(--text-secondary)"><path d="M7 10l5 5 5-5z"/></svg>
                  </div>
                </div>
              </div>

              {/* Button Group */}
              <div className={styles.blockCard}>
                <span className={styles.blockCardBadge} style={{background:'var(--gray-100)',color:'var(--gray-600)'}}>BUTTON_GROUP</span>
                <p className={styles.blockCardTitle}>Groupe de boutons</p>
                <p className={styles.blockCardDesc}>Choix unique sous forme de boutons stylés côte à côte. Idéal : réponses rapides.</p>
                <div style={{marginTop:8, padding:'8px 10px', background:'var(--gray-50)', borderRadius:6, border:'1px solid var(--border)', fontSize:11, color:'var(--text-secondary)'}}>
                  <div style={{display:'flex', gap:4}}>
                    {['Oui','Non','NSP'].map((l,i)=>(
                      <div key={i} style={{padding:'4px 10px', background:i===0?'var(--brand)':'white', color:i===0?'white':'var(--text-primary)', borderRadius:5, fontSize:10, fontWeight:600, border:'1px solid var(--border)'}}>{l}</div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Media Radio */}
              <div className={styles.blockCard}>
                <span className={styles.blockCardBadge} style={{background:'var(--gray-100)',color:'var(--gray-600)'}}>MEDIA_RADIO</span>
                <p className={styles.blockCardTitle}>Choix unique avec médias</p>
                <p className={styles.blockCardDesc}>Chaque option peut avoir une image, un audio ou une vidéo. Idéal : choix visuels.</p>
                <div style={{marginTop:8, padding:'8px 10px', background:'var(--gray-50)', borderRadius:6, border:'1px solid var(--border)', fontSize:11, color:'var(--text-secondary)'}}>
                  <div style={{display:'flex', gap:6}}>
                    {[true,false].map((sel,i)=>(
                      <div key={i} style={{flex:1, border:`1.5px solid ${sel?'var(--brand)':'var(--border)'}`, borderRadius:5, padding:4, textAlign:'center'}}>
                        <div style={{height:18, background:'var(--gray-100)', borderRadius:3, marginBottom:3, display:'flex', alignItems:'center', justifyContent:'center'}}>
                          <svg width="10" height="10" viewBox="0 0 24 24" fill="var(--text-secondary)"><path d="M21 19V5c0-1.1-.9-2-2-2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2zM8.5 13.5l2.5 3.01L14.5 12l4.5 6H5l3.5-4.5z"/></svg>
                        </div>
                        <span style={{fontSize:8}}>{sel?'● ':''} Option {i+1}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Media Checkbox */}
              <div className={styles.blockCard}>
                <span className={styles.blockCardBadge} style={{background:'var(--gray-100)',color:'var(--gray-600)'}}>MEDIA_CHECKBOX</span>
                <p className={styles.blockCardTitle}>Choix multiple avec médias</p>
                <p className={styles.blockCardDesc}>Sélection multiple avec médias (image, audio, vidéo). Idéal : classement visuel.</p>
                <div style={{marginTop:8, padding:'8px 10px', background:'var(--gray-50)', borderRadius:6, border:'1px solid var(--border)', fontSize:11, color:'var(--text-secondary)'}}>
                  <div style={{display:'flex', gap:6}}>
                    {[true,true,false].map((sel,i)=>(
                      <div key={i} style={{flex:1, border:`1.5px solid ${sel?'var(--brand)':'var(--border)'}`, borderRadius:5, padding:4, textAlign:'center'}}>
                        <div style={{height:16, background:'var(--gray-100)', borderRadius:3, marginBottom:2}}></div>
                        <span style={{fontSize:8}}>{sel?'☑ ':'☐ '}{String.fromCharCode(65+i)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Radio Comment */}
              <div className={styles.blockCard}>
                <span className={styles.blockCardBadge} style={{background:'var(--gray-100)',color:'var(--gray-600)'}}>RADIO_COMMENT</span>
                <p className={styles.blockCardTitle}>Choix unique + commentaire</p>
                <p className={styles.blockCardDesc}>Radio classique avec zone de texte libre. Idéal : avis avec justification.</p>
                <div style={{marginTop:8, padding:'8px 10px', background:'var(--gray-50)', borderRadius:6, border:'1px solid var(--border)', fontSize:11, color:'var(--text-secondary)'}}>
                  <div style={{display:'flex', alignItems:'center', gap:5, marginBottom:4}}>
                    <span style={{width:9,height:9,borderRadius:'50%',border:'1.5px solid var(--brand)',background:'var(--brand)',display:'inline-block'}}></span>
                    <span style={{fontSize:9}}>Option A</span>
                  </div>
                  <div style={{border:'1px solid var(--border)', borderRadius:3, padding:'3px 5px', background:'white', fontSize:9, color:'var(--text-secondary)'}}>Commentaire...</div>
                </div>
              </div>

              {/* Checkbox Comment */}
              <div className={styles.blockCard}>
                <span className={styles.blockCardBadge} style={{background:'var(--gray-100)',color:'var(--gray-600)'}}>CHECKBOX_COMMENT</span>
                <p className={styles.blockCardTitle}>Choix multiple + commentaire</p>
                <p className={styles.blockCardDesc}>Cases à cocher avec zone de texte libre. Idéal : sélection + précisions.</p>
                <div style={{marginTop:8, padding:'8px 10px', background:'var(--gray-50)', borderRadius:6, border:'1px solid var(--border)', fontSize:11, color:'var(--text-secondary)'}}>
                  <div style={{display:'flex', alignItems:'center', gap:5, marginBottom:4}}>
                    <span style={{width:9,height:9,borderRadius:2,border:'1.5px solid var(--brand)',background:'var(--brand)',display:'inline-block'}}></span>
                    <span style={{fontSize:9}}>Option B</span>
                  </div>
                  <div style={{border:'1px solid var(--border)', borderRadius:3, padding:'3px 5px', background:'white', fontSize:9, color:'var(--text-secondary)'}}>Commentaire...</div>
                </div>
              </div>

              {/* Drill Down */}
              <div className={styles.blockCard}>
                <span className={styles.blockCardBadge} style={{background:'var(--gray-100)',color:'var(--gray-600)'}}>DRILL_DOWN</span>
                <p className={styles.blockCardTitle}>Menu en cascade</p>
                <p className={styles.blockCardDesc}>Choix hiérarchique (niveau 1 puis niveau 2). Idéal : Pays puis Ville.</p>
                <div style={{marginTop:8, padding:'8px 10px', background:'var(--gray-50)', borderRadius:6, border:'1px solid var(--border)', fontSize:11, color:'var(--text-secondary)'}}>
                  <div style={{display:'flex', flexDirection:'column', gap:3}}>
                    <div style={{border:'1px solid var(--border)', borderRadius:4, padding:'3px 7px', background:'white', fontSize:9, display:'flex', justifyContent:'space-between', alignItems:'center'}}>
                      <span>France</span>
                      <svg width="8" height="8" viewBox="0 0 24 24" fill="var(--text-secondary)"><path d="M7 10l5 5 5-5z"/></svg>
                    </div>
                    <div style={{border:'1px solid var(--brand)', borderRadius:4, padding:'3px 7px', background:'white', fontSize:9, display:'flex', justifyContent:'space-between', alignItems:'center'}}>
                      <span>Paris</span>
                      <svg width="8" height="8" viewBox="0 0 24 24" fill="var(--text-secondary)"><path d="M7 10l5 5 5-5z"/></svg>
                    </div>
                  </div>
                </div>
              </div>

            </div>
          </div>

          {/* 3.2 Texte */}
          <div className={styles.subsection}>
            <h3 className={styles.subsectionTitle}>3.2 Texte</h3>
            <div className={styles.blockGrid} style={{gridTemplateColumns:'repeat(auto-fill, minmax(200px, 1fr))'}}>

              {/* Texte libre */}
              <div className={styles.blockCard}>
                <span className={styles.blockCardBadge} style={{background:'var(--gray-100)',color:'var(--gray-600)'}}>TEXTE</span>
                <p className={styles.blockCardTitle}>Texte libre</p>
                <p className={styles.blockCardDesc}>Zone de saisie ouverte. Idéal : justification, réponse qualitative.</p>
                <div style={{marginTop:8, padding:'8px 10px', background:'var(--gray-50)', borderRadius:6, border:'1px solid var(--border)', fontSize:11, color:'var(--text-secondary)'}}>
                  <div style={{border:'1px solid var(--border)', borderRadius:4, padding:'5px 7px', background:'white', color:'var(--text-secondary)', minHeight:32, fontSize:10}}>Votre réponse...</div>
                </div>
              </div>

              {/* Fill Blank */}
              <div className={styles.blockCard}>
                <span className={styles.blockCardBadge} style={{background:'var(--gray-100)',color:'var(--gray-600)'}}>FILL_BLANK</span>
                <p className={styles.blockCardTitle}>Texte à trous</p>
                <p className={styles.blockCardDesc}>Le participant remplit des champs dans un passage. Idéal : tests de compréhension.</p>
                <div style={{marginTop:8, padding:'8px 10px', background:'var(--gray-50)', borderRadius:6, border:'1px solid var(--border)', fontSize:11, color:'var(--text-secondary)'}}>
                  <span style={{fontSize:10}}>Le chat est un </span>
                  <span style={{borderBottom:'1.5px solid var(--brand)', padding:'0 8px', fontSize:10, color:'var(--brand)'}}>______</span>
                  <span style={{fontSize:10}}> domestique.</span>
                </div>
              </div>

              {/* Input Demand */}
              <div className={styles.blockCard}>
                <span className={styles.blockCardBadge} style={{background:'var(--gray-100)',color:'var(--gray-600)'}}>INPUT_DEMAND</span>
                <p className={styles.blockCardTitle}>Saisie demandée</p>
                <p className={styles.blockCardDesc}>Champ de texte court avec validation. Idéal : code participant, identifiant.</p>
                <div style={{marginTop:8, padding:'8px 10px', background:'var(--gray-50)', borderRadius:6, border:'1px solid var(--border)', fontSize:11, color:'var(--text-secondary)'}}>
                  <div style={{border:'1px solid var(--brand)', borderRadius:4, padding:'4px 8px', background:'white', fontSize:10, display:'flex', alignItems:'center', gap:5}}>
                    <span style={{color:'var(--text-secondary)'}}>Entrez votre code...</span>
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="var(--brand)"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/></svg>
                  </div>
                </div>
              </div>

              {/* Drop Word */}
              <div className={styles.blockCard}>
                <span className={styles.blockCardBadge} style={{background:'var(--gray-100)',color:'var(--gray-600)'}}>DROP_WORD</span>
                <p className={styles.blockCardTitle}>Texte à trous (banque de mots)</p>
                <p className={styles.blockCardDesc}>Glisser-déposer des mots depuis une banque vers les blancs. Idéal : vocabulaire, compréhension.</p>
                <div style={{marginTop:8, padding:'8px 10px', background:'var(--gray-50)', borderRadius:6, border:'1px solid var(--border)', fontSize:11, color:'var(--text-secondary)'}}>
                  <div style={{fontSize:10, marginBottom:4}}>
                    <span>Le </span>
                    <span style={{border:'1px dashed var(--brand)', borderRadius:3, padding:'1px 6px', background:'#BFDBFE', fontSize:9}}>soleil</span>
                    <span> brille.</span>
                  </div>
                  <div style={{display:'flex', gap:3}}>
                    {['lune','soleil','vent'].map((w,i)=>(
                      <span key={i} style={{padding:'2px 6px', background:'white', border:'1px solid var(--border)', borderRadius:3, fontSize:8, cursor:'grab'}}>{w}</span>
                    ))}
                  </div>
                </div>
              </div>

              {/* Display */}
              <div className={styles.blockCard}>
                <span className={styles.blockCardBadge} style={{background:'var(--gray-100)',color:'var(--gray-600)'}}>DISPLAY</span>
                <p className={styles.blockCardTitle}>Affichage texte/HTML</p>
                <p className={styles.blockCardDesc}>Contenu riche sans collecte de données. Idéal : consignes, stimuli textuels.</p>
                <div style={{marginTop:8, padding:'8px 10px', background:'var(--gray-50)', borderRadius:6, border:'1px solid var(--border)', fontSize:11, color:'var(--text-secondary)'}}>
                  <div style={{padding:'4px 6px', background:'white', border:'1px solid var(--border)', borderRadius:4}}>
                    <div style={{fontSize:10, fontWeight:600}}>Consigne</div>
                    <div style={{fontSize:9, color:'var(--text-secondary)'}}>Lisez attentivement le texte suivant...</div>
                  </div>
                </div>
              </div>

            </div>
          </div>

          {/* 3.3 Numérique */}
          <div className={styles.subsection}>
            <h3 className={styles.subsectionTitle}>3.3 Numérique</h3>
            <div className={styles.blockGrid} style={{gridTemplateColumns:'repeat(auto-fill, minmax(200px, 1fr))'}}>

              {/* Numérique */}
              <div className={styles.blockCard}>
                <span className={styles.blockCardBadge} style={{background:'var(--gray-100)',color:'var(--gray-600)'}}>NUMÉRIQUE</span>
                <p className={styles.blockCardTitle}>Numérique</p>
                <p className={styles.blockCardDesc}>Entier ou décimal avec min/max. Idéal : âge, fréquence, score.</p>
                <div style={{marginTop:8, padding:'8px 10px', background:'var(--gray-50)', borderRadius:6, border:'1px solid var(--border)', fontSize:11, color:'var(--text-secondary)'}}>
                  <div style={{display:'flex', alignItems:'center', gap:6}}>
                    <div style={{border:'1px solid var(--border)', borderRadius:4, padding:'4px 8px', background:'white', color:'var(--text-primary)', fontSize:11, minWidth:32, textAlign:'center'}}>25</div>
                    <span style={{fontSize:9}}>Min: 0 — Max: 100</span>
                  </div>
                </div>
              </div>

              {/* Equation */}
              <div className={styles.blockCard}>
                <span className={styles.blockCardBadge} style={{background:'var(--gray-100)',color:'var(--gray-600)'}}>EQUATION</span>
                <p className={styles.blockCardTitle}>Calcul / Équation</p>
                <p className={styles.blockCardDesc}>Le participant entre le résultat d'un calcul. Idéal : tests numériques, arithmétique.</p>
                <div style={{marginTop:8, padding:'8px 10px', background:'var(--gray-50)', borderRadius:6, border:'1px solid var(--border)', fontSize:11, color:'var(--text-secondary)'}}>
                  <div style={{display:'flex', alignItems:'center', gap:6}}>
                    <span style={{fontSize:11, fontWeight:600}}>12 + 7 =</span>
                    <div style={{border:'1px solid var(--border)', borderRadius:4, padding:'3px 8px', background:'white', fontSize:11, minWidth:32, textAlign:'center'}}>?</div>
                  </div>
                </div>
              </div>

              {/* Computed */}
              <div className={styles.blockCard}>
                <span className={styles.blockCardBadge} style={{background:'var(--gray-100)',color:'var(--gray-600)'}}>COMPUTED</span>
                <p className={styles.blockCardTitle}>Calcul automatique</p>
                <p className={styles.blockCardDesc}>Variables d'entrée + formule = résultat calculé en temps réel. Idéal : scores composites.</p>
                <div style={{marginTop:8, padding:'8px 10px', background:'var(--gray-50)', borderRadius:6, border:'1px solid var(--border)', fontSize:11, color:'var(--text-secondary)'}}>
                  <div style={{display:'flex', alignItems:'center', gap:5}}>
                    <span style={{fontSize:9, fontFamily:'monospace'}}>Q1 + Q2</span>
                    <span style={{fontSize:9}}>=</span>
                    <span style={{fontSize:11, fontWeight:700, color:'var(--brand)'}}>42</span>
                  </div>
                </div>
              </div>

              {/* Date */}
              <div className={styles.blockCard}>
                <span className={styles.blockCardBadge} style={{background:'var(--gray-100)',color:'var(--gray-600)'}}>DATE</span>
                <p className={styles.blockCardTitle}>Date</p>
                <p className={styles.blockCardDesc}>Calendrier natif. Idéal : date de naissance, dernier contact.</p>
                <div style={{marginTop:8, padding:'8px 10px', background:'var(--gray-50)', borderRadius:6, border:'1px solid var(--border)', fontSize:11, color:'var(--text-secondary)'}}>
                  <div style={{border:'1px solid var(--border)', borderRadius:4, padding:'4px 8px', background:'white', color:'var(--text-secondary)', fontSize:10, display:'flex', alignItems:'center', gap:5}}>
                    <svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor"><path d="M19 4h-1V2h-2v2H8V2H6v2H5c-1.11 0-1.99.9-1.99 2L3 20c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 16H5V9h14v11zM7 11h5v5H7z"/></svg>
                    <span>JJ/MM/AAAA</span>
                  </div>
                </div>
              </div>

            </div>
          </div>

          {/* 3.4 Échelles & Matrices */}
          <div className={styles.subsection}>
            <h3 className={styles.subsectionTitle}>3.4 Échelles &amp; Matrices</h3>
            <div className={styles.blockGrid} style={{gridTemplateColumns:'repeat(auto-fill, minmax(200px, 1fr))'}}>

              {/* Slider */}
              <div className={styles.blockCard}>
                <span className={styles.blockCardBadge} style={{background:'var(--gray-100)',color:'var(--gray-600)'}}>SLIDER</span>
                <p className={styles.blockCardTitle}>Slider</p>
                <p className={styles.blockCardDesc}>Échelle continue avec curseur. Idéal : certitude subjective.</p>
                <div style={{marginTop:8, padding:'8px 10px', background:'var(--gray-50)', borderRadius:6, border:'1px solid var(--border)', fontSize:11, color:'var(--text-secondary)'}}>
                  <div style={{position:'relative', height:4, background:'var(--border)', borderRadius:2, margin:'6px 0'}}>
                    <div style={{position:'absolute', left:0, width:'60%', height:'100%', background:'var(--brand)', borderRadius:2}}></div>
                    <div style={{position:'absolute', left:'60%', top:'50%', transform:'translate(-50%,-50%)', width:12, height:12, borderRadius:'50%', background:'var(--brand)', border:'2px solid white', boxShadow:'0 1px 2px rgba(0,0,0,.2)'}}></div>
                  </div>
                  <div style={{display:'flex', justifyContent:'space-between'}}>
                    <span style={{fontSize:9}}>0</span>
                    <span style={{fontSize:9}}>100</span>
                  </div>
                </div>
              </div>

              {/* Matrice */}
              <div className={styles.blockCard}>
                <span className={styles.blockCardBadge} style={{background:'var(--gray-100)',color:'var(--gray-600)'}}>MATRICE</span>
                <p className={styles.blockCardTitle}>Matrice</p>
                <p className={styles.blockCardDesc}>Plusieurs items sur la même échelle. Idéal : BFI, STAI, PHQ-9.</p>
                <div style={{marginTop:8, padding:'8px 10px', background:'var(--gray-50)', borderRadius:6, border:'1px solid var(--border)', fontSize:11, color:'var(--text-secondary)', overflowX:'auto'}}>
                  <table style={{width:'100%', borderCollapse:'collapse', fontSize:9}}>
                    <thead>
                      <tr>
                        <th style={{textAlign:'left', color:'var(--text-secondary)', fontWeight:400, paddingBottom:3}}></th>
                        {['1','2','3','4','5'].map(n=><th key={n} style={{color:'var(--text-secondary)', fontWeight:400, textAlign:'center', width:16, paddingBottom:3}}>{n}</th>)}
                      </tr>
                    </thead>
                    <tbody>
                      {['Item 1','Item 2'].map((item,i)=>(
                        <tr key={i}>
                          <td style={{color:'var(--text-secondary)', paddingRight:4, paddingBottom:3}}>{item}</td>
                          {[1,2,3,4,5].map(n=>(
                            <td key={n} style={{textAlign:'center', paddingBottom:3}}>
                              <span style={{width:9,height:9,borderRadius:'50%',border:'1.5px solid var(--brand)',background:(i===0&&n===4)||(i===1&&n===2)?'var(--brand)':'transparent',display:'inline-block'}}></span>
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Différentiel sémantique */}
              <div className={styles.blockCard}>
                <span className={styles.blockCardBadge} style={{background:'var(--gray-100)',color:'var(--gray-600)'}}>SÉMANTIQUE</span>
                <p className={styles.blockCardTitle}>Différentiel sémantique</p>
                <p className={styles.blockCardDesc}>Bipôles adjectivaux sur une échelle. Idéal : perception d'un objet.</p>
                <div style={{marginTop:8, padding:'8px 10px', background:'var(--gray-50)', borderRadius:6, border:'1px solid var(--border)', fontSize:11, color:'var(--text-secondary)'}}>
                  <div style={{display:'flex', alignItems:'center', gap:4}}>
                    <span style={{fontSize:9, flexShrink:0}}>Mauvais</span>
                    <div style={{display:'flex', gap:3, alignItems:'center'}}>
                      {[1,2,3,4,5,6,7].map(n=>(
                        <span key={n} style={{width:8,height:8,borderRadius:'50%',border:'1.5px solid var(--brand)',background:n===4?'var(--brand)':'transparent',display:'inline-block',flexShrink:0}}></span>
                      ))}
                    </div>
                    <span style={{fontSize:9, flexShrink:0}}>Bon</span>
                  </div>
                </div>
              </div>

              {/* Somme constante */}
              <div className={styles.blockCard}>
                <span className={styles.blockCardBadge} style={{background:'var(--gray-100)',color:'var(--gray-600)'}}>SOMME</span>
                <p className={styles.blockCardTitle}>Somme constante</p>
                <p className={styles.blockCardDesc}>Répartition de N points entre items. Idéal : allocation de ressources.</p>
                <div style={{marginTop:8, padding:'8px 10px', background:'var(--gray-50)', borderRadius:6, border:'1px solid var(--border)', fontSize:11, color:'var(--text-secondary)'}}>
                  {[['Item A',60],['Item B',40]].map(([label,val],i)=>(
                    <div key={i} style={{display:'flex', alignItems:'center', gap:5, marginBottom:4}}>
                      <span style={{fontSize:9, width:36, flexShrink:0}}>{label}</span>
                      <div style={{flex:1, height:5, background:'var(--border)', borderRadius:2}}>
                        <div style={{width:`${val}%`, height:'100%', background:'var(--brand)', borderRadius:2}}></div>
                      </div>
                      <span style={{fontSize:9, width:16, textAlign:'right', flexShrink:0}}>{val}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Side by Side */}
              <div className={styles.blockCard}>
                <span className={styles.blockCardBadge} style={{background:'var(--gray-100)',color:'var(--gray-600)'}}>SIDE_BY_SIDE</span>
                <p className={styles.blockCardTitle}>Side-by-side</p>
                <p className={styles.blockCardDesc}>Même items évalués sur deux conditions (avant/après, gauche/droite). Idéal : comparaisons.</p>
                <div style={{marginTop:8, padding:'8px 10px', background:'var(--gray-50)', borderRadius:6, border:'1px solid var(--border)', fontSize:11, color:'var(--text-secondary)'}}>
                  <div style={{display:'flex', gap:6}}>
                    <div style={{flex:1, textAlign:'center'}}>
                      <div style={{fontSize:8, fontWeight:600, marginBottom:3}}>Avant</div>
                      {[1,2,3,4,5].map(n=>(
                        <span key={n} style={{width:7,height:7,borderRadius:'50%',border:'1px solid var(--brand)',background:n===2?'var(--brand)':'transparent',display:'inline-block',margin:'0 1px'}}></span>
                      ))}
                    </div>
                    <div style={{width:1, background:'var(--border)'}}></div>
                    <div style={{flex:1, textAlign:'center'}}>
                      <div style={{fontSize:8, fontWeight:600, marginBottom:3}}>Après</div>
                      {[1,2,3,4,5].map(n=>(
                        <span key={n} style={{width:7,height:7,borderRadius:'50%',border:'1px solid var(--brand)',background:n===4?'var(--brand)':'transparent',display:'inline-block',margin:'0 1px'}}></span>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

            </div>
          </div>

          {/* 3.5 Spécial */}
          <div className={styles.subsection}>
            <h3 className={styles.subsectionTitle}>3.5 Spécial</h3>
            <div className={styles.blockGrid} style={{gridTemplateColumns:'repeat(auto-fill, minmax(200px, 1fr))'}}>

              {/* Classement */}
              <div className={styles.blockCard}>
                <span className={styles.blockCardBadge} style={{background:'var(--gray-100)',color:'var(--gray-600)'}}>CLASSEMENT</span>
                <p className={styles.blockCardTitle}>Classement</p>
                <p className={styles.blockCardDesc}>Ordonnancement par glisser-déposer. Idéal : préférences, priorités.</p>
                <div style={{marginTop:8, padding:'8px 10px', background:'var(--gray-50)', borderRadius:6, border:'1px solid var(--border)', fontSize:11, color:'var(--text-secondary)'}}>
                  {['Premier choix','Deuxième choix','Troisième choix'].map((item,i)=>(
                    <div key={i} style={{display:'flex', alignItems:'center', gap:5, padding:'3px 5px', background:'white', border:'1px solid var(--border)', borderRadius:4, marginBottom:3}}>
                      <span style={{fontSize:10, color:'var(--text-secondary)', letterSpacing:1}}>&#8801;</span>
                      <span style={{fontSize:9}}>{item}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Timing */}
              <div className={styles.blockCard}>
                <span className={styles.blockCardBadge} style={{background:'var(--gray-100)',color:'var(--gray-600)'}}>TIMING</span>
                <p className={styles.blockCardTitle}>Timing</p>
                <p className={styles.blockCardDesc}>Mesure automatique de la durée de réponse. Invisible pour le participant.</p>
                <div style={{marginTop:8, padding:'8px 10px', background:'var(--gray-50)', borderRadius:6, border:'1px solid var(--border)', fontSize:11, color:'var(--text-secondary)'}}>
                  <div style={{display:'flex', alignItems:'center', gap:6}}>
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="var(--brand)"><path d="M15 1H9v2h6V1zm-4 13h2V8h-2v6zm8.03-6.61l1.42-1.42c-.43-.51-.9-.99-1.41-1.41l-1.42 1.42C16.07 4.74 14.12 4 12 4c-4.97 0-9 4.03-9 9s4.02 9 9 9 9-4.03 9-9c0-2.12-.74-4.07-1.97-5.61zM12 20c-3.87 0-7-3.13-7-7s3.13-7 7-7 7 3.13 7 7-3.13 7-7 7z"/></svg>
                    <span style={{fontSize:9}}>Durée mesurée automatiquement</span>
                  </div>
                </div>
              </div>

              {/* Image */}
              <div className={styles.blockCard}>
                <span className={styles.blockCardBadge} style={{background:'var(--gray-100)',color:'var(--gray-600)'}}>IMAGE</span>
                <p className={styles.blockCardTitle}>Image</p>
                <p className={styles.blockCardDesc}>Affiche une image comme stimulus ou support de question.</p>
                <div style={{marginTop:8, padding:'8px 10px', background:'var(--gray-50)', borderRadius:6, border:'1px solid var(--border)', fontSize:11, color:'var(--text-secondary)'}}>
                  <div style={{display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', gap:4, padding:'8px 0', border:'1px dashed var(--border)', borderRadius:4, background:'white'}}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="var(--text-secondary)"><path d="M21 19V5c0-1.1-.9-2-2-2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2zM8.5 13.5l2.5 3.01L14.5 12l4.5 6H5l3.5-4.5z"/></svg>
                    <span style={{fontSize:9}}>Sélectionner une image</span>
                  </div>
                </div>
              </div>

              {/* Audio */}
              <div className={styles.blockCard}>
                <span className={styles.blockCardBadge} style={{background:'var(--gray-100)',color:'var(--gray-600)'}}>AUDIO</span>
                <p className={styles.blockCardTitle}>Audio</p>
                <p className={styles.blockCardDesc}>Lecture d'un fichier audio. Idéal : stimuli sonores, amorçage auditif.</p>
                <div style={{marginTop:8, padding:'8px 10px', background:'var(--gray-50)', borderRadius:6, border:'1px solid var(--border)', fontSize:11, color:'var(--text-secondary)'}}>
                  <div style={{display:'flex', alignItems:'center', gap:6, padding:'4px 6px', background:'white', border:'1px solid var(--border)', borderRadius:4}}>
                    <span style={{width:16,height:16,borderRadius:'50%',background:'var(--brand)',display:'inline-flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>
                      <svg width="8" height="8" viewBox="0 0 10 10" fill="white"><polygon points="2,1 9,5 2,9"/></svg>
                    </span>
                    <span style={{fontSize:9}}>audio.mp3</span>
                  </div>
                </div>
              </div>

              {/* Vidéo */}
              <div className={styles.blockCard}>
                <span className={styles.blockCardBadge} style={{background:'var(--gray-100)',color:'var(--gray-600)'}}>VIDÉO</span>
                <p className={styles.blockCardTitle}>Vidéo</p>
                <p className={styles.blockCardDesc}>Lecture d'une vidéo. Idéal : stimuli vidéo, scénarios comportementaux.</p>
                <div style={{marginTop:8, padding:'8px 10px', background:'var(--gray-50)', borderRadius:6, border:'1px solid var(--border)', fontSize:11, color:'var(--text-secondary)'}}>
                  <div style={{position:'relative', height:36, background:'#1f2937', borderRadius:4, display:'flex', alignItems:'center', justifyContent:'center'}}>
                    <span style={{width:18,height:18,borderRadius:'50%',background:'rgba(255,255,255,0.2)',display:'inline-flex',alignItems:'center',justifyContent:'center'}}>
                      <svg width="9" height="9" viewBox="0 0 10 10" fill="white"><polygon points="2,1 9,5 2,9"/></svg>
                    </span>
                  </div>
                </div>
              </div>

              {/* Drag Drop */}
              <div className={styles.blockCard}>
                <span className={styles.blockCardBadge} style={{background:'var(--gray-100)',color:'var(--gray-600)'}}>DRAG_DROP</span>
                <p className={styles.blockCardTitle}>Glisser-déposer</p>
                <p className={styles.blockCardDesc}>Classer des éléments dans des catégories par drag and drop. Idéal : tri, catégorisation.</p>
                <div style={{marginTop:8, padding:'8px 10px', background:'var(--gray-50)', borderRadius:6, border:'1px solid var(--border)', fontSize:11, color:'var(--text-secondary)'}}>
                  <div style={{display:'flex', gap:6}}>
                    {['Cat. A','Cat. B'].map((cat,i)=>(
                      <div key={i} style={{flex:1, border:'1px dashed var(--border)', borderRadius:4, padding:4, textAlign:'center'}}>
                        <div style={{fontSize:8, fontWeight:600, marginBottom:3}}>{cat}</div>
                        {i===0 && <span style={{padding:'2px 5px', background:'#BFDBFE', borderRadius:3, fontSize:8}}>Item 1</span>}
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Highlight */}
              <div className={styles.blockCard}>
                <span className={styles.blockCardBadge} style={{background:'var(--gray-100)',color:'var(--gray-600)'}}>HIGHLIGHT</span>
                <p className={styles.blockCardTitle}>Surlignage</p>
                <p className={styles.blockCardDesc}>Sélectionner des mots/passages dans un texte. Idéal : analyse de texte, repérage.</p>
                <div style={{marginTop:8, padding:'8px 10px', background:'var(--gray-50)', borderRadius:6, border:'1px solid var(--border)', fontSize:11, color:'var(--text-secondary)'}}>
                  <span style={{fontSize:10}}>Voici un </span>
                  <span style={{fontSize:10, background:'#fef08a', padding:'1px 2px', borderRadius:2}}>passage important</span>
                  <span style={{fontSize:10}}> dans le texte.</span>
                </div>
              </div>

              {/* Hotspot */}
              <div className={styles.blockCard}>
                <span className={styles.blockCardBadge} style={{background:'var(--gray-100)',color:'var(--gray-600)'}}>HOTSPOT</span>
                <p className={styles.blockCardTitle}>Zone cliquable</p>
                <p className={styles.blockCardDesc}>Cliquer sur une ou plusieurs zones d{'’'}une image (selon le réglage <em>Clics maximum</em>), coordonnées X/Y de chaque clic enregistrées en % de l{'’'}image. Idéal : détection visuelle, cartes de chaleur. En mode multi-clics, une croix sur chaque marqueur permet de le retirer.</p>
                <div style={{marginTop:8, padding:'8px 10px', background:'var(--gray-50)', borderRadius:6, border:'1px solid var(--border)', fontSize:11, color:'var(--text-secondary)'}}>
                  <div style={{position:'relative', height:32, background:'var(--gray-100)', borderRadius:4, display:'flex', alignItems:'center', justifyContent:'center'}}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="var(--text-secondary)"><path d="M21 19V5c0-1.1-.9-2-2-2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2zM8.5 13.5l2.5 3.01L14.5 12l4.5 6H5l3.5-4.5z"/></svg>
                    <div style={{position:'absolute', top:6, right:14, width:8, height:8, borderRadius:'50%', background:'#ef4444', border:'2px solid white', boxShadow:'0 0 0 1px #ef4444'}}></div>
                  </div>
                </div>
              </div>

              {/* File Upload */}
              <div className={styles.blockCard}>
                <span className={styles.blockCardBadge} style={{background:'var(--gray-100)',color:'var(--gray-600)'}}>FILE_UPLOAD</span>
                <p className={styles.blockCardTitle}>Dépôt de fichier</p>
                <p className={styles.blockCardDesc}>Le participant uploade un fichier. Idéal : recueil de documents, dessins.</p>
                <div style={{marginTop:8, padding:'8px 10px', background:'var(--gray-50)', borderRadius:6, border:'1px solid var(--border)', fontSize:11, color:'var(--text-secondary)'}}>
                  <div style={{border:'1px dashed var(--border)', borderRadius:4, padding:'8px 0', textAlign:'center', background:'white'}}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="var(--text-secondary)"><path d="M19 9h-4V3H9v6H5l7 7 7-7zM5 18v2h14v-2H5z"/></svg>
                    <div style={{fontSize:8, marginTop:2}}>Déposer un fichier</div>
                  </div>
                </div>
              </div>

              {/* Meta Info */}
              <div className={styles.blockCard}>
                <span className={styles.blockCardBadge} style={{background:'var(--gray-100)',color:'var(--gray-600)'}}>META_INFO</span>
                <p className={styles.blockCardTitle}>Métadonnées</p>
                <p className={styles.blockCardDesc}>Collecte automatique (navigateur, OS, résolution). Invisible pour le participant.</p>
                <div style={{marginTop:8, padding:'8px 10px', background:'var(--gray-50)', borderRadius:6, border:'1px solid var(--border)', fontSize:11, color:'var(--text-secondary)'}}>
                  <div style={{display:'flex', alignItems:'center', gap:5}}>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="var(--text-secondary)"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z"/></svg>
                    <span style={{fontSize:9}}>Navigateur, OS, résolution...</span>
                  </div>
                </div>
              </div>

            </div>
          </div>

          <div className={styles.tipBox}>
            <strong>Bon {'\u00e0'} savoir :</strong> Pour les {'\u00e9'}chelles valid{'\u00e9'}es (BFI, STAI, PHQ-9, etc.), utilisez le type Matrice et cochez l'{'\u2019'}option {'\u00ab'}{'\u00a0'}Invers{'\u00e9'} (R){'\u00a0'}{'\u00bb'} sur les items {'\u00e0'} scorer en sens inverse. {'\u00c0'} l'export, deux colonnes seront produites pour chaque item invers{'\u00e9'} : une avec la valeur brute (sans suffixe) et une avec la valeur recod{'\u00e9'}e (suffixe <code>_R</code>). Le type TIMING est cumulable avec n'{'\u2019'}importe quel autre type de question.
          </div>
          <div className={styles.tipBox}>
            <strong>Valeur de d{'\u00e9'}part :</strong> Les {'\u00e9'}chelles de Likert, Matrice et Diff{'\u00e9'}rentiel s{'\u00e9'}mantique peuvent commencer {'\u00e0'} <strong>0</strong> ou {'\u00e0'} <strong>1</strong>. S{'\u00e9'}lectionnez la valeur de d{'\u00e9'}part souhait{'\u00e9'}e dans le formulaire de la question (option {'\u00ab'}{'\u00a0'}Valeur de d{'\u00e9'}part{'\u00a0'}{'\u00bb'}).
          </div>
          <div className={styles.tipBox}>
            <strong>Confort de passation pour les questionnaires longs :</strong> deux options compl{'\u00e9'}mentaires sont disponibles dans les param{'\u00e8'}tres de chaque question.
            <ul style={{ marginTop: 6, marginBottom: 0 }}>
              <li>
                <em>{'\u00ab\u00a0'}Garder la consigne visible pendant le d{'\u00e9'}filement{'\u00a0\u00bb'}</em> {'\u2014'} la consigne (le texte de la question) reste {'\u00e9'}pingl{'\u00e9'}e en haut de l'{'\u00e9'}cran ; le corps de la question (la matrice et ses items) continue de d{'\u00e9'}filer normalement en-dessous.
              </li>
              <li>
                <em>{'\u00ab\u00a0'}En-t{'\u00ea'}te de matrice toujours visible{'\u00a0\u00bb'}</em> (matrices uniquement) {'\u2014'} la ligne des chiffres et libell{'\u00e9'}s de colonnes (ex. 1 {'\u2013'} 2 {'\u2013'} 3 {'\u2013'} 4 {'\u2013'} 5, {'\u00ab\u00a0'}Pas du tout d'accord{'\u00a0\u00bb\u2026'}) reste affich{'\u00e9'}e en haut. {'\u00c9'}vite que les ancres de l'{'\u00e9'}chelle disparaissent au-del{'\u00e0'} du 10\u1d49 item.
              </li>
            </ul>
            Vous pouvez activer les deux options ensemble : la consigne se positionne au-dessus, puis l'en-t{'\u00ea'}te de matrice juste en-dessous, et les items d{'\u00e9'}filent en-dessous.
          </div>
        </section>

        {/* ── 4. TÂCHE COMPORTEMENTALE ── */}
        <section id="section-4" className={styles.section}>
          <h2 className={styles.sectionTitle}>
            <span className={styles.sectionIcon}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 14H9V8h2v8zm4 0h-2V8h2v8z"/></svg>
            </span>
            4. Tâche comportementale
          </h2>

          <p className={styles.p}>
            Le bloc Tâche permet de créer des paradigmes comportementaux (amorçage, catégorisation, temps de réaction). Il se configure via 4 onglets dans l'inspecteur de droite.
          </p>

          <div className={styles.subsection}>
            <h3 className={styles.subsectionTitle}>4.1 Onglet Structure — phases de la tâche</h3>
            <p className={styles.p}>
              Une tâche se compose de phases successives. Définissez-les dans l'onglet Structure. Chaque phase a un rôle distinct dans le déroulement du paradigme :
            </p>
            <ul className={styles.list}>
              <li><strong>Instruction</strong> — Texte de consignes affiché avant les essais. Peut contenir des images, du texte mis en forme et un bouton de démarrage.</li>
              <li><strong>Bloc d'entraînement</strong> — Essais de pratique permettant au participant de se familiariser avec la tâche. Le feedback est généralement activé. Les données sont identifiées comme « entraînement » dans l'export, pour que vous puissiez les écarter facilement. Indiquez le nombre d'essais et si les stimuli doivent être randomisés.</li>
              <li><strong>Bloc de test</strong> — Essais expérimentaux dont les données sont enregistrées et exportables. Le feedback peut être désactivé selon le protocole. Configurez le nombre d'essais et la randomisation.</li>
              <li><strong>Pause</strong> — Écran de pause inter-blocs avec durée configurable.</li>
            </ul>
          </div>

          <div className={styles.subsection}>
            <h3 className={styles.subsectionTitle}>4.2 Onglet Essai — séquence temporelle d'un essai</h3>
            <p className={styles.p}>
              Construisez la séquence temporelle d'un essai en ajoutant des étapes. Le diagramme ci-dessous illustre un essai typique d'amorçage :
            </p>

            {/* Diagramme séquence d'essai */}
            <div style={{overflowX:'auto', paddingBottom:4}}>
              <div style={{display:'flex', alignItems:'center', gap:0, minWidth:600, padding:'16px 0'}}>
                {[
                  {label:'IEI', sub:'500 ms', bg:'#F1F5F9', border:'#CBD5E1', color:'#64748B'},
                  {label:'Fixation', sub:'200–500 ms', bg:'#F1F5F9', border:'#CBD5E1', color:'#64748B'},
                  {label:'Stimulus', sub:'jusqu\'à réponse', bg:'#A7F3D0', border:'#6EE7B7', color:'#059669'},
                  {label:'Masque', sub:'250 ms', bg:'#F1F5F9', border:'#CBD5E1', color:'#64748B'},
                  {label:'Feedback', sub:'600 ms', bg:'#FDE68A', border:'#FCD34D', color:'#D97706'},
                ].map((step, i, arr) => (
                  <div key={i} style={{display:'flex', alignItems:'center', flex: step.label==='Stimulus'?1.5:1}}>
                    <div style={{
                      flex:1,
                      background:step.bg,
                      border:`1.5px solid ${step.border}`,
                      borderRadius:8,
                      padding:'10px 8px',
                      textAlign:'center',
                      minWidth:80,
                    }}>
                      <div style={{fontSize:12, fontWeight:700, color:step.color}}>{step.label}</div>
                      <div style={{fontSize:10, color:'#9ca3af', marginTop:2}}>{step.sub}</div>
                    </div>
                    {i < arr.length-1 && (
                      <div style={{display:'flex', alignItems:'center', flexShrink:0, width:28}}>
                        <div style={{flex:1, height:1.5, background:'#cbd5e1'}}></div>
                        <svg width="10" height="10" viewBox="0 0 10 10" fill="#94a3b8"><path d="M0 4h8v2H0zm5-4l5 5-5 5V0z"/></svg>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Tableau des étapes */}
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Étape</th>
                  <th>Durée typique</th>
                  <th>Options clés</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td><strong>Intervalle inter-essai (IEI)</strong></td>
                  <td>400–1000 ms</td>
                  <td>Durée fixe, ou variable (plage min/max tirée aléatoirement, continue ou par paliers)</td>
                </tr>
                <tr>
                  <td><strong>Point de fixation</strong></td>
                  <td>200–600 ms</td>
                  <td>Croix ou point central ; durée variable configurable</td>
                </tr>
                <tr>
                  <td><strong>Stimulus</strong></td>
                  <td>Variable (réponse) ou fixe</td>
                  <td>Image / son / vidéo / texte ; réponse clavier ou souris ; durée max</td>
                </tr>
                <tr>
                  <td><strong>Masque</strong></td>
                  <td>50–300 ms</td>
                  <td>Image de masque ; durée fixe</td>
                </tr>
                <tr>
                  <td><strong>Feedback</strong></td>
                  <td>400–800 ms</td>
                  <td>Texte correct/incorrect ; couleur configurable</td>
                </tr>
                <tr>
                  <td><strong>Question post-essai</strong></td>
                  <td>Variable</td>
                  <td>Jugement de confiance, awareness check</td>
                </tr>
              </tbody>
            </table>

            <div className={styles.infoBox}>
              <strong>Durées aléatoires :</strong> Pour les étapes de type fixation ou IEI, activez <em>« Durée variable »</em> pour définir une plage min/max. À chaque essai, une durée est tirée dans cette plage.
              <ul style={{margin:'8px 0 0', paddingLeft:18}}>
                <li><strong>Tirage continu</strong> — laissez le champ <em>Pas</em> vide : la durée peut prendre n'importe quelle valeur entière entre min et max (par ex. 300–800 ms → 456 ms, 712 ms, 389 ms…).</li>
                <li><strong>Tirage par paliers</strong> — renseignez un <em>Pas</em> (ex. 100) : la durée est choisie parmi les multiples du pas dans l'intervalle (par ex. 300–800 ms avec pas 100 → 300, 400, 500, 600, 700 ou 800 ms).</li>
              </ul>
            </div>
          </div>

          <div className={styles.subsection}>
            <h3 className={styles.subsectionTitle}>4.3 Exemple — configuration IAT (Implicit Association Test)</h3>
            <p className={styles.p}>
              Voici comment structurer les 7 blocs classiques d'un IAT dans MindCraft :
            </p>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Bloc</th>
                  <th>Type</th>
                  <th>Catégories</th>
                  <th>Essais</th>
                  <th>Touches</th>
                </tr>
              </thead>
              <tbody>
                <tr><td><strong>1</strong></td><td>Entraînement</td><td>Cible A vs B</td><td>20</td><td>E / I</td></tr>
                <tr><td><strong>2</strong></td><td>Entraînement</td><td>Attribut + vs −</td><td>20</td><td>E / I</td></tr>
                <tr><td><strong>3</strong></td><td>Entraînement</td><td>Cible A + Attribut + / Cible B + Attribut −</td><td>20</td><td>E / I</td></tr>
                <tr><td><strong>4</strong></td><td>Test</td><td>Compatible (A+) / (B−)</td><td>40</td><td>E / I</td></tr>
                <tr><td><strong>5</strong></td><td>Entraînement</td><td>Cible inversée B vs A</td><td>20</td><td>E / I</td></tr>
                <tr><td><strong>6</strong></td><td>Entraînement</td><td>Cible B + Attribut + / Cible A + Attribut −</td><td>20</td><td>E / I</td></tr>
                <tr><td><strong>7</strong></td><td>Test</td><td>Incompatible (B+) / (A−)</td><td>40</td><td>E / I</td></tr>
              </tbody>
            </table>
            <div className={styles.tipBox}>
              <strong>Conseil IAT :</strong> Dans l'onglet Design, créez un facteur intra-sujets "Ordre" avec deux niveaux (Compatible en premier / Incompatible en premier) et utilisez le contrebalancement Williams pour contrôler les effets d'ordre.
            </div>
          </div>

          <div className={styles.subsection}>
            <h3 className={styles.subsectionTitle}>4.4 Onglet Stimuli — gestion des fichiers</h3>
            <p className={styles.p}>
              Uploadez vos fichiers stimulus (images, sons, vidéos). Vous pouvez les organiser par catégories. Les catégories sont utilisées pour l'assignation dans le design expérimental.
            </p>
            <table className={styles.table}>
              <thead>
                <tr><th>Type</th><th>Formats acceptés</th><th>Options</th></tr>
              </thead>
              <tbody>
                <tr><td><strong>Images</strong></td><td>JPEG, PNG, SVG, WebP</td><td>Taille, position, durée d'affichage</td></tr>
                <tr><td><strong>Audio</strong></td><td>MP3, WAV, OGG</td><td>Volume, lecture automatique, nombre de répétitions</td></tr>
                <tr><td><strong>Vidéo</strong></td><td>MP4, WebM</td><td>Dimensions, lecture automatique, masquage des contrôles</td></tr>
                <tr><td><strong>Texte (mots)</strong></td><td>Chaînes de caractères</td><td>Police, taille, couleur, position à l'écran</td></tr>
              </tbody>
            </table>
          </div>

          <div className={styles.subsection}>
            <h3 className={styles.subsectionTitle}>4.5 Paramètres d'apparence</h3>
            <p className={styles.p}>
              L'apparence de la tâche est configurable pour correspondre aux standards de votre protocole :
            </p>
            <ul className={styles.list}>
              <li><strong>Couleur de fond</strong> — Couleur d'arrière-plan de l'écran de tâche (blanc, gris, noir ou couleur personnalisée).</li>
              <li><strong>Couleur du texte</strong> — Couleur des labels, feedback et consignes.</li>
              <li><strong>Taille des stimuli</strong> — En pixels ou en pourcentage de l'écran.</li>
              <li><strong>Point de fixation</strong> — Croix (+), point ou personnalisé. Taille et couleur configurables.</li>
            </ul>
          </div>

          <div className={styles.subsection}>
            <h3 className={styles.subsectionTitle}>4.6 Réponses par touches clavier</h3>
            <p className={styles.p}>
              Configurez les touches de réponse dans l'onglet Essai. Pour chaque catégorie de stimulus, associez une touche clavier (ex : "E" pour gauche, "I" pour droite).
              Les touches sont affichées au participant pendant la tâche sous forme de labels configurables.
            </p>
          </div>

          <div className={styles.subsection}>
            <h3 className={styles.subsectionTitle}>4.7 Intégrer une tâche externe</h3>
            <p className={styles.p}>
              Si vous avez déjà une tâche développée sur PsychoPy, PsyToolkit, OpenSesame ou en HTML, vous pouvez l'intégrer sans la recréer via l'onglet Tâche externe :
            </p>
            <ul className={styles.list}>
              <li><strong>Mode iFrame</strong> — La tâche s'affiche dans la page MindCraft. Compatible avec les tâches web hébergées (GitHub Pages, serveur personnel).</li>
              <li><strong>Mode Redirection</strong> — Le participant est redirigé vers la tâche externe, puis revient automatiquement sur MindCraft pour la suite de l'étude.</li>
            </ul>
            <p className={styles.p}>
              La détection de fin de tâche peut se faire via un bouton "Continuer", un message JavaScript (<code>postMessage('mindcraft:complete')</code>), ou une durée maximale.
            </p>
          </div>
        </section>

        {/* ── 5. MESURES PHYSIOLOGIQUES ── */}
        <section id="section-5" className={styles.section}>
          <h2 className={styles.sectionTitle}>
            <span className={styles.sectionIcon}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M16.5 3c-1.74 0-3.41.81-4.5 2.09C10.91 3.81 9.24 3 7.5 3 4.42 3 2 5.42 2 8.5c0 3.78 3.4 6.86 8.55 11.54L12 21.35l1.45-1.32C18.6 15.36 22 12.28 22 8.5 22 5.42 19.58 3 16.5 3z"/></svg>
            </span>
            5. Mesures physiologiques
          </h2>

          <p className={styles.p}>
            MindCraft permet de synchroniser vos enregistrements physiologiques (EEG, ECG, EDA/GSR, eye-tracking) avec chaque {'\u00e9'}v{'\u00e9'}nement de votre {'\u00e9'}tude gr{'\u00e2'}ce au protocole <strong>Lab Streaming Layer (LSL)</strong>. Cette section explique le concept, le fonctionnement et la configuration.
          </p>
          <p className={styles.p} style={{ fontSize: '0.92em', color: 'var(--text-muted)', fontStyle: 'italic' }}>
            Note : la prise en charge actuelle se limite aux capteurs les plus couramment utilis{'\u00e9'}s en recherche comportementale. D'autres modalit{'\u00e9'}s (EMG, fNIRS, respiration, etc.) seront ajout{'\u00e9'}es progressivement, une fois la synchronisation test{'\u00e9'}e et valid{'\u00e9'}e pour chacune. Cette limite est document{'\u00e9'}e dans le working paper de validation temporelle.
          </p>

          {/* ── 5.1 Qu'est-ce qu'un marqueur LSL ? ── */}
          <div className={styles.subsection}>
            <h3 className={styles.subsectionTitle}>5.1 {"Qu'est-ce qu'un"} marqueur LSL ?</h3>
            <p className={styles.p}>
              Imaginez que vous filmez une sc{'\u00e8'}ne de cin{'\u00e9'}ma tout en enregistrant le son s{'\u00e9'}par{'\u00e9'}ment. Pour pouvoir synchroniser l{"'"}image et le son au montage, on utilise un <strong>clap</strong> : un signal bref, visible sur la vid{'\u00e9'}o et audible sur la piste son, qui sert de point de rep{'\u00e8'}re commun.
            </p>
            <p className={styles.p}>
              Un <strong>marqueur LSL</strong> fonctionne exactement de la m{'\u00ea'}me fa{'\u00e7'}on. C{"'"}est un signal bref envoy{'\u00e9'} {'\u00e0'} un instant pr{'\u00e9'}cis de l{"'"}exp{'\u00e9'}rience (par exemple : {'\u00ab'}{'\u00a0'}un stimulus vient d{"'"}appara{'\u00ee'}tre{'\u00a0'}{'\u00bb'} ou {'\u00ab'}{'\u00a0'}le participant a r{'\u00e9'}pondu{'\u00a0'}{'\u00bb'}) qui est enregistr{'\u00e9'} <strong>en m{'\u00ea'}me temps</strong> dans votre flux de donn{'\u00e9'}es physiologiques (EEG, eye-tracking, etc.).
            </p>
            <p className={styles.p}>
              Apr{'\u00e8'}s l{"'"}exp{'\u00e9'}rience, ces marqueurs vous permettent, dans vos outils d{"'"}analyse externes, de d{'\u00e9'}couper vos donn{'\u00e9'}es physiologiques pour isoler pr{'\u00e9'}cis{'\u00e9'}ment ce qui se passe dans le cerveau ou les yeux du participant {'\u00e0'} chaque {'\u00e9'}tape de votre t{'\u00e2'}che.
            </p>
            <div className={styles.infoBox}>
              <strong>LSL (Lab Streaming Layer)</strong> est un protocole standard en neurosciences utilis{'\u00e9'} par BrainVision, BIOPAC, Tobii, OpenBCI et bien d{"'"}autres logiciels d{"'"}acquisition. MindCraft envoie les marqueurs via WebSocket vers un petit script relay Python qui les injecte dans le r{'\u00e9'}seau LSL.
            </div>
          </div>

          {/* ── 5.2 Architecture à deux niveaux ── */}
          <div className={styles.subsection}>
            <h3 className={styles.subsectionTitle}>5.2 Architecture : deux niveaux de marqueurs</h3>
            <p className={styles.p}>
              MindCraft envoie des marqueurs {'\u00e0'} deux niveaux compl{'\u00e9'}mentaires :
            </p>
            <ul className={styles.list}>
              <li>
                <strong>Marqueurs globaux (niveau {'\u00e9'}tude)</strong> — Envoy{'\u00e9'}s automatiquement par MindCraft pour <em>tous</em> les types de blocs : d{'\u00e9'}but/fin d{"'\u00e9"}tude, d{'\u00e9'}but/fin de bloc, affichage de question, r{'\u00e9'}ponse du participant. Codes par d{'\u00e9'}faut : <code>STUDY_START</code>, <code>STUDY_END</code>, <code>BLOCK_START</code>, <code>BLOCK_END</code>, <code>Q_SHOW</code>, <code>Q_RESP</code>. Configurables dans l{"'\u00e9"}tude, onglet {'\u00ab'}{'\u00a0'}Mesures physio{'\u00a0'}{'\u00bb'}.
              </li>
              <li>
                <strong>Marqueurs fins (niveau t{'\u00e2'}che)</strong> — Sp{'\u00e9'}cifiques aux blocs de type <em>T{'\u00e2'}che</em>. Ils marquent chaque micro-{'\u00e9'}v{'\u00e9'}nement {'\u00e0'} l{"'"}int{'\u00e9'}rieur d{"'"}un essai (fixation, stimulus, r{'\u00e9'}ponse, feedback). Le fonctionnement de ces marqueurs d{'\u00e9'}pend du type de t{'\u00e2'}che : <strong>interne</strong> ou <strong>externe</strong>.
              </li>
            </ul>
            <p className={styles.p}>
              Les deux niveaux coexistent et se compl{'\u00e8'}tent. Les marqueurs globaux vous donnent la structure g{'\u00e9'}n{'\u00e9'}rale ({'\u00ab'}{'\u00a0'}on est dans le bloc 3{'\u00a0'}{'\u00bb'}), les marqueurs fins vous donnent le d{'\u00e9'}tail ({'\u00ab'}{'\u00a0'}le stimulus n{'\u00b0'}12 vient d{"'"}appara{'\u00ee'}tre{'\u00a0'}{'\u00bb'}).
            </p>
          </div>

          {/* ── 5.3 Tâche interne (trial-based) ── */}
          <div className={styles.subsection}>
            <h3 className={styles.subsectionTitle}>5.3 T{'\u00e2'}che interne (construite dans MindCraft)</h3>
            <p className={styles.p}>
              Lorsque vous construisez votre t{'\u00e2'}che directement dans MindCraft (onglets Structure, Essai, Stimuli), les marqueurs fins sont envoy{'\u00e9'}s <strong>automatiquement</strong> {'\u00e0'} chaque {'\u00e9'}tape de chaque essai. Vous n{"'"}avez rien {'\u00e0'} coder.
            </p>

            {/* Diagramme séquence d'essai avec marqueurs */}
            <div style={{overflowX:'auto', paddingBottom:4}}>
              <div style={{display:'flex', alignItems:'center', gap:0, minWidth:520, padding:'16px 0'}}>
                {[
                  {label:'Fixation', marker:'F', bg:'#F1F5F9', border:'#CBD5E1', color:'#64748B'},
                  {label:'Stimulus', marker:'S', bg:'#A7F3D0', border:'#6EE7B7', color:'#059669'},
                  {label:'R\u00e9ponse', marker:'R', bg:'#A7F3D0', border:'#6EE7B7', color:'#059669'},
                  {label:'Feedback', marker:'FB', bg:'#FDE68A', border:'#FCD34D', color:'#D97706'},
                ].map((step, i, arr) => (
                  <div key={i} style={{display:'flex', alignItems:'center', flex:1}}>
                    <div style={{
                      flex:1,
                      background:step.bg,
                      border:`1.5px solid ${step.border}`,
                      borderRadius:8,
                      padding:'10px 8px',
                      textAlign:'center',
                      minWidth:80,
                    }}>
                      <div style={{fontSize:12, fontWeight:700, color:step.color}}>{step.label}</div>
                      <div style={{fontSize:10, color:'#6b7280', marginTop:4, fontFamily:'monospace', fontWeight:600}}>marqueur : {step.marker}</div>
                    </div>
                    {i < arr.length-1 && (
                      <div style={{display:'flex', alignItems:'center', flexShrink:0, width:28}}>
                        <div style={{flex:1, height:1.5, background:'#cbd5e1'}}></div>
                        <svg width="10" height="10" viewBox="0 0 10 10" fill="#94a3b8"><path d="M0 4h8v2H0zm5-4l5 5-5 5V0z"/></svg>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            <p className={styles.p}>
              Les codes marqueurs (<code>F</code>, <code>S</code>, <code>R</code>, <code>FB</code>) sont personnalisables dans les param{'\u00e8'}tres de chaque bloc T{'\u00e2'}che. Vous pouvez les renommer (par exemple <code>FIXATION</code>, <code>STIM</code>, <code>RESP</code>, <code>FEED</code>) selon les conventions de votre laboratoire.
            </p>
            <div className={styles.tipBox}>
              <strong>Id{'\u00e9'}al pour :</strong> les paradigmes classiques (amor{'\u00e7'}age, Stroop, IAT, Go/No-Go, flanker, etc.) o{'\u00f9'} chaque essai suit une s{'\u00e9'}quence r{'\u00e9'}guli{'\u00e8'}re d{"'\u00e9"}tapes. MindCraft g{'\u00e8'}re tout automatiquement.
            </div>
          </div>

          {/* ── 5.4 Tâche externe en iframe ── */}
          <div className={styles.subsection}>
            <h3 className={styles.subsectionTitle}>5.4 T{'\u00e2'}che externe en iframe (marqueurs personnalis{'\u00e9'}s)</h3>
            <p className={styles.p}>
              Certaines t{'\u00e2'}ches sont trop complexes ou trop {'\u00e9'}cologiques pour {'\u00ea'}tre construites avec l{"'\u00e9"}diteur trial-based de MindCraft (par exemple : un client email r{'\u00e9'}aliste, un jeu vid{'\u00e9'}o, une simulation de r{'\u00e9'}seau social). Dans ce cas, vous h{'\u00e9'}bergez votre t{'\u00e2'}che en HTML et MindCraft l{"'"}affiche <strong>dans une iframe</strong>.
            </p>
            <p className={styles.p}>
              Le probl{'\u00e8'}me : MindCraft ne contr{'\u00f4'}le pas votre t{'\u00e2'}che, donc il ne peut pas savoir quand un stimulus appara{'\u00ee'}t ou quand le participant r{'\u00e9'}pond. C{"'"}est votre t{'\u00e2'}che qui doit <strong>envoyer ses propres marqueurs</strong> via la fonction JavaScript <code>postMessage</code>.
            </p>
            <p className={styles.p}>
              MindCraft {'\u00e9'}coute ces messages et les relaie automatiquement vers le flux LSL, exactement comme s{"'"}il les avait envoy{'\u00e9'}s lui-m{'\u00ea'}me.
            </p>

            {/* Diagramme flux postMessage */}
            <div style={{overflowX:'auto', paddingBottom:4}}>
              <div style={{display:'flex', alignItems:'center', gap:0, minWidth:580, padding:'16px 0'}}>
                {[
                  {label:'Votre t\u00e2che\n(iframe)', bg:'#BFDBFE', border:'#60A5FA', color:'#2563EB'},
                  {label:'postMessage', bg:'#f1f5f9', border:'#cbd5e1', color:'#475569'},
                  {label:'MindCraft', bg:'#A7F3D0', border:'#6EE7B7', color:'#059669'},
                  {label:'WebSocket', bg:'#f1f5f9', border:'#cbd5e1', color:'#475569'},
                  {label:'LSL Relay\n\u2192 EEG / Eye-tracker', bg:'#DDD6FE', border:'#A78BFA', color:'#4F46E5'},
                ].map((step, i, arr) => (
                  <div key={i} style={{display:'flex', alignItems:'center', flex: i === 4 ? 1.5 : 1}}>
                    <div style={{
                      flex:1,
                      background:step.bg,
                      border:`1.5px solid ${step.border}`,
                      borderRadius:8,
                      padding:'10px 6px',
                      textAlign:'center',
                      minWidth: i === 4 ? 120 : 80,
                    }}>
                      <div style={{fontSize:11, fontWeight:700, color:step.color, whiteSpace:'pre-line'}}>{step.label}</div>
                    </div>
                    {i < arr.length-1 && (
                      <div style={{display:'flex', alignItems:'center', flexShrink:0, width:24}}>
                        <div style={{flex:1, height:1.5, background:'#cbd5e1'}}></div>
                        <svg width="10" height="10" viewBox="0 0 10 10" fill="#94a3b8"><path d="M0 4h8v2H0zm5-4l5 5-5 5V0z"/></svg>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            <p className={styles.p}>
              Pour envoyer un marqueur depuis votre t{'\u00e2'}che, ajoutez cette fonction {'\u00e0'} votre code HTML :
            </p>
            <div style={{background:'#1e293b', borderRadius:8, padding:'14px 16px', marginBottom:16, overflowX:'auto'}}>
              <pre style={{margin:0, fontFamily:'monospace', fontSize:13, lineHeight:1.6, color:'#e2e8f0'}}>
{`function mc(marker, data) {
  try {
    window.parent.postMessage(
      { type: "mindcraft:marker", marker, data }, "*"
    );
  } catch {}
}`}
              </pre>
            </div>
            <p className={styles.p}>
              Ensuite, appelez <code>mc()</code> aux moments cl{'\u00e9'}s de votre t{'\u00e2'}che. Les noms de marqueurs et les donn{'\u00e9'}es sont enti{'\u00e8'}rement libres — vous les adaptez {'\u00e0'} votre paradigme :
            </p>
            <div style={{background:'#1e293b', borderRadius:8, padding:'14px 16px', marginBottom:16, overflowX:'auto'}}>
              <pre style={{margin:0, fontFamily:'monospace', fontSize:13, lineHeight:1.6, color:'#e2e8f0'}}>
{`// Quand un stimulus apparaît
mc("STIMULUS_ONSET", { trial: 5, type: "phishing", code: "EM_12" });

// Quand le participant répond
mc("RESPONSE", { trial: 5, key: "Q", rt_ms: 3200, correct: true });

// Quand la tâche est terminée (signal de fin)
window.parent.postMessage("mindcraft:complete", "*");`}
              </pre>
            </div>

            <div className={styles.tipBox}>
              <strong>Exemples d{"'"}adaptation :</strong> Pour un Stroop : <code>mc("STIMULUS", {'{'} color, word, congruent {'}'})</code>. Pour un IAT : <code>mc("TRIAL_START", {'{'} block, category {'}'})</code>. Pour une t{'\u00e2'}che de recherche visuelle : <code>mc("TARGET_ONSET", {'{'} setSize, targetPresent {'}'})</code>. Les noms et donn{'\u00e9'}es sont enti{'\u00e8'}rement libres.
            </div>
            <div className={styles.infoBox}>
              <strong>Compatibilit{'\u00e9'} :</strong> si votre t{'\u00e2'}che est utilis{'\u00e9'}e hors de MindCraft (en standalone), les appels <code>postMessage</code> sont silencieusement ignor{'\u00e9'}s par le navigateur. Aucun risque d{"'"}erreur.
            </div>
          </div>

          {/* ── 5.5 Tâche externe en redirection ── */}
          <div className={styles.subsection}>
            <h3 className={styles.subsectionTitle}>5.5 T{'\u00e2'}che externe en redirection</h3>
            <p className={styles.p}>
              En mode <strong>Redirection</strong>, le participant quitte MindCraft pour aller sur un site externe (PsyToolkit, Qualtrics, Gorilla, etc.) puis revient automatiquement. Comme la t{'\u00e2'}che s{"'"}ex{'\u00e9'}cute sur un autre site, il n{"'"}y a <strong>aucune communication possible</strong> entre la t{'\u00e2'}che et MindCraft pendant l{"'"}ex{'\u00e9'}cution.
            </p>
            <p className={styles.p}>
              Dans ce mode, MindCraft envoie uniquement deux marqueurs : <code>TASK_START</code> (au moment de la redirection) et <code>TASK_END</code> (au retour du participant). Aucun marqueur fin (stimulus, r{'\u00e9'}ponse) n{"'"}est possible.
            </p>
            <div className={styles.warnBox}>
              <strong>Limitation :</strong> Si vous avez besoin de marqueurs fins pour la synchronisation physiologique (eye-tracking, EEG), utilisez le mode <strong>iFrame</strong> plut{'\u00f4'}t que le mode Redirection. Le mode Redirection ne convient que si vous n{"'"}avez pas besoin de synchroniser les micro-{'\u00e9'}v{'\u00e9'}nements de la t{'\u00e2'}che.
            </div>
          </div>

          {/* ── 5.6 Tableau comparatif ── */}
          <div className={styles.subsection}>
            <h3 className={styles.subsectionTitle}>5.6 Tableau comparatif</h3>
            <p className={styles.p}>
              R{'\u00e9'}sum{'\u00e9'} des marqueurs disponibles selon le type de t{'\u00e2'}che :
            </p>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th></th>
                  <th>T{'\u00e2'}che interne</th>
                  <th>Externe (iframe)</th>
                  <th>Externe (redirection)</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td><strong>Marqueurs globaux</strong></td>
                  <td>Automatiques</td>
                  <td>Automatiques</td>
                  <td>TASK_START / TASK_END uniquement</td>
                </tr>
                <tr>
                  <td><strong>Marqueurs fins</strong></td>
                  <td>Automatiques (F, S, R, FB)</td>
                  <td>Envoy{'\u00e9'}s par la t{'\u00e2'}che via <code>postMessage</code></td>
                  <td>Impossible</td>
                </tr>
                <tr>
                  <td><strong>Noms des marqueurs</strong></td>
                  <td>Personnalisables dans MindCraft</td>
                  <td>Libres (d{'\u00e9'}finis par le d{'\u00e9'}veloppeur)</td>
                  <td>—</td>
                </tr>
                <tr>
                  <td><strong>Donn{'\u00e9'}es embarqu{'\u00e9'}es</strong></td>
                  <td>trial, phase, rt</td>
                  <td>Libres (n{"'"}importe quel objet JSON)</td>
                  <td>—</td>
                </tr>
                <tr>
                  <td><strong>Code n{'\u00e9'}cessaire</strong></td>
                  <td>Aucun</td>
                  <td>1 fonction + appels aux moments cl{'\u00e9'}s</td>
                  <td>Aucun</td>
                </tr>
                <tr>
                  <td><strong>Synchronisation physio</strong></td>
                  <td>Pr{'\u00e9'}cise (par essai)</td>
                  <td>Pr{'\u00e9'}cise (selon vos marqueurs)</td>
                  <td>Grossi{'\u00e8'}re (d{'\u00e9'}but/fin seulement)</td>
                </tr>
                <tr>
                  <td><strong>Id{'\u00e9'}al pour</strong></td>
                  <td>Paradigmes classiques</td>
                  <td>T{'\u00e2'}ches {'\u00e9'}cologiques complexes</td>
                  <td>Questionnaires externes</td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* ── 5.7 Horodatage automatique ── */}
          <div className={styles.subsection}>
            <h3 className={styles.subsectionTitle}>5.7 Horodatage automatique (m{'\u00ea'}me sans LSL)</h3>
            <p className={styles.p}>
              M{'\u00ea'}me si vous n{"'"}utilisez pas de marqueurs LSL, MindCraft horodate automatiquement chaque {'\u00e9'}v{'\u00e9'}nement via <code>performance.now()</code> avec une r{'\u00e9'}solution sub-milliseconde d{'\u00e8'}s que les mesures physiologiques sont activ{'\u00e9'}es. Ces timestamps apparaissent dans le CSV export{'\u00e9'} et permettent un alignement post-hoc avec vos enregistrements.
            </p>
            <div className={styles.infoBox}>
              <strong>Concr{'\u00e8'}tement :</strong> si vous enregistrez avec un {'\u00e9'}quipement qui a sa propre horloge (par exemple un eye-tracker Tobii ou un EEG BrainVision), vous pouvez utiliser les marqueurs LSL pour la synchronisation en temps r{'\u00e9'}el, OU les timestamps du CSV pour un alignement post-hoc. Les deux approches sont compatibles.
            </div>
          </div>

          {/* ── 5.8 Workflow recommandé ── */}
          <div className={styles.subsection}>
            <h3 className={styles.subsectionTitle}>5.8 Workflow recommand{'\u00e9'}</h3>
            <div className={styles.steps}>
              <div className={styles.step}>
                <div className={styles.stepNum}>1</div>
                <div className={styles.stepBody}>
                  <p className={styles.stepTitle}>Configurer l{"'"}outil physiologique</p>
                  <p className={styles.stepDesc}>Dans l{"'"}onglet {'\u00ab'}{'\u00a0'}Mesures physio{'\u00a0'}{'\u00bb'} de l{"'\u00e9"}tude, s{'\u00e9'}lectionnez votre {'\u00e9'}quipement (EEG, ECG, eye-tracking, etc.), renseignez le logiciel et la fr{'\u00e9'}quence d{"'\u00e9"}chantillonnage.</p>
                </div>
              </div>
              <div className={styles.step}>
                <div className={styles.stepNum}>2</div>
                <div className={styles.stepBody}>
                  <p className={styles.stepTitle}>Activer LSL et configurer le port</p>
                  <p className={styles.stepDesc}>Activez les marqueurs LSL et configurez le port WebSocket du relay (par d{'\u00e9'}faut : 12345). Personnalisez les codes marqueurs globaux si n{'\u00e9'}cessaire.</p>
                </div>
              </div>
              <div className={styles.step}>
                <div className={styles.stepNum}>3</div>
                <div className={styles.stepBody}>
                  <p className={styles.stepTitle}>Configurer les marqueurs fins</p>
                  <p className={styles.stepDesc}>Pour une <strong>t{'\u00e2'}che interne</strong> : personnalisez les codes (F, S, R, FB) dans les param{'\u00e8'}tres du bloc T{'\u00e2'}che. Pour une <strong>t{'\u00e2'}che externe en iframe</strong> : ajoutez la fonction <code>mc()</code> {'\u00e0'} votre code HTML et activez {'\u00ab'}{'\u00a0'}Marqueurs LSL{'\u00a0'}{'\u00bb'} dans la section Synchronisation de l{"'"}onglet T{'\u00e2'}che externe.</p>
                </div>
              </div>
              <div className={styles.step}>
                <div className={styles.stepNum}>4</div>
                <div className={styles.stepBody}>
                  <p className={styles.stepTitle}>Lancer le script relay Python</p>
                  <p className={styles.stepDesc}>Ex{'\u00e9'}cutez le script relay (<code>pip install pylsl websockets && python lsl-relay.py</code>) sur la machine du participant. Il fait le pont entre le WebSocket du navigateur et le r{'\u00e9'}seau LSL.</p>
                </div>
              </div>
              <div className={styles.step}>
                <div className={styles.stepNum}>5</div>
                <div className={styles.stepBody}>
                  <p className={styles.stepTitle}>Lancer l{"'"}enregistrement physiologique</p>
                  <p className={styles.stepDesc}>D{'\u00e9'}marrez l{"'"}enregistrement dans votre logiciel d{"'"}acquisition (BrainVision, BIOPAC, Tobii, etc.). V{'\u00e9'}rifiez que le flux LSL {'\u00ab'}{'\u00a0'}MindCraft-Markers{'\u00a0'}{'\u00bb'} est d{'\u00e9'}tect{'\u00e9'}.</p>
                </div>
              </div>
              <div className={styles.step}>
                <div className={styles.stepNum}>6</div>
                <div className={styles.stepBody}>
                  <p className={styles.stepTitle}>Le participant compl{'\u00e8'}te l{"'\u00e9"}tude</p>
                  <p className={styles.stepDesc}>Les marqueurs sont envoy{'\u00e9'}s automatiquement en temps r{'\u00e9'}el. Pour les t{'\u00e2'}ches externes en iframe, chaque appel <code>mc()</code> dans votre code est relay{'\u00e9'} vers LSL.</p>
                </div>
              </div>
              <div className={styles.step}>
                <div className={styles.stepNum}>7</div>
                <div className={styles.stepBody}>
                  <p className={styles.stepTitle}>Aligner les donn{'\u00e9'}es</p>
                  <p className={styles.stepDesc}>Utilisez les timestamps haute pr{'\u00e9'}cision dans le CSV export{'\u00e9'} et les marqueurs LSL enregistr{'\u00e9'}s pour aligner les donn{'\u00e9'}es comportementales et physiologiques.</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ── 6. DESIGN EXPÉRIMENTAL ── */}
        <section id="section-6" className={styles.section}>
          <h2 className={styles.sectionTitle}>
            <span className={styles.sectionIcon}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zM9 17H7v-7h2v7zm4 0h-2V7h2v10zm4 0h-2v-4h2v4z"/></svg>
            </span>
            6. Design expérimental
          </h2>

          <p className={styles.p}>
            L'onglet "Design" permet de configurer un plan factoriel avec contrebalancement automatique des conditions. Il regroupe également la définition de l'objectif d'échantillon et le suivi en temps réel du recrutement.
          </p>

          <div className={styles.subsection}>
            <h3 className={styles.subsectionTitle}>6.1 Organisation de l'onglet</h3>
            <p className={styles.p}>
              L'onglet est structuré en sections, de haut en bas :
            </p>
            <ul className={styles.list}>
              <li><strong>Taille d'échantillon</strong> — Saisissez l'objectif de participants prévus pour l'étude (ex : 250). Dès qu'au moins un participant a démarré l'étude, une barre de progression et les compteurs (commencé, terminé, taux de complétion) s'affichent ici.</li>
              <li><strong>Type de design</strong> — Quatre options : <em>Pas expérimental</em> (questionnaire ou étude sans manipulation), <em>Inter-sujet</em>, <em>Intra-sujet</em>, <em>Mixte</em>.</li>
              <li><strong>Facteurs et niveaux</strong> — Visible uniquement si le type est expérimental. Permet de définir les variables manipulées et leurs modalités.</li>
              <li><strong>Contrebalancement</strong> — Visible si au moins un facteur intra-sujet est défini. Choix de la méthode (carré latin, Williams, aléatoire).</li>
              <li><strong>Aperçu de la matrice</strong> — Récapitule la séquence de blocs vue par chaque participant selon son groupe.</li>
            </ul>
            <div className={styles.infoBox}>
              <strong>Études non expérimentales</strong> — Sélectionnez « Pas expérimental » pour les études sans manipulation. Vous bénéficiez quand même de l'objectif d'échantillon et du suivi de recrutement, sans avoir à définir de facteurs.
            </div>
          </div>

          <div className={styles.subsection}>
            <h3 className={styles.subsectionTitle}>6.2 Suivi du recrutement</h3>
            <p className={styles.p}>
              Le suivi est mis à jour en temps réel à mesure que les participants démarrent et terminent l'étude. Trois indicateurs sont calculés :
            </p>
            <ul className={styles.list}>
              <li><strong>Participants ayant commencé l'étude</strong> — Compte toutes les sessions allouées (lien de participation ouvert), qu'elles soient en cours, terminées ou abandonnées.</li>
              <li><strong>Participants ayant terminé l'étude</strong> — Compte uniquement les sessions allées jusqu'au bout (statut COMPLETED).</li>
              <li><strong>Taux de complétion</strong> — Rapport entre les deux : indicateur d'attrition.</li>
            </ul>
            <p className={styles.p}>
              Sur la page d'un projet, à côté du tag de statut de chaque étude, un indicateur condensé <code>n / N (%)</code> permet de voir l'avancement du recrutement en un coup d'œil sans avoir à ouvrir l'étude.
            </p>
          </div>

          <div className={styles.subsection}>
            <h3 className={styles.subsectionTitle}>6.3 Facteurs inter-sujets (between-subjects)</h3>
            <p className={styles.p}>
              Chaque participant est assigné à une seule condition. MindCraft répartit automatiquement et équitablement les participants entre les niveaux du facteur.
              Utile pour manipuler des variables comme le type de consigne, la version d'un stimulus ou le cadrage d'un message.
            </p>
          </div>

          <div className={styles.subsection}>
            <h3 className={styles.subsectionTitle}>6.4 Facteurs intra-sujets (within-subjects)</h3>
            <p className={styles.p}>
              Chaque participant passe par toutes les conditions. L'ordre de présentation est contrôlé par le contrebalancement :
            </p>
            <ul className={styles.list}>
              <li><strong>Carré latin</strong> — Chaque condition apparaît une fois à chaque position ordinale.</li>
              <li><strong>Séquence de Williams</strong> — Contrôle à la fois les effets de position et les effets de report (carry-over).</li>
              <li><strong>Aléatoire</strong> — Ordre tiré au hasard pour chaque participant.</li>
            </ul>
          </div>

          <div className={styles.subsection}>
            <h3 className={styles.subsectionTitle}>6.5 Plans mixtes et conditions</h3>
            <p className={styles.p}>
              Combinez des facteurs inter et intra-sujets. MindCraft génère automatiquement la matrice complète des conditions et assigne chaque participant à la combinaison appropriée.
              Le nombre de conditions totales est le produit des niveaux de tous les facteurs.
            </p>
          </div>

          <div className={styles.subsection}>
            <h3 className={styles.subsectionTitle}>6.6 Types de plans</h3>
            <table className={styles.table}>
              <thead>
                <tr><th>Type</th><th>Description</th><th>Contrebalancement</th></tr>
              </thead>
              <tbody>
                <tr><td><strong>Inter-sujets</strong></td><td>Chaque participant est exposé à une seule condition</td><td>Répartition aléatoire et égale entre les groupes</td></tr>
                <tr><td><strong>Intra-sujets</strong></td><td>Chaque participant passe par toutes les conditions</td><td>Carré Latin, Williams ou aléatoire</td></tr>
                <tr><td><strong>Mixte</strong></td><td>Certains facteurs sont inter, d'autres intra</td><td>Combinaison selon le type de chaque facteur</td></tr>
              </tbody>
            </table>
          </div>

          <div className={styles.subsection}>
            <h3 className={styles.subsectionTitle}>6.7 Configurer un facteur</h3>
            <div className={styles.steps}>
              <div className={styles.step}>
                <div className={styles.stepNum}>1</div>
                <div className={styles.stepBody}>
                  <p className={styles.stepTitle}>Ajouter un facteur</p>
                  <p className={styles.stepDesc}>Cliquez sur "Ajouter un facteur". Nommez-le (ex : "Type d'amorce") et choisissez son type (inter ou intra-sujets).</p>
                </div>
              </div>
              <div className={styles.step}>
                <div className={styles.stepNum}>2</div>
                <div className={styles.stepBody}>
                  <p className={styles.stepTitle}>Définir les niveaux</p>
                  <p className={styles.stepDesc}>Ajoutez les niveaux du facteur (ex : "Compatible", "Incompatible", "Neutre"). Chaque niveau reçoit un code court utilisé dans les exports.</p>
                </div>
              </div>
              <div className={styles.step}>
                <div className={styles.stepNum}>3</div>
                <div className={styles.stepBody}>
                  <p className={styles.stepTitle}>Assigner les blocs de stimuli</p>
                  <p className={styles.stepDesc}>Pour chaque niveau, sélectionnez les blocs Tâche correspondants. MindCraft présentera ces blocs aux participants assignés à ce niveau.</p>
                </div>
              </div>
            </div>
          </div>

          {/* L'ancienne sous-section 6.6 « Taille d'échantillon » a été
              fusionnée dans la nouvelle 6.1 « Organisation de l'onglet »
              et 6.2 « Suivi du recrutement ». */}
        </section>

        {/* ── 7. RANDOMISATION ── */}
        <section id="section-7" className={styles.section}>
          <h2 className={styles.sectionTitle}>
            <span className={styles.sectionIcon}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M10.59 9.17L5.41 4 4 5.41l5.17 5.17 1.42-1.41zM14.5 4l2.04 2.04L4 18.59 5.41 20 17.96 7.46 20 9.5V4h-5.5zm.33 9.41l-1.41 1.41 3.13 3.13L14.5 20H20v-5.5l-2.04 2.04-3.13-3.13z"/></svg>
            </span>
            7. Randomisation
          </h2>

          <p className={styles.p}>
            MindCraft offre deux niveaux de randomisation : au niveau des blocs (ordre de passage) et au niveau des questions (ordre d'affichage dans un bloc).
          </p>

          <div className={styles.subsection}>
            <h3 className={styles.subsectionTitle}>7.1 Randomisation inter-blocs (groupes)</h3>
            <p className={styles.p}>
              Vous pouvez assigner des blocs au <strong>même groupe de randomisation</strong> (A, B, C ou D) pour que leur ordre de passage soit permut{'\u00e9'} al{'\u00e9'}atoirement pour chaque participant. Les blocs sans groupe conservent leur position fixe.
            </p>
            <div className={styles.steps}>
              <div className={styles.step}>
                <div className={styles.stepNum}>1</div>
                <div className={styles.stepBody}>
                  <p className={styles.stepTitle}>S{'\u00e9'}lectionner un bloc</p>
                  <p className={styles.stepDesc}>Cliquez sur un bloc dans le constructeur, puis passez en mode "Configurer".</p>
                </div>
              </div>
              <div className={styles.step}>
                <div className={styles.stepNum}>2</div>
                <div className={styles.stepBody}>
                  <p className={styles.stepTitle}>Assigner un groupe</p>
                  <p className={styles.stepDesc}>Dans le s{'\u00e9'}lecteur "Groupe de randomisation", choisissez un groupe (A, B, C, D). Assignez le m{'\u00ea'}me groupe aux blocs dont vous souhaitez permuter l'ordre.</p>
                </div>
              </div>
              <div className={styles.step}>
                <div className={styles.stepNum}>3</div>
                <div className={styles.stepBody}>
                  <p className={styles.stepTitle}>V{'\u00e9'}rifier visuellement</p>
                  <p className={styles.stepDesc}>Un badge color{'\u00e9'} (ex : "{'\ud83d\udd00'} A") appara{'\u00ee'}t sur les cartes de blocs concern{'\u00e9'}s dans le canvas.</p>
                </div>
              </div>
            </div>
            <p className={styles.p}>
              <strong>Exemple :</strong> Bloc "Attitudes" et bloc "Comportements" dans le groupe A. Pour le participant 1 : Attitudes puis Comportements. Pour le participant 2 : Comportements puis Attitudes. Les blocs "Accueil" et "Fin" restent en premi{'\u00e8'}re et derni{'\u00e8'}re position.
            </p>
          </div>

          <div className={styles.subsection}>
            <h3 className={styles.subsectionTitle}>7.2 Randomisation intra-bloc (questions)</h3>
            <p className={styles.p}>
              Dans un bloc Questionnaire, vous pouvez m{'\u00e9'}langer l'ordre des questions pour chaque participant. Un syst{'\u00e8'}me d'ancrage permet de fixer certaines questions {'\u00e0'} leur position.
            </p>
            <div className={styles.steps}>
              <div className={styles.step}>
                <div className={styles.stepNum}>1</div>
                <div className={styles.stepBody}>
                  <p className={styles.stepTitle}>Activer la randomisation</p>
                  <p className={styles.stepDesc}>Dans la configuration du bloc, activez "Randomiser l'ordre des {'\u00e9'}l{'\u00e9'}ments". Toutes les questions sont alors marqu{'\u00e9'}es "{'\ud83d\udd00'} random" (fond jaune).</p>
                </div>
              </div>
              <div className={styles.step}>
                <div className={styles.stepNum}>2</div>
                <div className={styles.stepBody}>
                  <p className={styles.stepTitle}>Ancrer des questions (optionnel)</p>
                  <p className={styles.stepDesc}>Cliquez sur "{'\ud83d\udccc'} Ancrer" pour fixer une question {'\u00e0'} sa position. Elle appara{'\u00ee'}t en bleu ("{'\ud83d\udccc'} ancr{'\u00e9'}") et ne sera pas d{'\u00e9'}plac{'\u00e9'}e.</p>
                </div>
              </div>
              <div className={styles.step}>
                <div className={styles.stepNum}>3</div>
                <div className={styles.stepBody}>
                  <p className={styles.stepTitle}>R{'\u00e9'}sultat</p>
                  <p className={styles.stepDesc}>Les questions ancr{'\u00e9'}es restent {'\u00e0'} leur position fixe. Les autres sont m{'\u00e9'}lang{'\u00e9'}es entre elles dans les positions restantes.</p>
                </div>
              </div>
            </div>
            <p className={styles.p}>
              <strong>Exemple :</strong> 5 questions, Q1 ancr{'\u00e9'}e en position 1. Pour chaque participant, Q1 reste en premier, puis Q2 {'\u00e0'} Q5 apparaissent dans un ordre al{'\u00e9'}atoire.
            </p>
          </div>

          <div className={styles.subsection}>
            <h3 className={styles.subsectionTitle}>7.3 Indicateurs visuels</h3>
            <table className={styles.table}>
              <thead>
                <tr><th>Indicateur</th><th>Signification</th></tr>
              </thead>
              <tbody>
                <tr><td><strong>{'\ud83d\udd00'} A</strong> (badge jaune sur le bloc)</td><td>Ce bloc fait partie du groupe de randomisation A</td></tr>
                <tr><td><strong>{'\ud83d\udd00'} random</strong> (fond jaune, bordure gauche orange)</td><td>Cette question sera m{'\u00e9'}lang{'\u00e9'}e avec les autres questions random</td></tr>
                <tr><td><strong>{'\ud83d\udccc'} ancr{'\u00e9'}</strong> (fond bleu, bordure gauche bleue)</td><td>Cette question reste {'\u00e0'} sa position fixe</td></tr>
              </tbody>
            </table>

            <p className={styles.p} style={{ marginTop: '1em' }}>
              <strong>Aper{'\u00e7'}u visuel</strong> dans le constructeur :
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxWidth: '420px' }}>
              {/* Badge groupe A sur un bloc */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 14px', background: '#fff', border: '1px solid #e5e7eb', borderRadius: '8px' }}>
                <span style={{ fontSize: '13px', color: '#374151', flex: 1 }}>Bloc {'\u00ab'} {'\u00c9'}motions {'\u00bb'}</span>
                <span style={{ background: '#FEF3C7', color: '#92400E', fontSize: '11px', fontWeight: 600, padding: '3px 8px', borderRadius: '4px', border: '1px solid #FDE68A' }}>
                  {'\ud83d\udd00'} A
                </span>
              </div>

              {/* Question random */}
              <div style={{ padding: '10px 14px', background: '#FFFBEB', borderLeft: '3px solid #F59E0B', borderTop: '1px solid #FDE68A', borderRight: '1px solid #FDE68A', borderBottom: '1px solid #FDE68A', borderRadius: '4px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '13px', color: '#374151', flex: 1 }}>Q3 {'\u2014'} {'\u00ab'} Quelle est votre humeur ? {'\u00bb'}</span>
                <span style={{ fontSize: '11px', color: '#92400E', fontWeight: 600 }}>{'\ud83d\udd00'} random</span>
              </div>

              {/* Question ancree */}
              <div style={{ padding: '10px 14px', background: '#EFF6FF', borderLeft: '3px solid #3B82F6', borderTop: '1px solid #BFDBFE', borderRight: '1px solid #BFDBFE', borderBottom: '1px solid #BFDBFE', borderRadius: '4px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '13px', color: '#374151', flex: 1 }}>Q1 {'\u2014'} {'\u00ab'} Consentement {'\u00bb'}</span>
                <span style={{ fontSize: '11px', color: '#1E40AF', fontWeight: 600 }}>{'\ud83d\udccc'} ancr{'\u00e9'}</span>
              </div>
            </div>
          </div>
        </section>

        {/* ── 8. LOGIQUE CONDITIONNELLE ── */}
        <section id="section-8" className={styles.section}>
          <h2 className={styles.sectionTitle}>
            <span className={styles.sectionIcon}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/></svg>
            </span>
            8. Logique conditionnelle
          </h2>

          <p className={styles.p}>
            MindCraft propose deux niveaux de logique conditionnelle pour adapter le parcours du participant en fonction de ses r{'\u00e9'}ponses.
          </p>

          <h3 className={styles.subsectionTitle}>8.1 Blocs Logique (flux inter-blocs)</h3>
          <p className={styles.p}>
            Les blocs de type <strong>Logique</strong> permettent de contr{'\u00f4'}ler le flux entre les blocs de l'{'\u00e9'}tude. Ils sont {'\u00e9'}valu{'\u00e9'}s automatiquement et ne sont jamais affich{'\u00e9'}s au participant.
          </p>
          <table className={styles.table}>
            <thead>
              <tr><th>Action</th><th>Description</th></tr>
            </thead>
            <tbody>
              <tr><td><strong>Continuer</strong></td><td>Passer au bloc suivant normalement</td></tr>
              <tr><td><strong>Sauter le bloc suivant</strong></td><td>Ignorer le prochain bloc</td></tr>
              <tr><td><strong>Aller au bloc…</strong></td><td>Sauter directement {'\u00e0'} un bloc sp{'\u00e9'}cifique</td></tr>
              <tr><td><strong>Terminer l'{'\u2019'}{'\u00e9'}tude</strong></td><td>Rediriger vers le message de fin</td></tr>
            </tbody>
          </table>
          <p className={styles.p}>
            Chaque r{'\u00e8'}gle peut {'\u00ea'}tre bas{'\u00e9'}e sur la <strong>r{'\u00e9'}ponse du participant</strong> {'\u00e0'} une question pr{'\u00e9'}c{'\u00e9'}dente (code question + op{'\u00e9'}rateur + valeur) ou sur la <strong>condition exp{'\u00e9'}rimentale</strong> assign{'\u00e9'}e.
          </p>

          <div className={styles.tipBox}>
            <strong>R{'\u00e9'}organiser les r{'\u00e8'}gles par glisser-d{'\u00e9'}poser.</strong> Une poign{'\u00e9'}e <em>{'\u2bff'}</em> est affich{'\u00e9'}e {'\u00e0'} c{'\u00f4'}t{'\u00e9'} du titre de chaque r{'\u00e8'}gle. Cliquer-glisser cette poign{'\u00e9'}e pour modifier l'ordre d'{'\u00e9'}valuation. <strong>L'ordre est important</strong> : les r{'\u00e8'}gles sont {'\u00e9'}valu{'\u00e9'}es du haut vers le bas et la premi{'\u00e8'}re qui correspond est appliqu{'\u00e9'}e.
          </div>

          <div className={styles.tipBox}>
            <strong>Copier les r{'\u00e8'}gles depuis un autre bloc Logique.</strong> Si l'{'\u00e9'}tude contient d{'\u00e9'}j{'\u00e0'} un autre bloc <em>Logique</em> avec des r{'\u00e8'}gles configur{'\u00e9'}es, un bouton <em>{'\ud83d\udccb'} Copier depuis\u2026</em> s'affiche {'\u00e0'} c{'\u00f4'}t{'\u00e9'} de <em>+ Ajouter une r{'\u00e8'}gle</em>. Il ouvre un menu listant les blocs Logique disponibles ; un clic recopie toutes leurs r{'\u00e8'}gles {'\u00e0'} la fin du bloc courant (avec des identifiants neufs, pour {'\u00e9'}viter qu'une modification ult{'\u00e9'}rieure affecte les deux blocs). Pratique pour appliquer la m{'\u00ea'}me logique de filtrage {'\u00e0'} plusieurs {'\u00e9'}tapes de l'{'\u00e9'}tude.
          </div>

          <h3 className={styles.subsectionTitle}>8.2 Conditions d{'\u2019'}affichage (questions individuelles)</h3>
          <p className={styles.p}>
            Chaque question peut avoir une <strong>condition d{'\u2019'}affichage</strong> : elle ne s{'\u2019'}affichera que si la condition est remplie. Cela permet de poser des questions de suivi sans cr{'\u00e9'}er de blocs s{'\u00e9'}par{'\u00e9'}s.
          </p>
          <div className={styles.steps}>
            <div className={styles.step}>
              <div className={styles.stepNum}>1</div>
              <div className={styles.stepBody}>
                <p className={styles.stepDesc}><strong>Modifier la question</strong> concern{'\u00e9'}e dans le constructeur.</p>
              </div>
            </div>
            <div className={styles.step}>
              <div className={styles.stepNum}>2</div>
              <div className={styles.stepBody}>
                <p className={styles.stepDesc}>Activer <strong>Afficher sous condition</strong> en bas du formulaire.</p>
              </div>
            </div>
            <div className={styles.step}>
              <div className={styles.stepNum}>3</div>
              <div className={styles.stepBody}>
                <p className={styles.stepDesc}>Choisir la <strong>question source</strong> (son code), l{'\u2019'}<strong>op{'\u00e9'}rateur</strong> et la <strong>valeur attendue</strong>.</p>
              </div>
            </div>
          </div>

          <div className={styles.infoBox}>
            <strong>Important :</strong> dans le champ {'\u00ab'}{'\u00a0'}Valeur{'\u00a0'}{'\u00bb'}, indiquez le <strong>code du choix</strong> (ex{'\u00a0'}: <code>oui</code>), pas le libell{'\u00e9'} affich{'\u00e9'} au participant (ex{'\u00a0'}: {'\u00ab'}{'\u00a0'}Oui{'\u00a0'}{'\u00bb'}).
          </div>

          <table className={styles.table}>
            <thead>
              <tr><th>Op{'\u00e9'}rateur</th><th>Description</th><th>Exemple</th></tr>
            </thead>
            <tbody>
              <tr><td><strong>=</strong></td><td>{'\u00c9'}galit{'\u00e9'} exacte</td><td>Q1 = oui</td></tr>
              <tr><td><strong>{'\u2260'}</strong></td><td>Diff{'\u00e9'}rent de</td><td>Q1 {'\u2260'} non</td></tr>
              <tr><td><strong>&gt;</strong></td><td>Sup{'\u00e9'}rieur {'\u00e0'} (num{'\u00e9'}rique)</td><td>AGE &gt; 18</td></tr>
              <tr><td><strong>&lt;</strong></td><td>Inf{'\u00e9'}rieur {'\u00e0'} (num{'\u00e9'}rique)</td><td>SCORE &lt; 5</td></tr>
              <tr><td><strong>contient</strong></td><td>Contient le texte</td><td>COMM contient stress</td></tr>
              <tr><td><strong>est renseign{'\u00e9'}</strong></td><td>La question a {'\u00e9'}t{'\u00e9'} r{'\u00e9'}pondue</td><td>Q1 est renseign{'\u00e9'}</td></tr>
            </tbody>
          </table>

          <h3 className={styles.subsectionTitle}>8.3 Indicateur visuel</h3>
          <p className={styles.p}>
            Les questions ayant une condition d{'\u2019'}affichage sont signal{'\u00e9'}es dans le constructeur par un badge vert. Au survol, le d{'\u00e9'}tail de la condition appara{'\u00ee'}t.
          </p>

          <p className={styles.p} style={{ marginTop: '1em' }}>
            <strong>Aper{'\u00e7'}u visuel</strong> :
          </p>
          <div style={{ maxWidth: '420px', padding: '10px 14px', background: '#fff', border: '1px solid #e5e7eb', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '13px', color: '#374151', flex: 1 }}>Q5 {'\u2014'} {'\u00ab'} Pouvez-vous pr{'\u00e9'}ciser ? {'\u00bb'}</span>
            <span style={{ background: '#D1FAE5', color: '#065F46', fontSize: '11px', fontWeight: 600, padding: '3px 8px', borderRadius: '4px', border: '1px solid #6EE7B7' }} title="Affichee si Q1 = oui">
              {'\u26a1'} si Q1
            </span>
          </div>
        </section>

        {/* ── 9. PRÉVISUALISATION PAR BLOC ── */}
        <section id="section-9" className={styles.section}>
          <h2 className={styles.sectionTitle}>
            <span className={styles.sectionIcon}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z"/></svg>
            </span>
            9. Prévisualisation par bloc
          </h2>

          <p className={styles.p}>
            MindCraft permet de prévisualiser un bloc individuel sans lancer l'étude complète. Cette fonctionnalité est accessible directement depuis l'éditeur de blocs.
          </p>

          <div className={styles.steps}>
            <div className={styles.step}>
              <div className={styles.stepNum}>1</div>
              <div className={styles.stepBody}>
                <p className={styles.stepTitle}>
                  Repérer l{'’'}icône de prévisualisation{' '}
                  <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: '22px', height: '22px', background: '#EDE9FE', borderRadius: '4px', verticalAlign: 'middle', marginLeft: '4px' }}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="#4F46E5">
                      <path d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z" />
                    </svg>
                  </span>
                </p>
                <p className={styles.stepDesc}>
                  Dans la liste des blocs (onglet « Structure »), chaque bloc possède une icône en forme d{'’'}œil à côté de son nom.
                </p>
              </div>
            </div>
            <div className={styles.step}>
              <div className={styles.stepNum}>2</div>
              <div className={styles.stepBody}>
                <p className={styles.stepTitle}>
                  Cliquer sur l{'’'}icône{' '}
                  <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: '22px', height: '22px', background: '#EDE9FE', borderRadius: '4px', verticalAlign: 'middle', marginLeft: '4px' }}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="#4F46E5">
                      <path d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z" />
                    </svg>
                  </span>
                </p>
                <p className={styles.stepDesc}>
                  Un nouvel onglet s{'’'}ouvre avec la prévisualisation du bloc sélectionné uniquement, sans les autres blocs de l{'’'}étude.
                </p>
              </div>
            </div>
            <div className={styles.step}>
              <div className={styles.stepNum}>3</div>
              <div className={styles.stepBody}>
                <p className={styles.stepTitle}>Tester et ajuster</p>
                <p className={styles.stepDesc}>
                  Interagissez avec le bloc comme le ferait un participant. Fermez l{'’'}onglet pour revenir à l{'’'}éditeur et ajuster la configuration si nécessaire.
                </p>
              </div>
            </div>
          </div>

          <div className={styles.tipBox}>
            <strong>Astuce :</strong> Utilisez la prévisualisation par bloc pour tester rapidement les modifications sur un questionnaire ou une tâche sans parcourir l'étude entière.
          </div>
        </section>

        {/* ── 10. COLLECTE ET RECRUTEMENT ── */}
        <section id="section-10" className={styles.section}>
          <h2 className={styles.sectionTitle}>
            <span className={styles.sectionIcon}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M18 16.08c-.76 0-1.44.3-1.96.77L8.91 12.7c.05-.23.09-.46.09-.7s-.04-.47-.09-.7l7.05-4.11c.54.5 1.25.81 2.04.81 1.66 0 3-1.34 3-3s-1.34-3-3-3-3 1.34-3 3c0 .24.04.47.09.7L8.04 9.81C7.5 9.31 6.79 9 6 9c-1.66 0-3 1.34-3 3s1.34 3 3 3c.79 0 1.5-.31 2.04-.81l7.12 4.16c-.05.21-.08.43-.08.65 0 1.61 1.31 2.92 2.92 2.92s2.92-1.31 2.92-2.92-1.31-2.92-2.92-2.92z"/></svg>
            </span>
            10. Collecte et recrutement
          </h2>

          <div className={styles.subsection}>
            <h3 className={styles.subsectionTitle}>9.1 Cycle de vie d'une étude</h3>
            <table className={styles.table}>
              <thead>
                <tr><th>Statut</th><th>Description</th><th>Participants peuvent accéder</th></tr>
              </thead>
              <tbody>
                <tr><td><strong>Brouillon</strong></td><td>En cours de construction</td><td>Non</td></tr>
                <tr><td><strong>En révision</strong></td><td>En attente de validation</td><td>Non</td></tr>
                <tr><td><strong>Validée</strong></td><td>Approuvée, prête à diffuser</td><td>Non</td></tr>
                <tr><td><strong>En collecte</strong></td><td>Ouverte aux participants</td><td><strong>Oui</strong></td></tr>
                <tr><td><strong>Archivée</strong></td><td>Collecte terminée</td><td>Non</td></tr>
              </tbody>
            </table>

            <div className={styles.tipBox}>
              <strong>Tester sans polluer vos données.</strong> Deux options selon ce que vous souhaitez tester :
              <ul style={{ marginTop: 6, marginBottom: 6 }}>
                <li>
                  Pour parcourir l'étude <em>sans</em> enregistrer la moindre donnée, utilisez le bouton <em>Prévisualiser</em> en haut de la page de l'étude (ou la prévisualisation par bloc — voir section 9). Le mode <code>?preview=1</code> exécute l'étude sans aucune écriture en base.
                </li>
                <li>
                  Pour tester via le <em>vrai</em> lien de participation (statut <em>En collecte</em> requis), les sessions de test seront enregistrées comme de vraies sessions. Pour les supprimer avant la vraie collecte, utilisez le bouton <em>🧹 Réinitialiser les données</em> présent en haut de la page de l'étude et en bas de l'onglet <em>Export</em>. Cette action supprime toutes les sessions et leurs réponses ; la structure de l'étude (blocs, questions, design) est conservée.
                </li>
              </ul>
              Le bouton de réinitialisation reste accessible dans tous les statuts (y compris <em>En collecte</em> et <em>Archivée</em>, pour répondre à une demande RGPD de droit à l'effacement) ; dans ces deux statuts, une confirmation renforcée est demandée (saisir le nom exact de l'étude).
            </div>
          </div>

          <div className={styles.subsection}>
            <h3 className={styles.subsectionTitle}>9.2 Comparaison des plateformes de recrutement</h3>
            <p className={styles.p}>
              MindCraft s'intègre avec les principales plateformes de crowdsourcing. Le tableau ci-dessous résume les différences clés et la méthode de complétion recommandée pour chaque plateforme.
            </p>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Plateforme</th>
                  <th>Paramètres URL à passer</th>
                  <th>Méthode de complétion</th>
                  <th>Public typique</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td><strong>Prolific</strong></td>
                  <td><code>PROLIFIC_PID</code></td>
                  <td>Redirection vers l'URL de complétion Prolific</td>
                  <td>Chercheurs (Europe / US)</td>
                </tr>
                <tr>
                  <td><strong>Amazon MTurk</strong></td>
                  <td><code>workerId</code>, <code>assignmentId</code>, <code>hitId</code></td>
                  <td>Code de complétion à saisir dans le HIT</td>
                  <td>Turkers (US majoritaire)</td>
                </tr>
                <tr>
                  <td><strong>Foule Factory</strong></td>
                  <td>Token de session (paramètre configuré)</td>
                  <td>Code de complétion affiché sur le debriefing</td>
                  <td>Panels francophones</td>
                </tr>
                <tr>
                  <td><strong>Recrutement direct</strong></td>
                  <td>Aucun (optionnel : <code>ref</code> pour tracking)</td>
                  <td>Page de fin personnalisée, redirection libre</td>
                  <td>Étudiants, réseaux sociaux</td>
                </tr>
              </tbody>
            </table>
          </div>

          <div className={styles.subsection}>
            <h3 className={styles.subsectionTitle}>9.3 Intégration Prolific</h3>
            <p className={styles.p}>
              Prolific identifie chaque participant via le paramètre <code>PROLIFIC_PID</code> passé dans l'URL. La complétion se fait par redirection automatique.
            </p>
            <div className={styles.infoBox} style={{marginBottom:12}}>
              <strong>URL à configurer dans Prolific :</strong><br/>
              <code style={{display:'block',marginTop:4,fontSize:12,wordBreak:'break-all'}}>
                {'https://app.mindcraft.io/run/[studyId]?PROLIFIC_PID={{%PROLIFIC_PID%}}'}
              </code>
            </div>
            <div className={styles.steps}>
              <div className={styles.step}>
                <div className={styles.stepNum}>1</div>
                <div className={styles.stepBody}>
                  <p className={styles.stepTitle}>Créer l'étude sur Prolific</p>
                  <p className={styles.stepDesc}>Dans Prolific, créez une nouvelle étude, choisissez "I'll redirect participants" et collez l'URL ci-dessus dans le champ "Study URL".</p>
                </div>
              </div>
              <div className={styles.step}>
                <div className={styles.stepNum}>2</div>
                <div className={styles.stepBody}>
                  <p className={styles.stepTitle}>Configurer la redirection de fin</p>
                  <p className={styles.stepDesc}>Dans votre bloc Debriefing sur MindCraft, entrez l'URL de complétion Prolific (ex : <code>https://app.prolific.com/submissions/complete?cc=XXXXXXXX</code>) dans le champ "URL de redirection".</p>
                </div>
              </div>
              <div className={styles.step}>
                <div className={styles.stepNum}>3</div>
                <div className={styles.stepBody}>
                  <p className={styles.stepTitle}>Tester le flux</p>
                  <p className={styles.stepDesc}>Utilisez la fonction "Prévisualiser" (bouton en haut du builder) pour tester le parcours complet avant de lancer la collecte.</p>
                </div>
              </div>
            </div>
          </div>

          <div className={styles.subsection}>
            <h3 className={styles.subsectionTitle}>9.4 Intégration Amazon Mechanical Turk (MTurk)</h3>
            <p className={styles.p}>
              MTurk passe trois paramètres dans l'URL : <code>workerId</code>, <code>assignmentId</code> et <code>hitId</code>. La complétion se fait via un <strong>code de complétion</strong> que le participant doit saisir dans le HIT.
            </p>
            <div className={styles.infoBox} style={{marginBottom:12}}>
              <strong>URL à configurer dans votre HIT MTurk :</strong><br/>
              <code style={{display:'block',marginTop:4,fontSize:12,wordBreak:'break-all'}}>
                {'https://app.mindcraft.io/run/[studyId]?workerId=${workerId}&assignmentId=${assignmentId}&hitId=${hitId}'}
              </code>
            </div>
            <div className={styles.steps}>
              <div className={styles.step}>
                <div className={styles.stepNum}>1</div>
                <div className={styles.stepBody}>
                  <p className={styles.stepTitle}>Créer le HIT sur MTurk</p>
                  <p className={styles.stepDesc}>Dans Requester UI, créez un HIT de type "Survey Link". Collez l'URL ci-dessus. MTurk remplacera automatiquement les variables au moment de la distribution.</p>
                </div>
              </div>
              <div className={styles.step}>
                <div className={styles.stepNum}>2</div>
                <div className={styles.stepBody}>
                  <p className={styles.stepTitle}>Activer le code de complétion dans MindCraft</p>
                  <p className={styles.stepDesc}>Dans les paramètres de l'étude (onglet "Publier"), activez "Afficher un code de complétion". MindCraft génère un code unique par participant, affiché sur la page de debriefing.</p>
                </div>
              </div>
              <div className={styles.step}>
                <div className={styles.stepNum}>3</div>
                <div className={styles.stepBody}>
                  <p className={styles.stepTitle}>Vérification et approbation</p>
                  <p className={styles.stepDesc}>Les participants saisissent le code dans le HIT. Exportez vos données MindCraft en CSV, vérifiez les <code>assignmentId</code> et approuvez les soumissions dans MTurk.</p>
                </div>
              </div>
            </div>
            <div className={styles.warnBox}>
              <strong>Attention :</strong> MTurk ne redirige pas automatiquement les participants à la fin de la tâche. Assurez-vous que le message de debriefing MindCraft indique clairement au participant de retourner sur MTurk pour saisir son code.
            </div>
          </div>

          <div className={styles.subsection}>
            <h3 className={styles.subsectionTitle}>9.5 Intégration Foule Factory</h3>
            <p className={styles.p}>
              Foule Factory est un panel francophone (France / Belgique). L'intégration repose sur un token de session et un code de complétion.
            </p>
            <div className={styles.infoBox} style={{marginBottom:12}}>
              <strong>URL à configurer dans Foule Factory :</strong><br/>
              <code style={{display:'block',marginTop:4,fontSize:12,wordBreak:'break-all'}}>
                {'https://app.mindcraft.io/run/[studyId]?ff_uid=[TOKEN_FOURNI_PAR_FOULE_FACTORY]'}
              </code>
            </div>
            <div className={styles.steps}>
              <div className={styles.step}>
                <div className={styles.stepNum}>1</div>
                <div className={styles.stepBody}>
                  <p className={styles.stepTitle}>Créer la mission sur Foule Factory</p>
                  <p className={styles.stepDesc}>Dans l'interface Foule Factory, créez une tâche de type "Sondage externe". Renseignez l'URL MindCraft en incluant le paramètre de token indiqué par la plateforme.</p>
                </div>
              </div>
              <div className={styles.step}>
                <div className={styles.stepNum}>2</div>
                <div className={styles.stepBody}>
                  <p className={styles.stepTitle}>Activer le code de complétion</p>
                  <p className={styles.stepDesc}>Activez "Afficher un code de complétion" dans MindCraft. Le participant le reporte sur Foule Factory pour valider sa participation et déclencher sa rémunération.</p>
                </div>
              </div>
            </div>
          </div>

          <div className={styles.subsection}>
            <h3 className={styles.subsectionTitle}>9.6 Recrutement direct</h3>
            <p className={styles.p}>
              Pour le recrutement par email, réseaux sociaux ou SONA (crédit-cours), utilisez l'URL standard de l'étude. Vous pouvez ajouter un paramètre <code>ref</code> pour distinguer les sources de recrutement dans l'export.
            </p>
            <div className={styles.infoBox}>
              <strong>Exemples d'URLs :</strong>
              <ul style={{margin:'6px 0 0 0', paddingLeft:18, fontSize:13, lineHeight:1.8}}>
                <li>Email : <code>https://app.mindcraft.io/run/[studyId]?ref=email</code></li>
                <li>Twitter/X : <code>https://app.mindcraft.io/run/[studyId]?ref=twitter</code></li>
                <li>SONA : <code>https://app.mindcraft.io/run/[studyId]?ref=sona&sona_id=%SURVEY_CODE%</code></li>
              </ul>
            </div>
            <p className={styles.p}>
              La valeur du paramètre <code>ref</code> est enregistrée dans la colonne <code>source</code> du fichier CSV export. La page de debriefing peut être personnalisée avec un message différent selon la source (via le bloc Logique).
            </p>
          </div>
        </section>

        {/* ── 11. EXPORT DE DONNÉES ── */}
        <section id="section-11" className={styles.section}>
          <h2 className={styles.sectionTitle}>
            <span className={styles.sectionIcon}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M19 9h-4V3H9v6H5l7 7 7-7zM5 18v2h14v-2H5z"/></svg>
            </span>
            11. Export des données
          </h2>

          <p className={styles.p}>
            Les données collectées sont accessibles depuis l'onglet "Export" du builder. Sept formats sont proposés, couvrant à la fois les <strong>données collectées</strong> et la <strong>structure de l'étude</strong> (data portability).
          </p>

          <table className={styles.table}>
            <thead>
              <tr><th>Format</th><th>Contenu</th><th>Compatible avec</th></tr>
            </thead>
            <tbody>
              <tr>
                <td><strong>CSV — Questionnaires</strong></td>
                <td>Format <em>wide</em> : un participant par ligne, une colonne par question. Inclut les conditions expérimentales.</td>
                <td>Excel, R, Python (pandas), SPSS, jamovi</td>
              </tr>
              <tr>
                <td><strong>CSV — Temps de réaction</strong></td>
                <td>Un essai par ligne : stimulus, touche, TR (ms), correct, <strong>phase</strong> (TRAINING / TEST), nom de phase. Inclut les conditions. La colonne <code>phase</code> permet de filtrer ou exclure les essais d'entraînement (par exemple pour identifier des participants n'ayant pas compris la consigne).</td>
                <td>R, Python, SPSS pour calculs de D-scores, d', RT moyens</td>
              </tr>
              <tr>
                <td><strong>CSV — Tâches externes</strong></td>
                <td>Résultats des tâches externes embarquées : un essai par ligne avec toutes les colonnes spécifiques de la tâche.</td>
                <td>R, Python, Excel</td>
              </tr>
              <tr>
                <td><strong>Excel (.xlsx)</strong></td>
                <td>Classeur complet avec onglets : Sessions, Questionnaires, RT stimulus, Tâches externes. Format Microsoft.</td>
                <td>Microsoft Excel, LibreOffice Calc</td>
              </tr>
              <tr>
                <td><strong>Tableur ouvert (.ods)</strong></td>
                <td>Mêmes données qu'Excel, au format ouvert OpenDocument (ISO 26300). À privilégier pour l'archivage et la science ouverte.</td>
                <td>LibreOffice Calc, OnlyOffice, Excel récent, Google Sheets</td>
              </tr>
              <tr>
                <td><strong>Codebook (PDF)</strong></td>
                <td>Dictionnaire de toutes les variables : codes, libellés, types, modalités, design expérimental.</td>
                <td>Documentation de l'étude, dépôt open data</td>
              </tr>
              <tr>
                <td><strong>Structure JSON</strong></td>
                <td>Sauvegarde complète du design (blocs, questions, séquences, métadonnées Open Science). <strong>Aucune donnée participant</strong>. Réimportable sur une autre instance MindCraft.</td>
                <td>Archivage, migration, partage de protocole, OSF / Zenodo</td>
              </tr>
            </tbody>
          </table>

          <div className={styles.subsection}>
            <h3 className={styles.subsectionTitle}>Structure du fichier CSV</h3>
            <table className={styles.table}>
              <thead>
                <tr><th>Colonne</th><th>Description</th><th>Exemple</th></tr>
              </thead>
              <tbody>
                <tr><td><code>participantId</code></td><td>Identifiant anonyme du participant</td><td>cm3abc123... ou ID Prolific / workerId MTurk</td></tr>
                <tr><td><code>studyId</code></td><td>Identifiant de l'étude</td><td>cm3xyz789...</td></tr>
                <tr><td><code>blockId</code></td><td>Identifiant du bloc questionnaire</td><td>cm3def456...</td></tr>
                <tr><td><code>questionCode</code></td><td>Code de la question (défini dans l'éditeur)</td><td>Q1, STAI_1, AGE</td></tr>
                <tr><td><code>value</code></td><td>Réponse du participant</td><td>3, "Très d'accord", ["A","C"]</td></tr>
                <tr><td><code>source</code></td><td>Source de recrutement (paramètre ref)</td><td>prolific, mturk, email</td></tr>
                <tr><td><code>createdAt</code></td><td>Horodatage de la réponse</td><td>2026-04-05T14:32:11Z</td></tr>
                <tr><td><code>startedAt</code></td><td>Horodatage du démarrage de l'étude par le participant</td><td>2026-04-05T14:20:03Z</td></tr>
                <tr><td><code>completedAt</code></td><td>Horodatage de la complétion (vide si abandonnée)</td><td>2026-04-05T14:38:47Z</td></tr>
                <tr><td><code>duration_sec</code></td><td>Durée totale de la session en secondes (vide si abandonnée)</td><td>1124</td></tr>
              </tbody>
            </table>
            <div className={styles.tipBox}>
              <strong>Temps passé par page (optionnel) :</strong> dans l'onglet Export, une case <em>« Inclure le temps par page »</em> ajoute des colonnes <code>page_1_sec</code>, <code>page_2_sec</code>, etc. avec la durée passée sur chaque page de l'étude. Utile pour repérer les abandons silencieux, les participants qui « speed-runnent », ou pour calculer un temps médian de complétion par section.
            </div>

            <div className={styles.tipBox}>
              <strong>Ordre de présentation des blocs (effets d'ordre) :</strong> quand des blocs voient leur ordre <em>varier d'un·e participant·e à l'autre</em> — blocs en groupe de randomisation, ou blocs rattachés à un facteur <em>intra-sujet</em> (within, contrebalancé) — l'export ajoute automatiquement :
              <ul style={{ marginTop: 6, marginBottom: 6 }}>
                <li><code>ordre_blocs</code> : la séquence vue par le·la participant·e, sous forme lisible (ex&nbsp;: <code>Robot AMR &gt; Quadrupède &gt; Bras</code>).</li>
                <li><code>pos_&lt;nom_du_bloc&gt;</code> : une colonne par bloc concerné, donnant sa <strong>position</strong> (1, 2, 3…) dans le parcours. Directement utilisable comme covariable pour tester un effet d'ordre dans R, SPSS, jamovi, etc.</li>
              </ul>
              Les blocs rattachés à un facteur <em>inter-sujets</em> (between) ne génèrent pas de colonne de position&nbsp;: l'information pertinente y est «&nbsp;quelle condition&nbsp;», déjà fournie par les colonnes <code>condition_&lt;facteur&gt;</code>. Pour un bloc non présenté à un·e participant·e (condition non assignée), la colonne de position reste vide.
            </div>
          </div>

          <div className={styles.subsection}>
            <h3 className={styles.subsectionTitle}>CSV / Excel Questionnaire</h3>
            <p className={styles.p}>
              Format <em>wide</em>{'\u00a0'}: une ligne par participant, une colonne par question. Les questions de type <strong>Matrice</strong>, <strong>Diff{'\u00e9'}rentiel s{'\u00e9'}mantique</strong> et <strong>Side-by-side</strong> sont automatiquement {'\u00e9'}clat{'\u00e9'}es en colonnes individuelles par item (ex{'\u00a0'}: <code>BFI_item1</code>, <code>BFI_item2</code>).
            </p>
            <div className={styles.infoBox}>
              <strong>Items invers{'\u00e9'}s :</strong> les items marqu{'\u00e9'}s {'\u00ab'}{'\u00a0'}Invers{'\u00e9'} (R){'\u00a0'}{'\u00bb'} dans la matrice donnent lieu {'\u00e0'} <strong>deux colonnes</strong> dans l'export :
              <ul style={{ marginTop: 6, marginBottom: 0 }}>
                <li><code>BFI_item3</code> : la <strong>valeur brute</strong> (telle que cliqu{'\u00e9'}e par le participant)</li>
                <li><code>BFI_item3_R</code> : la <strong>valeur recod{'\u00e9'}e</strong> (1{'\u2194'}5, 2{'\u2194'}4, 3=3, etc. selon l'{'\u00e9'}chelle)</li>
              </ul>
              Cela permet de v{'\u00e9'}rifier la donn{'\u00e9'}e brute tout en utilisant directement la valeur recod{'\u00e9'}e dans les analyses, sans avoir {'\u00e0'} la calculer manuellement.
            </div>
          </div>

          <div className={styles.subsection}>
            <h3 className={styles.subsectionTitle}>CSV Essais (tâche comportementale)</h3>
            <p className={styles.p}>
              Exporte les données des blocs de type Tâche. Une ligne par essai, avec les colonnes : participantId, blockId, trialIndex, phase, stimulusCategory, stimulusFile, responseKey, correct, rt (temps de réaction en ms), createdAt.
              Ce format est directement exploitable pour le calcul de D-scores (IAT), d' (détection de signal) ou d'autres métriques comportementales.
            </p>
          </div>

          <div className={styles.subsection}>
            <h3 className={styles.subsectionTitle}>Codebook PDF</h3>
            <p className={styles.p}>
              Le codebook est un document PDF généré automatiquement qui décrit chaque variable de l'étude : code de la question, libellé, type, modalités de réponse et valeurs possibles.
              Ce document est utile pour accompagner un dépôt de données ouvertes (OSF, Zenodo) ou pour la documentation interne du projet.
            </p>
          </div>

          <div className={styles.subsection}>
            <h3 className={styles.subsectionTitle}>Structure JSON (data portability)</h3>
            <p className={styles.p}>
              L'export JSON sauvegarde la <strong>structure complète</strong> de votre étude : tous les blocs (welcome, instruction, question, stimulus, logique, debriefing), les questions avec leurs options et conditions, les séquences d'essais expérimentaux, le design factoriel, et les métadonnées Open Science. <strong>Aucune donnée participant</strong> n'est incluse — c'est uniquement le « plan » de l'étude.
            </p>
            <p className={styles.p}>
              Ce format permet trois usages clés :
            </p>
            <ul className={styles.list}>
              <li><strong>Archivage scientifique</strong> — joindre le JSON au dépôt OSF / Zenodo de votre projet pour que toute personne puisse reconstituer l'étude exactement comme vous l'avez conçue.</li>
              <li><strong>Migration</strong> — réimporter l'étude sur une autre instance de MindCraft (instance locale, université, fork de la plateforme), sans avoir à tout reconstruire à la main.</li>
              <li><strong>Partage de protocole</strong> — envoyer un fichier JSON à un collaborateur ou un reviewer, plus précis qu'une description textuelle.</li>
            </ul>
            <div className={styles.tipBox}>
              <strong>Reproductibilité :</strong> le JSON est versionné (champ <code>schemaVersion</code>) et documenté dans le dépôt source du projet (<code>docs/json-export-format.md</code>). Un exemple complet est fourni dans <code>examples/</code>.
            </div>
          </div>

          <div className={styles.subsection}>
            <h3 className={styles.subsectionTitle}>Citer MindCraft après l'export</h3>
            <p className={styles.p}>
              En bas de l'onglet Export, un <strong>bandeau « Pensez à citer MindCraft »</strong> rappelle qu'il convient de citer la plateforme dans toute publication, mémoire ou rapport exploitant les données collectées. Le bouton « Obtenir la citation » ouvre une fenêtre proposant trois formats : <strong>APA</strong> (texte courant), <strong>BibTeX</strong> (LaTeX), <strong>RIS</strong> (Zotero / EndNote / Mendeley). Voir la section 14 ci-dessous pour le détail.
            </p>
          </div>
        </section>

        {/* ── 12. OPEN SCIENCE ── */}
        <section id="section-12" className={styles.section}>
          <h2 className={styles.sectionTitle}>
            <span className={styles.sectionIcon}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 14.5v-9l6 4.5-6 4.5z"/></svg>
            </span>
            12. Open Science
          </h2>

          <p className={styles.p}>
            L'onglet "Open Science" de chaque étude permet de documenter les métadonnées nécessaires à la transparence et à la reproductibilité scientifique.
          </p>

          <table className={styles.table}>
            <thead>
              <tr><th>Champ</th><th>Description</th><th>Exemple</th></tr>
            </thead>
            <tbody>
              <tr><td><strong>Titre du projet</strong></td><td>Nom du projet de recherche global</td><td>Attitudes implicites et comportement prosocial</td></tr>
              <tr><td><strong>Description du projet</strong></td><td>Résumé du projet</td><td>Série d'études sur les biais implicites...</td></tr>
              <tr><td><strong>DOI du projet</strong></td><td>Identifiant numérique du projet sur OSF ou similaire</td><td>https://doi.org/10.17605/osf.io/abc12</td></tr>
              <tr><td><strong>Titre de l'étude</strong></td><td>Nom de cette étude spécifique</td><td>Étude 1 — IAT race</td></tr>
              <tr><td><strong>Description de l'étude</strong></td><td>Résumé de l'étude</td><td>Test d'Association Implicite mesurant...</td></tr>
              <tr><td><strong>Préenregistrement</strong></td><td>Lien vers le préenregistrement (OSF, AsPredicted)</td><td>https://osf.io/xyz123</td></tr>
              <tr><td><strong>Matériel en ligne</strong></td><td>Lien vers le matériel partagé (OSF, GitHub)</td><td>https://github.com/user/repo</td></tr>
              <tr><td><strong>Données en ligne</strong></td><td>Lien vers les données déposées (OSF, Zenodo)</td><td>https://zenodo.org/record/123456</td></tr>
              <tr><td><strong>Mots-clés</strong></td><td>Tags pour l'indexation</td><td>biais implicite, IAT, amorçage</td></tr>
            </tbody>
          </table>

          <div className={styles.tipBox}>
            <strong>Bonne pratique :</strong> Renseignez ces métadonnées avant de lancer la collecte. Le préenregistrement (OSF ou AsPredicted) est une pratique fortement recommandée en psychologie expérimentale pour distinguer les analyses confirmatoires des exploratoires.
          </div>
        </section>

        {/* ── 13. COLLABORATION ── */}
        <section id="section-13" className={styles.section}>
          <h2 className={styles.sectionTitle}>
            <span className={styles.sectionIcon}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z"/></svg>
            </span>
            13. Collaboration
          </h2>

          <p className={styles.p}>
            Chaque projet peut être partagé avec des collaborateurs. Trois rôles sont disponibles :
          </p>

          <table className={styles.table}>
            <thead>
              <tr><th>Rôle</th><th>Droits</th></tr>
            </thead>
            <tbody>
              <tr><td><strong>Propriétaire</strong></td><td>Tous les droits : modifier, supprimer le projet, inviter/retirer des collaborateurs</td></tr>
              <tr><td><strong>Éditeur</strong></td><td>Créer et modifier des études, configurer les blocs</td></tr>
              <tr><td><strong>Lecteur</strong></td><td>Consulter les études et les données uniquement</td></tr>
            </tbody>
          </table>

          <div className={styles.steps}>
            <div className={styles.step}>
              <div className={styles.stepNum}>1</div>
              <div className={styles.stepBody}>
                <p className={styles.stepTitle}>Inviter un collaborateur</p>
                <p className={styles.stepDesc}>Depuis la page du projet, cliquez sur « Inviter » dans la section Équipe. Entrez l'email et le rôle. L'invitation est valable 48h. <strong>La personne invitée n'a pas besoin d'avoir déjà un compte MindCraft</strong> : si l'email ne correspond à aucun compte, elle pourra en créer un depuis le lien d'invitation.</p>
              </div>
            </div>
            <div className={styles.step}>
              <div className={styles.stepNum}>2</div>
              <div className={styles.stepBody}>
                <p className={styles.stepTitle}>Accepter une invitation</p>
                <p className={styles.stepDesc}>Le collaborateur reçoit un lien par email. La page d'invitation s'adapte automatiquement :</p>
                <ul className={styles.list}>
                  <li><strong>Si la personne a déjà un compte</strong> mais n'est pas connectée → bouton « Se connecter pour accepter ».</li>
                  <li><strong>Si la personne n'a pas de compte</strong> → bouton « Créer un compte » (email pré-rempli) ou « J'ai déjà un compte ».</li>
                  <li><strong>Si la personne est connectée avec la bonne adresse</strong> → boutons « Accepter » et « Refuser ».</li>
                </ul>
              </div>
            </div>
          </div>
        </section>

        {/* ── 14. CITER MINDCRAFT ── */}
        <section id="section-14" className={styles.section}>
          <h2 className={styles.sectionTitle}>
            <span className={styles.sectionIcon}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M14 17H4v-2h10v2zm6-4H4v-2h16v2zm0-4H4V7h16v2zM6 19h12v2H6v-2z"/></svg>
            </span>
            14. Citer MindCraft
          </h2>

          <p className={styles.p}>
            Si MindCraft a contribué à vos travaux de recherche, d'enseignement ou de pratique, merci de citer la plateforme. La citation est essentielle pour la <strong>reconnaissance scientifique</strong> du logiciel libre, et elle aide à pérenniser le projet auprès des financeurs académiques.
          </p>

          <div className={styles.subsection}>
            <h3 className={styles.subsectionTitle}>Identifiants pérennes</h3>
            <p className={styles.p}>
              Chaque version publiée de MindCraft est associée à plusieurs identifiants permanents, indépendants de l'URL d'hébergement actuel :
            </p>
            <table className={styles.table}>
              <thead>
                <tr><th>Type</th><th>Valeur</th><th>Usage</th></tr>
              </thead>
              <tbody>
                <tr>
                  <td><strong>DOI Zenodo</strong></td>
                  <td><code>10.5281/zenodo.19864887</code></td>
                  <td>Identifiant standard pour la citation académique. Frappé à chaque release.</td>
                </tr>
                <tr>
                  <td><strong>SWHID Software Heritage</strong></td>
                  <td><code>swh:1:rev:df8a8b127…</code></td>
                  <td>Archive pérenne du code source. Garantit la reproductibilité même si GitHub disparaît.</td>
                </tr>
                <tr>
                  <td><strong>ORCID auteure</strong></td>
                  <td><code>0000-0002-4315-1058</code></td>
                  <td>Identifiant chercheur de l'auteure principale (Dayle DAVID).</td>
                </tr>
                <tr>
                  <td><strong>Dépôt source</strong></td>
                  <td><code>github.com/mindcraft-research/mindcraft</code></td>
                  <td>Code source ouvert sous licence AGPL-3.0-or-later.</td>
                </tr>
              </tbody>
            </table>
          </div>

          <div className={styles.subsection}>
            <h3 className={styles.subsectionTitle}>Bouton de citation automatique</h3>
            <p className={styles.p}>
              Deux points d'accès dans l'application proposent un bouton <em>Citer cette plateforme</em> qui ouvre une fenêtre avec trois formats prêts à coller :
            </p>
            <ul className={styles.list}>
              <li>
                <strong>Page « À propos »</strong>, section « Citer MindCraft » — citation APA en clair (avec titre en italique) accompagnée du bouton pour obtenir aussi BibTeX et RIS.
              </li>
              <li>
                <strong>Onglet « Export »</strong> de chaque étude — bandeau de rappel « Pensez à citer MindCraft » avec le bouton de citation, affiché juste après la grille des exports de données.
              </li>
            </ul>
            <p className={styles.p}>
              Les trois formats disponibles dans la fenêtre :
            </p>
            <ul className={styles.list}>
              <li><strong>APA</strong> (7e édition) — pour articles, mémoires et thèses en sciences humaines.</li>
              <li><strong>BibTeX</strong> — pour LaTeX (entrée <code>@software</code> avec author, version, doi, url, orcid, license).</li>
              <li><strong>RIS</strong> — pour Zotero, EndNote et Mendeley (type <code>COMP</code> = computer program).</li>
            </ul>
            <p className={styles.p}>
              Chaque format inclut automatiquement la <strong>version actuelle</strong>, le <strong>DOI Zenodo</strong>, le <strong>SWHID</strong> et l'<strong>URL du dépôt</strong>. À chaque nouvelle release de MindCraft, ces valeurs sont mises à jour.
            </p>
          </div>

          <div className={styles.subsection}>
            <h3 className={styles.subsectionTitle}>Quand citer la plateforme ?</h3>
            <ul className={styles.list}>
              <li>Dans la section <em>Méthode</em> ou <em>Matériel</em> de tout article publié à partir de données collectées via MindCraft</li>
              <li>Dans les annexes ou le matériel supplémentaire d'un mémoire ou d'une thèse</li>
              <li>Dans le README d'un dépôt OSF / Zenodo / GitHub où vous partagez les données ou le protocole</li>
              <li>Dans tout rapport, présentation ou poster scientifique exploitant les fonctionnalités de la plateforme</li>
            </ul>
          </div>

          <div className={styles.tipBox}>
            <strong>Bonne pratique Open Science :</strong> citer un logiciel de recherche revient à reconnaître le travail scientifique et technique qui le sous-tend, exactement comme on cite un article ou un livre. Les principes <strong>FAIR</strong> (Findable, Accessible, Interoperable, Reusable) recommandent d'utiliser les identifiants pérennes (DOI, SWHID) plutôt que les URL volatiles.
          </div>
        </section>

      </div>
    </StaticLayout>
  )
}
