import { useTheme } from 'next-themes'

export function AppPlaceholder() {
  const { theme } = useTheme()

  return (
    <div className="flex-grow flex flex-col justify-center items-center gap-6 text-center">
      <img
        src={
          theme === 'dark'
            ? '/logo-dark.svg'
            : '/logo-light.svg'
        }
        alt="App Logo"
        className="size-14"
      />
    </div>
  )
}
