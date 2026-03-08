import { useMemo } from 'react'
import type { AutomataGraph } from '@/lib/automata/types'

export interface UseMultiTMResult {
  isMultiTM: boolean
  numTapes: number
  tapeAlphabet: string[]
  blankSymbol: string
}

/**
 * Derives multi-tape Turing Machine-specific metadata from an AutomataGraph.
 * Transition format: "r1,r2/w1,w2/D1,D2" (reads/writes/directions per tape).
 */
export function useMultiTM(graph: AutomataGraph): UseMultiTMResult {
  return useMemo(() => {
    const isMultiTM = graph.type === 'MultiTM'
    const numTapes = isMultiTM ? (graph.numTapes ?? 2) : 0
    const tapeAlphabet = isMultiTM ? (graph.tapeAlphabet ?? []) : []
    const blankSymbol = graph.blankSymbol ?? 'B'
    return { isMultiTM, numTapes, tapeAlphabet, blankSymbol }
  }, [graph.type, graph.numTapes, graph.tapeAlphabet, graph.blankSymbol])
}
