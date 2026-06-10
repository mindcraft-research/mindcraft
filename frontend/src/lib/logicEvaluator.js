// ─── ÉVALUATEUR DE LOGIQUE CONDITIONNELLE (côté client) ──────────────────────

/**
 * Évalue les règles d'un bloc LOGIC et retourne l'action à effectuer.
 *
 * @param {Object[]} rules - Règles du bloc LOGIC
 * @param {string} defaultAction - Action par défaut si aucune règle ne matche
 * @param {Object} context - { conditionAssignments: [{factorLevelId}], responses: {questionCode: value} }
 * @param {string|null} defaultTargetBlockId - Bloc cible quand l'action par
 *   défaut est JUMP_TO. Avant le fix du bug 8a (issue #83), cet argument
 *   n'existait pas : l'action par défaut JUMP_TO renvoyait toujours
 *   targetBlockId: null, ce qui rendait l'option inutilisable.
 * @returns {{ action: string, targetBlockId: string|null }}
 */
export function evaluateLogicBlock(rules, defaultAction, context, defaultTargetBlockId = null) {
  const { conditionAssignments = [], responses = {} } = context

  for (const rule of rules) {
    let match = false

    if (rule.type === 'CONDITION_ASSIGNMENT') {
      const assigned = conditionAssignments.some(
        (a) => a.factorLevelId === rule.levelId || (a.factorLevel && a.factorLevel.id === rule.levelId)
      )
      match = rule.operator === 'EQUALS' ? assigned : !assigned

    } else if (rule.type === 'RESPONSE_VALUE') {
      const responseValue = responses[rule.sourceQuestionCode]
      if (responseValue === undefined) continue

      const val = String(responseValue)
      const target = String(rule.value)

      switch (rule.operator) {
        case 'EQUALS':       match = val === target; break
        case 'NOT_EQUALS':   match = val !== target; break
        case 'GREATER_THAN': match = Number(val) > Number(target); break
        case 'LESS_THAN':    match = Number(val) < Number(target); break
        case 'CONTAINS':     match = val.toLowerCase().includes(target.toLowerCase()); break
        default: break
      }
    }

    if (match) {
      return { action: rule.action, targetBlockId: rule.targetBlockId || null }
    }
  }

  // Action par défaut : on retourne defaultTargetBlockId uniquement si
  // l'action par défaut est JUMP_TO (sinon le champ est ignoré côté runner).
  const action = defaultAction || 'CONTINUE'
  return {
    action,
    targetBlockId: action === 'JUMP_TO' ? (defaultTargetBlockId || null) : null,
  }
}

/**
 * Évalue la condition d'affichage d'une question.
 * Retourne `true` si la question doit être affichée, `false` sinon.
 *
 * @param {Object|null} condition - { sourceCode, operator, value }
 * @param {Object} responses - { questionCode: value }
 * @returns {boolean}
 */
export function evaluateDisplayCondition(condition, responses) {
  if (!condition || !condition.sourceCode) return true

  const responseValue = responses[condition.sourceCode]
  // Source pas encore répondue → masquer la question
  if (responseValue === undefined || responseValue === null) return false

  // Opérateur "est renseigné" : juste vérifier qu'une réponse existe
  if (condition.operator === 'IS_NOT_EMPTY') {
    return responseValue !== '' && String(responseValue) !== 'undefined'
  }

  const val = String(responseValue)
  const target = String(condition.value ?? '')

  switch (condition.operator) {
    case 'EQUALS':       return val === target
    case 'NOT_EQUALS':   return val !== target
    case 'GREATER_THAN': return Number(val) > Number(target)
    case 'LESS_THAN':    return Number(val) < Number(target)
    case 'CONTAINS':     return val.toLowerCase().includes(target.toLowerCase())
    default: return true
  }
}
