---
date: 2026-05-17
topic: travel-agency-whatsapp-chatbot-mvp
---

# WhatsApp AI Travel Assistant — MVP Requirements Document

---

## Summary

A WhatsApp-based AI travel assistant sold as a product to travel agencies in India and GCC countries. The chatbot handles four self-service flows — flight booking, hotel booking, visa assistance, and itinerary management — through natural conversational AI. Each flow follows a four-step structure: intent detection, slot filling, option generation, and confirmation or human fallback. The MVP uses mock data with a clean abstraction layer so live travel APIs can be swapped in via configuration after deployment. The core value proposition is travel domain expertise encoded into structured AI flows, reducing manual agent workload by 60–80% on common queries.

---

## Problem Frame

Travel agencies in India and GCC receive hundreds of WhatsApp, email, and phone queries daily — flight searches, hotel comparisons, visa requirements, itinerary changes. Each query currently takes a human agent 15–30 minutes to handle manually, typing individual replies across multiple channels. Agencies lose customers who expect instant responses. Agents burn out on repetitive questions. The cost of scaling is linear: hire more agents as volume grows.

WhatsApp Business API exists, but agencies lack the technical capability to automate intelligently. Generic bots exist but lack travel domain depth — they can't handle "my visa was rejected, what are my options?" or "I need a 7-day Dubai itinerary with a 4-star hotel under $150/night." The gap is a travel-aware AI assistant that understands the domain, guides users through structured flows, and only escalates to a human when needed.

A third-party product layer — built, deployed, and maintained — solves this for agencies who want AI capability without building it themselves. The durable value is in the travel domain expertise embedded in conversation flows, not in the WhatsApp channel itself.

---

## Actors

- A1. **End User (Traveller):** A person inquiring about or purchasing travel services via WhatsApp. Communicates in English. Has varying comfort with AI interaction. Wants fast answers, clear options, and a simple path to completion or human help.
- A2. **Travel Agency Agent:** A human agent at the travel agency who receives escalated queries from the bot via a shared WhatsApp inbox or dashboard. Intervenes when the bot cannot resolve a request or the user requests human assistance.
- A3. **Travel Agency Admin:** The agency owner or manager who configures the bot, sets business hours, manages fallback contacts, and views usage KPIs. May not be technical.
- A4. **System (Bot):** The AI-powered WhatsApp chatbot. Interprets user intent, fills structured slots, generates mock options, and decides when to hand off to a human agent.

---

## Key Flows

- F1. **Flight Booking Flow**
  - **Trigger:** User sends a message expressing intent to book a flight ("I need to go to Dubai next Friday")
  - **Actors:** A1, A4
  - **Steps:** (1) Intent detected — bot confirms flight booking mode. (2) Slot filling — collects origin, destination, travel dates, number of travellers, cabin class. (3) Option generation — bot presents 2–3 mock flight options with prices. (4) Confirmation — user selects an option; bot summarises booking details and offers to connect with agent for final confirmation and payment. Human fallback available at any step.
  - **Outcome:** User completes the option selection step. Booking is escalated to agent for fulfilment.
  - **Covered by:** R1, R2, R3, R10, R16

- F2. **Hotel Booking Flow**
  - **Trigger:** User expresses intent to book accommodation ("Looking for a hotel in Dubai for 3 nights")
  - **Actors:** A1, A4
  - **Steps:** (1) Intent confirmed. (2) Slot filling — city, check-in/out dates, number of guests, star rating preference, budget range. (3) Option generation — 2–3 mock hotel options with nightly rate and key amenities. (4) Confirmation — user selects; bot summarises and escalates to agent.
  - **Outcome:** User completes option selection. Booking escalated to agent.
  - **Covered by:** R1, R4, R5, R10, R16

- F3. **Visa Assistance Flow**
  - **Trigger:** User asks about visa requirements or assistance ("I need a visa for Dubai")
  - **Actors:** A1, A4
  - **Steps:** (1) Intent confirmed. (2) Slot filling — destination country, visa type, nationality, travel dates. (3) Option generation — mock visa packages with requirements list, processing time, and fee. (4) Confirmation — user selects; bot escalates to agent with collected details.
  - **Outcome:** User receives visa guidance and is connected to agent for application.
  - **Covered by:** R1, R6, R7, R10, R16

- F4. **Itinerary Management Flow**
  - **Trigger:** User references an existing booking or requests itinerary help ("Can you share my itinerary for the Dubai trip")
  - **Actors:** A1, A4, A2
  - **Steps:** (1) Intent confirmed — bot asks for booking reference or traveller name. (2) Slot filling — collects or verifies booking reference. (3) Option generation — bot retrieves and displays mock itinerary with day-by-day summary. (4) Modification requests are escalated to agent with booking details.
  - **Outcome:** User receives itinerary summary. Modifications routed to agent.
  - **Covered by:** R1, R8, R9, R10, R16

- F5. **Special/Custom Query Flow**
  - **Trigger:** User request does not match any of the four primary flows ("I need a car from Abu Dhabi to Al Ain" or "Do you have Sri Lanka tour packages?")
  - **Actors:** A1, A4, A2
  - **Steps:** (1) Intent classified as special query. (2) Bot acknowledges, summarises the request in structured format, and immediately offers human fallback ("Let me connect you with our travel expert"). (3) Query details + conversation context forwarded to agent. (4) Agent resolves via WhatsApp and closes the thread.
  - **Outcome:** Query is escalated to human agent. User receives a response within the agency's SLA window.
  - **Covered by:** R10, R11, R16

- F6. **Human Handoff Flow**
  - **Trigger:** User says "talk to an agent," "human," or explicitly requests escalation at any point; OR bot triggers handoff at end of any primary flow
  - **Actors:** A1, A4, A2
  - **Steps:** (1) Bot acknowledges the handoff request. (2) Bot summarises the conversation context so the agent doesn't need to re-ask. (3) Bot provides the agent's contact number (agency's WhatsApp Business number or agent hotline). (4) Conversation log is attached so the agent has full context.
  - **Outcome:** User is connected to a human agent with full context. No re-explanation required.
  - **Covered by:** R10, R16

---

## Requirements

**[Core Chatbot Behavior]**

- R1. The bot MUST interpret natural language messages from users on WhatsApp and classify intent into one of the five flows: flight booking, hotel booking, visa assistance, itinerary management, or special/custom query.
- R2. The bot MUST collect structured travel details (slots) conversationally: origin, destination, dates, travellers, and service-specific parameters. The bot MUST ask for missing information before presenting options.
- R3. The bot MUST generate and display 2–3 flight options (for the flight flow) with mock data including airline, route, departure time, arrival time, duration, and price.
- R4. The bot MUST generate and display 2–3 hotel options (for the hotel flow) with mock data including hotel name, star rating, nightly rate, key amenities, and location.
- R5. The bot MUST generate and display 2–3 visa package options (for the visa flow) with mock data including visa type, processing time, fee, and key requirements.
- R6. The bot MUST provide a document checklist for visa applications (for the visa flow) based on destination country and applicant nationality.
- R7. The bot MUST display an itinerary summary (for the itinerary flow) including destination, dates, services booked, and a day-by-day breakdown.
- R8. The bot MUST support itinerary modification requests and route them to the agency agent with booking reference and requested changes.
- R9. The bot MUST maintain conversation context throughout a session — a user does NOT need to re-explain details they already provided earlier in the same conversation.

**[Human Escalation and Fallback]**

- R10. The bot MUST offer human agent fallback at the end of every primary flow. This MUST include the agency's contact number and a clear signal that an agent will follow up.
- R11. The bot MUST escalate special/custom queries immediately to the agency agent with a structured summary of the request and full conversation context, without forcing the user to repeat information.
- R12. The bot MUST allow the user to trigger human handoff at any point during the conversation via natural language (e.g., "talk to agent," "connect me with someone," "human").
- R13. The bot MUST surface the conversation summary to the human agent upon handoff — the agent MUST NOT need to re-ask what the user already provided.

**[Mock Data and Extensibility]**

- R14. All travel options (flights, hotels, visa packages) MUST be served from a configurable mock data layer. This layer MUST be implemented as a separate abstraction so that swapping in live travel APIs requires configuration changes only, not code changes to the bot logic.
- R15. The mock data layer MUST support per-agency customisation — agencies can upload or edit their own mock pricing and package data without accessing bot source code.

**[Multi-Session and State]**

- R16. The bot MUST support session-based context — if a user leaves mid-flow and returns within 24 hours, the bot MUST resume the flow from the last known state without requiring re-entry of previously provided information.
- R17. The bot MUST handle out-of-scope messages gracefully — queries it cannot interpret MUST NOT crash or loop, and MUST always offer the human fallback option.

**[Admin Configuration]**

- R18. The agency admin MUST be able to configure the bot's fallback contact number via a configuration file or admin panel.
- R19. The agency admin MUST be able to set business hours, after which the bot displays a message indicating the agent is unavailable and when to expect a response.
- R20. The agency admin MUST be able to view usage KPIs: total queries received, deflection rate, flow completion rate, average response time, and escalation rate.

---

## Acceptance Examples

- AE1. **Covers R1, R2, R3.** Given a user sends "I need to fly from Mumbai to Dubai next Friday for 2 adults," when the bot processes the message, then the bot extracts intent (flight booking), fills all slots from the single message (origin=Mumbai, destination=Dubai, date=next Friday, travellers=2, service=flight), and presents 2–3 mock flight options within seconds without asking a single follow-up question.

- AE2. **Covers R10.** Given a user completes the hotel booking flow by selecting an option, when the bot presents the summary, then the bot also displays the agent contact number and a message: "To complete your booking, our travel expert will reach out to you within [X] hours. You can also reach us directly at [number]."

- AE3. **Covers R11, R13.** Given a user sends "I need a luxury car from Dubai to Oman with a driver for 3 days," when the bot classifies this as a special/custom query, then the bot immediately acknowledges, summarises the request, and routes to an agent — the agent receives the full context without the user having to repeat it.

- AE4. **Covers R16.** Given a user began a flight booking flow, provided origin and destination, then went silent for 12 hours, when the user returns and sends "continue," then the bot resumes from the flight flow with the previously provided origin and destination already populated, asking only for missing slots.

- AE5. **Covers R14.** Given the mock data layer uses a JSON configuration file, when the agency updates the file with live API endpoint credentials, then all bot flows begin returning live data without any changes to bot logic, conversation flows, or WhatsApp integration code.

- AE6. **Covers R17.** Given a user sends "What is 2+2?" when the bot cannot classify the message, then the bot responds with a graceful message: "I'm here to help with travel bookings — flights, hotels, visas, and itineraries. How can I help you today?" and offers the human fallback option.

- AE7. **Covers R19.** Given the agency admin has set business hours as Monday–Saturday 9 AM–6 PM GST, when a user sends a message outside those hours, then the bot replies with a time-aware message: "Our team is currently unavailable. Our working hours are Monday–Saturday, 9 AM–6 PM GST. You'll hear from us within [X] hours of our next business day."

---

## Success Criteria

- **User outcome:** A traveller can complete a flight, hotel, or visa inquiry through WhatsApp without speaking to a human agent, receiving a curated set of options within 60 seconds of initiating the conversation.
- **Agency outcome:** The travel agency deflects at least 60% of common travel queries to the bot, reducing agent handling time by 15–30 minutes per escalated query.
- **Downstream-agent handoff quality:** When a query IS escalated to a human agent, the agent receives a structured summary with full conversation context — the agent does not need to re-ask what the user already provided.
- **Technical outcome:** The bot responds to a user message within 10 seconds on average. The bot maintains context across a full session. Session state is preserved for 24 hours.
- **Extensibility outcome:** The mock data layer can be replaced with live travel APIs by updating configuration without changes to bot core logic.

---

## Scope Boundaries

### Deferred for later

- Payment processing within the WhatsApp chat (UPI, card, wallet integration)
- PDF itinerary export and sharing via WhatsApp
- Multi-language support (Arabic for GCC)
- User authentication or account creation (anonymous access only in MVP)
- Live travel API integration in MVP (mock data only; live APIs are a post-MVP configuration swap)
- Loyalty program or user preference memory across sessions (Approach C territory)
- Mobile app or web-based chat interface (WhatsApp only in MVP)
- Agency admin dashboard for bot management (configuration file only; no GUI admin panel)
- Push notifications or proactive message campaigns to users

### Outside this product's identity

- A generic FAQ bot with no travel domain expertise
- A booking engine that processes real payments and issues tickets directly
- A social media or multi-channel bot (WhatsApp only; Instagram, Facebook, website chat are outside scope)
- A tool for travel agencies to manage their internal operations, CRM, or accounting

---

## Key Decisions

- **Approach B (Conversational Travel Assistant):** Full AI-powered natural language flows rather than menu-button flows. Reasoning: travel queries are too varied and nuanced for button-based UX. A conversational approach handles "I need to go to Dubai but I'm not sure which dates yet" gracefully. Menu buttons would collapse under real user variety.
- **Mock data with abstraction layer:** All travel options served from a configurable data layer rather than hardcoded static replies. Reasoning: enables demonstration of end-to-end flows immediately, and swapping to live APIs later is a configuration change, not a rebuild.
- **WhatsApp-only MVP:** No web chat, no mobile app, no multi-channel support. Reasoning: WhatsApp has the highest penetration in India and GCC. Adding channels in MVP adds complexity without proportional value.
- **English-only for MVP:** Bot communicates in English only, even in GCC markets. Reasoning: Arabic localization is a significant additional build and QA effort. English is widely understood in Indian and GCC travel markets. Arabic added post-MVP.
- **Per-query escalation to agent (not automated booking):** The bot presents options and collects intent but does not book or confirm independently. All bookings are routed to the human agent for final confirmation and payment. Reasoning: travel bookings involve payment, personal data, and provider coordination — a fully automated booking flow without human confirmation introduces compliance and liability risk. Keeping a human in the loop is appropriate for MVP.
- **4 self-service steps as the target flow length:** Each primary flow (flights, hotels, visa, itinerary) is designed for a maximum of 4 conversational steps. Reasoning: longer flows increase abandonment rates and session timeout risk. Complex multi-step bookings are always completable in 4 steps; if more detail is needed, the bot escalates to the agent with full context.

---

## Dependencies / Assumptions

- D1. **WhatsApp Business API access:** The product requires access to WhatsApp Business API via a Meta-approved Business Solution Provider (BSP) such as Twilio, MessageBird, or 360dialog. BSP setup, app verification, and phone number provisioning are prerequisites before development can begin.
- D2. **AI API access:** The bot relies on a large language model API (OpenAI GPT-4o Mini or Anthropic Claude Haiku) for intent classification, slot filling, and response generation. API credentials are required.
- D3. **Mock data design:** The mock data layer requires a structured schema for flights, hotels, visa packages, and itineraries. The schema will be defined in the requirements doc and implemented as a JSON or YAML configuration file.
- D4. **Agency WhatsApp Business number:** Each agency will use their own WhatsApp Business number for the bot. The bot is not a shared multi-tenant service in MVP.
- D5. **Language model costs:** AI API calls have a per-message cost. At MVP scale, costs will be minimal (under $50/month for a typical agency). Costs scale with conversation volume.
- D6. **No payment integration in MVP:** Bookings are confirmed by the agency agent outside the bot. In-app or in-chat payment is deferred.
- D7. **GCC WhatsApp Business API availability:** WhatsApp Business API is available in all GCC countries. No special regulatory approvals are required beyond standard BSP onboarding.

---

## Outstanding Questions

### Resolve Before Planning

- **[D1][Business]** Which Business Solution Provider (BSP) will be used for WhatsApp Business API — Twilio, MessageBird, 360dialog, or another? This affects development tooling, pricing, and some API behavior. Decision needed before technical planning.

### Deferred to Planning

- **[R14][Technical]** Define the exact schema for the mock data layer (flights, hotels, visa packages, itineraries) — field names, data types, nesting structure. This requires a technical design pass and should be answered during planning or early in the build phase.
- **[R15][Technical]** Determine the mechanism for per-agency mock data customisation — JSON file upload, admin API endpoint, or simple file edit on the server. This is a deployment configuration decision.
- **[R18][Technical]** Design the admin configuration approach — configuration file (YAML/JSON), simple admin panel, or both. Simplicity in MVP suggests a configuration file first.
- **[R20][Technical]** Define the KPI data pipeline — where are metrics collected, how are they stored, and how is the admin dashboard (or configuration readout) powered? Likely database + lightweight API for MVP.
- **[Needs research]** What are the WhatsApp Business API rate limits and conversation pricing for India and GCC specifically? Confirm current BSP pricing at time of deployment.
- **[Needs research]** For the visa assistance flow — are there any regulatory or compliance considerations for providing visa guidance in India/GCC markets? Does the bot need a disclaimer or compliance notice?
- **[Needs research]** Should the bot store conversation history, and if so, for how long? WhatsApp has its own message retention policies; the bot layer may need its own data retention policy depending on agency requirements and local data privacy laws.