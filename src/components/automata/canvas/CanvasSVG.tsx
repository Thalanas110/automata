import type React from 'react'
import type { AutomataGraph, EditorState, State, Transition } from '@/lib/automata/types'
import {
  STATE_RADIUS,
  ACCEPT_RING_OFFSET,
  STATE_HIT_PADDING,
  TRANSITION_COLORS,
  CLICK_TARGET_PADDING,
} from '../constants/canvas'
import { getTransitionPath, getStateColor } from './canvasGeometry'
import type { TransitionLabelEdit, ViewBox } from './useCanvasInteraction'

interface CanvasSVGProps {
  svgRef: React.RefObject<SVGSVGElement | null>
  graph: AutomataGraph
  editorState: EditorState
  activeStateIds: string[]
  acceptedStateIds: string[]
  rejectedStateIds: string[]
  hoveredStateId: string | null
  viewBox: ViewBox
  isPanning: boolean
  labelEdit: TransitionLabelEdit | null
  onSVGMouseDown: (e: React.MouseEvent<SVGSVGElement>) => void
  onSVGClick: (e: React.MouseEvent<SVGSVGElement>) => void
  onMouseMove: (e: React.MouseEvent<SVGSVGElement>) => void
  onMouseUp: () => void
  onWheel: (e: React.WheelEvent<SVGSVGElement>) => void
  onTouchStart: (e: React.TouchEvent<SVGSVGElement>) => void
  onTouchMove: (e: React.TouchEvent<SVGSVGElement>) => void
  onTouchEnd: (e: React.TouchEvent<SVGSVGElement>) => void
  onTransitionClick: (e: React.MouseEvent, t: Transition) => void
  onStateMouseDown: (e: React.MouseEvent, state: State) => void
  onStateDoubleClick: (e: React.MouseEvent, state: State) => void
  onStateHoverEnter: (id: string) => void
  onStateHoverLeave: () => void
  onLabelEditChange: React.Dispatch<React.SetStateAction<TransitionLabelEdit | null>>
  onLabelEditCommit: () => void
  onLabelEditCancel: () => void
}

export function CanvasSVG({
  svgRef,
  graph,
  editorState,
  activeStateIds,
  acceptedStateIds,
  rejectedStateIds,
  hoveredStateId,
  viewBox,
  isPanning,
  labelEdit,
  onSVGMouseDown,
  onSVGClick,
  onMouseMove,
  onMouseUp,
  onWheel,
  onTouchStart,
  onTouchMove,
  onTouchEnd,
  onTransitionClick,
  onStateMouseDown,
  onStateDoubleClick,
  onStateHoverEnter,
  onStateHoverLeave,
  onLabelEditChange,
  onLabelEditCommit,
  onLabelEditCancel,
}: CanvasSVGProps) {
  const cursor =
    editorState.tool === 'addState'
      ? 'crosshair'
      : isPanning
        ? 'grabbing'
        : editorState.tool === 'pan'
          ? 'grab'
          : editorState.tool === 'delete'
            ? 'not-allowed'
            : 'default'

  return (
    <svg
      ref={svgRef}
      className="absolute inset-0 w-full h-full"
      viewBox={`${viewBox.x} ${viewBox.y} ${viewBox.w} ${viewBox.h}`}
      onMouseDown={onSVGMouseDown}
      onClick={onSVGClick}
      onMouseMove={onMouseMove}
      onMouseUp={onMouseUp}
      onMouseLeave={onMouseUp}
      onWheel={onWheel}
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
      style={{ touchAction: 'none', cursor }}
    >
      <defs>
        <marker id="arrowhead" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
          <polygon points="0 0, 10 3.5, 0 7" fill="#6b7280" />
        </marker>
        <marker id="arrowhead-active" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
          <polygon points="0 0, 10 3.5, 0 7" fill="#00d4ff" />
        </marker>
        <marker id="arrowhead-selected" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
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
        x={viewBox.x - CLICK_TARGET_PADDING}
        y={viewBox.y - CLICK_TARGET_PADDING}
        width={viewBox.w + CLICK_TARGET_PADDING * 2}
        height={viewBox.h + CLICK_TARGET_PADDING * 2}
        fill="transparent"
      />

      {/* Transition edges */}
      {graph.transitions.map((t) => {
        const path = getTransitionPath(t, graph)
        if (!path) return null
        const isSelected = editorState.selectedTransitionId === t.id
        const stroke = isSelected ? TRANSITION_COLORS.selected : TRANSITION_COLORS.default
        const marker = isSelected ? 'url(#arrowhead-selected)' : 'url(#arrowhead)'
        return (
          <g key={t.id} style={{ cursor: 'pointer' }}>
            {/* Invisible wider hit area */}
            <path
              d={path.d}
              fill="none"
              stroke="transparent"
              strokeWidth={16}
              onClick={(e) => onTransitionClick(e, t)}
            />
            <path
              d={path.d}
              fill="none"
              stroke={stroke}
              strokeWidth={isSelected ? 2 : 1.5}
              markerEnd={marker}
              filter={isSelected ? 'url(#glow)' : undefined}
              onClick={(e) => onTransitionClick(e, t)}
            />
            {/* Label */}
            {labelEdit?.transitionId === t.id ? (
              <foreignObject x={path.labelX - 40} y={path.labelY - 12} width={80} height={24}>
                <input
                  autoFocus
                  value={labelEdit.tempLabel}
                  onChange={(e) => onLabelEditChange({ ...labelEdit, tempLabel: e.target.value })}
                  onBlur={onLabelEditCommit}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') onLabelEditCommit()
                    if (e.key === 'Escape') onLabelEditCancel()
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
                fill={isSelected ? TRANSITION_COLORS.labelSelected : TRANSITION_COLORS.label}
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
        const colors = getStateColor(
          state,
          editorState,
          activeStateIds,
          acceptedStateIds,
          rejectedStateIds,
          hoveredStateId,
        )
        const isActive =
          activeStateIds.includes(state.id) ||
          acceptedStateIds.includes(state.id) ||
          rejectedStateIds.includes(state.id)
        return (
          <g
            key={state.id}
            transform={`translate(${state.x}, ${state.y})`}
            style={{ cursor: editorState.tool === 'select' ? 'move' : 'pointer' }}
            onMouseDown={(e) => onStateMouseDown(e, state)}
            onDoubleClick={(e) => onStateDoubleClick(e, state)}
            onMouseEnter={() => onStateHoverEnter(state.id)}
            onMouseLeave={onStateHoverLeave}
          >
            {/* Glow effect for active states */}
            {isActive && (
              <circle
                r={STATE_RADIUS + STATE_HIT_PADDING}
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
              strokeWidth={editorState.selectedStateId === state.id ? 2.5 : 1.5}
              filter={isActive ? 'url(#glow)' : undefined}
            />

            {/* Start arrow */}
            {state.isStart && (
              <g transform={`translate(${-STATE_RADIUS - 28}, 0)`}>
                <line x1={-12} y1={0} x2={0} y2={0} stroke={colors.stroke} strokeWidth={1.5} />
                <polygon points="-2,-4 8,0 -2,4" fill={colors.stroke} transform="translate(0,0)" />
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
          const src = graph.states.find((s) => s.id === editorState.transitionSource)
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
  )
}
