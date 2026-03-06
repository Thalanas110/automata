import { useState, useMemo } from 'react'
import type { AutomataGraph } from '@/lib/automata/types'
import { nfaToDFA, dfaToNFA } from '@/lib/automata/converter'
import type { SubsetTableRow } from '@/lib/automata/converter'

interface ConverterPanelProps {
  graph: AutomataGraph
  isOpen: boolean
  onClose: () => void
  onApply: (newGraph: AutomataGraph) => void
}

type ConversionMode = 'nfa-to-dfa' | 'dfa-to-nfa'

export function ConverterPanel({
  graph,
  isOpen,
  onClose,
  onApply,
}: ConverterPanelProps) {
  const isNFA =
    graph.type === 'NFA' ||
    graph.transitions.some(
      (t) => t.label === 'ε' || t.label === 'eps' || t.label === '',
    )

  const [mode, setMode] = useState<ConversionMode>(
    isNFA ? 'nfa-to-dfa' : 'dfa-to-nfa',
  )

  const nfaResult = useMemo(() => {
    if (!isNFA && graph.type !== 'NFA' && graph.type !== 'DFA') return null
    try {
      return nfaToDFA(graph)
    } catch {
      return null
    }
  }, [graph, isNFA])

  const dfaResult = useMemo(() => {
    if (graph.type !== 'DFA') return null
    try {
      return dfaToNFA(graph)
    } catch {
      return null
    }
  }, [graph])

  if (!isOpen) return null

  const canConvertNFAtoDFA =
    graph.type === 'NFA' ||
    graph.type === 'DFA' ||
    graph.transitions.some(
      (t) => t.label === 'ε' || t.label === 'eps' || t.label === '',
    )

  const canConvertDFAtoNFA = graph.type === 'DFA' || graph.type === 'NFA'

  function handleApply() {
    if (mode === 'nfa-to-dfa' && nfaResult) {
      onApply(nfaResult.dfa)
    } else if (mode === 'dfa-to-nfa' && dfaResult) {
      onApply(dfaResult)
    }
    onClose()
  }

  const table: SubsetTableRow[] = nfaResult?.table ?? []
  const alphabet = nfaResult?.dfa.alphabet ?? []

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-3 sm:p-6">
      <div
        className="relative flex flex-col bg-[#111214] border border-[#1e2028] rounded-lg shadow-2xl w-full max-w-5xl"
        style={{ maxHeight: '90vh' }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-[#1e2028] shrink-0">
          <div className="flex items-center gap-3">
            <span className="text-cyan-400 text-base leading-none">⇄</span>
            <span className="text-sm font-bold text-white font-mono">
              Automaton Converter
            </span>
            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-[#1a1b1e] text-gray-400 border border-[#2d3748]">
              {graph.name}
            </span>
          </div>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-white text-lg leading-none px-1"
          >
            ✕
          </button>
        </div>

        {/* Mode tabs */}
        <div className="flex gap-1 px-5 pt-3 shrink-0">
          <button
            disabled={!canConvertNFAtoDFA}
            onClick={() => setMode('nfa-to-dfa')}
            className={`px-3 py-1.5 text-xs font-mono rounded-t border-b-2 transition-all disabled:opacity-40 disabled:cursor-not-allowed ${
              mode === 'nfa-to-dfa'
                ? 'border-cyan-400 text-cyan-300 bg-cyan-500/10'
                : 'border-transparent text-gray-500 hover:text-gray-300 hover:bg-[#1a1b1e]'
            }`}
          >
            NFA → DFA
            <span className="ml-1.5 text-[9px] opacity-60">Subset Construction</span>
          </button>
          <button
            disabled={!canConvertDFAtoNFA}
            onClick={() => setMode('dfa-to-nfa')}
            className={`px-3 py-1.5 text-xs font-mono rounded-t border-b-2 transition-all disabled:opacity-40 disabled:cursor-not-allowed ${
              mode === 'dfa-to-nfa'
                ? 'border-violet-400 text-violet-300 bg-violet-500/10'
                : 'border-transparent text-gray-500 hover:text-gray-300 hover:bg-[#1a1b1e]'
            }`}
          >
            DFA → NFA
            <span className="ml-1.5 text-[9px] opacity-60">Trivial</span>
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-auto px-5 py-4 min-h-0">
          {mode === 'nfa-to-dfa' && (
            <NFAtoDFAView table={table} alphabet={alphabet} graph={graph} />
          )}
          {mode === 'dfa-to-nfa' && (
            <DFAtoNFAView graph={graph} />
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-5 py-3 border-t border-[#1e2028] shrink-0">
          <p className="text-[10px] font-mono text-gray-600">
            {mode === 'nfa-to-dfa'
              ? 'Result is loaded as a new automaton — current canvas is replaced.'
              : 'Relabels the machine type. Transitions are unchanged.'}
          </p>
          <div className="flex gap-2">
            <button
              onClick={onClose}
              className="px-3 py-1.5 text-xs font-mono text-gray-400 hover:text-white border border-[#2d3748] hover:border-[#4a5568] rounded transition-all"
            >
              Cancel
            </button>
            <button
              onClick={handleApply}
              disabled={
                (mode === 'nfa-to-dfa' && (!nfaResult || table.length === 0)) ||
                (mode === 'dfa-to-nfa' && !dfaResult)
              }
              className={`px-4 py-1.5 text-xs font-mono rounded font-semibold transition-all disabled:opacity-40 disabled:cursor-not-allowed ${
                mode === 'nfa-to-dfa'
                  ? 'bg-cyan-500 hover:bg-cyan-400 text-black'
                  : 'bg-violet-500 hover:bg-violet-400 text-white'
              }`}
            >
              Apply to Canvas →
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── NFA → DFA via Subset Construction view ───────────────────────────────────

function NFAtoDFAView({
  table,
  alphabet,
  graph,
}: {
  table: SubsetTableRow[]
  alphabet: string[]
  graph: AutomataGraph
}) {
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

      {/* Subset construction explanation */}
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
              <th className="px-3 py-2 text-left text-gray-500 font-normal w-6"></th>
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
                key={i}
                className={`border-b border-[#1e2028] transition-colors ${
                  row.dfaLabel === '∅'
                    ? 'bg-red-500/5'
                    : i % 2 === 0
                      ? 'bg-[#111214]'
                      : 'bg-[#0f1012]'
                } hover:bg-[#1a1b1e]`}
              >
                {/* Markers */}
                <td className="px-2 py-2 text-center whitespace-nowrap">
                  {row.isStart && (
                    <span className="text-yellow-400 mr-0.5" title="Start state">→</span>
                  )}
                  {row.isAccept && (
                    <span className="text-green-400" title="Accept state">✓</span>
                  )}
                </td>

                {/* DFA state label */}
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

                {/* Transitions per symbol */}
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
                          isDead ? 'text-red-500 opacity-60' : 'text-cyan-200'
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
        {table.length} DFA state{table.length !== 1 ? 's' : ''} generated
        {table.some((r) => r.dfaLabel === '∅') && (
          <span className="text-red-500 ml-2">· ∅ = dead / trap state</span>
        )}
      </p>
    </div>
  )
}

// ─── DFA → NFA (trivial) view ─────────────────────────────────────────────────

function DFAtoNFAView({ graph }: { graph: AutomataGraph }) {
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
