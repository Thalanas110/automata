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
import { useNFA } from './lessons/use-nfa'
import { NFAtoDFAView } from './lessons/converter/nfa-to-dfa-view'
import { DFAtoNFAView } from './lessons/converter/dfa-to-nfa-view'
import { RegexToNFAView } from './lessons/converter/regex-to-nfa-view'
import { RegexToDFAView } from './lessons/converter/regex-to-dfa-view'
import { NFAToRegexView } from './lessons/converter/nfa-to-regex-view'
import { DFAToRegexView } from './lessons/converter/dfa-to-regex-view'

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
  const { isNFA } = useNFA(graph)

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
      const regexGraph: AutomataGraph = {
        id: crypto.randomUUID(),
        name: `${graph.name} (RegEx)`,
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
        name: `${graph.name} (RegEx)`,
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
            type="button"
            onClick={onClose}
            className="text-gray-500 hover:text-white text-lg leading-none px-1"
          >
            ✕
          </button>
        </div>

        {/* Mode tabs */}
        <div className="flex flex-wrap gap-1 px-5 pt-3 shrink-0">
          <button
            type="button"
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
            type="button"
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
            type="button"
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
            type="button"
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
            type="button"
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
            type="button"
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
              type="button"
              onClick={onClose}
              className="px-3 py-1.5 text-xs font-mono text-gray-400 hover:text-white border border-[#2d3748] hover:border-[#4a5568] rounded transition-all"
            >
              Cancel
            </button>
            <button
              type="button"
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