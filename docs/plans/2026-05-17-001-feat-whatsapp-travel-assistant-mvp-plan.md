---
title: WhatsApp AI Travel Assistant MVP
type: feat
status: active
date: 2026-05-17
origin: docs/brainstorms/2026-05-17-travel-agency-whatsapp-chatbot-requirements.md
---

# WhatsApp AI Travel Assistant MVP

## Summary

Build a WhatsApp AI travel assistant for travel agencies in India and GCC. The bot handles five flows (flight, hotel, visa, itinerary, special query) through natural language AI, using a mock data layer with a swappable abstraction. Tech stack: Node.js + TypeScript, Express, Docker containers on Coolify, self-hosted PostgreSQL, 360dialog BSP, Groq LLM (with OpenAI fallback). MVP serves 100-200 users at ~$6-12/month on a single VPS.

---

## Problem Frame

Travel agencies in India and GCC handle hundreds of WhatsApp queries daily — flight searches, hotel comparisons, visa requirements. Each query takes a human agent 15-30 minutes. Agencies lose customers who expect instant responses. The gap is a travel-aware AI assistant that guides users through structured flows and escalates to humans only when needed.

---

## Requirements

- R1. Intent classification: classify user messages into 5 flows (flight, hotel, visa, itinerary, special)
- R2. Slot filling: collect structured travel details conversationally before presenting options
- R3. Flight options: generate and display 2-3 mock flight options with airline, route, times, price
- R4. Hotel options: generate and display 2-3 mock hotel options with name, rating, price, amenities
- R5. Visa options: generate and display 2-3 mock visa packages with type, processing time, fee, requirements
- R6. Visa document checklist: provide document checklist based on destination and nationality
- R7. Itinerary summary: display itinerary with destination, dates, services, day-by-day breakdown
- R8. Itinerary modification routing: route modification requests to agent with booking reference
- R9. Session context: maintain conversation context across full session — no re-entry needed
- R10. Human fallback at end of every flow: include agent contact number, clear escalation signal
- R11. Special query immediate escalation: structured summary + full context to agent, no repeat
- R12. Mid-conversation human trigger: user can say "talk to agent" at any point
- R13. Handoff conversation summary: agent receives full context, no re-asking needed
- R14. Mock data abstraction layer: swappable via config — no bot logic changes to swap APIs
- R15. Per-agency data customisation: agencies can edit mock data without touching bot code
- R16. Session state persistence: resume from last known state within 24 hours
- R17. Graceful out-of-scope handling: never crash or loop; always offer human fallback
- R18. Admin fallback number config: agency config file sets agent WhatsApp number
- R19. Business hours message: bot shows unavailable message outside configured hours
- R20. KPI metrics: track total queries, deflection rate, completion rate, response time, escalation rate

**Origin actors:** A1 (traveller), A2 (agency agent), A3 (agency admin), A4 (bot/system)
**Origin flows:** F1 (flight booking), F2 (hotel booking), F3 (visa assistance), F4 (itinerary management), F5 (special/custom query), F6 (human handoff)
**Origin acceptance examples:** AE1 (single-message slot fill), AE2 (flow-end handoff message), AE3 (special query immediate escalation), AE4 (24-hour session resume), AE5 (config swap without code change), AE6 (graceful out-of-scope handling), AE7 (business hours aware response)

---

## Scope Boundaries

### Deferred for later

- Payment processing within WhatsApp (UPI, card, wallet)
- PDF itinerary export and sharing
- Multi-language support (Arabic for GCC)
- User authentication or accounts (anonymous only in MVP)
- Live travel API integration (mock data only in MVP)
- Loyalty program or cross-session memory
- Mobile app or web chat interface (WhatsApp only in MVP)
- GUI admin dashboard (configuration file only in MVP)
- Push notification campaigns

### Outside this product's identity

- Generic FAQ bot with no travel domain expertise
- Booking engine that processes payments and issues tickets directly
- Multi-channel bot (WhatsApp only; Instagram, Facebook, website chat out of scope)
- Agency internal operations, CRM, or accounting tool

### Deferred to Follow-Up Work

- GitHub Issues creation from this plan: tracked separately
- 360dialog sandbox account setup: self-service task, not part of this implementation plan

---

## Key Technical Decisions

- **Runtime:** Node.js 20 LTS + TypeScript 5.x (strict mode). WhatsApp ecosystem is Node-first; TypeScript adds compile-time safety.
- **Framework:** Express.js 4.x with minimal middleware. Sufficient for webhook handling; lowest learning curve.
- **Deployment:** Coolify (self-hosted PaaS) on a single VPS. Git-push-to-deploy, Docker-native, no vendor lock-in. Self-hosted model confirmed by user.
- **Database:** Self-hosted PostgreSQL 15+ via Docker container managed by Coolify. Full data control, zero additional cost.
- **AI Provider:** Groq API (primary) + OpenAI GPT-4o Mini (fallback). Groq free tier = $0 for MVP; abstraction layer allows provider swap via config.
- **Session Store:** In-memory for MVP (100-200 users). Redis added at scale (Phase 2+).
- **WhatsApp BSP:** 360dialog. Free sandbox, Meta-preferred partner, competitive pricing.
- **Mock Data:** JSON files + repository pattern. Zero infra cost; swap to live APIs is a config change.
- **Session persistence:** PostgreSQL persists sessions for recovery after container restart.

---

## Open Questions

### Resolved During Planning

- **BSP choice (D1 from requirements):** 360dialog. Confirmed in prior conversation.
- **Mock data schema:** JSON files with structured schema. Field definitions in mock-data.service.ts during implementation.
- **Admin configuration:** Configuration file (YAML) in repo. No GUI admin panel in MVP.
- **KPI storage:** PostgreSQL `kpis` table, aggregated daily. Real-time is deferred.

### Deferred to Implementation

- **Zod schema for AI JSON responses:** Defined during U3 (AI service implementation) with live Groq output as reference.
- **360dialog webhook payload format and authentication:** Verified during U5 (webhook handler) against 360dialog sandbox.
- **Session recovery on container restart:** Read latest state from PostgreSQL on startup; accept occasional session loss if recovery fails.
- **Handoff message format:** Defined during U6 (handoff service) based on what context the agent needs.

---

## Output Structure

```
travel-whatsapp-bot/
├── src/
│   ├── index.ts                      # Express app entry point
│   ├── config/
│   │   └── index.ts                  # Environment variables and agency config
│   ├── types/
│   │   └── index.ts                  # TypeScript interfaces and Zod schemas
│   ├── services/
│   │   ├── ai.service.ts             # Groq/OpenAI integration + provider abstraction
│   │   ├── whatsapp.service.ts        # 360dialog API wrapper (outgoing messages)
│   │   ├── session.service.ts        # In-memory session store + PostgreSQL persistence
│   │   ├── mock-data.service.ts      # Repository pattern for travel data
│   │   └── handoff.service.ts        # Human escalation and conversation summary
│   ├── handlers/
│   │   └── webhook.handler.ts        # WhatsApp webhook endpoint handler
│   ├── routes/
│   │   └── webhook.routes.ts         # Express route definitions
│   └── utils/
│       └── logger.ts                 # Structured JSON logging
├── data/
│   ├── flights.json                  # Mock flight data (routes, airlines, prices)
│   ├── hotels.json                   # Mock hotel data (properties, amenities, rates)
│   ├── visas.json                    # Mock visa data (types, requirements, fees)
│   └── itineraries.json              # Mock itinerary data (templates, day breakdown)
├── tests/
│   ├── services/
│   │   ├── ai.service.test.ts        # AI service unit tests
│   │   ├── session.service.test.ts   # Session store tests
│   │   ├── mock-data.service.test.ts  # Mock data repository tests
│   │   └── handoff.service.test.ts   # Handoff service tests
│   └── handlers/
│       └── webhook.handler.test.ts   # Webhook handler integration tests
├── scripts/
│   └── init-db.sql                   # PostgreSQL schema initialisation script
├── .env.example                      # Environment variable template
├── Dockerfile                        # Multi-stage Docker build
├── docker-compose.yml                # App + PostgreSQL container setup
├── coolify.json                      # Coolify deployment manifest (optional)
├── tsconfig.json                     # TypeScript configuration
├── package.json
└── vitest.config.ts                  # Vitest test runner configuration
```

---

## High-Level Technical Design

> *This illustrates the intended approach and is directional guidance for review, not implementation specification. The implementing agent should treat it as context, not code to reproduce.*

### Message Processing Flow

```
1. 360dialog POSTs incoming WhatsApp message to /webhook/whatsapp
2. Express handler receives payload → extract user phone number
3. Session service loads session (in-memory primary, PostgreSQL fallback)
4. AI service builds prompt: system instructions + conversation context + user message
5. AI service calls Groq (or OpenAI fallback) → receives structured JSON response
6. Response parsed: intent, slots, action, responseText
7. If action === 'show_options':
   a. Mock data service queries JSON files based on intent + slots
   b. Format options as numbered WhatsApp message
8. If action === 'handoff':
   a. Handoff service formats conversation summary
   b. Sends summary to agency WhatsApp number via 360dialog
   c. Notifies user: "Connecting you with our travel expert..."
9. Session service updates session state (in-memory + PostgreSQL)
10. WhatsApp service sends reply to user via 360dialog API
11. Log KPI data (response time, flow completion, escalation)
```

### AI Prompt / Response Pattern

Every AI call returns structured JSON (validated by Zod):
```typescript
interface AIResponse {
  intent: 'flight_booking' | 'hotel_booking' | 'visa_assistance' 
         | 'itinerary' | 'special' | 'greeting' | 'handoff_request' | 'out_of_scope';
  slots: Record<string, any>;         // Extracted parameters
  responseText: string;               // Friendly message to user
  action: 'ask_clarification' | 'show_options' | 'confirm' | 'handoff' | 'greeting';
}
```

---

## Implementation Units

### U1. Project Scaffold and Type Definitions

**Goal:** Set up the project foundation — package.json, TypeScript config, Docker setup, and all TypeScript interfaces/schemas.

**Requirements:** R1, R14, R15
**Dependencies:** None

**Files:**
- Create: `package.json`
- Create: `tsconfig.json`
- Create: `vitest.config.ts`
- Create: `Dockerfile`
- Create: `docker-compose.yml`
- Create: `.env.example`
- Create: `src/types/index.ts`
- Create: `scripts/init-db.sql`

**Approach:**
- Initialize npm project with all production and dev dependencies
- TypeScript strict mode enabled
- Vitest for unit testing (fast, modern, TypeScript-native)
- Multi-stage Dockerfile: builder stage compiles TypeScript, runner stage runs compiled JS
- docker-compose: app container + postgres container on same network
- PostgreSQL init script creates all four tables (sessions, conversations, kpis, agency_config)

**Patterns to follow:**
- Standard Node.js project structure with `/src` entry point
- Environment variables validated at startup via `zod`

**Test scenarios:**
- Happy path: `npm install` succeeds, TypeScript compiles with no errors, Docker image builds successfully
- Edge case: missing required env vars on startup → clear error message listing which vars are missing
- Edge case: PostgreSQL not reachable on startup → app logs warning, retries connection, does not crash

**Verification:**
- `npm run build` completes with exit code 0
- `docker build -t travel-bot .` completes successfully
- `docker-compose up -d` starts both containers and app is reachable at localhost:3000

---

### U2. Mock Data Layer

**Goal:** Create structured mock data JSON files and a repository-style data access layer that abstracts the data source.

**Requirements:** R3, R4, R5, R6, R7, R14, R15
**Dependencies:** U1 (types)

**Files:**
- Create: `data/flights.json`
- Create: `data/hotels.json`
- Create: `data/visas.json`
- Create: `data/itineraries.json`
- Create: `src/services/mock-data.service.ts`

**Approach:**
- Mock data covers key India-GCC routes (Mumbai-Dubai, Delhi-Doha, etc.)
- Four distinct JSON files map to four travel domains
- Repository pattern: `TravelDataProvider` interface implemented by `MockTravelDataProvider`
- Interface makes swapping to live APIs a config change (future)
- Zod schemas in `src/types/index.ts` validate mock data structure at startup

**Mock data coverage:**
- `flights.json`: 3 airlines × 5 routes × 2 cabin classes = 30 mock flight options
- `hotels.json`: 5 properties per city × 3 cities (Dubai, Doha, Mumbai) = 15 mock hotels
- `visas.json`: 3 visa types × 3 destination countries = 9 mock visa packages
- `itineraries.json`: 3 itinerary templates (3-day, 5-day, 7-day)

**Patterns to follow:**
- Repository pattern for data access abstraction
- Zod schemas for runtime data validation

**Test scenarios:**
- Happy path: mock data service returns correctly filtered flights for Mumbai→Dubai
- Happy path: mock data service returns hotels filtered by city, check-in/out dates
- Edge case: no flights found for a route → returns empty array, caller handles gracefully
- Edge case: invalid date format in mock data → Zod validation throws clear error on startup
- Error path: mock data file missing → app logs error and exits with clear message

**Verification:**
- All mock data files load without Zod errors on startup
- Unit tests verify filtered results match expected schema
- `TravelDataProvider` interface exists and `MockTravelDataProvider` implements it

---

### U3. AI Service with Provider Abstraction

**Goal:** Build the AI integration layer with Groq (primary) and OpenAI (fallback), structured prompt engineering, and structured JSON response parsing.

**Requirements:** R1, R2, R9, R17
**Dependencies:** U1 (types), U2 (mock data interface)

**Files:**
- Create: `src/services/ai.service.ts`
- Modify: `src/types/index.ts` (add AI request/response types)
- Create: `tests/services/ai.service.test.ts`

**Approach:**
- `AIProvider` interface: `generateResponse(systemPrompt, conversationHistory) -> AIResponse`
- `GroqProvider` implements the interface using Groq SDK
- `OpenAIProvider` implements the interface as fallback
- Provider selection driven by `AI_PROVIDER` env var (default: `groq`)
- System prompt built from agency config + current flow context
- Last 10 conversation messages included in prompt for context continuity
- AI response validated against Zod schema before returning
- Timeout: 8 seconds per call; on timeout → fallback to second provider → then handoff

**Technical design:**
```
AI Service receives:
  - conversationHistory: Message[]
  - systemPrompt: string
  - agencyConfig: AgencyConfig

AI Service calls:
  1. Groq with systemPrompt + conversationHistory (JSON mode enabled)
  2. On failure/timeout → OpenAI with same payload
  3. On second failure → throw HandOffError

AI Service returns:
  - intent, slots, responseText, action (validated by Zod)
```

**Patterns to follow:**
- Provider abstraction pattern (swap implementation without changing caller)
- Timeout + fallback chain
- Structured JSON response mode (Groq/OpenAI both support JSON mode)

**Test scenarios:**
- Happy path: valid Groq response is parsed and returned correctly
- Edge case: Groq returns malformed JSON → retry once, then fallback to OpenAI
- Edge case: Groq API returns rate limit error → immediate fallback to OpenAI
- Edge case: Both providers fail → throw `HandOffError` which triggers human escalation
- Error path: OpenAI returns response missing required `intent` field → Zod validation throws, handled as error

**Verification:**
- AI service calls Groq by default (configurable via env var)
- Fallback to OpenAI works when Groq is unavailable
- Structured JSON response is validated before being returned to caller

---

### U4. Session Service

**Goal:** Manage conversation session state — in-memory store for active sessions, PostgreSQL persistence for recovery.

**Requirements:** R9, R16, R20
**Dependencies:** U1 (types, DB schema)

**Files:**
- Create: `src/services/session.service.ts`
- Create: `tests/services/session.service.test.ts`

**Approach:**
- In-memory `Map<userId, Session>` for active sessions (primary)
- PostgreSQL `sessions` table for persistence and recovery
- Session loaded from memory first; on miss, read from PostgreSQL
- On every state change: update memory + debounced PostgreSQL write (every 5 messages or 30 seconds)
- 24-hour session expiry: `expires_at` checked on load, expired sessions start fresh
- Session structure includes: userId, currentFlow, slots (collected data), context (last 10 messages), messageCount

**Patterns to follow:**
- In-memory cache with database backup (cache-aside pattern)
- Debounced writes to reduce DB load

**Test scenarios:**
- Happy path: new user creates session; subsequent messages load existing session
- Happy path: user returns within 24 hours → session resumes from last state
- Edge case: user returns after 24 hours → new session, previous session not loaded
- Edge case: memory store full (1000+ concurrent sessions) → LRU eviction of oldest inactive sessions
- Edge case: PostgreSQL write fails → session continues in memory, logged as warning
- Error path: user ID not found in memory or DB → new session created

**Verification:**
- Session persists across multiple messages within the same session
- Session resumes correctly after in-memory cache miss
- Expired sessions are not resumed

---

### U5. Webhook Handler and 360dialog Integration

**Goal:** Receive incoming WhatsApp messages from 360dialog, route to AI service, and send replies back.

**Requirements:** R1, R2, R9, R10, R12, R13, R17, R18, R19
**Dependencies:** U1, U3, U4

**Files:**
- Create: `src/handlers/webhook.handler.ts`
- Create: `src/services/whatsapp.service.ts`
- Create: `src/routes/webhook.routes.ts`
- Modify: `src/index.ts` (register routes)
- Create: `tests/handlers/webhook.handler.test.ts`

**Approach:**
- `POST /webhook/whatsapp` receives 360dialog payload
- Webhook signature verification (X-Hub-Signature or token-based) rejects spoofed requests
- Payload parsed → extract `from` (phone number), `text.body` (message), `messageId`
- Session loaded via session service
- Business hours check: if outside hours, return time-aware unavailable message
- Message passed to AI service → structured response returned
- AI response actions handled:
  - `show_options`: call mock data service → format options → reply
  - `ask_clarification`: send clarification question
  - `confirm`: summarise collected slots → offer to connect with agent
  - `handoff`: trigger handoff service → send handoff message to user
  - `greeting`: send welcome message
  - `out_of_scope`: send graceful fallback + human option
- Reply sent via 360dialog API (whatsapp.service.ts)
- Conversation logged to PostgreSQL `conversations` table

**Patterns to follow:**
- Webhook verification pattern (signature check)
- Business hours gating
- 200 OK fast (async processing if needed, but 360dialog expects sync for MVP)

**Test scenarios:**
- Happy path: valid webhook payload → AI response → 360dialog reply sent
- Edge case: duplicate message ID (360dialog retry) → respond with 200 but skip processing
- Edge case: invalid webhook signature → respond with 401, log attempt
- Edge case: message outside business hours → return unavailable message (not AI-processed)
- Error path: AI service throws HandOffError → trigger handoff service → send handoff message
- Error path: 360dialog API call fails → log error, do not crash (360dialog retries on their end)

**Verification:**
- Webhook endpoint responds within 10 seconds end-to-end
- Invalid signatures are rejected with 401
- All five AI actions produce the correct response type
- Business hours check correctly gates messages

---

### U6. Handoff Service

**Goal:** Handle human escalation — format conversation summary, forward to agency agent, notify user.

**Requirements:** R10, R11, R12, R13
**Dependencies:** U5

**Files:**
- Create: `src/services/handoff.service.ts`
- Create: `tests/services/handoff.service.test.ts`

**Approach:**
- Handoff triggered by: AI `action === 'handoff'`, user says "talk to agent", end of any primary flow
- Format conversation summary:
  - User phone number
  - Flow type (flight/hotel/visa/itinerary/special)
  - Collected slots (all user-provided data)
  - Last 5 messages of conversation
  - Timestamp of handoff
- Send summary to agency WhatsApp number (from agency config)
- Send user confirmation message with agent contact number and expected response time
- Log handoff event to `conversations` table with `intent: 'handoff'`

**Patterns to follow:**
- Handoff message format: structured summary readable by human agent at a glance
- Graceful degradation if WhatsApp send fails

**Test scenarios:**
- Happy path: handoff triggered → summary sent to agent number → user receives confirmation
- Edge case: agency agent number not configured → handoff message explains issue, user notified
- Edge case: WhatsApp send fails (360dialog API error) → log error, notify user with fallback contact info
- Error path: empty conversation history → handoff summary shows "No prior conversation"

**Verification:**
- Agent receives structured summary with all user-provided data
- User receives confirmation message with contact number
- Handoff event is logged in database

---

### U7. Configuration, Logging, and Deployment Setup

**Goal:** Environment-based configuration, structured logging, and Docker/Coolify deployment configuration.

**Requirements:** R18, R19, R20
**Dependencies:** U1

**Files:**
- Modify: `src/config/index.ts`
- Modify: `src/index.ts` (structured logger)
- Create: `coolify.json` (optional Coolify manifest)
- Create: `tests/integration/health.test.ts` (basic smoke test)

**Approach:**
- Config loaded from environment variables at startup (no config file needed for MVP)
- Agency config (agent number, business hours, agency name) loaded from env vars — simple for MVP
- Zod schema validates all required env vars on startup; missing vars = clear error
- Structured JSON logging via `pino` or built-in `console.log` with JSON format
- Log: every incoming message, AI request/response, handoff event, error with stack trace
- Health check endpoint: `GET /health` returns 200 with `{ status: 'ok', timestamp }`
- Coolify manifest: optional JSON file describing the application for Coolify's import feature

**Patterns to follow:**
- Startup validation (fail fast on missing config)
- Structured JSON logging (machine-readable, Pi/observability tool compatible)

**Test scenarios:**
- Happy path: all required env vars present → app starts successfully, logs startup message
- Edge case: missing optional env vars → app starts with defaults, logs warning
- Edge case: missing required env var → app exits with clear error listing which vars are missing
- Integration: `/health` endpoint returns 200 with correct JSON payload

**Verification:**
- App starts cleanly with `.env` file present
- Missing required env vars produce a clear, actionable error message
- Health endpoint reachable and returns correct response

---

## System-Wide Impact

- **Interaction graph:** Express app → webhook routes → handlers → services (AI, session, mock data, handoff, WhatsApp)
- **Error propagation:** AI failures → HandOffError → handoff service. DB failures → warning logs, in-memory fallback. Webhook failures → 500 retry.
- **State lifecycle risks:** Session data written to PostgreSQL debounced — crash between writes means last few messages may not be persisted. Mitigation: in-memory is primary; PostgreSQL is backup.
- **API surface parity:** No public REST API in MVP — all interaction via WhatsApp webhooks. Internal services communicate via TypeScript function calls.
- **Integration coverage:** End-to-end WhatsApp flow requires all services working together. Unit tests cover each service in isolation; integration tests cover the webhook → AI → WhatsApp path.
- **Unchanged invariants:** No existing APIs or interfaces are modified — this is a greenfield project.

---

## Risks & Dependencies

| Risk | Mitigation |
|------|------------|
| Groq free tier limits exceeded at 200 users | Monitor usage; fallback to OpenAI ($3-5/month). Inferred: 200 users × 20 msg/month = 4,000 msg/month, within Groq limits. |
| VPS resource exhaustion (single server for app + DB) | Monitor CPU/memory in Coolify dashboard; upgrade VPS before sustained 70%+ usage. |
| 360dialog API changes breaking webhook format | Abstract WhatsApp service; swap BSP if needed. |
| Session loss on container restart | PostgreSQL persists sessions; recovery on restart loads latest state. |
| AI hallucination (wrong travel info in mock data) | Structured JSON responses; Zod validation; human fallback always available. |
| User sends abusive/spam content | Rate limiting per user (30 msg/min); block list in agency config. |

---

## Documentation / Operational Notes

- **Setup README:** Document how to set up 360dialog sandbox, get Groq API key, configure env vars, and deploy to Coolify.
- **Mock data README:** Document how to add/edit mock data files without touching code.
- **Admin config:** Document the env vars that control agency settings (agent number, business hours, agency name).
- **Monitoring:** Coolify dashboard for container health, resource usage, deployment logs. PostgreSQL via any pg client for data inspection.

---

## Sources & References

- **Origin document:** [docs/brainstorms/2026-05-17-travel-agency-whatsapp-chatbot-requirements.md](docs/brainstorms/2026-05-17-travel-agency-whatsapp-chatbot-requirements.md)
- **Technical reference:** [docs/brainstorms/2026-05-17-travel-agency-whatsapp-chatbot-trd.md](docs/brainstorms/2026-05-17-travel-agency-whatsapp-chatbot-trd.md)
- 360dialog Docs: https://docs.360dialog.com/
- Groq SDK: https://github.com/groq/groq-node
- Coolify Docs: https://coolify.io/docs