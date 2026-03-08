import type { AutomataGraph } from '@/lib/automata/types'
import type { SubsetTableRow } from '@/lib/automata/converter'

interface NFAtoDFAViewProps {
  table: SubsetTableRow[]
  alphabet: string[]
  graph: AutomataGraph
}

/**
 * Displays the subset / powerset construction table for NFA → DFA conversion.
 */
export function NFAtoDFAView({ table, alphabet, graph }: NFAtoDFAViewProps) {
  if (table.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-32 text-gray-500 font-mono text-xs gap-2">
        <span className="text-2xl">⚠</span>
        <p>No start state defined — cannot perform subset construction.</p>
      </div>
    )
  }

  const nfaAlphabet = graph.alphabet.filter(
    (a) => a !== 'ε' && a !== 'eps' && a !== '',
  )
  const hasEpsilon = graph.transitions.some(
    (t) => t.label === 'ε' || t.label === 'eps' || t.label === '',
  )

  return (
    <div className="flex flex-col gap-4">
      {/* Info strip */}
      <div className="flex flex-wrap gap-3 text-[10px] font-mono">
        <span className="px-2 py-1 rounded bg-[#1a1b1e] border border-[#2d3748] text-gray-400">
          NFA states: <span className="text-white">{graph.states.length}</span>
        </span>
        <span className="px-2 py-1 rounded bg-[#1a1b1e] border border-[#2d3748] text-gray-400">
          DFA states: <span className="text-cyan-300">{table.length}</span>
        </span>
        <span className="px-2 py-1 rounded bg-[#1a1b1e] border border-[#2d3748] text-gray-400">
          Alphabet: <span className="text-green-300">{nfaAlphabet.join(', ') || '—'}</span>
        </span>
        {hasEpsilon && (
          <span className="px-2 py-1 rounded bg-amber-500/10 border border-amber-500/30 text-amber-300">
            ε-NFA detected — ε-closures applied
          </span>
        )}
      </div>

      {/* Explanation */}
      <div className="text-[10px] font-mono text-gray-500 leading-relaxed bg-[#0d0e10] border border-[#1e2028] rounded p-3">
        <span className="text-gray-300 font-semibold">Subset / Powerset Construction: </span>
        Each DFA state corresponds to a <em>set of NFA states</em> reachable
        together. Starting from the ε-closure of the NFA start state, for each
        input symbol we compute <code className="text-cyan-400">move(S,a)</code> then take
        its ε-closure to get the next DFA state. Rows marked{' '}
        <span className="text-yellow-400">→</span> are the start state and{' '}
        <span className="text-green-400">✓</span> are accepting states
        (any subset containing an NFA accept state).
      </div>

      {/* Table */}
      <div className="overflow-auto rounded border border-[#1e2028]">
        <table className="w-full text-xs font-mono border-collapse">
          <thead>
            <tr className="bg-[#0d0e10] border-b border-[#1e2028]">
              <th className="px-3 py-2 text-left text-gray-500 font-normal w-6" />
              <th className="px-3 py-2 text-left text-gray-400 whitespace-nowrap">
                DFA State <span className="text-gray-600">(NFA subset)</span>
              </th>
              {alphabet.map((sym) => (
                <th
                  key={sym}
                  className="px-4 py-2 text-center text-cyan-400 whitespace-nowrap border-l border-[#1e2028]"
                >
                  {sym}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {table.map((row, i) => (
              <tr
                key={row.dfaLabel}
                className={`border-b border-[#1e2028] transition-colors ${
                  row.dfaLabel === '∅'
                    ? 'bg-red-500/5'
                    : i % 2 === 0
                      ? 'bg-[#111214]'
                      : 'bg-[#0f1012]'
                } hover:bg-[#1a1b1e]`}
              >
                <td className="px-2 py-2 text-center whitespace-nowrap">
                  {row.isStart && (
                    <span className="text-yellow-400 mr-0.5" title="Start state">→</span>
                  )}
                  {row.isAccept && (
                    <span className="text-green-400" title="Accept state">✓</span>
                  )}
                </td>
                <td className="px-3 py-2">
                  <div className="flex flex-col gap-0.5">
                    <span
                      className={
                        row.dfaLabel === '∅'
                          ? 'text-red-400'
                          : row.isAccept
                            ? 'text-green-300'
                            : 'text-white'
                      }
                    >
                      {row.dfaLabel}
                    </span>
                    {row.subsetLabels.length > 0 && (
                      <span className="text-[9px] text-gray-600">
                        NFA: {row.subsetLabels.join(', ')}
                      </span>
                    )}
                  </div>
                </td>
                {alphabet.map((sym) => {
                  const target = row.transitions[sym] ?? '∅'
                  const isDead = target === '∅'
                  return (
                    <td
                      key={sym}
                      className="px-4 py-2 text-center border-l border-[#1e2028]"
                    >
                      <span className={isDead ? 'text-red-500 opacity-60' : 'text-cyan-200'}>
                        {target}
                      </span>
                    </td>
                  )
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="text-[10px] font-mono text-gray-600">
        {table.length} DFA state{table.length !== 1 ? 's' : ''} generated
        {table.some((r) => r.dfaLabel === '∅') && (
          <span className="text-red-500 ml-2">· ∅ = dead / trap state</span>
        )}
      </p>
    </div>
  )
}
