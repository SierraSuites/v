import { describe, it, expect } from 'vitest'
import {
  formatCurrency,
  formatCurrencyExact,
  formatNumber,
  formatDate,
  formatDateLong,
  formatPercent,
  formatFileSize,
  formatRelativeTime,
} from '@/lib/utils/formatting'

describe('formatCurrency', () => {
  it('formats whole dollar amounts without decimals', () => {
    expect(formatCurrency(1000)).toBe('$1,000')
    expect(formatCurrency(250000)).toBe('$250,000')
  })

  it('formats zero as $0', () => {
    expect(formatCurrency(0)).toBe('$0')
  })

  it('formats negative amounts', () => {
    expect(formatCurrency(-500)).toBe('-$500')
  })

  it('rounds decimals for display', () => {
    expect(formatCurrency(1234.56)).toBe('$1,235')
  })
})

describe('formatCurrencyExact', () => {
  it('includes two decimal places', () => {
    expect(formatCurrencyExact(1000)).toBe('$1,000.00')
    expect(formatCurrencyExact(1234.56)).toBe('$1,234.56')
  })

  it('formats zero as $0.00', () => {
    expect(formatCurrencyExact(0)).toBe('$0.00')
  })
})

describe('formatNumber', () => {
  it('adds thousand separators', () => {
    expect(formatNumber(1000000)).toBe('1,000,000')
    expect(formatNumber(1234)).toBe('1,234')
  })

  it('formats zero', () => {
    expect(formatNumber(0)).toBe('0')
  })
})

describe('formatPercent', () => {
  it('appends percent sign', () => {
    expect(formatPercent(75)).toBe('75%')
    expect(formatPercent(0)).toBe('0%')
    expect(formatPercent(100)).toBe('100%')
  })

  it('rounds to whole numbers', () => {
    expect(formatPercent(75.6)).toBe('76%')
  })
})

describe('formatFileSize', () => {
  it('formats bytes', () => {
    expect(formatFileSize(512)).toBe('512 B')
  })

  it('formats kilobytes', () => {
    expect(formatFileSize(1024)).toBe('1.0 KB')
    expect(formatFileSize(2048)).toBe('2.0 KB')
  })

  it('formats megabytes', () => {
    expect(formatFileSize(1024 * 1024)).toBe('1.0 MB')
  })

  it('formats gigabytes', () => {
    expect(formatFileSize(1024 * 1024 * 1024)).toBe('1.0 GB')
  })
})

describe('formatDate', () => {
  it('returns a non-empty string for a valid date', () => {
    const result = formatDate('2026-03-15')
    expect(typeof result).toBe('string')
    expect(result.length).toBeGreaterThan(0)
  })

  it('handles Date objects', () => {
    const result = formatDate(new Date('2026-01-01'))
    expect(typeof result).toBe('string')
  })
})

describe('formatDateLong', () => {
  it('returns a longer format than formatDate', () => {
    const date = '2026-03-15'
    const short = formatDate(date)
    const long = formatDateLong(date)
    expect(long.length).toBeGreaterThanOrEqual(short.length)
  })
})

describe('formatRelativeTime', () => {
  it('returns "just now" for very recent timestamps', () => {
    const now = new Date().toISOString()
    expect(formatRelativeTime(now)).toMatch(/just now|seconds? ago/i)
  })

  it('returns a string for old dates', () => {
    const old = new Date('2020-01-01').toISOString()
    const result = formatRelativeTime(old)
    expect(typeof result).toBe('string')
    expect(result.length).toBeGreaterThan(0)
  })
})
