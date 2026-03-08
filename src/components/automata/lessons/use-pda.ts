import { useMemo } from 'react'
import type { AutomataGraph } from '@/lib/automata/types'

export interface UsePDAResult {
  isPDA: boolean
  /** Stack alphabet symbols from the graph */
  stackAlphabet: string[]
}

/**
 * Derives Pushdown Automaton-specific metadata from an AutomataGraph.
 * Transition format: "input,pop/push" (e.g. "a,Z/AZ").
 */
export function usePDA(graph: AutomataGraph): UsePDAResult {
  return useMemo(() => {
    const isPDA = graph.type === 'PDA'
    const stackAlphabet = isPDA ? (graph.stackAlphabet ?? []) : []
    return { isPDA, stackAlphabet }
  }, [graph.type, graph.stackAlphabet])
}
