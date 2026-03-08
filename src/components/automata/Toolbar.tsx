import React, { useRef, useState, useEffect, useCallback } from 'react'
import type { EditorTool, AutomataGraph } from '@/lib/automata/types'
import {
  exportToJFLAP,
  exportToJSON,
  importFromJFLAP,
  importFromJSON,
} from '@/lib/automata/jflap'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'

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
  onConvert: () => void
  sidebarOpen: boolean
  onToggleSidebar: () => void
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
  onConvert,
  sidebarOpen,
  onToggleSidebar,
}: ToolbarProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const menuRef = useRef<HTMLDivElement>(null)
  const isCanvasType = CANVAS_TYPES.includes(graph.type)
  const [menuOpen, setMenuOpen] = useState(false)
  const [errorDialogOpen, setErrorDialogOpen] = useState(false)

  // Close menu when clicking outside
  const handleOutsideClick = useCallback((e: MouseEvent) => {
    if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
      setMenuOpen(false)
    }
  }, [])

  useEffect(() => {
    if (menuOpen) {
      document.addEventListener('mousedown', handleOutsideClick)
    } else {
      document.removeEventListener('mousedown', handleOutsideClick)
    }
    return () => document.removeEventListener('mousedown', handleOutsideClick)
  }, [menuOpen, handleOutsideClick])

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
        imported = importFromJFLAP(content, file.name)
      } else {
        imported = importFromJSON(content, file.name)
      }
      if (imported) onImport(imported)
      else setErrorDialogOpen(true)
    }
    reader.readAsText(file)
    e.target.value = ''
  }

  return (
    <>
    <Dialog open={errorDialogOpen} onOpenChange={setErrorDialogOpen}>
      <DialogContent className="bg-[#111214] border border-[#1e2028] text-white">
        <DialogHeader>
          <DialogTitle className="text-red-400">Import Failed</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-gray-300">
          Failed to parse file. Supported formats: <span className="font-mono text-cyan-400">.json</span>, <span className="font-mono text-cyan-400">.jff</span>, <span className="font-mono text-cyan-400">.xml</span>
        </p>
        <DialogFooter>
          <Button variant="outline" onClick={() => setErrorDialogOpen(false)}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
    <div className="bg-[#111214] border-b border-[#1e2028] flex items-center gap-2 px-4 py-2 select-none relative">
      {/* Logo */}
      <div className="flex items-center gap-2 mr-3 shrink-0">
        <div className="w-6 h-6 rounded bg-cyan-400/20 border border-cyan-400/40 flex items-center justify-center">
          <span className="text-cyan-400 text-[10px] font-mono font-bold">
            A
          </span>
        </div>
        <span
          className="text-sm font-bold text-white hidden xs:inline"
          style={{ fontFamily: 'Syne, sans-serif' }}
        >
          Automata<span className="text-cyan-400">Studio</span>
        </span>
      </div>

      <div className="h-5 w-px bg-[#2d3748] shrink-0" />

      {/* Sidebar toggle (mobile only) */}
      <button
        onClick={onToggleSidebar}
        title="Toggle sidebar"
        className={`md:hidden flex items-center justify-center w-7 h-7 rounded text-xs font-mono transition-all ${
          sidebarOpen
            ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
            : 'text-gray-400 hover:text-gray-200 hover:bg-[#1a1b1e]'
        }`}
      >
        <span className="text-sm">◧</span>
      </button>

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
                <span className="hidden md:inline">{tool.label}</span>
              </button>
            ))}
          </div>

          <div className="h-5 w-px bg-[#2d3748] shrink-0" />
        </>
      )}

      {/* Keyboard hints — only on large screens */}
      {isCanvasType && (
        <div className="hidden xl:flex items-center gap-2 text-[9px] font-mono text-gray-600">
          <span>S=Select</span>
          <span>H=Pan</span>
          <span>N=State</span>
          <span>T=Arrow</span>
          <span>D=Delete</span>
        </div>
      )}

      {!isCanvasType && (
        <div className="text-[10px] font-mono text-gray-500 hidden sm:block">
          {graph.type} editor active
        </div>
      )}

      <div className="flex-1" />

      {/* ── Desktop: full action bar (hidden below lg) ── */}
      <div className="hidden lg:flex items-center gap-1">
        <button
          onClick={onMultiTest}
          title="Test multiple strings at once"
          disabled={!isCanvasType}
          className="flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-mono text-gray-400 hover:text-cyan-300 hover:bg-cyan-500/10 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
        >
          <span>⊞</span>
          <span>Multi-Test</span>
        </button>
        <button
          onClick={onPumpingLemma}
          title="Pumping Lemma Explorer"
          className="flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-mono text-gray-400 hover:text-violet-300 hover:bg-violet-500/10 transition-all"
        >
          <span>λ</span>
          <span>Pumping</span>
        </button>
        <button
          onClick={onConvert}
          title="Automaton Converter"
          disabled={graph.type !== 'DFA' && graph.type !== 'NFA' && graph.type !== 'RegEx'}
          className="flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-mono text-gray-400 hover:text-cyan-300 hover:bg-cyan-500/10 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
        >
          <span>⇄</span>
          <span>Convert</span>
        </button>
      </div>

      <div className="hidden lg:block h-5 w-px bg-[#2d3748]" />

      <div className="hidden lg:flex items-center gap-1">
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
        <button
          onClick={onClear}
          title="Clear canvas"
          className="px-2.5 py-1 text-xs font-mono text-gray-500 hover:text-red-400 hover:bg-red-400/10 rounded transition-all"
        >
          Clear
        </button>
      </div>

      <div className="hidden lg:block h-5 w-px bg-[#2d3748]" />

      {/* AI toggle — always visible on desktop */}
      <button
        onClick={onToggleAI}
        className={`hidden lg:flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-mono transition-all ${
          aiPanelOpen
            ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
            : 'text-gray-400 hover:text-cyan-300 hover:bg-cyan-500/10'
        }`}
      >
        <span>✦</span>
        <span>AI</span>
      </button>

      {/* ── Mobile / tablet: collapsed menu (visible below lg) ── */}
      <div className="flex lg:hidden items-center gap-1" ref={menuRef}>
        {/* AI button stays visible as an icon */}
        <button
          onClick={onToggleAI}
          title="Toggle AI panel"
          className={`flex items-center px-2 py-1 rounded text-xs font-mono transition-all ${
            aiPanelOpen
              ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
              : 'text-gray-400 hover:text-cyan-300 hover:bg-cyan-500/10'
          }`}
        >
          ✦
        </button>

        {/* Hamburger */}
        <button
          onClick={() => setMenuOpen((o) => !o)}
          title="More actions"
          className={`flex flex-col justify-center items-center w-7 h-7 gap-[4px] rounded transition-all ${
            menuOpen
              ? 'bg-[#1e2028] text-white'
              : 'text-gray-400 hover:text-gray-200 hover:bg-[#1a1b1e]'
          }`}
          aria-label="Open menu"
        >
          <span
            className={`block w-4 h-0.5 bg-current transition-transform duration-200 ${menuOpen ? 'translate-y-[5px] rotate-45' : ''}`}
          />
          <span
            className={`block w-4 h-0.5 bg-current transition-opacity duration-200 ${menuOpen ? 'opacity-0' : ''}`}
          />
          <span
            className={`block w-4 h-0.5 bg-current transition-transform duration-200 ${menuOpen ? '-translate-y-[5px] -rotate-45' : ''}`}
          />
        </button>

        {/* Dropdown */}
        {menuOpen && (
          <div className="absolute right-4 top-full mt-1 z-50 bg-[#16181c] border border-[#2d3748] rounded-lg shadow-xl py-1 min-w-[170px]">
            {/* Analysis */}
            <div className="px-3 py-1 text-[9px] font-mono text-gray-600 uppercase tracking-widest">
              Analysis
            </div>
            <button
              onClick={() => { onMultiTest(); setMenuOpen(false) }}
              disabled={!isCanvasType}
              className="w-full flex items-center gap-2 px-3 py-1.5 text-xs font-mono text-gray-400 hover:text-cyan-300 hover:bg-cyan-500/10 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
            >
              <span>⊞</span> Multi-Test
            </button>
            <button
              onClick={() => { onPumpingLemma(); setMenuOpen(false) }}
              className="w-full flex items-center gap-2 px-3 py-1.5 text-xs font-mono text-gray-400 hover:text-violet-300 hover:bg-violet-500/10 transition-all"
            >
              <span>λ</span> Pumping Lemma
            </button>
            <button
              onClick={() => { onConvert(); setMenuOpen(false) }}
              disabled={graph.type !== 'DFA' && graph.type !== 'NFA' && graph.type !== 'RegEx'}
              className="w-full flex items-center gap-2 px-3 py-1.5 text-xs font-mono text-gray-400 hover:text-cyan-300 hover:bg-cyan-500/10 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
            >
              <span>⇄</span> Convert
            </button>

            <div className="my-1 border-t border-[#2d3748]" />

            {/* File ops */}
            <div className="px-3 py-1 text-[9px] font-mono text-gray-600 uppercase tracking-widest">
              File
            </div>
            <button
              onClick={() => { handleExportJSON(); setMenuOpen(false) }}
              className="w-full flex items-center gap-2 px-3 py-1.5 text-xs font-mono text-gray-400 hover:text-green-400 hover:bg-green-400/10 transition-all"
            >
              ↓ Export JSON
            </button>
            <button
              onClick={() => { handleExportJFLAP(); setMenuOpen(false) }}
              disabled={!isCanvasType}
              className="w-full flex items-center gap-2 px-3 py-1.5 text-xs font-mono text-gray-400 hover:text-amber-400 hover:bg-amber-400/10 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
            >
              ↓ Export JFLAP
            </button>
            <button
              onClick={() => { fileInputRef.current?.click(); setMenuOpen(false) }}
              className="w-full flex items-center gap-2 px-3 py-1.5 text-xs font-mono text-gray-400 hover:text-blue-400 hover:bg-blue-400/10 transition-all"
            >
              ↑ Import
            </button>

            <div className="my-1 border-t border-[#2d3748]" />

            <button
              onClick={() => { onClear(); setMenuOpen(false) }}
              className="w-full flex items-center gap-2 px-3 py-1.5 text-xs font-mono text-gray-500 hover:text-red-400 hover:bg-red-400/10 transition-all"
            >
              ✕ Clear
            </button>
          </div>
        )}
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept=".json,.jff,.xml"
        className="hidden"
        onChange={handleImport}
      />
    </div>
    </>
  )
}
