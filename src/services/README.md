# Services Directory

This directory contains all the service classes that handle business logic, API communication, and external integrations for the Brie mobile app.

## Organization

### Core Services (`/core`)
Essential services that are used throughout the application:
- **`apiService.ts`** - Central API communication layer
- **`userService.ts`** - User authentication and profile management
- **`onboardingService.ts`** - Onboarding flow management

### Feature Services (`/feature`)
Services that implement specific app features:
- **`recurringExpenseService.ts`** - Recurring expense management
- **`budgetSuggestionService.ts`** - Budget suggestions and recommendations
- **`customGPTService.ts`** - AI chat and conversation functionality
- **`insightsService.ts`** - AI-powered financial insights
- **`notificationService.ts`** - Push notifications and alerts
- **`weeklyReflectionService.ts`** - Weekly financial reflection system

### ML/AI Services (`/ml`)
Machine learning and artificial intelligence services:
- **`hybridAIService.ts`** - Hybrid AI service combining local and cloud AI
- **`localMLService.ts`** - Local machine learning capabilities

### Utility Services (`/utility`)
Helper services that provide utility functions:
- **`smartCacheService.ts`** - Intelligent caching layer for performance

## Usage

All services are exported through the main `index.ts` file. Import them like this:

```typescript
import { 
  ApiService, 
  UserService, 
  RecurringExpenseService,
  HybridAIService,
  SmartCacheService 
} from '../services';
```

## Service Guidelines

1. **Single Responsibility**: Each service should have one clear purpose
2. **Dependency Injection**: Services should accept dependencies through constructor or parameters
3. **Error Handling**: All services should implement proper error handling
4. **TypeScript**: All services should be fully typed
5. **Testing**: Services should be unit testable

## Removed Services

The following services were removed as they were not being used in the application:
- AI deployment and orchestration services (`deployAIServices.ts`, `deploymentOrchestrator.ts`, `deploymentService.ts`)
- Team training services (`teamTrainingService.ts`)
- Feature store services (`featureStoreService.ts`)
- Observability services (`observabilityService.ts`)
- Various AI evaluation and routing services (`evaluationService.ts`, `aiRouterService.ts`)
- Enhanced AI services (`enhancedAIService.ts`, `intelligentLocalAIService.ts`)
- Financial analysis services (`financialSnapshotService.ts`, `budgetAnalysisService.ts`)
- Intelligent action services (`intelligentActionService.ts`)
- Spending forecast services (`spendingForecastService.ts`)
- AI categorization services (`aiCategorizationService.ts`)
- Demo and test files (`MLDemo.ts`, `enhancedAIService.test.ts`)

These can be found in the git history if needed in the future.

## Directory Structure

```
services/
├── core/           # Essential services
├── feature/        # Feature-specific services
├── ml/            # Machine learning services
├── utility/       # Utility services
├── __tests__/     # Test files
├── index.ts       # Main export file
└── README.md      # This file
```
