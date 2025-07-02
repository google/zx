#!/usr/bin/env zx

// Copyright 2021 Google LLC
//
// Licensed under the Apache License, Version 2.0 (the "License");
// You may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//     https://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

// This script requires an OpenWeatherMap API key to be set in the environment variable OPENWEATHER_API_KEY.

async function main() {
  let args = process.argv.slice(2)

  // Remove script filename if passed via zx
  if (
    args.length > 0 &&
    (args[0].endsWith('fetch-weather.mjs') || args[0] === './fetch-weather.mjs')
  ) {
    args = args.slice(1)
  }

  if (args.length === 0 || args.includes('-h') || args.includes('--help')) {
    echo(`
${chalk.bold('Usage:')} zx fetch-weather.mjs [city name]

Fetches weather data from OpenWeatherMap.

${chalk.bold('Environment:')}
  Requires OPENWEATHER_API_KEY to be set.

${chalk.bold('Examples:')}
  OPENWEATHER_API_KEY=your_key zx fetch-weather.mjs London
  ./fetch-weather.mjs "New York"
`)
    process.exit(0)
  }

  const city = args.join(' ')
  const apiKey = process.env.OPENWEATHER_API_KEY

  if (!apiKey) {
    echo(chalk.red('❌ OPENWEATHER_API_KEY not set'))
    process.exit(1)
  }

  echo(`📡 Fetching weather for "${city}"...`)

  try {
    const res = await fetch(
      `https://api.openweathermap.org/data/2.5/weather?q=${encodeURIComponent(city)}&appid=${apiKey}&units=metric`
    )

    if (!res.ok) {
      echo(chalk.red(`❌ API error: ${res.status} ${res.statusText}`))
      process.exit(1)
    }

    const data = await res.json()

    if (!data?.main || !data?.weather?.[0]) {
      echo(chalk.red('❌ Invalid response from API.'))
      process.exit(1)
    }

    echo(
      chalk.yellow(`🌤️ Weather in ${data.name}: ${data.weather[0].description}`)
    )
    echo(chalk.red(`🌡️ Temperature: ${data.main.temp}°C`))
    echo(chalk.blue(`💧 Humidity: ${data.main.humidity}%`))
  } catch (err) {
    echo(chalk.red(`❌ Failed to fetch weather: ${err.message}`))
    process.exit(1)
  }
}
