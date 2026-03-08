import type { AutomataGraph, EditorState, State, Transition } from '@/lib/automata/types'
import {
  STATE_RADIUS,
  SELF_LOOP_ANGLE_SEPARATION,
  SELF_LOOP_CONTROL_DISTANCE,
  SELF_LOOP_LABEL_DISTANCE,
  SELF_LOOP_RADIUS,
  BIDIRECTIONAL_BASE_OFFSET,
  TRANSITION_SPREAD,
  STRAIGHT_LABEL_OFFSET,
  TRANSITION_LABEL_OFFSET,
  ACCEPTED_STATE_COLORS,
  REJECTED_STATE_COLORS,
  ACTIVE_STATE_COLORS,
  SELECTED_STATE_COLORS,
  TRANSITION_SOURCE_COLORS,
  HOVERED_STATE_COLORS,
  DEFAULT_STATE_COLORS,
} from '../constants/canvas'

export interface TransitionPath {
  d: string
  labelX: number
  labelY: number
  isSelfLoop: boolean
}

export function getTransitionPath(
  t: Transition,
  graph: AutomataGraph,
): TransitionPath | null {
  const from = graph.states.find((s) => s.id === t.from)
  const to = graph.states.find((s) => s.id === t.to)
  if (!from || !to) return null

  // Self-loop
  if (t.from === t.to) {
    const selfLoops = graph.transitions.filter(
      (other) => other.from === t.from && other.to === t.from,
    )
    const index = selfLoops.findIndex((other) => other.id === t.id)
    const n = selfLoops.length
    const angle = -Math.PI / 2 + (index - (n - 1) / 2) * SELF_LOOP_ANGLE_SEPARATION
    const outX = Math.cos(angle)
    const outY = Math.sin(angle)
    const perpX = -Math.sin(angle)
    const perpY = Math.cos(angle)
    const startX = from.x + outX * STATE_RADIUS - perpX * SELF_LOOP_RADIUS * 0.8
    const startY = from.y + outY * STATE_RADIUS - perpY * SELF_LOOP_RADIUS * 0.8
    const c1x = from.x + outX * (STATE_RADIUS + SELF_LOOP_CONTROL_DISTANCE) - perpX * SELF_LOOP_RADIUS * 2
    const c1y = from.y + outY * (STATE_RADIUS + SELF_LOOP_CONTROL_DISTANCE) - perpY * SELF_LOOP_RADIUS * 2
    const c2x = from.x + outX * (STATE_RADIUS + SELF_LOOP_CONTROL_DISTANCE) + perpX * SELF_LOOP_RADIUS * 2
    const c2y = from.y + outY * (STATE_RADIUS + SELF_LOOP_CONTROL_DISTANCE) + perpY * SELF_LOOP_RADIUS * 2
    const endX = from.x + outX * STATE_RADIUS + perpX * SELF_LOOP_RADIUS * 0.8
    const endY = from.y + outY * STATE_RADIUS + perpY * SELF_LOOP_RADIUS * 0.8
    const labelX = from.x + outX * (STATE_RADIUS + SELF_LOOP_LABEL_DISTANCE)
    const labelY = from.y + outY * (STATE_RADIUS + SELF_LOOP_LABEL_DISTANCE)
    return {
      d: `M ${startX} ${startY} C ${c1x} ${c1y} ${c2x} ${c2y} ${endX} ${endY}`,
      labelX,
      labelY,
      isSelfLoop: true,
    }
  }

  // Find all co-directional transitions (same from → same to)
  const coDir = graph.transitions.filter(
    (other) => other.from === t.from && other.to === t.to,
  )
  const coIndex = coDir.findIndex((other) => other.id === t.id)
  const coCount = coDir.length

  // Check for reverse direction (bidirectional pair)
  const hasReverse = graph.transitions.some(
    (other) => other.from === t.to && other.to === t.from,
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

  const baseOffset = hasReverse ? BIDIRECTIONAL_BASE_OFFSET : 0
  const offset = baseOffset + (coIndex - (coCount - 1) / 2) * TRANSITION_SPREAD

  if (offset === 0) {
    return {
      d: `M ${startX} ${startY} L ${endX} ${endY}`,
      labelX: (startX + endX) / 2 + nx * STRAIGHT_LABEL_OFFSET,
      labelY: (startY + endY) / 2 + ny * STRAIGHT_LABEL_OFFSET,
      isSelfLoop: false,
    }
  }

  const midX = (startX + endX) / 2
  const midY = (startY + endY) / 2
  const qcx = midX + nx * offset
  const qcy = midY + ny * offset
  return {
    d: `M ${startX} ${startY} Q ${qcx} ${qcy} ${endX} ${endY}`,
    labelX: midX + nx * (offset + TRANSITION_LABEL_OFFSET),
    labelY: midY + ny * (offset + TRANSITION_LABEL_OFFSET),
    isSelfLoop: false,
  }
}

export interface StateColors {
  fill: string
  stroke: string
  text: string
}

export function getStateColor(
  state: State,
  editorState: EditorState,
  activeStateIds: string[],
  acceptedStateIds: string[],
  rejectedStateIds: string[],
  hoveredStateId: string | null,
): StateColors {
  if (acceptedStateIds.includes(state.id)) return ACCEPTED_STATE_COLORS
  if (rejectedStateIds.includes(state.id)) return REJECTED_STATE_COLORS
  if (activeStateIds.includes(state.id)) return ACTIVE_STATE_COLORS
  if (editorState.selectedStateId === state.id) return SELECTED_STATE_COLORS
  if (editorState.transitionSource === state.id) return TRANSITION_SOURCE_COLORS
  if (hoveredStateId === state.id) return HOVERED_STATE_COLORS
  return DEFAULT_STATE_COLORS
}
