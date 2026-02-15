'use client'

import { useState, useEffect } from 'react'
import { useTheme } from 'next-themes'

/**
 * Returns CSS variable-backed color values for use in inline style attributes.
 * All dark/light values are defined centrally in globals.css under :root and .dark.
 *
 * For Tailwind className usage, prefer semantic classes directly:
 *   bg-card, bg-muted, text-foreground, text-muted-foreground, border-border
 */
export function useThemeColors() {
  const { theme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])
  const darkMode = mounted ? theme === 'dark' : false

  // Values reference CSS variables from globals.css — no hardcoded colors here.
  // Dark mode is handled automatically by the .dark class on <html>.
  const colors = {
    bg: 'var(--card)',
    bgAlt: 'var(--muted)',
    bgMuted: 'var(--border)',
    border: '1px solid var(--border)',
    borderBottom: '1px solid var(--border)',
    text: 'var(--card-foreground)',
    textMuted: 'var(--muted-foreground)',
  }

  return { colors, darkMode, setTheme }
}
