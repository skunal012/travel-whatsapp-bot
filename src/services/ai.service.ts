import {
  type AIResponse,
  type Message,
  type AgencyConfig,
  AIGroqResponseSchema,
  HandOffError,
} from '../types/index.js';

// ===========================================
// Provider Interfaces
// ===========================================

/**
 * AI Request interface
 */
export interface AIRequest {
  systemPrompt: string;
  conversationHistory: Message[];
  userMessage: string;
}

/**
 * AI Provider Interface
 * Implement this interface to add new AI providers (Anthropic, Google, etc.)
 */
export interface AIProvider {
  readonly name: string;
  readonly displayName: string;

  /**
   * Generate AI response
   * @param request - AI request with system prompt and conversation history
   * @returns Promise resolving to AI response
   * @throws Error on failure (caller should handle fallback)
   */
  generateResponse(request: AIRequest): Promise<AIResponse>;
}

// ===========================================
// Groq Provider
// ===========================================

interface GroqConfig {
  apiKey: string;
  model?: string;
  timeout?: number;
}

interface GroqChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

interface GroqAPIResponse {
  choices: Array<{
    message: {
      role: string;
      content: string;
    };
    finish_reason: string;
  }>;
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
  error?: {
    message: string;
    type: string;
    code: string;
  };
}

/**
 * Groq AI Provider
 * Primary AI provider - Groq offers free tier with fast inference
 */
export class GroqProvider implements AIProvider {
  readonly name = 'groq';
  readonly displayName = 'Groq';

  private apiKey: string;
  private model: string;
  private timeout: number;

  constructor(config: GroqConfig) {
    this.apiKey = config.apiKey;
    this.model = config.model || 'llama-3.3-70b-versatile';
    this.timeout = config.timeout || 8000;
  }

  async generateResponse(request: AIRequest): Promise<AIResponse> {
    const messages: GroqChatMessage[] = [
      { role: 'system', content: request.systemPrompt },
      ...request.conversationHistory.map(msg => ({
        role: msg.role as 'user' | 'assistant',
        content: msg.content,
      })),
      { role: 'user', content: request.userMessage },
    ];

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeout);

    try {
      const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: this.model,
          messages,
          temperature: 0.3,
          response_format: { type: 'json_object' },
          max_tokens: 1024,
        }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorBody = await response.text();
        console.error(JSON.stringify({
          level: 'error',
          message: 'Groq API error',
          context: { status: response.status, body: errorBody },
        }));
        
        if (response.status === 401) {
          throw new Error('Invalid Groq API key');
        }
        if (response.status === 429) {
          throw new Error('Groq rate limit exceeded');
        }
        throw new Error(`Groq API returned ${response.status}`);
      }

      const data = await response.json() as GroqAPIResponse;

      if (data.error) {
        throw new Error(`Groq error: ${data.error.message}`);
      }

      const content = data.choices[0]?.message?.content;
      if (!content) {
        throw new Error('Empty response from Groq');
      }

      return this.parseResponse(content, request.userMessage);
    } catch (error) {
      clearTimeout(timeoutId);
      
      if (error instanceof Error && error.name === 'AbortError') {
        throw new Error('Groq request timeout');
      }
      throw error;
    }
  }

  private parseResponse(content: string, userMessage: string): AIResponse {
    try {
      // Try to extract JSON from the response (may be wrapped in markdown code blocks)
      let jsonStr = content;
      const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/);
      if (jsonMatch) {
        jsonStr = jsonMatch[1];
      }

      const parsed = JSON.parse(jsonStr);
      const validated = AIGroqResponseSchema.parse(parsed);
      
      return {
        intent: validated.intent,
        slots: validated.slots || {},
        responseText: validated.response_text || this.generateDefaultResponse(validated.intent, userMessage),
        action: validated.action,
      };
    } catch (error) {
      console.error(JSON.stringify({
        level: 'error',
        message: 'Failed to parse AI response',
        context: { content: content.substring(0, 500), error: error instanceof Error ? error.message : String(error) },
      }));
      throw new Error('Invalid AI response format');
    }
  }

  private generateDefaultResponse(intent: string, userMessage: string): string {
    const intentResponses: Record<string, string> = {
      flight_booking: 'I can help you book flights. What destination are you looking for?',
      hotel_booking: 'I can help you find hotels. Which city would you like to stay in?',
      visa_assistance: 'I can help with visa information. What destination country are you planning to visit?',
      itinerary: 'I can help with your travel itinerary. What trip would you like to plan?',
      special: 'Let me connect you with our travel expert to help with your query.',
      greeting: 'Hello! Welcome to our travel assistant. How can I help you today?',
      handoff_request: 'I\'ll connect you with our travel expert.',
      out_of_scope: 'I\'m not sure I can help with that. Let me connect you with our team.',
    };

    return intentResponses[intent] || `You said: "${userMessage}". How can I help you?`;
  }
}

// ===========================================
// OpenAI Provider
// ===========================================

interface OpenAIConfig {
  apiKey: string;
  model?: string;
  timeout?: number;
}

interface OpenAIAPIResponse {
  choices: Array<{
    message: {
      role: string;
      content: string;
    };
    finish_reason: string;
  }>;
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
  error?: {
    message: string;
    type: string;
    code: string;
  };
}

/**
 * OpenAI Provider
 * Fallback AI provider - OpenAI GPT-4o Mini for reliability
 */
export class OpenAIProvider implements AIProvider {
  readonly name = 'openai';
  readonly displayName = 'OpenAI';

  private apiKey: string;
  private model: string;
  private timeout: number;

  constructor(config: OpenAIConfig) {
    this.apiKey = config.apiKey;
    this.model = config.model || 'gpt-4o-mini';
    this.timeout = config.timeout || 8000;
  }

  async generateResponse(request: AIRequest): Promise<AIResponse> {
    const messages: GroqChatMessage[] = [
      { role: 'system', content: request.systemPrompt },
      ...request.conversationHistory.map(msg => ({
        role: msg.role as 'user' | 'assistant',
        content: msg.content,
      })),
      { role: 'user', content: request.userMessage },
    ];

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeout);

    try {
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: this.model,
          messages,
          temperature: 0.3,
          response_format: { type: 'json_object' },
          max_tokens: 1024,
        }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorBody = await response.text();
        console.error(JSON.stringify({
          level: 'error',
          message: 'OpenAI API error',
          context: { status: response.status, body: errorBody },
        }));
        
        if (response.status === 401) {
          throw new Error('Invalid OpenAI API key');
        }
        if (response.status === 429) {
          throw new Error('OpenAI rate limit exceeded');
        }
        throw new Error(`OpenAI API returned ${response.status}`);
      }

      const data = await response.json() as OpenAIAPIResponse;

      if (data.error) {
        throw new Error(`OpenAI error: ${data.error.message}`);
      }

      const content = data.choices[0]?.message?.content;
      if (!content) {
        throw new Error('Empty response from OpenAI');
      }

      return this.parseResponse(content, request.userMessage);
    } catch (error) {
      clearTimeout(timeoutId);
      
      if (error instanceof Error && error.name === 'AbortError') {
        throw new Error('OpenAI request timeout');
      }
      throw error;
    }
  }

  private parseResponse(content: string, userMessage: string): AIResponse {
    try {
      // Try to extract JSON from the response (may be wrapped in markdown code blocks)
      let jsonStr = content;
      const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/);
      if (jsonMatch) {
        jsonStr = jsonMatch[1];
      }

      const parsed = JSON.parse(jsonStr);
      const validated = AIGroqResponseSchema.parse(parsed);
      
      return {
        intent: validated.intent,
        slots: validated.slots || {},
        responseText: validated.response_text || this.generateDefaultResponse(validated.intent, userMessage),
        action: validated.action,
      };
    } catch (error) {
      console.error(JSON.stringify({
        level: 'error',
        message: 'Failed to parse AI response',
        context: { content: content.substring(0, 500), error: error instanceof Error ? error.message : String(error) },
      }));
      throw new Error('Invalid AI response format');
    }
  }

  private generateDefaultResponse(intent: string, userMessage: string): string {
    const intentResponses: Record<string, string> = {
      flight_booking: 'I can help you book flights. What destination are you looking for?',
      hotel_booking: 'I can help you find hotels. Which city would you like to stay in?',
      visa_assistance: 'I can help with visa information. What destination country are you planning to visit?',
      itinerary: 'I can help with your travel itinerary. What trip would you like to plan?',
      special: 'Let me connect you with our travel expert to help with your query.',
      greeting: 'Hello! Welcome to our travel assistant. How can I help you today?',
      handoff_request: 'I\'ll connect you with our travel expert.',
      out_of_scope: 'I\'m not sure I can help with that. Let me connect you with our team.',
    };

    return intentResponses[intent] || `You said: "${userMessage}". How can I help you?`;
  }
}

// ===========================================
// AI Service
// ===========================================

interface AIServiceConfig {
  primaryProvider: AIProvider;
  fallbackProvider?: AIProvider;
  maxRetries?: number;
}

/**
 * AI Service
 * Main service for AI interactions with provider abstraction and fallback support
 */
export class AIService {
  private primaryProvider: AIProvider;
  private fallbackProvider?: AIProvider;
  private maxRetries: number;

  constructor(config: AIServiceConfig) {
    this.primaryProvider = config.primaryProvider;
    this.fallbackProvider = config.fallbackProvider;
    this.maxRetries = config.maxRetries ?? 1;
  }

  /**
   * Process a user message and return AI response
   */
  async processMessage(
    userMessage: string,
    conversationHistory: Message[],
    agencyConfig: AgencyConfig,
    flowContext?: { currentFlow?: string; collectedSlots?: Record<string, unknown> }
  ): Promise<AIResponse> {
    const systemPrompt = this.buildSystemPrompt(agencyConfig, flowContext);

    const request: AIRequest = {
      systemPrompt,
      conversationHistory,
      userMessage,
    };

    // Try primary provider
    try {
      const response = await this.primaryProvider.generateResponse(request);
      console.info(JSON.stringify({
        level: 'info',
        message: 'AI response generated',
        context: {
          provider: this.primaryProvider.name,
          intent: response.intent,
          action: response.action,
        },
      }));
      return response;
    } catch (primaryError) {
      console.warn(JSON.stringify({
        level: 'warn',
        message: 'Primary AI provider failed, trying fallback',
        context: {
          primaryProvider: this.primaryProvider.name,
          error: primaryError instanceof Error ? primaryError.message : String(primaryError),
        },
      }));

      // Try fallback provider
      if (this.fallbackProvider) {
        try {
          const response = await this.fallbackProvider.generateResponse(request);
          console.info(JSON.stringify({
            level: 'info',
            message: 'AI response generated from fallback',
            context: {
              provider: this.fallbackProvider.name,
              intent: response.intent,
              action: response.action,
            },
          }));
          return response;
        } catch (fallbackError) {
          console.error(JSON.stringify({
            level: 'error',
            message: 'Both AI providers failed',
            context: {
              primaryProvider: this.primaryProvider.name,
              fallbackProvider: this.fallbackProvider.name,
              primaryError: primaryError instanceof Error ? primaryError.message : String(primaryError),
              fallbackError: fallbackError instanceof Error ? fallbackError.message : String(fallbackError),
            },
          }));
          throw new HandOffError(
            'AI service unavailable. Connecting you with a human agent.',
            '',
            'unknown',
            []
          );
        }
      }

      // No fallback configured
      console.error(JSON.stringify({
        level: 'error',
        message: 'AI provider failed and no fallback configured',
        context: {
          provider: this.primaryProvider.name,
          error: primaryError instanceof Error ? primaryError.message : String(primaryError),
        },
      }));
      throw new HandOffError(
        'AI service temporarily unavailable. Connecting you with a human agent.',
        '',
        'unknown',
        []
      );
    }
  }

  /**
   * Build system prompt from agency config and flow context
   */
  private buildSystemPrompt(
    agencyConfig: AgencyConfig,
    flowContext?: { currentFlow?: string; collectedSlots?: Record<string, unknown> }
  ): string {
    const agencyName = agencyConfig.agencyName || 'Travel Assistant';
    const businessHoursStart = agencyConfig.businessHoursStart || '09:00';
    const businessHoursEnd = agencyConfig.businessHoursEnd || '18:00';
    const fallbackNumber = agencyConfig.fallbackNumber || 'not configured';

    let prompt = `You are ${agencyName}, a helpful travel assistant on WhatsApp.
Your role is to help travellers in India and GCC plan their trips by collecting their requirements and presenting options.
You speak English only in this MVP.

PERSONALITY:
- Be friendly, professional, and concise
- Ask one question at a time
- Confirm details before showing options
- Always offer to connect with a human agent if the user seems frustrated or asks something you cannot handle

BUSINESS HOURS: ${businessHoursStart} - ${businessHoursEnd}
FALLBACK NUMBER: ${fallbackNumber}

CONVERSATION RULES:
1. Classify the user's message into one of these intents:
   - flight_booking: User wants to search or book flights
   - hotel_booking: User wants to find accommodations
   - visa_assistance: User needs visa information or help with visa applications
   - itinerary: User wants to plan or modify an itinerary
   - special: User has a specific request that doesn't fit other categories (escalate immediately)
   - greeting: User is saying hello or starting a conversation
   - handoff_request: User explicitly asks to talk to a human
   - out_of_scope: User asks something you cannot help with

2. Extract travel details (slots) from the conversation:
   - origin: Where the user is travelling from (city name or airport code)
   - destination: Where the user is travelling to (city name or airport code)
   - departureDate: When they want to travel (date in YYYY-MM-DD format)
   - returnDate: Return date if applicable (date in YYYY-MM-DD format)
   - travelers: Number of travellers
   - cabinClass: preferred cabin class (economy, business, first)
   - hotelCity: City for hotel stay
   - checkInDate: Hotel check-in date
   - checkOutDate: Hotel check-out date
   - visaCountry: Country they need visa for
   - nationality: User's nationality

3. Respond with exactly ONE action:
   - ask_clarification: Ask a follow-up question to get more details
   - show_options: Present 2-3 options based on the collected slots
   - confirm: Summarize collected details and ask for confirmation
   - handoff: Route to human agent (include reason in responseText)
   - greeting: Send a welcome message
   - out_of_scope: Politely explain you can't help and suggest human escalation

4. Keep responses SHORT and CONVERSATIONAL - max 3-4 sentences for WhatsApp.
5. Use numbered lists for presenting options (1., 2., 3.).
6. Always end with a clear next step or offer to connect with agent.

RESPONSE FORMAT (always respond with valid JSON):
{
  "intent": "flight_booking",
  "slots": {
    "origin": "Mumbai",
    "destination": "Dubai",
    "departureDate": "2026-06-15"
  },
  "response_text": "I found flights from Mumbai to Dubai on June 15th. Here are the top options:",
  "action": "show_options"
}
`;

    // Add flow-specific context if available
    if (flowContext?.currentFlow) {
      const flowInstructions: Record<string, string> = {
        flight_booking: `
CURRENT FLOW: Flight Booking
Collect: origin, destination, departureDate, returnDate, travelers, cabinClass
Present 2-3 flight options sorted by price when all required slots are collected.
`,
        hotel_booking: `
CURRENT FLOW: Hotel Booking
Collect: hotelCity, checkInDate, checkOutDate, travelers, starRating preference
Present 2-3 hotel options sorted by rating when all required slots are collected.
`,
        visa_assistance: `
CURRENT FLOW: Visa Assistance
Collect: visaCountry, nationality, visaType (tourist/business)
Present 2-3 visa packages when all required slots are collected.
`,
        itinerary: `
CURRENT FLOW: Itinerary Planning
Collect: destination, startDate, endDate, travelers
Show day-by-day itinerary breakdown when all required slots are collected.
`,
      };

      const flowInstruction = flowInstructions[flowContext.currentFlow];
      if (flowInstruction) {
        prompt += flowInstruction;
      }

      // Add collected slots context
      if (flowContext.collectedSlots && Object.keys(flowContext.collectedSlots).length > 0) {
        prompt += `\nCOLLECTED DETAILS: ${JSON.stringify(flowContext.collectedSlots)}\n`;
        prompt += `Continue from these details - don't ask for info already provided.\n`;
      }
    }

    return prompt;
  }
}

// ===========================================
// Factory Function
// ===========================================

type AIProviderType = 'groq' | 'openai';

/**
 * Create AI service with provider abstraction
 * @param providerType - Primary provider: 'groq' or 'openai'
 * @param config - Provider configurations
 */
export function createAIService(
  providerType: AIProviderType,
  config: {
    groqApiKey?: string;
    openaiApiKey?: string;
    groqModel?: string;
    openaiModel?: string;
  }
): AIService {
  let primaryProvider: AIProvider;
  let fallbackProvider: AIProvider | undefined;

  switch (providerType) {
    case 'groq':
      if (!config.groqApiKey) {
        throw new Error('GROQ_API_KEY is required when AI_PROVIDER is set to groq');
      }
      primaryProvider = new GroqProvider({
        apiKey: config.groqApiKey,
        model: config.groqModel,
        timeout: 8000,
      });
      
      // OpenAI as fallback if API key is available
      if (config.openaiApiKey) {
        fallbackProvider = new OpenAIProvider({
          apiKey: config.openaiApiKey,
          model: config.openaiModel,
          timeout: 8000,
        });
      }
      break;

    case 'openai':
      if (!config.openaiApiKey) {
        throw new Error('OPENAI_API_KEY is required when AI_PROVIDER is set to openai');
      }
      primaryProvider = new OpenAIProvider({
        apiKey: config.openaiApiKey,
        model: config.openaiModel,
        timeout: 8000,
      });
      break;

    default:
      throw new Error(`Unknown AI provider: ${providerType}`);
  }

  return new AIService({
    primaryProvider,
    fallbackProvider,
    maxRetries: 1,
  });
}