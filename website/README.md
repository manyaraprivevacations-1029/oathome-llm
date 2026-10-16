# On A Trip Holidays AI Bot

AI sales and customer-support platform for **On A Trip Holidays**.

## Current architecture

- Next.js 15 + React + TypeScript
- AI Employee configuration
- Lead adapter
- AI lead scoring engine
- Voice-provider abstraction
- Campaign API
- Knowledge Base API
- Call history API contract
- Analytics API
- Voice webhook boundary
- Supabase-ready environment configuration

## Runtime routes

- `/api/ai-bot/health`
- `/api/ai-bot/employees`
- `/api/ai-bot/leads`
- `/api/ai-bot/calls`
- `/api/ai-bot/campaigns`
- `/api/ai-bot/knowledge`
- `/api/ai-bot/analytics`
- `/api/ai-bot/score`
- `/api/ai-bot/conversation`
- `/api/ai-bot/summaries`
- `/api/ai-bot/webhooks/voice`
- `/api/ai-bot/telephony/outbound`
- `/api/ai-bot/telephony/inbound`
- `/api/ai-bot/telephony/webhook`
- `/api/ai-bot/telephony/turn`
- `/api/ai-bot/follow-ups`

## Integration order

1. Connect Supabase and inspect the existing CRM schema.
2. Connect the production telephony/voice provider.
3. Connect the AI model provider.
4. Replace demo adapters with database-backed services.
5. Add authenticated user/workspace access and RLS.
6. Verify production calling, transcripts, summaries and CRM updates.

No production credentials belong in GitHub. Use server-side environment variables only.
