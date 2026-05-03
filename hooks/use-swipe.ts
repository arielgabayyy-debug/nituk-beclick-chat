import { useRef, useCallback } from 'react'

interface SwipeOptions {
  onSwipeLeft?: () => void
  onSwipeRight?: () => void
  onSwipeUp?: () => void
  onSwipeDown?: () => void
  threshold?: number // px
}

export function useSwipe({ onSwipeLeft, onSwipeRight, onSwipeUp, onSwipeDown, threshold = 50 }: SwipeOptions) {
  const startX = useRef<number | null>(null)
  const startY = useRef<number | null>(null)

  const onTouchStart = useCallback((e: React.TouchEvent) => {
    startX.current = e.touches[0].clientX
    startY.current = e.touches[0].clientY
  }, [])

  const onTouchEnd = useCallback((e: React.TouchEvent) => {
    if (startX.current === null || startY.current === null) return
    const dx = e.changedTouches[0].clientX - startX.current
    const dy = e.changedTouches[0].clientY - startY.current
    const absDx = Math.abs(dx)
    const absDy = Math.abs(dy)

    if (absDx > threshold && absDx > absDy) {
      if (dx > 0) { onSwipeRight?.() } else { onSwipeLeft?.() }
    } else if (absDy > threshold && absDy > absDx) {
      if (dy > 0) { onSwipeDown?.() } else { onSwipeUp?.() }
    }

    startX.current = null
    startY.current = null
  }, [onSwipeLeft, onSwipeRight, onSwipeUp, onSwipeDown, threshold])

  return { onTouchStart, onTouchEnd }
}
