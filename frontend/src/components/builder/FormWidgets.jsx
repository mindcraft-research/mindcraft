import styles from './BlockInspector.module.css'

export function Tooltip({ text }) {
  return (
    <span className={styles.tooltipWrap} title={text}>
      <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
        <circle cx="6.5" cy="6.5" r="5.5" stroke="currentColor" strokeWidth="1.1"/>
        <path d="M6.5 5.5v4M6.5 4v.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
      </svg>
    </span>
  )
}

export function Toggle({ value, onChange }) {
  return (
    <div
      className={`${styles.toggle} ${value ? styles.toggleOn : ''}`}
      onClick={() => onChange(!value)}
    />
  )
}
