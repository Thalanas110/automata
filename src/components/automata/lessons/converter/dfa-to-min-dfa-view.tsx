import type { AutomataGraph } from '@/lib/automata/types'
import type { PartitionRow } from '@/lib/automata/converter'

interface DFAToMinDFAViewProps {
  graph: AutomataGraph
  result: { minDFA: AutomataGraph; table: PartitionRow[] } | null
}

/**
 * Displays the Hopcroft partition-refinement table for DFA → Minimized DFA.
 */
export function DFAToMinDFAView({ graph, result }: DFAToMinDFAViewProps) {
  const alphabet = graph.alphabet

  if (!result || result.table.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-32 text-gray-500 font-mono text-xs gap-2">
        <span className="text-2xl">⚠</span>
        <p>No start state defined — cannot minimize DFA.</p>
      </div>
    )
  }

  const { table, minDFA } = result
  const alreadyMinimal = minDFA.states.length === graph.states.length

  return (
    <div className="flex flex-col gap-4">
      {/* Info strip */}
      <div className="flex flex-wrap gap-3 text-[10px] font-mono">
        <span className="px-2 py-1 rounded bg-[#1a1b1e] border border-[#2d3748] text-gray-400">
          Original states: <span className="text-white">{graph.states.length}</span>
        </span>
        <span className="px-2 py-1 rounded bg-[#1a1b1e] border border-[#2d3748] text-gray-400">
          Minimized states:{' '}
          <span className="text-yellow-300">{minDFA.states.length}</span>
        </span>
        <span className="px-2 py-1 rounded bg-[#1a1b1e] border border-[#2d3748] text-gray-400">
          Alphabet:{' '}
          <span className="text-green-300">{alphabet.join(', ') || '—'}</span>
        </span>
        {alreadyMinimal ? (
          <span className="px-2 py-1 rounded bg-green-500/10 border border-green-500/30 text-green-300">
            ✓ Already minimal
          </span>
        ) : (
          <span className="px-2 py-1 rounded bg-yellow-500/10 border border-yellow-500/30 text-yellow-300">
            ↓ {graph.states.length - minDFA.states.length} state
            {graph.states.length - minDFA.states.length !== 1 ? 's' : ''} merged
          </span>
        )}
      </div>

      {/* Explanation */}
      <div className="text-[10px] font-mono text-gray-500 leading-relaxed bg-[#0d0e10] border border-[#1e2028] rounded p-3">
        <span className="text-gray-300 font-semibold">Hopcroft's Algorithm: </span>
        States are grouped into equivalence classes based on distinguishability.
        The initial partition separates{' '}
        <span className="text-green-400">accept</span> from{' '}
        <span className="text-gray-300">non-accept</span> states. Each group is
        then split whenever its states disagree on which class they transition to
        for some symbol. The process repeats until stable — each class becomes
        one state in the minimized DFA.
      </div>

      {/* Partition table */}
      <div className="overflow-auto rounded border border-[#1e2028]">
        <table className="w-full text-xs font-mono border-collapse">
          <thead>
            <tr className="bg-[#0d0e10] border-b border-[#1e2028]">
              <th className="px-3 py-2 text-left text-gray-500 font-normal w-6" />
              <th className="px-3 py-2 text-left text-gray-400 whitespace-nowrap">
                Class{' '}
                <span className="text-gray-600">(merged DFA states)</span>
              </th>
              {alphabet.map((sym) => (
                <th
                  key={sym}
                  className="px-4 py-2 text-center text-yellow-400 whitespace-nowrap border-l border-[#1e2028]"
                >
                  {sym}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {table.map((row, i) => (
              <tr
                key={row.classLabel}
                className={`border-b border-[#1e2028] transition-colors ${
                  i % 2 === 0 ? 'bg-[#111214]' : 'bg-[#0f1012]'
                } hover:bg-[#1a1b1e]`}
              >
                <td className="px-2 py-2 text-center whitespace-nowrap">
                  {row.isStart && (
                    <span className="text-yellow-400 mr-0.5" title="Start state">
                      →
                    </span>
                  )}
                  {row.isAccept && (
                    <span className="text-green-400" title="Accept state">
                      ✓
                    </span>
                  )}
                </td>
                <td className="px-3 py-2">
                  <div className="flex flex-col gap-0.5">
                    <span
                      className={
                        row.isAccept ? 'text-green-300' : 'text-white'
                      }
                    >
                      {row.classLabel}
                    </span>
                    <span className="text-[9px] text-gray-600">
                      {row.stateLabels.join(', ')}
                    </span>
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
                      <span
                        className={
                          isDead ? 'text-red-500 opacity-60' : 'text-yellow-200'
                        }
                      >
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
        {table.length} equivalence class{table.length !== 1 ? 'es' : ''} →{' '}
        {minDFA.states.length} minimized state
        {minDFA.states.length !== 1 ? 's' : ''}
      </p>
    </div>
  )
}
