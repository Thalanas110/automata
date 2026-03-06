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
