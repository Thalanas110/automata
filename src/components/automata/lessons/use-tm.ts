import { useMemo } from 'react'
import type { AutomataGraph } from '@/lib/automata/types'

export interface UseTMResult {
  isTM: boolean
  tapeAlphabet: string[]
  blankSymbol: string
}

/**
 * Derives single-tape Turing Machine-specific metadata from an AutomataGraph.
 * Transition format: "read/write,direction" (e.g. "a/b,R").
 */
export function useTM(graph: AutomataGraph): UseTMResult {
  return useMemo(() => {
    const isTM = graph.type === 'TM'
    const tapeAlphabet = isTM ? (graph.tapeAlphabet ?? []) : []
    const blankSymbol = graph.blankSymbol ?? 'B'
    return { isTM, tapeAlphabet, blankSymbol }
  }, [graph.type, graph.tapeAlphabet, graph.blankSymbol])
}
