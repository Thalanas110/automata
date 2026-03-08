import { useMemo } from 'react'
import type { AutomataGraph } from '@/lib/automata/types'

export interface UseMooreResult {
  isMoore: boolean
  /** Map of state ID → its Moore output string */
  stateOutputs: Record<string, string>
}

/**
 * Derives Moore-machine-specific metadata from an AutomataGraph.
 * Each state has a `mooreOutput` property that this hook surfaces.
 */
export function useMoore(graph: AutomataGraph): UseMooreResult {
  return useMemo(() => {
    const isMoore = graph.type === 'Moore'

    const stateOutputs: Record<string, string> = {}
    if (isMoore) {
      for (const s of graph.states) {
        stateOutputs[s.id] = s.mooreOutput ?? ''
      }
    }

    return { isMoore, stateOutputs }
  }, [graph.type, graph.states])
}
