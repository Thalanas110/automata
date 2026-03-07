import type { ReactNode } from 'react'

export function Th({ children }: { children: ReactNode }) {
  return (
    <th className="text-left px-3 py-2 text-[9px] font-mono text-gray-500 uppercase tracking-wider whitespace-nowrap">
      {children}
    </th>
  )
}
