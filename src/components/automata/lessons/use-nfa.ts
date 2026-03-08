import { useMemo } from 'react'
import type { AutomataGraph } from '@/lib/automata/types'

export interface UseNFAResult {
  /** True when the graph type is NFA or it contains ε-transitions */
  isNFA: boolean
  /** True when any transition uses an epsilon label */
  hasEpsilon: boolean
  /** Input alphabet without epsilon symbols */
  nfaAlphabet: string[]
}

/**
 * Derives NFA-specific metadata from an AutomataGraph.
 * Use this instead of duplicating epsilon-detection logic across components.
 */
export function useNFA(graph: AutomataGraph): UseNFAResult {
  return useMemo(() => {
    const hasEpsilon = graph.transitions.some(
      (t) => t.label === 'ε' || t.label === 'eps' || t.label === '',
    )
    const isNFA = graph.type === 'NFA' || hasEpsilon
    const nfaAlphabet = graph.alphabet.filter(
      (a) => a !== 'ε' && a !== 'eps' && a !== '',
    )
    return { isNFA, hasEpsilon, nfaAlphabet }
  }, [graph.type, graph.transitions, graph.alphabet])
}
