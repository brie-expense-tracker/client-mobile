// ai/index.ts - Export all cascade components

// Core types
export * from './types';

// Cascade components
export { MiniWriter } from './miniWriter';
export { MiniCritic } from './miniCritic';
export { ProImprover } from './proImprover';

// Decision logic
export {
	decide,
	isHighStakesQuery,
	shouldEscalate,
	getEscalationReason,
} from './cascade';

// Guards
export { guardNumbers } from './guards/numbers';
export { guardTimeStamp } from './guards/window';
export { guardClaims } from './guards/claims';

// UI helpers
export {
	toClarifyUI,
	createClarificationFromGuard,
	createClarificationFromCritic,
} from './ui/clarify';

// Main orchestrator
export { answerWithCascade, CascadeOrchestrator } from './answer';

// Analytics
export {
	CascadeAnalyticsService,
	cascadeAnalytics,
	logCascadeEvent,
} from './analytics';

// Re-export FactPack for convenience
export { FactPack } from '../factPack';
