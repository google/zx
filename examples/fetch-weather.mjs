#!/usr/bin/env zx

// Copyright 2021 Google LLC
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//     https://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

async function main() {
  const argv = minimist(process.argv.slice(2), {
    boolean: ['help'],
    alias: { h: 'help' },
  })

  if (argv.help) {
    echo(`
${chalk.bold('Usage:')} zx fetch-weather.mjs [city name]

Fetches weather data using wttr.in with a neat two-column colored table format.

${chalk.bold('Examples:')}
  zx fetch-weather.mjs London
  ./fetch-weather.mjs "New York"
`)
    process.exit(0)
  }

  const args = argv._.slice(__filename === process.argv[1] ? 0 : 1)
  const city = args.join(' ')

  if (!city) throw 'No city provided. Use -h for help.'

  const svc_url = 'https://wttr.in'

  const data = await spinner(
    `📡 Fetching weather for "${city}" from ${svc_url}...`,
    async () => {
      try {
        const res = await fetch(
          `${svc_url}/${encodeURIComponent(city)}?format=j1`,
          {
            signal: AbortSignal.timeout(5000),
          }
        )
        if (!res.ok) throw `API error: ${res.status} ${res.statusText}`
        return res.json()
      } catch (err) {
        if (err.name === 'AbortError') {
          throw 'Request timed out after 5 seconds.'
        }
        throw err
      }
    }
  )

  const area = data.nearest_area[0]
  const current = data.current_condition[0]

  if (!area || !current) {
    throw '❌ Missing weather data in API response.'
  }

  const location = area.areaName[0].value
  const condition = current.weatherDesc[0].value
  const temperature = current.temp_C
  const humidity = current.humidity

  echo(chalk.yellow(`🌤️  Weather in ${location}: ${condition}`))
  echo(chalk.red(`🌡️  Temperature: ${temperature}°C`))
  echo(chalk.blue(`💧 Humidity: ${humidity}%`))
}

await main().then(
  () => process.exit(0),
  (err) => {
    const msg = typeof err === 'string' ? err : err.message
    echo(chalk.red(`❌ ${msg}`))
    process.exit(1)
  }
)

// Here's how to add this script to your shell as a bash alias. This assumes you have zx installed globally.
// 1. Save this script as `fetch-weather.mjs`.
// 2. Add the following line to your .bashrc file, replacing the path with your own:
// alias weather='zx /full/path/to/fetch-weather.mjs'
// 3. Then reload your shell using the following command:
// source ~/.bashrc
// Now you can use the `weather` command to fetch weather data for any city.
// Example usage: `weather London`
