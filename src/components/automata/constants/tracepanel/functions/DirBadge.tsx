export function DirBadge({ dir }: { dir: 'L' | 'R' | 'S' }) {
  const color =
    dir === 'R'
      ? 'text-cyan-300 bg-cyan-400/10'
      : dir === 'L'
        ? 'text-violet-300 bg-violet-400/10'
        : 'text-gray-400 bg-gray-400/10'
  return (
    <span className={`px-1.5 py-0.5 rounded text-[10px] font-mono ${color}`}>
      {dir}
    </span>
  )
}
