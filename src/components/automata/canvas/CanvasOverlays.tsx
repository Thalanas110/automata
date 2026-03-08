import type React from 'react'
import type { AutomataGraph, EditorState } from '@/lib/automata/types'
import { ZOOM_IN_FACTOR, ZOOM_OUT_FACTOR, INITIAL_VIEWBOX } from '../constants/canvas'
import type { TransitionLabelEdit, ViewBox } from './useCanvasInteraction'

interface CanvasOverlaysProps {
  graph: AutomataGraph
  editorState: EditorState
  setViewBox: React.Dispatch<React.SetStateAction<ViewBox>>
  // State label edit
  stateLabelEdit: { stateId: string; tempLabel: string } | null
  onStateLabelChange: (value: string) => void
  onStateLabelCommit: () => void
  onStateLabelCancel: () => void
  // New-transition label edit
  labelEdit: TransitionLabelEdit | null
  onLabelEditChange: React.Dispatch<React.SetStateAction<TransitionLabelEdit | null>>
  onLabelEditCommit: () => void
  onLabelEditCancel: () => void
}

export function CanvasOverlays({
  graph,
  editorState,
  setViewBox,
  stateLabelEdit,
  onStateLabelChange,
  onStateLabelCommit,
  onStateLabelCancel,
  labelEdit,
  onLabelEditChange,
  onLabelEditCommit,
  onLabelEditCancel,
}: CanvasOverlaysProps) {
  return (
    <>
      {/* State label edit modal */}
      {stateLabelEdit && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/40 z-10">
          <div className="bg-[#1a1b1e] border border-cyan-500/50 rounded-lg p-4 shadow-2xl min-w-[240px]">
            <p className="text-xs text-gray-400 mb-2 font-mono">State label:</p>
            <input
              autoFocus
              value={stateLabelEdit.tempLabel}
              onChange={(e) => onStateLabelChange(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') onStateLabelCommit()
                if (e.key === 'Escape') onStateLabelCancel()
              }}
              className="w-full text-center text-sm bg-[#0e0f11] text-cyan-300 border border-cyan-500 rounded px-3 py-1.5 outline-none font-mono mb-3"
            />
            <div className="flex gap-2 justify-end">
              <button
                onClick={onStateLabelCancel}
                className="px-3 py-1 text-xs font-mono text-gray-400 hover:text-white bg-[#0e0f11] border border-[#2d3748] rounded"
              >
                Cancel
              </button>
              <button
                onClick={onStateLabelCommit}
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
              onChange={(e) => onLabelEditChange({ ...labelEdit, tempLabel: e.target.value })}
              onBlur={onLabelEditCommit}
              onKeyDown={(e) => {
                if (e.key === 'Enter') onLabelEditCommit()
                if (e.key === 'Escape') onLabelEditCancel()
              }}
              className="w-48 text-center text-sm bg-[#0e0f11] text-cyan-300 border border-cyan-500 rounded px-3 py-1.5 outline-none font-mono"
            />
          </div>
        </div>
      )}

      {/* Zoom controls */}
      <div className="absolute bottom-4 right-4 flex flex-col gap-1">
        <button
          onClick={() => setViewBox((v) => ({ ...v, w: v.w * ZOOM_IN_FACTOR, h: v.h * ZOOM_IN_FACTOR }))}
          className="w-8 h-8 bg-[#1a1b1e] border border-[#2d3748] text-gray-400 hover:text-white text-lg flex items-center justify-center rounded"
        >
          +
        </button>
        <button
          onClick={() => setViewBox((v) => ({ ...v, w: v.w * ZOOM_OUT_FACTOR, h: v.h * ZOOM_OUT_FACTOR }))}
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

      {/* Hint bar */}
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
    </>
  )
}
