import React, { useRef } from 'react'
import type { EditorTool, AutomataGraph } from '@/lib/automata/types'
import {
  exportToJFLAP,
  exportToJSON,
  importFromJFLAP,
  importFromJSON,
} from '@/lib/automata/jflap'

interface ToolbarProps {
  activeTool: EditorTool
  onToolChange: (tool: EditorTool) => void
  graph: AutomataGraph
  onImport: (graph: AutomataGraph) => void
  onClear: () => void
  aiPanelOpen: boolean
  onToggleAI: () => void
  onMultiTest: () => void
  onPumpingLemma: () => void
}

const TOOLS: { id: EditorTool; label: string; icon: string; hint: string }[] = [
  { id: 'select', label: 'Select', icon: '↖', hint: 'Select & drag states' },
  { id: 'pan', label: 'Pan', icon: '✥', hint: 'Drag to pan the canvas (H)' },
  {
    id: 'addState',
    label: 'State',
    icon: '◉',
    hint: 'Click canvas to add state',
  },
  {
    id: 'addTransition',
    label: 'Arrow',
    icon: '→',
    hint: 'Click source then target',
  },
  { id: 'delete', label: 'Delete', icon: '✕', hint: 'Click to delete' },
]

// Types that support the canvas editor
const CANVAS_TYPES = ['DFA', 'NFA', 'PDA', 'TM', 'Mealy', 'Moore', 'MultiTM']

export function Toolbar({
  activeTool,
  onToolChange,
  graph,
  onImport,
  onClear,
  aiPanelOpen,
  onToggleAI,
  onMultiTest,
  onPumpingLemma,
}: ToolbarProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const isCanvasType = CANVAS_TYPES.includes(graph.type)

  function downloadFile(content: string, filename: string, type: string) {
    const blob = new Blob([content], { type })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    a.click()
    URL.revokeObjectURL(url)
  }

  function handleExportJSON() {
    const json = exportToJSON(graph)
    downloadFile(
      json,
      `${graph.name.replace(/\s+/g, '_')}.json`,
      'application/json',
    )
  }

  function handleExportJFLAP() {
    const xml = exportToJFLAP(graph)
    downloadFile(
      xml,
      `${graph.name.replace(/\s+/g, '_')}.jff`,
      'application/xml',
    )
  }

  function handleImport(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (evt) => {
      const content = evt.target?.result as string
      let imported: AutomataGraph | null = null
      if (file.name.endsWith('.jff') || file.name.endsWith('.xml')) {
        imported = importFromJFLAP(content)
      } else {
        imported = importFromJSON(content)
      }
      if (imported) onImport(imported)
      else alert('Failed to parse file. Supported formats: .json, .jff, .xml')
    }
    reader.readAsText(file)
    e.target.value = ''
  }

  return (
    <div className="bg-[#111214] border-b border-[#1e2028] flex items-center gap-2 px-4 py-2 select-none">
      {/* Logo */}
      <div className="flex items-center gap-2 mr-3">
        <div className="w-6 h-6 rounded bg-cyan-400/20 border border-cyan-400/40 flex items-center justify-center">
          <span className="text-cyan-400 text-[10px] font-mono font-bold">
            A
          </span>
        </div>
        <span
          className="text-sm font-bold text-white"
          style={{ fontFamily: 'Syne, sans-serif' }}
        >
          Automata<span className="text-cyan-400">Studio</span>
        </span>
      </div>

      <div className="h-5 w-px bg-[#2d3748]" />

      {/* Edit tools (only for canvas types) */}
      {isCanvasType && (
        <>
          <div className="flex items-center gap-1">
            {TOOLS.map((tool) => (
              <button
                key={tool.id}
                title={tool.hint}
                onClick={() => onToolChange(tool.id)}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-mono transition-all ${
                  activeTool === tool.id
                    ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                    : 'text-gray-400 hover:text-gray-200 hover:bg-[#1a1b1e]'
                }`}
              >
                <span className="text-sm leading-none">{tool.icon}</span>
                <span className="hidden sm:inline">{tool.label}</span>
              </button>
            ))}
          </div>

          <div className="h-5 w-px bg-[#2d3748]" />
        </>
      )}

      {/* Keyboard hints */}
      {isCanvasType && (
        <div className="hidden lg:flex items-center gap-2 text-[9px] font-mono text-gray-600">
          <span>S=Select</span>
          <span>H=Pan</span>
          <span>N=State</span>
          <span>T=Arrow</span>
          <span>D=Delete</span>
        </div>
      )}

      {!isCanvasType && (
        <div className="text-[10px] font-mono text-gray-500">
          {graph.type} editor active
        </div>
      )}

      <div className="flex-1" />

      {/* Analysis tools */}
      <div className="flex items-center gap-1">
        <button
          onClick={onMultiTest}
          title="Test multiple strings at once"
          disabled={!isCanvasType}
          className="flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-mono text-gray-400 hover:text-cyan-300 hover:bg-cyan-500/10 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
        >
          <span>⊞</span>
          <span className="hidden sm:inline">Multi-Test</span>
        </button>
        <button
          onClick={onPumpingLemma}
          title="Pumping Lemma Explorer"
          className="flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-mono text-gray-400 hover:text-violet-300 hover:bg-violet-500/10 transition-all"
        >
          <span>λ</span>
          <span className="hidden sm:inline">Pumping</span>
        </button>
      </div>

      <div className="h-5 w-px bg-[#2d3748]" />

      {/* File operations */}
      <div className="flex items-center gap-1">
        <button
          onClick={handleExportJSON}
          title="Export as JSON"
          className="px-2.5 py-1 text-xs font-mono text-gray-400 hover:text-green-400 hover:bg-green-400/10 rounded transition-all"
        >
          ↓ JSON
        </button>
        <button
          onClick={handleExportJFLAP}
          title="Export as JFLAP .jff"
          disabled={!isCanvasType}
          className="px-2.5 py-1 text-xs font-mono text-gray-400 hover:text-amber-400 hover:bg-amber-400/10 rounded transition-all disabled:opacity-30 disabled:cursor-not-allowed"
        >
          ↓ JFLAP
        </button>
        <button
          onClick={() => fileInputRef.current?.click()}
          title="Import JSON or JFLAP file"
          className="px-2.5 py-1 text-xs font-mono text-gray-400 hover:text-blue-400 hover:bg-blue-400/10 rounded transition-all"
        >
          ↑ Import
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept=".json,.jff,.xml"
          className="hidden"
          onChange={handleImport}
        />
        <button
          onClick={onClear}
          title="Clear canvas"
          className="px-2.5 py-1 text-xs font-mono text-gray-500 hover:text-red-400 hover:bg-red-400/10 rounded transition-all"
        >
          Clear
        </button>
      </div>

      <div className="h-5 w-px bg-[#2d3748]" />

      {/* AI toggle */}
      <button
        onClick={onToggleAI}
        className={`flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-mono transition-all ${
          aiPanelOpen
            ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
            : 'text-gray-400 hover:text-cyan-300 hover:bg-cyan-500/10'
        }`}
      >
        <span>✦</span>
        <span>AI</span>
      </button>
    </div>
  )
}
