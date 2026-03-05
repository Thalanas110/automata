import React, { useRef, useState, useCallback } from 'react'
import type {
  AutomataGraph,
  State,
  Transition,
  EditorState,
} from '@/lib/automata/types'

interface CanvasProps {
  graph: AutomataGraph
  editorState: EditorState
  activeStateIds: string[]
  acceptedStateIds: string[]
  rejectedStateIds: string[]
  onGraphChange: (graph: AutomataGraph) => void
  onEditorStateChange: (state: EditorState) => void
}

const STATE_RADIUS = 28
const ACCEPT_RING_OFFSET = 6

interface DragState {
  stateId: string
  offsetX: number
  offsetY: number
}

interface TransitionLabelEdit {
  transitionId: string | null
  tempLabel: string
  isNew: boolean
  from?: string
  to?: string
}

export function AutomataCanvas({
  graph,
  editorState,
  activeStateIds,
  acceptedStateIds,
  rejectedStateIds,
  onGraphChange,
  onEditorStateChange,
}: CanvasProps) {
  const svgRef = useRef<SVGSVGElement>(null)
  const [drag, setDrag] = useState<DragState | null>(null)
  const [labelEdit, setLabelEdit] = useState<TransitionLabelEdit | null>(null)
  const [hoveredStateId, setHoveredStateId] = useState<string | null>(null)
  const [viewBox, setViewBox] = useState({ x: 0, y: 0, w: 900, h: 560 })
  const [isPanning, setIsPanning] = useState(false)
  const panStart = useRef<{
    mx: number
    my: number
    vx: number
    vy: number
  } | null>(null)

  // SVG coordinate helper
  const toSVGCoords = useCallback(
    (e: React.MouseEvent) => {
      const svg = svgRef.current
      if (!svg) return { x: 0, y: 0 }
      const rect = svg.getBoundingClientRect()
      const scaleX = viewBox.w / rect.width
      const scaleY = viewBox.h / rect.height
      return {
        x: (e.clientX - rect.left) * scaleX + viewBox.x,
        y: (e.clientY - rect.top) * scaleY + viewBox.y,
      }
    },
    [viewBox],
  )

  const handleSVGMouseDown = useCallback(
    (e: React.MouseEvent<SVGSVGElement>) => {
      if (
        e.target === svgRef.current ||
        (e.target as Element).tagName === 'rect'
      ) {
        if (editorState.tool === 'addState') return
        if (e.button === 1 || (e.button === 0 && e.altKey)) {
          setIsPanning(true)
          panStart.current = {
            mx: e.clientX,
            my: e.clientY,
            vx: viewBox.x,
            vy: viewBox.y,
          }
          e.preventDefault()
          return
        }
        onEditorStateChange({
          ...editorState,
          selectedStateId: null,
          selectedTransitionId: null,
          transitionSource: null,
        })
      }
    },
    [editorState, onEditorStateChange, viewBox],
  )

  const handleSVGClick = useCallback(
    (e: React.MouseEvent<SVGSVGElement>) => {
      if (drag) return
      if (
        e.target !== svgRef.current &&
        (e.target as Element).tagName !== 'rect'
      )
        return
      if (editorState.tool !== 'addState') return

      const coords = toSVGCoords(e)
      const newState: State = {
        id: crypto.randomUUID(),
        label: `q${graph.states.length}`,
        x: coords.x,
        y: coords.y,
        isStart: graph.states.length === 0,
        isAccept: false,
      }
      onGraphChange({ ...graph, states: [...graph.states, newState] })
    },
    [drag, editorState.tool, graph, onGraphChange, toSVGCoords],
  )

  const handleStateMouseDown = useCallback(
    (e: React.MouseEvent, state: State) => {
      e.stopPropagation()
      if (editorState.tool === 'delete') {
        const newStates = graph.states.filter((s) => s.id !== state.id)
        const newTransitions = graph.transitions.filter(
          (t) => t.from !== state.id && t.to !== state.id,
        )
        onGraphChange({
          ...graph,
          states: newStates,
          transitions: newTransitions,
        })
        return
      }
      if (editorState.tool === 'addTransition') {
        if (!editorState.transitionSource) {
          onEditorStateChange({ ...editorState, transitionSource: state.id })
        } else {
          const from = editorState.transitionSource
          const to = state.id
          setLabelEdit({
            transitionId: null,
            tempLabel: '',
            isNew: true,
            from,
            to,
          })
          onEditorStateChange({ ...editorState, transitionSource: null })
        }
        return
      }
      if (editorState.tool === 'select') {
        onEditorStateChange({
          ...editorState,
          selectedStateId: state.id,
          selectedTransitionId: null,
        })
        const coords = toSVGCoords(e)
        setDrag({
          stateId: state.id,
          offsetX: coords.x - state.x,
          offsetY: coords.y - state.y,
        })
      }
    },
    [editorState, graph, onEditorStateChange, onGraphChange, toSVGCoords],
  )

  const handleMouseMove = useCallback(
    (e: React.MouseEvent<SVGSVGElement>) => {
      if (isPanning && panStart.current) {
        const svg = svgRef.current
        if (!svg) return
        const rect = svg.getBoundingClientRect()
        const scaleX = viewBox.w / rect.width
        const scaleY = viewBox.h / rect.height
        const dx = (e.clientX - panStart.current.mx) * scaleX
        const dy = (e.clientY - panStart.current.my) * scaleY
        setViewBox((v) => ({
          ...v,
          x: panStart.current!.vx - dx,
          y: panStart.current!.vy - dy,
        }))
        return
      }
      if (!drag) return
      const coords = toSVGCoords(e)
      const newX = coords.x - drag.offsetX
      const newY = coords.y - drag.offsetY
      onGraphChange({
        ...graph,
        states: graph.states.map((s) =>
          s.id === drag.stateId ? { ...s, x: newX, y: newY } : s,
        ),
      })
    },
    [drag, graph, isPanning, onGraphChange, toSVGCoords, viewBox.w, viewBox.h],
  )

  const handleMouseUp = useCallback(() => {
    setDrag(null)
    setIsPanning(false)
    panStart.current = null
  }, [])

  const handleWheel = useCallback((e: React.WheelEvent<SVGSVGElement>) => {
    e.preventDefault()
    const scale = e.deltaY > 0 ? 1.1 : 0.9
    setViewBox((v) => {
      const newW = Math.max(300, Math.min(3000, v.w * scale))
      const newH = Math.max(200, Math.min(2000, v.h * scale))
      return { ...v, w: newW, h: newH }
    })
  }, [])

  const handleTransitionClick = useCallback(
    (e: React.MouseEvent, t: Transition) => {
      e.stopPropagation()
      if (editorState.tool === 'delete') {
        onGraphChange({
          ...graph,
          transitions: graph.transitions.filter((tr) => tr.id !== t.id),
        })
        return
      }
      onEditorStateChange({
        ...editorState,
        selectedTransitionId: t.id,
        selectedStateId: null,
      })
    },
    [editorState, graph, onEditorStateChange, onGraphChange],
  )

  const handleStateDoubleClick = useCallback(
    (e: React.MouseEvent, state: State) => {
      e.stopPropagation()
      if (editorState.tool !== 'select') return
      const newLabel = prompt('State label:', state.label)
      if (newLabel === null) return
      onGraphChange({
        ...graph,
        states: graph.states.map((s) =>
          s.id === state.id ? { ...s, label: newLabel } : s,
        ),
      })
    },
    [editorState.tool, graph, onGraphChange],
  )

  const commitLabelEdit = useCallback(() => {
    if (!labelEdit) return
    if (labelEdit.isNew && labelEdit.from && labelEdit.to) {
      const newT: Transition = {
        id: crypto.randomUUID(),
        from: labelEdit.from,
        to: labelEdit.to,
        label: labelEdit.tempLabel || 'ε',
      }
      onGraphChange({ ...graph, transitions: [...graph.transitions, newT] })
    } else if (labelEdit.transitionId) {
      onGraphChange({
        ...graph,
        transitions: graph.transitions.map((t) =>
          t.id === labelEdit.transitionId
            ? { ...t, label: labelEdit.tempLabel }
            : t,
        ),
      })
    }
    setLabelEdit(null)
  }, [graph, labelEdit, onGraphChange])

  // Build transition path data
  function getTransitionPath(t: Transition) {
    const from = graph.states.find((s) => s.id === t.from)
    const to = graph.states.find((s) => s.id === t.to)
    if (!from || !to) return null

    // Self-loop
    if (t.from === t.to) {
      const cx = from.x
      const cy = from.y - STATE_RADIUS - 30
      const r = 24
      return {
        d: `M ${from.x - r * 0.8} ${from.y - STATE_RADIUS}
           C ${from.x - r * 2} ${from.y - STATE_RADIUS - 70}
             ${from.x + r * 2} ${from.y - STATE_RADIUS - 70}
             ${from.x + r * 0.8} ${from.y - STATE_RADIUS}`,
        labelX: cx,
        labelY: cy - 10,
        isSelfLoop: true,
      }
    }

    // Check for parallel transitions
    const reverse = graph.transitions.find(
      (other) =>
        other.from === t.to && other.to === t.from && other.id !== t.id,
    )

    const dx = to.x - from.x
    const dy = to.y - from.y
    const len = Math.sqrt(dx * dx + dy * dy)
    if (len === 0) return null

    const ux = dx / len
    const uy = dy / len
    const nx = -uy
    const ny = ux

    const startX = from.x + ux * STATE_RADIUS
    const startY = from.y + uy * STATE_RADIUS
    const endX = to.x - ux * STATE_RADIUS
    const endY = to.y - uy * STATE_RADIUS

    if (reverse) {
      const offset = 30
      const cx1 = startX + nx * offset
      const cy1 = startY + ny * offset
      const cx2 = endX + nx * offset
      const cy2 = endY + ny * offset
      return {
        d: `M ${startX} ${startY} C ${cx1} ${cy1} ${cx2} ${cy2} ${endX} ${endY}`,
        labelX: (startX + endX) / 2 + nx * (offset + 12),
        labelY: (startY + endY) / 2 + ny * (offset + 12),
        isSelfLoop: false,
      }
    }

    return {
      d: `M ${startX} ${startY} L ${endX} ${endY}`,
      labelX: (startX + endX) / 2 + nx * 14,
      labelY: (startY + endY) / 2 + ny * 14,
      isSelfLoop: false,
    }
  }

  function getStateColor(state: State) {
    if (acceptedStateIds.includes(state.id))
      return { fill: '#00e676', stroke: '#00e676', text: '#000' }
    if (rejectedStateIds.includes(state.id))
      return { fill: '#ff1744', stroke: '#ff1744', text: '#fff' }
    if (activeStateIds.includes(state.id))
      return { fill: '#00d4ff', stroke: '#00d4ff', text: '#000' }
    if (editorState.selectedStateId === state.id)
      return { fill: '#1e2430', stroke: '#00d4ff', text: '#00d4ff' }
    if (editorState.transitionSource === state.id)
      return { fill: '#1e2430', stroke: '#ffb347', text: '#ffb347' }
    if (hoveredStateId === state.id)
      return { fill: '#1e2430', stroke: '#6b7280', text: '#e5e7eb' }
    return { fill: '#141519', stroke: '#374151', text: '#d1d5db' }
  }

  return (
    <div className="relative w-full h-full overflow-hidden bg-[#0a0b0d]">
      {/* Grid background */}
      <svg
        className="absolute inset-0 opacity-20 pointer-events-none"
        width="100%"
        height="100%"
      >
        <defs>
          <pattern
            id="grid"
            width="40"
            height="40"
            patternUnits="userSpaceOnUse"
          >
            <path
              d="M 40 0 L 0 0 0 40"
              fill="none"
              stroke="#374151"
              strokeWidth="0.5"
            />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#grid)" />
      </svg>

      {/* Main SVG */}
      <svg
        ref={svgRef}
        className="absolute inset-0 w-full h-full"
        viewBox={`${viewBox.x} ${viewBox.y} ${viewBox.w} ${viewBox.h}`}
        onMouseDown={handleSVGMouseDown}
        onClick={handleSVGClick}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onWheel={handleWheel}
        style={{
          cursor:
            editorState.tool === 'addState'
              ? 'crosshair'
              : isPanning
                ? 'grabbing'
                : 'default',
        }}
      >
        <defs>
          <marker
            id="arrowhead"
            markerWidth="10"
            markerHeight="7"
            refX="9"
            refY="3.5"
            orient="auto"
          >
            <polygon points="0 0, 10 3.5, 0 7" fill="#6b7280" />
          </marker>
          <marker
            id="arrowhead-active"
            markerWidth="10"
            markerHeight="7"
            refX="9"
            refY="3.5"
            orient="auto"
          >
            <polygon points="0 0, 10 3.5, 0 7" fill="#00d4ff" />
          </marker>
          <marker
            id="arrowhead-selected"
            markerWidth="10"
            markerHeight="7"
            refX="9"
            refY="3.5"
            orient="auto"
          >
            <polygon points="0 0, 10 3.5, 0 7" fill="#ffb347" />
          </marker>
          <filter id="glow">
            <feGaussianBlur stdDeviation="3" result="coloredBlur" />
            <feMerge>
              <feMergeNode in="coloredBlur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          <filter id="glow-strong">
            <feGaussianBlur stdDeviation="6" result="coloredBlur" />
            <feMerge>
              <feMergeNode in="coloredBlur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* Transparent bg for click target */}
        <rect
          x={viewBox.x - 1000}
          y={viewBox.y - 1000}
          width={viewBox.w + 2000}
          height={viewBox.h + 2000}
          fill="transparent"
        />

        {/* Transition edges */}
        {graph.transitions.map((t) => {
          const path = getTransitionPath(t)
          if (!path) return null
          const isSelected = editorState.selectedTransitionId === t.id
          const stroke = isSelected ? '#ffb347' : '#4b5563'
          const marker = isSelected
            ? 'url(#arrowhead-selected)'
            : 'url(#arrowhead)'
          return (
            <g key={t.id} style={{ cursor: 'pointer' }}>
              {/* Invisible wider hit area */}
              <path
                d={path.d}
                fill="none"
                stroke="transparent"
                strokeWidth={16}
                onClick={(e) => handleTransitionClick(e, t)}
              />
              <path
                d={path.d}
                fill="none"
                stroke={stroke}
                strokeWidth={isSelected ? 2 : 1.5}
                markerEnd={marker}
                filter={isSelected ? 'url(#glow)' : undefined}
                onClick={(e) => handleTransitionClick(e, t)}
              />
              {/* Label */}
              {labelEdit?.transitionId === t.id ? (
                <foreignObject
                  x={path.labelX - 40}
                  y={path.labelY - 12}
                  width={80}
                  height={24}
                >
                  <input
                    autoFocus
                    value={labelEdit.tempLabel}
                    onChange={(e) =>
                      setLabelEdit({ ...labelEdit, tempLabel: e.target.value })
                    }
                    onBlur={commitLabelEdit}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') commitLabelEdit()
                      if (e.key === 'Escape') setLabelEdit(null)
                    }}
                    className="w-full text-center text-xs bg-[#1a1b1e] text-cyan-300 border border-cyan-500 rounded px-1 outline-none"
                  />
                </foreignObject>
              ) : (
                <text
                  x={path.labelX}
                  y={path.labelY}
                  textAnchor="middle"
                  dominantBaseline="middle"
                  fontSize={11}
                  fill={isSelected ? '#ffb347' : '#9ca3af'}
                  fontFamily="'IBM Plex Mono', monospace"
                  className="select-none pointer-events-none"
                >
                  {t.label}
                </text>
              )}
            </g>
          )
        })}

        {/* States */}
        {graph.states.map((state) => {
          const colors = getStateColor(state)
          const isActive =
            activeStateIds.includes(state.id) ||
            acceptedStateIds.includes(state.id) ||
            rejectedStateIds.includes(state.id)
          return (
            <g
              key={state.id}
              transform={`translate(${state.x}, ${state.y})`}
              style={{
                cursor: editorState.tool === 'select' ? 'move' : 'pointer',
              }}
              onMouseDown={(e) => handleStateMouseDown(e, state)}
              onDoubleClick={(e) => handleStateDoubleClick(e, state)}
              onMouseEnter={() => setHoveredStateId(state.id)}
              onMouseLeave={() => setHoveredStateId(null)}
            >
              {/* Glow effect for active states */}
              {isActive && (
                <circle
                  r={STATE_RADIUS + 8}
                  fill={colors.stroke}
                  opacity={0.15}
                  filter="url(#glow-strong)"
                />
              )}

              {/* Accept state double ring */}
              {state.isAccept && (
                <circle
                  r={STATE_RADIUS + ACCEPT_RING_OFFSET}
                  fill="none"
                  stroke={colors.stroke}
                  strokeWidth={1.5}
                  opacity={0.8}
                />
              )}

              {/* Main circle */}
              <circle
                r={STATE_RADIUS}
                fill={colors.fill}
                stroke={colors.stroke}
                strokeWidth={
                  editorState.selectedStateId === state.id ? 2.5 : 1.5
                }
                filter={isActive ? 'url(#glow)' : undefined}
              />

              {/* Start arrow */}
              {state.isStart && (
                <g transform={`translate(${-STATE_RADIUS - 28}, 0)`}>
                  <line
                    x1={-12}
                    y1={0}
                    x2={0}
                    y2={0}
                    stroke={colors.stroke}
                    strokeWidth={1.5}
                  />
                  <polygon
                    points="-2,-4 8,0 -2,4"
                    fill={colors.stroke}
                    transform="translate(0,0)"
                  />
                </g>
              )}

              {/* Label */}
              <text
                textAnchor="middle"
                dominantBaseline="middle"
                fontSize={12}
                fontWeight="600"
                fill={colors.text}
                fontFamily="'IBM Plex Mono', monospace"
                className="select-none pointer-events-none"
              >
                {state.label}
              </text>
            </g>
          )
        })}

        {/* Transition source indicator */}
        {editorState.transitionSource &&
          (() => {
            const src = graph.states.find(
              (s) => s.id === editorState.transitionSource,
            )
            if (!src) return null
            return (
              <circle
                cx={src.x}
                cy={src.y}
                r={STATE_RADIUS + 10}
                fill="none"
                stroke="#ffb347"
                strokeWidth={2}
                strokeDasharray="4 3"
                opacity={0.7}
              >
                <animate
                  attributeName="stroke-dashoffset"
                  from="0"
                  to="-28"
                  dur="1s"
                  repeatCount="indefinite"
                />
              </circle>
            )
          })()}
      </svg>

      {/* Label edit overlay for new transitions */}
      {labelEdit?.isNew && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="pointer-events-auto bg-[#1a1b1e] border border-cyan-500/50 rounded-lg p-4 shadow-2xl">
            <p className="text-xs text-gray-400 mb-2 font-mono">
              {graph.type === 'PDA'
                ? 'Transition label (input,pop/push):'
                : graph.type === 'TM'
                  ? 'Transition label (read/write,dir):'
                  : 'Transition symbol:'}
            </p>
            <input
              autoFocus
              value={labelEdit.tempLabel}
              placeholder={
                graph.type === 'PDA'
                  ? 'a,A/BA'
                  : graph.type === 'TM'
                    ? 'a/b,R'
                    : 'a'
              }
              onChange={(e) =>
                setLabelEdit({ ...labelEdit, tempLabel: e.target.value })
              }
              onBlur={commitLabelEdit}
              onKeyDown={(e) => {
                if (e.key === 'Enter') commitLabelEdit()
                if (e.key === 'Escape') setLabelEdit(null)
              }}
              className="w-48 text-center text-sm bg-[#0e0f11] text-cyan-300 border border-cyan-500 rounded px-3 py-1.5 outline-none font-mono"
            />
          </div>
        </div>
      )}

      {/* Zoom controls */}
      <div className="absolute bottom-4 right-4 flex flex-col gap-1">
        <button
          onClick={() =>
            setViewBox((v) => ({ ...v, w: v.w * 0.85, h: v.h * 0.85 }))
          }
          className="w-8 h-8 bg-[#1a1b1e] border border-[#2d3748] text-gray-400 hover:text-white text-lg flex items-center justify-center rounded"
        >
          +
        </button>
        <button
          onClick={() =>
            setViewBox((v) => ({ ...v, w: v.w * 1.15, h: v.h * 1.15 }))
          }
          className="w-8 h-8 bg-[#1a1b1e] border border-[#2d3748] text-gray-400 hover:text-white text-lg flex items-center justify-center rounded"
        >
          −
        </button>
        <button
          onClick={() => setViewBox({ x: 0, y: 0, w: 900, h: 560 })}
          className="w-8 h-8 bg-[#1a1b1e] border border-[#2d3748] text-gray-400 hover:text-white text-xs flex items-center justify-center rounded font-mono"
        >
          ↺
        </button>
      </div>

      {/* Hint */}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 text-xs text-gray-600 font-mono pointer-events-none">
        {editorState.tool === 'addState' && 'Click to place state'}
        {editorState.tool === 'addTransition' &&
          !editorState.transitionSource &&
          'Click source state'}
        {editorState.tool === 'addTransition' &&
          editorState.transitionSource &&
          'Click target state'}
        {editorState.tool === 'delete' && 'Click state or transition to delete'}
      </div>
    </div>
  )
}
