# OAT Social AI — OpenAI provider preparation

## Current approved configuration

- Monthly AI API budget: INR 0.
- OpenAI API calls: disabled.
- OpenAI API key: do not add one.
- Production deployment: not requested; do not deploy this branch.
- Existing Ollama/OWN path remains the default when `OAT_SOCIAL_AI_PROVIDER` is unset or set to `ollama`.

## Provider switch

The Social AI generation route recognises `OAT_SOCIAL_AI_PROVIDER=openai`, but it intentionally returns a disabled response before making any external request while the approved budget is zero. This makes the provider selection explicit without incurring API charges.

The OpenAI request adapter must not be activated merely by adding a key. Before activation, implement and verify server-side monthly usage accounting with a hard stop at the owner-approved INR limit, then obtain the owner's explicit approval to enable paid calls.

## Future server-side settings (do not set now)

- `OAT_SOCIAL_AI_PROVIDER=openai`
- `OAT_SOCIAL_AI_MONTHLY_BUDGET_INR` — only after the owner approves a non-zero limit and a hard usage ledger exists.
- `OAT_SOCIAL_OPENAI_ENABLED=true` — only after the usage ledger and explicit approval.
- `OPENAI_API_KEY` — server-only secret; never expose through a `NEXT_PUBLIC_` variable.

No OpenAI API key or paid provider setting is required for the current zero-budget configuration.
