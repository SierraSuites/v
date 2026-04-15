// ============================================================================
// WEATHER API INTEGRATION
//
// Current implementation: Open-Meteo (https://open-meteo.com)
//   - Completely free, no API key required.
//   - Fetches happen server-side via the /api/weather proxy route so the
//     browser CSP (connect-src in next.config.mjs) is never violated.
//
// To switch to a paid provider (OpenWeatherMap, Tomorrow.io, etc.):
//   - Update /app/api/weather/route.ts to call the new provider's API.
//   - The WeatherData shape and all downstream consumers (WeatherWidget,
//     isWeatherSuitable) remain unchanged — no edits needed here.
//
// API key note: if you do add a key, put it in .env.local as WEATHER_API_KEY
// (server-only, no NEXT_PUBLIC_ prefix). The /api/weather route reads it on
// the server; the browser never sees it.
// ============================================================================

export interface WeatherData {
  temp: number
  windSpeed: number
  precipitation: number
  condition: string
  icon: string
  locationName?: string
}

interface WeatherCache {
  data: WeatherData
  timestamp: number
}

const CACHE_DURATION = 5 * 60 * 1000 // 5 minutes
const cache: Map<string, WeatherCache> = new Map()

// WMO weather code → human-readable condition + emoji
function wmoToCondition(code: number): { condition: string; icon: string } {
  if (code === 0)          return { condition: 'Clear',         icon: '☀️' }
  if (code <= 3)           return { condition: 'Partly Cloudy', icon: '⛅' }
  if (code <= 48)          return { condition: 'Foggy',         icon: '🌫️' }
  if (code <= 57)          return { condition: 'Drizzle',       icon: '🌦️' }
  if (code <= 67)          return { condition: 'Rain',          icon: '🌧️' }
  if (code <= 77)          return { condition: 'Snow',          icon: '❄️' }
  if (code <= 82)          return { condition: 'Rain Showers',  icon: '🌦️' }
  if (code <= 86)          return { condition: 'Snow Showers',  icon: '🌨️' }
  if (code >= 95)          return { condition: 'Thunderstorm',  icon: '⛈️' }
  return                          { condition: 'Cloudy',        icon: '☁️' }
}

/**
 * Fetch weather via the /api/weather proxy route (avoids browser CSP restrictions).
 * Falls back to null on error.
 */
export async function getWeatherByCoords(
  lat: number,
  lon: number,
  locationName = 'Current Location'
): Promise<WeatherData | null> {
  const cacheKey = `${lat.toFixed(2)},${lon.toFixed(2)}`
  const cached = cache.get(cacheKey)
  if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
    return cached.data
  }

  try {
    const params = new URLSearchParams({
      lat: String(lat),
      lon: String(lon),
      location: locationName,
    })
    const res = await fetch(`/api/weather?${params}`)
    if (!res.ok) throw new Error(`Weather proxy error: ${res.statusText}`)

    const weatherData: WeatherData = await res.json()
    cache.set(cacheKey, { data: weatherData, timestamp: Date.now() })
    return weatherData
  } catch (error) {
    console.error('Error fetching weather:', error)
    return null
  }
}

// Country to major city mapping for weather lookup (used when geolocation is unavailable)
const countryToCityMap: Record<string, { name: string; lat: number; lon: number }> = {
  US: { name: 'New York',    lat: 40.7128,  lon: -74.0060 },
  GB: { name: 'London',      lat: 51.5074,  lon: -0.1278  },
  CA: { name: 'Toronto',     lat: 43.6532,  lon: -79.3832 },
  AU: { name: 'Sydney',      lat: -33.8688, lon: 151.2093 },
  DE: { name: 'Berlin',      lat: 52.5200,  lon: 13.4050  },
  FR: { name: 'Paris',       lat: 48.8566,  lon: 2.3522   },
  IT: { name: 'Rome',        lat: 41.9028,  lon: 12.4964  },
  ES: { name: 'Madrid',      lat: 40.4168,  lon: -3.7038  },
  IN: { name: 'Mumbai',      lat: 19.0760,  lon: 72.8777  },
  JP: { name: 'Tokyo',       lat: 35.6762,  lon: 139.6503 },
  CN: { name: 'Beijing',     lat: 39.9042,  lon: 116.4074 },
  BR: { name: 'São Paulo',   lat: -23.5505, lon: -46.6333 },
  MX: { name: 'Mexico City', lat: 19.4326,  lon: -99.1332 },
}

// Used when geolocation is unavailable — resolves a country code to a city's
// coordinates and delegates to getWeatherByCoords (Open-Meteo proxy).
//
// The OpenWeatherMap branch below is dormant: the widget calls getWeatherByCoords
// directly. It is kept here as the migration path — if you add a paid key and
// want per-country fallback behaviour, wire WeatherWidget to call this function
// instead and the OpenWeatherMap path will activate automatically.
export async function getWeatherByCountry(countryCode: string): Promise<WeatherData | null> {
  const apiKey = process.env.NEXT_PUBLIC_WEATHER_API_KEY

  // If NEXT_PUBLIC_WEATHER_API_KEY is set, prefer OpenWeatherMap over Open-Meteo.
  // To fully activate this path, update WeatherWidget to call getWeatherByCountry
  // instead of getWeatherByCoords directly.
  if (apiKey && apiKey !== 'your_openweather_api_key_here') {
    const cacheKey = countryCode
    const cached = cache.get(cacheKey)
    if (cached && Date.now() - cached.timestamp < CACHE_DURATION) return cached.data

    try {
      const location = countryToCityMap[countryCode] || countryToCityMap['US']
      const res = await fetch(
        `https://api.openweathermap.org/data/2.5/weather?lat=${location.lat}&lon=${location.lon}&appid=${apiKey}&units=imperial`
      )
      if (!res.ok) throw new Error(`Weather API error: ${res.statusText}`)
      const data = await res.json()

      const weatherData: WeatherData = {
        temp: Math.round(data.main.temp),
        windSpeed: Math.round(data.wind.speed),
        precipitation: data.rain ? Math.round((data.rain['1h'] || 0) * 100) : 0,
        condition: data.weather[0].main,
        icon: getWeatherIcon(data.weather[0].main),
        locationName: location.name,
      }
      cache.set(cacheKey, { data: weatherData, timestamp: Date.now() })
      return weatherData
    } catch (error) {
      console.error('Error fetching weather from OpenWeatherMap:', error)
    }
  }

  // Fallback: Open-Meteo (no API key required)
  const location = countryToCityMap[countryCode] || countryToCityMap['US']
  return getWeatherByCoords(location.lat, location.lon, location.name)
}

function getWeatherIcon(condition: string): string {
  const iconMap: Record<string, string> = {
    'Clear': '☀️',
    'Clouds': '☁️',
    'Rain': '🌧️',
    'Drizzle': '🌦️',
    'Thunderstorm': '⛈️',
    'Snow': '❄️',
    'Mist': '🌫️',
    'Fog': '🌫️',
    'Haze': '🌫️'
  }

  return iconMap[condition] || '🌤️'
}

// Get weather data by GPS coordinates (for FieldSnap capture)
export async function getWeatherData(latitude: number, longitude: number): Promise<{
  condition: string
  temperature: number
  humidity: number
  wind_speed: number
  visibility: number
} | null> {
  const apiKey = process.env.NEXT_PUBLIC_WEATHER_API_KEY

  // Check if API key is configured
  if (!apiKey || apiKey === 'your_openweather_api_key_here') {
    console.warn('Weather API key not configured. Please add NEXT_PUBLIC_WEATHER_API_KEY to .env.local')
    return null
  }

  // Check cache first
  const cacheKey = `${latitude.toFixed(2)},${longitude.toFixed(2)}`
  const cached = cache.get(cacheKey)
  if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
    const data = cached.data
    return {
      condition: data.condition,
      temperature: data.temp,
      humidity: 0, // Will be populated from API
      wind_speed: data.windSpeed,
      visibility: 10 // Default 10km
    }
  }

  try {
    // Fetch weather data from OpenWeatherMap
    const response = await fetch(
      `https://api.openweathermap.org/data/2.5/weather?lat=${latitude}&lon=${longitude}&appid=${apiKey}&units=imperial`
    )

    if (!response.ok) {
      throw new Error(`Weather API error: ${response.statusText}`)
    }

    const data = await response.json()

    // Extract construction-relevant data
    const weatherData = {
      condition: data.weather[0].main,
      temperature: Math.round(data.main.temp),
      humidity: data.main.humidity,
      wind_speed: Math.round(data.wind.speed),
      visibility: data.visibility ? Math.round(data.visibility / 1000) : 10 // Convert to km
    }

    // Cache the result
    cache.set(cacheKey, {
      data: {
        temp: weatherData.temperature,
        windSpeed: weatherData.wind_speed,
        precipitation: data.rain ? Math.round((data.rain['1h'] || 0) * 100) : 0,
        condition: weatherData.condition,
        icon: getWeatherIcon(weatherData.condition)
      },
      timestamp: Date.now()
    })

    return weatherData
  } catch (error) {
    console.error('Error fetching weather:', error)
    return null
  }
}

// Helper function to determine if weather is suitable for construction
export function isWeatherSuitable(weather: WeatherData): {
  suitable: boolean
  reasons: string[]
} {
  const reasons: string[] = []
  let suitable = true

  // Check temperature (too cold or too hot affects concrete curing)
  if (weather.temp < 40) {
    suitable = false
    reasons.push('Temperature too low for concrete work')
  } else if (weather.temp > 95) {
    suitable = false
    reasons.push('Extreme heat - risk of heat stress')
  }

  // Check wind speed (affects crane operations, scaffolding)
  if (weather.windSpeed > 25) {
    suitable = false
    reasons.push('Wind speed too high for crane operations')
  }

  // Check precipitation (delays most outdoor work)
  if (weather.precipitation > 30) {
    suitable = false
    reasons.push('High precipitation - outdoor work not recommended')
  }

  return { suitable, reasons }
}
