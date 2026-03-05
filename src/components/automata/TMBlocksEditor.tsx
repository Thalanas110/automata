import { useState, useCallback } from 'react'
import type { AutomataGraph, TMBlock } from '@/lib/automata/types'
import { createEmptyGraph } from '@/lib/automata/types'
import { runTM } from '@/lib/automata/simulator'

interface TMBlocksEditorProps {
  graph: AutomataGraph
  onGraphChange: (graph: AutomataGraph) => void
}

const PRESET_BLOCKS: Omit<TMBlock, 'id'>[] = [
  {
    name: 'Move Right to Blank',
    description: 'Moves head right until blank',
    graph: (() => {
      const q0 = 'q0',
        q1 = 'q1'
      const g = createEmptyGraph('TM')
      g.name = 'Move Right to Blank'
      g.states = [
        { id: q0, label: 'q0', x: 100, y: 150, isStart: true, isAccept: false },
        { id: q1, label: 'q1', x: 300, y: 150, isStart: false, isAccept: true },
      ]
      g.transitions = [
        { id: 't0', from: q0, to: q0, label: 'a/a,R' },
        { id: 't1', from: q0, to: q0, label: 'b/b,R' },
        { id: 't2', from: q0, to: q1, label: 'B/B,S' },
      ]
      g.blankSymbol = 'B'
      return g
    })(),
  },
  {
    name: 'Write All Blanks',
    description: 'Erases entire tape to blank',
    graph: (() => {
      const q0 = 'q0',
        q1 = 'q1'
      const g = createEmptyGraph('TM')
      g.name = 'Write All Blanks'
      g.states = [
        { id: q0, label: 'q0', x: 100, y: 150, isStart: true, isAccept: false },
        { id: q1, label: 'q1', x: 300, y: 150, isStart: false, isAccept: true },
      ]
      g.transitions = [
        { id: 't0', from: q0, to: q0, label: 'a/B,R' },
        { id: 't1', from: q0, to: q0, label: 'b/B,R' },
        { id: 't2', from: q0, to: q1, label: 'B/B,S' },
      ]
      g.blankSymbol = 'B'
      return g
    })(),
  },
  {
    name: 'Copy Tape',
    description: 'Copies input string (simple demo)',
    graph: (() => {
      const q0 = 'q0',
        q1 = 'q1'
      const g = createEmptyGraph('TM')
      g.name = 'Copy Tape'
      g.states = [
        { id: q0, label: 'q0', x: 100, y: 150, isStart: true, isAccept: true },
        {
          id: q1,
          label: 'q1',
          x: 300,
          y: 150,
          isStart: false,
          isAccept: false,
        },
      ]
      g.transitions = [
        { id: 't0', from: q0, to: q0, label: 'a/a,R' },
        { id: 't1', from: q0, to: q0, label: 'b/b,R' },
        { id: 't2', from: q0, to: q1, label: 'B/B,S' },
      ]
      g.blankSymbol = 'B'
      return g
    })(),
  },
]

export function TMBlocksEditor({ graph, onGraphChange }: TMBlocksEditorProps) {
  const [selectedBlockId, setSelectedBlockId] = useState<string | null>(null)
  const [testInput, setTestInput] = useState('')
  const [testResults, setTestResults] = useState<
    { blockName: string; input: string; result: string; tape: string }[]
  >([])
  const [newBlockName, setNewBlockName] = useState('')
  const [newBlockDesc, setNewBlockDesc] = useState('')
  const [activeTab, setActiveTab] = useState<'blocks' | 'compose' | 'test'>(
    'blocks',
  )

  const blocks = graph.blocks ?? []
  const sequence = graph.blockSequence ?? []

  const addPresetBlock = useCallback(
    (preset: Omit<TMBlock, 'id'>) => {
      const block: TMBlock = {
        ...preset,
        id: crypto.randomUUID(),
      }
      onGraphChange({
        ...graph,
        blocks: [...blocks, block],
      })
    },
    [blocks, graph, onGraphChange],
  )

  const addCustomBlock = useCallback(() => {
    if (!newBlockName.trim()) return
    const block: TMBlock = {
      id: crypto.randomUUID(),
      name: newBlockName.trim(),
      description: newBlockDesc.trim(),
      graph: createEmptyGraph('TM'),
    }
    onGraphChange({ ...graph, blocks: [...blocks, block] })
    setNewBlockName('')
    setNewBlockDesc('')
  }, [blocks, graph, newBlockName, newBlockDesc, onGraphChange])

  const removeBlock = useCallback(
    (id: string) => {
      onGraphChange({
        ...graph,
        blocks: blocks.filter((b) => b.id !== id),
        blockSequence: sequence.filter((s) => s !== id),
      })
    },
    [blocks, graph, onGraphChange, sequence],
  )

  const addToSequence = useCallback(
    (id: string) => {
      onGraphChange({ ...graph, blockSequence: [...sequence, id] })
    },
    [graph, onGraphChange, sequence],
  )

  const removeFromSequence = useCallback(
    (idx: number) => {
      onGraphChange({
        ...graph,
        blockSequence: sequence.filter((_, i) => i !== idx),
      })
    },
    [graph, onGraphChange, sequence],
  )

  const runSequence = useCallback(() => {
    if (!testInput && sequence.length === 0) return
    const results: typeof testResults = []
    let tape = testInput
    for (const blockId of sequence) {
      const block = blocks.find((b) => b.id === blockId)
      if (!block) continue
      const r = runTM(block.graph, tape)
      const finalTape = r.tape.join('')
      results.push({
        blockName: block.name,
        input: tape,
        result: r.accepted ? 'accepted' : r.rejected ? 'rejected' : 'halted',
        tape: finalTape,
      })
      tape = finalTape // chain output to next block
    }
    setTestResults(results)
  }, [blocks, sequence, testInput])

  return (
    <div className="flex flex-col h-full bg-[#0e0f11] text-gray-300 select-none">
      {/* Tabs */}
      <div className="flex border-b border-[#1e2028]">
        {(['blocks', 'compose', 'test'] as const).map((t) => (
          <button
            key={t}
            onClick={() => setActiveTab(t)}
            className={`flex-1 py-2 text-[10px] font-mono capitalize transition-colors ${
              activeTab === t
                ? 'text-amber-400 border-b border-amber-400'
                : 'text-gray-500 hover:text-gray-300'
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto p-3">
        {/* Blocks library */}
        {activeTab === 'blocks' && (
          <div className="space-y-3">
            <div className="text-[9px] font-mono text-gray-500 uppercase tracking-wider">
              Preset Building Blocks
            </div>
            <div className="space-y-1.5">
              {PRESET_BLOCKS.map((preset) => (
                <div
                  key={preset.name}
                  className="flex items-center gap-2 px-2 py-2 rounded bg-[#1a1b1e] border border-[#2d3748]"
                >
                  <div className="flex-1">
                    <div className="text-xs font-mono text-amber-300">
                      {preset.name}
                    </div>
                    <div className="text-[9px] font-mono text-gray-600">
                      {preset.description}
                    </div>
                  </div>
                  <button
                    onClick={() => addPresetBlock(preset)}
                    className="px-2 py-0.5 text-[9px] font-mono text-amber-400 bg-amber-500/10 border border-amber-500/20 rounded hover:bg-amber-500/20 transition-colors"
                  >
                    + Add
                  </button>
                </div>
              ))}
            </div>

            {/* Custom block */}
            <div className="border-t border-[#1e2028] pt-3">
              <div className="text-[9px] font-mono text-gray-500 uppercase tracking-wider mb-2">
                Create custom block
              </div>
              <div className="space-y-1.5">
                <input
                  value={newBlockName}
                  onChange={(e) => setNewBlockName(e.target.value)}
                  placeholder="Block name"
                  className="w-full bg-[#0e0f11] border border-[#2d3748] rounded px-2 py-1.5 text-xs font-mono text-gray-300 outline-none focus:border-amber-500"
                />
                <input
                  value={newBlockDesc}
                  onChange={(e) => setNewBlockDesc(e.target.value)}
                  placeholder="Description"
                  className="w-full bg-[#0e0f11] border border-[#2d3748] rounded px-2 py-1.5 text-xs font-mono text-gray-300 outline-none focus:border-amber-500"
                />
                <button
                  onClick={addCustomBlock}
                  disabled={!newBlockName.trim()}
                  className="w-full py-1.5 text-[10px] font-mono bg-amber-500/20 text-amber-300 border border-amber-500/30 rounded hover:bg-amber-500/30 disabled:opacity-40 transition-colors"
                >
                  + Create Block
                </button>
              </div>
            </div>

            {/* Existing blocks */}
            {blocks.length > 0 && (
              <div>
                <div className="text-[9px] font-mono text-gray-500 uppercase tracking-wider mb-1.5">
                  Your blocks ({blocks.length})
                </div>
                {blocks.map((b) => (
                  <div
                    key={b.id}
                    onClick={() => setSelectedBlockId(b.id)}
                    className={`flex items-center gap-2 px-2 py-1.5 rounded cursor-pointer transition-colors ${
                      selectedBlockId === b.id
                        ? 'bg-amber-500/10 border border-amber-500/20'
                        : 'hover:bg-[#1a1b1e] border border-transparent'
                    }`}
                  >
                    <div className="flex-1">
                      <div className="text-xs font-mono text-gray-300">
                        {b.name}
                      </div>
                      <div className="text-[9px] font-mono text-gray-600">
                        {b.description || `${b.graph.states.length} states`}
                      </div>
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        removeBlock(b.id)
                      }}
                      className="text-red-400/60 hover:text-red-400 text-sm transition-colors"
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Composition */}
        {activeTab === 'compose' && (
          <div className="space-y-3">
            <div className="text-[9px] font-mono text-gray-500 uppercase tracking-wider">
              Composition Sequence
            </div>

            {blocks.length === 0 ? (
              <div className="text-xs font-mono text-gray-600 text-center py-6">
                Add blocks first from the Blocks tab
              </div>
            ) : (
              <>
                {/* Available blocks to add */}
                <div>
                  <div className="text-[9px] font-mono text-gray-600 mb-1.5">
                    Available blocks:
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {blocks.map((b) => (
                      <button
                        key={b.id}
                        onClick={() => addToSequence(b.id)}
                        className="text-[9px] font-mono text-amber-400 bg-amber-500/10 border border-amber-500/20 rounded px-1.5 py-0.5 hover:bg-amber-500/20 transition-colors"
                      >
                        + {b.name}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Sequence visualization */}
                <div className="border border-[#2d3748] rounded-lg p-3">
                  <div className="text-[9px] font-mono text-gray-500 uppercase mb-2">
                    Execution order
                  </div>
                  {sequence.length === 0 ? (
                    <div className="text-xs font-mono text-gray-600 text-center py-3">
                      Click blocks above to add to sequence
                    </div>
                  ) : (
                    <div className="space-y-1">
                      {sequence.map((blockId, idx) => {
                        const block = blocks.find((b) => b.id === blockId)
                        return (
                          <div key={idx} className="flex items-center gap-2">
                            <span className="text-[9px] font-mono text-gray-600 w-4 text-right">
                              {idx + 1}.
                            </span>
                            <div className="flex-1 bg-[#1a1b1e] border border-[#2d3748] rounded px-2 py-1 text-xs font-mono text-amber-300">
                              {block?.name ?? '(deleted)'}
                            </div>
                            {idx < sequence.length - 1 && (
                              <span className="text-gray-600 text-xs">↓</span>
                            )}
                            <button
                              onClick={() => removeFromSequence(idx)}
                              className="text-red-400/60 hover:text-red-400 text-xs transition-colors"
                            >
                              ×
                            </button>
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>

                <div className="text-[9px] font-mono text-gray-600 leading-relaxed">
                  Output tape of each block is passed as input to the next
                  block.
                </div>
              </>
            )}
          </div>
        )}

        {/* Test */}
        {activeTab === 'test' && (
          <div className="space-y-3">
            <div className="text-[9px] font-mono text-gray-500 uppercase tracking-wider">
              Test sequence
            </div>
            <div className="flex gap-2">
              <input
                value={testInput}
                onChange={(e) => setTestInput(e.target.value)}
                placeholder="Input tape string"
                className="flex-1 bg-[#0e0f11] border border-[#2d3748] rounded px-2 py-1.5 text-xs font-mono text-gray-300 outline-none focus:border-amber-500"
              />
              <button
                onClick={runSequence}
                disabled={sequence.length === 0}
                className="px-3 py-1.5 text-[10px] font-mono bg-amber-500/20 text-amber-300 border border-amber-500/30 rounded hover:bg-amber-500/30 disabled:opacity-40 transition-colors"
              >
                ▶ Run
              </button>
            </div>

            {testResults.length > 0 && (
              <div className="space-y-2">
                <div className="text-[9px] font-mono text-gray-500 uppercase tracking-wider">
                  Execution trace
                </div>
                {testResults.map((r, i) => (
                  <div
                    key={i}
                    className={`px-3 py-2 rounded border text-xs font-mono ${
                      r.result === 'accepted'
                        ? 'bg-emerald-500/5 border-emerald-500/20'
                        : r.result === 'rejected'
                          ? 'bg-red-500/5 border-red-500/20'
                          : 'bg-amber-500/5 border-amber-500/20'
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-[9px] font-mono text-gray-600">
                        step {i + 1}
                      </span>
                      <span className="text-amber-300 font-bold">
                        {r.blockName}
                      </span>
                      <span
                        className={
                          r.result === 'accepted'
                            ? 'text-emerald-400'
                            : r.result === 'rejected'
                              ? 'text-red-400'
                              : 'text-amber-400'
                        }
                      >
                        {r.result === 'accepted'
                          ? '✓'
                          : r.result === 'rejected'
                            ? '✗'
                            : '⊣'}
                      </span>
                    </div>
                    <div className="text-[10px] text-gray-500">
                      in: &quot;{r.input || 'ε'}&quot; → out: &quot;
                      {r.tape || 'ε'}&quot;
                    </div>
                  </div>
                ))}
                <div className="px-3 py-2 bg-[#1a1b1e] border border-[#2d3748] rounded text-xs font-mono">
                  <span className="text-gray-500">Final tape: </span>
                  <span className="text-white">
                    &quot;
                    {testResults[testResults.length - 1]?.tape || 'ε'}&quot;
                  </span>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
