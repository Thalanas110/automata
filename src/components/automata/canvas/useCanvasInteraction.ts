import { useRef, useState, useCallback } from 'react'
import type { AutomataGraph, EditorState, State, Transition } from '@/lib/automata/types'
import {
  STATE_RADIUS,
  STATE_HIT_PADDING,
  INITIAL_VIEWBOX,
  VIEWBOX_WIDTH_MIN,
  VIEWBOX_WIDTH_MAX,
  VIEWBOX_HEIGHT_MIN,
  VIEWBOX_HEIGHT_MAX,
  ZOOM_IN_FACTOR,
  ZOOM_OUT_FACTOR,
} from '../constants/canvas'

export interface ViewBox {
  x: number
  y: number
  w: number
  h: number
}

export interface TransitionLabelEdit {
  transitionId: string | null
  tempLabel: string
  isNew: boolean
  from?: string
  to?: string
}

interface DragState {
  stateId: string
  offsetX: number
  offsetY: number
}

export interface CanvasInteraction {
  // State
  labelEdit: TransitionLabelEdit | null
  stateLabelEdit: { stateId: string; tempLabel: string } | null
  hoveredStateId: string | null
  viewBox: ViewBox
  isPanning: boolean
  svgRef: React.RefObject<SVGSVGElement | null>
  // Setters for overlay bindings
  setLabelEdit: React.Dispatch<React.SetStateAction<TransitionLabelEdit | null>>
  setStateLabelEdit: React.Dispatch<React.SetStateAction<{ stateId: string; tempLabel: string } | null>>
  setViewBox: React.Dispatch<React.SetStateAction<ViewBox>>
  // Commit helpers
  commitLabelEdit: () => void
  commitStateLabelEdit: () => void
  // SVG event handlers
  handleSVGMouseDown: (e: React.MouseEvent<SVGSVGElement>) => void
  handleSVGClick: (e: React.MouseEvent<SVGSVGElement>) => void
  handleMouseMove: (e: React.MouseEvent<SVGSVGElement>) => void
  handleMouseUp: () => void
  handleWheel: (e: React.WheelEvent<SVGSVGElement>) => void
  handleTouchStart: (e: React.TouchEvent<SVGSVGElement>) => void
  handleTouchMove: (e: React.TouchEvent<SVGSVGElement>) => void
  handleTouchEnd: (e: React.TouchEvent<SVGSVGElement>) => void
  // Element handlers
  handleTransitionClick: (e: React.MouseEvent, t: Transition) => void
  handleStateMouseDown: (e: React.MouseEvent, state: State) => void
  handleStateDoubleClick: (e: React.MouseEvent, state: State) => void
  handleStateHoverEnter: (id: string) => void
  handleStateHoverLeave: () => void
}

export function useCanvasInteraction(
  graph: AutomataGraph,
  editorState: EditorState,
  onGraphChange: (graph: AutomataGraph) => void,
  onEditorStateChange: (state: EditorState) => void,
): CanvasInteraction {
  const svgRef = useRef<SVGSVGElement>(null)
  const [drag, setDrag] = useState<DragState | null>(null)
  const [labelEdit, setLabelEdit] = useState<TransitionLabelEdit | null>(null)
  const [stateLabelEdit, setStateLabelEdit] = useState<{ stateId: string; tempLabel: string } | null>(null)
  const [hoveredStateId, setHoveredStateId] = useState<string | null>(null)
  const [viewBox, setViewBox] = useState<ViewBox>(INITIAL_VIEWBOX)
  const [isPanning, setIsPanning] = useState(false)
  const panStart = useRef<{ mx: number; my: number; vx: number; vy: number } | null>(null)

  const touchStateRef = useRef<{
    id: number
    startX: number
    startY: number
    moved: boolean
  } | null>(null)
  const pinchRef = useRef<{ dist: number; vw: number; vh: number } | null>(null)

  // ── Coordinate helpers ─────────────────────────────────────────────────────

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

  const toSVGCoords = useCallback(
    (e: React.MouseEvent) => clientToSVG(e.clientX, e.clientY),
    [clientToSVG],
  )

  // ── Commit helpers ─────────────────────────────────────────────────────────

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
          t.id === labelEdit.transitionId ? { ...t, label: labelEdit.tempLabel } : t,
        ),
      })
    }
    setLabelEdit(null)
  }, [graph, labelEdit, onGraphChange])

  // ── Mouse handlers ─────────────────────────────────────────────────────────

  const handleSVGMouseDown = useCallback(
    (e: React.MouseEvent<SVGSVGElement>) => {
      const onBackground =
        e.target === svgRef.current ||
        (e.target as Element).tagName === 'rect'

      if (editorState.tool === 'pan' && e.button === 0) {
        setIsPanning(true)
        panStart.current = { mx: e.clientX, my: e.clientY, vx: viewBox.x, vy: viewBox.y }
        e.preventDefault()
        return
      }

      if (onBackground) {
        if (editorState.tool === 'addState') return
        if (e.button === 1 || (e.button === 0 && e.altKey)) {
          setIsPanning(true)
          panStart.current = { mx: e.clientX, my: e.clientY, vx: viewBox.x, vy: viewBox.y }
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
      if (e.target !== svgRef.current && (e.target as Element).tagName !== 'rect') return
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
      if (editorState.tool === 'pan') return
      e.stopPropagation()
      if (editorState.tool === 'delete') {
        const newStates = graph.states.filter((s) => s.id !== state.id)
        const newTransitions = graph.transitions.filter(
          (t) => t.from !== state.id && t.to !== state.id,
        )
        onGraphChange({ ...graph, states: newStates, transitions: newTransitions })
        return
      }
      if (editorState.tool === 'addTransition') {
        if (!editorState.transitionSource) {
          onEditorStateChange({ ...editorState, transitionSource: state.id })
        } else {
          const from = editorState.transitionSource
          const to = state.id
          setLabelEdit({ transitionId: null, tempLabel: '', isNew: true, from, to })
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
        setDrag({ stateId: state.id, offsetX: coords.x - state.x, offsetY: coords.y - state.y })
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
        setViewBox((v) => ({ ...v, x: vx - dx, y: vy - dy }))
        return
      }
      if (!drag) return
      const coords = toSVGCoords(e)
      onGraphChange({
        ...graph,
        states: graph.states.map((s) =>
          s.id === drag.stateId
            ? { ...s, x: coords.x - drag.offsetX, y: coords.y - drag.offsetY }
            : s,
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
    setViewBox((v) => ({
      ...v,
      w: Math.max(VIEWBOX_WIDTH_MIN, Math.min(VIEWBOX_WIDTH_MAX, v.w * scale)),
      h: Math.max(VIEWBOX_HEIGHT_MIN, Math.min(VIEWBOX_HEIGHT_MAX, v.h * scale)),
    }))
  }, [])

  const handleStateDoubleClick = useCallback(
    (e: React.MouseEvent, state: State) => {
      e.stopPropagation()
      if (editorState.tool !== 'select') return
      setStateLabelEdit({ stateId: state.id, tempLabel: state.label })
    },
    [editorState.tool],
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

  // ── Touch handlers ─────────────────────────────────────────────────────────

  const handleTouchStart = useCallback(
    (e: React.TouchEvent<SVGSVGElement>) => {
      if (e.touches.length === 2) {
        e.preventDefault()
        const t0 = e.touches[0]
        const t1 = e.touches[1]
        const dist = Math.hypot(t1.clientX - t0.clientX, t1.clientY - t0.clientY)
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
      } else {
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
        const newDist = Math.hypot(t1.clientX - t0.clientX, t1.clientY - t0.clientY)
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
                onEditorStateChange({ ...editorState, transitionSource: hitState.id })
              } else {
                setLabelEdit({
                  transitionId: null,
                  tempLabel: '',
                  isNew: true,
                  from: editorState.transitionSource,
                  to: hitState.id,
                })
                onEditorStateChange({ ...editorState, transitionSource: null })
              }
            }
          } else {
            if (editorState.tool === 'addState') {
              const newState: State = {
                id: crypto.randomUUID(),
                label: `q${graph.states.length}`,
                x: svgCoords.x,
                y: svgCoords.y,
                isStart: graph.states.length === 0,
                isAccept: false,
              }
              onGraphChange({ ...graph, states: [...graph.states, newState] })
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

  return {
    // State
    labelEdit,
    stateLabelEdit,
    hoveredStateId,
    viewBox,
    isPanning,
    svgRef,
    // Setters
    setLabelEdit,
    setStateLabelEdit,
    setViewBox,
    // Commit helpers
    commitLabelEdit,
    commitStateLabelEdit,
    // SVG event handlers
    handleSVGMouseDown,
    handleSVGClick,
    handleMouseMove,
    handleMouseUp,
    handleWheel,
    handleTouchStart,
    handleTouchMove,
    handleTouchEnd,
    // Element handlers
    handleTransitionClick,
    handleStateMouseDown,
    handleStateDoubleClick,
    handleStateHoverEnter: setHoveredStateId,
    handleStateHoverLeave: () => setHoveredStateId(null),
  }
}
