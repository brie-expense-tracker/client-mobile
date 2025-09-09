// Skills System - Comprehensive skill management and execution
// Exports all skill-related functionality

// Core types
export * from './types';

// Core skill engine
export { trySkills, getSkillEngineStats, testSkill } from './engine';

// Skill registry
export { skillRegistry } from './registry';

// Enhanced skill management
export { skillManager, SkillManager } from './skillManager';

// Skill testing utilities
export { skillTester, SkillTester } from './skillTester';

// Skill metrics and monitoring
export { skillMetrics, SkillMetricsCollector } from './skillMetrics';

// Comprehensive skill registry
export {
	COMPREHENSIVE_SKILL_REGISTRY,
	getSkill,
	getAllSkills,
	getSkillsByCategory,
	type FinancialSkillId,
} from './comprehensiveSkillRegistry';

// Skill packs
export { HYSA_SKILL } from './packs/hysa';
export { CD_SKILL } from './packs/cd';

// Web functions
export { webFnsForHYSA } from './packs/webFns/hysaWebFns';
export { webFnsForCD } from './packs/webFns/cdWebFns';

// Base research agent
export { BaseResearchAgent } from './baseResearchAgent';

// Re-export from skillExecutor for backward compatibility
export { skillExecutor, SkillExecutor } from '../skillExecutor';
