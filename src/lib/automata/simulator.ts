import type {
  AutomataGraph,
  DFAConfig,
  DFAStep,
  NFAConfig,
  NFAStep,
  PDAConfig,
  PDAStep,
  TMConfig,
  TMStep,
  MealyConfig,
  MealyStep,
  MooreConfig,
  MooreStep,
  MultiTMConfig,
  MultiTMStep,
  MultiStringResult,
} from './types'
import {
  parsePDALabel,
  parseTMLabel,
  parseMealyLabel,
  parseMultiTMLabel,
} from './types'

// ─── Epsilon closure for NFA ──────────────────────────────────────────────────

function epsilonClosure(
  states: Set<string>,
  graph: AutomataGraph,
): Set<string> {
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

// ─── DFA Simulator ────────────────────────────────────────────────────────────

export function initDFA(graph: AutomataGraph, input: string): DFAConfig {
  const startState = graph.states.find((s) => s.isStart)
  return {
    currentState: startState?.id ?? '',
    remainingInput: input,
    step: 0,
    accepted: null,
    rejected: false,
    history: [],
  }
}

export function stepDFA(config: DFAConfig, graph: AutomataGraph): DFAConfig {
  if (config.rejected || config.accepted !== null) return config

  if (config.remainingInput.length === 0) {
    const state = graph.states.find((s) => s.id === config.currentState)
    return {
      ...config,
      accepted: state?.isAccept ?? false,
      rejected: !(state?.isAccept ?? false),
    }
  }

  const symbol = config.remainingInput[0]
  const rest = config.remainingInput.slice(1)

  const transition = graph.transitions.find((t) => {
    if (t.from !== config.currentState) return false
    const labels = t.label.split(',').map((l) => l.trim())
    return labels.includes(symbol)
  })

  const stepRecord: DFAStep = {
    state: config.currentState,
    input: config.remainingInput,
    symbol,
    nextState: transition?.to ?? null,
  }

  if (!transition) {
    return {
      ...config,
      remainingInput: rest,
      rejected: true,
      accepted: false,
      history: [...config.history, stepRecord],
      step: config.step + 1,
    }
  }

  return {
    ...config,
    currentState: transition.to,
    remainingInput: rest,
    step: config.step + 1,
    history: [...config.history, stepRecord],
  }
}

export function runDFA(graph: AutomataGraph, input: string): DFAConfig {
  let config = initDFA(graph, input)
  let iterations = 0
  while (config.accepted === null && !config.rejected && iterations < 10000) {
    config = stepDFA(config, graph)
    iterations++
  }
  return config
}

// ─── NFA Simulator ────────────────────────────────────────────────────────────

export function initNFA(graph: AutomataGraph, input: string): NFAConfig {
  const startStates = new Set(
    graph.states.filter((s) => s.isStart).map((s) => s.id),
  )
  return {
    currentStates: epsilonClosure(startStates, graph),
    remainingInput: input,
    step: 0,
    accepted: null,
    rejected: false,
    history: [],
  }
}

export function stepNFA(config: NFAConfig, graph: AutomataGraph): NFAConfig {
  if (config.rejected || config.accepted !== null) return config

  if (config.remainingInput.length === 0) {
    const accepted = [...config.currentStates].some(
      (id) => graph.states.find((s) => s.id === id)?.isAccept,
    )
    return { ...config, accepted, rejected: !accepted }
  }

  const symbol = config.remainingInput[0]
  const rest = config.remainingInput.slice(1)
  const nextStates = new Set<string>()

  for (const stateId of config.currentStates) {
    for (const t of graph.transitions) {
      if (t.from !== stateId) continue
      const labels = t.label.split(',').map((l) => l.trim())
      if (labels.includes(symbol)) {
        nextStates.add(t.to)
      }
    }
  }

  const closure = epsilonClosure(nextStates, graph)

  const stepRecord: NFAStep = {
    states: [...config.currentStates],
    input: config.remainingInput,
    symbol,
    nextStates: [...closure],
  }

  if (closure.size === 0) {
    return {
      ...config,
      currentStates: closure,
      remainingInput: rest,
      accepted: false,
      rejected: true,
      step: config.step + 1,
      history: [...config.history, stepRecord],
    }
  }

  return {
    ...config,
    currentStates: closure,
    remainingInput: rest,
    step: config.step + 1,
    history: [...config.history, stepRecord],
  }
}

export function runNFA(graph: AutomataGraph, input: string): NFAConfig {
  let config = initNFA(graph, input)
  let iterations = 0
  while (config.accepted === null && !config.rejected && iterations < 10000) {
    config = stepNFA(config, graph)
    iterations++
  }
  return config
}

// ─── PDA Simulator ────────────────────────────────────────────────────────────

export function initPDA(graph: AutomataGraph, input: string): PDAConfig {
  const startState = graph.states.find((s) => s.isStart)
  return {
    currentState: startState?.id ?? '',
    remainingInput: input,
    stack: ['Z'],
    step: 0,
    accepted: null,
    rejected: false,
    history: [],
  }
}

export function stepPDA(config: PDAConfig, graph: AutomataGraph): PDAConfig {
  if (config.rejected || config.accepted !== null) return config

  const stackTop = config.stack[config.stack.length - 1] ?? 'ε'

  if (config.remainingInput.length === 0) {
    const state = graph.states.find((s) => s.id === config.currentState)
    if (state?.isAccept) {
      return { ...config, accepted: true }
    }
    const epsilonTransitions = graph.transitions.filter((t) => {
      if (t.from !== config.currentState) return false
      const parsed = parsePDALabel(t.label)
      if (!parsed) return false
      return (
        (parsed.input === 'ε' || parsed.input === '') &&
        (parsed.pop === stackTop || parsed.pop === 'ε' || parsed.pop === '')
      )
    })
    if (epsilonTransitions.length === 0) {
      return {
        ...config,
        accepted: state?.isAccept ?? false,
        rejected: !(state?.isAccept ?? false),
      }
    }
    const t = epsilonTransitions[0]
    const parsed = parsePDALabel(t.label)!
    const newStack = [...config.stack]
    if (parsed.pop !== 'ε' && parsed.pop !== '') newStack.pop()
    if (parsed.push !== 'ε' && parsed.push !== '') {
      for (const ch of parsed.push.split('').reverse()) newStack.push(ch)
    }
    const nextState = graph.states.find((s) => s.id === t.to)
    return {
      ...config,
      currentState: t.to,
      stack: newStack,
      step: config.step + 1,
      accepted:
        nextState?.isAccept && config.remainingInput.length === 0 ? true : null,
      history: [
        ...config.history,
        {
          state: config.currentState,
          input: config.remainingInput,
          symbol: 'ε',
          stackTop,
          nextState: t.to,
          stackAction: parsed.push,
        },
      ],
    }
  }

  const symbol = config.remainingInput[0]
  const rest = config.remainingInput.slice(1)

  const matchingTransitions = graph.transitions.filter((t) => {
    if (t.from !== config.currentState) return false
    const parsed = parsePDALabel(t.label)
    if (!parsed) return false
    const inputMatch =
      parsed.input === symbol || parsed.input === 'ε' || parsed.input === ''
    const popMatch =
      parsed.pop === stackTop || parsed.pop === 'ε' || parsed.pop === ''
    return inputMatch && popMatch
  })

  if (matchingTransitions.length === 0) {
    const stepRecord: PDAStep = {
      state: config.currentState,
      input: config.remainingInput,
      symbol,
      stackTop,
      nextState: null,
      stackAction: '',
    }
    return {
      ...config,
      rejected: true,
      accepted: false,
      step: config.step + 1,
      history: [...config.history, stepRecord],
    }
  }

  const t = matchingTransitions[0]
  const parsed = parsePDALabel(t.label)!
  const newInput =
    parsed.input === 'ε' || parsed.input === '' ? config.remainingInput : rest
  const newStack = [...config.stack]
  if (parsed.pop !== 'ε' && parsed.pop !== '') newStack.pop()
  if (parsed.push !== 'ε' && parsed.push !== '') {
    for (const ch of [...parsed.push].reverse()) newStack.push(ch)
  }

  const stepRecord: PDAStep = {
    state: config.currentState,
    input: config.remainingInput,
    symbol: parsed.input,
    stackTop,
    nextState: t.to,
    stackAction: parsed.push,
  }

  return {
    ...config,
    currentState: t.to,
    remainingInput: newInput,
    stack: newStack,
    step: config.step + 1,
    history: [...config.history, stepRecord],
  }
}

export function runPDA(graph: AutomataGraph, input: string): PDAConfig {
  let config = initPDA(graph, input)
  let iterations = 0
  while (config.accepted === null && !config.rejected && iterations < 1000) {
    config = stepPDA(config, graph)
    iterations++
  }
  return config
}

// ─── TM Simulator ────────────────────────────────────────────────────────────

export function initTM(graph: AutomataGraph, input: string): TMConfig {
  const startState = graph.states.find((s) => s.isStart)
  const tape = input.length > 0 ? [...input] : [graph.blankSymbol ?? 'B']
  return {
    currentState: startState?.id ?? '',
    tape,
    headPosition: 0,
    step: 0,
    accepted: null,
    rejected: false,
    halted: false,
    history: [],
  }
}

export function stepTM(config: TMConfig, graph: AutomataGraph): TMConfig {
  if (config.rejected || config.accepted !== null || config.halted)
    return config

  const blank = graph.blankSymbol ?? 'B'
  const tape = [...config.tape]
  while (tape.length <= config.headPosition) tape.push(blank)
  const readSymbol = tape[config.headPosition]

  const transition = graph.transitions.find((t) => {
    if (t.from !== config.currentState) return false
    const parsed = parseTMLabel(t.label)
    return parsed?.read === readSymbol || parsed?.read === '_'
  })

  const state = graph.states.find((s) => s.id === config.currentState)

  if (!transition) {
    const isAccept = state?.isAccept ?? false
    const stepRecord: TMStep = {
      state: config.currentState,
      read: readSymbol,
      write: readSymbol,
      direction: 'S',
      nextState: null,
    }
    return {
      ...config,
      accepted: isAccept ? true : false,
      rejected: !isAccept,
      halted: true,
      step: config.step + 1,
      history: [...config.history, stepRecord],
    }
  }

  const parsed = parseTMLabel(transition.label)!
  tape[config.headPosition] = parsed.write

  let newHead = config.headPosition
  if (parsed.direction === 'R') newHead++
  else if (parsed.direction === 'L') newHead = Math.max(0, newHead - 1)

  while (tape.length <= newHead) tape.push(blank)

  const nextState = graph.states.find((s) => s.id === transition.to)
  const stepRecord: TMStep = {
    state: config.currentState,
    read: readSymbol,
    write: parsed.write,
    direction: parsed.direction,
    nextState: transition.to,
  }

  return {
    ...config,
    currentState: transition.to,
    tape,
    headPosition: newHead,
    step: config.step + 1,
    accepted: nextState?.isAccept ? true : null,
    halted: nextState?.isAccept ?? false,
    history: [...config.history, stepRecord],
  }
}

export function runTM(graph: AutomataGraph, input: string): TMConfig {
  let config = initTM(graph, input)
  let iterations = 0
  while (
    config.accepted === null &&
    !config.rejected &&
    !config.halted &&
    iterations < 10000
  ) {
    config = stepTM(config, graph)
    iterations++
  }
  return config
}

// ─── Mealy Machine Simulator ──────────────────────────────────────────────────

export function initMealy(graph: AutomataGraph, input: string): MealyConfig {
  const startState = graph.states.find((s) => s.isStart)
  return {
    currentState: startState?.id ?? '',
    remainingInput: input,
    output: '',
    step: 0,
    accepted: null,
    rejected: false,
    history: [],
  }
}

export function stepMealy(
  config: MealyConfig,
  graph: AutomataGraph,
): MealyConfig {
  if (config.rejected || config.accepted !== null) return config

  if (config.remainingInput.length === 0) {
    const state = graph.states.find((s) => s.id === config.currentState)
    return {
      ...config,
      accepted: state?.isAccept ?? false,
      rejected: !(state?.isAccept ?? false),
    }
  }

  const symbol = config.remainingInput[0]
  const rest = config.remainingInput.slice(1)

  const transition = graph.transitions.find((t) => {
    if (t.from !== config.currentState) return false
    const parsed = parseMealyLabel(t.label)
    if (!parsed) return false
    return parsed.input === symbol
  })

  if (!transition) {
    const stepRecord: MealyStep = {
      state: config.currentState,
      input: config.remainingInput,
      symbol,
      output: '',
      nextState: null,
    }
    return {
      ...config,
      remainingInput: rest,
      rejected: true,
      accepted: false,
      history: [...config.history, stepRecord],
      step: config.step + 1,
    }
  }

  const parsed = parseMealyLabel(transition.label)!
  const stepRecord: MealyStep = {
    state: config.currentState,
    input: config.remainingInput,
    symbol,
    output: parsed.output,
    nextState: transition.to,
  }

  return {
    ...config,
    currentState: transition.to,
    remainingInput: rest,
    output: config.output + parsed.output,
    step: config.step + 1,
    history: [...config.history, stepRecord],
  }
}

export function runMealy(graph: AutomataGraph, input: string): MealyConfig {
  let config = initMealy(graph, input)
  let iterations = 0
  while (config.accepted === null && !config.rejected && iterations < 10000) {
    config = stepMealy(config, graph)
    iterations++
  }
  return config
}

// ─── Moore Machine Simulator ──────────────────────────────────────────────────

export function initMoore(graph: AutomataGraph, input: string): MooreConfig {
  const startState = graph.states.find((s) => s.isStart)
  // Moore output: emit output of start state immediately
  const initialOutput = startState?.mooreOutput ?? ''
  return {
    currentState: startState?.id ?? '',
    remainingInput: input,
    output: initialOutput,
    step: 0,
    accepted: null,
    rejected: false,
    history: [],
  }
}

export function stepMoore(
  config: MooreConfig,
  graph: AutomataGraph,
): MooreConfig {
  if (config.rejected || config.accepted !== null) return config

  if (config.remainingInput.length === 0) {
    const state = graph.states.find((s) => s.id === config.currentState)
    return {
      ...config,
      accepted: state?.isAccept ?? false,
      rejected: !(state?.isAccept ?? false),
    }
  }

  const symbol = config.remainingInput[0]
  const rest = config.remainingInput.slice(1)

  // Moore: transitions labeled with just the input symbol
  const transition = graph.transitions.find((t) => {
    if (t.from !== config.currentState) return false
    const labels = t.label.split(',').map((l) => l.trim())
    return labels.includes(symbol)
  })

  if (!transition) {
    const stepRecord: MooreStep = {
      state: config.currentState,
      input: config.remainingInput,
      symbol,
      stateOutput: '',
      nextState: null,
    }
    return {
      ...config,
      remainingInput: rest,
      rejected: true,
      accepted: false,
      history: [...config.history, stepRecord],
      step: config.step + 1,
    }
  }

  const nextStateObj = graph.states.find((s) => s.id === transition.to)
  const stateOutput = nextStateObj?.mooreOutput ?? ''

  const stepRecord: MooreStep = {
    state: config.currentState,
    input: config.remainingInput,
    symbol,
    stateOutput,
    nextState: transition.to,
  }

  return {
    ...config,
    currentState: transition.to,
    remainingInput: rest,
    output: config.output + stateOutput,
    step: config.step + 1,
    history: [...config.history, stepRecord],
  }
}

export function runMoore(graph: AutomataGraph, input: string): MooreConfig {
  let config = initMoore(graph, input)
  let iterations = 0
  while (config.accepted === null && !config.rejected && iterations < 10000) {
    config = stepMoore(config, graph)
    iterations++
  }
  return config
}

// ─── Multi-tape TM Simulator ──────────────────────────────────────────────────

export function initMultiTM(
  graph: AutomataGraph,
  input: string,
): MultiTMConfig {
  const startState = graph.states.find((s) => s.isStart)
  const blank = graph.blankSymbol ?? 'B'
  const numTapes = graph.numTapes ?? 2
  const tapes: string[][] = []
  for (let i = 0; i < numTapes; i++) {
    tapes.push(i === 0 ? (input.length > 0 ? [...input] : [blank]) : [blank])
  }
  return {
    currentState: startState?.id ?? '',
    tapes,
    headPositions: new Array(numTapes).fill(0) as number[],
    step: 0,
    accepted: null,
    rejected: false,
    halted: false,
    history: [],
  }
}

export function stepMultiTM(
  config: MultiTMConfig,
  graph: AutomataGraph,
): MultiTMConfig {
  if (config.rejected || config.accepted !== null || config.halted)
    return config

  const blank = graph.blankSymbol ?? 'B'
  const numTapes = graph.numTapes ?? 2
  const tapes = config.tapes.map((t) => [...t])

  // Expand tapes as needed
  for (let i = 0; i < numTapes; i++) {
    while (tapes[i].length <= config.headPositions[i]) tapes[i].push(blank)
  }

  const reads = config.headPositions.map((pos, i) => tapes[i][pos] ?? blank)

  const transition = graph.transitions.find((t) => {
    if (t.from !== config.currentState) return false
    const parsed = parseMultiTMLabel(t.label, numTapes)
    if (!parsed) return false
    return parsed.reads.every((r, i) => r === reads[i] || r === '_')
  })

  const state = graph.states.find((s) => s.id === config.currentState)

  if (!transition) {
    const isAccept = state?.isAccept ?? false
    const stepRecord: MultiTMStep = {
      state: config.currentState,
      reads,
      writes: reads,
      directions: new Array(numTapes).fill('S') as ('L' | 'R' | 'S')[],
      nextState: null,
    }
    return {
      ...config,
      accepted: isAccept,
      rejected: !isAccept,
      halted: true,
      step: config.step + 1,
      history: [...config.history, stepRecord],
    }
  }

  const parsed = parseMultiTMLabel(transition.label, numTapes)!
  const newHeads = [...config.headPositions]

  for (let i = 0; i < numTapes; i++) {
    tapes[i][config.headPositions[i]] = parsed.writes[i]
    if (parsed.directions[i] === 'R') newHeads[i]++
    else if (parsed.directions[i] === 'L')
      newHeads[i] = Math.max(0, newHeads[i] - 1)
    while (tapes[i].length <= newHeads[i]) tapes[i].push(blank)
  }

  const nextStateObj = graph.states.find((s) => s.id === transition.to)
  const stepRecord: MultiTMStep = {
    state: config.currentState,
    reads,
    writes: parsed.writes,
    directions: parsed.directions,
    nextState: transition.to,
  }

  return {
    ...config,
    currentState: transition.to,
    tapes,
    headPositions: newHeads,
    step: config.step + 1,
    accepted: nextStateObj?.isAccept ? true : null,
    halted: nextStateObj?.isAccept ?? false,
    history: [...config.history, stepRecord],
  }
}

export function runMultiTM(graph: AutomataGraph, input: string): MultiTMConfig {
  let config = initMultiTM(graph, input)
  let iterations = 0
  while (
    config.accepted === null &&
    !config.rejected &&
    !config.halted &&
    iterations < 10000
  ) {
    config = stepMultiTM(config, graph)
    iterations++
  }
  return config
}

// ─── Multi-String Batch Tester ────────────────────────────────────────────────

export function runMultipleStrings(
  graph: AutomataGraph,
  inputs: string[],
): MultiStringResult[] {
  return inputs.map((input) => {
    try {
      switch (graph.type) {
        case 'DFA': {
          const r = runDFA(graph, input)
          return {
            input,
            accepted: r.accepted === true,
            rejected: r.rejected,
            steps: r.step,
            simConfig: r,
          }
        }
        case 'NFA': {
          const r = runNFA(graph, input)
          return {
            input,
            accepted: r.accepted === true,
            rejected: r.rejected,
            steps: r.step,
            simConfig: r,
          }
        }
        case 'PDA': {
          const r = runPDA(graph, input)
          return {
            input,
            accepted: r.accepted === true,
            rejected: r.rejected,
            steps: r.step,
            simConfig: r,
          }
        }
        case 'TM': {
          const r = runTM(graph, input)
          return {
            input,
            accepted: r.accepted === true,
            rejected: r.rejected,
            steps: r.step,
            simConfig: r,
          }
        }
        case 'Mealy': {
          const r = runMealy(graph, input)
          return {
            input,
            accepted: r.accepted === true,
            rejected: r.rejected,
            steps: r.step,
            output: r.output,
            simConfig: r,
          }
        }
        case 'Moore': {
          const r = runMoore(graph, input)
          return {
            input,
            accepted: r.accepted === true,
            rejected: r.rejected,
            steps: r.step,
            output: r.output,
            simConfig: r,
          }
        }
        case 'MultiTM': {
          const r = runMultiTM(graph, input)
          return {
            input,
            accepted: r.accepted === true,
            rejected: r.rejected,
            steps: r.step,
            simConfig: r,
          }
        }
        default:
          return {
            input,
            accepted: false,
            rejected: true,
            steps: 0,
          }
      }
    } catch {
      return { input, accepted: false, rejected: true, steps: 0 }
    }
  })
}

// ─── Grammar Derivation Engine ────────────────────────────────────────────────

export interface DerivationStep {
  sentential: string
  appliedProduction: string
}

export function deriveGrammar(
  graph: AutomataGraph,
  maxSteps = 20,
): DerivationStep[] {
  const productions = graph.productions ?? []
  const nonTerminals = new Set(graph.nonTerminals ?? [])
  const startSymbol = graph.startSymbol ?? 'S'

  const steps: DerivationStep[] = [
    { sentential: startSymbol, appliedProduction: 'start' },
  ]
  let current = startSymbol

  for (let i = 0; i < maxSteps; i++) {
    // Find leftmost non-terminal
    let foundNT: string | null = null
    let foundIdx = -1
    for (let j = 0; j < current.length; j++) {
      if (nonTerminals.has(current[j])) {
        foundNT = current[j]
        foundIdx = j
        break
      }
    }
    if (!foundNT || foundIdx === -1) break

    // Find a production for this non-terminal
    const applicable = productions.filter((p) => p.lhs === foundNT)
    if (applicable.length === 0) break

    const prod = applicable[0]
    const rhs = prod.rhs === 'ε' ? '' : prod.rhs
    current =
      current.slice(0, foundIdx) +
      rhs +
      current.slice(foundIdx + foundNT.length)
    steps.push({
      sentential: current || 'ε',
      appliedProduction: `${prod.lhs} → ${prod.rhs}`,
    })
  }

  return steps
}

export function checkStringInGrammar(
  graph: AutomataGraph,
  input: string,
  maxIterations = 5000,
): boolean {
  const productions = graph.productions ?? []
  const nonTerminals = new Set(graph.nonTerminals ?? [])
  const startSymbol = graph.startSymbol ?? 'S'

  // BFS over sentential forms
  const visited = new Set<string>()
  const queue: string[] = [startSymbol]
  let iterations = 0

  while (queue.length > 0 && iterations < maxIterations) {
    const current = queue.shift()!
    iterations++

    if (current === input) return true
    if (visited.has(current)) continue
    visited.add(current)

    // Pruning: if length exceeds input, skip (only for CFG/Regular)
    if (
      (graph.grammarType === 'CFG' || graph.grammarType === 'Regular') &&
      current.length > input.length + 2
    )
      continue

    // Expand leftmost non-terminal
    let expanded = false
    for (let i = 0; i < current.length; i++) {
      if (nonTerminals.has(current[i])) {
        const nt = current[i]
        for (const prod of productions) {
          if (prod.lhs === nt) {
            const rhs = prod.rhs === 'ε' ? '' : prod.rhs
            const next =
              current.slice(0, i) + rhs + current.slice(i + nt.length)
            if (!visited.has(next)) {
              queue.push(next)
            }
          }
        }
        expanded = true
        break
      }
    }

    if (!expanded && current === input) return true
  }

  return false
}

// ─── L-System Engine ──────────────────────────────────────────────────────────

export function expandLSystem(
  axiom: string,
  rules: { symbol: string; replacement: string }[],
  iterations: number,
): string {
  let current = axiom
  const ruleMap = new Map(rules.map((r) => [r.symbol, r.replacement]))
  for (let i = 0; i < iterations; i++) {
    let next = ''
    for (const ch of current) {
      next += ruleMap.get(ch) ?? ch
    }
    current = next
    if (current.length > 100000) break // safety limit
  }
  return current
}

export interface LSystemPoint {
  x: number
  y: number
}

export interface LSystemSegment {
  x1: number
  y1: number
  x2: number
  y2: number
  depth: number
}

export function renderLSystem(
  axiom: string,
  rules: { symbol: string; replacement: string }[],
  iterations: number,
  angle: number,
  stepLen = 10,
): LSystemSegment[] {
  const expanded = expandLSystem(axiom, rules, iterations)
  const segments: LSystemSegment[] = []
  const stack: { x: number; y: number; angle: number; depth: number }[] = []
  let x = 0,
    y = 0,
    currentAngle = -90,
    depth = 0

  const toRad = (deg: number) => (deg * Math.PI) / 180

  for (const ch of expanded) {
    switch (ch) {
      case 'F':
      case 'G': {
        const nx = x + stepLen * Math.cos(toRad(currentAngle))
        const ny = y + stepLen * Math.sin(toRad(currentAngle))
        segments.push({ x1: x, y1: y, x2: nx, y2: ny, depth })
        x = nx
        y = ny
        break
      }
      case 'f': {
        x += stepLen * Math.cos(toRad(currentAngle))
        y += stepLen * Math.sin(toRad(currentAngle))
        break
      }
      case '+':
        currentAngle += angle
        break
      case '-':
        currentAngle -= angle
        break
      case '[':
        stack.push({ x, y, angle: currentAngle, depth })
        depth++
        break
      case ']':
        if (stack.length > 0) {
          const top = stack.pop()!
          x = top.x
          y = top.y
          currentAngle = top.angle
          depth = top.depth
        }
        break
    }
  }

  return segments
}

// ─── Regular Expression Engine ────────────────────────────────────────────────

export interface RegExTestResult {
  input: string
  matched: boolean
  matches: string[]
  groups: (string | undefined)[][]
}

export function testRegEx(
  pattern: string,
  flags: string,
  inputs: string[],
): RegExTestResult[] {
  return inputs.map((input) => {
    try {
      const safeFlags = (flags || 'g').replace(/[^gimsuy]/g, '')
      const re = new RegExp(
        pattern,
        safeFlags.includes('g') ? safeFlags : safeFlags + 'g',
      )
      const matches: string[] = []
      const groups: (string | undefined)[][] = []
      let m: RegExpExecArray | null
      re.lastIndex = 0
      while ((m = re.exec(input)) !== null) {
        matches.push(m[0])
        groups.push(m.slice(1))
        if (!safeFlags.includes('g')) break
        if (re.lastIndex === m.index) re.lastIndex++
      }
      return { input, matched: matches.length > 0, matches, groups }
    } catch {
      return { input, matched: false, matches: [], groups: [] }
    }
  })
}

// ─── Pumping Lemma ────────────────────────────────────────────────────────────

export interface RegularPumpingAnalysis {
  word: string
  pumpingLength: number
  decompositions: {
    x: string
    y: string
    z: string
    valid: boolean
    pumpedWords: { i: number; word: string; note: string }[]
  }[]
  canBePumped: boolean
  explanation: string
}

export function analyzeRegularPumping(
  word: string,
  pumpingLength: number,
): RegularPumpingAnalysis {
  const p = Math.max(1, pumpingLength)
  const decompositions: RegularPumpingAnalysis['decompositions'] = []

  // Generate candidate decompositions: x,y,z where |xy| <= p, |y| >= 1
  for (let xyLen = 1; xyLen <= Math.min(p, word.length); xyLen++) {
    for (let yStart = 0; yStart < xyLen; yStart++) {
      const yLen = xyLen - yStart
      if (yLen < 1) continue
      const x = word.slice(0, yStart)
      const y = word.slice(yStart, yStart + yLen)
      const z = word.slice(yStart + yLen)
      if (!y) continue

      const pumpedWords: { i: number; word: string; note: string }[] = []
      for (let i = 0; i <= 4; i++) {
        const pumped = x + y.repeat(i) + z
        pumpedWords.push({ i, word: pumped, note: `i=${i}: "${pumped}"` })
      }

      decompositions.push({ x, y, z, valid: true, pumpedWords })
    }
  }

  return {
    word,
    pumpingLength: p,
    decompositions: decompositions.slice(0, 6),
    canBePumped: decompositions.length > 0,
    explanation: `For pumping length p=${p}, the word "${word}" of length ${word.length} must have a decomposition w = xyz where |xy| ≤ p, |y| ≥ 1, and xyi z ∈ L for all i ≥ 0.`,
  }
}

export interface CFPumpingAnalysis {
  word: string
  pumpingLength: number
  decompositions: {
    u: string
    v: string
    x: string
    y: string
    z: string
    valid: boolean
    pumpedWords: { i: number; word: string; note: string }[]
  }[]
  canBePumped: boolean
  explanation: string
}

export function analyzeCFPumping(
  word: string,
  pumpingLength: number,
): CFPumpingAnalysis {
  const p = Math.max(1, pumpingLength)
  const decompositions: CFPumpingAnalysis['decompositions'] = []

  // Generate candidate decompositions: uvxyz where |vxy| <= p, |vy| >= 1
  const wLen = word.length
  for (let vxyLen = 1; vxyLen <= Math.min(p, wLen); vxyLen++) {
    for (let uLen = 0; uLen + vxyLen <= wLen; uLen++) {
      for (let vLen = 0; vLen <= vxyLen; vLen++) {
        for (let yLen = 1; yLen <= vxyLen - vLen; yLen++) {
          if (vLen + yLen < 1) continue
          const xLen = vxyLen - vLen - yLen
          const u = word.slice(0, uLen)
          const v = word.slice(uLen, uLen + vLen)
          const x = word.slice(uLen + vLen, uLen + vLen + xLen)
          const y = word.slice(uLen + vLen + xLen, uLen + vLen + xLen + yLen)
          const z = word.slice(uLen + vLen + xLen + yLen)
          if (!v && !y) continue

          const pumpedWords: { i: number; word: string; note: string }[] = []
          for (let i = 0; i <= 3; i++) {
            const pumped = u + v.repeat(i) + x + y.repeat(i) + z
            pumpedWords.push({ i, word: pumped, note: `i=${i}: "${pumped}"` })
          }
          decompositions.push({ u, v, x, y, z, valid: true, pumpedWords })
          if (decompositions.length >= 6) break
        }
        if (decompositions.length >= 6) break
      }
      if (decompositions.length >= 6) break
    }
    if (decompositions.length >= 6) break
  }

  return {
    word,
    pumpingLength: p,
    decompositions,
    canBePumped: decompositions.length > 0,
    explanation: `Context-Free Pumping Lemma: For pumping length p=${p}, the word "${word}" must have a decomposition w = uvxyz where |vxy| ≤ p, |vy| ≥ 1, and uvi xyi z ∈ L for all i ≥ 0.`,
  }
}
