# OWN Travel Knowledge Engine (no external AI)

This mode answers from a locally versioned, approved travel knowledge file. It does not call an AI model, external AI API, web search, or paid inference service. It uses deterministic keyword matching and exact package facts; unknown or unrelated questions receive the approved travel-team handoff message.

## Add approved package data

Edit `website/data/travel-knowledge.json` and add package objects under `packages`. Supported fields:

- `name` (required)
- `destination`
- `duration`
- `price` (include tax wording only if confirmed)
- `departures` (array of dates/batches)
- `inclusions` (array)
- `exclusions` (array)
- `itinerary` (array of day-by-day strings)
- `notes`

Only put confirmed, current facts in this file. The chat API reads this file at build/deploy time. Updating it in GitHub triggers the connected hosting service's normal deployment.

## Limits (important)

This is a deterministic knowledge assistant, not a trained large language model. It will not reason or freely generate like ChatGPT. Its benefit is that it can answer supported travel questions without AI keys, model credits, or external AI inference. Improve coverage by adding approved package details and FAQ question/keyword variations. Anything it cannot confidently match is handed off to the travel team.
