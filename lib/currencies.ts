import type { Currency, PriceMapping } from '@/types/international'

export const currencySymbols: Record<Currency, string> = {
  usd: '$',
  gbp: '£',
  eur: '€',
  cad: 'CA$',
}

export const currencyNames: Record<Currency, string> = {
  usd: 'US Dollar',
  gbp: 'British Pound',
  eur: 'Euro',
  cad: 'Canadian Dollar',
}

export const priceMapping: PriceMapping = {
  starter: {
    usd: 49,
    gbp: 39,
    eur: 45,
    cad: 65,
  },
  professional: {
    usd: 88,
    gbp: 70,
    eur: 80,
    cad: 115,
  },
  enterprise: {
    usd: 149,
    gbp: 120,
    eur: 135,
    cad: 195,
  },
}

export function formatPrice(amount: number, currency: Currency): string {
  const symbol = currencySymbols[currency]
  const formattedAmount = new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount)

  return `${symbol}${formattedAmount}`
}

export function getCurrencyByCountry(countryCode: string): Currency {
  const mapping: Record<string, Currency> = {
    US: 'usd',
    GB: 'gbp',
    UK: 'gbp',
    FR: 'eur',
    DE: 'eur',
    IT: 'eur',
    ES: 'eur',
    NL: 'eur',
    BE: 'eur',
    AT: 'eur',
    IE: 'eur',
    PT: 'eur',
    GR: 'eur',
    FI: 'eur',
    CA: 'cad',
  }

  return mapping[countryCode.toUpperCase()] || 'usd'
}

export const currencies: Array<{ value: Currency; label: string; symbol: string }> = [
  { value: 'usd', label: 'USD - US Dollar', symbol: '$' },
  { value: 'gbp', label: 'GBP - British Pound', symbol: '£' },
  { value: 'eur', label: 'EUR - Euro', symbol: '€' },
  { value: 'cad', label: 'CAD - Canadian Dollar', symbol: 'CA$' },
]
