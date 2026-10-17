import { useState, useMemo, useEffect, useRef } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import api from '../../lib/api'
import { lireCsv, ecrireCsv } from '../../lib/csv'
import { creerZip } from '../../lib/zip'
import { genererReadme } from '../../lib/readmeDepot'
import { confirmDelete } from '../../lib/confirm'

// « Préparer le dépôt » (onglet Open Science) : rassemble dans une archive
// .zip ce qu'il faut déposer dans un entrepôt de données. Les fichiers sont
// produits par MindCraft, vérifiés et réglés par le chercheur (colonnes,
// exclusions, identifiants remplacés), complétés par ses propres fichiers,
// et l'archive est construite DANS LE NAVIGATEUR : les fichiers ajoutés ne
// sont jamais envoyés à MindCraft. MindCraft ne dépose rien lui-même : le
// chercheur dépose l'archive sur l'entrepôt de son choix. Une entrée
// automatique du cahier de labo garde la trace du paquet (fichiers,
// exclusions et leurs raisons).

export const ENTREPOTS = [
  { nom: 'Recherche Data Gouv', url: 'https://entrepot.recherche.data.gouv.fr', aide: 'L’entrepôt national français des données de recherche, souvent avec un espace pour votre établissement. Le choix par défaut en France.' },
  { nom: 'Nakala', url: 'https://nakala.fr', aide: 'L’entrepôt d’Huma-Num (CNRS) pour les sciences humaines et sociales.' },
  { nom: 'Zenodo', url: 'https://zenodo.org', aide: 'Entrepôt généraliste international (CERN), pratique pour les équipes hors de France.' },
]

// Colonnes du CSV questionnaire absentes de l'export par défaut : décochées
// au départ (cf. options de l'onglet Export).
const OPTIONNELLE = (h) => h === 'appareil' || h === 'version_etude' || h.startsWith('time_block_') || h.startsWith('rt_')
const HORODATAGE = ['allocatedAt', 'startedAt', 'completedAt']
const TYPES_LIBRES = ['TEXT', 'INPUT_DEMAND', 'FILL_BLANK', 'WORD_LIST', 'RADIO_COMMENT', 'CHECKBOX_COMMENT']
const ALERTES = {
  libre: 'réponse libre : à relire',
  DATE: 'date : peut identifier (date de naissance…)',
  RANDOM_CODE: 'code aléatoire',
  FILE_UPLOAD: 'fichier envoyé par le participant',
  META_INFO: 'navigateur, système, écran',
  horodatage: 'date et heure exactes',
}
const echapperRe = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
const taille = (n) => (n < 1024 ? `${n} o` : n < 1048576 ? `${Math.round(n / 102.4) / 10} Ko` : `${Math.round(n / 104857.6) / 10} Mo`)
const octetsDe = (c) => (c instanceof Uint8Array ? c : typeof c === 'string' ? new TextEncoder().encode(c) : new Uint8Array(c || []))
const slug = (s) => String(s || 'etude').normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^\w]+/g, '_').replace(/^_|_$/g, '').slice(0, 60)

function telecharger(blob, nom) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url; a.download = nom
  document.body.appendChild(a); a.click(); a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

export default function DepotPanel({ study, dataPrereg, prereg }) {
  const queryClient = useQueryClient()
  const id = study.id
  const verrouille = dataPrereg?.prereg?.status === 'LOCKED' && !dataPrereg?.prereg?.withdrawnAt

  const [ouvert, setOuvert] = useState(false)
  const [chargement, setChargement] = useState(false)
  const [brut, setBrut] = useState({}) // id → contenu produit par MindCraft (texte ou octets)
  const [inclus, setInclus] = useState({})
  const [remplaces, setRemplaces] = useState({}) // id → { nom, octets }
  const [ajoutes, setAjoutes] = useState([]) // [{ cle, nom, octets, description }]
  const [terminesSeulement, setTerminesSeulement] = useState(false)
  const [pseudonymiser, setPseudonymiser] = useState(true)
  const [colonnesExclues, setColonnesExclues] = useState(null) // Set, initialisé au chargement
  const [voirColonnes, setVoirColonnes] = useState(false)
  const [exclusions, setExclusions] = useState([]) // [{ participantId, raison }]
  const [nouvelleExcl, setNouvelleExcl] = useState({ participantId: '', raison: '' })
  const [readme, setReadme] = useState('')
  const [readmeModifie, setReadmeModifie] = useState(false)
  const [coches, setCoches] = useState({ libres: false, identification: false, droit: false })
  const [apercu, setApercu] = useState(null) // { titre, lignes? , texte? }
  const [envoi, setEnvoi] = useState(false)
  const [fait, setFait] = useState(null) // nom de l'archive téléchargée
  const refAjout = useRef(null)

  // ── Chargement des fichiers produits par MindCraft ──
  const lireTexte = async (url) => {
    try { const r = await api.get(url, { responseType: 'text', transformResponse: (x) => x }); return typeof r.data === 'string' ? r.data : '' } catch { return null }
  }
  const lireOctets = async (url) => {
    try { const r = await api.get(url, { responseType: 'arraybuffer' }); return new Uint8Array(r.data) } catch { return null }
  }
  const chargerDonnees = async (seulementTermines) => {
    const q = seulementTermines ? 'completed=1' : ''
    const [questionnaires, essais, taches] = await Promise.all([
      lireTexte(`/api/studies/${id}/export/csv?pageTimings=1&rt=1&device=1&studyVersion=1${q ? `&${q}` : ''}`),
      lireTexte(`/api/studies/${id}/export/csv-trials${q ? `?${q}` : ''}`),
      lireTexte(`/api/studies/${id}/export/csv-external${q ? `?${q}` : ''}`),
    ])
    return { questionnaires, essais, taches }
  }
  const charger = async () => {
    setOuvert(true)
    if (Object.keys(brut).length) return
    setChargement(true)
    try {
      const [donnees, codebook, structure, preregPdf, ecartsOdt, ecartsCsv, cahier] = await Promise.all([
        chargerDonnees(terminesSeulement),
        lireOctets(`/api/studies/${id}/export/codebook`),
        lireTexte(`/api/studies/${id}/export/json`),
        verrouille ? lireOctets(`/api/studies/${id}/prereg/pdf`) : null,
        verrouille ? lireOctets(`/api/studies/${id}/prereg/deviations/export?format=odt`) : null,
        verrouille ? lireTexte(`/api/studies/${id}/prereg/deviations/export?format=csv`) : null,
        lireOctets(`/api/studies/${id}/notebook/pdf`),
      ])
      const b = { ...donnees, codebook, structure, preregPdf, ecartsOdt, ecartsCsv, cahier }
      setBrut(b)
      const aDonnees = (t) => !!t && lireCsv(t).length > 1
      setInclus({
        questionnaires: aDonnees(b.questionnaires), essais: aDonnees(b.essais), taches: aDonnees(b.taches),
        codebook: !!codebook, structure: !!structure, preregPdf: !!preregPdf, ecartsOdt: !!ecartsOdt, ecartsCsv: false,
        cahier: false, // à relire avant de le déposer : décoché au départ
      })
      const entete = b.questionnaires ? lireCsv(b.questionnaires)[0] || [] : []
      setColonnesExclues(new Set(entete.filter(OPTIONNELLE)))
    } catch {
      toast.error('Les fichiers n’ont pas pu être préparés.')
    } finally {
      setChargement(false)
    }
  }
  const changerTermines = async (v) => {
    setTerminesSeulement(v)
    const d = await chargerDonnees(v)
    setBrut((b) => ({ ...b, ...d }))
  }

  // ── Données : exclusions, identifiants remplacés, colonnes ──
  const tables = useMemo(() => ({
    questionnaires: brut.questionnaires ? lireCsv(brut.questionnaires) : null,
    essais: brut.essais ? lireCsv(brut.essais) : null,
    taches: brut.taches ? lireCsv(brut.taches) : null,
  }), [brut.questionnaires, brut.essais, brut.taches])

  const tousLesIds = useMemo(() => {
    const ids = []
    for (const t of [tables.questionnaires, tables.essais, tables.taches]) {
      if (!t) continue
      for (const l of t.slice(1)) if (l[0] && !ids.includes(l[0])) ids.push(l[0])
    }
    return ids
  }, [tables])

  const exclus = useMemo(() => new Set(exclusions.map((e) => e.participantId)), [exclusions])
  const correspondance = useMemo(() => {
    const restants = tousLesIds.filter((p) => !exclus.has(p))
    const chiffres = Math.max(3, String(restants.length).length)
    return new Map(restants.map((p, i) => [p, `P${String(i + 1).padStart(chiffres, '0')}`]))
  }, [tousLesIds, exclus])

  // Alertes par colonne du CSV questionnaire, d'après le type des questions.
  const alertes = useMemo(() => {
    const questions = (study.blocks || []).flatMap((b) => b.questions || []).filter((q) => q.code)
    const res = {}
    for (const h of tables.questionnaires?.[0] || []) {
      if (HORODATAGE.includes(h)) { res[h] = ALERTES.horodatage; continue }
      if (h.startsWith('rt_') || h.startsWith('time_block_')) continue // durées, pas des réponses
      const q = questions.find((qq) => new RegExp(`(^|_)${echapperRe(qq.code)}($|_|\\d)`).test(h))
      if (!q) continue
      if (TYPES_LIBRES.includes(q.type)) res[h] = ALERTES.libre
      else if (ALERTES[q.type]) res[h] = ALERTES[q.type]
    }
    return res
  }, [tables.questionnaires, study.blocks])

  const traiter = (table, { colonnes = false } = {}) => {
    if (!table?.length) return null
    const [entete, ...lignes] = table
    const garder = entete.map((h, i) => i === 0 || !colonnes || !colonnesExclues?.has(h))
    const filtre = (l) => l.filter((_, i) => garder[i])
    const sortie = [filtre(entete)]
    for (const l of lignes) {
      if (exclus.has(l[0])) continue
      const copie = [...l]
      if (pseudonymiser) copie[0] = correspondance.get(l[0]) || l[0]
      sortie.push(filtre(copie))
    }
    return sortie
  }
  const traitees = useMemo(() => ({
    questionnaires: traiter(tables.questionnaires, { colonnes: true }),
    essais: traiter(tables.essais),
    taches: traiter(tables.taches),
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }), [tables, exclus, pseudonymiser, correspondance, colonnesExclues])

  // ── Liste des fichiers du paquet ──
  const nomEtude = slug(study.name)
  const fichiersGeneres = [
    { cle: 'questionnaires', nom: 'donnees_questionnaires.csv', description: 'Réponses aux questionnaires : une ligne par participant.', type: 'csv' },
    { cle: 'essais', nom: 'donnees_essais.csv', description: 'Essais des tâches (temps de réaction, réponses) : une ligne par essai.', type: 'csv' },
    { cle: 'taches', nom: 'donnees_taches_externes.csv', description: 'Données des tâches externes.', type: 'csv' },
    { cle: 'codebook', nom: 'codebook.pdf', description: 'Codebook : description de l’étude et de chaque variable.', type: 'pdf' },
    { cle: 'structure', nom: 'structure_etude.json', description: 'Structure complète de l’étude (blocs, questions, plan), réimportable dans MindCraft.', type: 'json' },
    { cle: 'preregPdf', nom: 'preenregistrement.pdf', description: 'Préenregistrement verrouillé sur MindCraft.', type: 'pdf' },
    { cle: 'ecartsOdt', nom: 'ecarts_preenregistrement.odt', description: 'Écarts au préenregistrement (texte, ODT).', type: 'odt' },
    { cle: 'ecartsCsv', nom: 'ecarts_preenregistrement.csv', description: 'Écarts au préenregistrement (tableau, CSV).', type: 'csv-brut' },
    { cle: 'cahier', nom: 'cahier_de_labo.pdf', description: 'Cahier de laboratoire : historique daté de l’étude.', avertissement: 'Relisez-le avant de le déposer : il peut citer des identifiants de participants ou des détails de passation.', type: 'pdf' },
  ].filter((f) => brut[f.cle] != null)

  const contenuFinal = (f) => {
    if (remplaces[f.cle]) return remplaces[f.cle].octets
    if (f.type === 'csv') return traitees[f.cle] ? ecrireCsv(traitees[f.cle]) : ''
    return brut[f.cle]
  }
  const sansDonnees = (f) => f.type === 'csv' && !remplaces[f.cle] && (!tables[f.cle] || tables[f.cle].length < 2)

  const nomsAjoutes = (() => {
    const pris = new Set(['README.md', ...fichiersGeneres.map((f) => f.nom)])
    return ajoutes.map((a) => {
      let nom = a.nom
      for (let i = 2; pris.has(nom); i++) nom = a.nom.replace(/(\.[^.]*)?$/, `_${i}$1`)
      pris.add(nom)
      return nom
    })
  })()
  const listePaquet = [
    { nom: 'README.md', description: 'Ce fichier : description du jeu de données.' },
    ...fichiersGeneres.filter((f) => inclus[f.cle] && !sansDonnees(f)).map((f) => ({ nom: f.nom, description: remplaces[f.cle] ? `${f.description} (version fournie par les auteurs)` : f.description })),
    ...ajoutes.map((a, i) => ({ nom: nomsAjoutes[i], description: a.description || '' })),
  ]

  // ── README : régénéré tant qu'il n'a pas été modifié à la main ──
  const nParticipants = traitees.questionnaires ? traitees.questionnaires.length - 1 : null
  const optionsReadme = {
    study, prereg, fichiers: listePaquet,
    donnees: {
      nParticipants, exclusions, pseudonymise: pseudonymiser, terminesSeulement,
      // Colonnes de l'export habituel décochées par le chercheur (les
      // colonnes facultatives, absentes par défaut, ne sont pas « retirées »).
      colonnesRetirees: inclus.questionnaires && !remplaces.questionnaires ? [...(colonnesExclues || [])].filter((h) => !OPTIONNELLE(h)) : [],
    },
  }
  const signatureReadme = JSON.stringify([listePaquet, nParticipants, exclusions, pseudonymiser, terminesSeulement, [...(colonnesExclues || [])], study.metadata, study.name, study.description, prereg])
  useEffect(() => {
    if (!ouvert || chargement || readmeModifie || !Object.keys(brut).length) return
    setReadme(genererReadme(optionsReadme))
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [signatureReadme, ouvert, chargement, readmeModifie])

  const regenerer = async () => {
    if (readmeModifie) {
      const ok = await confirmDelete({ title: 'Régénérer le README ?', what: 'vos modifications du README', detail: 'Le texte sera remplacé par celui produit à partir des métadonnées.', confirmLabel: 'Régénérer' })
      if (!ok) return
    }
    setReadmeModifie(false)
    setReadme(genererReadme(optionsReadme))
  }

  // ── Actions ──
  const lireFichier = (fichier) => new Promise((ok, ko) => {
    const r = new FileReader()
    r.onload = () => ok(new Uint8Array(r.result))
    r.onerror = ko
    r.readAsArrayBuffer(fichier)
  })
  const ajouterFichiers = async (liste) => {
    const nouveaux = []
    for (const f of [...liste]) nouveaux.push({ cle: `${Date.now()}-${f.name}-${Math.random()}`, nom: f.name, octets: await lireFichier(f), description: '' })
    setAjoutes((a) => [...a, ...nouveaux])
  }
  const remplacer = async (cle, fichier) => {
    if (!fichier) return
    setRemplaces((r) => ({ ...r, [cle]: { nom: fichier.name, octets: null } }))
    const octets = await lireFichier(fichier)
    setRemplaces((r) => ({ ...r, [cle]: { nom: fichier.name, octets } }))
    setInclus((i) => ({ ...i, [cle]: true }))
  }

  const voir = (f) => {
    if (f.type === 'csv' && !remplaces[f.cle]) {
      setApercu({ titre: f.nom, lignes: (traitees[f.cle] || []).slice(0, 16), total: (traitees[f.cle]?.length || 1) - 1 })
      return
    }
    const contenu = contenuFinal(f)
    if (f.type === 'pdf' && !remplaces[f.cle]) {
      const url = URL.createObjectURL(new Blob([contenu], { type: 'application/pdf' }))
      window.open(url, '_blank', 'noopener')
      setTimeout(() => URL.revokeObjectURL(url), 60000)
      return
    }
    if (f.type === 'json' || f.type === 'csv-brut' || remplaces[f.cle]) {
      const texte = typeof contenu === 'string' ? contenu : new TextDecoder().decode(contenu)
      if (f.type === 'odt' || f.type === 'pdf') { telecharger(new Blob([contenu]), f.nom); return }
      setApercu({ titre: f.nom, texte: texte.slice(0, 20000) })
      return
    }
    telecharger(new Blob([contenu]), f.nom) // ODT : pas d'aperçu dans le navigateur
  }

  const ajouterExclusion = () => {
    const pid = nouvelleExcl.participantId
    const raison = nouvelleExcl.raison.trim()
    if (!pid || !raison) { toast.error('Choisissez un participant et indiquez la raison de l’exclusion.'); return }
    setExclusions((e) => [...e.filter((x) => x.participantId !== pid), { participantId: pid, raison }])
    setNouvelleExcl({ participantId: '', raison: '' })
  }

  const telechargerCorrespondance = () => {
    const lignes = [['identifiant_mindcraft', 'numero_depose'], ...[...correspondance.entries()]]
    telecharger(new Blob([ecrireCsv(lignes)], { type: 'text/csv' }), `correspondance_identifiants_${nomEtude}_A_NE_PAS_DEPOSER.csv`)
  }

  const pret = coches.libres && coches.identification && coches.droit && readme.trim()
  const telechargerPaquet = async () => {
    if (!pret) return
    setEnvoi(true)
    try {
      const fichiers = [
        { nom: 'README.md', contenu: readme },
        ...fichiersGeneres.filter((f) => inclus[f.cle] && !sansDonnees(f)).map((f) => ({ nom: f.nom, contenu: octetsDe(contenuFinal(f)) })),
        ...ajoutes.map((a, i) => ({ nom: nomsAjoutes[i], contenu: a.octets })),
      ]
      const jour = new Date().toISOString().slice(0, 10)
      const nomArchive = `depot_${nomEtude}_${jour}.zip`
      telecharger(creerZip(fichiers), nomArchive)
      // Trace dans le cahier de labo (fichiers, exclusions et leurs raisons).
      try {
        await api.post(`/api/studies/${id}/notebook/depot`, {
          fichiers: fichiers.map((f) => f.nom), exclusions, pseudonymise: pseudonymiser, terminesSeulement,
        })
        queryClient.invalidateQueries({ queryKey: ['notebook', id] })
      } catch { /* lecteur du projet : pas d'écriture dans le cahier */ }
      setFait(nomArchive)
    } finally {
      setEnvoi(false)
    }
  }

  // ── Rendu ──
  const carte = { background: '#fff', border: '1px solid var(--gray-200)', borderRadius: 12, padding: '16px 18px', marginBottom: 14 }
  const titreEtape = { margin: '0 0 6px', fontSize: 14.5, fontWeight: 650 }
  const aide = { margin: '0 0 10px', fontSize: 12.5, color: 'var(--gray-500)', lineHeight: 1.5 }
  const enteteQ = tables.questionnaires?.[0] || []

  const blocEntrepots = (
    <div style={carte}>
      <h3 style={titreEtape}>Déposer</h3>
      <p style={aide}>Déposez l’archive vous-même sur l’entrepôt de votre choix : il attribue un DOI au jeu de données et le conserve. Une fois le dépôt publié, collez son lien dans « Données en ligne » (bouton Modifier, en haut de l’onglet) : l’étape « Science ouverte » passe alors à « fait ».</p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {ENTREPOTS.map((e) => (
          <div key={e.nom} style={{ fontSize: 13.5, lineHeight: 1.5 }}>
            <a href={e.url} target="_blank" rel="noopener noreferrer" style={{ fontWeight: 600, color: 'var(--brand)' }}>{e.nom}</a>
            <span style={{ color: 'var(--gray-600)' }}> — {e.aide}</span>
          </div>
        ))}
      </div>
    </div>
  )

  if (!ouvert) {
    return (
      <div style={{ marginTop: 24 }}>
        <div style={carte}>
          <h3 style={{ ...titreEtape, fontSize: 16 }}>Préparer le dépôt</h3>
          <p style={aide}>Rassemblez dans une archive (.zip) ce qu’il faut déposer dans un entrepôt de données : données, codebook, préenregistrement, README… Vous vérifiez chaque fichier, ajoutez vos scripts d’analyse, puis téléchargez l’archive. Vos fichiers restent sur votre ordinateur : l’archive est fabriquée dans votre navigateur.</p>
          <button type="button" className="btn btn-primary btn-sm" onClick={charger}>Préparer le dépôt</button>
        </div>
        {blocEntrepots}
      </div>
    )
  }

  return (
    <div style={{ marginTop: 24 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, margin: '0 0 12px' }}>
        <h3 style={{ margin: 0, fontSize: 16 }}>Préparer le dépôt</h3>
        <button type="button" className="btn btn-sm" onClick={() => setOuvert(false)}>Replier</button>
      </div>
      {chargement && <div style={{ ...carte, color: 'var(--gray-500)', fontSize: 13.5 }}>Préparation des fichiers…</div>}

      {!chargement && (
        <>
          {/* 1. Fichiers */}
          <div style={carte}>
            <h4 style={titreEtape}>1. Fichiers</h4>
            <p style={aide}>Cochez ce qu’il faut déposer. « Aperçu » montre le fichier tel qu’il sera dans l’archive ; « Remplacer » met votre propre version à la place (par exemple des données déjà nettoyées).</p>
            {fichiersGeneres.map((f) => {
              const vide = sansDonnees(f)
              const contenu = vide ? null : contenuFinal(f)
              return (
                <div key={f.cle} style={{ display: 'flex', gap: 10, alignItems: 'flex-start', padding: '8px 0', borderTop: '1px solid var(--gray-100)' }}>
                  <input type="checkbox" checked={!!inclus[f.cle] && !vide} disabled={vide} onChange={(e) => setInclus((i) => ({ ...i, [f.cle]: e.target.checked }))} style={{ marginTop: 3 }} aria-label={`Inclure ${f.nom}`} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13.5, fontWeight: 600, wordBreak: 'break-all' }}>
                      {f.nom}
                      {contenu && <span style={{ fontWeight: 400, color: 'var(--gray-400)', marginLeft: 8, fontSize: 12 }}>{taille(octetsDe(contenu).length)}</span>}
                    </div>
                    <div style={{ fontSize: 12.5, color: 'var(--gray-500)' }}>{vide ? 'Aucune donnée pour l’instant.' : f.description}</div>
                    {f.avertissement && <div style={{ fontSize: 12.5, color: '#92400e', marginTop: 2 }}>{f.avertissement}</div>}
                    {remplaces[f.cle] && (
                      <div style={{ fontSize: 12.5, color: '#1d4ed8', marginTop: 2 }}>
                        Remplacé par votre fichier « {remplaces[f.cle].nom} »{f.type === 'csv' ? ' (les réglages des données ci-dessous ne s’y appliquent pas)' : ''}.{' '}
                        <button type="button" className={undefined} style={{ border: 'none', background: 'none', padding: 0, color: 'var(--brand)', cursor: 'pointer', font: 'inherit' }} onClick={() => setRemplaces((r) => { const n = { ...r }; delete n[f.cle]; return n })}>Annuler</button>
                      </div>
                    )}
                  </div>
                  {!vide && <button type="button" className="btn btn-sm" onClick={() => voir(f)}>{f.type === 'odt' && !remplaces[f.cle] ? 'Télécharger' : 'Aperçu'}</button>}
                  <label className="btn btn-sm" style={{ cursor: 'pointer' }}>
                    Remplacer
                    <input type="file" style={{ display: 'none' }} onChange={(e) => { remplacer(f.cle, e.target.files?.[0]); e.target.value = '' }} />
                  </label>
                </div>
              )
            })}

            <div style={{ paddingTop: 10, borderTop: '1px solid var(--gray-100)' }}>
              <div style={{ fontSize: 13.5, fontWeight: 600, marginBottom: 4 }}>Vos fichiers</div>
              <p style={{ ...aide, marginBottom: 8 }}>Scripts d’analyse (R, Python, SPSS…), résultats, matériel, données nettoyées… Ils restent sur votre ordinateur et sont seulement ajoutés à l’archive. Décrivez-les en une phrase : la description figure dans le README.</p>
              {ajoutes.map((a, i) => (
                <div key={a.cle} style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 6, flexWrap: 'wrap' }}>
                  <span style={{ fontSize: 13, fontWeight: 600, minWidth: 160, wordBreak: 'break-all' }}>{nomsAjoutes[i]} <span style={{ fontWeight: 400, color: 'var(--gray-400)', fontSize: 12 }}>{a.octets ? taille(a.octets.length) : '…'}</span></span>
                  <input className="form-input" style={{ flex: 1, minWidth: 200, fontSize: 13 }} value={a.description} placeholder="Ex. Script R des analyses confirmatoires" onChange={(e) => setAjoutes((l) => l.map((x) => (x.cle === a.cle ? { ...x, description: e.target.value } : x)))} aria-label={`Description de ${a.nom}`} />
                  <button type="button" className="btn btn-sm" onClick={() => setAjoutes((l) => l.filter((x) => x.cle !== a.cle))} aria-label={`Retirer ${a.nom}`}>✕</button>
                </div>
              ))}
              <button type="button" className="btn btn-secondary btn-sm" onClick={() => refAjout.current?.click()}>+ Ajouter des fichiers</button>
              <input ref={refAjout} type="file" multiple style={{ display: 'none' }} onChange={(e) => { ajouterFichiers(e.target.files || []); e.target.value = '' }} />
            </div>
          </div>

          {/* 2. Données */}
          {(tables.questionnaires || tables.essais || tables.taches) && (
            <div style={carte}>
              <h4 style={titreEtape}>2. Données</h4>
              <p style={aide}>Ces réglages s’appliquent aux fichiers de données produits par MindCraft (pas à ceux que vous avez remplacés).</p>
              <label style={{ display: 'flex', gap: 8, alignItems: 'flex-start', fontSize: 13.5, marginBottom: 8 }}>
                <input type="checkbox" checked={terminesSeulement} onChange={(e) => changerTermines(e.target.checked)} style={{ marginTop: 3 }} />
                <span>Uniquement les participants ayant terminé</span>
              </label>
              <label style={{ display: 'flex', gap: 8, alignItems: 'flex-start', fontSize: 13.5, marginBottom: 4 }}>
                <input type="checkbox" checked={pseudonymiser} onChange={(e) => setPseudonymiser(e.target.checked)} style={{ marginTop: 3 }} />
                <span>Remplacer les identifiants des participants par des numéros (P001, P002…), les mêmes dans tous les fichiers. Recommandé : l’identifiant MindCraft peut être l’identifiant Prolific du participant.</span>
              </label>
              {pseudonymiser && correspondance.size > 0 && (
                <p style={{ ...aide, margin: '0 0 10px 24px' }}>
                  <button type="button" style={{ border: 'none', background: 'none', padding: 0, color: 'var(--brand)', cursor: 'pointer', font: 'inherit' }} onClick={telechargerCorrespondance}>Télécharger la table de correspondance</button>
                  {' '}(identifiant MindCraft → numéro), à garder pour vous : ne la déposez pas.
                </p>
              )}

              {enteteQ.length > 1 && (
                <div style={{ marginTop: 6 }}>
                  <button type="button" className="btn btn-sm" onClick={() => setVoirColonnes((v) => !v)} aria-expanded={voirColonnes}>
                    {voirColonnes ? 'Masquer les colonnes' : `Choisir les colonnes du fichier questionnaires (${enteteQ.length - 1 - (colonnesExclues?.size || 0)} sur ${enteteQ.length - 1})`}
                  </button>
                  {voirColonnes && (
                    <div style={{ marginTop: 8, maxHeight: 280, overflowY: 'auto', border: '1px solid var(--gray-100)', borderRadius: 8, padding: '6px 10px' }}>
                      {enteteQ.slice(1).map((h) => (
                        <label key={h} style={{ display: 'flex', gap: 8, alignItems: 'center', fontSize: 13, padding: '2px 0' }}>
                          <input type="checkbox" checked={!colonnesExclues?.has(h)} onChange={(e) => setColonnesExclues((s) => { const n = new Set(s); if (e.target.checked) n.delete(h); else n.add(h); return n })} />
                          <code style={{ fontSize: 12.5 }}>{h}</code>
                          {alertes[h] && <span style={{ fontSize: 11.5, color: '#92400e', background: '#fef3c7', borderRadius: 6, padding: '0 6px' }}>{alertes[h]}</span>}
                        </label>
                      ))}
                    </div>
                  )}
                </div>
              )}

              <div style={{ marginTop: 14 }}>
                <div style={{ fontSize: 13.5, fontWeight: 600, marginBottom: 4 }}>Exclure des participants</div>
                <p style={{ ...aide, marginBottom: 8 }}>Ils sont retirés de tous les fichiers de données de l’archive (rien n’est supprimé dans MindCraft). La raison est notée dans le README et dans le cahier de labo.</p>
                {exclusions.map((e) => (
                  <div key={e.participantId} style={{ display: 'flex', gap: 8, alignItems: 'center', fontSize: 13, marginBottom: 4 }}>
                    <code style={{ fontSize: 12.5 }}>{e.participantId}</code>
                    <span style={{ color: 'var(--gray-600)', flex: 1 }}>— {e.raison}</span>
                    <button type="button" className="btn btn-sm" onClick={() => setExclusions((l) => l.filter((x) => x.participantId !== e.participantId))} aria-label={`Ne plus exclure ${e.participantId}`}>✕</button>
                  </div>
                ))}
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  <select className="form-input" style={{ width: 230, fontSize: 13 }} value={nouvelleExcl.participantId} onChange={(e) => setNouvelleExcl((n) => ({ ...n, participantId: e.target.value }))} aria-label="Participant à exclure">
                    <option value="">— Participant —</option>
                    {tousLesIds.filter((p) => !exclus.has(p)).map((p) => <option key={p} value={p}>{p}{pseudonymiser && correspondance.get(p) ? ` (${correspondance.get(p)})` : ''}</option>)}
                  </select>
                  <input className="form-input" style={{ flex: 1, minWidth: 200, fontSize: 13 }} value={nouvelleExcl.raison} onChange={(e) => setNouvelleExcl((n) => ({ ...n, raison: e.target.value }))} placeholder="Raison (ex. consignes non respectées)" aria-label="Raison de l’exclusion" onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); ajouterExclusion() } }} />
                  <button type="button" className="btn btn-sm" onClick={ajouterExclusion}>Exclure</button>
                </div>
              </div>
            </div>
          )}

          {/* 3. README */}
          <div style={carte}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
              <h4 style={{ ...titreEtape, margin: 0 }}>3. README</h4>
              <button type="button" className="btn btn-sm" onClick={regenerer}>Régénérer à partir des métadonnées</button>
            </div>
            <p style={{ ...aide, marginTop: 6 }}>Le README décrit le jeu de données pour ceux qui le réutiliseront. Il reprend les informations de cet onglet (bouton Modifier, en haut) et la liste des fichiers. Modifiez-le librement ; complétez la citation une fois le DOI obtenu.</p>
            <textarea className="form-input" rows={14} style={{ width: '100%', resize: 'vertical', fontFamily: 'var(--font-mono, monospace)', fontSize: 12.5, lineHeight: 1.5 }} value={readme} onChange={(e) => { setReadme(e.target.value); setReadmeModifie(true) }} aria-label="Texte du README" />
          </div>

          {/* 4. Anonymat et téléchargement */}
          <div style={carte}>
            <h4 style={titreEtape}>4. Vérifier et télécharger</h4>
            <p style={aide}>Des données déposées en accès ouvert doivent être anonymes. Cochez pour confirmer :</p>
            {[
              ['libres', 'J’ai relu les réponses libres et retiré ce qui pourrait identifier quelqu’un (nom, lieu, détail personnel).'],
              ['identification', 'Les données restantes ne permettent pas de reconnaître un participant (pensez aux dates et heures exactes, à l’âge précis, à la ville, aux petits groupes).'],
              ['droit', 'J’ai le droit de déposer ces données : les participants y ont consenti, conformément à l’avis du comité d’éthique.'],
            ].map(([k, texte]) => (
              <label key={k} style={{ display: 'flex', gap: 8, alignItems: 'flex-start', fontSize: 13.5, marginBottom: 6 }}>
                <input type="checkbox" checked={coches[k]} onChange={(e) => setCoches((c) => ({ ...c, [k]: e.target.checked }))} style={{ marginTop: 3 }} />
                <span>{texte}</span>
              </label>
            ))}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, marginTop: 10, flexWrap: 'wrap' }}>
              <span style={{ fontSize: 12.5, color: 'var(--gray-500)' }}>{listePaquet.length} fichier{listePaquet.length > 1 ? 's' : ''} dans l’archive. Elle est fabriquée dans votre navigateur ; le cahier de labo garde la trace du paquet (fichiers, exclusions et leurs raisons).</span>
              <button type="button" className="btn btn-primary btn-sm" onClick={telechargerPaquet} disabled={!pret || envoi}>{envoi ? 'Préparation…' : 'Télécharger l’archive (.zip)'}</button>
            </div>
            {fait && <p style={{ margin: '10px 0 0', fontSize: 13, color: '#0f766e' }}>Archive « {fait} » téléchargée. Déposez-la sur l’entrepôt de votre choix (ci-dessous).</p>}
          </div>
        </>
      )}

      {blocEntrepots}

      {apercu && (
        <div role="dialog" aria-modal="true" aria-label={`Aperçu de ${apercu.titre}`} onClick={() => setApercu(null)} style={{ position: 'fixed', inset: 0, background: 'rgba(15, 23, 42, 0.45)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
          <div onClick={(e) => e.stopPropagation()} style={{ background: '#fff', borderRadius: 12, width: 'min(960px, 100%)', maxHeight: '85vh', display: 'flex', flexDirection: 'column' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', borderBottom: '1px solid var(--gray-100)' }}>
              <strong style={{ fontSize: 14, wordBreak: 'break-all' }}>{apercu.titre}</strong>
              <button type="button" className="btn btn-sm" onClick={() => setApercu(null)}>Fermer</button>
            </div>
            <div style={{ overflow: 'auto', padding: 16 }}>
              {apercu.lignes ? (
                <>
                  <p style={{ ...aide, marginTop: 0 }}>{apercu.total} ligne{apercu.total > 1 ? 's' : ''} de données{apercu.total > 15 ? ' ; les 15 premières sont affichées' : ''}.</p>
                  <table style={{ borderCollapse: 'collapse', fontSize: 12 }}>
                    <tbody>
                      {apercu.lignes.map((l, i) => (
                        <tr key={i} style={{ background: i === 0 ? 'var(--gray-50)' : undefined }}>
                          {l.map((c, j) => <td key={j} style={{ border: '1px solid var(--gray-200)', padding: '3px 6px', whiteSpace: 'nowrap', maxWidth: 260, overflow: 'hidden', textOverflow: 'ellipsis', fontWeight: i === 0 ? 600 : 400 }} title={c}>{c}</td>)}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </>
              ) : (
                <pre style={{ margin: 0, fontSize: 12, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>{apercu.texte}</pre>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
