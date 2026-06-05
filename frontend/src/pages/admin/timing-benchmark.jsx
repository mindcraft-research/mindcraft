// SPDX-License-Identifier: AGPL-3.0-or-later
//
// Page admin de validation de la précision temporelle de MindCraft.
// Suit strictement la méthodologie pré-spécifiée dans
// docs/timing-validation/01-methodology.md.
//
// Cette page n'est accessible qu'aux administrateur·rice·s (vérification
// côté client + le backend filtre déjà l'accès aux ressources sensibles).
// Elle ne touche pas à la base de données : tout le benchmark est
// 100 % client-side puisqu'il valide le pipeline JS+DOM du navigateur.

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/router'
import Link from 'next/link'
import Layout from '../../components/Layout'
import useAuthStore from '../../lib/authStore'
import { runBenchmark } from '../../lib/timing-benchmark/engine'
import { buildCSV, downloadCSV, detectClientConfig } from '../../lib/timing-benchmark/csv'
import { CITATION_DATA } from '../../lib/citation'

export default function TimingBenchmarkPage() {
  const router = useRouter()
  const { user, isLoading } = useAuthStore()

  useEffect(() => {
    if (!isLoading && (!user || user.role !== 'ADMIN')) router.push('/dashboard')
  }, [user, isLoading, router])

  // Configuration du run (valeurs par défaut alignées sur la méthodo)
  const [trialsPerCondition, setTrialsPerCondition] = useState(200)
  const [rtConditions, setRtConditions] = useState('200, 500, 800')
  const [itiMin, setItiMin] = useState(500)
  const [itiMax, setItiMax] = useState(1500)

  // Métadonnées que l'utilisateur·rice doit fournir (méthodo 4.4)
  const [userMeta, setUserMeta] = useState({
    os: '',
    browser: '',
    refresh_rate_hz: '',
    notes: '',
    mindcraft_version: CITATION_DATA.version,
    mindcraft_git_sha: '', // à remplir manuellement avant publication
  })

  // État d'exécution
  const [running, setRunning] = useState(false)
  const [progress, setProgress] = useState(null)
  const [result, setResult] = useState(null)
  const csvRef = useRef(null)

  const start = async () => {
    if (running) return
    if (!userMeta.os || !userMeta.browser || !userMeta.refresh_rate_hz) {
      alert('Renseigne au minimum OS, Browser et Refresh rate avant de lancer.')
      return
    }
    setRunning(true)
    setResult(null)
    setProgress({ trialIndex: 0, totalTrials: 0, condition: 0 })

    try {
      const conditions = rtConditions
        .split(',')
        .map((s) => parseInt(s.trim(), 10))
        .filter((n) => Number.isFinite(n) && n > 0)

      const runResult = await runBenchmark({
        trialsPerCondition: parseInt(trialsPerCondition, 10),
        rtConditionsMs: conditions,
        itiRangeMs: [parseInt(itiMin, 10), parseInt(itiMax, 10)],
        onProgress: (p) => setProgress(p),
      })

      const csv = buildCSV(runResult, userMeta)
      csvRef.current = csv
      setResult(runResult)
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error(err)
      alert('Erreur pendant le benchmark : ' + err.message)
    } finally {
      setRunning(false)
    }
  }

  const handleDownload = () => {
    if (!csvRef.current) return
    downloadCSV(csvRef.current)
  }

  if (isLoading || !user || user.role !== 'ADMIN') return null

  return (
    <Layout>
      <div style={{ maxWidth: 880, margin: '0 auto', padding: '24px 16px' }}>
        <h1 style={{ fontFamily: 'var(--font-heading)', fontSize: 24, marginBottom: 6 }}>
          Benchmark de précision temporelle
        </h1>
        <p style={{ color: 'var(--text-muted)', marginBottom: 24, fontSize: 14 }}>
          Outil interne de validation. Suit strictement la méthodologie pré-spécifiée dans{' '}
          <Link href="https://github.com/mindcraft-research/mindcraft/blob/main/docs/timing-validation/01-methodology.md"
                target="_blank" rel="noopener noreferrer" style={{ color: 'var(--brand)' }}>
            docs/timing-validation/01-methodology.md
          </Link>
          . Le résultat est un CSV à analyser avec le script Python du même dossier.
        </p>

        {/* ── Avertissements importants ─────────────────────────────── */}
        <div style={{
          background: 'var(--warning-pale, #fef3c7)',
          border: '1px solid var(--warning, #f59e0b)',
          padding: 12, borderRadius: 8, marginBottom: 24, fontSize: 13,
        }}>
          <strong>Avant de lancer :</strong>
          <ul style={{ marginTop: 6, marginBottom: 0, paddingLeft: 20 }}>
            <li>Ferme toutes les autres applications / onglets gourmands en CPU</li>
            <li>Désactive les extensions de navigateur (mode privé recommandé)</li>
            <li>Branche l'ordinateur sur secteur (mode performance maximale)</li>
            <li><strong>Désactive la mise en veille de l'écran ET de l'ordinateur</strong> (Paramètres &rarr; Système &rarr; Alimentation et batterie &rarr; mettre les deux délais sur « Jamais »). Une mise en veille pendant le run suspend le thread JS et fausse toutes les mesures.</li>
            <li>Coupe les notifications système (Windows : <code>Win + A</code> &rarr; « Ne pas déranger »)</li>
            <li>Ne touche pas au clavier / souris pendant le run</li>
            <li>L'overlay noir prendra tout l'écran — c'est normal</li>
            <li>Durée estimée : ~{Math.round((trialsPerCondition * rtConditions.split(',').length * (((+itiMax) + (+itiMin)) / 2 + 1000)) / 1000 / 60)} min</li>
          </ul>
        </div>

        {/* ── Configuration ──────────────────────────────────────────── */}
        <h2 style={{ fontSize: 16, marginBottom: 12 }}>Configuration du run</h2>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 24 }}>
          <Field label="Essais par condition" hint="Méthodo : 200">
            <input type="number" min="10" max="2000" value={trialsPerCondition}
              onChange={(e) => setTrialsPerCondition(e.target.value)} className="form-input" />
          </Field>
          <Field label="Conditions de RT (ms, séparées par virgule)" hint="Méthodo : 200, 500, 800">
            <input type="text" value={rtConditions}
              onChange={(e) => setRtConditions(e.target.value)} className="form-input" />
          </Field>
          <Field label="ITI min (ms)" hint="Méthodo : 500">
            <input type="number" min="100" max="5000" value={itiMin}
              onChange={(e) => setItiMin(e.target.value)} className="form-input" />
          </Field>
          <Field label="ITI max (ms)" hint="Méthodo : 1500">
            <input type="number" min="100" max="10000" value={itiMax}
              onChange={(e) => setItiMax(e.target.value)} className="form-input" />
          </Field>
        </div>

        {/* ── Métadonnées de configuration matérielle ─────────────── */}
        <h2 style={{ fontSize: 16, marginBottom: 12 }}>
          Configuration matérielle (obligatoire pour la traçabilité)
        </h2>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
          <Field label="OS (avec version)" hint="ex : Windows 11 23H2">
            <input type="text" value={userMeta.os}
              onChange={(e) => setUserMeta({ ...userMeta, os: e.target.value })} className="form-input" />
          </Field>
          <Field label="Browser (avec version)" hint="ex : Chrome 130.0.6723">
            <input type="text" value={userMeta.browser}
              onChange={(e) => setUserMeta({ ...userMeta, browser: e.target.value })} className="form-input" />
          </Field>
          <Field label="Refresh rate écran (Hz)" hint="60, 75, 120, 144…">
            <input type="number" min="30" max="500" value={userMeta.refresh_rate_hz}
              onChange={(e) => setUserMeta({ ...userMeta, refresh_rate_hz: e.target.value })} className="form-input" />
          </Field>
          <Field label="SHA Git de MindCraft (pour reproductibilité)" hint="git rev-parse HEAD">
            <input type="text" value={userMeta.mindcraft_git_sha}
              onChange={(e) => setUserMeta({ ...userMeta, mindcraft_git_sha: e.target.value })}
              placeholder="ex : f72701b" className="form-input" />
          </Field>
        </div>
        <Field label="Notes libres (optionnel)" hint="contexte particulier, anomalies observées…">
          <textarea rows={2} value={userMeta.notes}
            onChange={(e) => setUserMeta({ ...userMeta, notes: e.target.value })} className="form-input" />
        </Field>

        {/* ── Bouton de lancement / état d'avancement ────────────── */}
        <div style={{ marginTop: 24, display: 'flex', gap: 12, alignItems: 'center' }}>
          <button className="btn btn-primary" onClick={start} disabled={running}>
            {running ? 'Benchmark en cours…' : 'Lancer le benchmark'}
          </button>
          {result && (
            <button className="btn btn-secondary" onClick={handleDownload}>
              Télécharger le CSV
            </button>
          )}
        </div>

        {running && progress && (
          <div style={{ marginTop: 18 }}>
            <div style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 6 }}>
              Essai {progress.trialIndex + 1} / {progress.totalTrials} — condition {progress.condition} ms
            </div>
            <div style={{ height: 8, background: 'var(--gray-100)', borderRadius: 4, overflow: 'hidden' }}>
              <div style={{
                height: '100%',
                width: `${(progress.trialIndex / progress.totalTrials) * 100}%`,
                background: 'var(--brand)',
                transition: 'width 0.2s',
              }} />
            </div>
          </div>
        )}

        {result && (
          <div style={{
            marginTop: 24, padding: 16, background: 'var(--gray-50)',
            border: '1px solid var(--border)', borderRadius: 8,
          }}>
            <h2 style={{ fontSize: 16, marginBottom: 12 }}>Résultats bruts du run</h2>
            <table style={{ fontSize: 13, width: '100%' }}>
              <tbody>
                <tr><td><strong>Essais totaux</strong></td><td>{result.runMetadata.total_trials}</td></tr>
                <tr><td><strong>Essais exclus</strong></td>
                    <td>{result.runMetadata.excluded_trials} ({result.runMetadata.excluded_pct.toFixed(2)} %)</td></tr>
                <tr><td><strong>Run cassé ?</strong></td>
                    <td>{result.runMetadata.run_broken
                      ? <span style={{ color: 'var(--error)' }}>⚠ Oui (&gt; 5 % exclus, à relancer)</span>
                      : <span style={{ color: 'var(--success)' }}>Non</span>}</td></tr>
                <tr><td><strong>Durée du run</strong></td>
                    <td>{(result.runMetadata.duration_ms / 1000 / 60).toFixed(2)} min</td></tr>
              </tbody>
            </table>
            <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 12 }}>
              Les statistiques détaillées (moyennes, SD, IC bootstrap) sont calculées par le script
              d'analyse Python sur le CSV téléchargé — la méthodo interdit le calcul ad hoc dans
              l'UI pour éviter tout cherry-pick.
            </p>
          </div>
        )}
      </div>
    </Layout>
  )
}

function Field({ label, hint, children }) {
  return (
    <div>
      <label style={{ display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 4 }}>
        {label}
      </label>
      {children}
      {hint && <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>{hint}</div>}
    </div>
  )
}
