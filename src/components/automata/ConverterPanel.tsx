import { useState, useMemo } from 'react'
import type { AutomataGraph } from '@/lib/automata/types'
import {
  nfaToDFA,
  dfaToNFA,
  regexToNFA,
  nfaToRegex,
  dfaToRegex,
} from '@/lib/automata/converter'
import type { SubsetTableRow } from '@/lib/automata/converter'

interface ConverterPanelProps {
  graph: AutomataGraph
  isOpen: boolean
  onClose: () => void
  onApply: (newGraph: AutomataGraph) => void
}

type ConversionMode =
  | 'nfa-to-dfa'
  | 'dfa-to-nfa'
  | 'regex-to-nfa'
  | 'nfa-to-regex'
  | 'dfa-to-regex'
  | 'regex-to-dfa'

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

  const isRegEx = graph.type === 'RegEx'
  const isDFA = graph.type === 'DFA'

  // Determine default mode based on graph type
  const getDefaultMode = (): ConversionMode => {
    if (isRegEx) return 'regex-to-nfa'
    if (isNFA) return 'nfa-to-dfa'
    if (isDFA) return 'dfa-to-nfa'
    return 'nfa-to-dfa'
  }

  const [mode, setMode] = useState<ConversionMode>(getDefaultMode())
  const [regexPattern, setRegexPattern] = useState(graph.pattern ?? 'a*b*')

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

  const regexToNFAResult = useMemo(() => {
    if (mode !== 'regex-to-nfa' && mode !== 'regex-to-dfa') return null
    try {
      const pattern = isRegEx ? (graph.pattern ?? 'a*b*') : regexPattern
      return regexToNFA(pattern)
    } catch (e) {
      console.error('RegEx to NFA error:', e)
      return null
    }
  }, [mode, graph, regexPattern, isRegEx])

  const nfaToRegexResult = useMemo(() => {
    if (mode !== 'nfa-to-regex') return null
    if (graph.type !== 'NFA' && !isNFA) return null
    try {
      return nfaToRegex(graph)
    } catch (e) {
      console.error('NFA to RegEx error:', e)
      return null
    }
  }, [mode, graph, isNFA])

  const dfaToRegexResult = useMemo(() => {
    if (mode !== 'dfa-to-regex') return null
    if (graph.type !== 'DFA') return null
    try {
      return dfaToRegex(graph)
    } catch (e) {
      console.error('DFA to RegEx error:', e)
      return null
    }
  }, [mode, graph])

  const regexToDFAResult = useMemo(() => {
    if (mode !== 'regex-to-dfa') return null
    try {
      const pattern = isRegEx ? (graph.pattern ?? 'a*b*') : regexPattern
      const nfa = regexToNFA(pattern)
      return nfaToDFA(nfa)
    } catch (e) {
      console.error('RegEx to DFA error:', e)
      return null
    }
  }, [mode, graph, regexPattern, isRegEx])

  if (!isOpen) return null

  const canConvertNFAtoDFA =
    graph.type === 'NFA' ||
    graph.type === 'DFA' ||
    graph.transitions.some(
      (t) => t.label === 'ε' || t.label === 'eps' || t.label === '',
    )

  const canConvertDFAtoNFA = graph.type === 'DFA' || graph.type === 'NFA'
  const canConvertRegexToNFA = graph.type === 'RegEx' || true // Can always input regex
  const canConvertNFAToRegex = graph.type === 'NFA' || isNFA
  const canConvertDFAToRegex = graph.type === 'DFA'
  const canConvertRegexToDFA = graph.type === 'RegEx' || true

  function handleApply() {
    if (mode === 'nfa-to-dfa' && nfaResult) {
      onApply(nfaResult.dfa)
    } else if (mode === 'dfa-to-nfa' && dfaResult) {
      onApply(dfaResult)
    } else if (mode === 'regex-to-nfa' && regexToNFAResult) {
      onApply(regexToNFAResult)
    } else if (mode === 'nfa-to-regex' && nfaToRegexResult) {
      // Create a RegEx graph
      const regexGraph: AutomataGraph = {
        id: crypto.randomUUID(),
        name: graph.name + ' (RegEx)',
        type: 'RegEx',
        pattern: nfaToRegexResult.regex,
        regexFlags: 'g',
        states: [],
        transitions: [],
        alphabet: [],
      }
      onApply(regexGraph)
    } else if (mode === 'dfa-to-regex' && dfaToRegexResult) {
      const regexGraph: AutomataGraph = {
        id: crypto.randomUUID(),
        name: graph.name + ' (RegEx)',
        type: 'RegEx',
        pattern: dfaToRegexResult.regex,
        regexFlags: 'g',
        states: [],
        transitions: [],
        alphabet: [],
      }
      onApply(regexGraph)
    } else if (mode === 'regex-to-dfa' && regexToDFAResult) {
      onApply(regexToDFAResult.dfa)
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
        <div className="flex flex-wrap gap-1 px-5 pt-3 shrink-0">
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
          </button>
          <button
            disabled={!canConvertRegexToNFA}
            onClick={() => setMode('regex-to-nfa')}
            className={`px-3 py-1.5 text-xs font-mono rounded-t border-b-2 transition-all disabled:opacity-40 disabled:cursor-not-allowed ${
              mode === 'regex-to-nfa'
                ? 'border-orange-400 text-orange-300 bg-orange-500/10'
                : 'border-transparent text-gray-500 hover:text-gray-300 hover:bg-[#1a1b1e]'
            }`}
          >
            RegEx → NFA
          </button>
          <button
            disabled={!canConvertRegexToDFA}
            onClick={() => setMode('regex-to-dfa')}
            className={`px-3 py-1.5 text-xs font-mono rounded-t border-b-2 transition-all disabled:opacity-40 disabled:cursor-not-allowed ${
              mode === 'regex-to-dfa'
                ? 'border-pink-400 text-pink-300 bg-pink-500/10'
                : 'border-transparent text-gray-500 hover:text-gray-300 hover:bg-[#1a1b1e]'
            }`}
          >
            RegEx → DFA
          </button>
          <button
            disabled={!canConvertNFAToRegex}
            onClick={() => setMode('nfa-to-regex')}
            className={`px-3 py-1.5 text-xs font-mono rounded-t border-b-2 transition-all disabled:opacity-40 disabled:cursor-not-allowed ${
              mode === 'nfa-to-regex'
                ? 'border-emerald-400 text-emerald-300 bg-emerald-500/10'
                : 'border-transparent text-gray-500 hover:text-gray-300 hover:bg-[#1a1b1e]'
            }`}
          >
            NFA → RegEx
          </button>
          <button
            disabled={!canConvertDFAToRegex}
            onClick={() => setMode('dfa-to-regex')}
            className={`px-3 py-1.5 text-xs font-mono rounded-t border-b-2 transition-all disabled:opacity-40 disabled:cursor-not-allowed ${
              mode === 'dfa-to-regex'
                ? 'border-teal-400 text-teal-300 bg-teal-500/10'
                : 'border-transparent text-gray-500 hover:text-gray-300 hover:bg-[#1a1b1e]'
            }`}
          >
            DFA → RegEx
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-auto px-5 py-4 min-h-0">
          {mode === 'nfa-to-dfa' && (
            <NFAtoDFAView table={table} alphabet={alphabet} graph={graph} />
          )}
          {mode === 'dfa-to-nfa' && <DFAtoNFAView graph={graph} />}
          {mode === 'regex-to-nfa' && (
            <RegexToNFAView
              pattern={isRegEx ? (graph.pattern ?? 'a*b*') : regexPattern}
              onPatternChange={setRegexPattern}
              result={regexToNFAResult}
              isRegExGraph={isRegEx}
            />
          )}
          {mode === 'regex-to-dfa' && (
            <RegexToDFAView
              pattern={isRegEx ? (graph.pattern ?? 'a*b*') : regexPattern}
              onPatternChange={setRegexPattern}
              result={regexToDFAResult}
              isRegExGraph={isRegEx}
            />
          )}
          {mode === 'nfa-to-regex' && (
            <NFAToRegexView graph={graph} result={nfaToRegexResult} />
          )}
          {mode === 'dfa-to-regex' && (
            <DFAToRegexView graph={graph} result={dfaToRegexResult} />
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-5 py-3 border-t border-[#1e2028] shrink-0">
          <p className="text-[10px] font-mono text-gray-600">
            {mode === 'nfa-to-dfa' &&
              'Subset construction: creates a DFA from NFA.'}
            {mode === 'dfa-to-nfa' && 'Trivial relabeling: DFA is already an NFA.'}
            {mode === 'regex-to-nfa' &&
              "Thompson's construction: builds NFA from regex."}
            {mode === 'regex-to-dfa' &&
              'Two-step: RegEx → NFA → DFA via subset construction.'}
            {mode === 'nfa-to-regex' &&
              'State elimination: converts NFA to equivalent regex.'}
            {mode === 'dfa-to-regex' &&
              'State elimination: converts DFA to equivalent regex.'}
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
                (mode === 'dfa-to-nfa' && !dfaResult) ||
                (mode === 'regex-to-nfa' && !regexToNFAResult) ||
                (mode === 'regex-to-dfa' && !regexToDFAResult) ||
                (mode === 'nfa-to-regex' && !nfaToRegexResult) ||
                (mode === 'dfa-to-regex' && !dfaToRegexResult)
              }
              className={`px-4 py-1.5 text-xs font-mono rounded font-semibold transition-all disabled:opacity-40 disabled:cursor-not-allowed ${
                mode === 'nfa-to-dfa'
                  ? 'bg-cyan-500 hover:bg-cyan-400 text-black'
                  : mode === 'dfa-to-nfa'
                    ? 'bg-violet-500 hover:bg-violet-400 text-white'
                    : mode === 'regex-to-nfa'
                      ? 'bg-orange-500 hover:bg-orange-400 text-black'
                      : mode === 'regex-to-dfa'
                        ? 'bg-pink-500 hover:bg-pink-400 text-black'
                        : mode === 'nfa-to-regex'
                          ? 'bg-emerald-500 hover:bg-emerald-400 text-black'
                          : 'bg-teal-500 hover:bg-teal-400 text-black'
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
// ─── RegEx → NFA view ─────────────────────────────────────────────────────────

function RegexToNFAView({
  pattern,
  onPatternChange,
  result,
  isRegExGraph,
}: {
  pattern: string
  onPatternChange: (p: string) => void
  result: AutomataGraph | null
  isRegExGraph: boolean
}) {
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

// ─── RegEx → DFA view ─────────────────────────────────────────────────────────

function RegexToDFAView({
  pattern,
  onPatternChange,
  result,
  isRegExGraph,
}: {
  pattern: string
  onPatternChange: (p: string) => void
  result: { dfa: AutomataGraph; table: SubsetTableRow[] } | null
  isRegExGraph: boolean
}) {
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

// ─── NFA → RegEx view ─────────────────────────────────────────────────────────

function NFAToRegexView({
  graph,
  result,
}: {
  graph: AutomataGraph
  result: { regex: string } | null
}) {
  return (
    <div className="flex flex-col gap-4">
      <div className="text-[10px] font-mono text-gray-500 leading-relaxed bg-[#0d0e10] border border-[#1e2028] rounded p-3">
        <span className="text-gray-300 font-semibold">State Elimination Algorithm: </span>
        Converts the NFA to a GNFA (Generalized NFA) where transitions are labeled with
        regular expressions. Then systematically eliminates states one by one, updating
        the regex labels, until only start and accept states remain with a single regex.
      </div>

      <div className="flex flex-wrap gap-3 text-[10px] font-mono">
        <span className="px-2 py-1 rounded bg-[#1a1b1e] border border-[#2d3748] text-gray-400">
          NFA states: <span className="text-white">{graph.states.length}</span>
        </span>
        <span className="px-2 py-1 rounded bg-[#1a1b1e] border border-[#2d3748] text-gray-400">
          Transitions: <span className="text-white">{graph.transitions.length}</span>
        </span>
      </div>

      {result && (
        <div className="flex flex-col gap-2">
          <label className="text-xs font-mono text-gray-400">Resulting Regular Expression:</label>
          <div className="px-4 py-3 bg-emerald-500/10 border border-emerald-500/30 rounded text-base font-mono text-emerald-200 overflow-x-auto">
            {result.regex}
          </div>
          <p className="text-[10px] text-gray-600 font-mono">
            This regex accepts the same language as the original NFA.
          </p>
        </div>
      )}

      {!result && (
        <div className="flex flex-col items-center justify-center h-32 text-gray-500 font-mono text-xs gap-2">
          <span className="text-2xl">⚠</span>
          <p>Unable to convert NFA to regex</p>
        </div>
      )}
    </div>
  )
}

// ─── DFA → RegEx view ─────────────────────────────────────────────────────────

function DFAToRegexView({
  graph,
  result,
}: {
  graph: AutomataGraph
  result: { regex: string } | null
}) {
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