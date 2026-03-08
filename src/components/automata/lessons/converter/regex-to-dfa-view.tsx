import type { AutomataGraph } from '@/lib/automata/types'
import type { SubsetTableRow } from '@/lib/automata/converter'

interface RegexToDFAViewProps {
  pattern: string
  onPatternChange: (p: string) => void
  result: { dfa: AutomataGraph; table: SubsetTableRow[] } | null
  isRegExGraph: boolean
}

/**
 * Displays the two-step RegEx → NFA → DFA conversion view.
 */
export function RegexToDFAView({
  pattern,
  onPatternChange,
  result,
  isRegExGraph,
}: RegexToDFAViewProps) {
  return (
    <div className="flex flex-col gap-4">
      <div className="text-[10px] font-mono text-gray-500 leading-relaxed bg-[#0d0e10] border border-[#1e2028] rounded p-3">
        <span className="text-gray-300 font-semibold">RegEx → DFA (Two-step): </span>
        First converts the regular expression to an ε-NFA using Thompson's construction,
        then applies subset construction to determinize the NFA into a DFA.
        This produces a minimal automaton that accepts the same language as the regex.
      </div>

      {!isRegExGraph && (
        <div className="flex flex-col gap-2">
          <label className="text-xs font-mono text-gray-400">Regular Expression Pattern:</label>
          <input
            type="text"
            value={pattern}
            onChange={(e) => onPatternChange(e.target.value)}
            placeholder="a*b*|c+"
            className="px-3 py-2 bg-[#1a1b1e] border border-[#374151] rounded text-sm font-mono text-pink-200 outline-none focus:border-pink-400"
            spellCheck={false}
          />
        </div>
      )}

      {result && (
        <div className="flex flex-wrap gap-3 text-[10px] font-mono">
          <span className="px-2 py-1 rounded bg-[#1a1b1e] border border-[#2d3748] text-gray-400">
            DFA states: <span className="text-pink-300">{result.dfa.states.length}</span>
          </span>
          <span className="px-2 py-1 rounded bg-[#1a1b1e] border border-[#2d3748] text-gray-400">
            Transitions: <span className="text-pink-300">{result.dfa.transitions.length}</span>
          </span>
          <span className="px-2 py-1 rounded bg-[#1a1b1e] border border-[#2d3748] text-gray-400">
            Alphabet: <span className="text-green-300">{result.dfa.alphabet.join(', ') || '—'}</span>
          </span>
        </div>
      )}

      {!result && (
        <div className="flex flex-col items-center justify-center h-32 text-gray-500 font-mono text-xs gap-2">
          <span className="text-2xl">⚠</span>
          <p>Invalid regex pattern</p>
        </div>
      )}
    </div>
  )
}
