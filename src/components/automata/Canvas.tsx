import React, { useRef, useState, useCallback } from 'react'
import type {
  AutomataGraph,
  State,
  Transition,
  EditorState,
} from '@/lib/automata/types'
import {
  STATE_RADIUS,
  ACCEPT_RING_OFFSET,
  STATE_HIT_PADDING,
  ACCEPTED_STATE_COLORS,
  REJECTED_STATE_COLORS,
  ACTIVE_STATE_COLORS,
  SELECTED_STATE_COLORS,
  TRANSITION_SOURCE_COLORS,
  HOVERED_STATE_COLORS,
  DEFAULT_STATE_COLORS,
  TRANSITION_COLORS,
  CANVAS_COLORS,
  SELF_LOOP_RADIUS,
  SELF_LOOP_ANGLE_SEPARATION,
  SELF_LOOP_CONTROL_DISTANCE,
  SELF_LOOP_LABEL_DISTANCE,
  TRANSITION_SPREAD,
  BIDIRECTIONAL_BASE_OFFSET,
  TRANSITION_LABEL_OFFSET,
  STRAIGHT_LABEL_OFFSET,
  INITIAL_VIEWBOX,
  VIEWBOX_WIDTH_MIN,
  VIEWBOX_WIDTH_MAX,
  VIEWBOX_HEIGHT_MIN,
  VIEWBOX_HEIGHT_MAX,
  ZOOM_IN_FACTOR,
  ZOOM_OUT_FACTOR,
  CLICK_TARGET_PADDING,
} from './constants/canvas'

interface CanvasProps {
  graph: AutomataGraph
  editorState: EditorState
  activeStateIds: string[]
  acceptedStateIds: string[]
  rejectedStateIds: string[]
  onGraphChange: (graph: AutomataGraph) => void
  onEditorStateChange: (state: EditorState) => void
}

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
  const [stateLabelEdit, setStateLabelEdit] = useState<{ stateId: string; tempLabel: string } | null>(null)
  const [hoveredStateId, setHoveredStateId] = useState<string | null>(null)
  const [viewBox, setViewBox] = useState(INITIAL_VIEWBOX)
  const [isPanning, setIsPanning] = useState(false)
  const panStart = useRef<{
    mx: number
    my: number
    vx: number
    vy: number
  } | null>(null)

  // Touch tracking refs
  const touchStateRef = useRef<{
    id: number
    startX: number
    startY: number
    moved: boolean
  } | null>(null)
  const pinchRef = useRef<{
    dist: number
    vw: number
    vh: number
  } | null>(null)

  // SVG coordinate helper (from client coords)
  const clientToSVG = useCallback(
    (clientX: number, clientY: number) => {
      const svg = svgRef.current
      if (!svg) return { x: 0, y: 0 }
      const rect = svg.getBoundingClientRect()
      const scaleX = viewBox.w / rect.width
      const scaleY = viewBox.h / rect.height
      return {
        x: (clientX - rect.left) * scaleX + viewBox.x,
        y: (clientY - rect.top) * scaleY + viewBox.y,
      }
    },
    [viewBox],
  )

  // SVG coordinate helper
  const toSVGCoords = useCallback(
    (e: React.MouseEvent) => clientToSVG(e.clientX, e.clientY),
    [clientToSVG],
  )

  const handleSVGMouseDown = useCallback(
    (e: React.MouseEvent<SVGSVGElement>) => {
      const onBackground =
        e.target === svgRef.current ||
        (e.target as Element).tagName === 'rect'

      // Pan tool: left-click anywhere on the SVG starts panning
      if (editorState.tool === 'pan' && e.button === 0) {
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

      if (onBackground) {
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
      // In pan mode, let the event bubble up to the SVG so panning works
      if (editorState.tool === 'pan') return
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
        const { mx, my, vx, vy } = panStart.current
        const dx = (e.clientX - mx) * scaleX
        const dy = (e.clientY - my) * scaleY
        setViewBox((v) => ({
          ...v,
          x: vx - dx,
          y: vy - dy,
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
    const scale = e.deltaY > 0 ? ZOOM_OUT_FACTOR : ZOOM_IN_FACTOR
    setViewBox((v) => {
      const newW = Math.max(VIEWBOX_WIDTH_MIN, Math.min(VIEWBOX_WIDTH_MAX, v.w * scale))
      const newH = Math.max(VIEWBOX_HEIGHT_MIN, Math.min(VIEWBOX_HEIGHT_MAX, v.h * scale))
      return { ...v, w: newW, h: newH }
    })
  }, [])

  // ── Touch handlers ──────────────────────────────────────────────────
  const handleTouchStart = useCallback(
    (e: React.TouchEvent<SVGSVGElement>) => {
      if (e.touches.length === 2) {
        e.preventDefault()
        const t0 = e.touches[0]
        const t1 = e.touches[1]
        const dist = Math.hypot(
          t1.clientX - t0.clientX,
          t1.clientY - t0.clientY,
        )
        pinchRef.current = { dist, vw: viewBox.w, vh: viewBox.h }
        touchStateRef.current = null
        setDrag(null)
        setIsPanning(false)
        return
      }
      if (e.touches.length !== 1) return
      e.preventDefault()
      const touch = e.touches[0]
      const svgCoords = clientToSVG(touch.clientX, touch.clientY)

      touchStateRef.current = {
        id: touch.identifier,
        startX: touch.clientX,
        startY: touch.clientY,
        moved: false,
      }

      const hitState = graph.states.find((s) => {
        const dx = svgCoords.x - s.x
        const dy = svgCoords.y - s.y
        return Math.sqrt(dx * dx + dy * dy) <= STATE_RADIUS + STATE_HIT_PADDING
      })

      if (hitState) {
        if (editorState.tool === 'select') {
          onEditorStateChange({
            ...editorState,
            selectedStateId: hitState.id,
            selectedTransitionId: null,
          })
          setDrag({
            stateId: hitState.id,
            offsetX: svgCoords.x - hitState.x,
            offsetY: svgCoords.y - hitState.y,
          })
        }
        // delete / addTransition handled on touchEnd (tap)
      } else {
        // Background touch → pan
        setIsPanning(true)
        panStart.current = {
          mx: touch.clientX,
          my: touch.clientY,
          vx: viewBox.x,
          vy: viewBox.y,
        }
      }
    },
    [clientToSVG, editorState, graph.states, onEditorStateChange, viewBox],
  )

  const handleTouchMove = useCallback(
    (e: React.TouchEvent<SVGSVGElement>) => {
      e.preventDefault()

      if (e.touches.length === 2 && pinchRef.current) {
        const t0 = e.touches[0]
        const t1 = e.touches[1]
        const newDist = Math.hypot(
          t1.clientX - t0.clientX,
          t1.clientY - t0.clientY,
        )
        // Capture ref values before calling setViewBox — React may invoke the
        // updater function later (concurrent mode), by which point handleTouchEnd
        // could have nulled pinchRef.current, causing the crash.
        const { dist, vw, vh } = pinchRef.current
        const scale = dist / newDist
        setViewBox((v) => ({
          ...v,
          w: Math.max(VIEWBOX_WIDTH_MIN, Math.min(VIEWBOX_WIDTH_MAX, vw * scale)),
          h: Math.max(VIEWBOX_HEIGHT_MIN, Math.min(VIEWBOX_HEIGHT_MAX, vh * scale)),
        }))
        return
      }

      if (e.touches.length !== 1) return
      const touch = e.touches[0]

      if (touchStateRef.current) {
        const dx = touch.clientX - touchStateRef.current.startX
        const dy = touch.clientY - touchStateRef.current.startY
        if (Math.sqrt(dx * dx + dy * dy) > 6) {
          touchStateRef.current.moved = true
        }
      }

      if (isPanning && panStart.current) {
        const svg = svgRef.current
        if (!svg) return
        const rect = svg.getBoundingClientRect()
        const scaleX = viewBox.w / rect.width
        const scaleY = viewBox.h / rect.height
        const { mx, my, vx, vy } = panStart.current
        setViewBox((v) => ({
          ...v,
          x: vx - (touch.clientX - mx) * scaleX,
          y: vy - (touch.clientY - my) * scaleY,
        }))
        return
      }

      if (drag) {
        const svgCoords = clientToSVG(touch.clientX, touch.clientY)
        onGraphChange({
          ...graph,
          states: graph.states.map((s) =>
            s.id === drag.stateId
              ? { ...s, x: svgCoords.x - drag.offsetX, y: svgCoords.y - drag.offsetY }
              : s,
          ),
        })
      }
    },
    [clientToSVG, drag, graph, isPanning, onGraphChange, viewBox],
  )

  const handleTouchEnd = useCallback(
    (e: React.TouchEvent<SVGSVGElement>) => {
      e.preventDefault()
      pinchRef.current = null

      if (e.changedTouches.length === 1 && touchStateRef.current) {
        const touch = e.changedTouches[0]
        const wasTap = !touchStateRef.current.moved

        if (wasTap) {
          const svgCoords = clientToSVG(touch.clientX, touch.clientY)
          const hitState = graph.states.find((s) => {
            const dx = svgCoords.x - s.x
            const dy = svgCoords.y - s.y
            return Math.sqrt(dx * dx + dy * dy) <= STATE_RADIUS + STATE_HIT_PADDING
          })

          if (hitState) {
            if (editorState.tool === 'delete') {
              onGraphChange({
                ...graph,
                states: graph.states.filter((s) => s.id !== hitState.id),
                transitions: graph.transitions.filter(
                  (t) => t.from !== hitState.id && t.to !== hitState.id,
                ),
              })
              onEditorStateChange({ ...editorState, selectedStateId: null })
            } else if (editorState.tool === 'addTransition') {
              if (!editorState.transitionSource) {
                onEditorStateChange({
                  ...editorState,
                  transitionSource: hitState.id,
                })
              } else {
                setLabelEdit({
                  transitionId: null,
                  tempLabel: '',
                  isNew: true,
                  from: editorState.transitionSource,
                  to: hitState.id,
                })
                onEditorStateChange({
                  ...editorState,
                  transitionSource: null,
                })
              }
            }
          } else {
            // Background tap
            if (editorState.tool === 'addState') {
              const newState: State = {
                id: crypto.randomUUID(),
                label: `q${graph.states.length}`,
                x: svgCoords.x,
                y: svgCoords.y,
                isStart: graph.states.length === 0,
                isAccept: false,
              }
              onGraphChange({
                ...graph,
                states: [...graph.states, newState],
              })
            } else {
              onEditorStateChange({
                ...editorState,
                selectedStateId: null,
                selectedTransitionId: null,
                transitionSource: null,
              })
            }
          }
        }
      }

      touchStateRef.current = null
      setDrag(null)
      setIsPanning(false)
      panStart.current = null
    },
    [clientToSVG, editorState, graph, onEditorStateChange, onGraphChange],
  )

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
      setStateLabelEdit({ stateId: state.id, tempLabel: state.label })
    },
    [editorState.tool],
  )

  const commitStateLabelEdit = useCallback(() => {
    if (!stateLabelEdit) return
    onGraphChange({
      ...graph,
      states: graph.states.map((s) =>
        s.id === stateLabelEdit.stateId ? { ...s, label: stateLabelEdit.tempLabel } : s,
      ),
    })
    setStateLabelEdit(null)
  }, [graph, stateLabelEdit, onGraphChange])

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

    // Base offset: push all transitions to one side if bidirectional,
    // then spread each co-directional transition evenly around that base.
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

  function getStateColor(state: State) {
    if (acceptedStateIds.includes(state.id))
      return ACCEPTED_STATE_COLORS
    if (rejectedStateIds.includes(state.id))
      return REJECTED_STATE_COLORS
    if (activeStateIds.includes(state.id))
      return ACTIVE_STATE_COLORS
    if (editorState.selectedStateId === state.id)
      return SELECTED_STATE_COLORS
    if (editorState.transitionSource === state.id)
      return TRANSITION_SOURCE_COLORS
    if (hoveredStateId === state.id)
      return HOVERED_STATE_COLORS
    return DEFAULT_STATE_COLORS
  }

  return (
    <div className="relative w-full h-full overflow-hidden" style={{ backgroundColor: CANVAS_COLORS.background }}>
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
              stroke={CANVAS_COLORS.gridStroke}
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
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        style={{
          touchAction: 'none',
          cursor:
            editorState.tool === 'addState'
              ? 'crosshair'
              : isPanning
                ? 'grabbing'
                : editorState.tool === 'pan'
                  ? 'grab'
                  : editorState.tool === 'delete'
                    ? 'not-allowed'
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
          x={viewBox.x - CLICK_TARGET_PADDING}
          y={viewBox.y - CLICK_TARGET_PADDING}
          width={viewBox.w + CLICK_TARGET_PADDING * 2}
          height={viewBox.h + CLICK_TARGET_PADDING * 2}
          fill="transparent"
        />

        {/* Transition edges */}
        {graph.transitions.map((t) => {
          const path = getTransitionPath(t)
          if (!path) return null
          const isSelected = editorState.selectedTransitionId === t.id
          const stroke = isSelected ? TRANSITION_COLORS.selected : TRANSITION_COLORS.default
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

      {/* State label edit modal */}
      {stateLabelEdit && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/40 z-10">
          <div className="bg-[#1a1b1e] border border-cyan-500/50 rounded-lg p-4 shadow-2xl min-w-[240px]">
            <p className="text-xs text-gray-400 mb-2 font-mono">State label:</p>
            <input
              autoFocus
              value={stateLabelEdit.tempLabel}
              onChange={(e) =>
                setStateLabelEdit({ ...stateLabelEdit, tempLabel: e.target.value })
              }
              onKeyDown={(e) => {
                if (e.key === 'Enter') commitStateLabelEdit()
                if (e.key === 'Escape') setStateLabelEdit(null)
              }}
              className="w-full text-center text-sm bg-[#0e0f11] text-cyan-300 border border-cyan-500 rounded px-3 py-1.5 outline-none font-mono mb-3"
            />
            <div className="flex gap-2 justify-end">
              <button
                onClick={() => setStateLabelEdit(null)}
                className="px-3 py-1 text-xs font-mono text-gray-400 hover:text-white bg-[#0e0f11] border border-[#2d3748] rounded"
              >
                Cancel
              </button>
              <button
                onClick={commitStateLabelEdit}
                className="px-3 py-1 text-xs font-mono text-cyan-300 hover:text-cyan-100 bg-cyan-900/30 border border-cyan-500/50 rounded"
              >
                OK
              </button>
            </div>
          </div>
        </div>
      )}

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
            setViewBox((v) => ({ ...v, w: v.w * ZOOM_IN_FACTOR, h: v.h * ZOOM_IN_FACTOR }))
          }
          className="w-8 h-8 bg-[#1a1b1e] border border-[#2d3748] text-gray-400 hover:text-white text-lg flex items-center justify-center rounded"
        >
          +
        </button>
        <button
          onClick={() =>
            setViewBox((v) => ({ ...v, w: v.w * ZOOM_OUT_FACTOR, h: v.h * ZOOM_OUT_FACTOR }))
          }
          className="w-8 h-8 bg-[#1a1b1e] border border-[#2d3748] text-gray-400 hover:text-white text-lg flex items-center justify-center rounded"
        >
          −
        </button>
        <button
          onClick={() => setViewBox(INITIAL_VIEWBOX)}
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
      {editorState.tool === 'pan' && 'Drag to pan · Scroll to zoom'}
      </div>
    </div>
  )
}
