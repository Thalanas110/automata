import type { AutomataGraph, EditorState } from '@/lib/automata/types'
import { CANVAS_COLORS } from './constants/canvas'
import { useCanvasInteraction } from './canvas/useCanvasInteraction'
import { CanvasSVG } from './canvas/CanvasSVG'
import { CanvasOverlays } from './canvas/CanvasOverlays'

interface CanvasProps {
  graph: AutomataGraph
  editorState: EditorState
  activeStateIds: string[]
  acceptedStateIds: string[]
  rejectedStateIds: string[]
  onGraphChange: (graph: AutomataGraph) => void
  onEditorStateChange: (state: EditorState) => void
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
  const {
    svgRef,
    labelEdit,
    stateLabelEdit,
    hoveredStateId,
    viewBox,
    isPanning,
    setLabelEdit,
    setStateLabelEdit,
    setViewBox,
    commitLabelEdit,
    commitStateLabelEdit,
    handleSVGMouseDown,
    handleSVGClick,
    handleMouseMove,
    handleMouseUp,
    handleWheel,
    handleTouchStart,
    handleTouchMove,
    handleTouchEnd,
    handleTransitionClick,
    handleStateMouseDown,
    handleStateDoubleClick,
    handleStateHoverEnter,
    handleStateHoverLeave,
  } = useCanvasInteraction(graph, editorState, onGraphChange, onEditorStateChange)

  return (
    <div
      className="relative w-full h-full overflow-hidden"
      style={{ backgroundColor: CANVAS_COLORS.background }}
    >
      {/* Grid background */}
      <svg className="absolute inset-0 opacity-20 pointer-events-none" width="100%" height="100%">
        <defs>
          <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
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

      {/* Main interactive SVG */}
      <CanvasSVG
        svgRef={svgRef}
        graph={graph}
        editorState={editorState}
        activeStateIds={activeStateIds}
        acceptedStateIds={acceptedStateIds}
        rejectedStateIds={rejectedStateIds}
        hoveredStateId={hoveredStateId}
        viewBox={viewBox}
        isPanning={isPanning}
        labelEdit={labelEdit}
        onSVGMouseDown={handleSVGMouseDown}
        onSVGClick={handleSVGClick}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onWheel={handleWheel}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onTransitionClick={handleTransitionClick}
        onStateMouseDown={handleStateMouseDown}
        onStateDoubleClick={handleStateDoubleClick}
        onStateHoverEnter={handleStateHoverEnter}
        onStateHoverLeave={handleStateHoverLeave}
        onLabelEditChange={setLabelEdit}
        onLabelEditCommit={commitLabelEdit}
        onLabelEditCancel={() => setLabelEdit(null)}
      />

      {/* HTML overlays */}
      <CanvasOverlays
        graph={graph}
        editorState={editorState}
        setViewBox={setViewBox}
        stateLabelEdit={stateLabelEdit}
        onStateLabelChange={(value) =>
          setStateLabelEdit((prev) => (prev ? { ...prev, tempLabel: value } : null))
        }
        onStateLabelCommit={commitStateLabelEdit}
        onStateLabelCancel={() => setStateLabelEdit(null)}
        labelEdit={labelEdit}
        onLabelEditChange={setLabelEdit}
        onLabelEditCommit={commitLabelEdit}
        onLabelEditCancel={() => setLabelEdit(null)}
      />
    </div>
  )
}
