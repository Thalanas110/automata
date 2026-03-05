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
  MealyStep,
  MooreStep,
  MultiTMStep,
} from '@/lib/automata/types'

type SimConfig =
  | DFAConfig
  | NFAConfig
  | PDAConfig
  | TMConfig
  | MealyConfig
  | MooreConfig
  | MultiTMConfig

interface TracePanelProps {
  graph: AutomataGraph
  simConfig: SimConfig | null
  isOpen: boolean
  onClose: () => void
}

export function TracePanel({
  graph,
  simConfig,
  isOpen,
  onClose,
}: TracePanelProps) {
  if (!isOpen || !simConfig) return null

  const stateLabel = (id: string | null) => {
    if (id === null) return <span className="text-red-400">—</span>
    return (
      graph.states.find((s) => s.id === id)?.label ?? (
        <span className="text-gray-500 italic">{id}</span>
      )
    )
  }

  const statesLabel = (ids: string[]) =>
    ids.length === 0 ? (
      <span className="text-red-400">∅</span>
    ) : (
      ids
        .map((id) => graph.states.find((s) => s.id === id)?.label ?? id)
        .join(', ')
    )

  const result = simConfig.accepted
    ? 'accepted'
    : simConfig.rejected
      ? 'rejected'
      : (simConfig as TMConfig).halted
        ? 'halted'
        : 'incomplete'

  const resultColor = {
    accepted: 'text-emerald-400 border-emerald-500/40 bg-emerald-500/10',
    rejected: 'text-red-400 border-red-500/40 bg-red-500/10',
    halted: 'text-amber-400 border-amber-500/40 bg-amber-500/10',
    incomplete: 'text-gray-400 border-gray-500/40 bg-gray-500/10',
  }[result]

  const history = simConfig.history as unknown[]

  // ─── DFA ───────────────────────────────────────────────────────────────────
  function renderDFA() {
    const steps = history as DFAStep[]
    return (
      <table className="w-full text-xs font-mono border-collapse">
        <thead>
          <tr className="text-[9px] text-gray-500 uppercase tracking-wider border-b border-[#1e2028]">
            <Th>#</Th>
            <Th>State</Th>
            <Th>Remaining Input</Th>
            <Th>Symbol Read</Th>
            <Th>Next State</Th>
          </tr>
        </thead>
        <tbody>
          {steps.map((step, i) => (
            <tr key={i} className={rowClass(i)}>
              <Td dim>{i + 1}</Td>
              <Td>{stateLabel(step.state)}</Td>
              <Td>
                <InputStr value={step.input} />
              </Td>
              <Td>
                <Sym>{step.symbol}</Sym>
              </Td>
              <Td>{stateLabel(step.nextState)}</Td>
            </tr>
          ))}
        </tbody>
      </table>
    )
  }

  // ─── NFA ───────────────────────────────────────────────────────────────────
  function renderNFA() {
    const steps = history as NFAStep[]
    return (
      <table className="w-full text-xs font-mono border-collapse">
        <thead>
          <tr className="text-[9px] text-gray-500 uppercase tracking-wider border-b border-[#1e2028]">
            <Th>#</Th>
            <Th>Active States</Th>
            <Th>Remaining Input</Th>
            <Th>Symbol</Th>
            <Th>Next States</Th>
          </tr>
        </thead>
        <tbody>
          {steps.map((step, i) => (
            <tr key={i} className={rowClass(i)}>
              <Td dim>{i + 1}</Td>
              <Td>{statesLabel(step.states)}</Td>
              <Td>
                <InputStr value={step.input} />
              </Td>
              <Td>
                <Sym>{step.symbol}</Sym>
              </Td>
              <Td>{statesLabel(step.nextStates)}</Td>
            </tr>
          ))}
        </tbody>
      </table>
    )
  }

  // ─── PDA ───────────────────────────────────────────────────────────────────
  function renderPDA() {
    const steps = history as PDAStep[]
    return (
      <table className="w-full text-xs font-mono border-collapse">
        <thead>
          <tr className="text-[9px] text-gray-500 uppercase tracking-wider border-b border-[#1e2028]">
            <Th>#</Th>
            <Th>State</Th>
            <Th>Input</Th>
            <Th>Symbol</Th>
            <Th>Stack Top</Th>
            <Th>Stack Action</Th>
            <Th>Next State</Th>
          </tr>
        </thead>
        <tbody>
          {steps.map((step, i) => (
            <tr key={i} className={rowClass(i)}>
              <Td dim>{i + 1}</Td>
              <Td>{stateLabel(step.state)}</Td>
              <Td>
                <InputStr value={step.input} />
              </Td>
              <Td>
                <Sym>{step.symbol}</Sym>
              </Td>
              <Td>
                <Sym>{step.stackTop}</Sym>
              </Td>
              <Td>
                <span className="text-violet-300">{step.stackAction}</span>
              </Td>
              <Td>{stateLabel(step.nextState)}</Td>
            </tr>
          ))}
        </tbody>
      </table>
    )
  }

  // ─── TM ────────────────────────────────────────────────────────────────────
  function renderTM() {
    const steps = history as TMStep[]
    return (
      <table className="w-full text-xs font-mono border-collapse">
        <thead>
          <tr className="text-[9px] text-gray-500 uppercase tracking-wider border-b border-[#1e2028]">
            <Th>#</Th>
            <Th>State</Th>
            <Th>Read</Th>
            <Th>Write</Th>
            <Th>Direction</Th>
            <Th>Next State</Th>
          </tr>
        </thead>
        <tbody>
          {steps.map((step, i) => (
            <tr key={i} className={rowClass(i)}>
              <Td dim>{i + 1}</Td>
              <Td>{stateLabel(step.state)}</Td>
              <Td>
                <Sym>{step.read}</Sym>
              </Td>
              <Td>
                <span className="text-amber-300">{step.write}</span>
              </Td>
              <Td>
                <DirBadge dir={step.direction} />
              </Td>
              <Td>{stateLabel(step.nextState)}</Td>
            </tr>
          ))}
        </tbody>
      </table>
    )
  }

  // ─── Mealy ─────────────────────────────────────────────────────────────────
  function renderMealy() {
    const steps = history as MealyStep[]
    return (
      <table className="w-full text-xs font-mono border-collapse">
        <thead>
          <tr className="text-[9px] text-gray-500 uppercase tracking-wider border-b border-[#1e2028]">
            <Th>#</Th>
            <Th>State</Th>
            <Th>Input</Th>
            <Th>Symbol</Th>
            <Th>Output</Th>
            <Th>Next State</Th>
          </tr>
        </thead>
        <tbody>
          {steps.map((step, i) => (
            <tr key={i} className={rowClass(i)}>
              <Td dim>{i + 1}</Td>
              <Td>{stateLabel(step.state)}</Td>
              <Td>
                <InputStr value={step.input} />
              </Td>
              <Td>
                <Sym>{step.symbol}</Sym>
              </Td>
              <Td>
                <span className="text-amber-300">{step.output || 'ε'}</span>
              </Td>
              <Td>{stateLabel(step.nextState)}</Td>
            </tr>
          ))}
        </tbody>
      </table>
    )
  }

  // ─── Moore ─────────────────────────────────────────────────────────────────
  function renderMoore() {
    const steps = history as MooreStep[]
    return (
      <table className="w-full text-xs font-mono border-collapse">
        <thead>
          <tr className="text-[9px] text-gray-500 uppercase tracking-wider border-b border-[#1e2028]">
            <Th>#</Th>
            <Th>State</Th>
            <Th>Input</Th>
            <Th>Symbol</Th>
            <Th>State Output</Th>
            <Th>Next State</Th>
          </tr>
        </thead>
        <tbody>
          {steps.map((step, i) => (
            <tr key={i} className={rowClass(i)}>
              <Td dim>{i + 1}</Td>
              <Td>{stateLabel(step.state)}</Td>
              <Td>
                <InputStr value={step.input} />
              </Td>
              <Td>
                <Sym>{step.symbol}</Sym>
              </Td>
              <Td>
                <span className="text-amber-300">{step.stateOutput || 'ε'}</span>
              </Td>
              <Td>{stateLabel(step.nextState)}</Td>
            </tr>
          ))}
        </tbody>
      </table>
    )
  }

  // ─── MultiTM ───────────────────────────────────────────────────────────────
  function renderMultiTM() {
    const steps = history as MultiTMStep[]
    return (
      <table className="w-full text-xs font-mono border-collapse">
        <thead>
          <tr className="text-[9px] text-gray-500 uppercase tracking-wider border-b border-[#1e2028]">
            <Th>#</Th>
            <Th>State</Th>
            <Th>Reads</Th>
            <Th>Writes</Th>
            <Th>Directions</Th>
            <Th>Next State</Th>
          </tr>
        </thead>
        <tbody>
          {steps.map((step, i) => (
            <tr key={i} className={rowClass(i)}>
              <Td dim>{i + 1}</Td>
              <Td>{stateLabel(step.state)}</Td>
              <Td>
                <span className="text-cyan-300">{step.reads.join(', ')}</span>
              </Td>
              <Td>
                <span className="text-amber-300">{step.writes.join(', ')}</span>
              </Td>
              <Td>
                <span className="flex gap-1">
                  {step.directions.map((d, di) => (
                    <DirBadge key={di} dir={d} />
                  ))}
                </span>
              </Td>
              <Td>{stateLabel(step.nextState)}</Td>
            </tr>
          ))}
        </tbody>
      </table>
    )
  }

  function renderTable() {
    switch (graph.type) {
      case 'DFA':
        return renderDFA()
      case 'NFA':
        return renderNFA()
      case 'PDA':
        return renderPDA()
      case 'TM':
        return renderTM()
      case 'Mealy':
        return renderMealy()
      case 'Moore':
        return renderMoore()
      case 'MultiTM':
        return renderMultiTM()
      default:
        return (
          <p className="text-gray-500 font-mono text-xs p-4">
            No trace available for {graph.type}.
          </p>
        )
    }
  }

  // Reconstruct the full input from the first history step if available
  let fullInput = ''
  if (history.length > 0) {
    const first = history[0] as { input?: string; states?: string[] }
    if (typeof first.input === 'string') {
      // DFA/NFA/PDA/Mealy/Moore: first step has full input remaining
      const consumed =
        graph.type === 'NFA'
          ? (history[0] as NFAStep).symbol
          : (history[0] as DFAStep).symbol
      fullInput = consumed + (first.input ?? '')
      // Better: just use the first step's input as it's the original remaining
      // Actually for DFA the first step has remaining=full input before consuming
      fullInput = first.input ?? ''
      // The very first recorded history has the full input
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
      <div
        className="bg-[#111214] border border-[#2d3748] rounded-xl shadow-2xl flex flex-col overflow-hidden"
        style={{ width: 760, maxHeight: '85vh' }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-[#1e2028]">
          <div className="flex items-center gap-3">
            <span className="text-[10px] font-mono text-cyan-400 uppercase tracking-widest">
              Execution Trace
            </span>
            <span className="text-[10px] font-mono text-gray-600">
              {graph.type} · {graph.name}
            </span>
            {fullInput !== '' && (
              <span className="text-[10px] font-mono text-gray-500">
                input:{' '}
                <span className="text-white">
                  &ldquo;{fullInput}&rdquo;
                </span>
              </span>
            )}
          </div>
          <div className="flex items-center gap-3">
            <span
              className={`px-2.5 py-0.5 rounded text-[10px] font-mono font-bold tracking-widest border ${resultColor}`}
            >
              {result === 'accepted' && '✓ ACCEPTED'}
              {result === 'rejected' && '✗ REJECTED'}
              {result === 'halted' && '⊣ HALTED'}
              {result === 'incomplete' && '… IN PROGRESS'}
            </span>
            <span className="text-[10px] font-mono text-gray-500">
              {history.length} step{history.length !== 1 ? 's' : ''}
            </span>
            <button
              onClick={onClose}
              className="text-gray-500 hover:text-white transition-colors text-lg leading-none ml-2"
            >
              ×
            </button>
          </div>
        </div>

        {/* Output row for Mealy/Moore */}
        {(graph.type === 'Mealy' || graph.type === 'Moore') && (
          <div className="px-5 py-2 border-b border-[#1e2028] flex items-center gap-2">
            <span className="text-[9px] font-mono text-gray-500 uppercase tracking-wider">
              Final Output:
            </span>
            <span className="text-sm font-mono text-amber-300">
              {(simConfig as MealyConfig | MooreConfig).output || 'ε'}
            </span>
          </div>
        )}

        {/* Table */}
        <div className="flex-1 overflow-auto">
          {history.length === 0 ? (
            <div className="flex items-center justify-center h-32 text-gray-600 font-mono text-xs">
              No steps recorded yet.
            </div>
          ) : (
            <div className="overflow-x-auto">{renderTable()}</div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-2 border-t border-[#1e2028] flex items-center justify-between">
          <span className="text-[9px] font-mono text-gray-600">
            {history.length} transition{history.length !== 1 ? 's' : ''} recorded
          </span>
          <button
            onClick={onClose}
            className="px-3 py-1 rounded text-xs font-mono bg-[#1a1b1e] text-gray-300 hover:bg-[#22232a] hover:text-white border border-[#2d3748] transition-all"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Small helpers ────────────────────────────────────────────────────────────

function rowClass(i: number) {
  return `border-b border-[#1a1b1e] transition-colors ${
    i % 2 === 0 ? 'bg-[#0e0f11]/60' : 'bg-transparent'
  } hover:bg-cyan-500/5`
}

function Th({ children }: { children: React.ReactNode }) {
  return (
    <th className="text-left px-3 py-2 text-[9px] font-mono text-gray-500 uppercase tracking-wider whitespace-nowrap">
      {children}
    </th>
  )
}

function Td({
  children,
  dim,
}: {
  children: React.ReactNode
  dim?: boolean
}) {
  return (
    <td
      className={`px-3 py-1.5 text-xs font-mono whitespace-nowrap ${dim ? 'text-gray-600' : 'text-gray-300'}`}
    >
      {children}
    </td>
  )
}

function Sym({ children }: { children: React.ReactNode }) {
  return (
    <span className="text-cyan-300 bg-cyan-400/10 px-1 rounded text-[11px]">
      {children}
    </span>
  )
}

function InputStr({ value }: { value: string }) {
  if (!value) return <span className="text-gray-600 italic">ε</span>
  return (
    <span>
      <span className="text-emerald-300 font-bold">{value[0]}</span>
      <span className="text-gray-500">{value.slice(1)}</span>
    </span>
  )
}

function DirBadge({ dir }: { dir: 'L' | 'R' | 'S' }) {
  const color =
    dir === 'R'
      ? 'text-cyan-300 bg-cyan-400/10'
      : dir === 'L'
        ? 'text-violet-300 bg-violet-400/10'
        : 'text-gray-400 bg-gray-400/10'
  return (
    <span className={`px-1.5 py-0.5 rounded text-[10px] font-mono ${color}`}>
      {dir}
    </span>
  )
}
