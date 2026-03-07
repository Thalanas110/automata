export function rowClass(i: number): string {
  return `border-b border-[#1a1b1e] transition-colors ${
    i % 2 === 0 ? 'bg-[#0e0f11]/60' : 'bg-transparent'
  } hover:bg-cyan-500/5`
}
