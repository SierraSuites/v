# Weather API Setup Guide

Your dashboard now displays real-time weather data based on the user's location. This is crucial for construction planning (temperature, precipitation, wind speed).

## Getting Your Free Weather API Key

1. **Go to OpenWeatherMap**: https://openweathermap.org/api
2. **Sign up for a free account**: Click "Sign Up" in the top right
3. **Verify your email**: Check your inbox and click the verification link
4. **Get your API key**:
   - After logging in, go to: https://home.openweathermap.org/api_keys
   - Copy your default API key (it looks like: `a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6`)
   - Note: It may take 10-15 minutes for the key to activate after creation

5. **Add to your project**:
   - Open `.env.local`
   - Replace `your_openweather_api_key_here` with your actual API key:
   ```
   NEXT_PUBLIC_WEATHER_API_KEY=a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6
   ```
   - Save the file
   - Restart your dev server: `npm run dev`

## Free Tier Limits

- **60 calls/minute** (more than enough for dashboard)
- **1,000,000 calls/month** (approximately 1,388 calls/hour sustained)
- Perfect for personal/business use

## What Weather Data Shows

The dashboard displays construction-relevant weather:
- 🌤️ **Temperature** in Fahrenheit (can be changed to Celsius)
- 💨 **Wind Speed** in mph (important for crane operations, scaffolding)
- 💧 **Precipitation** percentage (rain delays)
- Weather conditions (sunny, cloudy, rainy, etc.)

## How It Works

1. **User Registration**: When users sign up, they provide their country
2. **Location Detection**: Dashboard uses the country to get coordinates
3. **Weather API Call**: Fetches current weather for that location
4. **Caching**: Weather data cached for 5 minutes to reduce API calls
5. **Real-time Updates**: Refreshes every 5 minutes automatically

## Fallback Behavior

If the API key is missing or invalid:
- Shows: "🌤️ --°F 💨 --mph 💧 --%"
- User can still use all other dashboard features
- Check browser console for error messages

## Testing

After adding your API key:
1. Register a new account or login
2. Check the dashboard header
3. You should see real weather data for your location
4. Open browser DevTools → Console to see weather API calls

## Upgrade Options

If you need more calls (unlikely), OpenWeatherMap offers paid plans:
- **Startup**: $40/month (3,000,000 calls)
- **Developer**: $180/month (15,000,000 calls)
- Not needed for typical use cases

## Alternative Free Weather APIs

If you prefer other providers:
1. **WeatherAPI.com** - 1M calls/month free
2. **Tomorrow.io** - 500 calls/day free
3. **Visual Crossing** - 1000 calls/day free

To switch APIs, you'll need to modify `lib/weather.ts` to match their API format.

## Support

Weather not showing?
1. Check API key is correct in `.env.local`
2. Wait 15 minutes after creating the key
3. Restart dev server: `npm run dev`
4. Check browser console for errors
5. Verify you have internet connection

Your dashboard is now displaying real, actionable weather data for construction planning! 🏗️⛅
