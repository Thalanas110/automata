import type { ReactNode } from 'react'

type SimButtonVariant = 'default' | 'primary' | 'danger' | 'active'

interface SimButtonProps {
  children: ReactNode
  onClick: () => void
  disabled?: boolean
  variant?: SimButtonVariant
}

const VARIANT_CLASSES: Record<SimButtonVariant, string> = {
  default:
    'bg-[#1a1b1e] text-gray-300 hover:bg-[#22232a] hover:text-white border border-[#2d3748]',
  primary:
    'bg-cyan-500/20 text-cyan-300 hover:bg-cyan-500/30 border border-cyan-500/40',
  danger:
    'bg-red-500/10 text-red-400 hover:bg-red-500/20 border border-red-500/20',
  active:
    'bg-amber-500/20 text-amber-300 hover:bg-amber-500/30 border border-amber-500/40',
}

/**
 * Small action button used throughout the SimulationBar toolbar.
 */
export function SimButton({
  children,
  onClick,
  disabled,
  variant = 'default',
}: SimButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`px-2.5 py-1 rounded text-[11px] font-mono transition-all disabled:opacity-40 disabled:cursor-not-allowed ${VARIANT_CLASSES[variant]}`}
    >
      {children}
    </button>
  )
}
