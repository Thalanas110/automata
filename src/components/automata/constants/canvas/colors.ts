/**
 * Color constants for automata canvas states and transitions
 */

export interface StateColors {
  fill: string
  stroke: string
  text: string
}

/** Colors for accepted states */
export const ACCEPTED_STATE_COLORS: StateColors = {
  fill: '#00e676',
  stroke: '#00e676',
  text: '#000',
}

/** Colors for rejected states */
export const REJECTED_STATE_COLORS: StateColors = {
  fill: '#ff1744',
  stroke: '#ff1744',
  text: '#fff',
}

/** Colors for active states (during simulation) */
export const ACTIVE_STATE_COLORS: StateColors = {
  fill: '#00d4ff',
  stroke: '#00d4ff',
  text: '#000',
}

/** Colors for selected states */
export const SELECTED_STATE_COLORS: StateColors = {
  fill: '#1e2430',
  stroke: '#00d4ff',
  text: '#00d4ff',
}

/** Colors for states marked as transition source */
export const TRANSITION_SOURCE_COLORS: StateColors = {
  fill: '#1e2430',
  stroke: '#ffb347',
  text: '#ffb347',
}

/** Colors for hovered states */
export const HOVERED_STATE_COLORS: StateColors = {
  fill: '#1e2430',
  stroke: '#6b7280',
  text: '#e5e7eb',
}

/** Default colors for states */
export const DEFAULT_STATE_COLORS: StateColors = {
  fill: '#141519',
  stroke: '#374151',
  text: '#d1d5db',
}

/** Transition edge colors */
export const TRANSITION_COLORS = {
  default: '#4b5563',
  selected: '#ffb347',
  label: '#9ca3af',
  labelSelected: '#ffb347',
}

/** Grid and background colors */
export const CANVAS_COLORS = {
  background: '#0a0b0d',
  gridStroke: '#374151',
}
