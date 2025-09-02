// FactPack Schema - Structured data layer to prevent AI hallucinations
// Provides deterministic, verifiable facts instead of prose descriptions

export interface FactPack {
  // Time context - explicit time windows to prevent confusion
  time_window: {
    start: string; // ISO date string
    end: string; // ISO date string  
    tz: string; // IANA timezone (e.g., "America/Los_Angeles")
    period: string; // Human readable (e.g., "Aug 1-25, PDT")
  };
  
  // Account balances - current state
  balances: Array<{
    accountId: string;
    name: string;
    current: number;
    total: number;
    spent: number;
    type: 'checking' | 'savings' | 'credit' | 'investment';
  }>;
  
  // Budget status - deterministic calculations
  budgets: Array<{
    id: string;
    name: string;
    period: string; // e.g., "2025-08"
    spent: number;
    limit: number;
    remaining: number;
    utilization: number; // percentage (0-100)
    status: 'under' | 'at_limit' | 'over';
    topCategories: Array<{
      name: string;
      spent: number;
      limit: number;
      utilization: number;
    }>;
  }>;
  
  // Financial goals - progress tracking
  goals: Array<{
    id: string;
    name: string;
    targetAmount: number;
    currentAmount: number;
    progress: number; // percentage (0-100)
    remaining: number;
    deadline: string; // ISO date string
    status: 'behind' | 'on_track' | 'ahead';
  }>;
  
  // Recurring expenses - predictable outflows
  recurring: Array<{
    id: string;
    name: string;
    amount: number;
    frequency: 'monthly' | 'weekly' | 'yearly';
    nextDue: string; // ISO date string
    category: string;
    isActive: boolean;
  }>;
  
  // Recent transactions - last 30 days
  recentTransactions: Array<{
    id: string;
    amount: number;
    category: string;
    date: string; // ISO date string
    type: 'expense' | 'income' | 'transfer';
    description: string;
  }>;
  
  // Spending patterns - calculated insights
  spendingPatterns: {
    totalSpent: number;
    averageDaily: number;
    topCategories: Array<{
      name: string;
      total: number;
      count: number;
      percentage: number;
    }>;
    trend: 'increasing' | 'decreasing' | 'stable';
    comparison: {
      previousPeriod: string;
      change: number; // percentage change
      isImprovement: boolean;
    };
  };
  
  // User profile context
  userProfile: {
    monthlyIncome: number;
    financialGoal: string;
    riskProfile: 'conservative' | 'moderate' | 'aggressive';
    preferences: {
      notifications: boolean;
      insights: boolean;
      autoCategorization: boolean;
    };
  };
  
  // Metadata for caching and validation
  metadata: {
    generatedAt: string; // ISO timestamp
    dataVersion: string;
    hash: string; // SHA-256 hash of all data for cache key
    source: 'local' | 'api' | 'cache';
    freshness: number; // seconds since last update
  };
}

// Deterministic calculator functions - AI should never compute these
export class FactPackCalculator {
  
  // Calculate budget utilization percentage
  static calculateUtilization(spent: number, limit: number): number {
    if (limit <= 0) return 0;
    return Math.min(100, Math.round((spent / limit) * 100));
  }
  
  // Determine budget status
  static determineBudgetStatus(spent: number, limit: number): 'under' | 'at_limit' | 'over' {
    const utilization = this.calculateUtilization(spent, limit);
    if (utilization >= 100) return 'over';
    if (utilization >= 95) return 'at_limit';
    return 'under';
  }
  
  // Calculate goal progress percentage
  static calculateGoalProgress(current: number, target: number): number {
    if (target <= 0) return 0;
    return Math.min(100, Math.round((current / target) * 100));
  }
  
  // Determine goal status
  static determineGoalStatus(current: number, target: number, deadline: string): 'behind' | 'on_track' | 'ahead' {
    const progress = this.calculateGoalProgress(current, target);
    const daysUntilDeadline = Math.ceil((new Date(deadline).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
    
    if (daysUntilDeadline <= 0) {
      return progress >= 100 ? 'ahead' : 'behind';
    }
    
    const expectedProgress = Math.max(0, 100 - (daysUntilDeadline / 30) * 100);
    if (progress >= expectedProgress + 10) return 'ahead';
    if (progress < expectedProgress - 10) return 'behind';
    return 'on_track';
  }
  
  // Calculate daily spending average
  static calculateDailyAverage(totalSpent: number, days: number): number {
    if (days <= 0) return 0;
    return Math.round((totalSpent / days) * 100) / 100;
  }
  
  // Generate cache hash for FactPack
  static generateHash(factPack: Omit<FactPack, 'metadata'>): string {
    const dataString = JSON.stringify(factPack, Object.keys(factPack).sort());
    // Simple hash function - in production, use crypto.createHash('sha256')
    let hash = 0;
    for (let i = 0; i < dataString.length; i++) {
      const char = dataString.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash).toString(36);
  }
  
  // Validate FactPack data integrity
  static validateFactPack(factPack: FactPack): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];
    
    // Check required fields
    if (!factPack.time_window?.start || !factPack.time_window?.end) {
      errors.push('Missing time window');
    }
    
    if (!factPack.balances || factPack.balances.length === 0) {
      errors.push('Missing balance data');
    }
    
    // Validate budget calculations
    factPack.budgets?.forEach((budget, index) => {
      const calculatedUtilization = this.calculateUtilization(budget.spent, budget.limit);
      if (Math.abs(budget.utilization - calculatedUtilization) > 1) {
        errors.push(`Budget ${index}: utilization mismatch (${budget.utilization} vs ${calculatedUtilization})`);
      }
      
      const calculatedRemaining = budget.limit - budget.spent;
      if (Math.abs(budget.remaining - calculatedRemaining) > 0.01) {
        errors.push(`Budget ${index}: remaining amount mismatch`);
      }
    });
    
    // Validate goal calculations
    factPack.goals?.forEach((goal, index) => {
      const calculatedProgress = this.calculateGoalProgress(goal.currentAmount, goal.targetAmount);
      if (Math.abs(goal.progress - calculatedProgress) > 1) {
        errors.push(`Goal ${index}: progress mismatch (${goal.progress} vs ${calculatedProgress})`);
      }
      
      const calculatedRemaining = goal.targetAmount - goal.currentAmount;
      if (Math.abs(goal.remaining - calculatedRemaining) > 0.01) {
        errors.push(`Goal ${index}: remaining amount mismatch`);
      }
    });
    
    return {
      isValid: errors.length === 0,
      errors
    };
  }
}

// FactPack builder for creating structured data
export class FactPackBuilder {
  private factPack: Partial<FactPack> = {};
  
  setTimeWindow(start: Date, end: Date, timezone: string): this {
    const period = this.formatPeriod(start, end, timezone);
    this.factPack.time_window = {
      start: start.toISOString(),
      end: end.toISOString(),
      tz: timezone,
      period
    };
    return this;
  }
  
  setBalances(balances: FactPack['balances']): this {
    this.factPack.balances = balances;
    return this;
  }
  
  setBudgets(budgets: FactPack['budgets']): this {
    // Ensure all calculated fields are set
    this.factPack.budgets = budgets.map(budget => ({
      ...budget,
      remaining: budget.limit - budget.spent,
      utilization: FactPackCalculator.calculateUtilization(budget.spent, budget.limit),
      status: FactPackCalculator.determineBudgetStatus(budget.spent, budget.limit)
    }));
    return this;
  }
  
  setGoals(goals: FactPack['goals']): this {
    // Ensure all calculated fields are set
    this.factPack.goals = goals.map(goal => ({
      ...goal,
      progress: FactPackCalculator.calculateGoalProgress(goal.currentAmount, goal.targetAmount),
      remaining: goal.targetAmount - goal.currentAmount,
      status: FactPackCalculator.determineGoalStatus(goal.currentAmount, goal.targetAmount, goal.deadline)
    }));
    return this;
  }
  
  setRecurring(recurring: FactPack['recurring']): this {
    this.factPack.recurring = recurring;
    return this;
  }
  
  setRecentTransactions(transactions: FactPack['recentTransactions']): this {
    this.factPack.recentTransactions = transactions;
    return this;
  }
  
  setSpendingPatterns(patterns: FactPack['spendingPatterns']): this {
    this.factPack.spendingPatterns = patterns;
    return this;
  }
  
  setUserProfile(profile: FactPack['userProfile']): this {
    this.factPack.userProfile = profile;
    return this;
  }
  
  build(): FactPack {
    // Generate metadata
    const factPackData = this.factPack as Omit<FactPack, 'metadata'>;
    const hash = FactPackCalculator.generateHash(factPackData);
    
    this.factPack.metadata = {
      generatedAt: new Date().toISOString(),
      dataVersion: '1.0.0',
      hash,
      source: 'local',
      freshness: 0
    };
    
    const result = this.factPack as FactPack;
    
    // Validate before returning
    const validation = FactPackCalculator.validateFactPack(result);
    if (!validation.isValid) {
      console.warn('FactPack validation failed:', validation.errors);
    }
    
    return result;
  }
  
  private formatPeriod(start: Date, end: Date, timezone: string): string {
    const startMonth = start.toLocaleDateString('en-US', { month: 'short', timeZone: timezone });
    const startDay = start.getDate();
    const endDay = end.getDate();
    const tzAbbr = this.getTimezoneAbbr(timezone);
    
    return `${startMonth} ${startDay}–${endDay}, ${tzAbbr}`;
  }
  
  private getTimezoneAbbr(timezone: string): string {
    const date = new Date();
    const options: Intl.DateTimeFormatOptions = { timeZoneName: 'short', timeZone: timezone };
    return new Intl.DateTimeFormat('en-US', options).formatToParts(date)
      .find(part => part.type === 'timeZoneName')?.value || timezone;
  }
}
