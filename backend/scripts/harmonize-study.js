/**
 * Script d'harmonisation de l'Étude 1 - Test
 * Thématique : écologie / nature / animaux
 * + Création d'une tâche interne simple
 * + Création de blocs logiques (condition intersujet + réponse participant)
 */
require('dotenv').config()
const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

const STUDY_ID = 'cmnlwncq9000112gqb64flmsc'

// ─── HELPER ──────────────────────────────────────────────────────────────────

async function updateQuestion(code, { text, settings, choices, matrixItems }) {
  const q = await prisma.question.findFirst({ where: { code } })
  if (!q) { console.log(`  ⚠ Question ${code} introuvable`); return }

  // Supprimer et recréer choices/matrixItems si fournis
  if (choices) {
    await prisma.choice.deleteMany({ where: { questionId: q.id } })
  }
  if (matrixItems) {
    await prisma.matrixItem.deleteMany({ where: { questionId: q.id } })
  }

  await prisma.question.update({
    where: { id: q.id },
    data: {
      ...(text !== undefined ? { text } : {}),
      ...(settings !== undefined ? { settings } : {}),
      ...(choices ? {
        choices: {
          create: choices.map((c, i) => ({
            code: c.code, label: c.label, order: i,
            anchored: c.anchored || false,
            mediaUrl: c.mediaUrl || null,
            mediaType: c.mediaType || null,
          }))
        }
      } : {}),
      ...(matrixItems ? {
        matrixItems: {
          create: matrixItems.map((m, i) => ({
            code: m.code, label: m.label, order: i,
            reversed: m.reversed || false,
            left: m.left || null,
            right: m.right || null,
          }))
        }
      } : {}),
    }
  })
  console.log(`  ✓ ${code} mis à jour`)
}

// ─── MAIN ────────────────────────────────────────────────────────────────────

async function main() {
  console.log('═══ Harmonisation thématique : Écologie / Nature / Animaux ═══\n')

  // ── WELCOME ─────────────────────────────────────────────────────────────
  console.log('[WELCOME]')
  const welcomeBlock = await prisma.block.findFirst({ where: { studyId: STUDY_ID, type: 'WELCOME' } })
  if (welcomeBlock) {
    await prisma.block.update({
      where: { id: welcomeBlock.id },
      data: {
        settings: {
          title: '',
          content: '<h1 style="text-align: center;"><strong>Bienvenue dans cette étude de démonstration</strong></h1><p></p><p>Cette étude porte sur vos <strong>attitudes et connaissances environnementales</strong>. Elle illustre l\'ensemble des types de questions et fonctionnalités disponibles sur la plateforme MindCraft.</p><p></p><p>Vous découvrirez des questions à choix unique, à choix multiple, des échelles, des tâches interactives (glisser-déposer, cliquer sur image, texte à trous…) et même une mini tâche expérimentale de catégorisation.</p><p></p><p>Durée estimée : <strong>10 minutes</strong>.</p><p style="text-align: right;">L\'équipe de recherche.</p>',
          buttonLabel: 'Commencer l\'étude'
        }
      }
    })
    console.log('  ✓ Welcome mis à jour')
  }

  // ── CHOIX UNIQUE ────────────────────────────────────────────────────────
  console.log('\n[CHOIX UNIQUE]')

  await updateQuestion('ChoixUnique1', {
    text: '<p>Quel environnement naturel préférez-vous ?</p>',
    choices: [
      { code: 'foret', label: 'Forêt' },
      { code: 'ocean', label: 'Océan' },
      { code: 'montagne', label: 'Montagne' },
      { code: 'desert', label: 'Désert' },
      { code: 'prairie', label: 'Prairie' },
    ]
  })

  await updateQuestion('ChoixUnique2', {
    text: '<p>Quel moyen de transport écologique utilisez-vous le plus souvent ?</p>',
    choices: [
      { code: 'pied', label: 'À pied' },
      { code: 'velo', label: 'Vélo' },
      { code: 'tc', label: 'Transports en commun' },
      { code: 'covoit', label: 'Covoiturage' },
      { code: 'elec', label: 'Voiture électrique' },
    ]
  })

  await updateQuestion('ChoixUnique3', {
    text: '<p>À quelle fréquence <strong>triez-vous vos déchets</strong> ?</p>',
    choices: [
      { code: '1', label: 'Jamais' },
      { code: '2', label: 'Rarement' },
      { code: '3', label: 'Parfois' },
      { code: '4', label: 'Souvent' },
      { code: '5', label: 'Toujours' },
    ]
  })

  await updateQuestion('ChoixUnique4', {
    text: '<p>Quel <span style="color: rgb(37, 99, 235);"><u>paysage naturel</u></span> vous inspire le plus ?</p>',
    // On garde les mediaUrl existantes, on change juste les labels
    choices: [
      { code: '1', label: 'Cette image', mediaUrl: 'http://localhost:3002/uploads/0bcb359d8b86de0456b1895599b2a63e.jpg', mediaType: 'image' },
      { code: '2', label: 'Ce son de nature', mediaUrl: 'http://localhost:3002/uploads/12e3ee2731e5761c7207e417e66a5ca2.mp3', mediaType: 'audio' },
      { code: '3', label: 'Cette vidéo de feu de camp', mediaUrl: 'https://www.youtube.com/watch?v=dEr3ohze0EA', mediaType: 'video' },
    ]
  })

  await updateQuestion('ChoixUnique5', {
    text: '<p>Quel animal sauvage préférez-vous ? (Expliquez pourquoi en commentaire)</p>',
    settings: { commentLabel: 'Pourquoi ce choix ?' },
    choices: [
      { code: 'loup', label: 'Loup' },
      { code: 'aigle', label: 'Aigle royal' },
      { code: 'dauphin', label: 'Dauphin' },
      { code: 'elephant', label: 'Éléphant' },
    ]
  })

  await updateQuestion('ChoixUnique6', {
    text: '<p>Quel type d\'espace naturel protégé souhaiteriez-vous visiter ?</p>',
    settings: {
      subChoices: {
        'pn': [
          { code: 'pn_vanoise', label: 'Parc de la Vanoise' },
          { code: 'pn_calanques', label: 'Parc des Calanques' },
          { code: 'pn_mercantour', label: 'Parc du Mercantour' },
        ],
        'rn': [
          { code: 'rn_camargue', label: 'Réserve de Camargue' },
          { code: 'rn_scandola', label: 'Réserve de Scandola' },
        ],
        'rm': [
          { code: 'rm_med', label: 'Réserve marine de Méditerranée' },
          { code: 'rm_atl', label: 'Parc marin d\'Iroise' },
        ],
      }
    },
    choices: [
      { code: 'pn', label: 'Parc national' },
      { code: 'rn', label: 'Réserve naturelle' },
      { code: 'rm', label: 'Réserve marine' },
    ]
  })

  // ── CHOIX MULTIPLE ──────────────────────────────────────────────────────
  console.log('\n[CHOIX MULTIPLE]')

  await updateQuestion('ChoixMultiple1', {
    text: '<p>Quels gestes écologiques pratiquez-vous au quotidien ?</p>',
    choices: [
      { code: 'tri', label: 'Tri des déchets' },
      { code: 'compost', label: 'Compostage' },
      { code: 'velo', label: 'Déplacements à vélo' },
      { code: 'local', label: 'Achats locaux et de saison' },
      { code: 'plastique', label: 'Réduction du plastique' },
      { code: 'energie', label: 'Économies d\'énergie' },
    ]
  })

  await updateQuestion('ChoixMultiple2', {
    text: '<p>Quels <strong>paysages naturels</strong> vous attirent le plus ?</p>',
    settings: {},
    // On garde les mediaUrl existantes
    choices: [
      { code: '1', label: 'Paysage 1', mediaUrl: 'http://localhost:3002/uploads/aba58374cd7e8341da2b243bc7d913ea.jpg', mediaType: 'image' },
      { code: '2', label: 'Paysage 2', mediaUrl: 'http://localhost:3002/uploads/2c83ef1eb17c2b2f973e85ae066d103f.jpg', mediaType: 'image' },
      { code: '3', label: 'Sons de la forêt', mediaUrl: 'http://localhost:3002/uploads/99036ebd69f5fd887793a65fce650d90.mp3', mediaType: 'audio' },
      { code: '4', label: 'Bruit de la pluie', mediaUrl: 'http://localhost:3002/uploads/59f707832c044e49d08cec8b061a4221.mp3', mediaType: 'audio' },
      { code: '5', label: 'Feu de camp', mediaUrl: 'https://www.youtube.com/watch?v=dEr3ohze0EA', mediaType: 'video' },
      { code: '6', label: 'Pluie et cheminée', mediaUrl: 'https://www.youtube.com/watch?v=xBaM01Ac9DY', mediaType: 'video' },
    ]
  })

  await updateQuestion('ChoixMultiple3', {
    text: '<p>Quelles espèces menacées vous préoccupent le plus ? (Commentez pourquoi)</p>',
    settings: { commentLabel: 'Pourquoi ces espèces ?' },
    choices: [
      { code: 'ours', label: 'Ours polaire' },
      { code: 'abeille', label: 'Abeilles' },
      { code: 'tortue', label: 'Tortue marine' },
      { code: 'rhino', label: 'Rhinocéros' },
      { code: 'corail', label: 'Récifs coralliens' },
      { code: 'pangolin', label: 'Pangolin' },
    ]
  })

  // ── TEXTE ───────────────────────────────────────────────────────────────
  console.log('\n[TEXTE]')

  await updateQuestion('Texte1', {
    text: '<p>Quel est votre geste écologique le plus important au quotidien ?</p>',
  })

  await updateQuestion('Texte2', {
    text: '<p>Décrivez en détail votre expérience la plus marquante dans la nature (250 mots minimum).</p>',
    settings: { minWords: 250, multiline: true },
  })

  await updateQuestion('Texte3', {
    text: '<p>Complétez les phrases suivantes :</p>',
    settings: {
      passage: 'Ce matin, dans mon [BLANK], j\'ai observé un [BLANK] se poser sur une branche. Le [BLANK] chantait encore au loin, et j\'ai pris le temps de [BLANK].'
    }
  })

  // ── ÉCHELLES ────────────────────────────────────────────────────────────
  console.log('\n[ÉCHELLES]')

  await updateQuestion('Echelle1', {
    text: '<p>Indiquez votre degré d\'accord : <em>Je me sens personnellement concerné(e) par la protection de l\'environnement.</em></p>',
    settings: { pointLabels: ['Pas du tout d\'accord', '', '', '', 'Tout à fait d\'accord'] }
  })

  await updateQuestion('Echelle2', {
    text: '<p>Dans quelle mesure êtes-vous d\'accord avec les affirmations suivantes ?</p>',
    settings: { columnLabels: ['1 - Pas du tout', '2', '3', '4', '5 - Tout à fait'] },
    matrixItems: [
      { code: 'item1', label: 'La biodiversité est essentielle à notre survie' },
      { code: 'item2', label: 'Le recyclage fait une vraie différence' },
      { code: 'item3', label: 'Je fais attention à mon empreinte carbone' },
    ]
  })

  await updateQuestion('Echelle3', {
    text: '<p>Indiquez votre degré d\'engagement pour la protection de la nature :</p>',
    settings: { labelLeft: '0 %', showValue: true, labelRight: '100 %', hideDefault: true }
  })

  await updateQuestion('Echelle4', {
    text: '<p>Selon vous, les politiques environnementales actuelles sont :</p>',
    settings: { columns: 7 },
    matrixItems: [
      { code: 'item1', label: '', left: 'Efficaces', right: 'Inefficaces' },
      { code: 'item2', label: '', left: 'Suffisantes', right: 'Insuffisantes' },
      { code: 'item3', label: '', left: 'Ambitieuses', right: 'Timides' },
    ]
  })

  await updateQuestion('Echelle5', {
    text: '<p>Comparez votre sensibilité environnementale <strong>avant</strong> et <strong>après</strong> le visionnage du documentaire :</p>',
    settings: { leftLabel: 'Avant', rightLabel: 'Après', columns: 5 },
    matrixItems: [
      { code: 'item1', label: 'Inquiétude face au changement climatique' },
      { code: 'item2', label: 'Motivation à agir pour l\'environnement' },
    ]
  })

  // ── NUMÉRIQUES ──────────────────────────────────────────────────────────
  console.log('\n[NUMÉRIQUES]')

  await updateQuestion('Numerique1', {
    text: '<p>Combien de kilogrammes de déchets pensez-vous produire par semaine ?</p>',
    settings: { min: 0, max: 100, errorMsg: 'Veuillez entrer une valeur entre 0 et 100 kg.' }
  })

  // Numerique2 : déjà sur le CO2, on garde
  // Numerique4 : déjà sur la vitesse, on garde

  await updateQuestion('Numerique3', {
    text: '<p>Répartissez <strong>100 points</strong> entre ces causes environnementales selon leur importance pour vous :</p>',
    settings: { total: 100 },
    choices: [
      { code: 'forets', label: 'Protection des forêts' },
      { code: 'oceans', label: 'Dépollution des océans' },
      { code: 'energie', label: 'Énergies renouvelables' },
    ]
  })

  // ── SPÉCIALES ───────────────────────────────────────────────────────────
  console.log('\n[SPÉCIALES]')

  await updateQuestion('Special1', {
    text: '<p>Classez ces espèces menacées par <strong>ordre de priorité de protection</strong> :</p>',
    choices: [
      { code: 'ours', label: 'Ours polaire' },
      { code: 'abeille', label: 'Abeilles' },
      { code: 'tortue', label: 'Tortue marine' },
      { code: 'elephant', label: 'Éléphant' },
      { code: 'corail', label: 'Récif corallien' },
      { code: 'pangolin', label: 'Pangolin' },
    ]
  })

  await updateQuestion('Special2', {
    text: '<p>Indiquez la date et l\'heure de votre prochaine sortie nature prévue :</p>',
    settings: { format: 'datetime', dateMode: 'free', timeMode: 'free' }
  })

  await updateQuestion('Special3', {
    text: '<p>Déposez une photo de votre espace vert préféré :</p>',
    settings: { accept: 'image/*', maxFiles: 1 }
  })

  await updateQuestion('Special5', {
    text: '<p>Cliquez sur la zone de cette image où vous aimeriez <strong>planter un arbre</strong> :</p>',
  })

  await updateQuestion('Special6', {
    text: '<p>Classez ces actions : sont-elles <strong>éco-responsables</strong> ou <strong>polluantes</strong> ?</p>',
    settings: {
      zones: [
        { code: 'eco', label: 'Éco-responsable' },
        { code: 'poll', label: 'Polluant' },
      ]
    },
    choices: [
      { code: 'compost', label: 'Compostage' },
      { code: 'covoit', label: 'Covoiturage' },
      { code: 'deforest', label: 'Déforestation' },
      { code: 'surpeche', label: 'Surpêche' },
      { code: 'solaire', label: 'Panneaux solaires' },
      { code: 'plastique', label: 'Emballage plastique' },
    ]
  })

  await updateQuestion('Special7', {
    text: '<p>Complétez le texte en glissant les mots dans les espaces vides.</p>',
    settings: {
      passage: 'L\'écosystème marin est un milieu [BLANK] abritant des milliers d\'espèces. Les [BLANK] et les récifs de [BLANK] jouent un rôle crucial dans la régulation du climat mondial.',
      wordBank: 'fragile\nocéans\ncorail',
      shuffleWords: true,
    }
  })

  await updateQuestion('Special8', {
    text: '<p>Surlignez tous les mots qui évoquent un <strong>impact négatif</strong> sur l\'environnement :</p>',
    settings: {
      passage: 'Depuis la révolution industrielle, les activités humaines — combustion d\'énergies fossiles, déforestation, agriculture intensive — ont profondément perturbé l\'équilibre climatique. La concentration de CO₂ a augmenté de près de 50 %, entraînant un réchauffement de 1,2 °C. Les conséquences sont visibles : montée des eaux, sécheresses, inondations, canicules, fonte des glaciers et disparition d\'espèces.',
      highlightColor: '#FFEC00'
    }
  })

  // ── DEBRIEFING ──────────────────────────────────────────────────────────
  console.log('\n[DEBRIEFING]')
  const debriefBlock = await prisma.block.findFirst({ where: { studyId: STUDY_ID, type: 'DEBRIEFING' } })
  if (debriefBlock) {
    await prisma.block.update({
      where: { id: debriefBlock.id },
      data: {
        settings: {
          title: 'Merci pour votre participation !',
          content: '<p>Cette étude de démonstration est maintenant terminée.</p><p></p><p>L\'objectif était de vous montrer l\'ensemble des fonctionnalités disponibles sur la plateforme <strong>MindCraft</strong> : questions à choix unique/multiple, échelles, matrices, tâches expérimentales, logique conditionnelle, et bien plus.</p><p></p><p>Aucune donnée personnelle réelle n\'a été collectée dans le cadre de cette démonstration.</p><p></p><p>Pour toute question, contactez l\'équipe de recherche.</p>',
          buttonLabel: '',
          redirectUrl: '',
        }
      }
    })
    console.log('  ✓ Debriefing mis à jour')
  }

  // ── TÂCHE INTERNE (catégorisation animal/végétal) ───────────────────────
  console.log('\n[TÂCHE INTERNE]')
  const internalTaskBlock = await prisma.block.findFirst({
    where: { studyId: STUDY_ID, type: 'STIMULUS', settings: { path: ['name'], equals: 'Bloc Tâche "interne"' } }
  })
  if (internalTaskBlock) {
    await prisma.block.update({
      where: { id: internalTaskBlock.id },
      data: {
        settings: {
          name: 'Tâche de catégorisation (interne)',
          taskPhases: [
            {
              id: 'phase_instruct',
              type: 'INSTRUCTION',
              settings: {
                name: 'Consigne',
                text: '<h2>Tâche de catégorisation</h2><p>Vous allez voir des mots apparaître à l\'écran. Pour chaque mot, indiquez s\'il s\'agit d\'un <strong>animal</strong> ou d\'un <strong>végétal</strong>.</p><p>Appuyez sur <kbd>F</kbd> pour <strong>Animal</strong> et <kbd>J</kbd> pour <strong>Végétal</strong>.</p><p>Répondez le plus rapidement et précisément possible.</p>',
                buttonLabel: 'Commencer'
              }
            },
            {
              id: 'phase_training',
              type: 'TRAINING',
              settings: { name: 'Entraînement', trialCount: 4 }
            },
            {
              id: 'phase_test',
              type: 'TEST',
              settings: { name: 'Test', trialCount: 8 }
            },
          ],
          stimuliCategories: ['animal', 'vegetal'],
          stimuliList: [
            { text: 'Renard', category: 'animal', correctKey: 'KeyF' },
            { text: 'Chêne', category: 'vegetal', correctKey: 'KeyJ' },
            { text: 'Dauphin', category: 'animal', correctKey: 'KeyF' },
            { text: 'Fougère', category: 'vegetal', correctKey: 'KeyJ' },
            { text: 'Hibou', category: 'animal', correctKey: 'KeyF' },
            { text: 'Orchidée', category: 'vegetal', correctKey: 'KeyJ' },
            { text: 'Loutre', category: 'animal', correctKey: 'KeyF' },
            { text: 'Séquoia', category: 'vegetal', correctKey: 'KeyJ' },
            { text: 'Aigle', category: 'animal', correctKey: 'KeyF' },
            { text: 'Bambou', category: 'vegetal', correctKey: 'KeyJ' },
            { text: 'Tortue', category: 'animal', correctKey: 'KeyF' },
            { text: 'Mousse', category: 'vegetal', correctKey: 'KeyJ' },
          ],
          background: '',
        }
      }
    })
    console.log('  ✓ Tâche interne mise à jour (catégorisation animal/végétal)')
  }

  // ── BLOC LOGIQUE ───────────────────────────────────────────────────────
  console.log('\n[LOGIQUE]')
  const logicBlock = await prisma.block.findFirst({ where: { studyId: STUDY_ID, type: 'LOGIC' } })
  if (logicBlock) {
    // Trouver les blocs cibles potentiels (les blocs QUESTION)
    const blocks = await prisma.block.findMany({
      where: { studyId: STUDY_ID },
      orderBy: { order: 'asc' },
    })
    const debriefId = blocks.find(b => b.type === 'DEBRIEFING')?.id || null

    await prisma.block.update({
      where: { id: logicBlock.id },
      data: {
        settings: {
          name: 'Logique conditionnelle',
          conditions: [
            {
              id: 'cond1',
              type: 'response',
              label: 'Si préfère Forêt → sauter la tâche externe',
              sourceCode: 'ChoixUnique1',
              operator: 'equals',
              value: 'foret',
              action: 'skip_to',
              targetBlockId: debriefId,
              description: 'Les participants ayant choisi "Forêt" passent directement au débriefing (exemple de logique par réponse).'
            },
            {
              id: 'cond2',
              type: 'condition',
              label: 'Condition intersujet : groupe contrôle → pas de tâche',
              sourceCode: '_condition',
              operator: 'equals',
              value: 'controle',
              action: 'skip_to',
              targetBlockId: debriefId,
              description: 'Les participants du groupe contrôle (assignés aléatoirement) sautent la tâche et vont directement au débriefing (exemple de logique intersujet).'
            },
          ]
        }
      }
    })
    console.log('  ✓ Bloc logique mis à jour (2 conditions : réponse + intersujet)')
  }

  console.log('\n═══ Harmonisation terminée ! ═══')
  await prisma.$disconnect()
}

main().catch((err) => {
  console.error(err)
  prisma.$disconnect()
  process.exit(1)
})
