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

  // Strip anchors: ^ and $ have no meaning in formal automata theory.
  // All DFA/NFA matching is implicitly full-string, so anchors only cause
  // spurious literal symbols in the resulting automaton.
  const cleanPattern = pattern.replace(/^\^/, '').replace(/\$$/, '')

  // Parse and build NFA fragment
  const fragment = parseRegex(cleanPattern)

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

    if (ch === 'ε') {
      consume()
      return epsilon()
    }

    if (ch === '∅') {
      consume()
      return emptySet()
    }

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

    // Silently skip anchors that weren't stripped at the top level
    // (e.g. ^ inside alternation like (^a|b))
    if (ch === '^' || ch === '$') {
      consume()
      return epsilon()
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

function emptySet(): NFAFragment {
  const start = newState()
  const accept = newState()
  return {
    start: start.id,
    accept: accept.id,
    states: [start, accept],
    transitions: [],
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

  function transitionLabelParts(label: string): string[] {
    const trimmed = label.trim()
    if (trimmed === '' || trimmed === 'eps' || trimmed === 'ε') return ['ε']
    return trimmed
      .split(',')
      .map((part) => part.trim())
      .filter((part) => part.length > 0)
  }

  function escapeLiteralSymbol(symbol: string): string {
    if (symbol === 'ε') return 'ε'
    if (symbol.startsWith('[') && symbol.endsWith(']')) return symbol
    if (symbol.startsWith('\\')) return symbol
    if (/[*+?|()[\]{}^$.]/.test(symbol)) return '\\' + symbol
    return symbol
  }

  // Add epsilon transitions from new start to old start
  addGNFATransition(newStartId, oldStart.id, 'ε')

  // Add epsilon transitions from old accepts to new accept
  for (const acc of oldAccepts) {
    addGNFATransition(acc.id, newAcceptId, 'ε')
  }

  // Convert existing NFA transitions to GNFA
  for (const t of nfa.transitions) {
    const labels = transitionLabelParts(t.label)
    for (const label of labels) {
      const regex = escapeLiteralSymbol(label)
      addGNFATransition(t.from, t.to, regex)
    }
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

  return { regex: finalRegex }
}

export function dfaToRegex(dfa: AutomataGraph): { regex: string } {
  // DFA is a special case of NFA, so use the same algorithm
  return nfaToRegex(dfa)
}

// ─── DFA → Minimized DFA via Hopcroft's Algorithm ─────────────────────────────

export interface PartitionRow {
  /** Label for this equivalence class, e.g. "P0" */
  classLabel: string
  /** Original DFA state IDs in this class */
  stateIds: string[]
  /** Original DFA state labels in this class */
  stateLabels: string[]
  isStart: boolean
  isAccept: boolean
  /** symbol → target class label */
  transitions: Record<string, string>
}

export interface MinimizeDFAResult {
  minDFA: AutomataGraph
  table: PartitionRow[]
}

/**
 * Minimize a DFA using Hopcroft's partition-refinement algorithm.
 * Steps:
 *   1. Remove unreachable states.
 *   2. Initial partition: {accept states} vs {non-accept states}.
 *   3. Iteratively split any partition group where states disagree on
 *      which group they transition to for some symbol.
 *   4. Build the minimized DFA (one state per partition class).
 */
export function minimizeDFA(dfa: AutomataGraph): MinimizeDFAResult {
  const { alphabet } = dfa

  const startState = dfa.states.find((s) => s.isStart)
  if (!startState || dfa.states.length === 0) {
    return {
      minDFA: {
        ...dfa,
        id: crypto.randomUUID(),
        name: dfa.name + ' (Min)',
      },
      table: [],
    }
  }

  // Step 1: Collect reachable state IDs via BFS
  const reachable = new Set<string>()
  const bfsQueue: string[] = [startState.id]
  reachable.add(startState.id)
  while (bfsQueue.length > 0) {
    const cur = bfsQueue.shift()!
    for (const t of dfa.transitions) {
      if (t.from === cur && !reachable.has(t.to)) {
        reachable.add(t.to)
        bfsQueue.push(t.to)
      }
    }
  }

  const states = dfa.states.filter((s) => reachable.has(s.id))
  const transitions = dfa.transitions.filter(
    (t) => reachable.has(t.from) && reachable.has(t.to),
  )

  // Build a fast transition lookup: stateId → symbol → targetId
  const transMap = new Map<string, Map<string, string>>()
  for (const s of states) transMap.set(s.id, new Map())
  for (const t of transitions) {
    const labels = t.label.split(',').map((l) => l.trim())
    for (const sym of labels) {
      transMap.get(t.from)?.set(sym, t.to)
    }
  }

  // Step 2: Initial partition
  const acceptIds = new Set(states.filter((s) => s.isAccept).map((s) => s.id))
  const nonAcceptIds = states.filter((s) => !s.isAccept).map((s) => s.id)
  const acceptGroup = states.filter((s) => s.isAccept).map((s) => s.id)

  const partitions: string[][] = []
  if (acceptGroup.length > 0) partitions.push(acceptGroup)
  if (nonAcceptIds.length > 0) partitions.push(nonAcceptIds)
  if (partitions.length === 0) partitions.push(states.map((s) => s.id))

  // Helper: find which partition index a state belongs to
  function partitionOf(stateId: string, parts: string[][]): number {
    return parts.findIndex((p) => p.includes(stateId))
  }

  // Step 3: Iterative refinement
  let changed = true
  while (changed) {
    changed = false
    const next: string[][] = []
    for (const group of partitions) {
      if (group.length <= 1) {
        next.push(group)
        continue
      }
      // Compute a signature for each state in the group
      // Signature = tuple of (partitionIndex of target for each symbol)
      const signatureOf = (id: string): string =>
        alphabet
          .map((sym) => {
            const target = transMap.get(id)?.get(sym)
            if (target === undefined) return '-1'
            return String(partitionOf(target, partitions))
          })
          .join('|')

      const sigMap = new Map<string, string[]>()
      for (const id of group) {
        const sig = signatureOf(id)
        if (!sigMap.has(sig)) sigMap.set(sig, [])
        sigMap.get(sig)!.push(id)
      }

      if (sigMap.size > 1) changed = true
      for (const subGroup of sigMap.values()) next.push(subGroup)
    }
    partitions.length = 0
    for (const g of next) partitions.push(g)
  }

  // Stable partitions obtained — assign class labels
  // Put the partition containing the start state first
  const startPartIdx = partitions.findIndex((p) => p.includes(startState.id))
  if (startPartIdx > 0) {
    const [sp] = partitions.splice(startPartIdx, 1)
    partitions.unshift(sp)
  }

  // Step 4: Build minimized DFA and partition table
  const classLabels = partitions.map((_, i) => `P${i}`)

  function classOf(stateId: string): string {
    const idx = partitions.findIndex((p) => p.includes(stateId))
    return idx >= 0 ? classLabels[idx] : '∅'
  }

  const table: PartitionRow[] = partitions.map((group, i) => {
    const representative = group[0]
    const rowIsStart = group.includes(startState.id)
    const rowIsAccept = group.some((id) => acceptIds.has(id))
    const rowTransitions: Record<string, string> = {}
    for (const sym of alphabet) {
      const target = transMap.get(representative)?.get(sym)
      rowTransitions[sym] = target ? classOf(target) : '∅'
    }
    return {
      classLabel: classLabels[i],
      stateIds: group,
      stateLabels: group.map(
        (id) => dfa.states.find((s) => s.id === id)?.label ?? id,
      ),
      isStart: rowIsStart,
      isAccept: rowIsAccept,
      transitions: rowTransitions,
    }
  })

  // Build AutomataGraph for minimized DFA
  const totalMin = partitions.length
  const cols = Math.max(1, Math.ceil(Math.sqrt(totalMin)))

  const minStates: State[] = partitions.map((group, i) => {
    const col = i % cols
    const row = Math.floor(i / cols)
    const rowIsStart = group.includes(startState.id)
    const rowIsAccept = group.some((id) => acceptIds.has(id))
    // Use joined original labels as display label
    const label = group
      .map((id) => dfa.states.find((s) => s.id === id)?.label ?? id)
      .join(',')
    return {
      id: `min_${i}`,
      label,
      x: 160 + col * 220,
      y: 120 + row * 180,
      isStart: rowIsStart,
      isAccept: rowIsAccept,
    }
  })

  let tIdx = 0
  const minTransitions: Transition[] = []
  for (let i = 0; i < partitions.length; i++) {
    const representative = partitions[i][0]
    for (const sym of alphabet) {
      const target = transMap.get(representative)?.get(sym)
      if (target === undefined) continue
      const toClass = partitions.findIndex((p) => p.includes(target))
      if (toClass < 0) continue
      minTransitions.push({
        id: `min_t${tIdx++}`,
        from: `min_${i}`,
        to: `min_${toClass}`,
        label: sym,
      })
    }
  }

  const minDFA: AutomataGraph = {
    id: crypto.randomUUID(),
    name: dfa.name + ' (Min)',
    type: 'DFA',
    states: minStates,
    transitions: minTransitions,
    alphabet,
  }

  return { minDFA, table }
}
