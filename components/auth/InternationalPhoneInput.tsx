"use client"
import { useState } from 'react'
import { countries } from '@/lib/countries'

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
