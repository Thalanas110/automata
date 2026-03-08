import type { AutomataGraph } from '@/lib/automata/types'

interface DFAToRegexViewProps {
  graph: AutomataGraph
  result: { regex: string } | null
}

/**
 * Displays the state elimination result for DFA → RegEx conversion.
 */
export function DFAToRegexView({ graph, result }: DFAToRegexViewProps) {
  return (
    <div className="flex flex-col gap-4">
      <div className="text-[10px] font-mono text-gray-500 leading-relaxed bg-[#0d0e10] border border-[#1e2028] rounded p-3">
        <span className="text-gray-300 font-semibold">State Elimination Algorithm: </span>
        Converts the DFA to a GNFA (Generalized NFA) where transitions are labeled with
        regular expressions. Then systematically eliminates states, updating the regex
        labels until only start and accept remain with a single regex describing the language.
      </div>

      <div className="flex flex-wrap gap-3 text-[10px] font-mono">
        <span className="px-2 py-1 rounded bg-[#1a1b1e] border border-[#2d3748] text-gray-400">
          DFA states: <span className="text-white">{graph.states.length}</span>
        </span>
        <span className="px-2 py-1 rounded bg-[#1a1b1e] border border-[#2d3748] text-gray-400">
          Transitions: <span className="text-white">{graph.transitions.length}</span>
        </span>
      </div>

      {result && (
        <div className="flex flex-col gap-2">
          <label className="text-xs font-mono text-gray-400">Resulting Regular Expression:</label>
          <div className="px-4 py-3 bg-teal-500/10 border border-teal-500/30 rounded text-base font-mono text-teal-200 overflow-x-auto">
            {result.regex}
          </div>
          <p className="text-[10px] text-gray-600 font-mono">
            This regex accepts the same language as the original DFA.
          </p>
        </div>
      )}

      {!result && (
        <div className="flex flex-col items-center justify-center h-32 text-gray-500 font-mono text-xs gap-2">
          <span className="text-2xl">⚠</span>
          <p>Unable to convert DFA to regex</p>
        </div>
      )}
    </div>
  )
}
