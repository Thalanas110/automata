import { useState, useCallback, useEffect } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import type {
  AutomataGraph,
  EditorState,
  MachineType,
} from '@/lib/automata/types'
import { createEmptyGraph } from '@/lib/automata/types'
import { AutomataCanvas } from '@/components/automata/Canvas'
import { Sidebar } from '@/components/automata/Sidebar'
import { SimulationBar } from '@/components/automata/SimulationBar'
import { AIPanel } from '@/components/automata/AIPanel'
import { Toolbar } from '@/components/automata/Toolbar'
import { MultiStringTester } from '@/components/automata/MultiStringTester'
import { PumpingLemmaPanel } from '@/components/automata/PumpingLemmaPanel'
import { GrammarEditor } from '@/components/automata/GrammarEditor'
import { LSystemEditor } from '@/components/automata/LSystemEditor'
import { RegExEditor } from '@/components/automata/RegExEditor'
import { TMBlocksEditor } from '@/components/automata/TMBlocksEditor'

export const Route = createFileRoute('/_public/')({
  component: Index,
})

function buildSampleDFA(): AutomataGraph {
  const q0 = crypto.randomUUID()
  const q1 = crypto.randomUUID()
  const q2 = crypto.randomUUID()
  return {
    id: crypto.randomUUID(),
    name: 'Even number of 0s',
    type: 'DFA',
    states: [
      { id: q0, label: 'q0', x: 180, y: 280, isStart: true, isAccept: true },
      { id: q1, label: 'q1', x: 420, y: 280, isStart: false, isAccept: false },
      { id: q2, label: 'q2', x: 300, y: 160, isStart: false, isAccept: false },
    ],
    transitions: [
      { id: crypto.randomUUID(), from: q0, to: q1, label: '0' },
      { id: crypto.randomUUID(), from: q1, to: q0, label: '0' },
      { id: crypto.randomUUID(), from: q0, to: q2, label: '1' },
      { id: crypto.randomUUID(), from: q1, to: q2, label: '1' },
      { id: crypto.randomUUID(), from: q2, to: q2, label: '0,1' },
    ],
    alphabet: ['0', '1'],
  }
}

// Types that use the canvas editor
const CANVAS_TYPES: MachineType[] = [
  'DFA',
  'NFA',
  'PDA',
  'TM',
  'Mealy',
  'Moore',
  'MultiTM',
]

function Index() {
  const [graph, setGraph] = useState<AutomataGraph>(buildSampleDFA())
  const [editorState, setEditorState] = useState<EditorState>({
    tool: 'select',
    selectedStateId: null,
    selectedTransitionId: null,
    transitionSource: null,
  })
  const [activeStateIds, setActiveStateIds] = useState<string[]>([])
  const [acceptedStateIds, setAcceptedStateIds] = useState<string[]>([])
  const [rejectedStateIds, setRejectedStateIds] = useState<string[]>([])
  const [aiPanelOpen, setAiPanelOpen] = useState(true)
  const [multiTestOpen, setMultiTestOpen] = useState(false)
  const [pumpingOpen, setPumpingOpen] = useState(false)

  const isCanvasType = CANVAS_TYPES.includes(graph.type)

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement).tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA') return
      switch (e.key.toLowerCase()) {
        case 's':
          setEditorState((es) => ({
            ...es,
            tool: 'select',
            transitionSource: null,
          }))
          break
        case 'n':
          setEditorState((es) => ({
            ...es,
            tool: 'addState',
            transitionSource: null,
          }))
          break
        case 't':
          setEditorState((es) => ({ ...es, tool: 'addTransition' }))
          break
        case 'd':
          setEditorState((es) => ({
            ...es,
            tool: 'delete',
            transitionSource: null,
          }))
          break
        case 'escape':
          setEditorState((es) => ({
            ...es,
            tool: 'select',
            transitionSource: null,
            selectedStateId: null,
            selectedTransitionId: null,
          }))
          break
        case 'delete':
        case 'backspace':
          if (editorState.selectedStateId) {
            setGraph((g) => ({
              ...g,
              states: g.states.filter(
                (s) => s.id !== editorState.selectedStateId,
              ),
              transitions: g.transitions.filter(
                (t) =>
                  t.from !== editorState.selectedStateId &&
                  t.to !== editorState.selectedStateId,
              ),
            }))
            setEditorState((es) => ({ ...es, selectedStateId: null }))
          }
          if (editorState.selectedTransitionId) {
            setGraph((g) => ({
              ...g,
              transitions: g.transitions.filter(
                (t) => t.id !== editorState.selectedTransitionId,
              ),
            }))
            setEditorState((es) => ({ ...es, selectedTransitionId: null }))
          }
          break
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [editorState.selectedStateId, editorState.selectedTransitionId])

  const handleNewMachine = useCallback((type: MachineType) => {
    if (
      !window.confirm(
        `Create a new ${type} machine? This will clear the current canvas.`,
      )
    )
      return
    setGraph(createEmptyGraph(type))
    setEditorState({
      tool: 'select',
      selectedStateId: null,
      selectedTransitionId: null,
      transitionSource: null,
    })
    setActiveStateIds([])
    setAcceptedStateIds([])
    setRejectedStateIds([])
  }, [])

  const handleImport = useCallback((imported: AutomataGraph) => {
    setGraph(imported)
    setEditorState({
      tool: 'select',
      selectedStateId: null,
      selectedTransitionId: null,
      transitionSource: null,
    })
    setActiveStateIds([])
    setAcceptedStateIds([])
    setRejectedStateIds([])
  }, [])

  const handleClear = useCallback(() => {
    if (!window.confirm('Clear the canvas?')) return
    setGraph((g) => createEmptyGraph(g.type))
    setActiveStateIds([])
    setAcceptedStateIds([])
    setRejectedStateIds([])
  }, [])

  const handleApplyAIMachine = useCallback((newGraph: AutomataGraph) => {
    setGraph(newGraph)
    setEditorState({
      tool: 'select',
      selectedStateId: null,
      selectedTransitionId: null,
      transitionSource: null,
    })
    setActiveStateIds([])
    setAcceptedStateIds([])
    setRejectedStateIds([])
  }, [])

  return (
    <div
      className="h-screen w-screen flex flex-col overflow-hidden"
      style={{
        background: '#0a0b0d',
        fontFamily: "'IBM Plex Mono', monospace",
        colorScheme: 'dark',
      }}
    >
      {/* Toolbar */}
      <Toolbar
        activeTool={editorState.tool}
        onToolChange={(tool) =>
          setEditorState((es) => ({ ...es, tool, transitionSource: null }))
        }
        graph={graph}
        onImport={handleImport}
        onClear={handleClear}
        aiPanelOpen={aiPanelOpen}
        onToggleAI={() => setAiPanelOpen((v) => !v)}
        onMultiTest={() => setMultiTestOpen(true)}
        onPumpingLemma={() => setPumpingOpen(true)}
      />

      {/* Main layout */}
      <div className="flex flex-1 min-h-0">
        {/* Sidebar */}
        <Sidebar
          graph={graph}
          onGraphChange={setGraph}
          onNewMachine={handleNewMachine}
          selectedStateId={editorState.selectedStateId}
          selectedTransitionId={editorState.selectedTransitionId}
        />

        {/* Main content area */}
        <div className="flex flex-col flex-1 min-w-0">
          {/* Canvas or special editor */}
          <div className="flex-1 min-h-0 relative">
            {isCanvasType ? (
              <AutomataCanvas
                graph={graph}
                editorState={editorState}
                activeStateIds={activeStateIds}
                acceptedStateIds={acceptedStateIds}
                rejectedStateIds={rejectedStateIds}
                onGraphChange={setGraph}
                onEditorStateChange={setEditorState}
              />
            ) : graph.type === 'Grammar' ? (
              <GrammarEditor graph={graph} onGraphChange={setGraph} />
            ) : graph.type === 'LSystem' ? (
              <LSystemEditor graph={graph} onGraphChange={setGraph} />
            ) : graph.type === 'RegEx' ? (
              <RegExEditor graph={graph} onGraphChange={setGraph} />
            ) : graph.type === 'TMBlocks' ? (
              <TMBlocksEditor graph={graph} onGraphChange={setGraph} />
            ) : (
              <div className="flex items-center justify-center h-full text-gray-600 font-mono text-sm">
                Unknown machine type
              </div>
            )}
          </div>

          {/* Simulation bar */}
          <SimulationBar
            graph={graph}
            onActiveStatesChange={setActiveStateIds}
            onAcceptedStatesChange={setAcceptedStateIds}
            onRejectedStatesChange={setRejectedStateIds}
          />
        </div>

        {/* AI Panel */}
        {aiPanelOpen && (
          <AIPanel graph={graph} onApplyMachine={handleApplyAIMachine} />
        )}
      </div>

      {/* Modals */}
      <MultiStringTester
        graph={graph}
        isOpen={multiTestOpen}
        onClose={() => setMultiTestOpen(false)}
      />
      <PumpingLemmaPanel
        isOpen={pumpingOpen}
        onClose={() => setPumpingOpen(false)}
      />
    </div>
  )
}
