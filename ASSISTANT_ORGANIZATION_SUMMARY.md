# Assistant File Organization Summary

## Overview

The assistant-related files have been reorganized to create a cleaner, more maintainable structure with proper separation of concerns.

## New Organization Structure

### 1. Screen-Specific Components

**Location**: `app/(tabs)/assistant/`

- `index.tsx` - Main assistant screen
- `_layout.tsx` - Screen layout
- `components/WhyThisTray.tsx` - Screen-specific component
- `_components/` - Screen-specific UI components (25+ files)
  - AICoach.tsx, AnalyticsDashboard.tsx, DevHud.tsx, etc.

### 2. Shared UI Components

**Location**: `src/components/assistant/`

#### Cards (`src/components/assistant/cards/`)

- `FallbackCard.tsx` - Cached data fallback display
- `IntentMissingInfoCard.tsx` - Intent-based missing info collection
- `MissingInfoCard.tsx` - General missing info collection
- `safeFallbackCard.tsx` - Safe fallback display

#### Indicators (`src/components/assistant/indicators/`)

- `ServiceStatusIndicator.tsx` - Service status display

#### Shared (`src/components/assistant/shared/`)

- `actionableAsk.ts` - Actionable ask utilities
- `composeAnswer.ts` - Answer composition utilities
- `format.ts` - Formatting utilities
- `sharedStyles.ts` - Shared styling
- `CostOptimizationDashboard.tsx` - Cost optimization UI
- `CostWarningChip.tsx` - Cost warning display
- `DisclaimerBanner.tsx` - Disclaimer banner
- `GroundingDemo.tsx` - Grounding demonstration

### 3. Business Logic & Services

**Location**: `src/services/assistant/`

#### Core Services

- `hybridAIOrchestrator.ts` - Main orchestrator
- `enhancedIntentMapper.ts` - Intent mapping
- `intentMapper.ts` - Basic intent mapping
- `simpleQALane.ts` - Simple Q&A processing
- `simpleKnowledgeBase.ts` - Knowledge base
- `responseSchema.ts` - Response schemas
- `types.ts` - Type definitions

#### AI Services (`src/services/assistant/ai/`)

- `analytics.ts` - AI analytics
- `answer.ts` - Answer generation
- `cascade.ts` - Cascade processing
- `miniCritic.ts` - Mini critic service
- `miniWriter.ts` - Mini writer service
- `proImprover.ts` - Pro improvement service
- `types.ts` - AI types
- `guards/` - Guard implementations
- `ui/` - AI UI components

#### Skills (`src/services/assistant/skills/`)

- `engine.ts` - Skills engine
- `registry.ts` - Skills registry
- `types.ts` - Skills types
- `packs/` - Skill packs (cd, hysa)
- `webFns/` - Web functions

#### Agents (`src/services/assistant/agents/`)

- `hysaResearchAgent.ts` - Hysa research agent

#### Utilities (`src/services/assistant/utils/`)

- `businessDays.ts` - Business day calculations
- `i18n.ts` - Internationalization
- `numberUtils.ts` - Number utilities
- `timedLRU.ts` - Timed LRU cache

#### Other Services

- `answerability.ts` - Answerability checking
- `answerabilityGating.ts` - Answerability gating
- `budgetNarration.ts` - Budget narration
- `criticMini.ts` - Mini critic
- `evaluationSystem.ts` - Evaluation system
- `factPack.ts` - Fact pack utilities
- `helpfulFallbacks.ts` - Helpful fallbacks
- `hierarchicalRouter.ts` - Hierarchical routing
- `microSolvers.ts` - Micro solvers
- `modeGuards.ts` - Mode guards
- `modeMachine.ts` - Mode machine
- `observabilitySystem.ts` - Observability
- `promptBuilder.ts` - Prompt building
- `routeModel.ts` - Route modeling
- `slotResolver.ts` - Slot resolution
- `smartFallbackSystem.ts` - Smart fallbacks
- `usefulness.ts` - Usefulness metrics

#### Builders (`src/services/assistant/builders/`)

- `balance.ts` - Balance builders
- `budget.ts` - Budget builders
- `forecast.ts` - Forecast builders
- `goals.ts` - Goals builders
- `subscriptions.ts` - Subscription builders

#### Planners (`src/services/assistant/planners/`)

- `goalAllocation.ts` - Goal allocation planning
- `spendingPlan.ts` - Spending plan planning

#### Playbooks (`src/services/assistant/playbooks/`)

- `overviewPlaybook.ts` - Overview playbook

#### Tests (`src/services/assistant/__tests__/`)

- Various test files for different services

#### Documentation (`src/services/assistant/docs/`)

- Various README files explaining different systems

## Key Improvements

1. **Clear Separation of Concerns**

   - UI components are separated from business logic
   - Screen-specific components are isolated
   - Shared components are reusable

2. **Logical Grouping**

   - Cards, indicators, and shared components are grouped
   - AI services, skills, and agents are organized
   - Utilities and builders are properly categorized

3. **Maintainability**

   - Easier to find specific functionality
   - Clear import paths
   - Reduced coupling between components

4. **Scalability**
   - Easy to add new components in appropriate directories
   - Clear patterns for new features
   - Well-organized service layer

## Import Path Updates

All import statements have been updated to reflect the new organization:

- UI components: `src/components/assistant/[category]/[component]`
- Services: `src/services/assistant/[service]`
- Shared utilities: `src/components/assistant/shared/[utility]`

## Benefits

- **Reduced Confusion**: Clear file locations and purposes
- **Better Maintainability**: Easier to find and modify code
- **Improved Collaboration**: Team members can easily navigate the codebase
- **Enhanced Scalability**: Clear patterns for adding new features
- **Cleaner Architecture**: Proper separation of concerns
