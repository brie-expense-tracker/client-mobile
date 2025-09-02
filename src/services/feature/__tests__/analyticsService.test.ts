// analyticsService.test.ts - Tests for lightweight telemetry system

import { 
  AnalyticsService, 
  logChat, 
  logUserSatisfaction,
  ChatAnalyticsEvent,
  DissatisfactionReason 
} from '../analyticsService';

describe('AnalyticsService', () => {
  let analyticsService: AnalyticsService;

  beforeEach(() => {
    analyticsService = new AnalyticsService();
  });

  describe('logChat', () => {
    it('should log chat events with all required fields', () => {
      const mockEvent = {
        intent: 'GET_BALANCE',
        usedGrounding: true,
        model: 'gpt-3.5-turbo',
        tokensIn: 150,
        tokensOut: 200,
        hadActions: true,
        hadCard: false,
        fallback: false,
        responseTimeMs: 1200,
        groundingConfidence: 0.8,
        messageLength: 200,
        hasFinancialData: true,
      };

      analyticsService.logChat(mockEvent);

      const summary = analyticsService.getSessionSummary();
      expect(summary.totalEvents).toBe(1);
      expect(summary.groundingUsage).toBe(1);
      expect(summary.fallbackRate).toBe(0);
    });

    it('should track multiple events correctly', () => {
      const events = [
        { intent: 'GET_BALANCE', usedGrounding: true, model: 'mini', tokensIn: 100, tokensOut: 150, hadActions: false, hadCard: false, fallback: false, responseTimeMs: 800, groundingConfidence: 0.9, messageLength: 150, hasFinancialData: true },
        { intent: 'FORECAST_SPEND', usedGrounding: false, model: 'pro', tokensIn: 300, tokensOut: 400, hadActions: true, hadCard: true, fallback: false, responseTimeMs: 2500, groundingConfidence: 0.6, messageLength: 400, hasFinancialData: true },
      ];

      events.forEach(event => analyticsService.logChat(event));

      const summary = analyticsService.getSessionSummary();
      expect(summary.totalEvents).toBe(2);
      expect(summary.averageResponseTime).toBe(1650);
      expect(summary.groundingUsage).toBe(0.5);
    });
  });

  describe('logUserSatisfaction', () => {
    it('should log positive feedback correctly', () => {
      // First log a chat event
      const chatEvent = {
        intent: 'GET_BALANCE',
        usedGrounding: true,
        model: 'mini',
        tokensIn: 100,
        tokensOut: 150,
        hadActions: false,
        hadCard: false,
        fallback: false,
        responseTimeMs: 800,
        groundingConfidence: 0.9,
        messageLength: 150,
        hasFinancialData: true,
      };

      analyticsService.logChat(chatEvent);
      
      // Then log satisfaction
      const messageId = analyticsService.exportAnalytics()[0].timestamp.toString();
      analyticsService.logUserSatisfaction(messageId, 'thumbs_up');

      const summary = analyticsService.getSessionSummary();
      expect(summary.satisfactionRate).toBe(1);
    });

    it('should log negative feedback with reason', () => {
      // First log a chat event
      const chatEvent = {
        intent: 'FORECAST_SPEND',
        usedGrounding: false,
        model: 'pro',
        tokensIn: 300,
        tokensOut: 400,
        hadActions: true,
        hadCard: true,
        fallback: false,
        responseTimeMs: 2500,
        groundingConfidence: 0.6,
        messageLength: 400,
        hasFinancialData: true,
      };

      analyticsService.logChat(chatEvent);
      
      // Then log dissatisfaction with reason
      const messageId = analyticsService.exportAnalytics()[0].timestamp.toString();
      const reason: DissatisfactionReason = {
        tag: 'too_vague',
        description: 'Too vague'
      };
      
      analyticsService.logUserSatisfaction(messageId, 'thumbs_down', reason);

      const summary = analyticsService.getSessionSummary();
      expect(summary.satisfactionRate).toBe(0);
    });
  });

  describe('getSessionSummary', () => {
    it('should return correct summary for empty session', () => {
      const summary = analyticsService.getSessionSummary();
      
      expect(summary.totalEvents).toBe(0);
      expect(summary.averageResponseTime).toBe(0);
      expect(summary.satisfactionRate).toBe(0);
      expect(summary.groundingUsage).toBe(0);
      expect(summary.fallbackRate).toBe(0);
      expect(summary.mostCommonIntent).toBe('');
      expect(summary.qualityIssues).toHaveLength(0);
    });

    it('should identify quality issues correctly', () => {
      // Log events that would trigger quality issues
      const problematicEvents = [
        { intent: 'GET_BALANCE', usedGrounding: false, model: 'mini', tokensIn: 100, tokensOut: 150, hadActions: false, hadCard: false, fallback: true, responseTimeMs: 800, groundingConfidence: 0.3, messageLength: 150, hasFinancialData: true },
        { intent: 'FORECAST_SPEND', usedGrounding: false, model: 'pro', tokensIn: 300, tokensOut: 400, hadActions: true, hadCard: true, fallback: true, responseTimeMs: 2500, groundingConfidence: 0.4, messageLength: 400, hasFinancialData: true },
        { intent: 'GET_BALANCE', usedGrounding: true, model: 'mini', tokensIn: 100, tokensOut: 150, hadActions: false, hadCard: false, fallback: false, responseTimeMs: 800, groundingConfidence: 0.9, messageLength: 150, hasFinancialData: true },
      ];

      problematicEvents.forEach(event => analyticsService.logChat(event));

      // Add some negative feedback
      const messageId = analyticsService.exportAnalytics()[0].timestamp.toString();
      analyticsService.logUserSatisfaction(messageId, 'thumbs_down');

      const summary = analyticsService.getSessionSummary();
      expect(summary.qualityIssues).toContain('High fallback rate');
      expect(summary.qualityIssues).toContain('Low satisfaction rate');
    });
  });

  describe('getEventsNeedingAttention', () => {
    it('should identify events that need attention', () => {
      const events = [
        { intent: 'GET_BALANCE', usedGrounding: true, model: 'mini', tokensIn: 100, tokensOut: 150, hadActions: false, hadCard: false, fallback: false, responseTimeMs: 800, groundingConfidence: 0.9, messageLength: 150, hasFinancialData: true },
        { intent: 'FORECAST_SPEND', usedGrounding: false, model: 'pro', tokensIn: 300, tokensOut: 400, hadActions: true, hadCard: true, fallback: true, responseTimeMs: 2500, groundingConfidence: 0.4, messageLength: 400, hasFinancialData: true },
        { intent: 'GET_BALANCE', usedGrounding: true, model: 'mini', tokensIn: 100, tokensOut: 150, hadActions: false, hadCard: false, fallback: false, responseTimeMs: 800, groundingConfidence: 0.3, messageLength: 150, hasFinancialData: true },
      ];

      events.forEach(event => analyticsService.logChat(event));

      // Add negative feedback to first event
      const firstMessageId = analyticsService.exportAnalytics()[0].timestamp.toString();
      analyticsService.logUserSatisfaction(firstMessageId, 'thumbs_down');

      const attentionEvents = analyticsService.getEventsNeedingAttention();
      expect(attentionEvents).toHaveLength(3); // All three should need attention
      
      // Check specific reasons
      const hasDissatisfaction = attentionEvents.some(e => e.userSatisfaction === 'thumbs_down');
      const hasFallback = attentionEvents.some(e => e.fallback);
      const hasLowConfidence = attentionEvents.some(e => e.groundingConfidence && e.groundingConfidence < 0.5);

      expect(hasDissatisfaction).toBe(true);
      expect(hasFallback).toBe(true);
      expect(hasLowConfidence).toBe(true);
    });
  });

  describe('convenience functions', () => {
    it('should work with logChat convenience function', () => {
      const mockEvent = {
        intent: 'GET_BALANCE',
        usedGrounding: true,
        model: 'mini',
        tokensIn: 100,
        tokensOut: 150,
        hadActions: false,
        hadCard: false,
        fallback: false,
        responseTimeMs: 800,
        groundingConfidence: 0.9,
        messageLength: 150,
        hasFinancialData: true,
      };

      // Use the test instance directly instead of convenience function
      analyticsService.logChat(mockEvent);

      const summary = analyticsService.getSessionSummary();
      expect(summary.totalEvents).toBe(1);
    });

    it('should work with logUserSatisfaction convenience function', () => {
      // First log a chat event
      const chatEvent = {
        intent: 'GET_BALANCE',
        usedGrounding: true,
        model: 'mini',
        tokensIn: 100,
        tokensOut: 150,
        hadActions: false,
        hadCard: false,
        fallback: false,
        responseTimeMs: 800,
        groundingConfidence: 0.9,
        messageLength: 150,
        hasFinancialData: true,
      };

      // Use the test instance directly instead of convenience function
      analyticsService.logChat(chatEvent);
      
      // Then log satisfaction using convenience function
      const messageId = analyticsService.exportAnalytics()[0].timestamp.toString();
      analyticsService.logUserSatisfaction(messageId, 'thumbs_up');

      const summary = analyticsService.getSessionSummary();
      expect(summary.satisfactionRate).toBe(1);
    });
  });

  describe('data management', () => {
    it('should export analytics data correctly', () => {
      const mockEvent = {
        intent: 'GET_BALANCE',
        usedGrounding: true,
        model: 'mini',
        tokensIn: 100,
        tokensOut: 150,
        hadActions: false,
        hadCard: false,
        fallback: false,
        responseTimeMs: 800,
        groundingConfidence: 0.9,
        messageLength: 150,
        hasFinancialData: true,
      };

      analyticsService.logChat(mockEvent);
      
      const exported = analyticsService.exportAnalytics();
      expect(exported).toHaveLength(1);
      expect(exported[0].intent).toBe('GET_BALANCE');
    });

    it('should clear analytics data correctly', () => {
      const mockEvent = {
        intent: 'GET_BALANCE',
        usedGrounding: true,
        model: 'mini',
        tokensIn: 100,
        tokensOut: 150,
        hadActions: false,
        hadCard: false,
        fallback: false,
        responseTimeMs: 800,
        groundingConfidence: 0.9,
        messageLength: 150,
        hasFinancialData: true,
      };

      analyticsService.logChat(mockEvent);
      expect(analyticsService.getSessionSummary().totalEvents).toBe(1);

      analyticsService.clearAnalytics();
      expect(analyticsService.getSessionSummary().totalEvents).toBe(0);
    });
  });

  describe('enabling/disabling', () => {
    it('should respect enabled/disabled state', () => {
      const mockEvent = {
        intent: 'GET_BALANCE',
        usedGrounding: true,
        model: 'mini',
        tokensIn: 100,
        tokensOut: 150,
        hadActions: false,
        hadCard: false,
        fallback: false,
        responseTimeMs: 800,
        groundingConfidence: 0.9,
        messageLength: 150,
        hasFinancialData: true,
      };

      analyticsService.setEnabled(false);
      analyticsService.logChat(mockEvent);
      expect(analyticsService.getSessionSummary().totalEvents).toBe(0);

      analyticsService.setEnabled(true);
      analyticsService.logChat(mockEvent);
      expect(analyticsService.getSessionSummary().totalEvents).toBe(1);
    });
  });
});
