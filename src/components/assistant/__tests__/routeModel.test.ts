// routeModel.test.ts - Tests for hybrid cost optimization with Critic + Tiered Narration

import { 
  pickModel, 
  groundWithTools, 
  miniModelWrite, 
  miniCriticValidate,
  proModelStrategy,
  executeHybridCostOptimization,
  calculateCostSavings,
  ModelTier 
} from '../routeModel';
import { IntentType } from '../intentMapper';

describe('routeModel - Hybrid Cost Optimization', () => {
  const mockContext = {
    budgets: [
      { name: 'Groceries', amount: 500, spent: 300 },
      { name: 'Entertainment', amount: 200, spent: 150 }
    ],
    goals: [
      { name: 'Vacation', target: 2000, current: 800 }
    ],
    transactions: [
      { amount: 50, date: new Date(), type: 'expense' },
      { amount: 75, date: new Date(), type: 'expense' }
    ]
  };

  describe('pickModel', () => {
    it('should return mini for general queries', () => {
      const result = pickModel('GET_BALANCE', 'What is my balance?');
      expect(result).toBe('mini');
    });

    it('should return std for FORECAST_SPEND intent', () => {
      const result = pickModel('FORECAST_SPEND', 'How much will I spend?');
      expect(result).toBe('std');
    });

    it('should return pro for strategy/planning requests', () => {
      const result = pickModel('FORECAST_SPEND', 'Give me a strategy to optimize my spending');
      expect(result).toBe('pro');
    });
  });

  describe('groundWithTools', () => {
    it('should extract facts for GET_BALANCE intent', async () => {
      const result = await groundWithTools('What is my balance?', 'GET_BALANCE', mockContext);
      
      expect(result.facts).toContain('You have 2 active budgets');
      expect(result.facts).toContain('Total budget amount: $700.00');
      expect(result.confidence).toBeGreaterThan(0.7);
      expect(result.tokenCount).toBeGreaterThan(0);
    });

    it('should extract facts for GET_BUDGET_STATUS intent', async () => {
      const result = await groundWithTools('Show budget status', 'GET_BUDGET_STATUS', mockContext);
      
      expect(result.facts).toContain('Groceries: $200.00 remaining of $500.00');
      expect(result.facts).toContain('Entertainment: $50.00 remaining of $200.00');
    });
  });

  describe('miniModelWrite', () => {
    it('should generate message within token limit', async () => {
      const facts = ['You have 2 active budgets', 'Total budget amount: $700.00'];
      const result = await miniModelWrite('What is my balance?', 'GET_BALANCE', facts);
      
      expect(result.message).toContain('Based on your budgets');
      expect(result.tokenCount).toBeLessThanOrEqual(200);
      expect(result.cost).toBeGreaterThan(0);
    });
  });

  describe('miniCriticValidate', () => {
    it('should validate safe messages', async () => {
      const message = 'Based on your budgets: You have $200 remaining.';
      const facts = ['You have 2 active budgets'];
      
      const result = await miniCriticValidate(message, facts);
      
      expect(result.isValid).toBe(true);
      expect(result.forbiddenClaims).toHaveLength(0);
      expect(result.confidence).toBeGreaterThan(0.8);
    });

    it('should detect forbidden investment advice', async () => {
      const message = 'You should invest your money in stocks for better returns.';
      const facts = ['You have savings'];
      
      const result = await miniCriticValidate(message, facts);
      
      expect(result.isValid).toBe(false);
      expect(result.forbiddenClaims).toContain('Contains forbidden pattern: invest.*money');
    });

    it('should detect claims without facts', async () => {
      const message = 'Based on your data, you are doing great.';
      const facts: string[] = [];
      
      const result = await miniCriticValidate(message, facts);
      
      expect(result.isValid).toBe(false);
      expect(result.forbiddenClaims).toContain('Claims data without facts');
    });
  });

  describe('proModelStrategy', () => {
    it('should generate strategy for planning requests', async () => {
      const facts = ['Recent 30-day spending: $500.00', 'You have 2 active budgets'];
      const userAsk = 'Give me a strategy to optimize my spending';
      
      const result = await proModelStrategy('How to optimize?', 'FORECAST_SPEND', facts, userAsk);
      
      expect(result.message).toContain('Strategy:');
      expect(result.factsTrimmed).toBe(false);
      expect(result.tokenCount).toBeLessThanOrEqual(800);
    });

    it('should throw error for non-strategy requests', async () => {
      const facts = ['You have 2 active budgets'];
      const userAsk = 'What is my balance?';
      
      await expect(
        proModelStrategy('What is my balance?', 'GET_BALANCE', facts, userAsk)
      ).rejects.toThrow('Pro model not needed for this query type');
    });
  });

  describe('executeHybridCostOptimization', () => {
    it('should execute complete 4-step process', async () => {
      const result = await executeHybridCostOptimization(
        'What is my balance?',
        'GET_BALANCE',
        mockContext,
        'Show me my balance'
      );
      
      expect(result.message).toBeTruthy();
      expect(result.modelUsed).toBe('mini');
      expect(result.totalTokens).toBeGreaterThan(0);
      expect(result.totalCost).toBeGreaterThan(0);
      expect(result.steps).toHaveLength(3); // A, B, C (no D for non-strategy)
      expect(result.criticValidation.isValid).toBe(true);
    });

    it('should use pro model for strategy requests', async () => {
      const result = await executeHybridCostOptimization(
        'How to optimize spending?',
        'FORECAST_SPEND',
        mockContext,
        'Give me a strategy to optimize my spending'
      );
      
      expect(result.modelUsed).toBe('pro');
      expect(result.steps).toHaveLength(4); // A, B, C, D
    });
  });

  describe('calculateCostSavings', () => {
    it('should calculate cost savings correctly', () => {
      const totalCost = 0.002; // $0.002
      const totalTokens = 200; // 200 tokens
      
      const result = calculateCostSavings(totalCost, totalTokens);
      
      expect(result.savings).toBeGreaterThan(0);
      expect(result.percentage).toBeGreaterThan(0);
      
      // Pro model would cost: (200/1000) * 0.03 = $0.006
      // Savings: $0.006 - $0.002 = $0.004
      // Percentage: (0.004/0.006) * 100 = 66.67%
      expect(result.savings).toBeCloseTo(0.004, 3);
      expect(result.percentage).toBeCloseTo(66.67, 1);
    });
  });
});
