---
date: 2026-05-17
topic: travel-agency-whatsapp-chatbot-technical-requirements
dependencies: docs/brainstorms/2026-05-17-travel-agency-whatsapp-chatbot-requirements.md
---

# WhatsApp AI Travel Assistant — Technical Requirements Document (TRD)

---

## Summary

This document defines the technical architecture, component design, data flow, and deployment model for the WhatsApp AI Travel Assistant MVP. The system is built on Node.js with TypeScript, deployed via Docker containers on Coolify, and uses Groq's free-tier LLM API for AI capabilities. WhatsApp integration is handled via 360dialog. Data persistence uses self-hosted PostgreSQL. The architecture is designed for 100-200 users in MVP, with a clear path to scale to 1,000+ users without structural changes.

---

## Problem Frame (Technical)

The PRD defines a conversational AI bot that must handle five distinct flows across WhatsApp, maintain session state, serve mock travel data, and escalate to human agents. The technical challenge is building a system that:

1. Receives and responds to WhatsApp messages within 10 seconds
2. Runs AI inference for every message (intent classification, slot filling, response generation)
3. Maintains conversation context across a session
4. Serves structured mock data with a swappable abstraction layer
5. Deploys on containerised infrastructure with full self-hosting control
6. Costs under $50/month at 100-200 users

The solution must balance developer experience (easy to learn, debug, extend) with production reliability (type safety, error handling, observability).

---

## Architecture Overview

```
User (WhatsApp)
    ↓
360dialog BSP (Webhook)
    ↓
Coolify Docker Container (Express.js)
    ├── AI Service (Groq API / OpenAI fallback)
    ├── Conversation Manager (Session + Context)
    ├── Mock Data Service (Flights / Hotels / Visas / Itineraries)
    └── Handoff Service (Human escalation)
    ↓
Self-hosted PostgreSQL
    ├── Sessions table
    ├── Conversations table
    ├── KPIs table
    └── Agency Config table
```

### Component Breakdown

| Component | Technology | Purpose |
|---|---|---|
| Webhook Handler | Express.js on Coolify | Receives 360dialog webhooks, routes messages |
| AI Service | Groq API (Llama 3) / OpenAI fallback | Intent detection, slot filling, response generation |
| Conversation Manager | In-memory (MVP) → Redis (scale) | Session state, context persistence |
| Mock Data Service | JSON files + abstraction layer | Travel option generation |
| Handoff Service | WhatsApp message forwarding | Human escalation with context summary |
| Database | Self-hosted PostgreSQL | Persistent storage for sessions, KPIs, config |
| Admin Config | JSON file (MVP) | Agency-specific settings (fallback number, hours) |

---

## Tech Stack Decisions

### Runtime & Language: Node.js + TypeScript

**Decision:** Node.js 20 LTS with TypeScript 5.x, strict mode enabled.

**Rationale:**
- Node.js has the most mature ecosystem for WhatsApp integrations — 360dialog SDK, webhook libraries, and community examples are all Node-first
- TypeScript adds compile-time type safety without runtime overhead — critical for a product being sold to customers where bugs have business cost
- The user (full-stack developer) can learn TypeScript incrementally — valid JavaScript is valid TypeScript with a relaxed config
- Node.js is widely supported and optimised for containerised deployments

**Alternative considered:** Python + FastAPI. Rejected because WhatsApp ecosystem maturity favours Node.js, and the user wants the stack most sellable to future customers.

### Web Framework: Express.js

**Decision:** Express.js 4.x with minimal middleware.

**Rationale:**
- Most widely known Node.js framework — easy to learn, massive community
- Webhook handling is straightforward (single POST endpoint)
- Lightweight — no unnecessary abstraction for a focused API
- Easy to containerise with Docker

**Alternative considered:** Fastify (faster, modern) and NestJS (structured, enterprise). Rejected because Express is sufficient for this scope and the learning curve is lowest.

### Deployment Platform: Coolify

**Decision:** Coolify (self-hosted PaaS) for primary deployment.

**Rationale:**
- Self-hosted — you own the infrastructure, no vendor lock-in, no platform-specific limitations
- Native Docker support — deploy any containerised application with zero config changes
- Git-based deployments — push to repo, Coolify builds and deploys automatically
- Built-in database management — easy to add and manage PostgreSQL, Redis, etc.
- Resource-efficient — runs well on a single VPS ($5-10/month)
- No cold starts — container runs continuously, so response time is consistently fast
- SSL, domain management, and environment variables handled out of the box

**Alternative considered:** Vercel (serverless), Railway, Render. Rejected because:
- Vercel is serverless-only; the user explicitly wants Coolify's self-hosted model
- Railway and Render are managed platforms with ongoing costs and less control
- Coolify gives full ownership of the deployment stack, which aligns with the learning and sellability goals

**Infrastructure:** A single VPS (DigitalOcean, Hetzner, or any cloud provider) running Coolify. The Node.js app and PostgreSQL database run as Docker containers managed by Coolify.

### AI Provider: Groq (Primary) + OpenAI (Fallback)

**Decision:** Groq API as primary LLM, OpenAI GPT-4o Mini as fallback.

**Rationale:**
- Groq offers a free tier with generous limits — $0 cost for MVP
- Groq's inference is extremely fast (uses custom hardware) — important for 10-second response targets
- Supports Llama 3 models which are capable enough for intent classification and slot filling
- OpenAI GPT-4o Mini is the fallback because it's cheap ($0.075/1M input tokens), reliable, and has the best instruction-following quality
- Abstraction layer allows switching providers via config change

**Cost estimate at 200 users, 20 messages/user/month:**
- Groq free tier: $0
- If Groq limits exceeded, OpenAI GPT-4o Mini: ~$3-5/month

### Database: Self-hosted PostgreSQL

**Decision:** PostgreSQL 15+ running as a Docker container managed by Coolify.

**Rationale:**
- Self-hosted — full control over data, no third-party dependency for database access
- PostgreSQL is relational — perfect for structured data (sessions, KPIs, agency config)
- Zero additional cost — runs on the same VPS as the application
- Direct connection via `pg` or `node-postgres` driver — simple, no abstraction layers needed
- Easy backups via Coolify's built-in backup scheduler or `pg_dump` cron jobs
- Scales vertically by upgrading the VPS, or horizontally by moving DB to a dedicated instance later

**Tables:**
- `sessions` — conversation state, current flow, collected slots
- `conversations` — message history, timestamps, escalation events
- `kpis` — aggregated metrics (deflection rate, completion rate, response time)
- `agency_config` — fallback number, business hours, mock data references

**Alternative considered:** Supabase (managed PostgreSQL). Rejected because the user explicitly wants self-hosted infrastructure. SQLite was also considered for simplicity, but PostgreSQL is the right choice for production data durability and query flexibility.

### Session Management: In-Memory (MVP) → Redis (Scale)

**Decision:** In-memory session store for MVP. Redis added when scaling beyond single-container limits.

**Rationale:**
- For 100-200 users, in-memory sessions within the Docker container are sufficient
- Session data is small (user ID, current flow, collected slots) — fits easily in memory
- Redis adds negligible cost when running on the same VPS — deferred until needed
- PostgreSQL stores session backup for recovery if the container restarts

**Session structure:**
```typescript
interface Session {
  userId: string;          // WhatsApp phone number
  currentFlow: FlowType;   // 'flight' | 'hotel' | 'visa' | 'itinerary' | 'special'
  slots: Record<string, any>; // Collected data (origin, destination, dates, etc.)
  messageCount: number;    // For KPI tracking
  lastActivity: Date;      // For 24-hour expiry
  context: Message[];      // Recent conversation history (last 10 messages)
}
```

### WhatsApp Integration: 360dialog

**Decision:** 360dialog as the Business Solution Provider (BSP).

**Rationale:**
- Meta-preferred partner — best feature alignment and support
- Free sandbox for development — $0 cost during build phase
- Simple webhook configuration — one POST endpoint
- Competitive pricing for paid use (when customer goes live)
- Good documentation and Node.js SDK

**Webhook setup:**
- Coolify domain registered as 360dialog webhook (e.g., `https://bot.yourdomain.com/webhook/whatsapp`)
- 360dialog sends JSON payload for every incoming message
- Bot processes message and sends reply via 360dialog API

### Mock Data Layer: JSON Files with Abstraction

**Decision:** Structured JSON files served through a data access layer (repository pattern).

**Rationale:**
- Zero infrastructure cost — no database needed for mock data
- Easy to edit, version control, and customise per agency
- Clean abstraction means swapping to live APIs is a config change
- TypeScript interfaces enforce schema consistency

**File structure:**
```
/data
  /flights
    routes.json      // Mumbai-Dubai, Delhi-Doha, etc.
    airlines.json    // Emirates, Indigo, Air Arabia
  /hotels
    properties.json  // Dubai hotels with star ratings, prices
  /visa
    packages.json    // Visa types per country, fees, requirements
  /itinerary
    templates.json   // Day-by-day itinerary templates
```

**Repository pattern:**
```typescript
interface TravelDataProvider {
  getFlights(origin: string, destination: string, date: Date): FlightOption[];
  getHotels(city: string, checkIn: Date, checkOut: Date): HotelOption[];
  getVisaPackages(country: string, visaType: string): VisaPackage[];
  getItinerary(bookingRef: string): Itinerary | null;
}

// Mock implementation
class MockTravelDataProvider implements TravelDataProvider { ... }

// Live API implementation (future)
class LiveTravelDataProvider implements TravelDataProvider { ... }
```

---

## Data Flow Design

### Message Processing Flow

```
1. User sends message on WhatsApp
2. 360dialog receives message and POSTs to our webhook
3. Express handler receives payload:
   a. Extract user phone number (session ID)
   b. Load session from in-memory store (or PostgreSQL if container restarted)
   c. Build prompt: system instructions + conversation context + user message
4. AI Service sends prompt to Groq API
5. AI returns structured response:
   - intent: 'flight_booking' | 'hotel_booking' | ...
   - slots: { origin: 'Mumbai', destination: 'Dubai', ... }
   - responseText: 'I found flights from Mumbai to Dubai...'
   - action: 'show_options' | 'ask_clarification' | 'handoff'
6. If action === 'show_options':
   a. Mock Data Service queries relevant JSON files
   b. Format options as WhatsApp-friendly message (text + numbered list)
7. If action === 'handoff':
   a. Handoff Service formats conversation summary
   b. Sends summary to agency's WhatsApp number
   c. Notifies user: "Connecting you with our travel expert..."
8. Update session state in memory + PostgreSQL
9. Send reply via 360dialog API
10. Log KPI data (response time, flow completion, escalation)
```

### AI Prompt Engineering Strategy

The AI is not just a chatbot — it's a structured data extraction engine. Every prompt must return JSON.

**System prompt structure:**
```
You are a travel assistant for [Agency Name]. Your job is to help users 
with flight bookings, hotel bookings, visa assistance, and itinerary management.

You must ALWAYS respond in this JSON format:
{
  "intent": "flight_booking" | "hotel_booking" | "visa_assistance" | "itinerary" | "special" | "greeting" | "handoff_request" | "out_of_scope",
  "slots": { /* extracted parameters */ },
  "responseText": "friendly message to user",
  "action": "ask_clarification" | "show_options" | "confirm" | "handoff" | "greeting"
}

Rules:
- Collect missing information before showing options
- If the user asks for a human, set action to "handoff"
- If the message is unclear, set action to "ask_clarification"
- Be friendly, concise, and professional
- Use travel domain terminology correctly
```

**Conversation context:** Last 10 messages are included in the prompt to maintain continuity.

---

## API Design

### Internal API (Not exposed externally)

The system has no public REST API in MVP — all interaction is through WhatsApp webhooks. Internal services communicate via TypeScript function calls.

### Webhook Endpoint

```
POST /webhook/whatsapp
Content-Type: application/json

// 360dialog payload
{
  "messages": [{
    "from": "919876543210",
    "id": "msg_id_123",
    "timestamp": "1715952000",
    "text": { "body": "I need a flight to Dubai" },
    "type": "text"
  }]
}

// Response (200 OK, or error for retry)
```

### 360dialog Outgoing API

```
POST https://waba.360dialog.io/v1/messages
Headers: Authorization: Bearer {API_KEY}

{
  "messaging_product": "whatsapp",
  "recipient_type": "individual",
  "to": "919876543210",
  "type": "text",
  "text": { "body": "I found 3 flights to Dubai..." }
}
```

---

## Database Schema

### sessions

| Column | Type | Description |
|---|---|---|
| id | UUID | Primary key |
| user_id | VARCHAR(20) | WhatsApp phone number |
| current_flow | VARCHAR(20) | Active flow type |
| slots | JSONB | Collected slot data |
| context | JSONB | Recent message history |
| message_count | INTEGER | Messages in this session |
| created_at | TIMESTAMP | Session start |
| updated_at | TIMESTAMP | Last activity |
| expires_at | TIMESTAMP | 24-hour expiry |

### conversations

| Column | Type | Description |
|---|---|---|
| id | UUID | Primary key |
| session_id | UUID | FK to sessions |
| user_message | TEXT | What user sent |
| bot_response | TEXT | What bot replied |
| intent | VARCHAR(20) | Detected intent |
| action | VARCHAR(20) | Bot action taken |
| response_time_ms | INTEGER | AI + processing time |
| created_at | TIMESTAMP | Message timestamp |

### kpis (aggregated daily)

| Column | Type | Description |
|---|---|---|
| date | DATE | Aggregation date |
| total_queries | INTEGER | Total messages |
| deflected_queries | INTEGER | Handled by bot |
| escalated_queries | INTEGER | Handed to human |
| avg_response_time_ms | INTEGER | Average response time |
| completion_rate | DECIMAL | % flows completed |

### agency_config

| Column | Type | Description |
|---|---|---|
| id | UUID | Primary key |
| agency_name | VARCHAR(100) | Display name |
| fallback_number | VARCHAR(20) | WhatsApp agent number |
| business_hours_start | TIME | Working hours start |
| business_hours_end | TIME | Working hours end |
| timezone | VARCHAR(50) | Agency timezone |
| mock_data_path | VARCHAR(200) | Path to mock data files |
| created_at | TIMESTAMP | Config creation |

---

## Security Design

### Authentication & Authorization

- **Webhook verification:** 360dialog webhook payload is verified using a shared secret (X-Hub-Signature header) to prevent spoofing
- **API keys:** Groq API key and 360dialog API key stored as environment variables, never in code
- **No user authentication:** Travellers are anonymous — identified only by WhatsApp phone number
- **Admin config access:** Configuration file is server-side only, never exposed to users

### Data Protection

- **Phone numbers:** Stored as hashed identifiers in database (optional — can store raw for MVP, hash when scaling)
- **Conversation logs:** Stored in self-hosted PostgreSQL with application-level access control
- **PII handling:** No passport numbers, payment details, or sensitive documents handled by the bot in MVP
- **Encryption:** TLS in transit via Coolify's built-in SSL. At-rest encryption is handled by the VPS provider's disk encryption.

### Rate Limiting

- **Per-user:** Max 30 messages/minute to prevent spam
- **Global:** VPS firewall + Coolify's built-in rate limiting handles DDoS protection
- **API costs:** Groq free tier has limits; if exceeded, fallback to OpenAI with cost monitoring

---

## Deployment Architecture

### Local Development

```bash
# 1. Clone repo
# 2. Install dependencies
npm install

# 3. Set environment variables in .env
GROQ_API_KEY=xxx
DIALOG360_API_KEY=xxx
DATABASE_URL=postgres://user:pass@localhost:5432/travelbot

# 4. Run local PostgreSQL (Docker)
docker run -d --name travelbot-db -e POSTGRES_USER=user -e POSTGRES_PASSWORD=pass -e POSTGRES_DB=travelbot -p 5432:5432 postgres:15-alpine

# 5. Run locally
npm run dev  # Uses ts-node-dev, watches for changes

# 6. Expose local server for webhook testing
npx ngrok http 3000
# Set ngrok URL as 360dialog webhook for testing
```

### Docker Build (Production)

```dockerfile
# Multi-stage build
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:20-alpine AS runner
WORKDIR /app
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/data ./data
RUN npm ci --only=production
EXPOSE 3000
CMD ["node", "dist/index.js"]
```

```bash
# Build and run
docker build -t travel-bot .
docker run -p 3000:3000 --env-file .env travel-bot
```

### Coolify Deployment

**Prerequisites:**
- A VPS (DigitalOcean, Hetzner, Linode, AWS EC2, etc.) — 2 CPU, 4GB RAM minimum
- Coolify installed on the VPS (`curl -fsSL https://cdn.coollabs.io/coolify/install.sh | bash`)
- Domain name (optional but recommended) — pointed to VPS IP

**Deployment steps:**
```bash
# 1. Push code to Git repository (GitHub, GitLab, etc.)

# 2. In Coolify dashboard:
#    - Add new Resource → Application
#    - Select your Git repository
#    - Build pack: Dockerfile
#    - Set environment variables in Coolify UI
#    - Set domain: bot.yourdomain.com
#    - Deploy

# 3. Coolify automatically:
#    - Builds the Docker image
#    - Runs the container
#    - Manages SSL certificates
#    - Handles restarts and health checks

# 4. Update 360dialog webhook URL to your Coolify domain
```

**Coolify Resource Setup:**
| Resource | Type | Description |
|---|---|---|
| `travel-bot-app` | Application (Docker) | Main Node.js app |
| `travel-bot-db` | Database (PostgreSQL) | Self-hosted Postgres 15 |
| `travel-bot-redis` | Database (Redis) | Optional, for session caching at scale |

### Alternative Deployment (Docker Compose standalone)

If Coolify is not preferred, the same Docker setup works anywhere:

```yaml
# docker-compose.yml
version: '3.8'
services:
  app:
    build: .
    ports:
      - "3000:3000"
    environment:
      - DATABASE_URL=postgres://user:pass@db:5432/travelbot
      - GROQ_API_KEY=${GROQ_API_KEY}
      - DIALOG360_API_KEY=${DIALOG360_API_KEY}
    depends_on:
      - db
  db:
    image: postgres:15-alpine
    environment:
      - POSTGRES_USER=user
      - POSTGRES_PASSWORD=pass
      - POSTGRES_DB=travelbot
    volumes:
      - pgdata:/var/lib/postgresql/data
volumes:
  pgdata:
```

```bash
# Run anywhere with Docker Compose
docker-compose up -d
```

---

## Scalability Path

### Phase 1: MVP (100-200 users)
- Single VPS (2 CPU, 4GB RAM) running Coolify — ~$5-10/month (Hetzner, DigitalOcean)
- Node.js app + PostgreSQL on same VPS
- In-memory sessions
- Groq free tier
- **Cost: $5-10/month**

### Phase 2: Growth (500-1,000 users)
- Upgrade VPS (4 CPU, 8GB RAM) — ~$15-20/month
- Add Redis container for session caching — negligible cost (same VPS)
- Groq may need paid tier or heavier OpenAI fallback — ~$20/month
- **Cost: ~$35-40/month**

### Phase 3: Scale (1,000+ users)
- Dedicated database server (separate from app server)
- Load balancer + multiple app instances
- Database read replicas
- AI model fine-tuning for travel domain
- **Cost: $100-300/month depending on volume**

---

## Development Environment Setup

### Prerequisites
- Node.js 20 LTS
- npm or yarn
- Git
- Ngrok (for local webhook testing)
- 360dialog sandbox account (free)
- Groq API key (free tier)
- PostgreSQL 15+ (self-hosted via Coolify or Docker)

### Project Structure

```
travel-whatsapp-bot/
├── src/
│   ├── index.ts              # Entry point, Express app
│   ├── config/
│   │   └── index.ts          # Environment variables, agency config
│   ├── services/
│   │   ├── ai.service.ts     # Groq/OpenAI integration
│   │   ├── whatsapp.service.ts  # 360dialog API wrapper
│   │   ├── session.service.ts   # Session management
│   │   ├── mock-data.service.ts # Travel data repository
│   │   └── handoff.service.ts   # Human escalation
│   ├── handlers/
│   │   └── webhook.handler.ts   # WhatsApp webhook processing
│   ├── types/
│   │   └── index.ts          # TypeScript interfaces
│   └── utils/
│       └── logger.ts         # Structured logging
├── data/                     # Mock travel data (JSON)
├── tests/
│   └── *.test.ts             # Unit tests
├── .env.example
├── .env
├── Dockerfile
├── docker-compose.yml
├── tsconfig.json
└── package.json
```

### Key Dependencies

```json
{
  "dependencies": {
    "express": "^4.19.0",
    "groq-sdk": "^0.3.0",
    "openai": "^4.0.0",
    "pg": "^8.11.0",
    "dotenv": "^16.0.0",
    "zod": "^3.22.0"
  },
  "devDependencies": {
    "typescript": "^5.4.0",
    "@types/express": "^4.17.0",
    "@types/node": "^20.0.0",
    "ts-node-dev": "^2.0.0",
    "vitest": "^1.0.0"
  }
}
```

---

## Error Handling & Observability

### Error Handling Strategy

- **AI API failures:** Fallback to OpenAI if Groq fails. If both fail, return a graceful message: "I'm having trouble right now. Let me connect you with our team." + handoff.
- **Database failures:** Session data is in-memory primary, PostgreSQL is backup. If PostgreSQL fails, session continues in memory but metrics are lost.
- **Webhook failures:** 360dialog retries failed webhooks automatically. Return 500 for retry, 200 for success.
- **Timeout handling:** AI calls have 8-second timeout. If exceeded, return handoff message.

### Logging

- Structured JSON logging via `pino` or built-in console
- Log every incoming message, AI request/response, and handoff event
- Logs are accessible via Coolify's container log viewer or `docker logs`
- At scale: add log drain to a centralised logging service

### Monitoring

- **Coolify Dashboard:** Container health, deployment logs, resource usage (CPU, memory, disk)
- **PostgreSQL:** Query via `psql` or any PostgreSQL client (DBeaver, pgAdmin) for database health
- **Custom KPIs:** Stored in `kpis` table, queryable via simple SQL

---

## Key Technical Decisions

| Decision | Choice | Rationale |
|---|---|---|
| Runtime | Node.js + TypeScript | Mature WhatsApp ecosystem, type safety, easy to learn |
| Framework | Express.js | Simple, widely known, sufficient for webhooks |
| Deployment | Coolify | Self-hosted PaaS, Docker-native, no vendor lock-in |
| AI Provider | Groq (primary) + OpenAI (fallback) | Groq free tier = $0 cost; OpenAI ensures reliability |
| Database | Self-hosted PostgreSQL | Full data control, zero additional cost, native SQL |
| Session Store | In-memory (MVP) → Redis (scale) | Sufficient for 100-200 users; Redis added when needed |
| WhatsApp BSP | 360dialog | Free sandbox, Meta-preferred, simple webhook setup |
| Mock Data | JSON files + repository pattern | Zero infra cost, easy to swap for live APIs |
| Deployment Model | Docker containers on Coolify | Self-hosted, portable, no platform lock-in |

---

## Cost Estimate (MVP)

| Component | Provider | Monthly Cost |
|---|---|---|
| Hosting | VPS (Hetzner/DigitalOcean) | $5-10 |
| Database | Self-hosted PostgreSQL | $0 |
| AI Inference | Groq Free Tier | $0 |
| WhatsApp API | 360dialog Sandbox | $0 |
| Domain (optional) | Namecheap/Cloudflare | $1-2 |
| **Total** | | **$6-12/month** |

At 200 users with 20 messages/user/month, if Groq limits are exceeded:
- OpenAI GPT-4o Mini: ~4000 messages ≈ $3-5/month
- **Total: $9-17/month**

---

## Risks & Mitigations

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| Groq free tier limits exceeded | Medium | Medium | Fallback to OpenAI; monitor usage |
| VPS downtime or resource exhaustion | Low | High | Monitor resource usage in Coolify; upgrade VPS tier when CPU/memory consistently exceeds 70% |
| 360dialog API changes | Low | Medium | Abstract WhatsApp service; swap BSP if needed |
| Session loss on container restart | Medium | Medium | PostgreSQL persists sessions; container restart loads latest state from database |
| AI hallucination (wrong travel info) | Medium | High | Structured JSON responses; validate slots; human fallback for complex queries |
| WhatsApp message delivery delays | Low | Low | 360dialog handles delivery; bot retries on failure |
| User sends abusive/spam content | Low | Medium | Rate limiting per user; block list in agency config |

---

## Outstanding Questions

### Resolve Before Planning

- **[D1][Technical]** Confirm 360dialog sandbox access and webhook configuration process — verify this is achievable before starting the build.

### Deferred to Planning

- **[Technical]** Define the exact Zod schema for AI JSON responses — structured validation of intent, slots, action, and responseText fields.
- **[Technical]** Design the mock data JSON schema for flights, hotels, visa packages, and itineraries — field names, data types, and relationships.
- **[Technical]** Determine session recovery strategy on container restart — read from PostgreSQL on startup, or accept occasional session loss in MVP?
- **[Technical]** Design the handoff message format — how much context is sent to the agent? Full conversation transcript or summary only?
- **[Technical]** Define the KPI aggregation schedule — real-time, hourly, or daily batch?
- **[Needs research]** Confirm current Groq free tier limits (requests per minute, per day, per month) at time of deployment.
- **[Needs research]** Confirm 360dialog webhook payload format and authentication method (X-Hub-Signature vs token-based).