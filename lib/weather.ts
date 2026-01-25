// Weather API integration for construction-relevant metrics

interface WeatherData {
  temp: number
  windSpeed: number
  precipitation: number
  condition: string
  icon: string
}

interface WeatherCache {
  data: WeatherData
  timestamp: number
}

const CACHE_DURATION = 5 * 60 * 1000 // 5 minutes
const cache: Map<string, WeatherCache> = new Map()

// Country to major city mapping for weather lookup
const countryToCityMap: Record<string, { name: string; lat: number; lon: number }> = {
  US: { name: 'New York', lat: 40.7128, lon: -74.0060 },
  GB: { name: 'London', lat: 51.5074, lon: -0.1278 },
  CA: { name: 'Toronto', lat: 43.6532, lon: -79.3832 },
  AU: { name: 'Sydney', lat: -33.8688, lon: 151.2093 },
  DE: { name: 'Berlin', lat: 52.5200, lon: 13.4050 },
  FR: { name: 'Paris', lat: 48.8566, lon: 2.3522 },
  IT: { name: 'Rome', lat: 41.9028, lon: 12.4964 },
  ES: { name: 'Madrid', lat: 40.4168, lon: -3.7038 },
  IN: { name: 'Mumbai', lat: 19.0760, lon: 72.8777 },
  JP: { name: 'Tokyo', lat: 35.6762, lon: 139.6503 },
  CN: { name: 'Beijing', lat: 39.9042, lon: 116.4074 },
  BR: { name: 'São Paulo', lat: -23.5505, lon: -46.6333 },
  MX: { name: 'Mexico City', lat: 19.4326, lon: -99.1332 },
  // Add more countries as needed
}

export async function getWeatherByCountry(countryCode: string): Promise<WeatherData | null> {
  const apiKey = process.env.NEXT_PUBLIC_WEATHER_API_KEY

  // Check if API key is configured
  if (!apiKey || apiKey === 'your_openweather_api_key_here') {
    console.warn('Weather API key not configured. Please add NEXT_PUBLIC_WEATHER_API_KEY to .env.local')
    return null
  }

  // Check cache first
  const cacheKey = countryCode
  const cached = cache.get(cacheKey)
  if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
    return cached.data
  }

  try {
    // Get coordinates for country
    const location = countryToCityMap[countryCode] || countryToCityMap['US']

    // Fetch weather data from OpenWeatherMap
    const response = await fetch(
      `https://api.openweathermap.org/data/2.5/weather?lat=${location.lat}&lon=${location.lon}&appid=${apiKey}&units=imperial`
    )

    if (!response.ok) {
      throw new Error(`Weather API error: ${response.statusText}`)
    }

    const data = await response.json()

    // Extract construction-relevant data
    const weatherData: WeatherData = {
      temp: Math.round(data.main.temp),
      windSpeed: Math.round(data.wind.speed),
      precipitation: data.rain ? Math.round((data.rain['1h'] || 0) * 100) : 0,
      condition: data.weather[0].main,
      icon: getWeatherIcon(data.weather[0].main)
    }

    // Cache the result
    cache.set(cacheKey, {
      data: weatherData,
      timestamp: Date.now()
    })

    return weatherData
  } catch (error) {
    console.error('Error fetching weather:', error)
    return null
  }
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
