import { useState } from 'react'
import type { PumpingLemmaType } from '@/lib/automata/types'
import {
  analyzeRegularPumping,
  analyzeCFPumping,
} from '@/lib/automata/simulator'
import type {
  RegularPumpingAnalysis,
  CFPumpingAnalysis,
} from '@/lib/automata/simulator'

interface PumpingLemmaPanelProps {
  isOpen: boolean
  onClose: () => void
}

const REGULAR_EXAMPLES = [
  { word: 'aabb', p: 3, lang: 'L = {aⁿbⁿ}' },
  { word: 'abcabc', p: 4, lang: 'L = {ww}' },
  { word: 'aaaa', p: 3, lang: 'L = {aⁿ}' },
]

const CF_EXAMPLES = [
  { word: 'aaabbbccc', p: 4, lang: 'L = {aⁿbⁿcⁿ}' },
  { word: 'aabbcc', p: 3, lang: 'L = {aⁿbⁿcⁿ}' },
  { word: 'abcabc', p: 4, lang: 'L = {ww}' },
]

export function PumpingLemmaPanel({ isOpen, onClose }: PumpingLemmaPanelProps) {
  const [lemmaType, setLemmaType] = useState<PumpingLemmaType>('Regular')
  const [word, setWord] = useState('')
  const [pumpingLength, setPumpingLength] = useState(3)
  const [selectedDecompIndex, setSelectedDecompIndex] = useState(0)
  const [pumpValue, setPumpValue] = useState(2)
  const [regularResult, setRegularResult] =
    useState<RegularPumpingAnalysis | null>(null)
  const [cfResult, setCFResult] = useState<CFPumpingAnalysis | null>(null)

  const handleAnalyze = () => {
    if (!word) return
    setSelectedDecompIndex(0)
    if (lemmaType === 'Regular') {
      setRegularResult(analyzeRegularPumping(word, pumpingLength))
      setCFResult(null)
    } else {
      setCFResult(analyzeCFPumping(word, pumpingLength))
      setRegularResult(null)
    }
  }

  if (!isOpen) return null

  const regularDecomp = regularResult?.decompositions[selectedDecompIndex]
  const cfDecomp = cfResult?.decompositions[selectedDecompIndex]

  const pumpedRegular = regularDecomp
    ? regularDecomp.x +
      regularDecomp.y.repeat(Math.max(0, pumpValue)) +
      regularDecomp.z
    : ''

  const pumpedCF = cfDecomp
    ? cfDecomp.u +
      cfDecomp.v.repeat(Math.max(0, pumpValue)) +
      cfDecomp.x +
      cfDecomp.y.repeat(Math.max(0, pumpValue)) +
      cfDecomp.z
    : ''

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
      <div
        className="bg-[#111214] border border-[#2d3748] rounded-xl shadow-2xl flex flex-col overflow-hidden"
        style={{ width: 760, maxHeight: '88vh' }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-[#1e2028]">
          <div className="flex items-center gap-3">
            <span className="text-[10px] font-mono text-violet-400 uppercase tracking-widest">
              Pumping Lemma Explorer
            </span>
          </div>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-white text-lg leading-none"
          >
            ×
          </button>
        </div>

        <div className="flex flex-1 min-h-0">
          {/* Left: Input panel */}
          <div className="w-64 border-r border-[#1e2028] flex flex-col p-4 gap-4">
            {/* Lemma type */}
            <div>
              <div className="text-[9px] font-mono text-gray-500 uppercase tracking-wider mb-2">
                Lemma Type
              </div>
              <div className="flex gap-1">
                {(['Regular', 'ContextFree'] as PumpingLemmaType[]).map((t) => (
                  <button
                    key={t}
                    onClick={() => {
                      setLemmaType(t)
                      setRegularResult(null)
                      setCFResult(null)
                    }}
                    className={`flex-1 py-1 text-[10px] font-mono rounded transition-colors ${
                      lemmaType === t
                        ? 'bg-violet-500/20 text-violet-300 border border-violet-500/30'
                        : 'text-gray-500 hover:text-gray-300 bg-[#1a1b1e] border border-[#2d3748]'
                    }`}
                  >
                    {t === 'ContextFree' ? 'Context-Free' : t}
                  </button>
                ))}
              </div>
            </div>

            {/* Word input */}
            <div>
              <div className="text-[9px] font-mono text-gray-500 uppercase tracking-wider mb-1.5">
                Word w
              </div>
              <input
                value={word}
                onChange={(e) => setWord(e.target.value)}
                placeholder="e.g. aabb"
                className="w-full bg-[#0e0f11] border border-[#2d3748] rounded px-2 py-1.5 text-sm font-mono text-violet-200 outline-none focus:border-violet-500"
              />
              {word && (
                <div className="text-[9px] font-mono text-gray-600 mt-0.5">
                  |w| = {word.length}
                </div>
              )}
            </div>

            {/* Pumping length */}
            <div>
              <div className="text-[9px] font-mono text-gray-500 uppercase tracking-wider mb-1.5">
                Pumping length p
              </div>
              <input
                type="number"
                min={1}
                max={20}
                value={pumpingLength}
                onChange={(e) =>
                  setPumpingLength(Math.max(1, parseInt(e.target.value) || 1))
                }
                className="w-full bg-[#0e0f11] border border-[#2d3748] rounded px-2 py-1.5 text-sm font-mono text-gray-300 outline-none focus:border-violet-500"
              />
            </div>

            <button
              onClick={handleAnalyze}
              disabled={!word}
              className="py-2 text-sm font-mono bg-violet-500/20 text-violet-300 border border-violet-500/30 rounded hover:bg-violet-500/30 disabled:opacity-40 transition-colors"
            >
              ▶ Analyze
            </button>

            {/* Examples */}
            <div>
              <div className="text-[9px] font-mono text-gray-500 uppercase tracking-wider mb-1.5">
                Classic examples
              </div>
              {(lemmaType === 'Regular' ? REGULAR_EXAMPLES : CF_EXAMPLES).map(
                (ex) => (
                  <button
                    key={ex.word}
                    onClick={() => {
                      setWord(ex.word)
                      setPumpingLength(ex.p)
                    }}
                    className="w-full text-left px-2 py-1 text-[10px] font-mono text-gray-500 hover:text-violet-300 hover:bg-[#1a1b1e] rounded transition-colors"
                  >
                    <span className="text-gray-400">{ex.word}</span>
                    <span className="text-gray-600 ml-1">({ex.lang})</span>
                  </button>
                ),
              )}
            </div>
          </div>

          {/* Right: Analysis */}
          <div className="flex-1 overflow-y-auto p-4">
            {!regularResult && !cfResult ? (
              <div className="flex flex-col items-center justify-center h-full gap-4">
                <div className="text-5xl opacity-20">λ</div>
                <div className="text-center">
                  <div className="text-sm font-mono text-gray-400 mb-1">
                    {lemmaType === 'Regular'
                      ? 'Regular Pumping Lemma'
                      : 'Context-Free Pumping Lemma'}
                  </div>
                  <div className="text-xs font-mono text-gray-600 max-w-sm leading-relaxed">
                    {lemmaType === 'Regular'
                      ? 'If L is regular, ∃ pumping length p such that every string w ∈ L with |w| ≥ p can be split w = xyz where |xy| ≤ p, |y| ≥ 1, and xyⁱz ∈ L for all i ≥ 0.'
                      : 'If L is context-free, ∃ pumping length p such that every string w ∈ L with |w| ≥ p can be split w = uvxyz where |vxy| ≤ p, |vy| ≥ 1, and uvⁱxyⁱz ∈ L for all i ≥ 0.'}
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                {/* Explanation */}
                <div className="bg-violet-500/5 border border-violet-500/20 rounded-lg px-3 py-2">
                  <div className="text-[10px] font-mono text-violet-300 leading-relaxed">
                    {regularResult?.explanation ?? cfResult?.explanation}
                  </div>
                </div>

                {/* Word visualization */}
                <div>
                  <div className="text-[9px] font-mono text-gray-500 uppercase tracking-wider mb-2">
                    Word: &quot;{word}&quot;
                  </div>
                  <div className="flex gap-0.5">
                    {word.split('').map((ch, i) => (
                      <div
                        key={i}
                        className="w-8 h-8 border flex items-center justify-center text-xs font-mono border-[#374151] text-gray-400"
                      >
                        {ch}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Decompositions */}
                {((regularResult?.decompositions.length ?? 0) > 0 ||
                  (cfResult?.decompositions.length ?? 0) > 0) && (
                  <div>
                    <div className="text-[9px] font-mono text-gray-500 uppercase tracking-wider mb-2">
                      Decompositions
                    </div>
                    <div className="flex flex-wrap gap-1 mb-3">
                      {(
                        regularResult?.decompositions ??
                        cfResult?.decompositions ??
                        []
                      ).map((_, i) => (
                        <button
                          key={i}
                          onClick={() => setSelectedDecompIndex(i)}
                          className={`px-2 py-0.5 text-[10px] font-mono rounded transition-colors ${
                            selectedDecompIndex === i
                              ? 'bg-violet-500/20 text-violet-300 border border-violet-500/30'
                              : 'text-gray-500 hover:text-gray-300 bg-[#1a1b1e] border border-[#2d3748]'
                          }`}
                        >
                          #{i + 1}
                        </button>
                      ))}
                    </div>

                    {/* Selected decomposition */}
                    {regularDecomp && (
                      <div className="space-y-3">
                        <div className="bg-[#1a1b1e] border border-[#2d3748] rounded-lg p-3">
                          <div className="text-[9px] font-mono text-gray-500 uppercase mb-2">
                            w = xyz
                          </div>
                          <div className="flex gap-2 mb-2">
                            {[
                              {
                                part: 'x',
                                val: regularDecomp.x,
                                color:
                                  'text-cyan-300 bg-cyan-500/10 border-cyan-500/20',
                              },
                              {
                                part: 'y',
                                val: regularDecomp.y,
                                color:
                                  'text-amber-300 bg-amber-500/10 border-amber-500/20',
                              },
                              {
                                part: 'z',
                                val: regularDecomp.z,
                                color:
                                  'text-emerald-300 bg-emerald-500/10 border-emerald-500/20',
                              },
                            ].map(({ part, val, color }) => (
                              <div
                                key={part}
                                className={`px-2 py-1 rounded border text-xs font-mono ${color}`}
                              >
                                <span className="opacity-60">{part}=</span>
                                &quot;{val || 'ε'}&quot;
                              </div>
                            ))}
                          </div>
                          <div className="text-[9px] font-mono text-gray-600">
                            |xy| ={' '}
                            {regularDecomp.x.length + regularDecomp.y.length} ≤{' '}
                            {pumpingLength} ✓ &nbsp; |y| ={' '}
                            {regularDecomp.y.length} ≥ 1 ✓
                          </div>
                        </div>

                        {/* Pump slider */}
                        <div>
                          <div className="flex items-center gap-3 mb-2">
                            <div className="text-[9px] font-mono text-gray-500 uppercase">
                              Pump i =
                            </div>
                            <input
                              type="range"
                              min={0}
                              max={5}
                              value={pumpValue}
                              onChange={(e) =>
                                setPumpValue(parseInt(e.target.value))
                              }
                              className="flex-1 accent-violet-400"
                            />
                            <span className="text-sm font-mono text-violet-300 w-4">
                              {pumpValue}
                            </span>
                          </div>
                          <div className="bg-[#0e0f11] border border-[#2d3748] rounded px-3 py-2">
                            <div className="text-[9px] font-mono text-gray-500 mb-1">
                              xy<sup>{pumpValue}</sup>z =
                            </div>
                            <div className="text-sm font-mono text-violet-200">
                              &quot;{pumpedRegular || 'ε'}&quot;
                              <span className="text-[10px] text-gray-600 ml-2">
                                (len={pumpedRegular.length})
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* All pumped values */}
                        <div>
                          <div className="text-[9px] font-mono text-gray-500 uppercase tracking-wider mb-1.5">
                            Pumped words
                          </div>
                          <div className="space-y-0.5">
                            {regularDecomp.pumpedWords.map((pw) => (
                              <div
                                key={pw.i}
                                className="text-xs font-mono text-gray-400 px-2 py-0.5 rounded hover:bg-[#1a1b1e]"
                              >
                                <span className="text-gray-600">i={pw.i}:</span>{' '}
                                <span className="text-violet-300">
                                  &quot;{pw.word || 'ε'}&quot;
                                </span>
                                <span className="text-gray-600 ml-1">
                                  (|w|={pw.word.length})
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    )}

                    {cfDecomp && (
                      <div className="space-y-3">
                        <div className="bg-[#1a1b1e] border border-[#2d3748] rounded-lg p-3">
                          <div className="text-[9px] font-mono text-gray-500 uppercase mb-2">
                            w = uvxyz
                          </div>
                          <div className="flex flex-wrap gap-2 mb-2">
                            {[
                              {
                                part: 'u',
                                val: cfDecomp.u,
                                color:
                                  'text-blue-300 bg-blue-500/10 border-blue-500/20',
                              },
                              {
                                part: 'v',
                                val: cfDecomp.v,
                                color:
                                  'text-cyan-300 bg-cyan-500/10 border-cyan-500/20',
                              },
                              {
                                part: 'x',
                                val: cfDecomp.x,
                                color:
                                  'text-gray-300 bg-gray-500/10 border-gray-500/20',
                              },
                              {
                                part: 'y',
                                val: cfDecomp.y,
                                color:
                                  'text-amber-300 bg-amber-500/10 border-amber-500/20',
                              },
                              {
                                part: 'z',
                                val: cfDecomp.z,
                                color:
                                  'text-emerald-300 bg-emerald-500/10 border-emerald-500/20',
                              },
                            ].map(({ part, val, color }) => (
                              <div
                                key={part}
                                className={`px-2 py-1 rounded border text-xs font-mono ${color}`}
                              >
                                <span className="opacity-60">{part}=</span>
                                &quot;{val || 'ε'}&quot;
                              </div>
                            ))}
                          </div>
                          <div className="text-[9px] font-mono text-gray-600">
                            |vxy| ={' '}
                            {cfDecomp.v.length +
                              cfDecomp.x.length +
                              cfDecomp.y.length}{' '}
                            ≤ {pumpingLength} ✓ &nbsp; |vy| ={' '}
                            {cfDecomp.v.length + cfDecomp.y.length} ≥ 1 ✓
                          </div>
                        </div>

                        {/* Pump slider */}
                        <div>
                          <div className="flex items-center gap-3 mb-2">
                            <div className="text-[9px] font-mono text-gray-500 uppercase">
                              Pump i =
                            </div>
                            <input
                              type="range"
                              min={0}
                              max={5}
                              value={pumpValue}
                              onChange={(e) =>
                                setPumpValue(parseInt(e.target.value))
                              }
                              className="flex-1 accent-violet-400"
                            />
                            <span className="text-sm font-mono text-violet-300 w-4">
                              {pumpValue}
                            </span>
                          </div>
                          <div className="bg-[#0e0f11] border border-[#2d3748] rounded px-3 py-2">
                            <div className="text-[9px] font-mono text-gray-500 mb-1">
                              uv<sup>{pumpValue}</sup>xy<sup>{pumpValue}</sup>z
                              =
                            </div>
                            <div className="text-sm font-mono text-violet-200">
                              &quot;{pumpedCF || 'ε'}&quot;
                              <span className="text-[10px] text-gray-600 ml-2">
                                (len={pumpedCF.length})
                              </span>
                            </div>
                          </div>
                        </div>

                        <div>
                          <div className="text-[9px] font-mono text-gray-500 uppercase tracking-wider mb-1.5">
                            Pumped words
                          </div>
                          <div className="space-y-0.5">
                            {cfDecomp.pumpedWords.map((pw) => (
                              <div
                                key={pw.i}
                                className="text-xs font-mono text-gray-400 px-2 py-0.5 rounded hover:bg-[#1a1b1e]"
                              >
                                <span className="text-gray-600">i={pw.i}:</span>{' '}
                                <span className="text-violet-300">
                                  &quot;{pw.word || 'ε'}&quot;
                                </span>
                                <span className="text-gray-600 ml-1">
                                  (|w|={pw.word.length})
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
