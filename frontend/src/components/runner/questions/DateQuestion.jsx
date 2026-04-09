import styles from '../runner.module.css'

/**
 * Gère les formats : date | time | datetime | month
 * Settings lus : format, dateMode, timeMode, minDate, maxDate, fixedDate, minTime, maxTime, fixedTime
 * Valeur retournée :
 *   - format date/time/month → string ('2024-01-15' | '14:30' | '2024-01')
 *   - format datetime        → { date: 'YYYY-MM-DD', time: 'HH:MM' }
 */
export default function DateQuestion({ question, value, onChange }) {
  const s          = question.settings || {}
  const fmt        = s.format      || 'date'
  // Si mode fixed mais aucune valeur fixe renseignée → retomber en free
  const dateMode   = (s.dateMode === 'fixed' && !s.fixedDate) ? 'free' : (s.dateMode || 'free')
  const timeMode   = (s.timeMode === 'fixed' && !s.fixedTime) ? 'free' : (s.timeMode || 'free')
  const hasDate    = fmt === 'date' || fmt === 'datetime' || fmt === 'month'
  const hasTime    = fmt === 'time' || fmt === 'datetime'
  const isDatetime = fmt === 'datetime'

  // ── Valeurs courantes ────────────────────────────────────────────────────
  const dateVal = isDatetime ? (value?.date || '') : (value || '')
  const timeVal = isDatetime ? (value?.time || '') : (value || '')

  const setDate = (v) => {
    if (isDatetime) onChange({ ...(value || {}), date: v })
    else onChange(v)
  }
  const setTime = (v) => {
    if (isDatetime) onChange({ ...(value || {}), time: v })
    else onChange(v)
  }

  // ── Attributs min/max ou valeur fixe ────────────────────────────────────
  const dateAttrs = (() => {
    if (dateMode === 'range')  return { min: s.minDate || undefined, max: s.maxDate || undefined }
    if (dateMode === 'fixed')  return { value: s.fixedDate || '', readOnly: true, disabled: true }
    return {}
  })()

  const timeAttrs = (() => {
    if (timeMode === 'range') return { min: s.minTime || undefined, max: s.maxTime || undefined }
    if (timeMode === 'fixed') return { value: s.fixedTime || '', readOnly: true, disabled: true }
    return {}
  })()

  const inputType = fmt === 'month' ? 'month' : 'date'

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>

      {/* ── Champ date ────────────────────────────────────────────────────── */}
      {hasDate && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          {isDatetime && <label className={styles.dateFieldLabel}>Date</label>}
          {dateMode === 'fixed' ? (
            <div className={styles.dateFixed}>
              <svg width="14" height="14" viewBox="0 0 16 16" fill="none" style={{ flexShrink: 0 }}>
                <rect x="2" y="3" width="12" height="11" rx="2" stroke="currentColor" strokeWidth="1.3"/>
                <path d="M5 1v3M11 1v3M2 7h12" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
              </svg>
              <span>{s.fixedDate || '—'}</span>
            </div>
          ) : (
            <input
              className={styles.dateInput}
              type={inputType}
              value={dateMode === 'fixed' ? (s.fixedDate || '') : dateVal}
              onChange={(e) => setDate(e.target.value)}
              {...(dateMode === 'range' ? { min: s.minDate || undefined, max: s.maxDate || undefined } : {})}
            />
          )}
          {dateMode === 'range' && (s.minDate || s.maxDate) && (
            <span className={styles.dateHint}>
              {s.minDate && s.maxDate ? `Entre le ${s.minDate} et le ${s.maxDate}` :
               s.minDate ? `À partir du ${s.minDate}` :
               `Jusqu'au ${s.maxDate}`}
            </span>
          )}
        </div>
      )}

      {/* ── Champ heure ───────────────────────────────────────────────────── */}
      {hasTime && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          {isDatetime && <label className={styles.dateFieldLabel}>Heure</label>}
          {timeMode === 'fixed' ? (
            <div className={styles.dateFixed}>
              <svg width="14" height="14" viewBox="0 0 16 16" fill="none" style={{ flexShrink: 0 }}>
                <circle cx="8" cy="8" r="6" stroke="currentColor" strokeWidth="1.3"/>
                <path d="M8 5v3.5l2.5 1.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
              </svg>
              <span>{s.fixedTime || '—'}</span>
            </div>
          ) : (
            <input
              className={styles.dateInput}
              type="time"
              value={timeMode === 'fixed' ? (s.fixedTime || '') : timeVal}
              onChange={(e) => setTime(e.target.value)}
              {...(timeMode === 'range' ? { min: s.minTime || undefined, max: s.maxTime || undefined } : {})}
            />
          )}
          {timeMode === 'range' && (s.minTime || s.maxTime) && (
            <span className={styles.dateHint}>
              {s.minTime && s.maxTime ? `Entre ${s.minTime} et ${s.maxTime}` :
               s.minTime ? `À partir de ${s.minTime}` :
               `Avant ${s.maxTime}`}
            </span>
          )}
        </div>
      )}
    </div>
  )
}
