// ─── FORMULE D'UNE QUESTION « CALCULÉE » (COMPUTED) ─────────────────────────
// La formule (settings.formula) est écrite par la personne qui conçoit l'étude
// avec la syntaxe JavaScript documentée : codes des variables, nombres,
// + - * / % ** (puissance), parenthèses, comparaisons, ?: , && || !, et les
// fonctions / constantes de Math (Math.sqrt(), Math.round(), Math.PI…).
//
// Elle n'est plus exécutée comme du code (new Function) : on la lit ici et on
// n'évalue que ces éléments. Tout le reste (appel d'une autre fonction, accès
// à window, chaîne de caractères…) rend la formule invalide → pas de résultat,
// comme une formule erronée auparavant. Même priorité des opérateurs et même
// résultat qu'en JavaScript pour les formules valides.

const MATH_FONCTIONS = new Set([
  'abs', 'acos', 'acosh', 'asin', 'asinh', 'atan', 'atan2', 'atanh', 'cbrt', 'ceil',
  'cos', 'cosh', 'exp', 'expm1', 'floor', 'fround', 'hypot', 'log', 'log10', 'log1p',
  'log2', 'max', 'min', 'pow', 'random', 'round', 'sign', 'sin', 'sinh', 'sqrt',
  'tan', 'tanh', 'trunc',
])
const MATH_CONSTANTES = new Set(['E', 'LN10', 'LN2', 'LOG10E', 'LOG2E', 'PI', 'SQRT1_2', 'SQRT2'])
// Valeurs globales utilisables sans variable du même nom.
const GLOBALES = { true: true, false: false, NaN: NaN, Infinity: Infinity, undefined: undefined }

// Opérateurs binaires : [priorité, associatif à droite].
const BINAIRES = {
  '||': [1], '&&': [2],
  '==': [3], '!=': [3], '===': [3], '!==': [3],
  '<': [4], '<=': [4], '>': [4], '>=': [4],
  '+': [5], '-': [5],
  '*': [6], '/': [6], '%': [6],
  '**': [8, true],
}

const RE_JETON = /\s*(?:(\d+\.?\d*(?:[eE][+-]?\d+)?|\.\d+(?:[eE][+-]?\d+)?)|([\p{L}_$][\p{L}\p{N}_$]*)|(===|!==|\*\*|==|!=|<=|>=|&&|\|\||[-+*/%<>!?:(),.]))/uy

function decouper(texte) {
  const jetons = []
  RE_JETON.lastIndex = 0
  let pos = 0
  while (pos < texte.length) {
    if (/^\s*$/.test(texte.slice(pos))) break
    RE_JETON.lastIndex = pos
    const m = RE_JETON.exec(texte)
    if (!m) throw new Error('caractère inattendu')
    pos = RE_JETON.lastIndex
    if (m[1] !== undefined) jetons.push({ t: 'num', v: Number(m[1]) })
    else if (m[2] !== undefined) jetons.push({ t: 'id', v: m[2] })
    else jetons.push({ t: 'op', v: m[3] })
  }
  return jetons
}

// Lit la formule en arbre ; lève une erreur si elle sort de la syntaxe permise.
export function analyserFormule(texte) {
  const jetons = decouper(String(texte ?? ''))
  let i = 0
  const voir = () => jetons[i]
  const estOp = (v) => jetons[i]?.t === 'op' && jetons[i].v === v
  const attendre = (v) => { if (!estOp(v)) throw new Error(`« ${v} » attendu`); i++ }

  function expression() {
    const cond = binaire(1)
    if (!estOp('?')) return cond
    i++
    const alors = expression()
    attendre(':')
    const sinon = expression()
    return { k: '?', cond, alors, sinon }
  }

  // Opérateurs de priorité ≥ min (montée de priorité).
  function binaire(min) {
    let gauche = unaire()
    for (;;) {
      const j = voir()
      const def = j?.t === 'op' && BINAIRES[j.v]
      if (!def || def[0] < min) break
      i++
      // ** : en JavaScript, « -a ** b » est une erreur de syntaxe.
      if (j.v === '**' && gauche.k === 'u') throw new Error('« ** » après un signe : mettre des parenthèses')
      const droite = binaire(def[1] ? def[0] : def[0] + 1)
      gauche = { k: 'b', op: j.v, g: gauche, d: droite }
    }
    return gauche
  }

  function unaire() {
    const j = voir()
    if (j?.t === 'op' && (j.v === '-' || j.v === '+' || j.v === '!')) {
      i++
      return { k: 'u', op: j.v, x: unaire() }
    }
    return primaire()
  }

  function primaire() {
    const j = voir()
    if (!j) throw new Error('formule incomplète')
    i++
    if (j.t === 'num') return { k: 'n', v: j.v }
    if (j.t === 'op' && j.v === '(') {
      const x = expression()
      attendre(')')
      return { k: 'p', x }
    }
    if (j.t === 'id') {
      if (j.v === 'Math' && estOp('.')) {
        i++
        const nom = voir()
        if (nom?.t !== 'id') throw new Error('nom attendu après « Math. »')
        i++
        if (estOp('(')) {
          if (!MATH_FONCTIONS.has(nom.v)) throw new Error(`fonction inconnue : Math.${nom.v}`)
          i++
          const args = []
          if (!estOp(')')) {
            args.push(expression())
            while (estOp(',')) { i++; args.push(expression()) }
          }
          attendre(')')
          return { k: 'f', nom: nom.v, args }
        }
        if (!MATH_CONSTANTES.has(nom.v)) throw new Error(`inconnu : Math.${nom.v}`)
        return { k: 'n', v: Math[nom.v] }
      }
      return { k: 'v', nom: j.v }
    }
    throw new Error(`« ${j.v} » inattendu`)
  }

  if (!jetons.length) throw new Error('formule vide')
  const arbre = expression()
  if (i < jetons.length) throw new Error(`« ${jetons[i].v} » inattendu`)
  return arbre
}

const OPS = {
  '||': (a, b) => a || b, '&&': (a, b) => a && b,
  // eslint-disable-next-line eqeqeq
  '==': (a, b) => a == b, '!=': (a, b) => a != b,
  '===': (a, b) => a === b, '!==': (a, b) => a !== b,
  '<': (a, b) => a < b, '<=': (a, b) => a <= b, '>': (a, b) => a > b, '>=': (a, b) => a >= b,
  '+': (a, b) => a + b, '-': (a, b) => a - b,
  '*': (a, b) => a * b, '/': (a, b) => a / b, '%': (a, b) => a % b,
  '**': (a, b) => a ** b,
}

function evaluer(n, valeurs) {
  switch (n.k) {
    case 'n': return n.v
    case 'p': return evaluer(n.x, valeurs)
    case 'v':
      if (Object.prototype.hasOwnProperty.call(valeurs, n.nom)) return valeurs[n.nom]
      if (Object.prototype.hasOwnProperty.call(GLOBALES, n.nom)) return GLOBALES[n.nom]
      throw new Error(`variable inconnue : ${n.nom}`)
    case 'u': {
      const x = evaluer(n.x, valeurs)
      return n.op === '-' ? -x : n.op === '+' ? +x : !x
    }
    case 'b':
      // && et || n'évaluent la droite que si nécessaire, comme en JavaScript.
      if (n.op === '&&') { const g = evaluer(n.g, valeurs); return g && evaluer(n.d, valeurs) }
      if (n.op === '||') { const g = evaluer(n.g, valeurs); return g || evaluer(n.d, valeurs) }
      return OPS[n.op](evaluer(n.g, valeurs), evaluer(n.d, valeurs))
    case '?': return evaluer(n.cond, valeurs) ? evaluer(n.alors, valeurs) : evaluer(n.sinon, valeurs)
    case 'f': return Math[n.nom](...n.args.map((a) => evaluer(a, valeurs)))
    default: throw new Error('formule invalide')
  }
}

// Résultat numérique de la formule, ou null (formule invalide, variable
// inconnue, résultat non numérique ou infini) — comme avant.
export function calculerFormule(formule, valeurs = {}) {
  try {
    const resultat = evaluer(analyserFormule(formule), valeurs)
    if (typeof resultat !== 'number' || isNaN(resultat) || !isFinite(resultat)) return null
    return resultat
  } catch {
    return null
  }
}

// Message d'erreur lisible pour l'éditeur, ou null si la formule est correcte
// (lisible et n'utilisant que les codes de variables donnés).
export function erreurFormule(formule, codes = []) {
  if (!String(formule ?? '').trim()) return null
  let arbre
  try { arbre = analyserFormule(formule) } catch (e) { return e.message }
  const inconnues = new Set()
  const parcourir = (n) => {
    if (n.k === 'v' && !codes.includes(n.nom) && !(n.nom in GLOBALES)) inconnues.add(n.nom)
    for (const enfant of [n.x, n.g, n.d, n.cond, n.alors, n.sinon, ...(n.args || [])]) if (enfant) parcourir(enfant)
  }
  parcourir(arbre)
  return inconnues.size ? `code de variable inconnu : ${[...inconnues].join(', ')}` : null
}
