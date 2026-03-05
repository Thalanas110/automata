import { useState, useCallback } from 'react'
import type {
  AutomataGraph,
  GrammarProduction,
  GrammarType,
} from '@/lib/automata/types'
import { deriveGrammar, checkStringInGrammar } from '@/lib/automata/simulator'

interface GrammarEditorProps {
  graph: AutomataGraph
  onGraphChange: (graph: AutomataGraph) => void
}

const GRAMMAR_TYPES: { value: GrammarType; label: string; desc: string }[] = [
  { value: 'Regular', label: 'Regular', desc: 'Type-3' },
  { value: 'CFG', label: 'CFG', desc: 'Type-2' },
  { value: 'CSG', label: 'CSG', desc: 'Type-1' },
  { value: 'Unrestricted', label: 'Unrestricted', desc: 'Type-0' },
]

export function GrammarEditor({ graph, onGraphChange }: GrammarEditorProps) {
  const [newLhs, setNewLhs] = useState('S')
  const [newRhs, setNewRhs] = useState('')
  const [testString, setTestString] = useState('')
  const [testResult, setTestResult] = useState<boolean | null>(null)
  const [derivationSteps, setDerivationSteps] = useState<
    { sentential: string; appliedProduction: string }[]
  >([])
  const [activeTab, setActiveTab] = useState<'productions' | 'derive' | 'test'>(
    'productions',
  )

  const productions = graph.productions ?? []
  const nonTerminals = graph.nonTerminals ?? ['S']
  const terminals = graph.terminals ?? []

  const addProduction = useCallback(() => {
    if (!newRhs.trim()) return
    const prod: GrammarProduction = {
      id: crypto.randomUUID(),
      lhs: newLhs.trim(),
      rhs: newRhs.trim(),
    }
    const newNTs = new Set(nonTerminals)
    newNTs.add(prod.lhs)
    onGraphChange({
      ...graph,
      productions: [...productions, prod],
      nonTerminals: [...newNTs],
    })
    setNewRhs('')
  }, [graph, newLhs, newRhs, nonTerminals, onGraphChange, productions])

  const removeProduction = useCallback(
    (id: string) => {
      onGraphChange({
        ...graph,
        productions: productions.filter((p) => p.id !== id),
      })
    },
    [graph, onGraphChange, productions],
  )

  const handleDerive = useCallback(() => {
    const steps = deriveGrammar(graph, 30)
    setDerivationSteps(steps)
  }, [graph])

  const handleTestString = useCallback(() => {
    const input = testString === 'ε' ? '' : testString
    const result = checkStringInGrammar(graph, input)
    setTestResult(result)
  }, [graph, testString])

  return (
    <div className="flex flex-col h-full bg-[#0e0f11] text-gray-300 select-none">
      {/* Header */}
      <div className="px-4 py-2.5 border-b border-[#1e2028]">
        <div className="flex items-center gap-2 mb-2">
          <span className="text-[9px] font-mono text-purple-400 uppercase tracking-widest">
            Grammar Editor
          </span>
          <div className="flex gap-1 ml-auto">
            {GRAMMAR_TYPES.map((gt) => (
              <button
                key={gt.value}
                onClick={() =>
                  onGraphChange({ ...graph, grammarType: gt.value })
                }
                title={gt.desc}
                className={`px-1.5 py-0.5 text-[9px] font-mono rounded transition-colors ${
                  graph.grammarType === gt.value
                    ? 'bg-purple-500/20 text-purple-400 border border-purple-500/30'
                    : 'text-gray-500 hover:text-gray-300 bg-[#1a1b1e] border border-[#2d3748]'
                }`}
              >
                {gt.label}
              </button>
            ))}
          </div>
        </div>

        {/* Start symbol */}
        <div className="flex items-center gap-2">
          <span className="text-[9px] font-mono text-gray-500 uppercase">
            Start:
          </span>
          <input
            value={graph.startSymbol ?? 'S'}
            onChange={(e) =>
              onGraphChange({ ...graph, startSymbol: e.target.value })
            }
            className="w-10 bg-[#0e0f11] border border-[#2d3748] rounded px-1 py-0.5 text-xs font-mono text-purple-300 outline-none focus:border-purple-500 text-center"
          />
          <span className="text-[9px] font-mono text-gray-500 uppercase ml-2">
            Terminals:
          </span>
          <input
            value={terminals.join(',')}
            onChange={(e) =>
              onGraphChange({
                ...graph,
                terminals: e.target.value
                  .split(',')
                  .map((s) => s.trim())
                  .filter(Boolean),
              })
            }
            placeholder="a,b,0,1"
            className="flex-1 bg-[#0e0f11] border border-[#2d3748] rounded px-2 py-0.5 text-xs font-mono text-gray-300 outline-none focus:border-purple-500"
          />
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-[#1e2028]">
        {(['productions', 'derive', 'test'] as const).map((t) => (
          <button
            key={t}
            onClick={() => setActiveTab(t)}
            className={`flex-1 py-1.5 text-[10px] font-mono capitalize transition-colors ${
              activeTab === t
                ? 'text-purple-400 border-b border-purple-400'
                : 'text-gray-500 hover:text-gray-300'
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-3">
        {activeTab === 'productions' && (
          <div className="space-y-2">
            {/* Add production */}
            <div className="flex items-center gap-1 bg-[#1a1b1e] border border-[#2d3748] rounded p-2">
              <input
                value={newLhs}
                onChange={(e) => setNewLhs(e.target.value)}
                placeholder="A"
                className="w-10 bg-transparent border-b border-[#374151] text-xs font-mono text-purple-300 outline-none text-center"
              />
              <span className="text-gray-500 font-mono text-xs mx-1">→</span>
              <input
                value={newRhs}
                onChange={(e) => setNewRhs(e.target.value)}
                placeholder="aB | ε"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') addProduction()
                }}
                className="flex-1 bg-transparent border-b border-[#374151] text-xs font-mono text-gray-300 outline-none"
              />
              <button
                onClick={addProduction}
                disabled={!newRhs.trim()}
                className="ml-1 px-2 py-0.5 text-[10px] font-mono bg-purple-500/20 text-purple-300 border border-purple-500/30 rounded hover:bg-purple-500/30 disabled:opacity-40 transition-colors"
              >
                + Add
              </button>
            </div>

            {/* Production list */}
            {productions.length === 0 ? (
              <div className="text-xs font-mono text-gray-600 text-center mt-6 py-4">
                No productions yet — add one above
              </div>
            ) : (
              <div className="space-y-0.5">
                {productions.map((p) => (
                  <div
                    key={p.id}
                    className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-[#1a1b1e] group"
                  >
                    <span className="text-xs font-mono text-purple-300 min-w-[1.5rem]">
                      {p.lhs}
                    </span>
                    <span className="text-gray-500 font-mono text-xs">→</span>
                    <span className="flex-1 text-xs font-mono text-gray-300">
                      {p.rhs}
                    </span>
                    <button
                      onClick={() => removeProduction(p.id)}
                      className="opacity-0 group-hover:opacity-100 text-red-400/70 hover:text-red-400 text-sm transition-opacity"
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Quick templates */}
            <div className="border-t border-[#1e2028] pt-2 mt-2">
              <div className="text-[9px] font-mono text-gray-600 uppercase tracking-wider mb-1.5">
                Templates
              </div>
              <div className="flex flex-wrap gap-1">
                {[
                  {
                    label: 'a*b*',
                    prods: [
                      { lhs: 'S', rhs: 'AB' },
                      { lhs: 'A', rhs: 'aA' },
                      { lhs: 'A', rhs: 'ε' },
                      { lhs: 'B', rhs: 'bB' },
                      { lhs: 'B', rhs: 'ε' },
                    ],
                  },
                  {
                    label: 'aⁿbⁿ',
                    prods: [
                      { lhs: 'S', rhs: 'aSb' },
                      { lhs: 'S', rhs: 'ε' },
                    ],
                  },
                  {
                    label: 'palindromes',
                    prods: [
                      { lhs: 'S', rhs: 'aSa' },
                      { lhs: 'S', rhs: 'bSb' },
                      { lhs: 'S', rhs: 'a' },
                      { lhs: 'S', rhs: 'b' },
                      { lhs: 'S', rhs: 'ε' },
                    ],
                  },
                ].map((tmpl) => (
                  <button
                    key={tmpl.label}
                    onClick={() => {
                      const newProds: GrammarProduction[] = tmpl.prods.map(
                        (p) => ({
                          id: crypto.randomUUID(),
                          lhs: p.lhs,
                          rhs: p.rhs,
                        }),
                      )
                      onGraphChange({
                        ...graph,
                        productions: newProds,
                        startSymbol: 'S',
                        nonTerminals: [...new Set(newProds.map((p) => p.lhs))],
                      })
                    }}
                    className="text-[9px] font-mono text-gray-500 hover:text-purple-400 bg-[#1a1b1e] border border-[#2d3748] rounded px-1.5 py-0.5 transition-colors"
                  >
                    {tmpl.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'derive' && (
          <div className="space-y-3">
            <button
              onClick={handleDerive}
              disabled={productions.length === 0}
              className="w-full py-1.5 text-[11px] font-mono bg-purple-500/20 text-purple-300 border border-purple-500/30 rounded hover:bg-purple-500/30 disabled:opacity-40 transition-colors"
            >
              ▶ Derive (leftmost)
            </button>

            {derivationSteps.length > 0 && (
              <div className="space-y-0.5">
                <div className="text-[9px] font-mono text-gray-500 uppercase tracking-wider mb-2">
                  Derivation steps
                </div>
                {derivationSteps.map((step, i) => (
                  <div
                    key={i}
                    className="flex items-center gap-2 py-1 px-2 rounded bg-[#1a1b1e]"
                  >
                    <span className="text-[9px] font-mono text-gray-600 w-4 text-right">
                      {i}
                    </span>
                    <span className="text-xs font-mono text-gray-300 flex-1">
                      {step.sentential}
                    </span>
                    {i > 0 && (
                      <span className="text-[9px] font-mono text-purple-400/70">
                        [{step.appliedProduction}]
                      </span>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'test' && (
          <div className="space-y-3">
            <div className="text-[9px] font-mono text-gray-500 uppercase tracking-wider">
              Test if string is in language
            </div>
            <div className="flex gap-2">
              <input
                value={testString}
                onChange={(e) => setTestString(e.target.value)}
                placeholder="ab (ε for empty)"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleTestString()
                }}
                className="flex-1 bg-[#0e0f11] border border-[#2d3748] rounded px-2 py-1.5 text-xs font-mono text-gray-300 outline-none focus:border-purple-500"
              />
              <button
                onClick={handleTestString}
                className="px-3 py-1.5 text-[10px] font-mono bg-purple-500/20 text-purple-300 border border-purple-500/30 rounded hover:bg-purple-500/30 transition-colors"
              >
                Test
              </button>
            </div>

            {testResult !== null && (
              <div
                className={`px-3 py-2 rounded border text-xs font-mono ${
                  testResult
                    ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                    : 'bg-red-500/10 border-red-500/30 text-red-300'
                }`}
              >
                {testResult
                  ? `✓ "${testString || 'ε'}" is in the language`
                  : `✗ "${testString || 'ε'}" is NOT in the language (or derivation limit reached)`}
              </div>
            )}

            <div className="text-[9px] font-mono text-gray-600 leading-relaxed">
              Note: Uses BFS derivation. Complex grammars may hit the iteration
              limit.
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
