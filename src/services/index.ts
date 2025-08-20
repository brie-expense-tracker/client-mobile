// Core Services
export { ApiService } from './core/apiService';
export { UserService, type User, type Profile } from './core/userService';
export { OnboardingService } from './core/onboardingService';

// Feature Services
export {
	RecurringExpenseService,
	type RecurringExpense,
} from './feature/recurringExpenseService';
export { BudgetSuggestionService } from './feature/budgetSuggestionService';
export { CustomGPTService } from './feature/customGPTService';
export { InsightsService, type AIInsight } from './feature/insightsService';
export {
	notificationService,
	type NotificationData,
} from './feature/notificationService';
export {
	WeeklyReflectionService,
	type WeeklyReflection,
	type SaveReflectionData,
} from './feature/weeklyReflectionService';
export {
	BudgetAnalysisService,
	type BudgetAnalysis,
} from './feature/budgetAnalysisService';
export {
	FinancialSnapshotService,
	type BudgetHistoryItem,
} from './feature/financialSnapshotService';
export {
	IntelligentActionService,
	type IntelligentAction,
	type ActionExecutionResult,
} from './feature/intelligentActionService';
export {
	SpendingForecastService,
	type MonthlyForecast,
	type BudgetForecast,
} from './feature/spendingForecastService';

// ML/AI Services
export { default as HybridAIService } from './ml/hybridAIService';
export { default as LocalMLService } from './ml/localMLService';

// Utility Services
export { default as SmartCacheService } from './utility/smartCacheService';
