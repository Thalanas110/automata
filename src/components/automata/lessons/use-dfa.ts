import { useMemo } from 'react'
import type { AutomataGraph } from '@/lib/automata/types'

export interface UseDFAResult {
  isDFA: boolean
  /** True when every state has exactly one transition per alphabet symbol */
  isComplete: boolean
  /** IDs of states with no outgoing transitions (trap/dead states) */
  deadStateIds: string[]
}

/**
 * Derives DFA-specific metadata from an AutomataGraph.
 */
export function useDFA(graph: AutomataGraph): UseDFAResult {
  return useMemo(() => {
    const isDFA = graph.type === 'DFA'

    const deadStateIds = graph.states
      .filter((s) => {
        const outgoing = graph.transitions.filter((t) => t.from === s.id)
        return outgoing.length === 0
      })
      .map((s) => s.id)

    const isComplete =
      isDFA &&
      graph.alphabet.length > 0 &&
      graph.states.every((s) =>
        graph.alphabet.every((sym) =>
          graph.transitions.some((t) => t.from === s.id && t.label === sym),
        ),
      )

    return { isDFA, isComplete, deadStateIds }
  }, [graph.type, graph.states, graph.transitions, graph.alphabet])
}
