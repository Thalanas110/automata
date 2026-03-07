export const resultColor = {
  accepted: 'text-emerald-400 border-emerald-500/40 bg-emerald-500/10',
  rejected: 'text-red-400 border-red-500/40 bg-red-500/10',
  halted: 'text-amber-400 border-amber-500/40 bg-amber-500/10',
  incomplete: 'text-gray-400 border-gray-500/40 bg-gray-500/10',
} as const

export type ResultType = keyof typeof resultColor
