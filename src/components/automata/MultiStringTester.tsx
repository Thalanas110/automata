import { useState, useCallback } from 'react'
import type { AutomataGraph, MultiStringResult } from '@/lib/automata/types'
import { runMultipleStrings } from '@/lib/automata/simulator'
import { TracePanel } from './TracePanel'

interface MultiStringTesterProps {
  graph: AutomataGraph
  isOpen: boolean
  onClose: () => void
}

export function MultiStringTester({
  graph,
  isOpen,
  onClose,
}: MultiStringTesterProps) {
  const [inputText, setInputText] = useState('')
  const [results, setResults] = useState<MultiStringResult[]>([])
  const [ran, setRan] = useState(false)
  const [filter, setFilter] = useState<'all' | 'accepted' | 'rejected'>('all')
  const [selectedIdx, setSelectedIdx] = useState<number | null>(null)
  const [traceOpen, setTraceOpen] = useState(false)

  const handleRun = useCallback(() => {
    const lines = inputText
      .split('\n')
      .map((l) => l.trim())
      .filter((l, i, arr) => arr.indexOf(l) === i) // dedupe
    if (lines.length === 0) return
    const res = runMultipleStrings(graph, lines)
    setResults(res)
    setRan(true)
    setSelectedIdx(null)
    setTraceOpen(false)
  }, [inputText, graph])

  const handleClear = () => {
    setInputText('')
    setResults([])
    setRan(false)
    setSelectedIdx(null)
    setTraceOpen(false)
  }

  const filtered = results.filter((r) => {
    if (filter === 'accepted') return r.accepted
    if (filter === 'rejected') return r.rejected || (!r.accepted && !r.rejected)
    return true
  })

  const acceptedCount = results.filter((r) => r.accepted).length
  const rejectedCount = results.filter((r) => !r.accepted).length

  const showOutput = graph.type === 'Mealy' || graph.type === 'Moore'

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-3 sm:p-6">
      <div
        className="bg-[#111214] border border-[#2d3748] rounded-xl shadow-2xl flex flex-col overflow-hidden w-full max-w-[680px]"
        style={{ maxHeight: '90vh' }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-[#1e2028]">
          <div className="flex items-center gap-3">
            <span className="text-[10px] font-mono text-cyan-400 uppercase tracking-widest">
              Multi-String Test
            </span>
            <span className="text-[10px] font-mono text-gray-600">
              {graph.type} · {graph.name}
            </span>
          </div>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-white transition-colors text-lg leading-none"
          >
            ×
          </button>
        </div>

        <div className="flex flex-col sm:flex-row flex-1 min-h-0">
          {/* Left: input */}
          <div className="flex flex-col sm:w-56 border-b sm:border-b-0 sm:border-r border-[#1e2028] p-3 gap-3">
            <div>
              <div className="text-[9px] font-mono text-gray-500 uppercase tracking-wider mb-1.5">
                Input Strings (one per line)
              </div>
              <textarea
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                placeholder={'ab\n00\n1010\nε\n(empty line = ε)'}
                className="w-full h-28 sm:h-52 bg-[#0e0f11] border border-[#2d3748] rounded px-2 py-1.5 text-xs font-mono text-gray-300 placeholder-gray-700 outline-none focus:border-cyan-500 resize-none"
                spellCheck={false}
              />
            </div>

            {/* Quick presets */}
            <div>
              <div className="text-[9px] font-mono text-gray-600 uppercase tracking-wider mb-1">
                Quick add
              </div>
              <div className="flex flex-wrap gap-1">
                {[
                  'ε',
                  'a',
                  'b',
                  'ab',
                  'ba',
                  'aa',
                  'bb',
                  'aab',
                  'aba',
                  'bab',
                ].map((s) => (
                  <button
                    key={s}
                    onClick={() => {
                      const val = s === 'ε' ? '' : s
                      setInputText((prev) => {
                        const lines = prev ? prev.split('\n') : []
                        if (!lines.includes(val)) {
                          return prev ? prev + '\n' + val : val
                        }
                        return prev
                      })
                    }}
                    className="text-[9px] font-mono text-gray-500 hover:text-cyan-400 bg-[#1a1b1e] border border-[#2d3748] rounded px-1.5 py-0.5 transition-colors"
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex gap-2 mt-auto">
              <button
                onClick={handleRun}
                disabled={!inputText.trim()}
                className="flex-1 py-1.5 text-[11px] font-mono bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 rounded hover:bg-cyan-500/30 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                ▶ Run All
              </button>
              <button
                onClick={handleClear}
                className="px-2 py-1.5 text-[11px] font-mono text-gray-500 hover:text-red-400 bg-[#1a1b1e] border border-[#2d3748] rounded transition-colors"
              >
                ↺
              </button>
            </div>
          </div>

          {/* Right: results */}
          <div className="flex flex-col flex-1 min-h-0 p-3">
            {ran && results.length > 0 && (
              <div className="flex flex-col gap-2 mb-3">
                {/* Stats row */}
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                  <span className="text-xs font-mono text-emerald-400">
                    ✓ {acceptedCount} accepted
                  </span>
                  <span className="text-xs font-mono text-red-400">
                    ✗ {rejectedCount} rejected
                  </span>
                  <span className="text-xs font-mono text-gray-600">
                    / {results.length} total
                  </span>
                  {selectedIdx !== null && (
                    <button
                      onClick={() => setTraceOpen(true)}
                      className="px-2.5 py-0.5 text-[10px] font-mono bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 rounded hover:bg-cyan-500/30 transition-colors whitespace-nowrap"
                    >
                      ⋯ Traceback
                    </button>
                  )}
                </div>

                {/* Filter tabs */}
                <div className="flex gap-1">
                  {(['all', 'accepted', 'rejected'] as const).map((f) => (
                    <button
                      key={f}
                      onClick={() => setFilter(f)}
                      className={`px-2 py-0.5 text-[9px] font-mono rounded transition-colors capitalize ${
                        filter === f
                          ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30'
                          : 'text-gray-500 hover:text-gray-300 bg-[#1a1b1e] border border-[#2d3748]'
                      }`}
                    >
                      {f}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Results list */}
            <div className="flex-1 overflow-y-auto space-y-1">
              {!ran ? (
                <div className="flex items-center justify-center h-full">
                  <div className="text-center">
                    <div className="text-3xl mb-2 opacity-30">⌨</div>
                    <div className="text-xs font-mono text-gray-600">
                      Enter strings and click Run All
                    </div>
                  </div>
                </div>
              ) : filtered.length === 0 ? (
                <div className="text-xs font-mono text-gray-600 text-center mt-8">
                  No results match filter
                </div>
              ) : (
                filtered.map((r, i) => {
                  // find the true index in `results` (before filtering) to compare with selectedIdx
                  const trueIdx = results.indexOf(r)
                  const isSelected = selectedIdx === trueIdx
                  return (
                    <div
                      key={i}
                      onClick={() => setSelectedIdx(isSelected ? null : trueIdx)}
                      className={`flex items-center gap-3 px-3 py-2 rounded border transition-colors cursor-pointer select-none ${
                        isSelected
                          ? 'bg-cyan-500/15 border-cyan-500/40 ring-1 ring-cyan-500/30'
                          : r.accepted
                            ? 'bg-emerald-500/5 border-emerald-500/20 hover:bg-emerald-500/10'
                            : 'bg-red-500/5 border-red-500/20 hover:bg-red-500/10'
                      }`}
                    >
                      <span
                        className={`text-xs font-mono font-bold w-3 ${
                          r.accepted ? 'text-emerald-400' : 'text-red-400'
                        }`}
                      >
                        {r.accepted ? '✓' : '✗'}
                      </span>
                      <span
                        className={`flex-1 text-xs font-mono truncate ${
                          isSelected
                            ? 'text-cyan-200'
                            : r.accepted
                              ? 'text-emerald-200'
                              : 'text-red-200'
                        }`}
                      >
                        {r.input === '' ? (
                          <span className="italic text-gray-500">ε (empty)</span>
                        ) : (
                          r.input
                        )}
                      </span>
                      {showOutput && r.output !== undefined && (
                        <span className="text-[10px] font-mono text-amber-400 bg-amber-500/10 border border-amber-500/20 px-1.5 py-0.5 rounded">
                          out: {r.output || 'ε'}
                        </span>
                      )}
                      <span className="text-[9px] font-mono text-gray-600 whitespace-nowrap">
                        {r.steps} steps
                      </span>
                    </div>
                  )
                })
              )}
            </div>

            {/* Hint */}
            {ran && results.length > 0 && selectedIdx === null && (
              <div className="text-[9px] font-mono text-gray-600 text-center pt-1">
                click a row to select · then use Traceback
              </div>
            )}

            {/* Export results */}
            {ran && results.length > 0 && (
              <button
                onClick={() => {
                  const csv =
                    'input,result,steps' +
                    (showOutput ? ',output' : '') +
                    '\n' +
                    results
                      .map(
                        (r) =>
                          `"${r.input}",${r.accepted ? 'accepted' : 'rejected'},${r.steps}${showOutput ? `,"${r.output ?? ''}"` : ''}`,
                      )
                      .join('\n')
                  const blob = new Blob([csv], { type: 'text/csv' })
                  const url = URL.createObjectURL(blob)
                  const a = document.createElement('a')
                  a.href = url
                  a.download = `${graph.name}-test-results.csv`
                  a.click()
                  URL.revokeObjectURL(url)
                }}
                className="mt-2 w-full py-1 text-[10px] font-mono text-gray-500 hover:text-green-400 bg-[#0e0f11] border border-[#2d3748] rounded transition-colors"
              >
                ↓ Export CSV
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Traceback panel — rendered outside the modal so it can stack on top */}
      {traceOpen && selectedIdx !== null && results[selectedIdx]?.simConfig && (
        <TracePanel
          graph={graph}
          simConfig={results[selectedIdx].simConfig!}
          isOpen={traceOpen}
          onClose={() => setTraceOpen(false)}
        />
      )}
    </div>
  )
}
