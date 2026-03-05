'use client'

import { useEffect } from 'react'

/**
 * Mounts invisibly and removes the #app-loading overlay once React has
 * hydrated and the component tree is interactive.
 */
export function LoadingScreenRemover() {
  useEffect(() => {
    const overlay = document.getElementById('app-loading')
    if (!overlay) return

    // Trigger the fade-out CSS transition
    overlay.classList.add('app-loading--hidden')

    const onEnd = () => {
      overlay.remove()
    }

    overlay.addEventListener('transitionend', onEnd, { once: true })

    // Safety fallback: remove after 800 ms even if transition never fires
    const timer = setTimeout(() => {
      overlay.remove()
    }, 800)

    return () => {
      clearTimeout(timer)
      overlay.removeEventListener('transitionend', onEnd)
    }
  }, [])

  return null
}
