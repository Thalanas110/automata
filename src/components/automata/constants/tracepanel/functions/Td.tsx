import type { ReactNode } from 'react'

interface TdProps {
  children: ReactNode
  dim?: boolean
}

export function Td({ children, dim }: TdProps) {
  return (
    <td
      className={`px-3 py-1.5 text-xs font-mono whitespace-nowrap ${dim ? 'text-gray-600' : 'text-gray-300'}`}
    >
      {children}
    </td>
  )
}
