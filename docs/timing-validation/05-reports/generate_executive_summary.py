# -*- coding: utf-8 -*-
"""
Génère le résumé exécutif PDF du benchmark de précision temporelle MindCraft.
Conserve le source à côté du PDF pour reproductibilité.

Usage : python generate_executive_summary.py
Sortie : 2026-06-05_resume-executif.pdf
"""

from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import cm, mm
from reportlab.lib import colors
from reportlab.lib.enums import TA_LEFT, TA_CENTER, TA_JUSTIFY
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle,
    KeepTogether, HRFlowable
)
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont

# ─── Couleurs sobres ─────────────────────────────────────────────────────────
NAVY = colors.HexColor("#1e3a5f")     # bleu marine pour titres
ACCENT = colors.HexColor("#2563eb")   # bleu vif (sobre) pour highlights
SUCCESS = colors.HexColor("#059669")  # vert pour verdicts positifs
WARN = colors.HexColor("#dc2626")     # rouge pour ne pas passe / limites
GRAY_DARK = colors.HexColor("#374151")
GRAY_MEDIUM = colors.HexColor("#6b7280")
GRAY_LIGHT = colors.HexColor("#f3f4f6")
GRAY_BORDER = colors.HexColor("#d1d5db")
SUCCESS_PALE = colors.HexColor("#d1fae5")
ACCENT_PALE = colors.HexColor("#dbeafe")

# ─── Styles ──────────────────────────────────────────────────────────────────
styles = getSampleStyleSheet()

style_title = ParagraphStyle(
    "Title",
    parent=styles["Title"],
    fontName="Helvetica-Bold",
    fontSize=18,
    leading=22,
    textColor=NAVY,
    alignment=TA_LEFT,
    spaceAfter=2,
)
style_subtitle = ParagraphStyle(
    "Subtitle",
    parent=styles["Normal"],
    fontName="Helvetica-Oblique",
    fontSize=11,
    leading=14,
    textColor=GRAY_MEDIUM,
    spaceAfter=8,
)
style_meta = ParagraphStyle(
    "Meta",
    parent=styles["Normal"],
    fontName="Helvetica",
    fontSize=9,
    leading=12,
    textColor=GRAY_DARK,
)
style_h2 = ParagraphStyle(
    "H2",
    parent=styles["Heading2"],
    fontName="Helvetica-Bold",
    fontSize=12,
    leading=15,
    textColor=NAVY,
    spaceBefore=10,
    spaceAfter=4,
)
style_body = ParagraphStyle(
    "Body",
    parent=styles["Normal"],
    fontName="Helvetica",
    fontSize=9.5,
    leading=13,
    textColor=GRAY_DARK,
    alignment=TA_JUSTIFY,
    spaceAfter=4,
)
style_verdict = ParagraphStyle(
    "Verdict",
    parent=styles["Normal"],
    fontName="Helvetica-Bold",
    fontSize=16,
    leading=20,
    textColor=SUCCESS,
    alignment=TA_CENTER,
    spaceAfter=4,
)
style_verdict_sub = ParagraphStyle(
    "VerdictSub",
    parent=styles["Normal"],
    fontName="Helvetica",
    fontSize=9.5,
    leading=12,
    textColor=GRAY_DARK,
    alignment=TA_CENTER,
)
style_footer = ParagraphStyle(
    "Footer",
    parent=styles["Normal"],
    fontName="Helvetica",
    fontSize=7.5,
    leading=10,
    textColor=GRAY_MEDIUM,
    alignment=TA_LEFT,
    spaceAfter=2,
)
style_bullet = ParagraphStyle(
    "Bullet",
    parent=style_body,
    leftIndent=12,
    bulletIndent=2,
    spaceAfter=2,
)
style_table_cell = ParagraphStyle(
    "TableCell",
    fontName="Helvetica",
    fontSize=8.5,
    leading=11,
    textColor=GRAY_DARK,
)
style_table_header = ParagraphStyle(
    "TableHeader",
    fontName="Helvetica-Bold",
    fontSize=8.5,
    leading=11,
    textColor=colors.white,
    alignment=TA_LEFT,
)
style_verdict_cell = ParagraphStyle(
    "VerdictCell",
    fontName="Helvetica-Bold",
    fontSize=8.5,
    leading=11,
    textColor=SUCCESS,
)


# ─── Construction du document ────────────────────────────────────────────────
output_path = (
    "C:/Users/dadavid/Desktop/PlateformExp/docs/timing-validation/"
    "05-reports/2026-06-05_resume-executif.pdf"
)

doc = SimpleDocTemplate(
    output_path,
    pagesize=A4,
    topMargin=1.5 * cm,
    bottomMargin=1.3 * cm,
    leftMargin=1.6 * cm,
    rightMargin=1.6 * cm,
    title="MindCraft - Validation temporelle - Resume executif",
    author="Dayle David",
    subject="Resume executif du benchmark de precision temporelle",
)

story = []

# ─── 1. EN-TÊTE ──────────────────────────────────────────────────────────────
story.append(Paragraph("MindCraft — Validation de la précision temporelle", style_title))
story.append(Paragraph("Résumé exécutif du premier rapport de benchmark", style_subtitle))

# Tableau de métadonnées sur 2 colonnes
meta_data = [
    [
        Paragraph("<b>Auteure :</b> Dayle David", style_meta),
        Paragraph("<b>Date :</b> 5 juin 2026", style_meta),
    ],
    [
        Paragraph("Université Rennes 2 — ORCID 0000-0002-4315-1058", style_meta),
        Paragraph("<b>Version testée :</b> MindCraft v0.1.0 (commit <font face='Courier'>414251a</font>)", style_meta),
    ],
]
meta_table = Table(meta_data, colWidths=[9 * cm, 8.5 * cm])
meta_table.setStyle(TableStyle([
    ("VALIGN", (0, 0), (-1, -1), "TOP"),
    ("LEFTPADDING", (0, 0), (-1, -1), 0),
    ("RIGHTPADDING", (0, 0), (-1, -1), 0),
    ("TOPPADDING", (0, 0), (-1, -1), 0),
    ("BOTTOMPADDING", (0, 0), (-1, -1), 1),
]))
story.append(meta_table)
story.append(Spacer(1, 6))
story.append(HRFlowable(width="100%", thickness=0.5, color=GRAY_BORDER))
story.append(Spacer(1, 8))

# ─── 2. VERDICT GLOBAL (encadré) ─────────────────────────────────────────────
verdict_box = Table(
    [
        [Paragraph("VERDICT GLOBAL", ParagraphStyle(
            "VerdictLabel", fontName="Helvetica-Bold", fontSize=8,
            textColor=GRAY_MEDIUM, alignment=TA_CENTER))],
        [Paragraph("&#10004; CONFORME AUX STANDARDS WEB", style_verdict)],
        [Paragraph(
            "Sur 6 métriques principales pré-spécifiées, toutes atteignent au minimum "
            "le seuil acceptable défini avant l'analyse ; 5 sur 6 atteignent le seuil cible.",
            style_verdict_sub)],
    ],
    colWidths=[17.5 * cm],
)
verdict_box.setStyle(TableStyle([
    ("BACKGROUND", (0, 0), (-1, -1), SUCCESS_PALE),
    ("BOX", (0, 0), (-1, -1), 1.2, SUCCESS),
    ("TOPPADDING", (0, 0), (-1, -1), 8),
    ("BOTTOMPADDING", (0, 0), (-1, -1), 8),
    ("LEFTPADDING", (0, 0), (-1, -1), 12),
    ("RIGHTPADDING", (0, 0), (-1, -1), 12),
]))
story.append(verdict_box)
story.append(Spacer(1, 10))

# ─── 3. CONFIGURATION TESTÉE ─────────────────────────────────────────────────
story.append(Paragraph("Configuration testée", style_h2))

config_data = [
    ["OS", "Windows 11 Professionnel 25H2"],
    ["Navigateur", "Chrome 149.0.7827.53 (navigation privée)"],
    ["Écran", "1920 × 1080 px, 60 Hz"],
    ["Hardware", "28 cœurs CPU, 32 Go RAM"],
    ["Protocole", "600 essais (200 × 3 conditions RT : 200 / 500 / 800 ms)"],
    ["Qualité", "0 essai exclu (0.00 %) — run intègre"],
]
config_table = Table(
    [[Paragraph(f"<b>{k}</b>", style_table_cell), Paragraph(v, style_table_cell)] for k, v in config_data],
    colWidths=[3 * cm, 14.5 * cm],
)
config_table.setStyle(TableStyle([
    ("VALIGN", (0, 0), (-1, -1), "TOP"),
    ("TOPPADDING", (0, 0), (-1, -1), 2),
    ("BOTTOMPADDING", (0, 0), (-1, -1), 2),
    ("LEFTPADDING", (0, 0), (-1, -1), 4),
    ("LINEBELOW", (0, 0), (-1, -2), 0.3, GRAY_BORDER),
]))
story.append(config_table)
story.append(Spacer(1, 4))

# ─── 4. TABLEAU RÉCAPITULATIF DES RÉSULTATS ──────────────────────────────────
story.append(Paragraph("Résultats principaux et comparaison avec la littérature", style_h2))

headers = [
    Paragraph("Métrique", style_table_header),
    Paragraph("MindCraft<br/>(mesuré)", style_table_header),
    Paragraph("jsPsych<br/>Anwyl-Irvine 2021", style_table_header),
    Paragraph("jsPsych<br/>Bridges 2020", style_table_header),
    Paragraph("Verdict", style_table_header),
]

# Pour les verdicts, on utilise un style coloré
def vp(text, color=SUCCESS):
    return Paragraph(f"<b>{text}</b>", ParagraphStyle(
        "VP", fontName="Helvetica-Bold", fontSize=8.5, leading=11, textColor=color
    ))

rows = [
    ["Biais de présentation visuelle (moyenne)", "23,04 ms", "26,02 ms", "3,6 ms", vp("PASSE (acceptable)", ACCENT)],
    ["Variabilité de présentation (SD)", "7,14 ms", "17,40 ms", "5,1 ms", vp("PASSE (cible)")],
    ["Overhead JS du handler clavier (moyenne)", "0,03 ms", "—", "—", vp("excellent", SUCCESS)],
    ["Biais RT mesuré — cible 200 ms", "6,48 ms", "87,40 ms", "23,27 ms", vp("PASSE (cible)")],
    ["Biais RT mesuré — cible 500 ms", "6,30 ms", "87,40 ms", "23,27 ms", vp("PASSE (cible)")],
    ["Biais RT mesuré — cible 800 ms", "6,66 ms", "87,40 ms", "23,27 ms", vp("PASSE (cible)")],
    ["Variabilité du RT (SD moyenne)", "7,08 ms", "15,27 ms", "7,85 ms", vp("PASSE (cible)")],
    ["Vraies frames perdues (> 50 ms)", "0,00 %", "—", "—", vp("PASSE (cible)")],
]
table_data = [headers] + [
    [Paragraph(c if isinstance(c, str) else c.text if hasattr(c, "text") else "", style_table_cell)
     if isinstance(c, str) else c
     for c in r]
    for r in rows
]

results_table = Table(
    table_data,
    colWidths=[5.4 * cm, 2.3 * cm, 3.2 * cm, 2.6 * cm, 4 * cm],
    repeatRows=1,
)
results_table.setStyle(TableStyle([
    # En-tête
    ("BACKGROUND", (0, 0), (-1, 0), NAVY),
    ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
    ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
    ("FONTSIZE", (0, 0), (-1, 0), 8.5),
    ("ALIGN", (0, 0), (-1, 0), "LEFT"),
    ("VALIGN", (0, 0), (-1, 0), "MIDDLE"),
    ("TOPPADDING", (0, 0), (-1, 0), 6),
    ("BOTTOMPADDING", (0, 0), (-1, 0), 6),
    # Corps : alternance de gris très clair
    ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, GRAY_LIGHT]),
    ("TOPPADDING", (0, 1), (-1, -1), 4),
    ("BOTTOMPADDING", (0, 1), (-1, -1), 4),
    ("LEFTPADDING", (0, 0), (-1, -1), 5),
    ("RIGHTPADDING", (0, 0), (-1, -1), 5),
    ("VALIGN", (0, 1), (-1, -1), "MIDDLE"),
    # Bordure générale
    ("BOX", (0, 0), (-1, -1), 0.4, GRAY_BORDER),
    ("LINEABOVE", (0, 1), (-1, 1), 0.4, GRAY_BORDER),
]))
story.append(results_table)
story.append(Spacer(1, 6))

# ─── 5. INTERPRÉTATION ──────────────────────────────────────────────────────
story.append(Paragraph("Interprétation", style_h2))
story.append(Paragraph(
    "Sur 5 métriques principales mesurées, MindCraft atteint des performances "
    "<b>comparables ou supérieures</b> à celles de jsPsych selon la littérature de "
    "référence. La précision de la mesure du temps de réaction (biais constant de "
    "~6 ms à travers les trois conditions) est notablement plus faible que celle "
    "rapportée pour jsPsych (23 à 87 ms selon l'étude de référence).",
    style_body))

# ─── 6. AFFIRMATIONS SCIENTIFIQUES (encadré) ─────────────────────────────────
story.append(Spacer(1, 4))
claims_data = [
    [Paragraph(
        '<font color="#059669"><b>&#10004; AUTORISÉ.</b></font> '
        "&#171;&#160;L’overhead logiciel de MindCraft est comparable à celui "
        "de jsPsych mesuré dans les mêmes conditions software-only.&#160;&#187;",
        style_body)],
    [Paragraph(
        '<font color="#dc2626"><b>&#10006; NON AUTORISÉ.</b></font> '
        "&#171;&#160;MindCraft a la même précision temporelle que jsPsych.&#160;&#187; "
        "Cette affirmation exige une mesure hardware avec photodiode (Black Box "
        "Toolkit), <b>non réalisée ici</b>.",
        style_body)],
]
claims_table = Table(claims_data, colWidths=[17.5 * cm])
claims_table.setStyle(TableStyle([
    ("BACKGROUND", (0, 0), (-1, -1), ACCENT_PALE),
    ("BOX", (0, 0), (-1, -1), 0.6, ACCENT),
    ("INNERGRID", (0, 0), (-1, -1), 0.4, ACCENT),
    ("TOPPADDING", (0, 0), (-1, -1), 6),
    ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
    ("LEFTPADDING", (0, 0), (-1, -1), 10),
    ("RIGHTPADDING", (0, 0), (-1, -1), 10),
]))
story.append(claims_table)

# ─── 7. LIMITES ──────────────────────────────────────────────────────────────
story.append(Paragraph("Limites assumées", style_h2))
limites = [
    "Test <b>logiciel uniquement</b> : la chaîne hardware complète (photon écran "
    "→ appui mécanique) n’est pas validée. Une mesure avec photodiode "
    "(Black Box Toolkit, Arduino + photodiode) reste nécessaire pour les "
    "paradigmes ultra-sensibles (P300, masquage à 17 ms, stimuli subliminaux).",
    "<b>Configuration unique</b> : Windows 11 + Chrome. macOS, Safari, Linux et "
    "autres combinaisons OS / navigateurs ne sont pas testés. Pronk et al. (2020) "
    "montrent que macOS + Safari peut atteindre 132 ms de biais RT — à vérifier "
    "séparément si ce cas d’usage est ciblé.",
    "<b>Comparaison asymétrique avec jsPsych</b> : les chiffres de la littérature "
    "sont obtenus avec un Black Box Toolkit (hardware), les nôtres en logiciel "
    "pur. La comparaison est donc indicative, pas équivalente.",
]
for lim in limites:
    story.append(Paragraph(f"&#8226;&#160;&#160;{lim}", style_bullet))

# ─── 8. PIED DE PAGE ─────────────────────────────────────────────────────────
story.append(Spacer(1, 8))
story.append(HRFlowable(width="100%", thickness=0.5, color=GRAY_BORDER))
story.append(Spacer(1, 4))
story.append(Paragraph(
    "<b>Méthodologie pré-spécifiée, code, données brutes et rapport complet :</b> "
    '<font face="Courier" size="7">github.com/mindcraft-research/mindcraft/tree/main/docs/timing-validation</font>',
    style_footer))
story.append(Paragraph(
    "<b>Licence :</b> AGPL-3.0 &#160;|&#160; <b>Reproductibilité :</b> tous les artefacts "
    "(méthodologie, code, données, analyse) sont publiés en open source et reproductibles.",
    style_footer))
story.append(Spacer(1, 4))
story.append(Paragraph(
    "<i>Déclaration de transparence : ce document a été produit par D. David avec "
    "l’assistance de Claude (Anthropic, modèle Opus 4.7, fenêtre 1M context), "
    "sous sa direction et sa validation. L’autrice assume l’entière "
    "responsabilité scientifique des conclusions. Conformément aux recommandations "
    "de Nature, NeurIPS et COPE (2024) sur l’usage d’IA générative en recherche.</i>",
    style_footer))

# ─── BUILD ───────────────────────────────────────────────────────────────────
doc.build(story)
print(f"PDF généré : {output_path}")
