import StaticLayout from '../components/StaticLayout'
import styles from './static.module.css'

export default function DocsPage() {

  const handleDownloadPDF = async () => {
    const html2pdf = (await import('html2pdf.js')).default
    const element = document.getElementById('docs-content')
    html2pdf().set({
      margin: [15, 15, 15, 15],
      filename: 'MindCraft-Guide-Utilisateur.pdf',
      image: { type: 'jpeg', quality: 0.95 },
      html2canvas: { scale: 2, useCORS: true },
      jsPDF: { format: 'a4', orientation: 'portrait' },
      pagebreak: { mode: ['avoid-all', 'css', 'legacy'] }
    }).from(element).save()
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

      <div id="docs-content" className={`${styles.content} ${styles.pdfReady}`}>

        {/* ── 1. DÉMARRAGE ── */}
        <section className={styles.section}>
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
                  <p className={styles.stepDesc}>Depuis le tableau de bord, cliquez sur "Nouveau projet". Donnez-lui un nom et optionnellement une description.</p>
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
        <section className={styles.section}>
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
            <li><strong>Palette de blocs (gauche)</strong> — Cliquez sur un type de bloc pour l'ajouter à votre étude.</li>
            <li><strong>Zone centrale</strong> — Affiche la structure de votre étude (onglet "Structure") ou la configuration du bloc sélectionné (onglet "Configurer").</li>
            <li><strong>Barre d'onglets supérieure</strong> — Naviguez entre Constructeur, Design expérimental, Export et Open Science.</li>
          </ul>

          <div className={styles.infoBox}>
            <strong>Astuce :</strong> Glissez-déposez les blocs dans la zone "Structure" pour les réordonner. Les blocs s'exécutent dans l'ordre défini.
          </div>

          <div className={styles.subsection}>
            <h3 className={styles.subsectionTitle}>2.1 Types de blocs disponibles</h3>
            <div className={styles.blockGrid}>
              <div className={styles.blockCard}>
                <span className={styles.blockCardBadge} style={{background:'#ede9fe',color:'#5b21b6'}}>ACCUEIL</span>
                <p className={styles.blockCardTitle}>Message d'accueil</p>
                <p className={styles.blockCardDesc}>Page d'introduction. Titre, texte de présentation, bouton de démarrage personnalisable.</p>
              </div>
              <div className={styles.blockCard}>
                <span className={styles.blockCardBadge} style={{background:'#dbeafe',color:'#1d4ed8'}}>INSTRUCTION</span>
                <p className={styles.blockCardTitle}>Instruction</p>
                <p className={styles.blockCardDesc}>Texte libre de consignes entre deux sections. Supporte le HTML (gras, italique, listes).</p>
              </div>
              <div className={styles.blockCard}>
                <span className={styles.blockCardBadge} style={{background:'#dcfce7',color:'#15803d'}}>QUESTIONNAIRE</span>
                <p className={styles.blockCardTitle}>Questionnaire</p>
                <p className={styles.blockCardDesc}>Bloc de questions. 20+ types disponibles. Ordre aléatoire configurable.</p>
              </div>
              <div className={styles.blockCard}>
                <span className={styles.blockCardBadge} style={{background:'#fef3c7',color:'#b45309'}}>TÂCHE</span>
                <p className={styles.blockCardTitle}>Tâche comportementale</p>
                <p className={styles.blockCardDesc}>Présentation de stimuli avec mesure de temps de réaction. Phases entraînement / test.</p>
              </div>
              <div className={styles.blockCard}>
                <span className={styles.blockCardBadge} style={{background:'#fce7f3',color:'#be185d'}}>LOGIQUE</span>
                <p className={styles.blockCardTitle}>Logique</p>
                <p className={styles.blockCardDesc}>Branchement conditionnel basé sur les réponses précédentes. Routage dynamique.</p>
              </div>
              <div className={styles.blockCard}>
                <span className={styles.blockCardBadge} style={{background:'#e0f2fe',color:'#0369a1'}}>DEBRIEFING</span>
                <p className={styles.blockCardTitle}>Message de fin</p>
                <p className={styles.blockCardDesc}>Page de conclusion. Redirection automatique vers la plateforme de recrutement ou une URL personnalisée.</p>
              </div>
            </div>
          </div>
        </section>

        {/* ── 3. TYPES DE QUESTIONS ── */}
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>
            <span className={styles.sectionIcon}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 17h-2v-2h2v2zm2.07-7.75l-.9.92C13.45 12.9 13 13.5 13 15h-2v-.5c0-1.1.45-2.1 1.17-2.83l1.24-1.26c.37-.36.59-.86.59-1.41 0-1.1-.9-2-2-2s-2 .9-2 2H8c0-2.21 1.79-4 4-4s4 1.79 4 4c0 .88-.36 1.68-.93 2.25z"/></svg>
            </span>
            3. Types de questions
          </h2>

          <p className={styles.p}>
            Les types de questions sont organisés en cinq catégories : choix, texte, numérique, échelles &amp; matrices, et spécial. Chaque question peut être marquée comme obligatoire et ses choix peuvent être randomisés (sauf les choix ancrés).
          </p>

          {/* 3.1 Choix */}
          <div className={styles.subsection}>
            <h3 className={styles.subsectionTitle}>3.1 Choix</h3>
            <div className={styles.blockGrid} style={{gridTemplateColumns:'repeat(auto-fill, minmax(200px, 1fr))'}}>

              {/* Radio */}
              <div className={styles.blockCard}>
                <span className={styles.blockCardBadge} style={{background:'#dbeafe',color:'#1d4ed8'}}>RADIO</span>
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
                <span className={styles.blockCardBadge} style={{background:'#dcfce7',color:'#15803d'}}>CHECKBOX</span>
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
                <span className={styles.blockCardBadge} style={{background:'#fef3c7',color:'#b45309'}}>LIKERT</span>
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
                <span className={styles.blockCardBadge} style={{background:'#fce7f3',color:'#be185d'}}>CONSENTEMENT</span>
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
                <span className={styles.blockCardBadge} style={{background:'#dbeafe',color:'#1d4ed8'}}>SELECT</span>
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
                <span className={styles.blockCardBadge} style={{background:'#dbeafe',color:'#1d4ed8'}}>BUTTON_GROUP</span>
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
                <span className={styles.blockCardBadge} style={{background:'#dbeafe',color:'#1d4ed8'}}>MEDIA_RADIO</span>
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
                <span className={styles.blockCardBadge} style={{background:'#dbeafe',color:'#1d4ed8'}}>MEDIA_CHECKBOX</span>
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
                <span className={styles.blockCardBadge} style={{background:'#dbeafe',color:'#1d4ed8'}}>RADIO_COMMENT</span>
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
                <span className={styles.blockCardBadge} style={{background:'#dbeafe',color:'#1d4ed8'}}>CHECKBOX_COMMENT</span>
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
                <span className={styles.blockCardBadge} style={{background:'#dbeafe',color:'#1d4ed8'}}>DRILL_DOWN</span>
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
                <span className={styles.blockCardBadge} style={{background:'#e0f2fe',color:'#0369a1'}}>TEXTE</span>
                <p className={styles.blockCardTitle}>Texte libre</p>
                <p className={styles.blockCardDesc}>Zone de saisie ouverte. Idéal : justification, réponse qualitative.</p>
                <div style={{marginTop:8, padding:'8px 10px', background:'var(--gray-50)', borderRadius:6, border:'1px solid var(--border)', fontSize:11, color:'var(--text-secondary)'}}>
                  <div style={{border:'1px solid var(--border)', borderRadius:4, padding:'5px 7px', background:'white', color:'var(--text-secondary)', minHeight:32, fontSize:10}}>Votre réponse...</div>
                </div>
              </div>

              {/* Fill Blank */}
              <div className={styles.blockCard}>
                <span className={styles.blockCardBadge} style={{background:'#e0f2fe',color:'#0369a1'}}>FILL_BLANK</span>
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
                <span className={styles.blockCardBadge} style={{background:'#e0f2fe',color:'#0369a1'}}>INPUT_DEMAND</span>
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
                <span className={styles.blockCardBadge} style={{background:'#fef3c7',color:'#b45309'}}>DROP_WORD</span>
                <p className={styles.blockCardTitle}>Texte à trous (banque de mots)</p>
                <p className={styles.blockCardDesc}>Glisser-déposer des mots depuis une banque vers les blancs. Idéal : vocabulaire, compréhension.</p>
                <div style={{marginTop:8, padding:'8px 10px', background:'var(--gray-50)', borderRadius:6, border:'1px solid var(--border)', fontSize:11, color:'var(--text-secondary)'}}>
                  <div style={{fontSize:10, marginBottom:4}}>
                    <span>Le </span>
                    <span style={{border:'1px dashed var(--brand)', borderRadius:3, padding:'1px 6px', background:'#dbeafe', fontSize:9}}>soleil</span>
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
                <span className={styles.blockCardBadge} style={{background:'#dcfce7',color:'#15803d'}}>DISPLAY</span>
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
                <span className={styles.blockCardBadge} style={{background:'#e0f2fe',color:'#0369a1'}}>NUMÉRIQUE</span>
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
                <span className={styles.blockCardBadge} style={{background:'#e0f2fe',color:'#0369a1'}}>EQUATION</span>
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
                <span className={styles.blockCardBadge} style={{background:'#e0f2fe',color:'#0369a1'}}>COMPUTED</span>
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
                <span className={styles.blockCardBadge} style={{background:'#e0f2fe',color:'#0369a1'}}>DATE</span>
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
                <span className={styles.blockCardBadge} style={{background:'#ede9fe',color:'#5b21b6'}}>SLIDER</span>
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
                <span className={styles.blockCardBadge} style={{background:'#ede9fe',color:'#5b21b6'}}>MATRICE</span>
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
                <span className={styles.blockCardBadge} style={{background:'#ede9fe',color:'#5b21b6'}}>SÉMANTIQUE</span>
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
                <span className={styles.blockCardBadge} style={{background:'#ede9fe',color:'#5b21b6'}}>SOMME</span>
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
                <span className={styles.blockCardBadge} style={{background:'#ede9fe',color:'#5b21b6'}}>SIDE_BY_SIDE</span>
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
                <span className={styles.blockCardBadge} style={{background:'#fef3c7',color:'#b45309'}}>CLASSEMENT</span>
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
                <span className={styles.blockCardBadge} style={{background:'#fef3c7',color:'#b45309'}}>TIMING</span>
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
                <span className={styles.blockCardBadge} style={{background:'#dcfce7',color:'#15803d'}}>IMAGE</span>
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
                <span className={styles.blockCardBadge} style={{background:'#dcfce7',color:'#15803d'}}>AUDIO</span>
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
                <span className={styles.blockCardBadge} style={{background:'#dcfce7',color:'#15803d'}}>VIDÉO</span>
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
                <span className={styles.blockCardBadge} style={{background:'#fef3c7',color:'#b45309'}}>DRAG_DROP</span>
                <p className={styles.blockCardTitle}>Glisser-déposer</p>
                <p className={styles.blockCardDesc}>Classer des éléments dans des catégories par drag and drop. Idéal : tri, catégorisation.</p>
                <div style={{marginTop:8, padding:'8px 10px', background:'var(--gray-50)', borderRadius:6, border:'1px solid var(--border)', fontSize:11, color:'var(--text-secondary)'}}>
                  <div style={{display:'flex', gap:6}}>
                    {['Cat. A','Cat. B'].map((cat,i)=>(
                      <div key={i} style={{flex:1, border:'1px dashed var(--border)', borderRadius:4, padding:4, textAlign:'center'}}>
                        <div style={{fontSize:8, fontWeight:600, marginBottom:3}}>{cat}</div>
                        {i===0 && <span style={{padding:'2px 5px', background:'#dbeafe', borderRadius:3, fontSize:8}}>Item 1</span>}
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Highlight */}
              <div className={styles.blockCard}>
                <span className={styles.blockCardBadge} style={{background:'#fef3c7',color:'#b45309'}}>HIGHLIGHT</span>
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
                <span className={styles.blockCardBadge} style={{background:'#fef3c7',color:'#b45309'}}>HOTSPOT</span>
                <p className={styles.blockCardTitle}>Zone cliquable</p>
                <p className={styles.blockCardDesc}>Cliquer sur une image, coordonnées enregistrées. Idéal : détection visuelle, cartes de chaleur.</p>
                <div style={{marginTop:8, padding:'8px 10px', background:'var(--gray-50)', borderRadius:6, border:'1px solid var(--border)', fontSize:11, color:'var(--text-secondary)'}}>
                  <div style={{position:'relative', height:32, background:'var(--gray-100)', borderRadius:4, display:'flex', alignItems:'center', justifyContent:'center'}}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="var(--text-secondary)"><path d="M21 19V5c0-1.1-.9-2-2-2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2zM8.5 13.5l2.5 3.01L14.5 12l4.5 6H5l3.5-4.5z"/></svg>
                    <div style={{position:'absolute', top:6, right:14, width:8, height:8, borderRadius:'50%', background:'#ef4444', border:'2px solid white', boxShadow:'0 0 0 1px #ef4444'}}></div>
                  </div>
                </div>
              </div>

              {/* File Upload */}
              <div className={styles.blockCard}>
                <span className={styles.blockCardBadge} style={{background:'#fef3c7',color:'#b45309'}}>FILE_UPLOAD</span>
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
                <span className={styles.blockCardBadge} style={{background:'#fce7f3',color:'#be185d'}}>META_INFO</span>
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
            <strong>Bon à savoir :</strong> Pour les échelles validées (BFI, STAI, PHQ-9, etc.), utilisez le type Matrice et cochez l'option "Inverser" sur les items à scorer en sens inverse. Le type TIMING est cumulable avec n'importe quel autre type de question.
          </div>
        </section>

        {/* ── 4. TÂCHE COMPORTEMENTALE ── */}
        <section className={styles.section}>
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
              <li><strong>Bloc d'entraînement</strong> — Essais de pratique permettant au participant de se familiariser avec la tâche. Le feedback est généralement activé. Les données ne sont pas comptabilisées dans l'analyse. Indiquez le nombre d'essais et si les stimuli doivent être randomisés.</li>
              <li><strong>Bloc de test</strong> — Essais expérimentaux dont les données sont enregistrées pour l'analyse. Le feedback peut être désactivé selon le protocole. Configurez le nombre d'essais et la randomisation.</li>
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
                  {label:'IEI', sub:'500 ms', bg:'#f1f5f9', border:'#cbd5e1', color:'#475569'},
                  {label:'Fixation', sub:'200–500 ms', bg:'#ede9fe', border:'#a78bfa', color:'#5b21b6'},
                  {label:'Stimulus', sub:'jusqu\'à réponse', bg:'#dbeafe', border:'#60a5fa', color:'#1d4ed8'},
                  {label:'Masque', sub:'250 ms', bg:'#fce7f3', border:'#f9a8d4', color:'#be185d'},
                  {label:'Feedback', sub:'600 ms', bg:'#dcfce7', border:'#86efac', color:'#15803d'},
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
                  <td>Durée fixe ou variable (plage min/max tirée aléatoirement)</td>
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
              <strong>Durées aléatoires :</strong> Pour les étapes de type fixation ou IEI, activez "Durée variable" pour définir une plage min/max. La durée sera tirée aléatoirement à chaque essai.
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
              <strong>Conseil IAT :</strong> Dans l'onglet Design expérimental, créez un facteur intra-sujets "Ordre" avec deux niveaux (Compatible en premier / Incompatible en premier) et utilisez le contrebalancement Williams pour contrôler les effets d'ordre.
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
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>
            <span className={styles.sectionIcon}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M16.5 3c-1.74 0-3.41.81-4.5 2.09C10.91 3.81 9.24 3 7.5 3 4.42 3 2 5.42 2 8.5c0 3.78 3.4 6.86 8.55 11.54L12 21.35l1.45-1.32C18.6 15.36 22 12.28 22 8.5 22 5.42 19.58 3 16.5 3z"/></svg>
            </span>
            5. Mesures physiologiques
          </h2>

          <p className={styles.p}>
            MindCraft permet la synchronisation avec des équipements de mesure physiologique (EEG, ECG, GSR, eye-tracking) via le protocole Lab Streaming Layer (LSL). La configuration suit une architecture à deux niveaux pour une flexibilité maximale.
          </p>

          <div className={styles.subsection}>
            <h3 className={styles.subsectionTitle}>5.1 Architecture à deux niveaux</h3>
            <p className={styles.p}>
              La configuration physiologique est répartie entre le niveau étude et le niveau bloc Tâche :
            </p>
            <ul className={styles.list}>
              <li><strong>Niveau étude (onglet "Mesures physio")</strong> — Configuration de l'équipement (outil, logiciel, version, fréquence d'échantillonnage) et des marqueurs globaux LSL (transitions de blocs, affichage de questions, réponses). Ces marqueurs sont envoyés automatiquement par le runner pour tous les types de blocs.</li>
              <li><strong>Niveau bloc Tâche (onglet Paramètres du bloc)</strong> — Marqueurs spécifiques aux événements de la tâche comportementale (fixation, stimulus, réponse, feedback). Ces marqueurs sont envoyés par le StimulusEngine pendant l'exécution des essais.</li>
            </ul>
            <p className={styles.p}>
              Les deux niveaux coexistent : le runner envoie les marqueurs globaux, et le StimulusEngine envoie les marqueurs tâche. Cela permet un alignement précis des données physiologiques avec chaque événement de l'étude.
            </p>
          </div>

          <div className={styles.subsection}>
            <h3 className={styles.subsectionTitle}>5.2 Horodatage automatique</h3>
            <p className={styles.p}>
              L'horodatage haute précision est toujours actif lorsque les mesures physiologiques sont activées. Chaque événement est horodaté via <code>performance.now()</code> avec une résolution sub-milliseconde. Ces timestamps sont automatiquement inclus dans les données exportées (CSV) et permettent un alignement post-hoc avec vos enregistrements physiologiques, même sans marqueurs LSL.
            </p>
          </div>

          <div className={styles.subsection}>
            <h3 className={styles.subsectionTitle}>5.3 Marqueurs LSL (Lab Streaming Layer)</h3>
            <p className={styles.p}>
              Les marqueurs LSL sont envoyés en temps réel via WebSocket vers un serveur relay local qui les retransmet au flux LSL.
            </p>
            <ul className={styles.list}>
              <li><strong>Prérequis</strong> — Script relay Python : <code>pip install pylsl websockets && python lsl-relay.py</code></li>
              <li><strong>Marqueurs globaux (niveau étude)</strong> — STUDY_START, STUDY_END, BLOCK_START, BLOCK_END, Q_SHOW, Q_RESP — personnalisables dans l'onglet Mesures physio</li>
              <li><strong>Marqueurs tâche (niveau bloc)</strong> — F (fixation), S (stimulus), R (réponse), FB (feedback) — personnalisables dans les paramètres de chaque bloc Tâche</li>
            </ul>
          </div>

          <div className={styles.subsection}>
            <h3 className={styles.subsectionTitle}>5.4 Workflow recommandé</h3>
            <div className={styles.steps}>
              <div className={styles.step}>
                <div className={styles.stepNum}>1</div>
                <div className={styles.stepBody}>
                  <p className={styles.stepTitle}>Configurer l'outil physiologique</p>
                  <p className={styles.stepDesc}>Dans l'onglet "Mesures physio" de l'étude, sélectionnez votre équipement (EEG, ECG, eye-tracking, etc.), renseignez le logiciel et la fréquence d'échantillonnage.</p>
                </div>
              </div>
              <div className={styles.step}>
                <div className={styles.stepNum}>2</div>
                <div className={styles.stepBody}>
                  <p className={styles.stepTitle}>Activer LSL et configurer le port</p>
                  <p className={styles.stepDesc}>Activez les marqueurs LSL et configurez le port WebSocket du relay (par défaut : 12345). Personnalisez les codes marqueurs globaux si nécessaire.</p>
                </div>
              </div>
              <div className={styles.step}>
                <div className={styles.stepNum}>3</div>
                <div className={styles.stepBody}>
                  <p className={styles.stepTitle}>Lancer le script relay Python</p>
                  <p className={styles.stepDesc}>Exécutez le script relay (<code>python lsl-relay.py</code>) sur la machine du participant. Il fait le pont entre le WebSocket du navigateur et le réseau LSL.</p>
                </div>
              </div>
              <div className={styles.step}>
                <div className={styles.stepNum}>4</div>
                <div className={styles.stepBody}>
                  <p className={styles.stepTitle}>Lancer l'enregistrement physiologique</p>
                  <p className={styles.stepDesc}>Démarrez l'enregistrement dans votre logiciel d'acquisition (BrainVision, BIOPAC, Tobii, etc.). Vérifiez que le flux LSL est détecté.</p>
                </div>
              </div>
              <div className={styles.step}>
                <div className={styles.stepNum}>5</div>
                <div className={styles.stepBody}>
                  <p className={styles.stepTitle}>Le participant complète l'étude</p>
                  <p className={styles.stepDesc}>Les marqueurs globaux (STUDY_START, BLOCK_START, Q_SHOW, etc.) et les marqueurs tâche (fixation, stimulus, réponse) sont envoyés automatiquement en temps réel.</p>
                </div>
              </div>
              <div className={styles.step}>
                <div className={styles.stepNum}>6</div>
                <div className={styles.stepBody}>
                  <p className={styles.stepTitle}>Aligner les données</p>
                  <p className={styles.stepDesc}>Utilisez les timestamps haute précision dans le CSV exporté et les marqueurs LSL enregistrés pour aligner les données comportementales et physiologiques.</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ── 6. DESIGN EXPÉRIMENTAL ── */}
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>
            <span className={styles.sectionIcon}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zM9 17H7v-7h2v7zm4 0h-2V7h2v10zm4 0h-2v-4h2v4z"/></svg>
            </span>
            6. Design expérimental
          </h2>

          <p className={styles.p}>
            L'onglet "Design expérimental" permet de configurer un plan factoriel avec contrebalancement automatique des conditions. Le module automatise la gestion des conditions et du contrebalancement.
          </p>

          <div className={styles.subsection}>
            <h3 className={styles.subsectionTitle}>6.1 Facteurs inter-sujets (between-subjects)</h3>
            <p className={styles.p}>
              Chaque participant est assigné à une seule condition. MindCraft répartit automatiquement et équitablement les participants entre les niveaux du facteur.
              Utile pour manipuler des variables comme le type de consigne, la version d'un stimulus ou le cadrage d'un message.
            </p>
          </div>

          <div className={styles.subsection}>
            <h3 className={styles.subsectionTitle}>6.2 Facteurs intra-sujets (within-subjects)</h3>
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
            <h3 className={styles.subsectionTitle}>6.3 Plans mixtes et conditions</h3>
            <p className={styles.p}>
              Combinez des facteurs inter et intra-sujets. MindCraft génère automatiquement la matrice complète des conditions et assigne chaque participant à la combinaison appropriée.
              Le nombre de conditions totales est le produit des niveaux de tous les facteurs.
            </p>
          </div>

          <div className={styles.subsection}>
            <h3 className={styles.subsectionTitle}>6.4 Types de plans</h3>
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
            <h3 className={styles.subsectionTitle}>6.5 Configurer un facteur</h3>
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

          <div className={styles.subsection}>
            <h3 className={styles.subsectionTitle}>6.6 Taille d'échantillon</h3>
            <p className={styles.p}>
              Indiquez le nombre total de participants visé. MindCraft répartira automatiquement et équitablement les participants dans chacune des conditions expérimentales.
            </p>
          </div>
        </section>

        {/* ── 7. RANDOMISATION ── */}
        <section className={styles.section}>
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
          </div>
        </section>

        {/* ── 8. PRÉVISUALISATION PAR BLOC ── */}
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>
            <span className={styles.sectionIcon}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z"/></svg>
            </span>
            8. Prévisualisation par bloc
          </h2>

          <p className={styles.p}>
            MindCraft permet de prévisualiser un bloc individuel sans lancer l'étude complète. Cette fonctionnalité est accessible directement depuis l'éditeur de blocs.
          </p>

          <div className={styles.steps}>
            <div className={styles.step}>
              <div className={styles.stepNum}>1</div>
              <div className={styles.stepBody}>
                <p className={styles.stepTitle}>Repérer l'icône de prévisualisation</p>
                <p className={styles.stepDesc}>Dans la liste des blocs (onglet "Structure"), chaque bloc possède une icône en forme d'oeil à côté de son nom.</p>
              </div>
            </div>
            <div className={styles.step}>
              <div className={styles.stepNum}>2</div>
              <div className={styles.stepBody}>
                <p className={styles.stepTitle}>Lancer la prévisualisation</p>
                <p className={styles.stepDesc}>Cliquez sur l'icône oeil. Un nouvel onglet s'ouvre avec la prévisualisation du bloc sélectionné uniquement, sans les autres blocs de l'étude.</p>
              </div>
            </div>
            <div className={styles.step}>
              <div className={styles.stepNum}>3</div>
              <div className={styles.stepBody}>
                <p className={styles.stepTitle}>Tester et ajuster</p>
                <p className={styles.stepDesc}>Interagissez avec le bloc comme le ferait un participant. Fermez l'onglet pour revenir à l'éditeur et ajuster la configuration si nécessaire.</p>
              </div>
            </div>
          </div>

          <div className={styles.tipBox}>
            <strong>Astuce :</strong> Utilisez la prévisualisation par bloc pour tester rapidement les modifications sur un questionnaire ou une tâche sans parcourir l'étude entière.
          </div>
        </section>

        {/* ── 9. COLLECTE ET RECRUTEMENT ── */}
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>
            <span className={styles.sectionIcon}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M18 16.08c-.76 0-1.44.3-1.96.77L8.91 12.7c.05-.23.09-.46.09-.7s-.04-.47-.09-.7l7.05-4.11c.54.5 1.25.81 2.04.81 1.66 0 3-1.34 3-3s-1.34-3-3-3-3 1.34-3 3c0 .24.04.47.09.7L8.04 9.81C7.5 9.31 6.79 9 6 9c-1.66 0-3 1.34-3 3s1.34 3 3 3c.79 0 1.5-.31 2.04-.81l7.12 4.16c-.05.21-.08.43-.08.65 0 1.61 1.31 2.92 2.92 2.92s2.92-1.31 2.92-2.92-1.31-2.92-2.92-2.92z"/></svg>
            </span>
            9. Collecte et recrutement
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

        {/* ── 10. EXPORT DE DONNÉES ── */}
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>
            <span className={styles.sectionIcon}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M19 9h-4V3H9v6H5l7 7 7-7zM5 18v2h14v-2H5z"/></svg>
            </span>
            10. Export des données
          </h2>

          <p className={styles.p}>
            Les données collectées sont accessibles depuis l'onglet "Export" du builder. Trois formats sont proposés.
          </p>

          <table className={styles.table}>
            <thead>
              <tr><th>Format</th><th>Contenu</th><th>Compatible avec</th></tr>
            </thead>
            <tbody>
              <tr>
                <td><strong>CSV</strong></td>
                <td>Réponses brutes (une ligne par réponse, encodage UTF-8)</td>
                <td>Excel, R, Python (pandas), SPSS, jamovi</td>
              </tr>
              <tr>
                <td><strong>Excel (.xlsx)</strong></td>
                <td>Même structure que CSV avec mise en forme</td>
                <td>Microsoft Excel, LibreOffice Calc</td>
              </tr>
              <tr>
                <td><strong>Codebook PDF</strong></td>
                <td>Dictionnaire des variables (code, libellé, type, modalités)</td>
                <td>Documentation de l'étude, dépôt open data</td>
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
              </tbody>
            </table>
          </div>

          <div className={styles.subsection}>
            <h3 className={styles.subsectionTitle}>CSV Questionnaire</h3>
            <p className={styles.p}>
              Exporte les réponses aux blocs de type Questionnaire. Une ligne par réponse, avec les colonnes : participantId, blockId, questionCode, value, source, createdAt.
              Encodage UTF-8 compatible avec R, Python (pandas), SPSS, jamovi et Excel.
            </p>
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
        </section>

        {/* ── 11. OPEN SCIENCE ── */}
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>
            <span className={styles.sectionIcon}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 14.5v-9l6 4.5-6 4.5z"/></svg>
            </span>
            11. Open Science
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

        {/* ── 12. COLLABORATION ── */}
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>
            <span className={styles.sectionIcon}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z"/></svg>
            </span>
            12. Collaboration
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
                <p className={styles.stepDesc}>Depuis la page du projet, cliquez sur "Inviter" dans la section Équipe. Entrez l'email et le rôle. L'invitation est valable 48h.</p>
              </div>
            </div>
            <div className={styles.step}>
              <div className={styles.stepNum}>2</div>
              <div className={styles.stepBody}>
                <p className={styles.stepTitle}>Accepter une invitation</p>
                <p className={styles.stepDesc}>Le collaborateur reçoit un lien par email. En cliquant dessus (connecté sur MindCraft), il rejoint automatiquement le projet.</p>
              </div>
            </div>
          </div>
        </section>

      </div>
    </StaticLayout>
  )
}
