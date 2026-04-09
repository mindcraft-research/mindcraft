// ─── ÉVALUATEUR DE LOGIQUE CONDITIONNELLE ────────────────────────────────────

/**
 * Évalue les règles d'un bloc LOGIC et retourne l'action à effectuer.
 *
 * @param {Object[]} rules - Règles du bloc LOGIC
 * @param {string} defaultAction - Action par défaut si aucune règle ne matche
 * @param {Object} context - { conditionAssignments: [{factorLevelId}], responses: {questionCode: value} }
 * @returns {{ action: string, targetBlockId: string|null }}
 */
function evaluateLogicBlock(rules, defaultAction, context) {
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

  return { action: defaultAction || 'CONTINUE', targetBlockId: null }
}

module.exports = { evaluateLogicBlock }
