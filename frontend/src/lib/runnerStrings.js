// Textes FIXES de l'interface participant (boutons, messages système), par
// langue. Les textes rédigés par les chercheur·euse·s (énoncés, choix…) ne
// sont pas ici : ils sont traduits via l'onglet « Langues » et appliqués par
// le serveur (voir lib/i18nCatalog.js).
//
// Utilisation : `const t = useT()` puis `t('next')`. La langue vient du
// LangContext posé par la page /run ; sans contexte, français — les études
// existantes ne changent pas.
import { createContext, useContext } from 'react'

export const LangContext = createContext('fr')

export const STRINGS = {
  fr: {
    next: 'Suivant',
    continue: 'Continuer',
    finish: 'Terminer',
    saving: 'Enregistrement…',
    requiredMissing: (n) => `⚠ Il reste ${n === 1 ? '1 champ obligatoire' : `${n} champs obligatoires`} à compléter.`,
    page: (i, n) => `Page ${i} / ${n}`,
    thanksTitle: 'Merci !',
    consentAccept: 'Je participe',
    consentRefuse: 'Je refuse de participer',
    consentConfirm: 'Êtes-vous sûr(e) de vouloir refuser de participer ?\n\nVous serez redirigé(e) vers la page de fin.',
    commentLabel: 'Commentaire (facultatif)',
    yourAnswer: 'Votre réponse…',
    yourWord: 'Votre mot…',
    value: 'Valeur…',
    numericRange: (min, max) => `Veuillez entrer une valeur entre ${min} et ${max}.`,
    // Page de passation
    loading: 'Chargement…',
    preparing: 'Préparation de votre session…',
    unavailableTitle: 'Étude non disponible',
    errorTitle: 'Une erreur est survenue',
    doneTitle: 'Merci pour votre participation !',
    doneClose: 'Vous pouvez fermer cette page.',
    doneKiosk: 'Cette passation est terminée et les réponses sont enregistrées.',
    newSession: 'Démarrer nouvelle passation',
    studyDone: 'Étude terminée',
    // Tâche comportementale
    taskTitle: 'Tâche comportementale',
    trialsTotal: (n) => `${n} essais au total`,
    start: 'Commencer',
    startPractice: (n) => `Commencer par les essais de pratique (${n})`,
    skipPractice: 'Passer la pratique',
    practice: 'Pratique',
    trial: (i, n) => `Essai ${i} / ${n}`,
    taskDone: 'Tâche terminée',
    trialsCompleted: (n) => `${n} essais complétés`,
    pressKey: (k) => `Appuyez sur ${k} pour continuer`,
    tooSlow: 'Trop lent !',
    pauseDefault: 'Vous pouvez faire une courte pause. Appuyez sur le bouton quand vous êtes prêt(e) à continuer.',
    buttonIn: 'Le bouton sera disponible dans',
    noStimulus: 'Aucun fichier stimulus configuré pour cette tâche.',
    autoEndIn: 'Fin automatique dans',
    autoEnd: 'La tâche se terminera automatiquement à la fin.',
    taskFinished: 'J’ai terminé la tâche',
  },
  en: {
    next: 'Next',
    continue: 'Continue',
    finish: 'Finish',
    saving: 'Saving…',
    requiredMissing: (n) => `⚠ ${n === 1 ? '1 required field' : `${n} required fields`} still to complete.`,
    page: (i, n) => `Page ${i} / ${n}`,
    thanksTitle: 'Thank you!',
    consentAccept: 'I agree to participate',
    consentRefuse: 'I do not wish to participate',
    consentConfirm: 'Are you sure you do not want to participate?\n\nYou will be taken to the end page.',
    commentLabel: 'Comment (optional)',
    yourAnswer: 'Your answer…',
    yourWord: 'Your word…',
    value: 'Value…',
    numericRange: (min, max) => `Please enter a value between ${min} and ${max}.`,
    loading: 'Loading…',
    preparing: 'Preparing your session…',
    unavailableTitle: 'Study unavailable',
    errorTitle: 'Something went wrong',
    doneTitle: 'Thank you for participating!',
    doneClose: 'You can close this page.',
    doneKiosk: 'This session is over and the answers have been saved.',
    newSession: 'Start a new session',
    studyDone: 'Study completed',
    taskTitle: 'Behavioral task',
    trialsTotal: (n) => `${n} trials in total`,
    start: 'Start',
    startPractice: (n) => `Start with practice trials (${n})`,
    skipPractice: 'Skip practice',
    practice: 'Practice',
    trial: (i, n) => `Trial ${i} / ${n}`,
    taskDone: 'Task completed',
    trialsCompleted: (n) => `${n} trials completed`,
    pressKey: (k) => `Press ${k} to continue`,
    tooSlow: 'Too slow!',
    pauseDefault: 'You may take a short break. Press the button when you are ready to continue.',
    buttonIn: 'The button will be available in',
    noStimulus: 'No stimulus file is configured for this task.',
    autoEndIn: 'Automatic end in',
    autoEnd: 'The task will end automatically when finished.',
    taskFinished: 'I have finished the task',
  },
}

// Messages d'erreur renvoyés par le serveur (en français) → équivalents.
const SERVER_MESSAGES = {
  en: {
    'Cette étude est introuvable.': 'This study could not be found.',
    "Cette étude n'est pas disponible pour le moment.": 'This study is not available at the moment.',
    'Cette étude est complète. Tous les quotas ont été atteints.': 'This study is full: all quotas have been reached.',
    "Erreur lors du chargement de l'étude.": 'Error while loading the study.',
    "Erreur lors de l'allocation.": 'Error while creating your session.',
    'Une erreur inattendue est survenue.': 'An unexpected error occurred.',
  },
}

export function stringsFor(lang) {
  return STRINGS[lang] || STRINGS.fr
}

export function translateServerMessage(lang, msg) {
  return (SERVER_MESSAGES[lang] && SERVER_MESSAGES[lang][msg]) || msg
}

// t('key') ou t('key', arg1, arg2) pour les entrées fonctions.
export function useT() {
  const lang = useContext(LangContext)
  const dict = stringsFor(lang)
  return (key, ...args) => {
    const v = dict[key] ?? STRINGS.fr[key] ?? key
    return typeof v === 'function' ? v(...args) : v
  }
}

export function useLang() {
  return useContext(LangContext)
}
