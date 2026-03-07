import { useState, useMemo, useEffect } from 'react'
import type {
  AutomataGraph,
  DFAConfig,
  NFAConfig,
  PDAConfig,
  TMConfig,
  MealyConfig,
  MooreConfig,
  MultiTMConfig,
  DFAStep,
  NFAStep,
  PDAStep,
  TMStep,
} from '@/lib/automata/types'
import { AutomataCanvas } from './Canvas'

type SimConfig =
  | DFAConfig
  | NFAConfig
  | PDAConfig
  | TMConfig
  | MealyConfig
  | MooreConfig
  | MultiTMConfig

interface VisualTracePanelProps {
  graph: AutomataGraph
  simConfig: SimConfig
  isOpen: boolean
  onClose: () => void
}

export function VisualTracePanel({
  graph,
  simConfig,
  isOpen,
  onClose,
}: VisualTracePanelProps) {
  const [currentStep, setCurrentStep] = useState(0)

  const history = simConfig.history as unknown[]
  const totalSteps = history.length

  // Keyboard navigation
  useEffect(() => {
    if (!isOpen) return

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') {
        setCurrentStep((prev) => Math.max(0, prev - 1))
        e.preventDefault()
      } else if (e.key === 'ArrowRight') {
        setCurrentStep((prev) => Math.min(totalSteps - 1, prev + 1))
        e.preventDefault()
      } else if (e.key === 'Home') {
        setCurrentStep(0)
        e.preventDefault()
      } else if (e.key === 'End') {
        setCurrentStep(totalSteps - 1)
        e.preventDefault()
      } else if (e.key === 'Escape') {
        onClose()
        e.preventDefault()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, totalSteps, onClose])

  // Calculate which states should be highlighted at the current step
  const { activeStateIds, acceptedStateIds, rejectedStateIds } = useMemo(() => {
    if (!history[currentStep]) {
      return { activeStateIds: [], acceptedStateIds: [], rejectedStateIds: [] }
    }

    const step = history[currentStep]
    let activeIds: string[] = []
    let acceptedIds: string[] = []
    let rejectedIds: string[] = []

    // Check if this is the final step
    const isFinalStep = currentStep === totalSteps - 1

    switch (graph.type) {
      case 'DFA': {
        const dfaStep = step as DFAStep
        if (isFinalStep) {
          if (simConfig.accepted) {
            acceptedIds = [dfaStep.nextState].filter((s) => s !== null) as string[]
          } else if (simConfig.rejected) {
            rejectedIds = [dfaStep.nextState].filter((s) => s !== null) as string[]
          } else {
            activeIds = [dfaStep.nextState].filter((s) => s !== null) as string[]
          }
        } else {
          activeIds = [dfaStep.state].filter((s) => s !== null) as string[]
        }
        break
      }
      case 'NFA': {
        const nfaStep = step as NFAStep
        if (isFinalStep) {
          if (simConfig.accepted) {
            acceptedIds = [...nfaStep.nextStates]
          } else if (simConfig.rejected) {
            rejectedIds = [...nfaStep.nextStates]
          } else {
            activeIds = [...nfaStep.nextStates]
          }
        } else {
          activeIds = [...nfaStep.states]
        }
        break
      }
      case 'PDA': {
        const pdaStep = step as PDAStep
        if (isFinalStep) {
          const nextState = pdaStep.nextState
          if (nextState === null) {
            rejectedIds = []
          } else if (simConfig.accepted) {
            acceptedIds = [nextState]
          } else if (simConfig.rejected) {
            rejectedIds = [nextState]
          } else {
            activeIds = [nextState]
          }
        } else {
          activeIds = pdaStep.state ? [pdaStep.state] : []
        }
        break
      }
      case 'TM':
      case 'Mealy':
      case 'Moore': {
        const tmStep = step as TMStep
        if (isFinalStep) {
          const state = tmStep.nextState
          if (state === null) {
            rejectedIds = []
          } else if (simConfig.accepted) {
            acceptedIds = [state]
          } else if (simConfig.rejected) {
            rejectedIds = [state]
          } else {
            activeIds = [state]
          }
        } else {
          activeIds = tmStep.state !== null ? [tmStep.state] : []
        }
        break
      }
      case 'MultiTM': {
        const tmStep = step as TMStep
        if (isFinalStep) {
          const state = tmStep.nextState
          if (state === null) {
            rejectedIds = []
          } else if (simConfig.accepted) {
            acceptedIds = [state]
          } else if (simConfig.rejected) {
            rejectedIds = [state]
          } else {
            activeIds = [state]
          }
        } else {
          activeIds = tmStep.state !== null ? [tmStep.state] : []
        }
        break
      }
    }

    return { activeStateIds: activeIds, acceptedStateIds: acceptedIds, rejectedStateIds: rejectedIds }
  }, [currentStep, history, graph.type, simConfig, totalSteps])

  // Get current step details for display
  const stepDetails = useMemo(() => {
    if (!history[currentStep]) return null

    const step = history[currentStep]

    switch (graph.type) {
      case 'DFA': {
        const dfaStep = step as DFAStep
        return {
          input: dfaStep.input,
          symbol: dfaStep.symbol,
          state: graph.states.find((s) => s.id === dfaStep.state)?.label || dfaStep.state,
        }
      }
      case 'NFA': {
        const nfaStep = step as NFAStep
        return {
          input: nfaStep.input,
          symbol: nfaStep.symbol,
          states: nfaStep.states
            .map((id) => graph.states.find((s) => s.id === id)?.label || id)
            .join(', '),
        }
      }
      case 'PDA': {
        const pdaStep = step as PDAStep
        return {
          input: pdaStep.input,
          symbol: pdaStep.symbol,
          state: graph.states.find((s) => s.id === pdaStep.state)?.label || pdaStep.state,
          stackTop: pdaStep.stackTop || 'ε',
        }
      }
      case 'TM':
      case 'Mealy':
      case 'Moore':
      case 'MultiTM': {
        const tmStep = step as TMStep
        return {
          state: graph.states.find((s) => s.id === tmStep.state)?.label || tmStep.state,
          read: tmStep.read,
          write: tmStep.write,
          direction: tmStep.direction,
        }
      }
      default:
        return null
    }
  }, [currentStep, history, graph])

  const result = simConfig.accepted
    ? 'accepted'
    : simConfig.rejected
      ? 'rejected'
      : (simConfig as TMConfig).halted
        ? 'halted'
        : 'incomplete'

  const resultColor = {
    accepted: 'text-emerald-400',
    rejected: 'text-red-400',
    halted: 'text-amber-400',
    incomplete: 'text-gray-400',
  }[result]

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 backdrop-blur-sm p-3">
      <div
        className="bg-[#0a0b0d] border border-[#2d3748] rounded-xl shadow-2xl flex flex-col overflow-hidden"
        style={{ width: '95vw', maxWidth: '1200px', height: '90vh' }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-[#1e2028] bg-[#111214]">
          <div className="flex items-center gap-4">
            <span className="text-[10px] font-mono text-cyan-400 uppercase tracking-widest">
              Visual Trace
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

        {/* Canvas area */}
        <div className="flex-1 min-h-0 relative overflow-hidden">
          <>
            <AutomataCanvas
              graph={graph}
              editorState={{
                tool: 'select',
                selectedStateId: null,
                selectedTransitionId: null,
                transitionSource: null,
              }}
              activeStateIds={activeStateIds}
              acceptedStateIds={acceptedStateIds}
              rejectedStateIds={rejectedStateIds}
              onGraphChange={() => {}} // Read-only
              onEditorStateChange={() => {}} // Read-only
            />
          </>
        </div>

        {/* Step info bar */}
        <div className="border-t border-[#1e2028] bg-[#111214] px-5 py-3">
          <div className="flex items-center gap-4 mb-3 flex-wrap">
            <div className="flex items-center gap-2">
              <span className="text-[9px] font-mono text-gray-500 uppercase tracking-wider">
                Step
              </span>
              <span className="text-sm font-mono text-cyan-400">
                {currentStep + 1} / {totalSteps}
              </span>
            </div>

            {stepDetails && (
              <>
                {'state' in stepDetails && stepDetails.state && (
                  <div className="flex items-center gap-2">
                    <span className="text-[9px] font-mono text-gray-500 uppercase tracking-wider">
                      State
                    </span>
                    <span className="text-sm font-mono text-white">
                      {stepDetails.state}
                    </span>
                  </div>
                )}

                {'states' in stepDetails && stepDetails.states && (
                  <div className="flex items-center gap-2">
                    <span className="text-[9px] font-mono text-gray-500 uppercase tracking-wider">
                      States
                    </span>
                    <span className="text-sm font-mono text-white">
                      {stepDetails.states}
                    </span>
                  </div>
                )}

                {'input' in stepDetails && (
                  <div className="flex items-center gap-2">
                    <span className="text-[9px] font-mono text-gray-500 uppercase tracking-wider">
                      Remaining
                    </span>
                    <span className="text-sm font-mono text-gray-300">
                      {stepDetails.input || 'ε'}
                    </span>
                  </div>
                )}

                {'symbol' in stepDetails && stepDetails.symbol !== undefined && (
                  <div className="flex items-center gap-2">
                    <span className="text-[9px] font-mono text-gray-500 uppercase tracking-wider">
                      Symbol
                    </span>
                    <span className="text-sm font-mono text-gray-300">
                      {stepDetails.symbol || 'ε'}
                    </span>
                  </div>
                )}

                {'read' in stepDetails && stepDetails.read !== undefined && (
                  <div className="flex items-center gap-2">
                    <span className="text-[9px] font-mono text-gray-500 uppercase tracking-wider">
                      Read
                    </span>
                    <span className="text-sm font-mono text-cyan-300">
                      {stepDetails.read || 'ε'}
                    </span>
                  </div>
                )}

                {'write' in stepDetails && stepDetails.write !== undefined && (
                  <div className="flex items-center gap-2">
                    <span className="text-[9px] font-mono text-gray-500 uppercase tracking-wider">
                      Write
                    </span>
                    <span className="text-sm font-mono text-amber-300">
                      {stepDetails.write || 'ε'}
                    </span>
                  </div>
                )}

                {'direction' in stepDetails && stepDetails.direction !== undefined && (
                  <div className="flex items-center gap-2">
                    <span className="text-[9px] font-mono text-gray-500 uppercase tracking-wider">
                      Move
                    </span>
                    <span className="text-sm font-mono text-purple-300">
                      {stepDetails.direction === 'L' ? '←' : stepDetails.direction === 'R' ? '→' : '•'}
                    </span>
                  </div>
                )}

                {'stackTop' in stepDetails && stepDetails.stackTop && (
                  <div className="flex items-center gap-2">
                    <span className="text-[9px] font-mono text-gray-500 uppercase tracking-wider">
                      Stack Top
                    </span>
                    <span className="text-sm font-mono text-purple-400">
                      {stepDetails.stackTop}
                    </span>
                  </div>
                )}
              </>
            )}

            <div className="flex items-center gap-2 ml-auto">
              <span className="text-[9px] font-mono text-gray-500 uppercase tracking-wider">
                Result
              </span>
              <span className={`text-sm font-mono ${resultColor} font-bold`}>
                {result.toUpperCase()}
              </span>
            </div>
          </div>

          {/* Step controls */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setCurrentStep(0)}
              disabled={currentStep === 0}
              className="px-3 py-1.5 text-xs font-mono bg-[#1a1b1e] text-gray-400 border border-[#2d3748] rounded hover:bg-[#25262b] hover:text-white disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              ⏮ First
            </button>
            <button
              onClick={() => setCurrentStep(Math.max(0, currentStep - 1))}
              disabled={currentStep === 0}
              className="px-3 py-1.5 text-xs font-mono bg-[#1a1b1e] text-gray-400 border border-[#2d3748] rounded hover:bg-[#25262b] hover:text-white disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              ◀ Prev
            </button>
            <button
              onClick={() => setCurrentStep(Math.min(totalSteps - 1, currentStep + 1))}
              disabled={currentStep === totalSteps - 1}
              className="px-3 py-1.5 text-xs font-mono bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 rounded hover:bg-cyan-500/30 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              Next ▶
            </button>
            <button
              onClick={() => setCurrentStep(totalSteps - 1)}
              disabled={currentStep === totalSteps - 1}
              className="px-3 py-1.5 text-xs font-mono bg-[#1a1b1e] text-gray-400 border border-[#2d3748] rounded hover:bg-[#25262b] hover:text-white disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              Last ⏭
            </button>

            {/* Progress slider */}
            <div className="flex-1 mx-4">
              <input
                type="range"
                min="0"
                max={totalSteps - 1}
                value={currentStep}
                onChange={(e) => setCurrentStep(parseInt(e.target.value))}
                className="w-full h-2 bg-[#1a1b1e] rounded-lg appearance-none cursor-pointer slider"
              />
            </div>

            <span className="text-xs font-mono text-gray-600">
              Use ← → arrow keys
            </span>
          </div>
        </div>

        {/* TM Tape display if applicable */}
        {(graph.type === 'TM' || graph.type === 'MultiTM') && history[currentStep] && (
          <div className="border-t border-[#1e2028] bg-[#0e0f11] px-5 py-3 overflow-x-auto">
            <div className="text-[9px] font-mono text-gray-500 uppercase tracking-wider mb-2">
              Tape at Step {currentStep + 1}
            </div>
            <div className="flex gap-0">
              {(simConfig as TMConfig).tape.map((cell, i) => {
                const headPos = (simConfig as TMConfig).headPosition
                return (
                  <div
                    key={i}
                    className={`w-7 h-7 border flex items-center justify-center text-xs font-mono transition-colors ${
                      i === headPos
                        ? 'border-cyan-400 bg-cyan-400/20 text-cyan-300'
                        : 'border-[#2d3748] text-gray-400'
                    }`}
                  >
                    {cell}
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </div>

      <style>{`
        .slider::-webkit-slider-thumb {
          appearance: none;
          width: 16px;
          height: 16px;
          border-radius: 50%;
          background: #22d3ee;
          cursor: pointer;
        }
        .slider::-moz-range-thumb {
          width: 16px;
          height: 16px;
          border-radius: 50%;
          background: #22d3ee;
          cursor: pointer;
          border: none;
        }
      `}</style>
    </div>
  )
}
