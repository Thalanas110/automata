import { useState, useCallback } from 'react'
import type { AutomataGraph } from '@/lib/automata/types'
import { testRegEx } from '@/lib/automata/simulator'
import type { RegExTestResult } from '@/lib/automata/simulator'

interface RegExEditorProps {
  graph: AutomataGraph
  onGraphChange: (graph: AutomataGraph) => void
}

const PRESETS = [
  {
    name: 'Email',
    pattern: '[a-zA-Z0-9._%+\\-]+@[a-zA-Z0-9.\\-]+\\.[a-zA-Z]{2,}',
  },
  { name: 'IPv4', pattern: '(\\d{1,3}\\.){3}\\d{1,3}' },
  { name: 'Date YYYY-MM-DD', pattern: '\\d{4}-\\d{2}-\\d{2}' },
  { name: 'Hex color', pattern: '#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})' },
  {
    name: 'Phone US',
    pattern: '\\+?1?[\\s-]?\\(?\\d{3}\\)?[\\s-]?\\d{3}[\\s-]?\\d{4}',
  },
  { name: 'Binary', pattern: '^[01]+$' },
  { name: 'Palindrome (2-4)', pattern: '^(a|b|(a(a|b)a)|(b(a|b)b))$' },
  { name: 'aⁿbⁿ approx', pattern: '^a+b+$' },
]

export function RegExEditor({ graph, onGraphChange }: RegExEditorProps) {
  const [testInputs, setTestInputs] = useState('')
  const [results, setResults] = useState<RegExTestResult[]>([])
  const [error, setError] = useState<string | null>(null)
  const [ran, setRan] = useState(false)

  const pattern = graph.pattern ?? ''
  const flags = graph.regexFlags ?? 'g'

  const handleTest = useCallback(() => {
    setError(null)
    try {
      // Validate pattern
      new RegExp(pattern, flags.replace(/[^gimsuy]/g, ''))
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Invalid pattern')
      return
    }
    const lines = testInputs
      .split('\n')
      .map((l) => l.trim())
      .filter((l, i, a) => a.indexOf(l) === i)
    const res = testRegEx(pattern, flags, lines)
    setResults(res)
    setRan(true)
  }, [pattern, flags, testInputs])

  const matchedCount = results.filter((r) => r.matched).length

  return (
    <div className="flex flex-col h-full bg-[#0e0f11] text-gray-300">
      {/* Header */}
      <div className="px-4 py-3 border-b border-[#1e2028]">
        <div className="flex items-center gap-2 mb-2">
          <span className="text-[9px] font-mono text-orange-400 uppercase tracking-widest">
            Regular Expression
          </span>
        </div>

        {/* Pattern input */}
        <div className="flex items-center gap-2 bg-[#1a1b1e] border border-[#374151] rounded-lg px-3 py-2">
          <span className="text-orange-400/60 font-mono text-sm">/</span>
          <input
            value={pattern}
            onChange={(e) =>
              onGraphChange({ ...graph, pattern: e.target.value })
            }
            placeholder="pattern"
            className="flex-1 bg-transparent text-sm font-mono text-orange-200 outline-none placeholder-gray-600"
            spellCheck={false}
          />
          <span className="text-orange-400/60 font-mono text-sm">/</span>
          <input
            value={flags}
            onChange={(e) =>
              onGraphChange({
                ...graph,
                regexFlags: e.target.value
                  .replace(/[^gimsuy]/g, '')
                  .slice(0, 6),
              })
            }
            placeholder="g"
            className="w-10 bg-transparent text-sm font-mono text-orange-300 outline-none"
          />
        </div>

        {error && (
          <div className="mt-1 text-[10px] font-mono text-red-400">{error}</div>
        )}

        {/* Flag guide */}
        <div className="flex gap-3 mt-1.5">
          {[
            { f: 'g', label: 'global' },
            { f: 'i', label: 'ignoreCase' },
            { f: 'm', label: 'multiline' },
            { f: 's', label: 'dotAll' },
          ].map(({ f, label }) => (
            <button
              key={f}
              onClick={() => {
                const cur = flags
                const next = cur.includes(f) ? cur.replace(f, '') : cur + f
                onGraphChange({ ...graph, regexFlags: next })
              }}
              className={`text-[9px] font-mono transition-colors ${
                flags.includes(f)
                  ? 'text-orange-400'
                  : 'text-gray-600 hover:text-gray-400'
              }`}
            >
              {f}:{label}
            </button>
          ))}
        </div>
      </div>

      {/* Presets */}
      <div className="px-4 py-2 border-b border-[#1e2028]">
        <div className="text-[9px] font-mono text-gray-600 uppercase tracking-wider mb-1.5">
          Presets
        </div>
        <div className="flex flex-wrap gap-1">
          {PRESETS.map((p) => (
            <button
              key={p.name}
              onClick={() =>
                onGraphChange({ ...graph, pattern: p.pattern, name: p.name })
              }
              className="text-[9px] font-mono text-gray-500 hover:text-orange-400 bg-[#1a1b1e] border border-[#2d3748] rounded px-1.5 py-0.5 transition-colors"
            >
              {p.name}
            </button>
          ))}
        </div>
      </div>

      {/* Test area */}
      <div className="flex flex-1 min-h-0 gap-0">
        {/* Input */}
        <div className="flex flex-col w-1/2 border-r border-[#1e2028] p-3 gap-2">
          <div className="text-[9px] font-mono text-gray-500 uppercase tracking-wider">
            Test strings (one per line)
          </div>
          <textarea
            value={testInputs}
            onChange={(e) => setTestInputs(e.target.value)}
            placeholder="test@example.com&#10;not-an-email&#10;2024-01-15"
            className="flex-1 bg-[#0e0f11] border border-[#2d3748] rounded px-2 py-1.5 text-xs font-mono text-gray-300 placeholder-gray-700 outline-none focus:border-orange-500 resize-none"
            spellCheck={false}
          />
          <button
            onClick={handleTest}
            disabled={!pattern.trim() || !testInputs.trim()}
            className="py-1.5 text-[11px] font-mono bg-orange-500/20 text-orange-300 border border-orange-500/30 rounded hover:bg-orange-500/30 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            ▶ Test All
          </button>
        </div>

        {/* Results */}
        <div className="flex flex-col flex-1 p-3">
          {ran && results.length > 0 && (
            <div className="flex gap-3 mb-2">
              <span className="text-xs font-mono text-emerald-400">
                ✓ {matchedCount} matched
              </span>
              <span className="text-xs font-mono text-red-400">
                ✗ {results.length - matchedCount} no match
              </span>
            </div>
          )}
          <div className="flex-1 overflow-y-auto space-y-1">
            {!ran ? (
              <div className="flex items-center justify-center h-full">
                <div className="text-xs font-mono text-gray-600 text-center">
                  Enter a pattern and test strings
                </div>
              </div>
            ) : (
              results.map((r, i) => (
                <div
                  key={i}
                  className={`px-2 py-1.5 rounded border text-xs font-mono ${
                    r.matched
                      ? 'bg-emerald-500/5 border-emerald-500/20'
                      : 'bg-[#1a1b1e] border-[#2d3748]'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span
                      className={
                        r.matched ? 'text-emerald-400' : 'text-gray-600'
                      }
                    >
                      {r.matched ? '✓' : '✗'}
                    </span>
                    <span
                      className={
                        r.matched ? 'text-emerald-200' : 'text-gray-500'
                      }
                    >
                      {r.input || '(empty)'}
                    </span>
                  </div>
                  {r.matched && r.matches.length > 0 && (
                    <div className="mt-0.5 ml-4">
                      {r.matches.slice(0, 4).map((m, j) => (
                        <span
                          key={j}
                          className="inline-block mr-1 text-[9px] bg-orange-500/20 text-orange-300 border border-orange-500/20 px-1 rounded"
                        >
                          {m || 'ε'}
                        </span>
                      ))}
                      {r.matches.length > 4 && (
                        <span className="text-[9px] text-gray-600">
                          +{r.matches.length - 4} more
                        </span>
                      )}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* NFA/DFA conversion note */}
      <div className="px-4 py-2 border-t border-[#1e2028]">
        <div className="text-[9px] font-mono text-gray-600 leading-relaxed">
          Tip: Use the AI panel to convert this regex to a DFA/NFA on the
          canvas.
        </div>
      </div>
    </div>
  )
}
