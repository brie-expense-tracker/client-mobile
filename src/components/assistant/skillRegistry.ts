// Skill Registry - Executable actions the AI can call
// Replaces long prose responses with small, high-value actions

import { FinancialContext } from './helpfulFallbacks';

export interface SkillParams {
	[key: string]: any;
}

export interface SkillResult {
	success: boolean;
	message: string;
	data?: any;
	error?: string;
}

export interface Skill {
	name: string;
	description: string;
	parameters: {
		[key: string]: {
			type: 'string' | 'number' | 'boolean' | 'object';
			required: boolean;
			description: string;
		};
	};
	execute: (
		params: SkillParams,
		context: FinancialContext
	) => Promise<SkillResult>;
}

// Core financial skills the AI can execute
export const skills: Record<string, Skill> = {
	ADJUST_LIMIT: {
		name: 'ADJUST_LIMIT',
		description: 'Adjust budget limit for a specific category',
		parameters: {
			cat: {
				type: 'string',
				required: true,
				description: 'Category name to adjust budget for',
			},
			delta: {
				type: 'number',
				required: true,
				description:
					'Amount to adjust (positive for increase, negative for decrease)',
			},
			reason: {
				type: 'string',
				required: false,
				description: 'Reason for the adjustment',
			},
		},
		execute: async (
			params: SkillParams,
			context: FinancialContext
		): Promise<SkillResult> => {
			try {
				const { cat, delta, reason } = params;

				if (!cat || typeof delta !== 'number') {
					return {
						success: false,
						message: 'Invalid parameters: category and delta are required',
						error: 'MISSING_PARAMETERS',
					};
				}

				// Find the budget for this category
				const budget = context.budgets?.find(
					(b) =>
						b.name.toLowerCase().includes(cat.toLowerCase()) ||
						cat.toLowerCase().includes(b.name.toLowerCase())
				);

				if (!budget) {
					return {
						success: false,
						message: `No budget found for category: ${cat}`,
						error: 'BUDGET_NOT_FOUND',
					};
				}

				const newAmount = Math.max(0, budget.amount + delta);
				const adjustment = delta > 0 ? 'increased' : 'decreased';

				return {
					success: true,
					message: `Budget for ${cat} ${adjustment} by $${Math.abs(
						delta
					).toFixed(2)}. New limit: $${newAmount.toFixed(2)}`,
					data: {
						category: cat,
						oldAmount: budget.amount,
						newAmount,
						delta,
						reason: reason || 'AI-suggested adjustment',
					},
				};
			} catch (error) {
				return {
					success: false,
					message: 'Failed to adjust budget limit',
					error: error instanceof Error ? error.message : 'UNKNOWN_ERROR',
				};
			}
		},
	},

	CREATE_RULE: {
		name: 'CREATE_RULE',
		description: 'Create a categorization rule for transactions',
		parameters: {
			cat: {
				type: 'string',
				required: true,
				description: 'Category to assign transactions to',
			},
			vendor: {
				type: 'string',
				required: false,
				description: 'Vendor name pattern to match',
			},
			description: {
				type: 'string',
				required: false,
				description: 'Description pattern to match',
			},
			priority: {
				type: 'number',
				required: false,
				description: 'Rule priority (1-10, higher = more important)',
			},
		},
		execute: async (
			params: SkillParams,
			context: FinancialContext
		): Promise<SkillResult> => {
			try {
				const { cat, vendor, description, priority = 5 } = params;

				if (!cat) {
					return {
						success: false,
						message: 'Category is required for creating a rule',
						error: 'MISSING_CATEGORY',
					};
				}

				// Validate category exists in budgets or is a valid new category
				const validCategory =
					context.budgets?.some(
						(b) => b.name.toLowerCase() === cat.toLowerCase()
					) || true; // Allow new categories

				if (!validCategory) {
					return {
						success: false,
						message: `Category "${cat}" not found in existing budgets`,
						error: 'INVALID_CATEGORY',
					};
				}

				const rule = {
					id: `rule_${Date.now()}`,
					category: cat,
					vendor: vendor || null,
					description: description || null,
					priority: Math.max(1, Math.min(10, priority)),
					createdAt: new Date(),
					active: true,
				};

				return {
					success: true,
					message: `Categorization rule created for ${cat}${
						vendor ? ` (vendor: ${vendor})` : ''
					}`,
					data: rule,
				};
			} catch (error) {
				return {
					success: false,
					message: 'Failed to create categorization rule',
					error: error instanceof Error ? error.message : 'UNKNOWN_ERROR',
				};
			}
		},
	},

	OPEN_BUDGETS: {
		name: 'OPEN_BUDGETS',
		description: 'Navigate to budgets screen (UI handles navigation)',
		parameters: {
			focus: {
				type: 'string',
				required: false,
				description: 'Specific budget or section to focus on',
			},
		},
		execute: async (
			params: SkillParams,
			_context: FinancialContext
		): Promise<SkillResult> => {
			// This is a UI navigation skill - no database changes needed
			const { focus } = params;

			return {
				success: true,
				message: `Opening budgets${focus ? ` with focus on ${focus}` : ''}`,
				data: {
					action: 'NAVIGATE',
					destination: 'BUDGETS',
					focus,
				},
			};
		},
	},

	VIEW_RECURRING: {
		name: 'VIEW_RECURRING',
		description:
			'Navigate to recurring expenses screen (UI handles navigation)',
		parameters: {
			filter: {
				type: 'string',
				required: false,
				description: 'Filter to show (e.g., "overdue", "upcoming", "all")',
			},
		},
		execute: async (
			params: SkillParams,
			_context: FinancialContext
		): Promise<SkillResult> => {
			const { filter } = params;

			return {
				success: true,
				message: `Opening recurring expenses${filter ? ` (${filter})` : ''}`,
				data: {
					action: 'NAVIGATE',
					destination: 'RECURRING_EXPENSES',
					filter,
				},
			};
		},
	},

	SET_SAVINGS_TARGET: {
		name: 'SET_SAVINGS_TARGET',
		description: 'Set or update a savings goal target',
		parameters: {
			goalName: {
				type: 'string',
				required: true,
				description: 'Name of the savings goal',
			},
			targetAmount: {
				type: 'number',
				required: true,
				description: 'Target amount to save',
			},
			deadline: {
				type: 'string',
				required: false,
				description: 'Target date (YYYY-MM-DD format)',
			},
			monthlyContribution: {
				type: 'number',
				required: false,
				description: 'Monthly contribution amount',
			},
		},
		execute: async (
			params: SkillParams,
			context: FinancialContext
		): Promise<SkillResult> => {
			try {
				const { goalName, targetAmount, deadline, monthlyContribution } =
					params;

				if (
					!goalName ||
					typeof targetAmount !== 'number' ||
					targetAmount <= 0
				) {
					return {
						success: false,
						message: 'Valid goal name and target amount are required',
						error: 'INVALID_PARAMETERS',
					};
				}

				// Check if goal already exists
				const existingGoal = context.goals?.find(
					(g) => g.name.toLowerCase() === goalName.toLowerCase()
				);

				if (existingGoal) {
					// Update existing goal
					const newTarget = targetAmount;
					const progress = existingGoal.current;
					const remaining = Math.max(0, newTarget - progress);

					return {
						success: true,
						message: `Updated "${goalName}" target to $${newTarget.toFixed(
							2
						)}. You have $${remaining.toFixed(2)} left to save.`,
						data: {
							action: 'UPDATE_GOAL',
							goalName,
							oldTarget: existingGoal.target,
							newTarget,
							progress,
							remaining,
						},
					};
				} else {
					// Create new goal
					const monthlyContributionAmount =
						monthlyContribution || targetAmount / 12; // Default to 12 months if no deadline

					return {
						success: true,
						message: `Created new savings goal "${goalName}" with target $${targetAmount.toFixed(
							2
						)}. Suggested monthly contribution: $${monthlyContributionAmount.toFixed(
							2
						)}`,
						data: {
							action: 'CREATE_GOAL',
							goalName,
							targetAmount,
							monthlyContribution: monthlyContributionAmount,
							deadline: deadline || null,
						},
					};
				}
			} catch (error) {
				return {
					success: false,
					message: 'Failed to set savings target',
					error: error instanceof Error ? error.message : 'UNKNOWN_ERROR',
				};
			}
		},
	},

	SNOOZE_REMINDER: {
		name: 'SNOOZE_REMINDER',
		description: 'Snooze a subscription or bill reminder',
		parameters: {
			reminderId: {
				type: 'string',
				required: true,
				description: 'ID of the reminder to snooze',
			},
			snoozeDays: {
				type: 'number',
				required: false,
				description: 'Days to snooze (default: 7)',
			},
		},
		execute: async (
			params: SkillParams,
			_context: FinancialContext
		): Promise<SkillResult> => {
			try {
				const { reminderId, snoozeDays = 7 } = params;

				if (!reminderId) {
					return {
						success: false,
						message: 'Reminder ID is required',
						error: 'MISSING_REMINDER_ID',
					};
				}

				const snoozeDate = new Date();
				snoozeDate.setDate(snoozeDate.getDate() + snoozeDays);

				return {
					success: true,
					message: `Reminder snoozed for ${snoozeDays} days until ${snoozeDate.toLocaleDateString()}`,
					data: {
						action: 'SNOOZE_REMINDER',
						reminderId,
						snoozeDays,
						snoozeUntil: snoozeDate,
					},
				};
			} catch (error) {
				return {
					success: false,
					message: 'Failed to snooze reminder',
					error: error instanceof Error ? error.message : 'UNKNOWN_ERROR',
				};
			}
		},
	},

	CANCEL_SUBSCRIPTION: {
		name: 'CANCEL_SUBSCRIPTION',
		description: 'Cancel a recurring subscription',
		parameters: {
			subscriptionName: {
				type: 'string',
				required: true,
				description: 'Name of the subscription to cancel',
			},
			effectiveDate: {
				type: 'string',
				required: false,
				description: 'When to cancel (immediate, end_of_period, specific_date)',
			},
			reason: {
				type: 'string',
				required: false,
				description: 'Reason for cancellation',
			},
		},
		execute: async (
			params: SkillParams,
			_context: FinancialContext
		): Promise<SkillResult> => {
			try {
				const {
					subscriptionName,
					effectiveDate = 'end_of_period',
					reason,
				} = params;

				if (!subscriptionName) {
					return {
						success: false,
						message: 'Subscription name is required',
						error: 'MISSING_SUBSCRIPTION_NAME',
					};
				}

				const effectiveDateText =
					effectiveDate === 'immediate'
						? 'immediately'
						: effectiveDate === 'end_of_period'
						? 'at the end of the current period'
						: `on ${effectiveDate}`;

				return {
					success: true,
					message: `Subscription "${subscriptionName}" will be cancelled ${effectiveDateText}${
						reason ? ` (Reason: ${reason})` : ''
					}`,
					data: {
						action: 'CANCEL_SUBSCRIPTION',
						subscriptionName,
						effectiveDate,
						reason,
						cancelledAt: new Date(),
					},
				};
			} catch (error) {
				return {
					success: false,
					message: 'Failed to cancel subscription',
					error: error instanceof Error ? error.message : 'UNKNOWN_ERROR',
				};
			}
		},
	},

	GET_SPENDING_INSIGHT: {
		name: 'GET_SPENDING_INSIGHT',
		description:
			'Get a quick spending insight for a specific category or time period',
		parameters: {
			category: {
				type: 'string',
				required: false,
				description: 'Specific category to analyze',
			},
			period: {
				type: 'string',
				required: false,
				description: 'Time period (week, month, quarter)',
			},
		},
		execute: async (
			params: SkillParams,
			context: FinancialContext
		): Promise<SkillResult> => {
			try {
				const { category, period = 'month' } = params;

				if (category) {
					// Category-specific insight
					const categoryData = context.recentSpendByCat?.find((c) =>
						c.cat.toLowerCase().includes(category.toLowerCase())
					);

					if (categoryData) {
						const percentage = categoryData.percentage;
						const insight =
							percentage > 30 ? 'high' : percentage > 15 ? 'moderate' : 'low';

						return {
							success: true,
							message: `${category} accounts for ${percentage.toFixed(
								1
							)}% of your spending (${insight} priority category)`,
							data: {
								category: categoryData.cat,
								amount: categoryData.spent,
								percentage: categoryData.percentage,
								priority: insight,
							},
						};
					} else {
						return {
							success: false,
							message: `No spending data found for category: ${category}`,
							error: 'CATEGORY_NOT_FOUND',
						};
					}
				} else {
					// General spending insight
					const totalSpent =
						context.recentSpendByCat?.reduce((sum, c) => sum + c.spent, 0) || 0;
					const topCategory = context.recentSpendByCat?.[0];

					if (topCategory && totalSpent > 0) {
						return {
							success: true,
							message: `Your top spending category is ${
								topCategory.cat
							} at $${topCategory.spent.toFixed(
								2
							)} (${topCategory.percentage.toFixed(1)}% of total)`,
							data: {
								totalSpent,
								topCategory: topCategory.cat,
								topAmount: topCategory.spent,
								topPercentage: topCategory.percentage,
							},
						};
					} else {
						return {
							success: false,
							message: 'No spending data available for insights',
							error: 'NO_DATA_AVAILABLE',
						};
					}
				}
			} catch (error) {
				return {
					success: false,
					message: 'Failed to get spending insight',
					error: error instanceof Error ? error.message : 'UNKNOWN_ERROR',
				};
			}
		},
	},
};

// Helper function to get available skills
export function getAvailableSkills(): string[] {
	return Object.keys(skills);
}

// Helper function to get skill details
export function getSkillDetails(skillName: string): Skill | null {
	return skills[skillName] || null;
}

// Helper function to validate skill parameters
export function validateSkillParameters(
	skillName: string,
	params: SkillParams
): { valid: boolean; errors: string[] } {
	const skill = skills[skillName];
	if (!skill) {
		return { valid: false, errors: [`Unknown skill: ${skillName}`] };
	}

	const errors: string[] = [];

	// Check required parameters
	for (const [paramName, paramDef] of Object.entries(skill.parameters)) {
		if (paramDef.required && !(paramName in params)) {
			errors.push(`Missing required parameter: ${paramName}`);
		}
	}

	// Check parameter types
	for (const [paramName, paramValue] of Object.entries(params)) {
		const paramDef = skill.parameters[paramName];
		if (paramDef) {
			const expectedType = paramDef.type;
			const actualType = typeof paramValue;

			if (expectedType === 'number' && actualType !== 'number') {
				errors.push(
					`Parameter ${paramName} should be a number, got ${actualType}`
				);
			} else if (expectedType === 'string' && actualType !== 'string') {
				errors.push(
					`Parameter ${paramName} should be a string, got ${actualType}`
				);
			} else if (expectedType === 'boolean' && actualType !== 'boolean') {
				errors.push(
					`Parameter ${paramName} should be a boolean, got ${actualType}`
				);
			}
		}
	}

	return { valid: errors.length === 0, errors };
}

// Helper function to execute a skill with validation
export async function executeSkill(
	skillName: string,
	params: SkillParams,
	context: FinancialContext
): Promise<SkillResult> {
	const skill = skills[skillName];
	if (!skill) {
		return {
			success: false,
			message: `Unknown skill: ${skillName}`,
			error: 'UNKNOWN_SKILL',
		};
	}

	const validation = validateSkillParameters(skillName, params);
	if (!validation.valid) {
		return {
			success: false,
			message: `Invalid parameters for skill ${skillName}`,
			error: 'INVALID_PARAMETERS',
			data: { errors: validation.errors },
		};
	}

	try {
		return await skill.execute(params, context);
	} catch (error) {
		return {
			success: false,
			message: `Failed to execute skill ${skillName}`,
			error: error instanceof Error ? error.message : 'EXECUTION_ERROR',
		};
	}
}
