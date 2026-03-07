export function InputStr({ value }: { value: string }) {
  if (!value) return <span className="text-gray-600 italic">ε</span>
  return (
    <span>
      <span className="text-emerald-300 font-bold">{value[0]}</span>
      <span className="text-gray-500">{value.slice(1)}</span>
    </span>
  )
}
