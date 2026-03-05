// ─── Core Automata Types ──────────────────────────────────────────────────────

export type MachineType =
  | 'DFA'
  | 'NFA'
  | 'PDA'
  | 'TM'
  | 'Mealy'
  | 'Moore'
  | 'MultiTM'
  | 'TMBlocks'
  | 'Grammar'
  | 'LSystem'
  | 'RegEx'

export interface State {
  id: string
  label: string
  x: number
  y: number
  isStart: boolean
  isAccept: boolean
  // Moore machine output (one output per state)
  mooreOutput?: string
}

export interface Transition {
  id: string
  from: string
  to: string
  // For DFA/NFA: single symbol or comma-separated
  // For NFA: 'ε' allowed
  // For PDA: "input,pop/push" format
  // For TM: "read/write,direction" format
  // For Mealy: "input/output"
  // For Moore: just "input" (output on state)
  label: string
}

// ─── Grammar Types ────────────────────────────────────────────────────────────

export interface GrammarProduction {
  id: string
  lhs: string
  rhs: string
}

export type GrammarType = 'Regular' | 'CFG' | 'CSG' | 'Unrestricted'

export interface GrammarGraph {
  id: string
  name: string
  type: 'Grammar'
  grammarType: GrammarType
  startSymbol: string
  terminals: string[]
  nonTerminals: string[]
  productions: GrammarProduction[]
  // required for AutomataGraph compat
  states: State[]
  transitions: Transition[]
  alphabet: string[]
}

// ─── L-System Types ───────────────────────────────────────────────────────────

export interface LSystemRule {
  id: string
  symbol: string
  replacement: string
}

export interface LSystemGraph {
  id: string
  name: string
  type: 'LSystem'
  axiom: string
  rules: LSystemRule[]
  iterations: number
  angle: number
  // required for AutomataGraph compat
  states: State[]
  transitions: Transition[]
  alphabet: string[]
}

// ─── RegEx Types ──────────────────────────────────────────────────────────────

export interface RegExGraph {
  id: string
  name: string
  type: 'RegEx'
  pattern: string
  flags: string
  // required for AutomataGraph compat
  states: State[]
  transitions: Transition[]
  alphabet: string[]
}

// ─── Multi-tape TM Types ──────────────────────────────────────────────────────

export interface MultiTMTransitionLabel {
  // reads[i] = symbol read on tape i
  reads: string[]
  // writes[i] = symbol written on tape i
  writes: string[]
  // directions[i] = L/R/S for tape i
  directions: ('L' | 'R' | 'S')[]
}

// ─── TM Building Blocks Types ────────────────────────────────────────────────

export interface TMBlock {
  id: string
  name: string
  description: string
  graph: AutomataGraph
}

export interface TMBlocksGraph {
  id: string
  name: string
  type: 'TMBlocks'
  blocks: TMBlock[]
  // composition order
  sequence: string[]
  // required for AutomataGraph compat
  states: State[]
  transitions: Transition[]
  alphabet: string[]
  tapeAlphabet?: string[]
  blankSymbol?: string
}

// ─── AutomataGraph union ──────────────────────────────────────────────────────

export interface AutomataGraph {
  id: string
  name: string
  type: MachineType
  states: State[]
  transitions: Transition[]
  alphabet: string[]
  // PDA: stack alphabet
  stackAlphabet?: string[]
  // TM / MultiTM: tape alphabet
  tapeAlphabet?: string[]
  blankSymbol?: string
  // Multi-tape TM: number of tapes
  numTapes?: number
  // Grammar
  grammarType?: GrammarType
  startSymbol?: string
  terminals?: string[]
  nonTerminals?: string[]
  productions?: GrammarProduction[]
  // L-System
  axiom?: string
  lsystemRules?: LSystemRule[]
  iterations?: number
  lsystemAngle?: number
  // RegEx
  pattern?: string
  regexFlags?: string
  // TM Blocks
  blocks?: TMBlock[]
  blockSequence?: string[]
}

// ─── Simulation Types ────────────────────────────────────────────────────────

export interface DFAConfig {
  currentState: string
  remainingInput: string
  step: number
  accepted: boolean | null
  rejected: boolean
  history: DFAStep[]
}

export interface DFAStep {
  state: string
  input: string
  symbol: string
  nextState: string | null
}

export interface NFAConfig {
  currentStates: Set<string>
  remainingInput: string
  step: number
  accepted: boolean | null
  rejected: boolean
  history: NFAStep[]
}

export interface NFAStep {
  states: string[]
  input: string
  symbol: string
  nextStates: string[]
}

export interface PDAConfig {
  currentState: string
  remainingInput: string
  stack: string[]
  step: number
  accepted: boolean | null
  rejected: boolean
  history: PDAStep[]
}

export interface PDAStep {
  state: string
  input: string
  symbol: string
  stackTop: string
  nextState: string | null
  stackAction: string
}

export interface TapeCell {
  value: string
  index: number
}

export interface TMConfig {
  currentState: string
  tape: string[]
  headPosition: number
  step: number
  accepted: boolean | null
  rejected: boolean
  halted: boolean
  history: TMStep[]
}

export interface TMStep {
  state: string
  read: string
  write: string
  direction: 'L' | 'R' | 'S'
  nextState: string | null
}

// ─── Mealy/Moore Simulation ───────────────────────────────────────────────────

export interface MealyConfig {
  currentState: string
  remainingInput: string
  output: string
  step: number
  accepted: boolean | null
  rejected: boolean
  history: MealyStep[]
}

export interface MealyStep {
  state: string
  input: string
  symbol: string
  output: string
  nextState: string | null
}

export interface MooreConfig {
  currentState: string
  remainingInput: string
  output: string
  step: number
  accepted: boolean | null
  rejected: boolean
  history: MooreStep[]
}

export interface MooreStep {
  state: string
  input: string
  symbol: string
  stateOutput: string
  nextState: string | null
}

// ─── Multi-tape TM Simulation ─────────────────────────────────────────────────

export interface MultiTMConfig {
  currentState: string
  tapes: string[][]
  headPositions: number[]
  step: number
  accepted: boolean | null
  rejected: boolean
  halted: boolean
  history: MultiTMStep[]
}

export interface MultiTMStep {
  state: string
  reads: string[]
  writes: string[]
  directions: ('L' | 'R' | 'S')[]
  nextState: string | null
}

export type SimulationConfig =
  | DFAConfig
  | NFAConfig
  | PDAConfig
  | TMConfig
  | MealyConfig
  | MooreConfig
  | MultiTMConfig

// ─── Multi-String Test Result ────────────────────────────────────────────────

export interface MultiStringResult {
  input: string
  accepted: boolean
  rejected: boolean
  steps: number
  output?: string // for Mealy/Moore
}

// ─── Pumping Lemma Types ─────────────────────────────────────────────────────

export type PumpingLemmaType = 'Regular' | 'ContextFree'

export interface PumpingDecomposition {
  // Regular: w = xyz
  // CF: w = uvxyz
  parts: string[]
  valid: boolean
  pumpValue: number // i
  pumped: string
  satisfied: boolean
  explanation: string
}

// ─── AI Types ────────────────────────────────────────────────────────────────

export interface AIMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: number
}

export interface AIGeneratedMachine {
  graph: AutomataGraph
  explanation: string
}

// ─── Editor State ────────────────────────────────────────────────────────────

export type EditorTool = 'select' | 'addState' | 'addTransition' | 'delete'

export interface EditorState {
  tool: EditorTool
  selectedStateId: string | null
  selectedTransitionId: string | null
  transitionSource: string | null
}

// ─── Parsed Transition Labels ─────────────────────────────────────────────────

export interface ParsedPDALabel {
  input: string
  pop: string
  push: string
}

export interface ParsedTMLabel {
  read: string
  write: string
  direction: 'L' | 'R' | 'S'
}

export interface ParsedMealyLabel {
  input: string
  output: string
}

export function parsePDALabel(label: string): ParsedPDALabel | null {
  const match = label.match(/^(.+),(.+)\/(.+)$/)
  if (!match) return null
  return { input: match[1].trim(), pop: match[2].trim(), push: match[3].trim() }
}

export function parseTMLabel(label: string): ParsedTMLabel | null {
  const match = label.match(/^(.+)\/(.+),(L|R|S)$/)
  if (!match) return null
  const dir = match[3].trim() as 'L' | 'R' | 'S'
  return { read: match[1].trim(), write: match[2].trim(), direction: dir }
}

export function parseMealyLabel(label: string): ParsedMealyLabel | null {
  // Format: "a/b" — input a, output b
  const match = label.match(/^(.+)\/(.+)$/)
  if (!match) return null
  return { input: match[1].trim(), output: match[2].trim() }
}

export function parseMultiTMLabel(
  label: string,
  numTapes: number,
): MultiTMTransitionLabel | null {
  // Format: "a,b/c,d/R,L" for 2 tapes: reads=[a,b], writes=[c,d], dirs=[R,L]
  // Generalized: reads separated by comma, then /, then writes, then /, then dirs
  try {
    const parts = label.split('/')
    if (parts.length !== 3) return null
    const reads = parts[0].split(',').map((s) => s.trim())
    const writes = parts[1].split(',').map((s) => s.trim())
    const dirs = parts[2].split(',').map((s) => s.trim() as 'L' | 'R' | 'S')
    if (
      reads.length !== numTapes ||
      writes.length !== numTapes ||
      dirs.length !== numTapes
    )
      return null
    return { reads, writes, directions: dirs }
  } catch {
    return null
  }
}

export function createEmptyGraph(type: MachineType): AutomataGraph {
  const base: AutomataGraph = {
    id: crypto.randomUUID(),
    name: `New ${type}`,
    type,
    states: [],
    transitions: [],
    alphabet: [],
  }
  if (type === 'PDA') {
    base.stackAlphabet = []
  }
  if (type === 'TM' || type === 'MultiTM' || type === 'TMBlocks') {
    base.tapeAlphabet = []
    base.blankSymbol = 'B'
  }
  if (type === 'MultiTM') {
    base.numTapes = 2
  }
  if (type === 'Grammar') {
    base.grammarType = 'CFG'
    base.startSymbol = 'S'
    base.terminals = []
    base.nonTerminals = ['S']
    base.productions = []
  }
  if (type === 'LSystem') {
    base.axiom = 'F'
    base.lsystemRules = [
      { id: crypto.randomUUID(), symbol: 'F', replacement: 'F+F-F-F+F' },
    ]
    base.iterations = 3
    base.lsystemAngle = 90
  }
  if (type === 'RegEx') {
    base.pattern = ''
    base.regexFlags = 'g'
  }
  if (type === 'TMBlocks') {
    base.blocks = []
    base.blockSequence = []
  }
  return base
}
