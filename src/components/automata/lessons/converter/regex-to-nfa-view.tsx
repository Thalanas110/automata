import type { AutomataGraph } from '@/lib/automata/types'

interface RegexToNFAViewProps {
  pattern: string
  onPatternChange: (p: string) => void
  result: AutomataGraph | null
  isRegExGraph: boolean
}

/**
 * Displays Thompson's construction info for RegEx → NFA conversion.
 */
export function RegexToNFAView({
  pattern,
  onPatternChange,
  result,
  isRegExGraph,
}: RegexToNFAViewProps) {
  return (
    <div className="flex flex-col gap-4">
      <div className="text-[10px] font-mono text-gray-500 leading-relaxed bg-[#0d0e10] border border-[#1e2028] rounded p-3">
        <span className="text-gray-300 font-semibold">Thompson's Construction: </span>
        Converts a regular expression to an equivalent ε-NFA using recursive pattern matching.
        Each regex operator (concatenation, alternation |, Kleene star *, plus +, optional ?)
        is translated into a small NFA fragment with epsilon transitions connecting them.
      </div>

      {!isRegExGraph && (
        <div className="flex flex-col gap-2">
          <label className="text-xs font-mono text-gray-400">Regular Expression Pattern:</label>
          <input
            type="text"
            value={pattern}
            onChange={(e) => onPatternChange(e.target.value)}
            placeholder="a*b*|c+"
            className="px-3 py-2 bg-[#1a1b1e] border border-[#374151] rounded text-sm font-mono text-orange-200 outline-none focus:border-orange-400"
            spellCheck={false}
          />
          <p className="text-[10px] text-gray-600 font-mono">
            Supports: concatenation, | (alternation), * (star), + (plus), ? (optional), () (grouping), [a-z] (char class), \d \w \s (escapes)
          </p>
        </div>
      )}

      {result && (
        <div className="flex flex-wrap gap-3 text-[10px] font-mono">
          <span className="px-2 py-1 rounded bg-[#1a1b1e] border border-[#2d3748] text-gray-400">
            NFA states: <span className="text-orange-300">{result.states.length}</span>
          </span>
          <span className="px-2 py-1 rounded bg-[#1a1b1e] border border-[#2d3748] text-gray-400">
            Transitions: <span className="text-orange-300">{result.transitions.length}</span>
          </span>
          <span className="px-2 py-1 rounded bg-[#1a1b1e] border border-[#2d3748] text-gray-400">
            Alphabet: <span className="text-green-300">{result.alphabet.join(', ') || '—'}</span>
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
