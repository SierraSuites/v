export const dynamic = 'force-dynamic'

// ============================================================================
// WEATHER PROXY ROUTE
//
// This route proxies Open-Meteo (https://open-meteo.com) — a free, no-API-key
// weather service. The proxy exists because the browser CSP in next.config.mjs
// only permits same-origin connections from the client; fetching Open-Meteo
// directly from a 'use client' component would be blocked.
//
// To switch to a paid provider (e.g. OpenWeatherMap, Tomorrow.io, WeatherAPI):
//   1. Add your key to .env.local:  WEATHER_API_KEY=your_key_here
//   2. Replace the Open-Meteo fetch below with a call to the new provider's API.
//   3. Remap the response fields to the shared WeatherData shape returned at
//      the bottom of the handler (temp, windSpeed, precipitation, condition,
//      icon, locationName). No changes needed in lib/weather.ts or the widget.
//   Note: use WEATHER_API_KEY (no NEXT_PUBLIC_ prefix) so the key stays
//   server-side only and is never exposed to the browser bundle.
// ============================================================================

import { NextRequest, NextResponse } from 'next/server'

// WMO weather code → human-readable condition + emoji
function wmoToCondition(code: number): { condition: string; icon: string } {
  if (code === 0)  return { condition: 'Clear',         icon: '☀️' }
  if (code <= 3)   return { condition: 'Partly Cloudy', icon: '⛅' }
  if (code <= 48)  return { condition: 'Foggy',         icon: '🌫️' }
  if (code <= 57)  return { condition: 'Drizzle',       icon: '🌦️' }
  if (code <= 67)  return { condition: 'Rain',          icon: '🌧️' }
  if (code <= 77)  return { condition: 'Snow',          icon: '❄️' }
  if (code <= 82)  return { condition: 'Rain Showers',  icon: '🌦️' }
  if (code <= 86)  return { condition: 'Snow Showers',  icon: '🌨️' }
  if (code >= 95)  return { condition: 'Thunderstorm',  icon: '⛈️' }
  return                  { condition: 'Cloudy',        icon: '☁️' }
}

/**
 * GET /api/weather?lat=40.71&lon=-74.00&location=New+York
 * Proxies Open-Meteo on the server side, keeping the browser CSP clean.
 */
export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl
  const lat = parseFloat(searchParams.get('lat') ?? '40.7128')
  const lon = parseFloat(searchParams.get('lon') ?? '-74.0060')
  const locationName = searchParams.get('location') ?? 'New York'

  if (isNaN(lat) || isNaN(lon)) {
    return NextResponse.json({ error: 'Invalid coordinates' }, { status: 400 })
  }

  try {
    const url =
      `https://api.open-meteo.com/v1/forecast` +
      `?latitude=${lat}&longitude=${lon}` +
      `&current=temperature_2m,wind_speed_10m,precipitation,weather_code` +
      `&temperature_unit=fahrenheit&wind_speed_unit=mph&precipitation_unit=inch`

    const res = await fetch(url, { next: { revalidate: 300 } }) // cache 5 min
    if (!res.ok) throw new Error(`Open-Meteo error: ${res.statusText}`)

    const data = await res.json()
    const cur = data.current
    const { condition, icon } = wmoToCondition(cur.weather_code ?? 0)

    return NextResponse.json({
      temp: Math.round(cur.temperature_2m ?? 0),
      windSpeed: Math.round(cur.wind_speed_10m ?? 0),
      precipitation: Math.min(100, Math.round((cur.precipitation ?? 0) * 200)),
      condition,
      icon,
      locationName,
    })
  } catch (error) {
    console.error('[GET /api/weather] Error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch weather data' },
      { status: 502 }
    )
  }
}
