import type { AutomataGraph, State, Transition } from './types'

// ─── Epsilon closure ──────────────────────────────────────────────────────────

function epsilonClosure(states: Set<string>, graph: AutomataGraph): Set<string> {
  const closure = new Set(states)
  const stack = [...states]
  while (stack.length > 0) {
    const s = stack.pop()!
    for (const t of graph.transitions) {
      if (
        t.from === s &&
        (t.label === 'ε' || t.label === 'eps' || t.label === '')
      ) {
        if (!closure.has(t.to)) {
          closure.add(t.to)
          stack.push(t.to)
        }
      }
    }
  }
  return closure
}

// ─── move(S, a): NFA states reachable from S on symbol a ─────────────────────

function moveStates(
  states: Set<string>,
  symbol: string,
  graph: AutomataGraph,
): Set<string> {
  const result = new Set<string>()
  for (const s of states) {
    for (const t of graph.transitions) {
      if (t.from === s) {
        const labels = t.label.split(',').map((l) => l.trim())
        if (labels.includes(symbol)) {
          result.add(t.to)
        }
      }
    }
  }
  return result
}

// ─── Subset Construction Types ────────────────────────────────────────────────

export interface SubsetTableRow {
  /** DFA state label, e.g. "{q0, q1}" or "∅" */
  dfaLabel: string
  /** NFA state ids that make up this DFA state */
  subsetIds: string[]
  /** Human-readable NFA state labels for display */
  subsetLabels: string[]
  isStart: boolean
  isAccept: boolean
  /** symbol → next DFA state label */
  transitions: Record<string, string>
}

export interface NFAToDFAResult {
  dfa: AutomataGraph
  table: SubsetTableRow[]
}

// ─── NFA → DFA via Subset / Powerset Construction ────────────────────────────

export function nfaToDFA(nfa: AutomataGraph): NFAToDFAResult {
  // Strip ε from alphabet (it's not a real input symbol for the DFA)
  const alphabet = nfa.alphabet.filter(
    (a) => a !== 'ε' && a !== 'eps' && a !== '',
  )

  function getStateLabel(id: string): string {
    return nfa.states.find((s) => s.id === id)?.label ?? id
  }

  function subsetLabel(ids: string[]): string {
    if (ids.length === 0) return '∅'
    return '{' + ids.map(getStateLabel).join(', ') + '}'
  }

  // Canonical key for a set of NFA state ids (sorted)
  function subsetKey(ids: string[]): string {
    return [...ids].sort().join('\x00')
  }

  const startNFAState = nfa.states.find((s) => s.isStart)
  if (!startNFAState) {
    return {
      dfa: {
        ...nfa,
        id: crypto.randomUUID(),
        name: nfa.name + ' (DFA)',
        type: 'DFA',
        states: [],
        transitions: [],
      },
      table: [],
    }
  }

  const startClosure = epsilonClosure(new Set([startNFAState.id]), nfa)
  const startIds = [...startClosure].sort()

  let stateCounter = 0
  function newStateId() {
    return `dfa_s${stateCounter++}`
  }

  type SubsetInfo = { stateId: string; label: string; ids: string[] }
  const subsetMap = new Map<string, SubsetInfo>()

  const startKey = subsetKey(startIds)
  subsetMap.set(startKey, {
    stateId: newStateId(),
    label: subsetLabel(startIds),
    ids: startIds,
  })

  const queue: string[] = [startKey]
  const visited = new Set<string>([startKey])
  const table: SubsetTableRow[] = []
  let needDeadState = false
  const DEAD_LABEL = '∅'

  while (queue.length > 0) {
    const key = queue.shift()!
    const info = subsetMap.get(key)!
    const rowTransitions: Record<string, string> = {}
    const isAccept = info.ids.some(
      (id) => nfa.states.find((s) => s.id === id)?.isAccept,
    )

    for (const symbol of alphabet) {
      const moved = moveStates(new Set(info.ids), symbol, nfa)
      const closed = epsilonClosure(moved, nfa)
      const nextIds = [...closed].sort()
      const nextKey = subsetKey(nextIds)

      if (nextIds.length === 0) {
        needDeadState = true
        rowTransitions[symbol] = DEAD_LABEL
      } else {
        if (!subsetMap.has(nextKey)) {
          subsetMap.set(nextKey, {
            stateId: newStateId(),
            label: subsetLabel(nextIds),
            ids: nextIds,
          })
        }
        if (!visited.has(nextKey)) {
          visited.add(nextKey)
          queue.push(nextKey)
        }
        rowTransitions[symbol] = subsetMap.get(nextKey)!.label
      }
    }

    table.push({
      dfaLabel: info.label,
      subsetIds: info.ids,
      subsetLabels: info.ids.map(getStateLabel),
      isStart: key === startKey,
      isAccept,
      transitions: rowTransitions,
    })
  }

  // Build DFA states
  const dfaStates: State[] = []
  for (const [key, info] of subsetMap) {
    const isAccept = info.ids.some(
      (id) => nfa.states.find((s) => s.id === id)?.isAccept,
    )
    const isStart = key === startKey
    dfaStates.push({
      id: info.stateId,
      label: info.label,
      x: 0,
      y: 0,
      isStart,
      isAccept,
    })
  }

  let deadStateId: string | null = null
  if (needDeadState) {
    deadStateId = newStateId()
    dfaStates.push({
      id: deadStateId,
      label: DEAD_LABEL,
      x: 0,
      y: 0,
      isStart: false,
      isAccept: false,
    })
    const deadRowTrans: Record<string, string> = {}
    for (const symbol of alphabet) deadRowTrans[symbol] = DEAD_LABEL
    table.push({
      dfaLabel: DEAD_LABEL,
      subsetIds: [],
      subsetLabels: [],
      isStart: false,
      isAccept: false,
      transitions: deadRowTrans,
    })
  }

  // Auto-layout: grid arrangement
  const totalStates = dfaStates.length
  const cols = Math.max(1, Math.ceil(Math.sqrt(totalStates)))
  dfaStates.forEach((s, i) => {
    const col = i % cols
    const row = Math.floor(i / cols)
    s.x = 160 + col * 220
    s.y = 120 + row * 180
  })

  // Build DFA transitions
  const dfaTransitions: Transition[] = []
  let tCounter = 0

  for (const row of table) {
    let fromId: string | null = null
    if (row.dfaLabel === DEAD_LABEL) {
      fromId = deadStateId
    } else {
      fromId =
        [...subsetMap.values()].find((v) => v.label === row.dfaLabel)
          ?.stateId ?? null
    }
    if (!fromId) continue

    for (const symbol of alphabet) {
      const toLabel = row.transitions[symbol]
      let toId: string | null = null
      if (toLabel === DEAD_LABEL) {
        toId = deadStateId
      } else {
        toId =
          [...subsetMap.values()].find((v) => v.label === toLabel)?.stateId ??
          null
      }
      if (toId) {
        dfaTransitions.push({
          id: `dfa_t${tCounter++}`,
          from: fromId,
          to: toId,
          label: symbol,
        })
      }
    }
  }

  const dfa: AutomataGraph = {
    id: crypto.randomUUID(),
    name: nfa.name + ' (DFA)',
    type: 'DFA',
    states: dfaStates,
    transitions: dfaTransitions,
    alphabet,
  }

  return { dfa, table }
}

// ─── DFA → NFA (trivial: every DFA is already a valid NFA) ───────────────────

/**
 * Converting a DFA to NFA is trivial — a DFA is simply a restricted NFA
 * (deterministic, no epsilon transitions). We just change the type label.
 * The resulting NFA is equivalent and accepts the same language.
 */
export function dfaToNFA(dfa: AutomataGraph): AutomataGraph {
  return {
    ...dfa,
    id: crypto.randomUUID(),
    name: dfa.name + ' (NFA)',
    type: 'NFA',
  }
}

// ─── RegEx → NFA via Thompson's Construction ─────────────────────────────────

interface NFAFragment {
  start: string
  accept: string
  states: State[]
  transitions: Transition[]
}

let stateCounter = 0
let transCounter = 0

function resetCounters() {
  stateCounter = 0
  transCounter = 0
}

function newState(label?: string): State {
  const id = `q${stateCounter++}`
  return {
    id,
    label: label ?? id,
    x: 0,
    y: 0,
    isStart: false,
    isAccept: false,
  }
}

function newTransition(from: string, to: string, label: string): Transition {
  return {
    id: `t${transCounter++}`,
    from,
    to,
    label,
  }
}

/**
 * Convert a simplified regular expression to NFA using Thompson's construction.
 * Supports: concatenation, alternation (|), Kleene star (*), plus (+), optional (?),
 * character classes ([a-z]), escape sequences (\d, \w, \s), and parentheses for grouping.
 */
export function regexToNFA(pattern: string): AutomataGraph {
  resetCounters()

  // Parse and build NFA fragment
  const fragment = parseRegex(pattern)

  // Mark start and accept states
  const states = fragment.states.map((s) => ({
    ...s,
    isStart: s.id === fragment.start,
    isAccept: s.id === fragment.accept,
  }))

  // Extract alphabet from transitions (excluding ε)
  const alphabetSet = new Set<string>()
  for (const t of fragment.transitions) {
    if (t.label !== 'ε' && t.label !== 'eps' && t.label !== '') {
      // Handle character classes like [a-z]
      if (t.label.startsWith('[') && t.label.endsWith(']')) {
        // Simplified: add the whole class as a symbol
        alphabetSet.add(t.label)
      } else {
        alphabetSet.add(t.label)
      }
    }
  }
  const alphabet = [...alphabetSet].sort()

  // Auto-layout states
  const layoutStates = autoLayoutStates(states)

  return {
    id: crypto.randomUUID(),
    name: 'RegEx NFA',
    type: 'NFA',
    states: layoutStates,
    transitions: fragment.transitions,
    alphabet,
    pattern,
  }
}

function parseRegex(pattern: string): NFAFragment {
  let pos = 0

  function peek(): string | null {
    return pos < pattern.length ? pattern[pos] : null
  }

  function consume(): string {
    return pattern[pos++]
  }

  function parseAlternation(): NFAFragment {
    let left = parseConcatenation()

    while (peek() === '|') {
      consume() // consume '|'
      const right = parseConcatenation()
      left = alternate(left, right)
    }

    return left
  }

  function parseConcatenation(): NFAFragment {
    const fragments: NFAFragment[] = []

    while (true) {
      const ch = peek()
      if (ch === null || ch === ')' || ch === '|') break

      fragments.push(parseFactor())
    }

    if (fragments.length === 0) {
      // Empty regex → epsilon transition
      return epsilon()
    }

    return fragments.reduce(concatenate)
  }

  function parseFactor(): NFAFragment {
    let base = parseBase()

    // Handle postfix operators: *, +, ?
    while (true) {
      const ch = peek()
      if (ch === '*') {
        consume()
        base = star(base)
      } else if (ch === '+') {
        consume()
        base = plus(base)
      } else if (ch === '?') {
        consume()
        base = optional(base)
      } else {
        break
      }
    }

    return base
  }

  function parseBase(): NFAFragment {
    const ch = peek()

    if (ch === '(') {
      consume() // consume '('
      const frag = parseAlternation()
      if (peek() === ')') consume() // consume ')'
      return frag
    }

    if (ch === '[') {
      // Character class [a-z]
      return parseCharClass()
    }

    if (ch === '\\') {
      // Escape sequence
      consume()
      const escaped = consume()
      return symbol(getEscapedSymbol(escaped))
    }

    if (ch === '.') {
      // Match any character (simplified as '.')
      consume()
      return symbol('.')
    }

    // Regular character
    if (ch) {
      consume()
      return symbol(ch)
    }

    // Fallback
    return epsilon()
  }

  function parseCharClass(): NFAFragment {
    consume() // consume '['
    let charClass = '['

    if (peek() === '^') {
      charClass += consume()
    }

    while (peek() && peek() !== ']') {
      charClass += consume()
    }

    if (peek() === ']') charClass += consume() // consume ']'

    return symbol(charClass)
  }

  function getEscapedSymbol(ch: string): string {
    // Common escape sequences
    const escapeMap: Record<string, string> = {
      d: '\\d', // digit
      w: '\\w', // word char
      s: '\\s', // whitespace
      D: '\\D', // non-digit
      W: '\\W', // non-word
      S: '\\S', // non-whitespace
      n: '\n',
      t: '\t',
      r: '\r',
    }
    return escapeMap[ch] ?? ch
  }

  return parseAlternation()
}

// Thompson construction primitives

function epsilon(): NFAFragment {
  const start = newState()
  const accept = newState()
  return {
    start: start.id,
    accept: accept.id,
    states: [start, accept],
    transitions: [newTransition(start.id, accept.id, 'ε')],
  }
}

function symbol(sym: string): NFAFragment {
  const start = newState()
  const accept = newState()
  return {
    start: start.id,
    accept: accept.id,
    states: [start, accept],
    transitions: [newTransition(start.id, accept.id, sym)],
  }
}

function concatenate(frag1: NFAFragment, frag2: NFAFragment): NFAFragment {
  // Connect accept of frag1 to start of frag2 with epsilon
  return {
    start: frag1.start,
    accept: frag2.accept,
    states: [...frag1.states, ...frag2.states],
    transitions: [
      ...frag1.transitions,
      ...frag2.transitions,
      newTransition(frag1.accept, frag2.start, 'ε'),
    ],
  }
}

function alternate(frag1: NFAFragment, frag2: NFAFragment): NFAFragment {
  const start = newState()
  const accept = newState()

  return {
    start: start.id,
    accept: accept.id,
    states: [start, accept, ...frag1.states, ...frag2.states],
    transitions: [
      ...frag1.transitions,
      ...frag2.transitions,
      newTransition(start.id, frag1.start, 'ε'),
      newTransition(start.id, frag2.start, 'ε'),
      newTransition(frag1.accept, accept.id, 'ε'),
      newTransition(frag2.accept, accept.id, 'ε'),
    ],
  }
}

function star(frag: NFAFragment): NFAFragment {
  const start = newState()
  const accept = newState()

  return {
    start: start.id,
    accept: accept.id,
    states: [start, accept, ...frag.states],
    transitions: [
      ...frag.transitions,
      newTransition(start.id, frag.start, 'ε'),
      newTransition(start.id, accept.id, 'ε'), // skip
      newTransition(frag.accept, frag.start, 'ε'), // loop
      newTransition(frag.accept, accept.id, 'ε'),
    ],
  }
}

function plus(frag: NFAFragment): NFAFragment {
  // a+ = aa*
  const starFrag = star(frag)
  return concatenate(
    {
      start: frag.start,
      accept: frag.accept,
      states: [...frag.states],
      transitions: [...frag.transitions],
    },
    starFrag,
  )
}

function optional(frag: NFAFragment): NFAFragment {
  const start = newState()
  const accept = newState()

  return {
    start: start.id,
    accept: accept.id,
    states: [start, accept, ...frag.states],
    transitions: [
      ...frag.transitions,
      newTransition(start.id, frag.start, 'ε'),
      newTransition(start.id, accept.id, 'ε'), // skip
      newTransition(frag.accept, accept.id, 'ε'),
    ],
  }
}

function autoLayoutStates(states: State[]): State[] {
  const n = states.length
  const cols = Math.max(1, Math.ceil(Math.sqrt(n)))

  return states.map((s, i) => {
    const col = i % cols
    const row = Math.floor(i / cols)
    return {
      ...s,
      x: 120 + col * 200,
      y: 100 + row * 160,
    }
  })
}

// ─── NFA/DFA → RegEx via State Elimination ───────────────────────────────────

/**
 * Convert NFA or DFA to a regular expression using state elimination algorithm.
 * Creates a GNFA (Generalized NFA) where transitions are labeled with regex,
 * then eliminates states one by one until only start and accept remain.
 */
export function nfaToRegex(nfa: AutomataGraph): { regex: string } {
  // Step 1: Create new start and accept states
  const newStartId = 'regex_start'
  const newAcceptId = 'regex_accept'

  const oldStart = nfa.states.find((s) => s.isStart)
  const oldAccepts = nfa.states.filter((s) => s.isAccept)

  if (!oldStart) {
    return { regex: '∅' } // no start state → empty language
  }

  // Build GNFA transition map: (from, to) → regex
  const gnfa = new Map<string, Map<string, string>>()

  function addGNFATransition(from: string, to: string, regex: string) {
    if (!gnfa.has(from)) gnfa.set(from, new Map())
    const existing = gnfa.get(from)!.get(to)
    if (existing) {
      // Union: (r1|r2)
      gnfa.get(from)!.set(to, `(${existing}|${regex})`)
    } else {
      gnfa.get(from)!.set(to, regex)
    }
  }

  // Add epsilon transitions from new start to old start
  addGNFATransition(newStartId, oldStart.id, 'ε')

  // Add epsilon transitions from old accepts to new accept
  for (const acc of oldAccepts) {
    addGNFATransition(acc.id, newAcceptId, 'ε')
  }

  // Convert existing NFA transitions to GNFA
  for (const t of nfa.transitions) {
    let regex = t.label
    // Convert epsilon to ε symbol
    if (regex === '' || regex === 'eps') regex = 'ε'
    // Escape special regex chars if needed (simplified)
    if (
      regex !== 'ε' &&
      !regex.startsWith('[') &&
      !regex.startsWith('\\') &&
      /[*+?|()[\]{}^$.]/.test(regex)
    ) {
      regex = '\\' + regex
    }
    addGNFATransition(t.from, t.to, regex)
  }

  // List of states to eliminate (all except new start and new accept)
  const statesToEliminate = nfa.states.map((s) => s.id)

  // State elimination loop
  for (const stateToRemove of statesToEliminate) {
    // Find all incoming and outgoing transitions
    const incoming: [string, string][] = []
    const outgoing: [string, string][] = []
    let selfLoop: string | null = null

    for (const [from, targets] of gnfa) {
      for (const [to, regex] of targets) {
        if (to === stateToRemove && from !== stateToRemove) {
          incoming.push([from, regex])
        }
        if (from === stateToRemove && to !== stateToRemove) {
          outgoing.push([to, regex])
        }
        if (from === stateToRemove && to === stateToRemove) {
          selfLoop = regex
        }
      }
    }

    // For each combination of incoming and outgoing, add new transition
    for (const [inState, inRegex] of incoming) {
      for (const [outState, outRegex] of outgoing) {
        let newRegex = inRegex

        // If there's a self-loop, add it with Kleene star
        if (selfLoop) {
          newRegex = `${newRegex}(${selfLoop})*`
        }

        newRegex = `${newRegex}${outRegex}`

        addGNFATransition(inState, outState, newRegex)
      }
    }

    // Remove all transitions involving stateToRemove
    gnfa.delete(stateToRemove)
    for (const targets of gnfa.values()) {
      targets.delete(stateToRemove)
    }
  }

  // Final regex is the transition from new start to new accept
  const finalRegex = gnfa.get(newStartId)?.get(newAcceptId) ?? '∅'

  return { regex: simplifyRegex(finalRegex) }
}

/**
 * Simplify regex by removing unnecessary epsilons and parentheses (basic cleanup)
 */
function simplifyRegex(regex: string): string {
  let simplified = regex

  // Remove standalone epsilon
  simplified = simplified.replace(/ε/g, '')

  // Replace empty alternations
  simplified = simplified.replace(/\|\)/g, ')')
  simplified = simplified.replace(/\(\|/g, '(')

  // Remove empty parentheses
  simplified = simplified.replace(/\(\)/g, '')

  // Replace (r) with r if no special chars
  simplified = simplified.replace(/\(([a-zA-Z0-9])\)/g, '$1')

  // If completely empty, return ε
  if (simplified === '') simplified = 'ε'

  return simplified
}

export function dfaToRegex(dfa: AutomataGraph): { regex: string } {
  // DFA is a special case of NFA, so use the same algorithm
  return nfaToRegex(dfa)
}
