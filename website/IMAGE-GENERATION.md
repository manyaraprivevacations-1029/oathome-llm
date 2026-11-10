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

## Destination poster text

Post Studio and Carousel Studio now compose editable typography onto the artwork locally, without another AI request. Enable **Add text directly onto the image**, choose Light editorial or Dark cinematic, and edit the destination title, details and call to action. Carousel slides use their slide title and copy. Gemini supplies initial poster text for new drafts; restored older drafts can be filled manually. Keep prices, dates and inclusions limited to confirmed package facts.

The preview uses the same canvas compositor as download, Creations storage and Instagram publishing, with the existing optional logo applied afterward. Original artwork stays separate so edits and repeated saves never accumulate lettering. Poster settings and text are restored with private studio drafts; rendered images and poster text metadata are saved in Creations. Export is 1080 pixels wide in the selected ratio; feed publishing retains the existing 9:16-to-4:5 padding behavior. Text wraps and shrinks to fit rather than clipping. Very long text produces an explicit shortening error.

Run `node --test tests/social-poster.test.cjs` from `website/` to check text fitting and the original-image mode.

## Reset, language, destination and prompt controls

Both Post Studio and Carousel Studio include **New / Reset**. This replaces the active browser draft with an empty draft, resets layout and file inputs, and leaves saved Creations and published media intact. Draft writes are serialized so a pending autosave cannot restore the previous draft after Reset. Switching studios keeps their private drafts separate.

The brief now explicitly selects **Telugu + English**, **Telugu** or **English**. Telugu modes require actual Telugu Unicode script in captions and slide copy; Telugu + English also requires English words. Explicit brief language takes priority over Brand Brain defaults. An invalid model response gets one bounded correction attempt, then a visible error without replacing the existing draft. No English-only fallback is silently substituted.

Each new image gets three distinct, editable prompt choices in a single compact two-row editor: Scenic, Landmark and People. Choose a tab, edit if needed, then generate one image. Changing the brief marks old output stale and blocks image generation until content is regenerated. Older restored drafts also require regeneration to obtain validated language and three choices.

All provider requests carry the current destination context. Char Dham defaults explicitly to the Uttarakhand circuit and requires named shrines in every prompt, rather than mountain-only landscapes. The grounding is based on Uttarakhand Tourism's four-shrine description: https://uttarakhandtourism.gov.in/experiences/char-dham . The UI states this interpretation; an explicitly pan-India circuit is not treated as Uttarakhand-only. AI renderings still need visual review and are not guaranteed architectural reproductions.

**Adjust text** expands title/details/CTA size, horizontal and vertical positions, and text width controls. Carousel slides have independent overrides; posts use the shared poster layout. These settings persist in drafts and saved metadata and feed the exact same compositor used by preview, download, save and publish. Telugu wrapping respects grapheme clusters.

Validation: `node --test tests/social-creative-brief.test.cjs tests/social-draft-reset.test.cjs tests/social-poster.test.cjs tests/social-image.test.cjs`, plus the normal typecheck and production build.


## Exact slide counts and photo visibility

Carousel Studio has a **Number of slides** selector (2–10). A topic containing an explicit request such as “3 slides”, “3-slide”, “three slides”, or “మూడు స్లైడ్లు” updates the selector. Its selected number is included in the private draft, stale-draft key and saved metadata. Both the Gemini instructions and response validation require exactly that many slides, including any introduction and closing CTA. A five-slide response for a three-slide request is corrected once, then rejected rather than silently accepted or sliced. Topic text saying “3 reasons” alone does not override the selector.

New drafts default to **Photo focus**, smaller titles and lighter shading. **Overlay strength** can be reduced to zero; original-artwork preview and **Download artwork only** omit the text, logo and shading without another AI call. Existing saved artwork is not regenerated or edited automatically; choose Photo focus to apply the new layout to a restored draft.

Ganga Aarti prompts now explicitly describe the active ceremony, a flaming multi-tier brass lamp, complete hands and lamp framing, devotees and ghat context rather than a generic priest portrait or candles alone. Image prompts no longer demand that the upper half remain blank. Cloudflare remains the same FLUX.1 Schnell service at four steps, with no model change, paid fallback or billing activation. Better instructions cannot guarantee the same fidelity as ChatGPT image generation.
