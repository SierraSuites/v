"use client"

import { useState, useEffect } from 'react'
import { useTheme } from 'next-themes'
import { getWeatherByCountry, isWeatherSuitable } from '@/lib/weather'

interface Task {
  id: string
  title: string
  dueDate: string
  weatherDependent: boolean
  trade: string
}

interface WeatherWidgetProps {
  tasks: Task[]
  countryCode?: string
}

export default function WeatherWidget({ tasks, countryCode = 'US' }: WeatherWidgetProps) {
  const [weather, setWeather] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const { theme } = useTheme()
  const darkMode = theme === 'dark'

  const cardBg     = 'var(--c-card-bg)'
  const cardBorder = 'var(--c-border)'
  const textPrimary   = 'var(--c-text-primary)'
  const textSecondary = 'var(--c-text-secondary)'
  const subBg      = 'var(--c-sub-bg)'

  useEffect(() => {
    async function fetchWeather() {
      setLoading(true)
      const data = await getWeatherByCountry(countryCode)
      setWeather(data)
      setLoading(false)
    }

    fetchWeather()
  }, [countryCode])

  // Get weather-dependent tasks in the next 7 days
  const weatherDependentTasks = tasks.filter(t => {
    if (!t.weatherDependent) return false

    const dueDate = new Date(t.dueDate)
    const today = new Date()
    const sevenDaysFromNow = new Date()
    sevenDaysFromNow.setDate(today.getDate() + 7)

    return dueDate >= today && dueDate <= sevenDaysFromNow
  })

  if (loading) {
    return (
      <div className="rounded-xl p-6" style={{ backgroundColor: cardBg, border: `1px solid ${cardBorder}`, boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }}>
        <div className="flex items-center justify-center h-32">
          <div className="animate-spin w-8 h-8 border-4 border-t-transparent rounded-full" style={{ borderColor: '#FF6B6B', borderTopColor: 'transparent' }}></div>
        </div>
      </div>
    )
  }

  if (!weather) {
    return (
      <div className="rounded-xl p-6" style={{ backgroundColor: cardBg, border: `1px solid ${cardBorder}`, boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }}>
        <div className="text-center">
          <span className="text-4xl mb-2 block">🌤️</span>
          <p className="text-sm font-semibold mb-1" style={{ color: textPrimary }}>Weather Data Unavailable</p>
          <p className="text-xs" style={{ color: textSecondary }}>
            Configure NEXT_PUBLIC_WEATHER_API_KEY to see weather data
          </p>
        </div>
      </div>
    )
  }

  const suitability = isWeatherSuitable(weather)
  const suitabilityColor = suitability.suitable
    ? { bg: darkMode ? '#1a3a2a' : '#E6F9EA', border: '#6BCB77', text: textPrimary }
    : { bg: darkMode ? '#3a1a1a' : '#FEE2E2', border: '#DC2626', text: textPrimary }

  return (
    <div className="rounded-xl p-6" style={{ backgroundColor: cardBg, border: `1px solid ${cardBorder}`, boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }}>
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-bold" style={{ color: textPrimary }}>Weather Conditions</h3>
        <span className="text-4xl">{weather.icon}</span>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-6">
        <div>
          <p className="text-xs font-semibold mb-1" style={{ color: textSecondary }}>Temperature</p>
          <p className="text-2xl font-bold" style={{ color: textPrimary }}>{weather.temp}°F</p>
        </div>
        <div>
          <p className="text-xs font-semibold mb-1" style={{ color: textSecondary }}>Wind Speed</p>
          <p className="text-2xl font-bold" style={{ color: textPrimary }}>{weather.windSpeed} mph</p>
        </div>
        <div>
          <p className="text-xs font-semibold mb-1" style={{ color: textSecondary }}>Precipitation</p>
          <p className="text-2xl font-bold" style={{ color: textPrimary }}>{weather.precipitation}%</p>
        </div>
        <div>
          <p className="text-xs font-semibold mb-1" style={{ color: textSecondary }}>Condition</p>
          <p className="text-sm font-semibold" style={{ color: textPrimary }}>{weather.condition}</p>
        </div>
      </div>

      {/* Weather Suitability */}
      <div
        className="rounded-lg p-4 mb-4"
        style={{ backgroundColor: suitabilityColor.bg, border: `2px solid ${suitabilityColor.border}` }}
      >
        <div className="flex items-start gap-3">
          <span className="text-2xl flex-shrink-0">
            {suitability.suitable ? '✅' : '⚠️'}
          </span>
          <div className="flex-1">
            <p className="font-bold text-sm mb-1" style={{ color: suitabilityColor.text }}>
              {suitability.suitable ? 'Suitable for Construction' : 'Weather Alert'}
            </p>
            {!suitability.suitable && suitability.reasons.length > 0 && (
              <ul className="text-xs space-y-1" style={{ color: suitabilityColor.text }}>
                {suitability.reasons.map((reason, index) => (
                  <li key={index}>• {reason}</li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>

      {/* Weather-Dependent Tasks */}
      {weatherDependentTasks.length > 0 && (
        <div>
          <p className="text-sm font-bold mb-3" style={{ color: textPrimary }}>
            Weather-Dependent Tasks ({weatherDependentTasks.length})
          </p>
          <div className="space-y-2 max-h-48 overflow-y-auto">
            {weatherDependentTasks.map(task => (
              <div
                key={task.id}
                className="p-3 rounded-lg flex items-center justify-between"
                style={{ backgroundColor: subBg, border: `1px solid ${cardBorder}` }}
              >
                <div className="flex-1">
                  <p className="text-sm font-semibold mb-1" style={{ color: textPrimary }}>
                    {task.title}
                  </p>
                  <div className="flex items-center gap-2 text-xs" style={{ color: textSecondary }}>
                    <span>{task.trade}</span>
                    <span>•</span>
                    <span>Due: {new Date(task.dueDate).toLocaleDateString()}</span>
                  </div>
                </div>
                <span className="text-lg flex-shrink-0">🌤️</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {weatherDependentTasks.length === 0 && (
        <div className="text-center py-4">
          <p className="text-sm" style={{ color: textSecondary }}>
            No weather-dependent tasks in the next 7 days
          </p>
        </div>
      )}
    </div>
  )
}
