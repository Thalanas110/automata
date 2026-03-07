import type {
  AutomataGraph,
  DFAStep,
  NFAStep,
  PDAStep,
  TMStep,
} from '@/lib/automata/types'
import type { SimConfig } from '../types'

export interface ActiveStatesResult {
  activeStateIds: string[]
  acceptedStateIds: string[]
  rejectedStateIds: string[]
}

export function getActiveStates(
  history: unknown[],
  currentStep: number,
  totalSteps: number,
  graphType: AutomataGraph['type'],
  simConfig: SimConfig
): ActiveStatesResult {
  if (!history[currentStep]) {
    return { activeStateIds: [], acceptedStateIds: [], rejectedStateIds: [] }
  }

  const step = history[currentStep]
  let activeIds: string[] = []
  let acceptedIds: string[] = []
  let rejectedIds: string[] = []

  // Check if this is the final step
  const isFinalStep = currentStep === totalSteps - 1

  switch (graphType) {
    case 'DFA': {
      const dfaStep = step as DFAStep
      if (isFinalStep) {
        if (simConfig.accepted) {
          acceptedIds = [dfaStep.nextState].filter((s) => s !== null) as string[]
        } else if (simConfig.rejected) {
          rejectedIds = [dfaStep.nextState].filter((s) => s !== null) as string[]
        } else {
          activeIds = [dfaStep.nextState].filter((s) => s !== null) as string[]
        }
      } else {
        activeIds = [dfaStep.state].filter((s) => s !== null) as string[]
      }
      break
    }
    case 'NFA': {
      const nfaStep = step as NFAStep
      if (isFinalStep) {
        if (simConfig.accepted) {
          acceptedIds = [...nfaStep.nextStates]
        } else if (simConfig.rejected) {
          rejectedIds = [...nfaStep.nextStates]
        } else {
          activeIds = [...nfaStep.nextStates]
        }
      } else {
        activeIds = [...nfaStep.states]
      }
      break
    }
    case 'PDA': {
      const pdaStep = step as PDAStep
      if (isFinalStep) {
        const nextState = pdaStep.nextState
        if (nextState === null) {
          rejectedIds = []
        } else if (simConfig.accepted) {
          acceptedIds = [nextState]
        } else if (simConfig.rejected) {
          rejectedIds = [nextState]
        } else {
          activeIds = [nextState]
        }
      } else {
        activeIds = pdaStep.state ? [pdaStep.state] : []
      }
      break
    }
    case 'TM':
    case 'Mealy':
    case 'Moore': {
      const tmStep = step as TMStep
      if (isFinalStep) {
        const state = tmStep.nextState
        if (state === null) {
          rejectedIds = []
        } else if (simConfig.accepted) {
          acceptedIds = [state]
        } else if (simConfig.rejected) {
          rejectedIds = [state]
        } else {
          activeIds = [state]
        }
      } else {
        activeIds = tmStep.state !== null ? [tmStep.state] : []
      }
      break
    }
    case 'MultiTM': {
      const tmStep = step as TMStep
      if (isFinalStep) {
        const state = tmStep.nextState
        if (state === null) {
          rejectedIds = []
        } else if (simConfig.accepted) {
          acceptedIds = [state]
        } else if (simConfig.rejected) {
          rejectedIds = [state]
        } else {
          activeIds = [state]
        }
      } else {
        activeIds = tmStep.state !== null ? [tmStep.state] : []
      }
      break
    }
  }

  return {
    activeStateIds: activeIds,
    acceptedStateIds: acceptedIds,
    rejectedStateIds: rejectedIds,
  }
}
