'use client'

import { useState, useEffect } from 'react'
import { useTheme } from 'next-themes'

export function useThemeColors() {
  const { theme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])
  const darkMode = mounted ? theme === 'dark' : false

  const colors = {
    bg: darkMode ? '#1a1d2e' : '#FFFFFF',
    bgAlt: darkMode ? '#252a3a' : '#F8F9FA',
    bgMuted: darkMode ? '#374151' : '#E0E0E0',
    border: darkMode ? '1px solid #2d3548' : '1px solid #E0E0E0',
    borderBottom: darkMode ? '1px solid #2d3548' : '1px solid #E0E0E0',
    text: darkMode ? '#e2e8f0' : '#1A1A1A',
    textMuted: darkMode ? '#94a3b8' : '#4A4A4A',
  }

  return { colors, darkMode, setTheme }
}
