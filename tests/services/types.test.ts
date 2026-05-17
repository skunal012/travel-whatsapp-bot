import { describe, it, expect } from 'vitest';
import { AIResponseSchema, EnvSchema, HandOffError, ConfigurationError } from '../../src/types/index.js';

describe('Type Definitions', () => {
  describe('AIResponseSchema', () => {
    it('should validate a correct AI response', () => {
      const validResponse = {
        intent: 'flight_booking',
        slots: {
          origin: 'Mumbai',
          destination: 'Dubai',
          date: '2026-06-15',
          travellers: 2,
        },
        responseText: 'I found 3 flights from Mumbai to Dubai.',
        action: 'show_options',
      };

      const result = AIResponseSchema.safeParse(validResponse);
      expect(result.success).toBe(true);
    });

    it('should reject invalid intent type', () => {
      const invalidResponse = {
        intent: 'invalid_intent',
        slots: {},
        responseText: 'Test message',
        action: 'show_options',
      };

      const result = AIResponseSchema.safeParse(invalidResponse);
      expect(result.success).toBe(false);
    });

    it('should reject invalid action type', () => {
      const invalidResponse = {
        intent: 'flight_booking',
        slots: {},
        responseText: 'Test message',
        action: 'invalid_action',
      };

      const result = AIResponseSchema.safeParse(invalidResponse);
      expect(result.success).toBe(false);
    });

    it('should reject missing required fields', () => {
      const incompleteResponse = {
        intent: 'flight_booking',
        slots: {},
      };

      const result = AIResponseSchema.safeParse(incompleteResponse);
      expect(result.success).toBe(false);
    });

    it('should accept all valid intent types', () => {
      const validIntents = [
        'flight_booking',
        'hotel_booking',
        'visa_assistance',
        'itinerary',
        'special',
        'greeting',
        'handoff_request',
        'out_of_scope',
      ];

      validIntents.forEach((intent) => {
        const response = {
          intent,
          slots: {},
          responseText: 'Test',
          action: 'show_options',
        };
        const result = AIResponseSchema.safeParse(response);
        expect(result.success).toBe(true);
      });
    });

    it('should accept all valid action types', () => {
      const validActions = [
        'ask_clarification',
        'show_options',
        'confirm',
        'handoff',
        'greeting',
      ];

      validActions.forEach((action) => {
        const response = {
          intent: 'flight_booking',
          slots: {},
          responseText: 'Test',
          action,
        };
        const result = AIResponseSchema.safeParse(response);
        expect(result.success).toBe(true);
      });
    });

    it('should allow additional properties in slots', () => {
      const response = {
        intent: 'flight_booking',
        slots: {
          origin: 'Mumbai',
          destination: 'Dubai',
          cabinClass: 'business',
          extraData: { nested: true },
        },
        responseText: 'Test',
        action: 'show_options',
      };

      const result = AIResponseSchema.safeParse(response);
      expect(result.success).toBe(true);
    });
  });

  describe('EnvSchema', () => {
    const validEnv = {
      GROQ_API_KEY: 'test_key_123',
      OPENAI_API_KEY: 'test_key_456',
      AI_PROVIDER: 'groq',
      DIALOG360_API_KEY: 'test_dialog_key',
      DATABASE_URL: 'postgres://user:pass@localhost:5432/travelbot',
      AGENCY_NAME: 'Test Travel Agency',
      AGENCY_AGENT_NUMBER: '+919876543210',
      BUSINESS_HOURS_START: '09:00',
      BUSINESS_HOURS_END: '18:00',
      BUSINESS_TIMEZONE: 'Asia/Dubai',
      NODE_ENV: 'development',
      PORT: '3000',
      SESSION_EXPIRY_HOURS: '24',
      MAX_MESSAGES_PER_MINUTE: '30',
    };

    it('should validate correct environment configuration', () => {
      const result = EnvSchema.safeParse(validEnv);
      expect(result.success).toBe(true);
    });

    it('should reject missing required GROQ_API_KEY', () => {
      const env = { ...validEnv };
      delete env.GROQ_API_KEY;

      const result = EnvSchema.safeParse(env);
      expect(result.success).toBe(false);
    });

    it('should reject missing required DIALOG360_API_KEY', () => {
      const env = { ...validEnv };
      delete env.DIALOG360_API_KEY;

      const result = EnvSchema.safeParse(env);
      expect(result.success).toBe(false);
    });

    it('should reject invalid DATABASE_URL', () => {
      const env = { ...validEnv, DATABASE_URL: 'not_a_valid_url' };

      const result = EnvSchema.safeParse(env);
      expect(result.success).toBe(false);
    });

    it('should reject invalid PORT', () => {
      const env = { ...validEnv, PORT: 'invalid_port' };

      const result = EnvSchema.safeParse(env);
      expect(result.success).toBe(false);
    });

    it('should reject invalid business hours format', () => {
      const env = { ...validEnv, BUSINESS_HOURS_START: '9:00' };

      const result = EnvSchema.safeParse(env);
      expect(result.success).toBe(false);
    });

    it('should use default values for optional fields', () => {
      const minimalEnv = {
        GROQ_API_KEY: 'test_key',
        DIALOG360_API_KEY: 'test_key',
        DATABASE_URL: 'postgres://user:pass@localhost:5432/travelbot',
        AGENCY_AGENT_NUMBER: '+919876543210',
      };

      const result = EnvSchema.safeParse(minimalEnv);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.AI_PROVIDER).toBe('groq');
        expect(result.data.AGENCY_NAME).toBe('Travel Agency');
        expect(result.data.BUSINESS_HOURS_START).toBe('09:00');
        expect(result.data.BUSINESS_HOURS_END).toBe('18:00');
        expect(result.data.BUSINESS_TIMEZONE).toBe('Asia/Dubai');
        expect(result.data.PORT).toBe(3000);
      }
    });

    it('should accept openai as AI_PROVIDER', () => {
      const env = { ...validEnv, AI_PROVIDER: 'openai' };

      const result = EnvSchema.safeParse(env);
      expect(result.success).toBe(true);
    });

    it('should reject invalid AI_PROVIDER', () => {
      const env = { ...validEnv, AI_PROVIDER: 'anthropic' };

      const result = EnvSchema.safeParse(env);
      expect(result.success).toBe(false);
    });
  });

  describe('Error Classes', () => {
    it('should have correct HandOffError properties', () => {
      const error = new HandOffError('Test handoff', 'user123', 'flight', []);

      expect(error).toBeInstanceOf(Error);
      expect(error.name).toBe('HandOffError');
      expect(error.message).toBe('Test handoff');
      expect(error.userId).toBe('user123');
      expect(error.flow).toBe('flight');
      expect(error.context).toEqual([]);
    });

    it('should have correct ConfigurationError properties', () => {
      const error = new ConfigurationError('Missing API key');

      expect(error).toBeInstanceOf(Error);
      expect(error.name).toBe('ConfigurationError');
      expect(error.message).toBe('Missing API key');
    });

    it('should be catchable as Error', () => {
      const handoff = new HandOffError('test', 'user', 'hotel', []);
      const config = new ConfigurationError('test');

      expect(handoff).toBeInstanceOf(Error);
      expect(config).toBeInstanceOf(Error);
    });
  });

  describe('Zod Schema Exports', () => {
    it('should have zod available for external validation', () => {
      // Zod is imported at the top of types/index.ts and re-exported
      // This test validates that the z import works correctly
      const zodValidation = AIResponseSchema.safeParse({
        intent: 'flight_booking',
        slots: {},
        responseText: 'Test',
        action: 'show_options',
      });
      expect(zodValidation.success).toBe(true);
    });
  });
});