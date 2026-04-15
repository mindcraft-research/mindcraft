import { useState } from 'react'
import toast from 'react-hot-toast'
import styles from './PhysioPanel.module.css'

const PHYSIO_TOOLS = [
  { value: 'EEG', label: 'EEG (Électroencéphalographie)', examples: 'BrainVision Recorder, OpenBCI GUI, EEGLAB, NetStation' },
  { value: 'ECG', label: 'ECG (Électrocardiographie)', examples: 'BIOPAC AcqKnowledge, LabChart, Kubios HRV' },
  { value: 'EMG', label: 'EMG (Électromyographie)', examples: 'BIOPAC AcqKnowledge, Delsys Trigno, LabChart' },
  { value: 'EDA', label: 'EDA / GSR (Activité électrodermale)', examples: 'BIOPAC AcqKnowledge, Shimmer3, Ledalab' },
  { value: 'EYETRACKING', label: 'Eye-tracking', examples: 'Tobii Pro Lab, SR Research EyeLink, Pupil Labs' },
  { value: 'fNIRS', label: 'fNIRS (Spectroscopie proche infrarouge)', examples: 'NIRStar, Homer3, Aurora fNIRS' },
  { value: 'RESPIRATION', label: 'Respiration', examples: 'BIOPAC AcqKnowledge, ADInstruments LabChart' },
  { value: 'OTHER', label: 'Autre', examples: '' },
]

export default function PhysioPanel({ study, onSave }) {
  const initial = study?.metadata?.physio || {}
  const [config, setConfig] = useState({
    enabled: initial.enabled || false,
    tool: initial.tool || '',
    software: initial.software || '',
    softwareVersion: initial.softwareVersion || '',
    samplingRate: initial.samplingRate || '',
    notes: initial.notes || '',
    globalMarkers: initial.globalMarkers ?? true,
    lslEnabled: initial.lslEnabled || false,
    lslPort: initial.lslPort || 12345,
    markerStudyStart: initial.markerStudyStart || 'STUDY_START',
    markerStudyEnd: initial.markerStudyEnd || 'STUDY_END',
    markerBlockStart: initial.markerBlockStart || 'BLOCK_START',
    markerBlockEnd: initial.markerBlockEnd || 'BLOCK_END',
    markerQuestionShow: initial.markerQuestionShow || 'Q_SHOW',
    markerResponse: initial.markerResponse || 'Q_RESP',
  })
  const [saving, setSaving] = useState(false)

  const set = (k, v) => setConfig((p) => ({ ...p, [k]: v }))

  const handleSave = async () => {
    setSaving(true)
    try {
      await onSave(config)
      toast.success('Configuration physio sauvegardée')
    } catch {
      toast.error('Erreur lors de la sauvegarde')
    } finally {
      setSaving(false)
    }
  }

  const selectedTool = PHYSIO_TOOLS.find((t) => t.value === config.tool)

  return (
    <div className={styles.panel}>
      <div className={styles.header}>
        <h2 className={styles.title}>Mesures physiologiques</h2>
        <p className={styles.subtitle}>
          Configurez l'intégration avec vos outils d'acquisition physiologique (EEG, ECG, Eye-tracking, etc.)
        </p>
      </div>

      {/* ── Activation ─────────────────────────────────────────── */}
      <div className={styles.section}>
        <div className={styles.toggleRow}>
          <div>
            <span className={styles.toggleLabel}>Activer les mesures physiologiques</span>
            <span className={styles.toggleHint}>Les événements de l'étude seront horodatés avec une précision sub-milliseconde</span>
          </div>
          <button className={`${styles.toggle} ${config.enabled ? styles.toggleOn : ''}`} onClick={() => set('enabled', !config.enabled)} />
        </div>
      </div>

      {config.enabled && (
        <>
          {/* ── Horodatage ──────────────────────────────────────── */}
          <div className={styles.infoCard}>
            <div className={styles.infoIcon}>⏱</div>
            <div>
              <strong>Horodatage haute précision : toujours actif</strong>
              <p>Chaque événement (transition de bloc, affichage de question, réponse du participant, événements de tâche) est automatiquement horodaté via <code>performance.now()</code>. Ces timestamps sont inclus dans les données exportées et permettent un alignement post-hoc avec vos enregistrements physiologiques.</p>
            </div>
          </div>

          {/* ── Outil ──────────────────────────────────────────── */}
          <div className={styles.section}>
            <h3 className={styles.sectionTitle}>Équipement</h3>

            <div className={styles.field}>
              <label className={styles.fieldLabel}>Type d'outil physiologique</label>
              <select className={styles.select} value={config.tool} onChange={(e) => set('tool', e.target.value)}>
                <option value="">— Sélectionner —</option>
                {PHYSIO_TOOLS.map((t) => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </select>
              {selectedTool?.examples && (
                <span className={styles.fieldHint}>Logiciels courants : {selectedTool.examples}</span>
              )}
            </div>

            {config.tool && (
              <div className={styles.row}>
                <div className={styles.field}>
                  <label className={styles.fieldLabel}>Logiciel d'acquisition</label>
                  <input className={styles.input} value={config.software} onChange={(e) => set('software', e.target.value)}
                    placeholder={selectedTool?.examples?.split(',')[0]?.trim() || 'ex : BrainVision Recorder'} />
                </div>
                <div className={styles.field} style={{ maxWidth: 140 }}>
                  <label className={styles.fieldLabel}>Version</label>
                  <input className={styles.input} value={config.softwareVersion} onChange={(e) => set('softwareVersion', e.target.value)}
                    placeholder="ex : 2.2.1" />
                </div>
                <div className={styles.field} style={{ maxWidth: 160 }}>
                  <label className={styles.fieldLabel}>Fréq. échantillonnage</label>
                  <input className={styles.input} value={config.samplingRate} onChange={(e) => set('samplingRate', e.target.value)}
                    placeholder="ex : 500 Hz" />
                </div>
              </div>
            )}

            <div className={styles.field}>
              <label className={styles.fieldLabel}>Notes techniques (optionnel)</label>
              <textarea className={styles.textarea} value={config.notes} onChange={(e) => set('notes', e.target.value)}
                placeholder="Informations complémentaires : placement des électrodes, calibration, montage, filtres..." rows={3} />
            </div>
          </div>

          {/* ── Marqueurs LSL ─────────────────────────────────── */}
          <div className={styles.section}>
            <h3 className={styles.sectionTitle}>Marqueurs LSL (Lab Streaming Layer)</h3>
            <p className={styles.sectionDesc}>
              Les marqueurs sont envoyés en temps réel via WebSocket vers un serveur relay local qui les retransmet au flux LSL.
              Cela permet la synchronisation avec votre logiciel d'acquisition.
            </p>

            <div className={styles.toggleRow}>
              <div>
                <span className={styles.toggleLabel}>Activer les marqueurs LSL</span>
                <span className={styles.toggleHint}>Nécessite le script relay Python (voir documentation)</span>
              </div>
              <button className={`${styles.toggle} ${config.lslEnabled ? styles.toggleOn : ''}`} onClick={() => set('lslEnabled', !config.lslEnabled)} />
            </div>

            {config.lslEnabled && (
              <>
                <div className={styles.field} style={{ maxWidth: 200 }}>
                  <label className={styles.fieldLabel}>Port WebSocket du relay</label>
                  <input className={styles.input} type="number" value={config.lslPort ?? ''} onChange={(e) => set('lslPort', e.target.value === '' ? null : Number(e.target.value))} onBlur={() => { if (!config.lslPort) set('lslPort', 12345) }} />
                </div>

                <h4 className={styles.subsectionTitle}>Marqueurs globaux (tous les blocs)</h4>
                <p className={styles.fieldHint} style={{ marginBottom: 8 }}>
                  Envoyés automatiquement à chaque transition, même sans bloc Tâche.
                </p>
                <div className={styles.markerGrid}>
                  <div className={styles.markerField}>
                    <label>Début de l'étude</label>
                    <input className={styles.markerInput} value={config.markerStudyStart} onChange={(e) => set('markerStudyStart', e.target.value)} />
                  </div>
                  <div className={styles.markerField}>
                    <label>Fin de l'étude</label>
                    <input className={styles.markerInput} value={config.markerStudyEnd} onChange={(e) => set('markerStudyEnd', e.target.value)} />
                  </div>
                  <div className={styles.markerField}>
                    <label>Début d'un bloc</label>
                    <input className={styles.markerInput} value={config.markerBlockStart} onChange={(e) => set('markerBlockStart', e.target.value)} />
                  </div>
                  <div className={styles.markerField}>
                    <label>Fin d'un bloc</label>
                    <input className={styles.markerInput} value={config.markerBlockEnd} onChange={(e) => set('markerBlockEnd', e.target.value)} />
                  </div>
                  <div className={styles.markerField}>
                    <label>Affichage question</label>
                    <input className={styles.markerInput} value={config.markerQuestionShow} onChange={(e) => set('markerQuestionShow', e.target.value)} />
                  </div>
                  <div className={styles.markerField}>
                    <label>Réponse participant</label>
                    <input className={styles.markerInput} value={config.markerResponse} onChange={(e) => set('markerResponse', e.target.value)} />
                  </div>
                </div>

                <div className={styles.infoCard} style={{ marginTop: 12 }}>
                  <div className={styles.infoIcon}>💡</div>
                  <div>
                    <strong>Les marqueurs des blocs Tâche</strong> (fixation, stimulus, réponse, feedback) se configurent séparément dans les paramètres de chaque bloc Tâche.
                  </div>
                </div>
              </>
            )}
          </div>
        </>
      )}

      <button className={styles.saveBtn} onClick={handleSave} disabled={saving}>
        {saving ? 'Sauvegarde...' : 'Sauvegarder la configuration'}
      </button>
    </div>
  )
}
