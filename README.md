# Edge

Ascent is a weekly mission game. The player sets a meaningful aim, the game turns it into a seven-day boss run across the Living Mountain, and each day's real-world moves light up the path toward the summit gate.

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
