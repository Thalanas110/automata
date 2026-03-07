import type {
  AutomataGraph,
  DFAStep,
  NFAStep,
  PDAStep,
  TMStep,
} from '@/lib/automata/types'

export interface DFAStepDetails {
  input: string
  symbol: string
  state: string
}

export interface NFAStepDetails {
  input: string
  symbol: string
  states: string
}

export interface PDAStepDetails {
  input: string
  symbol: string
  state: string
  stackTop: string
}

export interface TMStepDetails {
  state: string
  read: string
  write: string
  direction: string
}

export type StepDetails =
  | DFAStepDetails
  | NFAStepDetails
  | PDAStepDetails
  | TMStepDetails
  | null

export function getStepDetails(
  history: unknown[],
  currentStep: number,
  graph: AutomataGraph
): StepDetails {
  if (!history[currentStep]) return null

  const step = history[currentStep]

  switch (graph.type) {
    case 'DFA': {
      const dfaStep = step as DFAStep
      return {
        input: dfaStep.input,
        symbol: dfaStep.symbol,
        state:
          graph.states.find((s) => s.id === dfaStep.state)?.label ||
          dfaStep.state,
      }
    }
    case 'NFA': {
      const nfaStep = step as NFAStep
      return {
        input: nfaStep.input,
        symbol: nfaStep.symbol,
        states: nfaStep.states
          .map((id) => graph.states.find((s) => s.id === id)?.label || id)
          .join(', '),
      }
    }
    case 'PDA': {
      const pdaStep = step as PDAStep
      return {
        input: pdaStep.input,
        symbol: pdaStep.symbol,
        state:
          graph.states.find((s) => s.id === pdaStep.state)?.label ||
          pdaStep.state,
        stackTop: pdaStep.stackTop || 'ε',
      }
    }
    case 'TM':
    case 'Mealy':
    case 'Moore':
    case 'MultiTM': {
      const tmStep = step as TMStep
      return {
        state:
          graph.states.find((s) => s.id === tmStep.state)?.label ||
          tmStep.state,
        read: tmStep.read,
        write: tmStep.write,
        direction: tmStep.direction,
      }
    }
    default:
      return null
  }
}
