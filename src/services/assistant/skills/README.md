# Skills System

A comprehensive skill management and execution system for the financial assistant. This system provides a modular, extensible architecture for handling different types of financial queries and operations.

## Features

### 🚀 Core Features

- **Skill Registry**: Centralized management of all financial skills
- **Skill Engine**: Orchestrates skill execution with fallback strategies
- **Skill Validation**: Comprehensive parameter validation and error handling
- **Skill Caching**: TTL-based caching for improved performance
- **Skill Metrics**: Detailed analytics and performance monitoring
- **Skill Testing**: Automated testing utilities and validation
- **Skill Dependencies**: Dependency management between skills
- **Skill Middleware**: Pre/post execution hooks and interceptors

### 📊 Advanced Features

- **Performance Monitoring**: Real-time metrics and health reporting
- **Usage Analytics**: Track skill usage patterns and trends
- **Automated Testing**: Generate and run test cases automatically
- **Skill Versioning**: Version management and migration support
- **Batch Processing**: Execute multiple skills concurrently
- **Offline Support**: Graceful handling of network issues

## Architecture

```
Skills System
├── Core Engine (engine.ts)
├── Skill Registry (registry.ts)
├── Skill Manager (skillManager.ts)
├── Skill Tester (skillTester.ts)
├── Skill Metrics (skillMetrics.ts)
├── Comprehensive Registry (comprehensiveSkillRegistry.ts)
├── Skill Packs (packs/)
│   ├── HYSA (hysa.ts)
│   ├── CD (cd.ts)
│   └── Web Functions (webFns/)
└── Types & Interfaces (types.ts)
```

## Quick Start

### Basic Usage

```typescript
import { skillManager, skillTester, skillMetrics } from './skills';

// Register a skill
const mySkill: EnhancedSkill = {
	id: 'MY_SKILL',
	name: 'My Financial Skill',
	description: 'Handles specific financial queries',
	matches: (q: string) => q.includes('my query'),
	run: async (params, ctx) => {
		return {
			success: true,
			data: { result: 'Skill executed successfully' },
		};
	},
};

skillManager.registerSkill(mySkill);

// Execute a skill
const result = await skillManager.executeSkill('MY_SKILL', params, context);

// Test a skill
const testResults = await skillTester.runSkillTests('MY_SKILL');

// Get metrics
const metrics = skillMetrics.getSkillAnalytics('MY_SKILL');
```

### Creating a New Skill

```typescript
import { EnhancedSkill } from './types';

const budgetSkill: EnhancedSkill = {
	id: 'BUDGET_ANALYSIS',
	name: 'Budget Analysis',
	description: 'Analyzes budget utilization and provides insights',

	// Define what questions this skill can handle
	matches: (q: string) => /budget.*analysis|analyze.*budget/i.test(q),

	// Define required parameters
	slots: {
		period: {
			type: 'string',
			required: true,
			description: 'Analysis period',
			examples: ['this month', 'last 30 days', 'YTD'],
		},
		category: {
			type: 'category',
			required: false,
			description: 'Specific category to analyze',
			examples: ['groceries', 'dining', 'transportation'],
		},
	},

	// Check if skill can handle the current context
	canHandle: (ctx: ChatContext) => ({
		canAnswer: !!ctx.budgets?.length,
		reason: ctx.budgets?.length ? undefined : 'NO_BUDGETS',
		confidence: ctx.budgets?.length ? 0.9 : 0.0,
	}),

	// Execute the skill
	run: async (params, ctx) => {
		const budgets = ctx.budgets || [];
		const analysis = budgets.map((budget) => ({
			name: budget.name,
			utilization: (budget.spent / budget.amount) * 100,
			remaining: budget.amount - budget.spent,
		}));

		return {
			success: true,
			data: {
				analysis,
				period: params.period,
				totalBudgets: budgets.length,
			},
		};
	},

	// Render UI components
	render: (data, params) => ({
		type: 'budget_analysis_card',
		title: 'Budget Analysis',
		data: {
			analysis: data.analysis,
			period: data.period,
		},
	}),

	// Generate coach insights
	coach: (data) => ({
		message: `Analyzed ${data.totalBudgets} budgets for ${data.period}`,
		action: 'VIEW_DETAILED_BREAKDOWN',
	}),

	// Configuration
	config: {
		priority: 5,
		minUsefulness: 3,
		ttlMs: 300000, // 5 minutes
	},

	// Caching configuration
	cacheConfig: {
		enabled: true,
		ttlMs: 300000,
		keyGenerator: (params, ctx) =>
			`budget_analysis_${params.period}_${ctx.budgets?.length || 0}`,
	},

	// Metrics configuration
	metrics: {
		enabled: true,
		retentionDays: 30,
	},

	// Test cases
	testing: {
		testCases: [
			{
				name: 'basic_analysis',
				description: 'Basic budget analysis test',
				input: {
					question: 'Analyze my budget for this month',
					params: { period: 'this month' },
					context: {
						budgets: [{ name: 'Groceries', amount: 300, spent: 150 }],
					},
				},
				expected: {
					success: true,
					containsText: ['Budget Analysis', 'Groceries'],
				},
			},
		],
	},
};

// Register the skill
skillManager.registerSkill(budgetSkill);
```

### Testing Skills

```typescript
import { skillTester } from './skills';

// Create a test suite
const testSuite: TestSuite = {
	name: 'Budget Skills Test Suite',
	description: 'Tests all budget-related skills',
	skills: ['BUDGET_ANALYSIS', 'BUDGET_CREATE'],
	testCases: [
		{
			name: 'test_budget_analysis',
			description: 'Test budget analysis functionality',
			input: {
				question: 'How are my budgets doing?',
				params: { period: 'this month' },
				context: mockContext,
			},
			expected: {
				success: true,
				containsText: ['budget', 'analysis'],
			},
		},
	],
};

// Register and run the test suite
skillTester.registerTestSuite(testSuite);
const results = await skillTester.runTestSuite('Budget Skills Test Suite');
console.log(`Tests passed: ${results.passedTests}/${results.totalTests}`);
```

### Monitoring and Metrics

```typescript
import { skillMetrics } from './skills';

// Get skill analytics
const analytics = skillMetrics.getSkillAnalytics('BUDGET_ANALYSIS', 30);
console.log('Success rate:', analytics.performance.successRate);
console.log(
	'Average execution time:',
	analytics.performance.averageExecutionTime
);

// Get health report
const healthReport = skillMetrics.getHealthReport();
console.log('Overall health:', healthReport.overallHealth);
console.log('Critical issues:', healthReport.criticalIssues);

// Get top performing skills
const topSkills = skillMetrics.getTopPerformingSkills(10);
console.log('Top skills:', topSkills);
```

## Skill Types

### Core Skills

- **Overview Skills**: Financial snapshots and summaries
- **Budget Skills**: Budget creation, analysis, and management
- **Goal Skills**: Goal tracking and progress monitoring
- **Transaction Skills**: Transaction search and categorization
- **Education Skills**: Financial education and guidance

### Skill Execution Flow

1. **Question Analysis**: Parse and understand the user's question
2. **Skill Matching**: Find skills that can handle the question
3. **Dependency Check**: Verify all required dependencies are satisfied
4. **Parameter Validation**: Validate and sanitize input parameters
5. **Execution**: Run the skill with proper error handling
6. **Caching**: Store results for future use
7. **Metrics**: Record execution metrics and analytics
8. **Response**: Return formatted response to user

## Configuration

### Skill Registry Configuration

```typescript
const config: SkillRegistryConfig = {
	caching: {
		enabled: true,
		defaultTtlMs: 300000, // 5 minutes
		maxSize: 1000,
	},
	metrics: {
		enabled: true,
		retentionDays: 30,
	},
	middleware: {
		global: [
			// Global middleware functions
		],
	},
	validation: {
		strict: true,
		validateSlots: true,
	},
};

const skillManager = SkillManager.getInstance(config);
```

### Performance Thresholds

```typescript
const thresholds: PerformanceThresholds = {
	executionTime: {
		excellent: 1000, // 1 second
		good: 3000, // 3 seconds
		fair: 5000, // 5 seconds
	},
	successRate: {
		excellent: 95, // 95%
		good: 85, // 85%
		fair: 70, // 70%
	},
	usefulness: {
		excellent: 4.0, // 4.0/5.0
		good: 3.0, // 3.0/5.0
		fair: 2.0, // 2.0/5.0
	},
};

const metrics = SkillMetricsCollector.getInstance(thresholds);
```

## Best Practices

### Skill Development

1. **Keep skills focused**: Each skill should handle one specific type of query
2. **Use descriptive names**: Make skill IDs and names clear and descriptive
3. **Validate inputs**: Always validate and sanitize input parameters
4. **Handle errors gracefully**: Provide meaningful error messages
5. **Write tests**: Include comprehensive test cases for your skills
6. **Use caching**: Enable caching for expensive operations
7. **Monitor performance**: Track metrics and optimize based on data

### Performance Optimization

1. **Use micro-solvers**: Implement fast, rule-based solutions first
2. **Cache results**: Cache expensive computations and API calls
3. **Optimize queries**: Use efficient data structures and algorithms
4. **Monitor metrics**: Track execution times and success rates
5. **Profile regularly**: Identify and fix performance bottlenecks

### Testing

1. **Write unit tests**: Test individual skill functions
2. **Create integration tests**: Test skill interactions
3. **Use mock data**: Create realistic test scenarios
4. **Test edge cases**: Handle unusual inputs and conditions
5. **Automate testing**: Run tests as part of CI/CD pipeline

## Troubleshooting

### Common Issues

1. **Skill not matching**: Check the `matches` function logic
2. **Validation errors**: Verify slot specifications and parameter types
3. **Performance issues**: Check execution times and enable caching
4. **Dependency errors**: Ensure all required dependencies are registered
5. **Cache issues**: Verify cache configuration and TTL settings

### Debugging

```typescript
// Enable debug logging
console.log(
	'Skill execution:',
	await skillManager.executeSkill('SKILL_ID', params, context)
);

// Check skill metrics
const metrics = skillMetrics.getSkillAnalytics('SKILL_ID');
console.log('Skill metrics:', metrics);

// Run skill tests
const testResults = await skillTester.runSkillTests('SKILL_ID');
console.log('Test results:', testResults);
```

## Contributing

1. **Follow the skill interface**: Implement all required methods
2. **Add comprehensive tests**: Include test cases for your skills
3. **Update documentation**: Keep README and comments up to date
4. **Follow naming conventions**: Use consistent naming patterns
5. **Handle errors gracefully**: Provide meaningful error messages
6. **Optimize performance**: Consider caching and efficiency
7. **Monitor metrics**: Track skill performance and usage

## License

This skills system is part of the Brie financial assistant project.
