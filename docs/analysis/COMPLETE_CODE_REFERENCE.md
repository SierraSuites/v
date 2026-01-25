# Complete Code Reference - Remaining Components

This document contains all the remaining code you need to copy and create files for.

## Components to Create

### 1. `components/auth/InternationalPhoneInput.tsx`

```tsx
"use client"
import { useState, useEffect } from 'react'
import { countries } from '@/lib/countries'
import { formatPhoneNumber } from '@/lib/phone-utils'

interface InternationalPhoneInputProps {
  value: string
  onChange: (value: string) => void
  countryCode: string
  onCountryCodeChange: (code: string) => void
  error?: string
}

export function InternationalPhoneInput({
  value,
  onChange,
  countryCode,
  onCountryCodeChange,
  error,
}: InternationalPhoneInputProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [search, setSearch] = useState('')

  const selectedCountry = countries.find((c) => c.code === countryCode) || countries[0]

  const filteredCountries = countries.filter((country) =>
    country.name.toLowerCase().includes(search.toLowerCase()) ||
    country.dialCode.includes(search)
  )

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const input = e.target.value
    onChange(input)
  }

  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        {/* Country Code Selector */}
        <div className="relative">
          <button
            type="button"
            onClick={() => setIsOpen(!isOpen)}
            className="flex items-center gap-2 h-10 px-3 rounded-md border border-input bg-background hover:bg-accent transition-colors"
          >
            <span className="text-2xl">{selectedCountry.flag}</span>
            <span className="text-sm font-medium">{selectedCountry.dialCode}</span>
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>

          {isOpen && (
            <>
              <div
                className="fixed inset-0 z-40"
                onClick={() => setIsOpen(false)}
              />
              <div className="absolute top-full left-0 mt-1 w-80 bg-card border border-border rounded-md shadow-lg z-50 max-h-96 overflow-hidden flex flex-col">
                <div className="p-2 border-b border-border">
                  <input
                    type="text"
                    placeholder="Search countries..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="w-full px-3 py-2 rounded-md border border-input bg-background focus:outline-none focus:ring-2 focus:ring-ring text-sm"
                  />
                </div>
                <div className="overflow-y-auto">
                  {filteredCountries.map((country) => (
                    <button
                      key={country.code}
                      type="button"
                      onClick={() => {
                        onCountryCodeChange(country.code)
                        setIsOpen(false)
                        setSearch('')
                      }}
                      className="w-full flex items-center gap-3 px-3 py-2 hover:bg-accent transition-colors text-left"
                    >
                      <span className="text-2xl">{country.flag}</span>
                      <span className="flex-1 text-sm">{country.name}</span>
                      <span className="text-sm text-muted-foreground">{country.dialCode}</span>
                    </button>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>

        {/* Phone Number Input */}
        <input
          type="tel"
          value={value}
          onChange={handlePhoneChange}
          placeholder="Phone number"
          className={`flex-1 h-10 px-3 rounded-md border ${
            error ? 'border-destructive' : 'border-input'
          } bg-background focus:outline-none focus:ring-2 focus:ring-ring`}
        />
      </div>
      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  )
}
```

### 2. `components/auth/CurrencySelector.tsx`

```tsx
"use client"
import { currencies, currencySymbols } from '@/lib/currencies'
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
```

### 3. Update the Installation Guide

## Installation & Setup Steps

1. **Install dependencies:**
```bash
cd C:\Users\u\Desktop\new
pnpm install
```

2. **Set up Supabase Database** - Run the SQL from IMPLEMENTATION_GUIDE.md

3. **Create Stripe Products & Prices** - Follow steps in IMPLEMENTATION_GUIDE.md

4. **Set up Stripe Webhook**:
```bash
stripe listen --forward-to localhost:3000/api/webhooks/stripe
```

5. **Test the application:**
```bash
pnpm dev
```

Visit `http://localhost:3000`

## Summary of What's Been Created

### ✅ Core Infrastructure (100% Complete)
- Environment configuration
- Supabase client setup (browser, server, middleware)
- TypeScript types
- Currency utilities
- Country data (65+ countries)
- Phone utilities
- Validation schemas (Zod)
- Stripe integration
- Middleware for session management

### ✅ API Routes (100% Complete)
- `/api/create-checkout-session` - Stripe checkout
- `/api/webhooks/stripe` - Webhook handler
- `/api/auth/session` - Session management

### ⏳ UI Components (Provided above)
- InternationalPhoneInput
- CurrencySelector

### ⏳ Pages (Existing pages need updates for full integration)
Your existing pages at:
- `app/register/page.tsx` - Needs multi-step form integration
- `app/login/page.tsx` - Needs Supabase auth integration
- Need to create: forgot-password, payment-success, payment-pending

## Next Steps

1. Create the two components listed above
2. Update your register page to use the multi-step form (I can provide this if needed)
3. Update your login page to use Supabase authentication
4. Create the payment status pages
5. Run `pnpm install` and test

Would you like me to create the complete updated register page with the multi-step form next?
