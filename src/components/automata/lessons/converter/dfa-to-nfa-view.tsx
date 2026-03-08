import type { AutomataGraph } from '@/lib/automata/types'

interface DFAtoNFAViewProps {
  graph: AutomataGraph
}

/**
 * Displays the trivial DFA → NFA relabelling: a DFA is already a valid NFA.
 */
export function DFAtoNFAView({ graph }: DFAtoNFAViewProps) {
  return (
    <div className="flex flex-col gap-4">
      <div className="text-[10px] font-mono text-gray-500 leading-relaxed bg-[#0d0e10] border border-[#1e2028] rounded p-3">
        <span className="text-gray-300 font-semibold">DFA → NFA: </span>
        Every DFA is already a valid NFA — it satisfies the NFA definition with
        exactly one transition per symbol per state and no ε-transitions. The
        conversion simply re-labels the machine type from{' '}
        <span className="text-cyan-400">DFA</span> to{' '}
        <span className="text-violet-400">NFA</span>. All states and transitions
        are preserved unchanged.
      </div>

      {/* Preview */}
      <div className="flex flex-wrap gap-3 text-[10px] font-mono">
        <div className="flex items-center gap-2 px-3 py-2 rounded bg-[#1a1b1e] border border-[#2d3748]">
          <span className="text-cyan-400 font-bold">DFA</span>
          <span className="text-gray-600">→</span>
          <span className="text-violet-400 font-bold">NFA</span>
        </div>
        <span className="px-2 py-1 rounded bg-[#1a1b1e] border border-[#2d3748] text-gray-400">
          States: <span className="text-white">{graph.states.length}</span>
        </span>
        <span className="px-2 py-1 rounded bg-[#1a1b1e] border border-[#2d3748] text-gray-400">
          Transitions: <span className="text-white">{graph.transitions.length}</span>
        </span>
        <span className="px-2 py-1 rounded bg-[#1a1b1e] border border-[#2d3748] text-gray-400">
          Alphabet: <span className="text-green-300">{graph.alphabet.join(', ') || '—'}</span>
        </span>
      </div>

      {/* State table */}
      <div className="overflow-auto rounded border border-[#1e2028]">
        <table className="w-full text-xs font-mono border-collapse">
          <thead>
            <tr className="bg-[#0d0e10] border-b border-[#1e2028]">
              <th className="px-3 py-2 text-left text-gray-400 font-normal">State</th>
              <th className="px-3 py-2 text-center text-gray-400 font-normal border-l border-[#1e2028]">Start</th>
              <th className="px-3 py-2 text-center text-gray-400 font-normal border-l border-[#1e2028]">Accept</th>
              <th className="px-3 py-2 text-left text-gray-400 font-normal border-l border-[#1e2028]">Transitions</th>
            </tr>
          </thead>
          <tbody>
            {graph.states.map((s, i) => {
              const outgoing = graph.transitions.filter((t) => t.from === s.id)
              return (
                <tr
                  key={s.id}
                  className={`border-b border-[#1e2028] ${i % 2 === 0 ? 'bg-[#111214]' : 'bg-[#0f1012]'} hover:bg-[#1a1b1e]`}
                >
                  <td className="px-3 py-2">
                    <span className={s.isAccept ? 'text-green-300' : 'text-white'}>{s.label}</span>
                  </td>
                  <td className="px-3 py-2 text-center border-l border-[#1e2028]">
                    {s.isStart && <span className="text-yellow-400">→</span>}
                  </td>
                  <td className="px-3 py-2 text-center border-l border-[#1e2028]">
                    {s.isAccept && <span className="text-green-400">✓</span>}
                  </td>
                  <td className="px-3 py-2 border-l border-[#1e2028]">
                    <span className="text-gray-400 text-[10px]">
                      {outgoing.length === 0
                        ? '—'
                        : outgoing
                            .map((t) => {
                              const target = graph.states.find((st) => st.id === t.to)?.label ?? t.to
                              return `${t.label} → ${target}`
                            })
                            .join(', ')}
                    </span>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
