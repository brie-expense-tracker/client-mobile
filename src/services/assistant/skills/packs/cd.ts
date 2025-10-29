// CD (Certificate of Deposit) Skill Pack
// Example of how easy it is to add new finance topics with the skill engine

import { Skill } from '../types';
import { BaseResearchAgent } from '../baseResearchAgent';
import { scoreUsefulness } from '../../usefulness';
import { webFnsForCD } from './webFns/cdWebFns';
import { logger } from '../../../../../utils/logger';


type CdItem = {
  bank: string;
  termMonths: number;
  apy: number;
  minDeposit?: number;
  url: string;
};

// CD interest calculator micro-solver
function cdMathEstimator(q: string, ctx: any): any {
  // Match patterns like "If I put $5000 in a 12-month CD, how much interest?"
  const isAsk = /\b(if\s+i\s+put|deposit|invest)\s+\$?([\d.,]+)\s+(?:in\s+a\s+)?(\d+)[-\s]*(?:month|mo)\s+cd/i.test(q);
  
  if (!isAsk) return null;

  const amountMatch = q.match(/\$?([\d.,]+)/);
  const termMatch = q.match(/(\d+)[-\s]*(?:month|mo)/i);
  
  if (!amountMatch || !termMatch) return null;

  const amount = Number(amountMatch[1].replace(/,/g, ''));
  const termMonths = Number(termMatch[1]);
  
  if (amount <= 0 || termMonths <= 0) return null;

  // Current competitive CD rates (4.5% - 5.5%)
  const lowAPY = 4.5;
  const highAPY = 5.5;
  
  // Calculate interest (simple interest for CDs)
  const interestLow = (amount * lowAPY / 100) * (termMonths / 12);
  const interestHigh = (amount * highAPY / 100) * (termMonths / 12);

  const nf = (n: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n);

  const answer = `With **${nf(amount)}** in a ${termMonths}-month CD:
• **Interest earned:** ${nf(interestLow)} - ${nf(interestHigh)} (4.5% - 5.5% APY)
• **Total at maturity:** ${nf(amount + interestLow)} - ${nf(amount + interestHigh)}

*Note: Early withdrawal penalties apply. Rates change frequently—verify before opening.*`;

  return {
    answer,
    actions: [
      {
        label: 'Create Savings Goal',
        action: 'OPEN_GOAL_FORM',
        params: { type: 'savings' }
      }
    ],
    confidence: 0.9,
    matchedPattern: 'CD_INTEREST_ESTIMATOR'
  };
}

// Create the research agent instance
const agent = new BaseResearchAgent<CdItem>(
  'high yield cd rate',
  webFnsForCD,
  {
    editorialAllow: ['bankrate.com', 'nerdwallet.com', 'forbes.com'],
    domainAllowPatterns: [/ally\.com|capitalone\.com|discover\.com/i]
  },
  (url, raw) => ({
    bank: raw.bank || new URL(url).hostname,
    termMonths: raw.termMonths,
    apy: raw.apy,
    minDeposit: raw.minDeposit,
    url
  }),
  (item, query) => {
    let score = item.apy; // Base score from APY
    
    // Query-specific boosts
    if (/\b(12|6|9)\b/.test(query)) {
      const queryTerm = query.match(/\b(12|6|9)\b/)?.[1];
      if (queryTerm && String(item.termMonths).includes(queryTerm)) {
        score += 0.4; // Bonus for matching requested term
      }
    }
    
    if (item.minDeposit === 0) score += 0.3; // Bonus for no minimum
    
    return score;
  }
);

export const CD_SKILL: Skill = {
  id: 'CD',
  matches: (q) => /\b(cd|certificate of deposit)\b/i.test(q),
  
  microSolvers: [
    (q, ctx) => {
      const result = cdMathEstimator(q, ctx);
      if (!result) return null;
      
      return {
        response: {
          message: result.answer,
          actions: result.actions || [],
          sources: [{ kind: 'localML' as const }],
          cost: { model: 'mini' as const, estTokens: Math.ceil(result.answer.length / 4) },
          confidence: result.confidence
        },
        matchedPattern: result.matchedPattern,
        usefulness: scoreUsefulness({
          message: result.answer,
          actions: result.actions || [],
          sources: [{ kind: 'localML' as const }],
          cost: { model: 'mini' as const, estTokens: 0 },
          confidence: result.confidence
        })
      };
    },

    // General CD knowledge micro-solver
    (q, ctx) => {
      // Handle general "What is a CD?" type questions
      if (!/\b(what\s+is|what'?s|explain|tell\s+me\s+about)\b.*\b(cd|certificate of deposit)\b/i.test(q)) {
        return null;
      }

      const answer = `A **Certificate of Deposit (CD)** is a savings account with a fixed term and interest rate, offered by banks and credit unions.

**Key features:**
• **Fixed term** - typically 3 months to 5 years
• **Fixed interest rate** - locked in when you open the CD
• **FDIC insured** up to $250,000 per bank
• **Higher rates** than regular savings accounts
• **Early withdrawal penalty** - you lose interest if you withdraw early

**How it works:**
1. Deposit money for a specific term (e.g., 12 months)
2. Earn a guaranteed interest rate for that entire term
3. Get your money back plus interest at maturity
4. Cannot withdraw early without penalty

**Best for:** Money you won't need for the CD term, earning higher guaranteed returns than savings accounts.

**Current rates:** Top CD rates are 4.5-5.5% APY depending on term length.`;

      const response = {
        message: answer,
        actions: [
          { label: 'Create Savings Goal', action: 'OPEN_GOAL_FORM', params: { type: 'savings' } },
          { label: 'Calculate CD Interest', action: 'OPEN_CALCULATOR', params: { type: 'cd' } }
        ],
        sources: [{ kind: 'localML' as const }],
        cost: { model: 'mini' as const, estTokens: Math.ceil(answer.length / 4) },
        confidence: 0.9
      };

      return {
        response,
        matchedPattern: 'CD_GENERAL_KNOWLEDGE',
        usefulness: scoreUsefulness(response)
      };
    }
  ],

  researchAgent: async (q, ctx) => {
    // Only run research agent for "which/best" requests
    if (!/\b(best|which|recommend|top|rates?)\b/i.test(q)) {
      return null;
    }

    logger.debug(`[CD Skill] Running research agent for: ${q}`);
    
    const data = await agent.run(q);
    if (!data || data.items.length === 0) {
      return null;
    }

    const topItems = data.items.slice(0, 3);
    const picks = topItems.map(item => 
      `• **${item.bank}** — ${item.apy.toFixed(2)}% APY (${item.termMonths} mo)`
    ).join('\n');

    const message = `**Top CD rates (checked ${data.checkedAt})**\n${picks}\n\n*Note: Watch early withdrawal penalties. Rates change—verify before opening.*`;

    const response = {
      message,
      actions: [
        { label: 'Create Savings Goal', action: 'OPEN_GOAL_FORM', params: { type: 'savings' } }
      ],
      sources: topItems.map(item => ({ 
        kind: 'web' as const, 
        title: item.bank, 
        url: item.url 
      })),
      cost: { model: 'std' as const, estTokens: Math.ceil(message.length / 4) },
      confidence: 0.75
    };

    return {
      response,
      usefulness: scoreUsefulness(response),
      matchedPattern: 'CD_RESEARCH_AGENT'
    };
  },

  config: { 
    minUsefulness: 3,
    priority: 8 // Medium priority for CD
  }
};
