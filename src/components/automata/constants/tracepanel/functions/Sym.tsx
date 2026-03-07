import type { ReactNode } from 'react'

export function Sym({ children }: { children: ReactNode }) {
  return (
    <span className="text-cyan-300 bg-cyan-400/10 px-1 rounded text-[11px]">
      {children}
    </span>
  )
}
