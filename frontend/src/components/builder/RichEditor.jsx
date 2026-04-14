import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import TextAlign from '@tiptap/extension-text-align'
import { Color } from '@tiptap/extension-color'
import TextStyle from '@tiptap/extension-text-style'
import Link from '@tiptap/extension-link'
import Underline from '@tiptap/extension-underline'
import { Extension } from '@tiptap/core'
import { useEffect } from 'react'
import styles from './RichEditor.module.css'

const COLORS = ['#0D1B2A','#2563EB','#0F766E','#E85D04','#DC2626','#7C3AED','#64748B']
const FONT_SIZES = [
  { value: '12px', label: '12' },
  { value: '14px', label: '14' },
  { value: '16px', label: '16' },
  { value: '18px', label: '18' },
  { value: '20px', label: '20' },
  { value: '24px', label: '24' },
  { value: '28px', label: '28' },
  { value: '32px', label: '32' },
]

// Extension custom pour la taille de police via TextStyle
const FontSize = Extension.create({
  name: 'fontSize',
  addGlobalAttributes() {
    return [{
      types: ['textStyle'],
      attributes: {
        fontSize: {
          default: null,
          parseHTML: el => el.style.fontSize || null,
          renderHTML: attrs => attrs.fontSize ? { style: `font-size: ${attrs.fontSize}` } : {},
        },
      },
    }]
  },
  addCommands() {
    return {
      setFontSize: (size) => ({ chain }) =>
        chain().setMark('textStyle', { fontSize: size }).run(),
      unsetFontSize: () => ({ chain }) =>
        chain().setMark('textStyle', { fontSize: null }).removeEmptyTextStyle().run(),
    }
  },
})

export default function RichEditor({ value, onChange, compact = false }) {
  const editor = useEditor({
    extensions: [
      StarterKit,
      TextAlign.configure({ types: ['heading', 'paragraph'] }),
      TextStyle,
      Color,
      FontSize,
      Underline,
      Link.configure({ openOnClick: false }),
    ],
    content: value || '',
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML())
    },
  })

  useEffect(() => {
    if (editor && value !== editor.getHTML()) {
      editor.commands.setContent(value || '', false)
    }
  }, [value])

  if (!editor) return null

  const btn = (active, action, title, children) => (
    <button
      type="button"
      className={`${styles.toolBtn} ${active ? styles.toolBtnActive : ''}`}
      onClick={action}
      title={title}
    >
      {children}
    </button>
  )

  const setLink = () => {
    const url = window.prompt('URL du lien :')
    if (url) editor.chain().focus().setLink({ href: url }).run()
    else editor.chain().focus().unsetLink().run()
  }

  return (
    <div className={styles.wrap}>
      <div className={styles.toolbar}>

        {/* ── Titres (mode complet uniquement) */}
        {!compact && (
          <>
            <div className={styles.group}>
              {btn(editor.isActive('heading', { level: 1 }), () => editor.chain().focus().toggleHeading({ level: 1 }).run(), 'Titre 1', 'H1')}
              {btn(editor.isActive('heading', { level: 2 }), () => editor.chain().focus().toggleHeading({ level: 2 }).run(), 'Titre 2', 'H2')}
              {btn(editor.isActive('heading', { level: 3 }), () => editor.chain().focus().toggleHeading({ level: 3 }).run(), 'Titre 3', 'H3')}
            </div>
            <div className={styles.sep} />
          </>
        )}

        {/* ── Taille de police */}
        <select
          className={styles.fontSizeSelect}
          value={editor.getAttributes('textStyle').fontSize || ''}
          onChange={e => {
            if (e.target.value) editor.chain().focus().setFontSize(e.target.value).run()
            else editor.chain().focus().unsetFontSize().run()
          }}
          title="Taille de police"
        >
          <option value="">Taille</option>
          {FONT_SIZES.map(s => (
            <option key={s.value} value={s.value}>{s.label}</option>
          ))}
        </select>
        <div className={styles.sep} />

        {/* ── Formatage : gras / italique / souligné */}
        <div className={styles.group}>
          {btn(editor.isActive('bold'),      () => editor.chain().focus().toggleBold().run(),      'Gras',     <strong>G</strong>)}
          {btn(editor.isActive('italic'),    () => editor.chain().focus().toggleItalic().run(),    'Italique', <em>I</em>)}
          {btn(editor.isActive('underline'), () => editor.chain().focus().toggleUnderline().run(), 'Souligné', <u>S</u>)}
        </div>
        <div className={styles.sep} />

        {/* ── Alignement */}
        <div className={styles.group}>
          {btn(editor.isActive({ textAlign: 'left' }),   () => editor.chain().focus().setTextAlign('left').run(),   'Aligner à gauche',
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M1 3h12M1 7h8M1 11h10" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/></svg>)}
          {btn(editor.isActive({ textAlign: 'center' }), () => editor.chain().focus().setTextAlign('center').run(), 'Centrer',
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M1 3h12M3 7h8M2 11h10" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/></svg>)}
          {btn(editor.isActive({ textAlign: 'right' }),  () => editor.chain().focus().setTextAlign('right').run(),  'Aligner à droite',
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M1 3h12M5 7h8M3 11h10" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/></svg>)}
          {btn(editor.isActive({ textAlign: 'justify' }), () => editor.chain().focus().setTextAlign('justify').run(), 'Justifier',
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M1 3h12M1 7h12M1 11h12" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/></svg>)}
        </div>

        {/* ── Listes + Lien (mode complet uniquement) */}
        {!compact && (
          <>
            <div className={styles.sep} />
            <div className={styles.group}>
              {btn(editor.isActive('bulletList'),  () => editor.chain().focus().toggleBulletList().run(),  'Liste à puces',
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><circle cx="2" cy="4" r="1.2" fill="currentColor"/><circle cx="2" cy="8" r="1.2" fill="currentColor"/><circle cx="2" cy="12" r="1.2" fill="currentColor"/><path d="M5 4h8M5 8h8M5 12h8" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/></svg>)}
              {btn(editor.isActive('orderedList'), () => editor.chain().focus().toggleOrderedList().run(), 'Liste numérotée',
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><text x="0" y="5" fontSize="5" fill="currentColor">1.</text><text x="0" y="9" fontSize="5" fill="currentColor">2.</text><text x="0" y="13" fontSize="5" fill="currentColor">3.</text><path d="M5 4h8M5 8h8M5 12h8" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/></svg>)}
            </div>
            <div className={styles.sep} />
            <div className={styles.group}>
              {btn(editor.isActive('link'), setLink, 'Lien',
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M5.5 8.5a3.5 3.5 0 0 0 5 0l2-2a3.5 3.5 0 0 0-5-5L6 3" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/><path d="M8.5 5.5a3.5 3.5 0 0 0-5 0l-2 2a3.5 3.5 0 0 0 5 5L8 11" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/></svg>)}
            </div>
          </>
        )}

        <div className={styles.sep} />

        {/* ── Couleurs */}
        <div className={styles.group}>
          {COLORS.map((c) => (
            <button
              key={c}
              type="button"
              className={styles.colorBtn}
              style={{ background: c }}
              onClick={() => editor.chain().focus().setColor(c).run()}
              title={`Couleur ${c}`}
            />
          ))}
          <button
            type="button"
            className={styles.colorBtn}
            style={{ background: 'transparent', border: '1.5px solid var(--gray-300)' }}
            onClick={() => editor.chain().focus().unsetColor().run()}
            title="Couleur par défaut"
          >
            <svg width="10" height="10" viewBox="0 0 10 10"><path d="M1 1l8 8M9 1L1 9" stroke="var(--gray-400)" strokeWidth="1.5" strokeLinecap="round"/></svg>
          </button>
        </div>

      </div>
      <EditorContent editor={editor} className={`${styles.editor} ${compact ? styles.editorCompact : ''}`} />
    </div>
  )
}
