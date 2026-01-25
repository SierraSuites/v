'use client'

import confetti from 'canvas-confetti'

/**
 * Success Celebrations - Delightful confetti animations for major milestones
 *
 * Install: npm install canvas-confetti
 *
 * Usage:
 * import { celebrateProjectCompletion, celebrateMilestone } from '@/components/ui/SuccessCelebration'
 *
 * celebrateProjectCompletion() // When project marked complete
 * celebrateMilestone() // For other achievements
 */

// Main project completion celebration
export const celebrateProjectCompletion = () => {
  const duration = 3000
  const animationEnd = Date.now() + duration
  const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 0 }

  function randomInRange(min: number, max: number) {
    return Math.random() * (max - min) + min
  }

  const interval: any = setInterval(function() {
    const timeLeft = animationEnd - Date.now()

    if (timeLeft <= 0) {
      return clearInterval(interval)
    }

    const particleCount = 50 * (timeLeft / duration)

    // Burst from two sides
    confetti({
      ...defaults,
      particleCount,
      origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 }
    })
    confetti({
      ...defaults,
      particleCount,
      origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 }
    })
  }, 250)

  // Optional: Play success sound
  try {
    const audio = new Audio('/sounds/success.mp3')
    audio.volume = 0.3
    audio.play().catch(() => {
      // Silently fail if sound doesn't exist yet
    })
  } catch (error) {
    // Sound not available
  }
}

// Milestone reached celebration
export const celebrateMilestone = () => {
  confetti({
    particleCount: 100,
    spread: 70,
    origin: { y: 0.6 },
    colors: ['#FF6B35', '#004E89', '#F7B801', '#1A936F']
  })
}

// Quote accepted celebration
export const celebrateQuoteAccepted = () => {
  const end = Date.now() + 2000

  const frame = () => {
    confetti({
      particleCount: 2,
      angle: 60,
      spread: 55,
      origin: { x: 0 },
      colors: ['#10B981', '#34D399', '#6EE7B7']
    })
    confetti({
      particleCount: 2,
      angle: 120,
      spread: 55,
      origin: { x: 1 },
      colors: ['#10B981', '#34D399', '#6EE7B7']
    })

    if (Date.now() < end) {
      requestAnimationFrame(frame)
    }
  }

  frame()
}

// All punch items resolved
export const celebratePunchListComplete = () => {
  confetti({
    particleCount: 150,
    spread: 180,
    origin: { y: 0.6 },
    colors: ['#3B82F6', '#60A5FA', '#93C5FD'],
    shapes: ['circle', 'square'],
    gravity: 1.2,
    scalar: 1.2
  })
}

// Budget came in under estimate
export const celebrateBudgetSuccess = () => {
  const defaults = {
    spread: 360,
    ticks: 50,
    gravity: 0,
    decay: 0.94,
    startVelocity: 30,
    colors: ['#10B981', '#059669', '#047857']
  }

  function shoot() {
    confetti({
      ...defaults,
      particleCount: 40,
      scalar: 1.2,
      shapes: ['star']
    })

    confetti({
      ...defaults,
      particleCount: 10,
      scalar: 0.75,
      shapes: ['circle']
    })
  }

  setTimeout(shoot, 0)
  setTimeout(shoot, 100)
  setTimeout(shoot, 200)
}

// Task completed (subtle)
export const celebrateTaskComplete = () => {
  confetti({
    particleCount: 30,
    spread: 50,
    origin: { y: 0.7 },
    colors: ['#3B82F6', '#60A5FA'],
    gravity: 1.5,
    scalar: 0.8,
    ticks: 40
  })
}

// Photo upload success (quick burst)
export const celebratePhotoUpload = () => {
  confetti({
    particleCount: 20,
    spread: 40,
    origin: { y: 0.8 },
    colors: ['#8B5CF6', '#A78BFA'],
    gravity: 2,
    scalar: 0.6,
    ticks: 30
  })
}

// First project created
export const celebrateFirstProject = () => {
  const duration = 5000
  const animationEnd = Date.now() + duration
  const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 0 }

  function randomInRange(min: number, max: number) {
    return Math.random() * (max - min) + min
  }

  const interval: any = setInterval(function() {
    const timeLeft = animationEnd - Date.now()

    if (timeLeft <= 0) {
      return clearInterval(interval)
    }

    const particleCount = 50 * (timeLeft / duration)

    confetti({
      ...defaults,
      particleCount,
      origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 }
    })
    confetti({
      ...defaults,
      particleCount,
      origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 }
    })
  }, 250)
}

// Custom celebration with options
export const celebrate = (options?: {
  particleCount?: number
  spread?: number
  colors?: string[]
  duration?: number
}) => {
  const {
    particleCount = 100,
    spread = 70,
    colors = ['#3B82F6', '#10B981', '#F59E0B'],
    duration = 1000
  } = options || {}

  confetti({
    particleCount,
    spread,
    origin: { y: 0.6 },
    colors
  })
}

// Fireworks celebration (most dramatic)
export const celebrateFireworks = () => {
  const duration = 3000
  const animationEnd = Date.now() + duration

  const interval: any = setInterval(function() {
    const timeLeft = animationEnd - Date.now()

    if (timeLeft <= 0) {
      return clearInterval(interval)
    }

    confetti({
      particleCount: 50,
      startVelocity: 30,
      spread: 360,
      origin: {
        x: Math.random(),
        y: Math.random() - 0.2
      },
      colors: ['#FF6B35', '#004E89', '#F7B801', '#1A936F', '#8B5CF6']
    })
  }, 400)
}
