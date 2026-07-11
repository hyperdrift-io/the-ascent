# Citizen Game

Local PoC for a life-balance strategy game.

```bash
pnpm install
pnpm dev
pnpm build
```

## Real Data Inputs

- Calendar: import an `.ics` file from Google Calendar, Apple Calendar, Outlook, or similar.
- Health/activity: import JSON with either:

```json
{
  "health": [
    {
      "day": "Mon",
      "sleepHours": 7.4,
      "stamina": 68,
      "stress": 42,
      "nutrition": 72,
      "cardioMinutes": 25
    }
  ],
  "events": [
    {
      "day": "Tue",
      "title": "Run club",
      "category": "sport",
      "minutes": 60
    }
  ]
}
```

Stress is interpreted as strain, where lower is easier to carry.
