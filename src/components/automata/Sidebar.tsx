import React, { useState, useEffect } from 'react'
import type {
  AutomataGraph,
  State,
  Transition,
  MachineType,
} from '@/lib/automata/types'

interface SidebarProps {
  graph: AutomataGraph
  onGraphChange: (graph: AutomataGraph) => void
  onNewMachine: (type: MachineType) => void
  selectedStateId: string | null
  selectedTransitionId: string | null
}

const MACHINE_GROUPS: {
  label: string
  color: string
  types: { type: MachineType; label: string; desc: string }[]
}[] = [
  {
    label: 'Finite',
    color: 'text-cyan-400',
    types: [
      { type: 'DFA', label: 'DFA', desc: 'Deterministic Finite' },
      { type: 'NFA', label: 'NFA', desc: 'Nondeterministic Finite' },
      { type: 'Mealy', label: 'Mealy', desc: 'Output on transitions' },
      { type: 'Moore', label: 'Moore', desc: 'Output on states' },
    ],
  },
  {
    label: 'Pushdown',
    color: 'text-amber-400',
    types: [{ type: 'PDA', label: 'PDA', desc: 'Pushdown Automaton' }],
  },
  {
    label: 'Turing',
    color: 'text-emerald-400',
    types: [
      { type: 'TM', label: 'TM', desc: 'Single-tape Turing' },
      { type: 'MultiTM', label: 'Multi-TM', desc: 'Multi-tape Turing' },
      { type: 'TMBlocks', label: 'TM Blocks', desc: 'Composable blocks' },
    ],
  },
  {
    label: 'Formal',
    color: 'text-purple-400',
    types: [
      { type: 'Grammar', label: 'Grammar', desc: 'Formal grammar' },
      { type: 'LSystem', label: 'L-System', desc: 'Lindenmayer system' },
      { type: 'RegEx', label: 'RegEx', desc: 'Regular expression' },
    ],
  },
]

export function Sidebar({
  graph,
  onGraphChange,
  onNewMachine,
  selectedStateId,
  selectedTransitionId,
}: SidebarProps) {
  const [tab, setTab] = useState<'machine' | 'states' | 'transitions'>(
    'machine',
  )

  const [alphabetInput, setAlphabetInput] = useState(graph.alphabet.join(','))

  useEffect(() => {
    setAlphabetInput(graph.alphabet.join(','))
  }, [graph.alphabet])

  const selectedState = graph.states.find((s) => s.id === selectedStateId)
  const selectedTransition = graph.transitions.find(
    (t) => t.id === selectedTransitionId,
  )

  const updateState = (id: string, patch: Partial<State>) => {
    onGraphChange({
      ...graph,
      states: graph.states.map((s) => (s.id === id ? { ...s, ...patch } : s)),
    })
  }

  const updateTransition = (id: string, patch: Partial<Transition>) => {
    onGraphChange({
      ...graph,
      transitions: graph.transitions.map((t) =>
        t.id === id ? { ...t, ...patch } : t,
      ),
    })
  }

  const isMealy = graph.type === 'Mealy'
  const isMoore = graph.type === 'Moore'
  const isSpecial = ['Grammar', 'LSystem', 'RegEx', 'TMBlocks'].includes(
    graph.type,
  )

  return (
    <div className="w-64 bg-[#111214] border-r border-[#1e2028] flex flex-col h-full select-none">
      {/* Header */}
      <div className="px-3 py-2.5 border-b border-[#1e2028]">
        <div className="flex items-center gap-2 mb-1.5">
          <span className="text-[9px] font-mono text-cyan-400/60 uppercase tracking-widest">
            Machine
          </span>
        </div>
        <input
          value={graph.name}
          onChange={(e) => onGraphChange({ ...graph, name: e.target.value })}
          className="w-full bg-transparent text-white text-sm font-semibold outline-none border-b border-transparent hover:border-[#374151] focus:border-cyan-500 pb-0.5 transition-colors"
        />

        {/* Machine type groups */}
        <div className="mt-2 space-y-1.5">
          {MACHINE_GROUPS.map((group) => (
            <div key={group.label}>
              <div
                className={`text-[8px] font-mono uppercase tracking-widest mb-0.5 ${group.color} opacity-60`}
              >
                {group.label}
              </div>
              <div className="flex gap-0.5 flex-wrap">
                {group.types.map(({ type, label }) => (
                  <button
                    key={type}
                    onClick={() => onNewMachine(type)}
                    className={`text-[9px] font-mono py-0.5 px-1.5 rounded transition-all ${
                      graph.type === type
                        ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/40'
                        : 'text-gray-500 hover:text-gray-300 hover:bg-[#1a1b1e]'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Tabs (hide for special types) */}
      {!isSpecial && (
        <div className="flex border-b border-[#1e2028]">
          {(['machine', 'states', 'transitions'] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`flex-1 text-[10px] font-mono py-1.5 capitalize transition-colors ${
                tab === t
                  ? 'text-cyan-400 border-b-2 border-cyan-400'
                  : 'text-gray-500 hover:text-gray-300'
              }`}
            >
              {t}
            </button>
          ))}
        </div>
      )}

      {/* Tab content */}
      <div className="flex-1 overflow-y-auto">
        {isSpecial ? (
          <div className="p-3">
            <div className="text-xs font-mono text-gray-500 text-center mt-4">
              Use the main panel to edit this {graph.type} machine.
            </div>
          </div>
        ) : (
          <>
            {tab === 'machine' && (
              <div className="p-3 space-y-3">
                <div>
                  <Label>States</Label>
                  <Stat value={graph.states.length} label="total" />
                  <Stat
                    value={graph.states.filter((s) => s.isStart).length}
                    label="start"
                  />
                  <Stat
                    value={graph.states.filter((s) => s.isAccept).length}
                    label="accept"
                  />
                </div>

                <div>
                  <Label>Transitions</Label>
                  <Stat value={graph.transitions.length} label="total" />
                </div>

                <div>
                  <Label>Input Alphabet</Label>
                  <input
                    placeholder="a,b,0,1"
                    value={alphabetInput}
                    onChange={(e) => setAlphabetInput(e.target.value)}
                    onBlur={(e) =>
                      onGraphChange({
                        ...graph,
                        alphabet: e.target.value
                          .split(',')
                          .map((s) => s.trim())
                          .filter(Boolean),
                      })
                    }
                    className="w-full bg-[#0e0f11] border border-[#2d3748] rounded px-2 py-1 text-xs font-mono text-gray-300 outline-none focus:border-cyan-500 transition-colors"
                  />
                </div>

                {isMealy && (
                  <div className="bg-amber-500/5 border border-amber-500/20 rounded p-2">
                    <div className="text-[9px] font-mono text-amber-400 mb-1">
                      Mealy Machine
                    </div>
                    <div className="text-[9px] font-mono text-gray-500 leading-relaxed">
                      Transition labels:{' '}
                      <span className="text-amber-300">input/output</span>
                      <br />
                      e.g. <span className="text-amber-300">a/0</span> means
                      read &apos;a&apos;, emit &apos;0&apos;
                    </div>
                  </div>
                )}

                {isMoore && (
                  <div className="bg-blue-500/5 border border-blue-500/20 rounded p-2">
                    <div className="text-[9px] font-mono text-blue-400 mb-1">
                      Moore Machine
                    </div>
                    <div className="text-[9px] font-mono text-gray-500 leading-relaxed">
                      Each state has an output. Set it in the state properties
                      below.
                    </div>
                  </div>
                )}

                {graph.type === 'MultiTM' && (
                  <div>
                    <Label>Number of Tapes</Label>
                    <input
                      type="number"
                      min={1}
                      max={5}
                      value={graph.numTapes ?? 2}
                      onChange={(e) =>
                        onGraphChange({
                          ...graph,
                          numTapes: Math.max(
                            1,
                            Math.min(5, parseInt(e.target.value) || 2),
                          ),
                        })
                      }
                      className="w-full bg-[#0e0f11] border border-[#2d3748] rounded px-2 py-1 text-xs font-mono text-gray-300 outline-none focus:border-cyan-500 transition-colors"
                    />
                    <div className="text-[9px] font-mono text-gray-600 mt-1">
                      Transition format: reads/writes/dirs
                      <br />
                      e.g. <span className="text-cyan-400">a,b/c,d/R,L</span>
                    </div>
                  </div>
                )}

                {graph.type === 'PDA' && (
                  <div>
                    <Label>Stack Alphabet</Label>
                    <input
                      placeholder="A,B,Z"
                      value={(graph.stackAlphabet ?? []).join(',')}
                      onChange={(e) =>
                        onGraphChange({
                          ...graph,
                          stackAlphabet: e.target.value
                            .split(',')
                            .map((s) => s.trim())
                            .filter(Boolean),
                        })
                      }
                      className="w-full bg-[#0e0f11] border border-[#2d3748] rounded px-2 py-1 text-xs font-mono text-gray-300 outline-none focus:border-cyan-500 transition-colors"
                    />
                  </div>
                )}

                {(graph.type === 'TM' || graph.type === 'MultiTM') && (
                  <>
                    <div>
                      <Label>Tape Alphabet</Label>
                      <input
                        placeholder="a,b,B"
                        value={(graph.tapeAlphabet ?? []).join(',')}
                        onChange={(e) =>
                          onGraphChange({
                            ...graph,
                            tapeAlphabet: e.target.value
                              .split(',')
                              .map((s) => s.trim())
                              .filter(Boolean),
                          })
                        }
                        className="w-full bg-[#0e0f11] border border-[#2d3748] rounded px-2 py-1 text-xs font-mono text-gray-300 outline-none focus:border-cyan-500 transition-colors"
                      />
                    </div>
                    <div>
                      <Label>Blank Symbol</Label>
                      <input
                        placeholder="B"
                        value={graph.blankSymbol ?? 'B'}
                        onChange={(e) =>
                          onGraphChange({
                            ...graph,
                            blankSymbol: e.target.value,
                          })
                        }
                        className="w-full bg-[#0e0f11] border border-[#2d3748] rounded px-2 py-1 text-xs font-mono text-gray-300 outline-none focus:border-cyan-500 transition-colors"
                      />
                    </div>
                  </>
                )}

                {/* Selected state */}
                {selectedState && (
                  <div className="border-t border-[#1e2028] pt-3">
                    <Label>State: {selectedState.label}</Label>
                    <div className="space-y-2">
                      <div>
                        <span className="text-[10px] text-gray-500 font-mono">
                          Label
                        </span>
                        <input
                          value={selectedState.label}
                          onChange={(e) =>
                            updateState(selectedState.id, {
                              label: e.target.value,
                            })
                          }
                          className="w-full bg-[#0e0f11] border border-[#2d3748] rounded px-2 py-1 text-xs font-mono text-gray-300 outline-none focus:border-cyan-500 mt-0.5"
                        />
                      </div>
                      {isMoore && (
                        <div>
                          <span className="text-[10px] text-gray-500 font-mono">
                            Output
                          </span>
                          <input
                            value={selectedState.mooreOutput ?? ''}
                            onChange={(e) =>
                              updateState(selectedState.id, {
                                mooreOutput: e.target.value,
                              })
                            }
                            placeholder="0 or 1"
                            className="w-full bg-[#0e0f11] border border-[#2d3748] rounded px-2 py-1 text-xs font-mono text-blue-300 outline-none focus:border-blue-500 mt-0.5"
                          />
                        </div>
                      )}
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={selectedState.isStart}
                          onChange={(e) => {
                            const newStates = e.target.checked
                              ? graph.states.map((s) => ({
                                  ...s,
                                  isStart: s.id === selectedState.id,
                                }))
                              : graph.states.map((s) =>
                                  s.id === selectedState.id
                                    ? { ...s, isStart: false }
                                    : s,
                                )
                            onGraphChange({ ...graph, states: newStates })
                          }}
                          className="accent-cyan-400"
                        />
                        <span className="text-xs font-mono text-gray-400">
                          Start state
                        </span>
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={selectedState.isAccept}
                          onChange={(e) =>
                            updateState(selectedState.id, {
                              isAccept: e.target.checked,
                            })
                          }
                          className="accent-emerald-400"
                        />
                        <span className="text-xs font-mono text-gray-400">
                          Accept state
                        </span>
                      </label>
                    </div>
                  </div>
                )}

                {/* Selected transition */}
                {selectedTransition && (
                  <div className="border-t border-[#1e2028] pt-3">
                    <Label>Transition</Label>
                    <div className="space-y-2">
                      <div className="text-xs font-mono text-gray-500">
                        {
                          graph.states.find(
                            (s) => s.id === selectedTransition.from,
                          )?.label
                        }{' '}
                        →{' '}
                        {
                          graph.states.find(
                            (s) => s.id === selectedTransition.to,
                          )?.label
                        }
                      </div>
                      <div>
                        <span className="text-[10px] text-gray-500 font-mono">
                          Label
                        </span>
                        <input
                          value={selectedTransition.label}
                          placeholder={
                            graph.type === 'PDA'
                              ? 'a,A/BA'
                              : graph.type === 'TM' || graph.type === 'MultiTM'
                                ? 'a/b,R'
                                : graph.type === 'Mealy'
                                  ? 'a/0'
                                  : 'a'
                          }
                          onChange={(e) =>
                            updateTransition(selectedTransition.id, {
                              label: e.target.value,
                            })
                          }
                          className="w-full bg-[#0e0f11] border border-[#2d3748] rounded px-2 py-1 text-xs font-mono text-gray-300 outline-none focus:border-cyan-500 mt-0.5"
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {tab === 'states' && (
              <div className="p-2">
                {graph.states.length === 0 ? (
                  <div className="text-xs text-gray-600 font-mono text-center mt-4">
                    No states yet
                  </div>
                ) : (
                  graph.states.map((s) => (
                    <div
                      key={s.id}
                      className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-[#1a1b1e] group"
                    >
                      <div className="flex gap-1">
                        {s.isStart && (
                          <span className="text-[9px] font-mono text-cyan-400 bg-cyan-400/10 px-1 rounded">
                            S
                          </span>
                        )}
                        {s.isAccept && (
                          <span className="text-[9px] font-mono text-emerald-400 bg-emerald-400/10 px-1 rounded">
                            A
                          </span>
                        )}
                      </div>
                      <span className="text-xs font-mono text-gray-300 flex-1">
                        {s.label}
                      </span>
                      {isMoore && s.mooreOutput !== undefined && (
                        <span className="text-[9px] font-mono text-blue-400 bg-blue-400/10 px-1 rounded">
                          out:{s.mooreOutput}
                        </span>
                      )}
                      <button
                        onClick={() => {
                          onGraphChange({
                            ...graph,
                            states: graph.states.filter((st) => st.id !== s.id),
                            transitions: graph.transitions.filter(
                              (t) => t.from !== s.id && t.to !== s.id,
                            ),
                          })
                        }}
                        className="opacity-0 group-hover:opacity-100 text-red-500/70 hover:text-red-400 text-xs transition-opacity"
                      >
                        ×
                      </button>
                    </div>
                  ))
                )}
              </div>
            )}

            {tab === 'transitions' && (
              <div className="p-2">
                {graph.transitions.length === 0 ? (
                  <div className="text-xs text-gray-600 font-mono text-center mt-4">
                    No transitions yet
                  </div>
                ) : (
                  graph.transitions.map((t) => {
                    const fromLabel =
                      graph.states.find((s) => s.id === t.from)?.label ?? '?'
                    const toLabel =
                      graph.states.find((s) => s.id === t.to)?.label ?? '?'
                    return (
                      <div
                        key={t.id}
                        className="flex items-center gap-1 px-2 py-1.5 rounded hover:bg-[#1a1b1e] group"
                      >
                        <span className="text-xs font-mono text-gray-400 flex-1 truncate">
                          {fromLabel}
                          <span className="text-cyan-500 mx-1">→</span>
                          {toLabel}
                          <span className="text-amber-400 ml-1">
                            [{t.label}]
                          </span>
                        </span>
                        <button
                          onClick={() =>
                            onGraphChange({
                              ...graph,
                              transitions: graph.transitions.filter(
                                (tr) => tr.id !== t.id,
                              ),
                            })
                          }
                          className="opacity-0 group-hover:opacity-100 text-red-500/70 hover:text-red-400 text-xs transition-opacity"
                        >
                          ×
                        </button>
                      </div>
                    )
                  })
                )}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}

function Label({ children }: { children: React.ReactNode }) {
  return (
    <div className="text-[10px] font-mono text-gray-500 uppercase tracking-wider mb-1.5">
      {children}
    </div>
  )
}

function Stat({ value, label }: { value: number; label: string }) {
  return (
    <div className="flex items-center gap-2 mb-0.5">
      <span className="text-sm font-mono text-white">{value}</span>
      <span className="text-xs text-gray-600">{label}</span>
    </div>
  )
}
