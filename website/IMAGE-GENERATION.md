# Social AI image generation

Post and carousel studios keep Gemini for copy and use the official Cloudflare Workers AI REST API for artwork. After creating content, edit the image prompt and select **Generate AI image** (post) or **Generate slide image** (carousel). Each click requests one image; generating replacement artwork requires confirmation. Uploaded images remain supported.

The studio crops the returned square image to 1:1, 4:5 or 9:16. Review the crop and destination accuracy. Headline/caption text remains editable separately; it is not baked into the image. Existing logo controls are applied by the same preview, export and save flows as uploads. Generated images are included in local draft recovery and stored using the existing Creations storage flow when saved.

## Server configuration

Set `CLOUDFLARE_ACCOUNT_ID` and `CLOUDFLARE_API_TOKEN` in the Vercel project's Preview and Production environments. Redeploy after changing settings. The token needs Workers AI permissions for that account; never prefix it with `NEXT_PUBLIC_` or place it in source code. Existing Social Supabase URL/key configuration and a valid signed-in user are required for both status and generation requests.

The endpoint fixes the model to `@cf/black-forest-labs/flux-1-schnell`, with four steps. It deliberately does not use the older `CLOUDFLARE_IMAGE_MODEL` variable, so a previously configured paid model cannot be selected accidentally. It makes no paid-model fallback, plan upgrade, billing or Instagram-account changes.

## Budget and limits

Cloudflare currently provides 10,000 free Neurons/day, shared with other Workers AI usage. Keep the Cloudflare account on Workers Free for provider-enforced rejection once that allowance is exhausted. A Workers Paid account can incur overage charges; this application cannot enforce an account-wide ₹0 budget or determine other services' usage. The status endpoint confirms variable presence, not credentials, plan or remaining quota. Check these in Cloudflare before use.

Each request requires server-verified Supabase identity. Prompts are limited to 1,600 characters, only supported ratios are accepted, provider requests time out, images are validated, and provider errors are sanitized. A per-instance in-flight guard reduces duplicate requests; it is not a distributed rate limiter. Quota/capacity failures leave existing artwork in place and do not trigger retries.

## Validation

Run `npm run typecheck`, `node --test tests/social-image.test.cjs`, and `npm run build` from `website/`. After deployment, sign in, generate post text, generate an image, verify the crop/logo preview, save to Creations and download. For carousel, generate two different slide images and verify each stays on its selected slide. Check refresh recovery, rejected/expired sessions, and generation failures. Publishing remains a separate explicit action.

References: https://developers.cloudflare.com/workers-ai/models/flux-1-schnell/ and https://developers.cloudflare.com/workers-ai/platform/pricing/
