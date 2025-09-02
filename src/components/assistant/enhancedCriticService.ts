// Enhanced Critic Service - Cascade Quality System
// Implements: Writer → Checker → (optional) Improver with rule-validators

import { FactPack } from './factPack';

export interface RuleValidationResult {
  passed: boolean;
  guardFailed?: string;
  issues: string[];
  confidence: number;
  escalationReason?: string;
  shouldEscalateToPro: boolean;
}

export interface NumericGuardrails {
  amountsNonNegative: boolean;
  sumsMatchFactPack: boolean;
  datesInsideWindow: boolean;
  budgetLimitsRespected: boolean;
}

export interface ClaimTypeValidation {
  hasForbiddenPhrasing: boolean;
  forbiddenClaims: string[];
  riskLevel: 'low' | 'medium' | 'high';
}

export interface CriticValidation {
  isValid: boolean;
  ruleValidation: RuleValidationResult;
  numericGuardrails: NumericGuardrails;
  claimTypes: ClaimTypeValidation;
  confidence: number;
  tokenCount: number;
  escalationTriggered: boolean;
  escalationReason?: string;
}

export class EnhancedCriticService {
  private factPack: FactPack;
  private forbiddenPatterns: RegExp[];
  private highStakesKeywords: string[];

  constructor(factPack: FactPack) {
    this.factPack = factPack;
    this.forbiddenPatterns = [
      /guarantee.*return/i,
      /surefire.*return/i,
      /guaranteed.*profit/i,
      /risk.*free.*investment/i,
      /can't.*lose/i,
      /guaranteed.*income/i,
      /sure.*thing/i,
      /100%.*success/i,
      /never.*fail/i,
      /always.*win/i,
      /invest.*all.*money/i,
      /put.*everything.*in/i,
      /mortgage.*house.*invest/i,
      /borrow.*invest/i,
      /credit.*card.*invest/i,
    ];
    
    this.highStakesKeywords = [
      'rebuild',
      '6-month',
      'savings plan',
      'investment strategy',
      'retirement plan',
      'debt payoff',
      'emergency fund',
      'major purchase',
      'life insurance',
      'estate planning'
    ];
  }

  /**
   * Main critic validation with cascade quality system
   */
  async validateResponse(
    message: string,
    query: string,
    context: any
  ): Promise<CriticValidation> {
    console.log('🔍 [EnhancedCritic] Starting cascade validation for:', message.substring(0, 100));

    // Step 1: Rule-validators (before critic)
    const ruleValidation = await this.runRuleValidators(message, context);
    
    // Step 2: Mini Critic validation
    const criticValidation = await this.runMiniCritic(message, context);
    
    // Step 3: Determine escalation
    const escalationDecision = this.determineEscalation(
      ruleValidation,
      criticValidation,
      query,
      context
    );

    const confidence = this.calculateOverallConfidence(
      ruleValidation,
      criticValidation
    );

    return {
      isValid: ruleValidation.passed && criticValidation.isValid,
      ruleValidation,
      numericGuardrails: ruleValidation.numericGuardrails || {
        amountsNonNegative: true,
        sumsMatchFactPack: true,
        datesInsideWindow: true,
        budgetLimitsRespected: true
      },
      claimTypes: criticValidation.claimTypes || {
        hasForbiddenPhrasing: false,
        forbiddenClaims: [],
        riskLevel: 'low'
      },
      confidence,
      tokenCount: this.estimateTokenCount(message),
      escalationTriggered: escalationDecision.shouldEscalate,
      escalationReason: escalationDecision.reason
    };
  }

  /**
   * Step 1: Rule-validators before critic
   */
  private async runRuleValidators(
    message: string,
    context: any
  ): Promise<RuleValidationResult> {
    const issues: string[] = [];
    let guardFailed: string | undefined;

    // Numeric guardrails
    const numericGuardrails = await this.validateNumericGuardrails(message, context);
    
    if (!numericGuardrails.amountsNonNegative) {
      issues.push('numeric_negative_amounts');
      guardFailed = 'numeric_negative_amounts';
    }
    
    if (!numericGuardrails.sumsMatchFactPack) {
      issues.push('numeric_sum_mismatch');
      guardFailed = 'numeric_sum_mismatch';
    }
    
    if (!numericGuardrails.datesInsideWindow) {
      issues.push('numeric_date_out_of_window');
      guardFailed = 'numeric_date_out_of_window';
    }
    
    if (!numericGuardrails.budgetLimitsRespected) {
      issues.push('numeric_budget_limit_exceeded');
      guardFailed = 'numeric_budget_limit_exceeded';
    }

    // Claim type validation
    const claimTypes = this.validateClaimTypes(message);
    
    if (claimTypes.hasForbiddenPhrasing) {
      issues.push('claim_forbidden_phrasing');
      if (!guardFailed) guardFailed = 'claim_forbidden_phrasing';
    }

    const passed = issues.length === 0;
    const confidence = passed ? 0.95 : 0.3;

    return {
      passed,
      guardFailed,
      issues,
      confidence,
      numericGuardrails,
      shouldEscalateToPro: this.shouldEscalateToPro(issues, context)
    };
  }

  /**
   * Step 2: Mini Critic validation (existing logic enhanced)
   */
  private async runMiniCritic(
    message: string,
    context: any
  ): Promise<{
    isValid: boolean;
    claimTypes: ClaimTypeValidation;
    hasAmbiguity: boolean;
    hasHallucination: boolean;
  }> {
    const claimTypes = this.validateClaimTypes(message);
    
    // Check for unresolved ambiguity
    const hasAmbiguity = this.detectAmbiguity(message, context);
    
    // Check for hallucination indicators
    const hasHallucination = this.detectHallucination(message, context);

    const isValid = !claimTypes.hasForbiddenPhrasing && !hasAmbiguity && !hasHallucination;

    return {
      isValid,
      claimTypes,
      hasAmbiguity,
      hasHallucination
    };
  }

  /**
   * Step 3: Determine escalation to Pro model
   */
  private determineEscalation(
    ruleValidation: RuleValidationResult,
    criticValidation: any,
    query: string,
    context: any
  ): { shouldEscalate: boolean; reason?: string } {
    // Escalate if any rule validation failed
    if (!ruleValidation.passed) {
      return {
        shouldEscalate: true,
        reason: `Rule validation failed: ${ruleValidation.guardFailed}`
      };
    }

    // Escalate if critic flags unresolved ambiguity
    if (criticValidation.hasAmbiguity) {
      return {
        shouldEscalate: true,
        reason: 'Critic flags unresolved ambiguity'
      };
    }

    // Escalate if hallucination guard trips
    if (criticValidation.hasHallucination) {
      return {
        shouldEscalate: true,
        reason: 'Hallucination guard tripped'
      };
    }

    // Escalate for high-stakes tasks first (highest priority)
    if (this.isHighStakesTask(query)) {
      return {
        shouldEscalate: true,
        reason: 'High-stakes task detected'
      };
    }

    // Escalate if user asks for strategic planning (but not if already caught by high-stakes)
    if (/strategy|plan|optimi[sz]e|invest/i.test(query)) {
      return {
        shouldEscalate: true,
        reason: 'User asks strategic planning'
      };
    }

    // Escalate for rebuild requests (broader detection, but not if already caught)
    if (/rebuild/i.test(query)) {
      return {
        shouldEscalate: true,
        reason: 'User asks strategic planning'
      };
    }

    return { shouldEscalate: false };
  }

  /**
   * Numeric guardrails validation
   */
  private async validateNumericGuardrails(
    message: string,
    context: any
  ): Promise<NumericGuardrails> {
    const amountsNonNegative = this.validateAmountsNonNegative(message);
    const sumsMatchFactPack = await this.validateSumsMatchFactPack(message, context);
    const datesInsideWindow = this.validateDatesInsideWindow(message);
    const budgetLimitsRespected = this.validateBudgetLimitsRespected(message, context);

    return {
      amountsNonNegative,
      sumsMatchFactPack,
      datesInsideWindow,
      budgetLimitsRespected
    };
  }

  /**
   * Validate all amounts mentioned are non-negative
   */
  private validateAmountsNonNegative(message: string): boolean {
    // Look for negative amounts with -$ or -$ patterns
    const negativeAmountMatches = message.match(/-?\$?(\d+(?:\.\d{2})?)/g);
    if (!negativeAmountMatches) return true;

    return negativeAmountMatches.every(match => {
      // Check if the match starts with a minus sign
      if (match.startsWith('-')) {
        return false; // Negative amount detected
      }
      // Also check for patterns like "negative $50" or "-50"
      if (match.includes('-') || message.includes(`negative ${match}`)) {
        return false;
      }
      return true;
    });
  }

  /**
   * Validate sums mentioned match FactPack data
   */
  private async validateSumsMatchFactPack(message: string, context: any): Promise<boolean> {
    // Extract mentioned totals from message
    const totalMatches = message.match(/total.*?\$(\d+(?:\.\d{2})?)/gi);
    if (!totalMatches) return true;

    // Check against FactPack data
    for (const match of totalMatches) {
      const mentionedTotal = parseFloat(match.match(/\$(\d+(?:\.\d{2})?)/)?.[1] || '0');
      
      // Check budget totals
      if (message.toLowerCase().includes('budget')) {
        const factPackTotal = this.factPack.budgets?.reduce((sum, b) => sum + b.limit, 0) || 0;
        if (Math.abs(mentionedTotal - factPackTotal) > 0.01) {
          console.log('🔍 [EnhancedCritic] Budget total mismatch:', { mentioned: mentionedTotal, factPack: factPackTotal });
          return false;
        }
      }

      // Check goal totals
      if (message.toLowerCase().includes('goal')) {
        const factPackTotal = this.factPack.goals?.reduce((sum, g) => sum + g.targetAmount, 0) || 0;
        if (Math.abs(mentionedTotal - factPackTotal) > 0.01) {
          console.log('🔍 [EnhancedCritic] Goal total mismatch:', { mentioned: mentionedTotal, factPack: factPackTotal });
          return false;
        }
      }
    }

    return true;
  }

  /**
   * Validate dates mentioned are within FactPack time window
   */
  private validateDatesInsideWindow(message: string): boolean {
    const dateMatches = message.match(/(\d{1,2}\/\d{1,2}\/\d{4}|\d{4}-\d{2}-\d{2})/g);
    if (!dateMatches) return true;

    const factPackStart = new Date(this.factPack.time_window.start);
    const factPackEnd = new Date(this.factPack.time_window.end);

    return dateMatches.every(dateStr => {
      const date = new Date(dateStr);
      return date >= factPackStart && date <= factPackEnd;
    });
  }

  /**
   * Validate budget limits are respected
   */
  private validateBudgetLimitsRespected(message: string, context: any): boolean {
    // Check if message suggests spending beyond budget limits
    const spendingMatches = message.match(/spend.*?\$(\d+(?:\.\d{2})?)/gi);
    if (!spendingMatches) return true;

    for (const match of spendingMatches) {
      const suggestedSpending = parseFloat(match.match(/\$(\d+(?:\.\d{2})?)/)?.[1] || '0');
      
      // Check against remaining budget
      const totalRemaining = this.factPack.budgets?.reduce((sum, b) => sum + b.remaining, 0) || 0;
      if (suggestedSpending > totalRemaining) {
        console.log('🔍 [EnhancedCritic] Budget limit exceeded:', { suggested: suggestedSpending, remaining: totalRemaining });
        return false;
      }
    }

    return true;
  }

  /**
   * Validate claim types and forbidden phrasing
   */
  private validateClaimTypes(message: string): ClaimTypeValidation {
    const forbiddenClaims: string[] = [];
    
    this.forbiddenPatterns.forEach(pattern => {
      if (pattern.test(message)) {
        forbiddenClaims.push(`Contains forbidden pattern: ${pattern.source}`);
      }
    });

    const hasForbiddenPhrasing = forbiddenClaims.length > 0;
    
    // Determine risk level
    let riskLevel: 'low' | 'medium' | 'high' = 'low';
    if (forbiddenClaims.length > 2) riskLevel = 'high';
    else if (forbiddenClaims.length > 0) riskLevel = 'medium';

    return {
      hasForbiddenPhrasing,
      forbiddenClaims,
      riskLevel
    };
  }

  /**
   * Detect unresolved ambiguity in the message
   */
  private detectAmbiguity(message: string, context: any): boolean {
    const ambiguityIndicators = [
      /\b(maybe|perhaps|possibly|might|could)\b/i,
      /\b(it depends|varies|depends on)\b/i,
      /\b(sometimes|usually|often|rarely)\b/i,
      /\b(if|when|unless)\b.*\b(then|else)\b/i,
      /\b(one option|another option|alternatively)\b/i,
      /\b(consider|think about|you might want to)\b/i,
      /\b(up to you|your choice|your decision)\b/i,
      /\b(not sure|certain|definite)\b/i
    ];

    // Check for any ambiguity indicators (more sensitive detection)
    const matches = ambiguityIndicators.filter(pattern => pattern.test(message));
    
    // Debug logging to see what's being detected
    if (matches.length > 0) {
      console.log('🔍 [EnhancedCritic] Ambiguity detected:', matches.map(m => m.source));
    }
    
    return matches.length >= 1; // Any single indicator is enough for ambiguity
  }

  /**
   * Detect potential hallucination
   */
  private detectHallucination(message: string, context: any): boolean {
    const hallucinationIndicators = [
      // Claims data not in FactPack
      /\b(according to your data|based on your records|your records show)\b/i,
      // Specific numbers not in context - fix the pattern to properly escape $
      /\b(your average spending is \$[\d,]+)\b/i,
      // Claims about future data
      /\b(your spending will be|you will spend|next month you'll)\b/i,
      // Claims about external data
      /\b(market data shows|economic indicators suggest|industry trends)\b/i,
      // Claims about specific amounts not in FactPack
      /\b(your monthly income is \$[\d,]+)\b/i,
      /\b(your total assets are \$[\d,]+)\b/i,
      /\b(your credit score is \d+)\b/i,
      // Claims about historical data not provided
      /\b(last year you spent|in the past you|historically you)\b/i
    ];

    // Check for any hallucination indicators
    const matches = hallucinationIndicators.filter(pattern => pattern.test(message));
    
    // Debug logging to see what's being detected
    if (matches.length > 0) {
      console.log('🔍 [EnhancedCritic] Hallucination detected:', matches.map(m => m.source));
    }
    
    return matches.length >= 1; // Any single indicator is enough for hallucination
  }

  /**
   * Check if this is a high-stakes task
   */
  private isHighStakesTask(query: string): boolean {
    const queryLower = query.toLowerCase();
    
    // Check for specific high-stakes patterns that indicate complex planning
    const highStakesPatterns = [
      /rebuild.*\d+.*month.*savings/i,
      /rebuild.*\d+.*month.*plan/i,
      /emergency.*fund.*plan/i,
      /retirement.*plan.*strategy/i,
      /debt.*payoff.*plan/i,
      /major.*purchase.*plan/i,
      /life.*insurance.*plan/i,
      /estate.*planning/i
    ];
    
    // Check for specific high-stakes patterns first
    if (highStakesPatterns.some(pattern => pattern.test(queryLower))) {
      return true;
    }
    
    // Check for high-stakes keywords in context (not just standalone)
    const highStakesKeywords = [
      'rebuild',
      '6-month',
      'savings plan',
      'emergency fund',
      'retirement plan',
      'debt payoff',
      'major purchase',
      'life insurance',
      'estate planning'
    ];
    
    // Require multiple high-stakes keywords or specific context
    const keywordMatches = highStakesKeywords.filter(keyword => queryLower.includes(keyword));
    return keywordMatches.length >= 2 || queryLower.includes('rebuild');
  }

  /**
   * Determine if should escalate to Pro model
   */
  private shouldEscalateToPro(issues: string[], context: any): boolean {
    // Escalate if any critical issues
    const criticalIssues = [
      'numeric_sum_mismatch',
      'claim_forbidden_phrasing',
      'numeric_budget_limit_exceeded'
    ];

    return issues.some(issue => criticalIssues.includes(issue));
  }

  /**
   * Calculate overall confidence score
   */
  private calculateOverallConfidence(
    ruleValidation: RuleValidationResult,
    criticValidation: any
  ): number {
    const ruleConfidence = ruleValidation.confidence;
    const criticConfidence = criticValidation.isValid ? 0.9 : 0.3;
    
    // Weight rule validation more heavily
    return (ruleConfidence * 0.7) + (criticConfidence * 0.3);
  }

  /**
   * Estimate token count for analytics
   */
  private estimateTokenCount(message: string): number {
    // Rough estimation: 1 token ≈ 4 characters
    return Math.ceil(message.length / 4);
  }
}
