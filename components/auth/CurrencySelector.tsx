"use client"
import { currencies } from '@/lib/currencies'
import type { Currency } from '@/types/international'

interface CurrencySelectorProps {
  value: Currency
  onChange: (currency: Currency) => void
}

export function CurrencySelector({ value, onChange }: CurrencySelectorProps) {
  return (
    <div className="flex gap-2 flex-wrap justify-center mb-6">
      {currencies.map((currency) => (
        <button
          key={currency.value}
          type="button"
          onClick={() => onChange(currency.value)}
          className={`px-6 py-3 rounded-lg border-2 transition-all ${
            value === currency.value
              ? 'border-[#1E3A8A] bg-[#1E3A8A]/5 text-[#1E3A8A] font-semibold'
              : 'border-border hover:border-primary/50'
          }`}
        >
          <div className="text-sm font-medium">{currency.symbol}</div>
          <div className="text-xs text-muted-foreground mt-1">
            {currency.value.toUpperCase()}
          </div>
        </button>
      ))}
    </div>
  )
}
