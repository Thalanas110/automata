import { useState, useCallback, useEffect, useRef } from 'react'
import type { AutomataGraph, LSystemRule } from '@/lib/automata/types'
import { renderLSystem } from '@/lib/automata/simulator'

interface LSystemEditorProps {
  graph: AutomataGraph
  onGraphChange: (graph: AutomataGraph) => void
}

const PRESETS = [
  {
    name: 'Koch Snowflake',
    axiom: 'F--F--F',
    rules: [{ symbol: 'F', replacement: 'F+F--F+F' }],
    iterations: 4,
    angle: 60,
  },
  {
    name: 'Sierpinski Triangle',
    axiom: 'F-G-G',
    rules: [
      { symbol: 'F', replacement: 'F-G+F+G-F' },
      { symbol: 'G', replacement: 'GG' },
    ],
    iterations: 5,
    angle: 120,
  },
  {
    name: 'Dragon Curve',
    axiom: 'FX',
    rules: [
      { symbol: 'X', replacement: 'X+YF+' },
      { symbol: 'Y', replacement: '-FX-Y' },
    ],
    iterations: 10,
    angle: 90,
  },
  {
    name: 'Plant',
    axiom: 'X',
    rules: [
      { symbol: 'X', replacement: 'F+[[X]-X]-F[-FX]+X' },
      { symbol: 'F', replacement: 'FF' },
    ],
    iterations: 5,
    angle: 25,
  },
  {
    name: 'Hilbert Curve',
    axiom: 'A',
    rules: [
      { symbol: 'A', replacement: '+BF-AFA-FB+' },
      { symbol: 'B', replacement: '-AF+BFB+FA-' },
    ],
    iterations: 5,
    angle: 90,
  },
  {
    name: 'Lévy C',
    axiom: 'F',
    rules: [{ symbol: 'F', replacement: '+F--F+' }],
    iterations: 10,
    angle: 45,
  },
]

export function LSystemEditor({ graph, onGraphChange }: LSystemEditorProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [newSymbol, setNewSymbol] = useState('F')
  const [newReplacement, setNewReplacement] = useState('')
  const [expandedLen, setExpandedLen] = useState(0)
  const [stepLen, setStepLen] = useState(8)
  const [showAxiom, setShowAxiom] = useState(false)

  const rules = graph.lsystemRules ?? []
  const axiom = graph.axiom ?? 'F'
  const iterations = graph.iterations ?? 3
  const angle = graph.lsystemAngle ?? 90

  const redraw = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const W = canvas.width
    const H = canvas.height
    ctx.clearRect(0, 0, W, H)

    // Dark bg
    ctx.fillStyle = '#0a0b0d'
    ctx.fillRect(0, 0, W, H)

    // Render
    const segs = renderLSystem(axiom, rules, iterations, angle, stepLen)
    if (segs.length === 0) return

    setExpandedLen(segs.length)

    // Auto-fit
    let minX = Infinity,
      maxX = -Infinity,
      minY = Infinity,
      maxY = -Infinity
    for (const seg of segs) {
      minX = Math.min(minX, seg.x1, seg.x2)
      maxX = Math.max(maxX, seg.x1, seg.x2)
      minY = Math.min(minY, seg.y1, seg.y2)
      maxY = Math.max(maxY, seg.y1, seg.y2)
    }

    const padding = 24
    const rangeX = maxX - minX || 1
    const rangeY = maxY - minY || 1
    const scale =
      Math.min((W - padding * 2) / rangeX, (H - padding * 2) / rangeY) * 0.95
    const offX = padding + (W - padding * 2 - rangeX * scale) / 2 - minX * scale
    const offY = padding + (H - padding * 2 - rangeY * scale) / 2 - minY * scale

    const maxDepth = Math.max(...segs.map((s) => s.depth))

    for (const seg of segs) {
      const t = maxDepth > 0 ? seg.depth / maxDepth : 0
      // Gradient from cyan → violet based on depth
      const r = Math.round(0 + t * 139)
      const g = Math.round(212 * (1 - t) + 92 * t)
      const b = Math.round(255 * (1 - t) + 246 * t)
      ctx.strokeStyle = `rgb(${r},${g},${b})`
      ctx.globalAlpha = 0.85
      ctx.lineWidth = Math.max(0.5, 1.5 - seg.depth * 0.15)
      ctx.beginPath()
      ctx.moveTo(seg.x1 * scale + offX, seg.y1 * scale + offY)
      ctx.lineTo(seg.x2 * scale + offX, seg.y2 * scale + offY)
      ctx.stroke()
    }
    ctx.globalAlpha = 1
  }, [axiom, rules, iterations, angle, stepLen])

  useEffect(() => {
    redraw()
  }, [redraw])

  const addRule = () => {
    if (!newSymbol.trim() || !newReplacement.trim()) return
    const rule: LSystemRule = {
      id: crypto.randomUUID(),
      symbol: newSymbol.trim()[0],
      replacement: newReplacement.trim(),
    }
    onGraphChange({
      ...graph,
      lsystemRules: [...rules.filter((r) => r.symbol !== rule.symbol), rule],
    })
    setNewReplacement('')
  }

  const removeRule = (id: string) => {
    onGraphChange({
      ...graph,
      lsystemRules: rules.filter((r) => r.id !== id),
    })
  }

  const applyPreset = (preset: (typeof PRESETS)[number]) => {
    onGraphChange({
      ...graph,
      name: preset.name,
      axiom: preset.axiom,
      lsystemRules: preset.rules.map((r) => ({
        id: crypto.randomUUID(),
        symbol: r.symbol,
        replacement: r.replacement,
      })),
      iterations: preset.iterations,
      lsystemAngle: preset.angle,
    })
  }

  const handleDownload = () => {
    const canvas = canvasRef.current
    if (!canvas) return
    const url = canvas.toDataURL('image/png')
    const a = document.createElement('a')
    a.href = url
    a.download = `${graph.name || 'lsystem'}.png`
    a.click()
  }

  return (
    <div className="flex h-full bg-[#0e0f11]">
      {/* Left controls */}
      <div className="w-56 border-r border-[#1e2028] flex flex-col overflow-y-auto">
        <div className="px-3 py-2 border-b border-[#1e2028]">
          <div className="text-[9px] font-mono text-green-400 uppercase tracking-widest mb-2">
            L-System
          </div>

          <div className="space-y-2">
            <div>
              <div className="text-[9px] font-mono text-gray-500 uppercase mb-1">
                Axiom
              </div>
              <input
                value={axiom}
                onChange={(e) =>
                  onGraphChange({ ...graph, axiom: e.target.value })
                }
                className="w-full bg-[#0e0f11] border border-[#2d3748] rounded px-2 py-1 text-xs font-mono text-green-300 outline-none focus:border-green-500"
              />
            </div>

            <div className="flex gap-2">
              <div className="flex-1">
                <div className="text-[9px] font-mono text-gray-500 uppercase mb-1">
                  Iter
                </div>
                <input
                  type="number"
                  min={0}
                  max={12}
                  value={iterations}
                  onChange={(e) =>
                    onGraphChange({
                      ...graph,
                      iterations: Math.min(12, parseInt(e.target.value) || 0),
                    })
                  }
                  className="w-full bg-[#0e0f11] border border-[#2d3748] rounded px-2 py-1 text-xs font-mono text-gray-300 outline-none focus:border-green-500"
                />
              </div>
              <div className="flex-1">
                <div className="text-[9px] font-mono text-gray-500 uppercase mb-1">
                  Angle°
                </div>
                <input
                  type="number"
                  value={angle}
                  onChange={(e) =>
                    onGraphChange({
                      ...graph,
                      lsystemAngle: parseFloat(e.target.value) || 90,
                    })
                  }
                  className="w-full bg-[#0e0f11] border border-[#2d3748] rounded px-2 py-1 text-xs font-mono text-gray-300 outline-none focus:border-green-500"
                />
              </div>
            </div>

            <div>
              <div className="text-[9px] font-mono text-gray-500 uppercase mb-1">
                Step length: {stepLen}px
              </div>
              <input
                type="range"
                min={2}
                max={30}
                value={stepLen}
                onChange={(e) => setStepLen(parseInt(e.target.value))}
                className="w-full accent-green-400"
              />
            </div>
          </div>
        </div>

        {/* Rules */}
        <div className="px-3 py-2 border-b border-[#1e2028] flex-1">
          <div className="text-[9px] font-mono text-gray-500 uppercase tracking-wider mb-2">
            Production Rules
          </div>

          <div className="flex gap-1 mb-2">
            <input
              value={newSymbol}
              onChange={(e) => setNewSymbol(e.target.value.slice(0, 1))}
              placeholder="F"
              className="w-8 bg-[#0e0f11] border border-[#2d3748] rounded px-1 py-1 text-xs font-mono text-green-300 outline-none focus:border-green-500 text-center"
            />
            <span className="text-gray-500 font-mono text-xs self-center">
              →
            </span>
            <input
              value={newReplacement}
              onChange={(e) => setNewReplacement(e.target.value)}
              placeholder="F+F-F"
              onKeyDown={(e) => {
                if (e.key === 'Enter') addRule()
              }}
              className="flex-1 bg-[#0e0f11] border border-[#2d3748] rounded px-1 py-1 text-xs font-mono text-gray-300 outline-none focus:border-green-500"
            />
            <button
              onClick={addRule}
              className="px-1.5 text-xs font-mono text-green-400 bg-green-500/10 border border-green-500/20 rounded hover:bg-green-500/20 transition-colors"
            >
              +
            </button>
          </div>

          {rules.map((r) => (
            <div
              key={r.id}
              className="flex items-center gap-1 py-0.5 px-1 rounded hover:bg-[#1a1b1e] group"
            >
              <span className="text-xs font-mono text-green-300 w-4">
                {r.symbol}
              </span>
              <span className="text-gray-500 text-xs">→</span>
              <span className="flex-1 text-[10px] font-mono text-gray-400 truncate">
                {r.replacement}
              </span>
              <button
                onClick={() => removeRule(r.id)}
                className="opacity-0 group-hover:opacity-100 text-red-400/70 hover:text-red-400 text-xs transition-opacity"
              >
                ×
              </button>
            </div>
          ))}

          {/* Symbols legend */}
          <div className="mt-3 border-t border-[#1e2028] pt-2">
            <button
              onClick={() => setShowAxiom((v) => !v)}
              className="text-[9px] font-mono text-gray-600 hover:text-gray-400 transition-colors"
            >
              {showAxiom ? '▾' : '▸'} Symbol legend
            </button>
            {showAxiom && (
              <div className="text-[9px] font-mono text-gray-600 mt-1 space-y-0.5 leading-relaxed">
                <div>
                  <span className="text-green-400">F/G</span> — draw forward
                </div>
                <div>
                  <span className="text-green-400">f</span> — move (no draw)
                </div>
                <div>
                  <span className="text-green-400">+</span> — turn left
                </div>
                <div>
                  <span className="text-green-400">-</span> — turn right
                </div>
                <div>
                  <span className="text-green-400">[ ]</span> — push/pop stack
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Presets */}
        <div className="px-3 py-2 border-b border-[#1e2028]">
          <div className="text-[9px] font-mono text-gray-500 uppercase tracking-wider mb-1.5">
            Presets
          </div>
          <div className="flex flex-wrap gap-1">
            {PRESETS.map((p) => (
              <button
                key={p.name}
                onClick={() => applyPreset(p)}
                className="text-[9px] font-mono text-gray-500 hover:text-green-400 bg-[#1a1b1e] border border-[#2d3748] rounded px-1.5 py-0.5 transition-colors"
              >
                {p.name}
              </button>
            ))}
          </div>
        </div>

        {/* Info */}
        <div className="px-3 py-2">
          <div className="text-[9px] font-mono text-gray-600">
            Expanded: {expandedLen.toLocaleString()} segments
          </div>
          <button
            onClick={handleDownload}
            className="mt-1.5 w-full py-1 text-[9px] font-mono text-gray-500 hover:text-green-400 bg-[#0e0f11] border border-[#2d3748] rounded transition-colors"
          >
            ↓ Export PNG
          </button>
        </div>
      </div>

      {/* Canvas */}
      <div className="flex-1 flex items-center justify-center bg-[#0a0b0d] relative">
        <canvas
          ref={canvasRef}
          width={700}
          height={520}
          className="block"
          style={{ imageRendering: 'crisp-edges' }}
        />
        <div className="absolute top-2 right-2 text-[9px] font-mono text-gray-700">
          {graph.name}
        </div>
      </div>
    </div>
  )
}
