import { z } from 'zod';

// ===========================================
// Flow Types
// ===========================================

export type FlowType =
  | 'flight'
  | 'hotel'
  | 'visa'
  | 'itinerary'
  | 'special'
  | 'unknown';

export type IntentType =
  | 'flight_booking'
  | 'hotel_booking'
  | 'visa_assistance'
  | 'itinerary'
  | 'special'
  | 'greeting'
  | 'handoff_request'
  | 'out_of_scope';

export type ActionType =
  | 'ask_clarification'
  | 'show_options'
  | 'confirm'
  | 'handoff'
  | 'greeting';

// ===========================================
// AI Service Types
// ===========================================

export interface Message {
  role: 'user' | 'bot' | 'system';
  content: string;
  timestamp: Date;
}

export interface AIRequest {
  systemPrompt: string;
  conversationHistory: Message[];
  userMessage: string;
}

export interface AIResponse {
  intent: IntentType;
  slots: Record<string, unknown>;
  responseText: string;
  action: ActionType;
}

/**
 * Zod schema for AI response from Groq/OpenAI
 * Note: API responses use snake_case, we convert to camelCase in service
 */
export const AIGroqResponseSchema = z.object({
  intent: z.enum([
    'flight_booking',
    'hotel_booking',
    'visa_assistance',
    'itinerary',
    'special',
    'greeting',
    'handoff_request',
    'out_of_scope',
  ]),
  slots: z.record(z.unknown()).optional().default({}),
  response_text: z.string().optional(),
  action: z.enum([
    'ask_clarification',
    'show_options',
    'confirm',
    'handoff',
    'greeting',
  ]),
});

export const AIResponseSchema = z.object({
  intent: z.enum([
    'flight_booking',
    'hotel_booking',
    'visa_assistance',
    'itinerary',
    'special',
    'greeting',
    'handoff_request',
    'out_of_scope',
  ]),
  slots: z.record(z.unknown()),
  responseText: z.string(),
  action: z.enum([
    'ask_clarification',
    'show_options',
    'confirm',
    'handoff',
    'greeting',
  ]),
});

// ===========================================
// Session Types
// ===========================================

export interface Session {
  id: string;
  userId: string;
  currentFlow: FlowType;
  slots: Record<string, unknown>;
  context: Message[];
  messageCount: number;
  createdAt: Date;
  updatedAt: Date;
  expiresAt: Date;
}

export interface SessionStore {
  get(userId: string): Promise<Session | null>;
  set(userId: string, session: Session): Promise<void>;
  delete(userId: string): Promise<void>;
  update(userId: string, updates: Partial<Session>): Promise<void>;
}

// ===========================================
// Travel Data Types
// ===========================================

export interface FlightOption {
  id: string;
  airline: string;
  airlineCode: string;
  origin: string;
  originCode: string;
  destination: string;
  destinationCode: string;
  departureTime: string;
  arrivalTime: string;
  duration: string;
  stops: number;
  cabinClass: 'economy' | 'business' | 'first';
  price: number;
  currency: string;
  flightNumber: string;
}

export interface HotelOption {
  id: string;
  name: string;
  starRating: number;
  location: string;
  city: string;
  nightlyRate: number;
  currency: string;
  amenities: string[];
  roomTypes: string[];
  checkInTime: string;
  checkOutTime: string;
}

export interface VisaPackage {
  id: string;
  visaType: string;
  destinationCountry: string;
  nationality: string;
  processingDays: number;
  fee: number;
  currency: string;
  requirements: string[];
  validity: string;
  maxStay: string;
}

export interface ItineraryDay {
  day: number;
  date: string;
  activity: string;
  location: string;
  notes?: string;
}

export interface Itinerary {
  id: string;
  bookingReference: string;
  destination: string;
  startDate: string;
  endDate: string;
  travellers: number;
  services: string[];
  days: ItineraryDay[];
  totalCost?: number;
  currency?: string;
}

// ===========================================
// Travel Data Provider Interface
// ===========================================

export interface TravelDataProvider {
  getFlights(
    origin: string,
    destination: string,
    date: string,
    cabinClass?: string
  ): Promise<FlightOption[]>;

  getHotels(
    city: string,
    checkIn: string,
    checkOut: string,
    starRating?: number
  ): Promise<HotelOption[]>;

  getVisaPackages(
    country: string,
    nationality: string
  ): Promise<VisaPackage[]>;

  getItinerary(bookingReference: string): Promise<Itinerary | null>;
}

// ===========================================
// WhatsApp / 360dialog Types
// ===========================================

export interface WhatsAppMessage {
  from: string;
  id: string;
  timestamp: string;
  type: 'text' | 'image' | 'document' | 'location' | 'audio';
  text?: {
    body: string;
  };
  image?: {
    id: string;
    mime_type: string;
    sha256: string;
    caption?: string;
  };
}

export interface WhatsAppWebhookPayload {
  messaging_product: string;
  messages: WhatsAppMessage[];
  contacts?: Array<{
    wa_id: string;
    profile: {
      name: string;
    };
  }>;
}

export interface WhatsAppOutgoingMessage {
  messaging_product: string;
  recipient_type: string;
  to: string;
  type: 'text' | 'image' | 'document' | 'audio' | 'sticker';
  text?: {
    body: string;
  };
}

// ===========================================
// Agency Configuration
// ===========================================

export interface AgencyConfig {
  agencyName: string;
  fallbackNumber: string;
  businessHoursStart: string;
  businessHoursEnd: string;
  timezone: string;
  mockDataPath: string;
}

// ===========================================
// Database Row Types
// ===========================================

export interface SessionRow {
  id: string;
  user_id: string;
  current_flow: string;
  slots: Record<string, unknown>;
  context: Message[];
  message_count: number;
  created_at: Date;
  updated_at: Date;
  expires_at: Date;
}

export interface ConversationRow {
  id: string;
  session_id: string;
  user_message: string;
  bot_response: string;
  intent: string;
  action: string;
  response_time_ms: number;
  created_at: Date;
}

export interface KPIRow {
  date: string;
  total_queries: number;
  deflected_queries: number;
  escalated_queries: number;
  avg_response_time_ms: number;
  completion_rate: number;
}

export interface AgencyConfigRow {
  id: string;
  agency_name: string;
  fallback_number: string;
  business_hours_start: string;
  business_hours_end: string;
  timezone: string;
  mock_data_path: string;
  created_at: Date;
}

// ===========================================
// Environment Variable Schema
// ===========================================

export const EnvSchema = z.object({
  // AI Provider
  GROQ_API_KEY: z.string().min(1, 'GROQ_API_KEY is required'),
  OPENAI_API_KEY: z.string().optional(),
  AI_PROVIDER: z.enum(['groq', 'openai']).default('groq'),

  // 360dialog
  DIALOG360_API_KEY: z.string().min(1, 'DIALOG360_API_KEY is required'),

  // Database
  DATABASE_URL: z.string().url('DATABASE_URL must be a valid PostgreSQL connection string'),

  // Agency
  AGENCY_NAME: z.string().default('Travel Agency'),
  AGENCY_AGENT_NUMBER: z.string().min(1, 'AGENCY_AGENT_NUMBER is required'),
  AGENCY_FALLBACK_NUMBER: z.string().optional(),

  // Business Hours
  BUSINESS_HOURS_START: z.string().regex(/^\d{2}:\d{2}$/, 'Format: HH:MM').default('09:00'),
  BUSINESS_HOURS_END: z.string().regex(/^\d{2}:\d{2}$/, 'Format: HH:MM').default('18:00'),
  BUSINESS_TIMEZONE: z.string().default('Asia/Dubai'),

  // Application
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().min(1).max(65535).default(3000),

  // Session
  SESSION_EXPIRY_HOURS: z.coerce.number().min(1).max(168).default(24),
  MAX_MESSAGES_PER_MINUTE: z.coerce.number().min(1).max(100).default(30),
});

export type EnvConfig = z.infer<typeof EnvSchema>;

// ===========================================
// Error Types
// ===========================================

export class HandOffError extends Error {
  constructor(
    message: string,
    public readonly userId: string,
    public readonly flow: FlowType,
    public readonly context: Message[]
  ) {
    super(message);
    this.name = 'HandOffError';
  }
}

export class ConfigurationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ConfigurationError';
  }
}

// ===========================================
// KPI Types
// ===========================================

export interface KPIMetrics {
  totalQueries: number;
  deflectedQueries: number;
  escalatedQueries: number;
  avgResponseTimeMs: number;
  completionRate: number;
}

export interface DailyKPI extends KPIMetrics {
  date: string;
}

// ===========================================
// API Response Types
// ===========================================

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  timestamp: string;
}

export interface HealthResponse {
  status: 'ok' | 'degraded' | 'down';
  timestamp: string;
  version: string;
  uptime: number;
  services: {
    database: 'connected' | 'disconnected';
    aiProvider: 'connected' | 'disconnected';
  };
}

// ===========================================
// Handoff Types
// ===========================================

export interface HandoffSummary {
  userPhone: string;
  flowType: FlowType;
  collectedSlots: Record<string, unknown>;
  lastMessages: Message[];
  timestamp: Date;
  intent: IntentType;
}

// ===========================================
// Rate Limiting Types
// ===========================================

export interface RateLimitEntry {
  count: number;
  resetAt: Date;
}

// ===========================================
// Logger Types
// ===========================================

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export interface LogEntry {
  level: LogLevel;
  message: string;
  timestamp: string;
  context?: Record<string, unknown>;
}

// Re-export zod schemas for external validation
export { z };