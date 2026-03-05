import React, { useState, useEffect, useRef } from 'react'
import type { AutomataGraph } from '@/lib/automata/types'
import type {
  DFAConfig,
  NFAConfig,
  PDAConfig,
  TMConfig,
  MealyConfig,
  MooreConfig,
  MultiTMConfig,
} from '@/lib/automata/types'
import {
  initDFA,
  stepDFA,
  runDFA,
  initNFA,
  stepNFA,
  runNFA,
  initPDA,
  stepPDA,
  runPDA,
  initTM,
  stepTM,
  runTM,
  initMealy,
  stepMealy,
  runMealy,
  initMoore,
  stepMoore,
  runMoore,
  initMultiTM,
  stepMultiTM,
  runMultiTM,
} from '@/lib/automata/simulator'

type SimConfig =
  | DFAConfig
  | NFAConfig
  | PDAConfig
  | TMConfig
  | MealyConfig
  | MooreConfig
  | MultiTMConfig

interface SimulationBarProps {
  graph: AutomataGraph
  onActiveStatesChange: (ids: string[]) => void
  onAcceptedStatesChange: (ids: string[]) => void
  onRejectedStatesChange: (ids: string[]) => void
}

const CANVAS_TYPES = ['DFA', 'NFA', 'PDA', 'TM', 'Mealy', 'Moore', 'MultiTM']

export function SimulationBar({
  graph,
  onActiveStatesChange,
  onAcceptedStatesChange,
  onRejectedStatesChange,
}: SimulationBarProps) {
  const [inputString, setInputString] = useState('')
  const [simConfig, setSimConfig] = useState<SimConfig | null>(null)
  const [autoPlay, setAutoPlay] = useState(false)
  const [autoSpeed, setAutoSpeed] = useState(600)
  const intervalRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const isSimulating = simConfig !== null
  const isCanvasType = CANVAS_TYPES.includes(graph.type)

  function getActiveIds(config: SimConfig): string[] {
    if (graph.type === 'NFA') return [...(config as NFAConfig).currentStates]
    return [
      (
        config as
          | DFAConfig
          | PDAConfig
          | TMConfig
          | MealyConfig
          | MooreConfig
          | MultiTMConfig
      ).currentState,
    ]
  }

  function isFinished(config: SimConfig): boolean {
    return (
      config.accepted !== null ||
      config.rejected ||
      (config as TMConfig).halted === true
    )
  }

  function updateVisualization(config: SimConfig) {
    if (config.accepted) {
      onAcceptedStatesChange(getActiveIds(config))
      onActiveStatesChange([])
      onRejectedStatesChange([])
    } else if (config.rejected) {
      onRejectedStatesChange(getActiveIds(config))
      onActiveStatesChange([])
      onAcceptedStatesChange([])
    } else {
      onActiveStatesChange(getActiveIds(config))
      onAcceptedStatesChange([])
      onRejectedStatesChange([])
    }
  }

  function clearVisualization() {
    onActiveStatesChange([])
    onAcceptedStatesChange([])
    onRejectedStatesChange([])
  }

  function handleInit() {
    let config: SimConfig
    switch (graph.type) {
      case 'DFA':
        config = initDFA(graph, inputString)
        break
      case 'NFA':
        config = initNFA(graph, inputString)
        break
      case 'PDA':
        config = initPDA(graph, inputString)
        break
      case 'TM':
        config = initTM(graph, inputString)
        break
      case 'Mealy':
        config = initMealy(graph, inputString)
        break
      case 'Moore':
        config = initMoore(graph, inputString)
        break
      case 'MultiTM':
        config = initMultiTM(graph, inputString)
        break
      default:
        return
    }
    setSimConfig(config)
    updateVisualization(config)
  }

  function handleStep() {
    if (!simConfig) return
    let next: SimConfig
    switch (graph.type) {
      case 'DFA':
        next = stepDFA(simConfig as DFAConfig, graph)
        break
      case 'NFA':
        next = stepNFA(simConfig as NFAConfig, graph)
        break
      case 'PDA':
        next = stepPDA(simConfig as PDAConfig, graph)
        break
      case 'TM':
        next = stepTM(simConfig as TMConfig, graph)
        break
      case 'Mealy':
        next = stepMealy(simConfig as MealyConfig, graph)
        break
      case 'Moore':
        next = stepMoore(simConfig as MooreConfig, graph)
        break
      case 'MultiTM':
        next = stepMultiTM(simConfig as MultiTMConfig, graph)
        break
      default:
        return
    }
    setSimConfig(next)
    updateVisualization(next)
    if (isFinished(next)) setAutoPlay(false)
  }

  function handleRun() {
    let final: SimConfig
    switch (graph.type) {
      case 'DFA':
        final = runDFA(graph, inputString)
        break
      case 'NFA':
        final = runNFA(graph, inputString)
        break
      case 'PDA':
        final = runPDA(graph, inputString)
        break
      case 'TM':
        final = runTM(graph, inputString)
        break
      case 'Mealy':
        final = runMealy(graph, inputString)
        break
      case 'Moore':
        final = runMoore(graph, inputString)
        break
      case 'MultiTM':
        final = runMultiTM(graph, inputString)
        break
      default:
        return
    }
    setSimConfig(final)
    updateVisualization(final)
    setAutoPlay(false)
  }

  function handleReset() {
    setSimConfig(null)
    setAutoPlay(false)
    clearVisualization()
  }

  useEffect(() => {
    if (autoPlay && simConfig && !isFinished(simConfig)) {
      intervalRef.current = setTimeout(() => {
        handleStep()
      }, autoSpeed)
    } else {
      setAutoPlay(false)
    }
    return () => {
      if (intervalRef.current) clearTimeout(intervalRef.current)
    }
  })

  const result = simConfig
    ? simConfig.accepted
      ? 'accepted'
      : simConfig.rejected
        ? 'rejected'
        : (simConfig as TMConfig).halted
          ? 'halted'
          : null
    : null

  const stepCount = simConfig?.step ?? 0

  const pdaStack =
    simConfig && graph.type === 'PDA' ? (simConfig as PDAConfig).stack : null

  const tmConfig =
    simConfig && graph.type === 'TM' ? (simConfig as TMConfig) : null

  const multiTMConfig =
    simConfig && graph.type === 'MultiTM' ? (simConfig as MultiTMConfig) : null

  const outputStr =
    simConfig && (graph.type === 'Mealy' || graph.type === 'Moore')
      ? (simConfig as MealyConfig | MooreConfig).output
      : null

  if (!isCanvasType) {
    return (
      <div className="bg-[#111214] border-t border-[#1e2028] px-4 py-2 flex items-center gap-2">
        <span className="text-[10px] font-mono text-gray-600">
          {graph.type} — use the editor panel above
        </span>
      </div>
    )
  }

  return (
    <div className="bg-[#111214] border-t border-[#1e2028] flex flex-col">
      {/* TM tape display */}
      {tmConfig && (
        <div className="px-4 py-2 border-b border-[#1e2028] overflow-x-auto">
          <div className="text-[9px] font-mono text-gray-500 uppercase tracking-wider mb-1">
            Tape
          </div>
          <div className="flex gap-0">
            {tmConfig.tape.map((cell, i) => (
              <div
                key={i}
                className={`w-7 h-7 border flex items-center justify-center text-xs font-mono transition-colors ${
                  i === tmConfig.headPosition
                    ? 'border-cyan-400 bg-cyan-400/20 text-cyan-300'
                    : 'border-[#2d3748] text-gray-400'
                }`}
              >
                {cell}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Multi-tape display */}
      {multiTMConfig && (
        <div className="px-4 py-2 border-b border-[#1e2028] overflow-x-auto">
          <div className="text-[9px] font-mono text-gray-500 uppercase tracking-wider mb-1">
            Tapes
          </div>
          {multiTMConfig.tapes.map((tape, ti) => (
            <div key={ti} className="flex items-center gap-2 mb-0.5">
              <span className="text-[9px] font-mono text-gray-600 w-8">
                T{ti + 1}:
              </span>
              <div className="flex gap-0">
                {tape.map((cell, i) => (
                  <div
                    key={i}
                    className={`w-6 h-6 border flex items-center justify-center text-[10px] font-mono transition-colors ${
                      i === multiTMConfig.headPositions[ti]
                        ? 'border-cyan-400 bg-cyan-400/20 text-cyan-300'
                        : 'border-[#2d3748] text-gray-400'
                    }`}
                  >
                    {cell}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* PDA stack */}
      {pdaStack && (
        <div className="px-4 py-2 border-b border-[#1e2028]">
          <div className="text-[9px] font-mono text-gray-500 uppercase tracking-wider mb-1">
            Stack (top →)
          </div>
          <div className="flex gap-1 flex-row-reverse">
            {[...pdaStack].reverse().map((sym, i) => (
              <div
                key={i}
                className={`w-7 h-7 border flex items-center justify-center text-xs font-mono ${
                  i === 0
                    ? 'border-amber-400 bg-amber-400/10 text-amber-300'
                    : 'border-[#2d3748] text-gray-400'
                }`}
              >
                {sym}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Mealy/Moore output display */}
      {outputStr !== null && isSimulating && (
        <div className="px-4 py-1.5 border-b border-[#1e2028] flex items-center gap-2">
          <span className="text-[9px] font-mono text-gray-500 uppercase">
            Output:
          </span>
          <span className="text-sm font-mono text-amber-300">
            {outputStr || 'ε'}
          </span>
        </div>
      )}

      {/* Main control bar */}
      <div className="flex items-center gap-3 px-4 py-2 flex-wrap">
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-mono text-gray-500 uppercase tracking-wider whitespace-nowrap">
            Input
          </span>
          <div className="relative">
            <input
              value={inputString}
              onChange={(e) => {
                setInputString(e.target.value)
                if (isSimulating) handleReset()
              }}
              placeholder="enter string..."
              disabled={isSimulating}
              className="bg-[#0e0f11] border border-[#2d3748] rounded px-3 py-1 text-sm font-mono text-white outline-none focus:border-cyan-500 w-40 disabled:opacity-50 transition-colors"
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !isSimulating) handleInit()
              }}
            />
            {isSimulating && simConfig && (
              <div className="absolute inset-y-0 right-0 flex items-center pr-2">
                <span className="text-[10px] font-mono text-amber-400/80 truncate max-w-16">
                  {graph.type === 'NFA'
                    ? (simConfig as NFAConfig).remainingInput.slice(0, 8)
                    : ((simConfig as DFAConfig).remainingInput?.slice(0, 8) ??
                      '')}
                </span>
              </div>
            )}
          </div>
        </div>

        <div className="h-6 w-px bg-[#2d3748]" />

        <div className="flex items-center gap-1.5">
          {!isSimulating ? (
            <SimButton
              onClick={handleInit}
              variant="primary"
              disabled={graph.states.length === 0}
            >
              ▶ Start
            </SimButton>
          ) : (
            <>
              <SimButton
                onClick={handleStep}
                disabled={isFinished(simConfig!)}
                variant="default"
              >
                ⏭ Step
              </SimButton>
              <SimButton
                onClick={() => setAutoPlay((v) => !v)}
                disabled={isFinished(simConfig!)}
                variant={autoPlay ? 'active' : 'default'}
              >
                {autoPlay ? '⏸ Pause' : '▶▶ Auto'}
              </SimButton>
              <SimButton
                onClick={handleRun}
                disabled={isFinished(simConfig!)}
                variant="default"
              >
                ⚡ Run
              </SimButton>
              <SimButton onClick={handleReset} variant="danger">
                ↺ Reset
              </SimButton>
            </>
          )}
        </div>

        {isSimulating && (
          <div className="flex items-center gap-2">
            <span className="text-[9px] font-mono text-gray-500 uppercase">
              Speed
            </span>
            <input
              type="range"
              min={100}
              max={2000}
              step={100}
              value={autoSpeed}
              onChange={(e) => setAutoSpeed(Number(e.target.value))}
              className="w-20 accent-cyan-400"
            />
          </div>
        )}

        <div className="flex-1" />

        {isSimulating && (
          <div className="text-xs font-mono text-gray-500">
            step <span className="text-white">{stepCount}</span>
          </div>
        )}

        {isSimulating && graph.type === 'NFA' && (
          <div className="text-xs font-mono text-gray-500">
            active:{' '}
            <span className="text-cyan-400">
              {[...(simConfig as NFAConfig).currentStates]
                .map((id) => graph.states.find((s) => s.id === id)?.label ?? id)
                .join(', ')}
            </span>
          </div>
        )}

        {result && (
          <div
            className={`px-3 py-1 rounded text-xs font-mono font-bold tracking-wider transition-all ${
              result === 'accepted'
                ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                : result === 'rejected'
                  ? 'bg-red-500/20 text-red-400 border border-red-500/40'
                  : 'bg-amber-500/20 text-amber-400 border border-amber-500/40'
            }`}
          >
            {result === 'accepted' && '✓ ACCEPTED'}
            {result === 'rejected' && '✗ REJECTED'}
            {result === 'halted' && '⊣ HALTED'}
          </div>
        )}
      </div>

      {/* History */}
      {simConfig && simConfig.history.length > 0 && (
        <div className="px-4 pb-2 overflow-x-auto">
          <div className="flex gap-1 items-center">
            {simConfig.history.slice(-10).map((step, i) => {
              const s = step as { state?: string; states?: string[] }
              const label = s.state
                ? (graph.states.find((st) => st.id === s.state)?.label ??
                  s.state)
                : (s.states ?? [])
                    .map(
                      (id) =>
                        graph.states.find((st) => st.id === id)?.label ?? id,
                    )
                    .join(',')
              return (
                <React.Fragment key={i}>
                  <span className="text-[10px] font-mono text-gray-500 bg-[#0e0f11] px-1.5 py-0.5 rounded">
                    {label}
                  </span>
                  {i < simConfig.history.slice(-10).length - 1 && (
                    <span className="text-[10px] text-gray-600">→</span>
                  )}
                </React.Fragment>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}

function SimButton({
  children,
  onClick,
  disabled,
  variant = 'default',
}: {
  children: React.ReactNode
  onClick: () => void
  disabled?: boolean
  variant?: 'default' | 'primary' | 'danger' | 'active'
}) {
  const base =
    'px-2.5 py-1 rounded text-[11px] font-mono transition-all disabled:opacity-40 disabled:cursor-not-allowed'
  const variants = {
    default:
      'bg-[#1a1b1e] text-gray-300 hover:bg-[#22232a] hover:text-white border border-[#2d3748]',
    primary:
      'bg-cyan-500/20 text-cyan-300 hover:bg-cyan-500/30 border border-cyan-500/40',
    danger:
      'bg-red-500/10 text-red-400 hover:bg-red-500/20 border border-red-500/20',
    active:
      'bg-amber-500/20 text-amber-300 hover:bg-amber-500/30 border border-amber-500/40',
  }
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`${base} ${variants[variant]}`}
    >
      {children}
    </button>
  )
}
