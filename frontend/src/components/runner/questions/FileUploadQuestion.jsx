import { useState } from 'react'
import styles from '../runner.module.css'

export default function FileUploadQuestion({ question, value, onChange }) {
  const settings = question.settings || {}
  const maxFiles = settings.maxFiles || 1
  const accept = settings.accept || ''
  const [files, setFiles] = useState([])

  const handleFiles = (e) => {
    const selected = Array.from(e.target.files || [])
    setFiles(selected)
    onChange(selected.map((f) => f.name).join(', '))
  }

  return (
    <div className={styles.fileUploadWrap}>
      <label className={styles.fileUploadLabel}>
        <input
          type="file"
          multiple={maxFiles > 1}
          accept={accept}
          onChange={handleFiles}
          style={{ display: 'none' }}
        />
        <div className={styles.fileUploadZone}>
          <svg width="32" height="32" viewBox="0 0 32 32" fill="none" style={{ color: 'var(--gray-400)' }}>
            <path d="M16 6v14M10 12l6-6 6 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M6 22v2a2 2 0 002 2h16a2 2 0 002-2v-2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
          </svg>
          <span style={{ fontSize: 14, color: 'var(--gray-500)', marginTop: 8 }}>
            Cliquez pour choisir {maxFiles > 1 ? 'des fichiers' : 'un fichier'}
          </span>
          {accept && (
            <span style={{ fontSize: 11, color: 'var(--gray-400)', marginTop: 4 }}>
              Formats accept&eacute;s : {accept}
            </span>
          )}
        </div>
      </label>
      {files.length > 0 && (
        <div style={{ marginTop: 8, display: 'flex', flexDirection: 'column', gap: 4 }}>
          {files.map((f, i) => (
            <div key={i} style={{ fontSize: 13, color: 'var(--gray-600)', display: 'flex', gap: 6, alignItems: 'center' }}>
              <span>{f.name}</span> <span style={{ color: 'var(--gray-400)', fontSize: 11 }}>({(f.size / 1024).toFixed(0)} Ko)</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
