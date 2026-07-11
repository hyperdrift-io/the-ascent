# Edge

Edge is a weekly mission game. Each week is an Ascent toward a player-chosen aim: daily real-world moves, resolved as cairns on the path, carry you toward the summit gate — the week's meaningful attempt.

```bash
pnpm install
pnpm dev  # runs on http://127.0.0.1:5177
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
