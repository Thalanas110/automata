import { useMemo } from 'react'
import type { AutomataGraph } from '@/lib/automata/types'
import { parseMealyLabel } from '@/lib/automata/types'

export interface UseMealyResult {
  isMealy: boolean
  /** Unique output symbols emitted across all transitions */
  outputAlphabet: string[]
}

/**
 * Derives Mealy-machine-specific metadata from an AutomataGraph.
 * Transition format: "input/output" (e.g. "a/0").
 */
export function useMealy(graph: AutomataGraph): UseMealyResult {
  return useMemo(() => {
    const isMealy = graph.type === 'Mealy'

    const outputAlphabet = isMealy
      ? [
          ...new Set(
            graph.transitions
              .map((t) => parseMealyLabel(t.label)?.output)
              .filter((o): o is string => o !== undefined),
          ),
        ]
      : []

    return { isMealy, outputAlphabet }
  }, [graph.type, graph.transitions])
}
