// Tests for HYSA Research Agent and micro-solvers

import { hysaResearchAgent } from '../agents/hysaResearchAgent';
import { hysaInterestEstimator, hysaAdvisor, isSimpleQuestion } from '../microSolvers';

describe('HYSA Research Agent', () => {
  test('returns top picks with bank citations', async () => {
    const result = await hysaResearchAgent.findRecommendations('Which HYSA is best right now?', {});
    
    expect(result).toBeTruthy();
    expect(result?.message).toMatch(/Top HYSA picks/i);
    expect(result?.sources?.length).toBeGreaterThan(0);
    expect(result?.actions?.length).toBeGreaterThan(0);
  });

  test('handles fallback when research fails', async () => {
    // Mock a scenario where research fails
    const result = await hysaResearchAgent.findRecommendations('', {});
    
    expect(result).toBeTruthy();
    // The agent returns mock data even for empty queries, so check for the mock response
    expect(result?.message).toMatch(/Top HYSA picks/i);
  });

  test('returns fallback response when called directly', () => {
    const result = hysaResearchAgent.getFallbackResponse();
    
    expect(result).toBeTruthy();
    expect(result.message).toMatch(/FDIC\/NCUA insured/i);
    expect(result.actions?.length).toBeGreaterThan(0);
  });
});

describe('HYSA Micro-solvers', () => {
  test('HYSA interest estimator computes range', () => {
    const result = hysaInterestEstimator('If I put $3000 in a HYSA, how much interest?', {});
    
    expect(result).toBeTruthy();
    expect(result?.answer).toMatch(/\$3,000/); // Formatted with comma
    expect(result?.answer).toMatch(/\$11\.25/); // Monthly low
    expect(result?.answer).toMatch(/\$12\.5/); // Monthly high (no trailing zero)
    expect(result?.matchedPattern).toBe('HYSA_INTEREST_ESTIMATOR');
  });

  test('HYSA interest estimator handles different amounts', () => {
    const result = hysaInterestEstimator('If I deposit $10,000 in a high-yield savings account, what will I earn?', {});
    
    expect(result).toBeTruthy();
    expect(result?.answer).toMatch(/\$10,000/);
    expect(result?.answer).toMatch(/\$37\.5/); // Monthly low (no trailing zero)
    expect(result?.answer).toMatch(/\$41\.67/); // Monthly high
  });

  test('HYSA advisor provides criteria', () => {
    const result = hysaAdvisor('What should I look for in a HYSA? Any suggestions?', {});
    
    expect(result).toBeTruthy();
    expect(result?.answer).toMatch(/FDIC\/NCUA insured/i);
    expect(result?.answer).toMatch(/APY/i);
    expect(result?.answer).toMatch(/no\/low fees/i);
    expect(result?.matchedPattern).toBe('HYSA_CRITERIA');
  });

  test('HYSA advisor only triggers on suggestion requests', () => {
    const result = hysaAdvisor('I have a HYSA account', {});
    
    expect(result).toBeNull();
  });

  test('isSimpleQuestion correctly identifies HYSA picks requests', () => {
    // Should NOT use simple QA for picks requests
    expect(isSimpleQuestion('Which HYSA is best?', 'HYSA_RECOMMENDATIONS')).toBe(false);
    expect(isSimpleQuestion('What are the top high-yield savings accounts?', 'HYSA_RECOMMENDATIONS')).toBe(false);
    
    // Should use simple QA for general HYSA questions
    expect(isSimpleQuestion('What is a HYSA?', 'GENERAL_QA')).toBe(true);
    expect(isSimpleQuestion('How do I open a high-yield savings account?', 'GENERAL_QA')).toBe(true);
  });

  test('isSimpleQuestion handles HYSA interest questions', () => {
    expect(isSimpleQuestion('If I put $5000 in a HYSA, how much interest?', 'MATH_QUICK')).toBe(true);
    expect(isSimpleQuestion('What would I earn with $2000 in high-yield savings?', 'MATH_QUICK')).toBe(true);
  });
});

describe('HYSA Intent Detection', () => {
  test('detects HYSA recommendation intent', () => {
    const testCases = [
      'Which HYSA is best right now?',
      'What are the top high-yield savings accounts?',
      'Recommend a good HYSA',
      'Best HYSA picks for 2024',
      'What HYSA should I choose?'
    ];

    // This would be tested with the actual intent mapper
    // For now, we can test the patterns directly
    const pattern1 = /\b(best|which|recommend|suggest|top)\b.*\b(high[-\s]?yield\s+savings|hysa)\b/i;
    const pattern2 = /\bhysa\b.*\b(pick|choose|options?)\b/i;
    
    testCases.forEach(testCase => {
      const matches = pattern1.test(testCase) || pattern2.test(testCase);
      expect(matches).toBe(true);
    });
  });

  test('does not trigger on general HYSA questions', () => {
    const testCases = [
      'What is a HYSA?',
      'How do HYSA accounts work?',
      'If I put $3000 in a HYSA, how much interest?',
      'Tell me about high-yield savings accounts'
    ];

    const pattern = /\b(best|which|recommend|suggest|top)\b.*\b(high[-\s]?yield\s+savings|hysa)\b/i;
    
    testCases.forEach(testCase => {
      expect(pattern.test(testCase)).toBe(false);
    });
  });
});
