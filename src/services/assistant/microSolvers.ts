// Micro-solvers for quick math, date calculations, and app navigation
// These run before any LLM to provide instant, cheap answers

import {
	toNumber,
	parsePercentageCalculation,
	parseEmergencyFund,
	formatCurrency,
	formatPercentage,
	normalizeText,
} from './utils/numberUtils';
import { ActionType, QuickAction } from './actionTypes';
import { ChatContext } from '../../services/feature/chatController';
import { businessDaysBetween, formatBusinessDays } from './utils/businessDays';
import { detectLang, copy, Lang } from './utils/i18n';

/**
 * Parse months from text like "in 6 months", "over 12 months", "within 9 mo"
 */
function parseMonths(text: string): number | null {
	const m = text.match(
		/\b(in|over|within)\s+(\d{1,2})\s*(?:months?|mos?|mo)\b/i
	);
	return m ? Number(m[2]) : null;
}

/**
 * Parse target horizon from text, defaulting to 12 months
 */
function parseTargetHorizon(text: string): number {
	const months = parseMonths(text);
	return months && months > 0 ? Math.min(60, months) : 12; // default 12 mo, max 60
}

export interface MicroSolverResult {
	answer: string;
	actions?: QuickAction[];
	confidence: number;
	matchedPattern?: string;
}

/**
 * Emergency fund monthly contribution calculator
 */
export function emergencyFundMonthly(
	text: string,
	ctx?: ChatContext
): MicroSolverResult | null {
	const isAsk =
		/\b(how\s+much\s+(should|to)\s+(i\s+)?(put|save|contribute).*(per\s*month|monthly))\b/i.test(
			text
		) && /\b(emergency\s+fund|rainy\s+day|ef)\b/i.test(text);

	if (!isAsk) return null;

	// 1) Essentials (prefer real context)
	const essentials =
		ctx?.recurringExpenses
			?.filter((e: any) => e.isEssential)
			.reduce((s: number, e: any) => s + (Number(e.amount) || 0), 0) || 3000;

	// 2) Target months of coverage (default 3 if not specified)
	const targetCoverage =
		(text.match(
			/(\d)\s*[- ]*(?:months?|mos?|mo)\s*(?:of)?\s*(?:coverage|buffer)?/i
		)?.[1] &&
			Number(RegExp.$1)) ||
		3;

	const targetAmount = essentials * targetCoverage;

	// 3) Current EF balance (from goals if present)
	const efGoal =
		ctx?.goals?.find((g: any) => /emergency/i.test(g.name || g.type)) || null;
	const current = efGoal?.currentAmount || 0;

	// 4) Horizon to finish (default 12 months, parse "in 6 months…")
	const horizon = parseTargetHorizon(text);

	const gap = Math.max(0, targetAmount - current);
	const monthly = Math.ceil(gap / Math.max(1, horizon));

	const nf = (n: number) => formatCurrency(n, 'en-US', 'USD'); // Use default locale/currency for now

	const answer =
		gap <= 0
			? `Looks like you've already hit a ${targetCoverage}-month cushion (~${nf(
					targetAmount
			  )}). You don't need to add more monthly unless you want to grow it further.`
			: `To reach a ${targetCoverage}-month cushion (~${nf(
					targetAmount
			  )}) in ${horizon} month${horizon > 1 ? 's' : ''}, save about **${nf(
					monthly
			  )}/month**. (You've got ${nf(current)} so far.)`;

	return {
		answer,
		actions: [
			{
				label: 'Update Emergency Fund Goal',
				action: ActionType.OPEN_GOAL_FORM,
				params: { type: 'emergency_fund', monthlyTarget: monthly },
			},
			{ label: 'Open Goals', action: ActionType.OPEN_GOAL_WIZARD },
		],
		confidence: 0.92,
		matchedPattern: 'EF_MONTHLY_CONTRIBUTION',
	};
}

/**
 * HYSA interest estimator - calculates earnings for given amounts
 */
export function hysaInterestEstimator(
	text: string,
	ctx?: ChatContext
): MicroSolverResult | null {
	// Match patterns like "If I put $3000 in a HYSA, how much interest?"
	const isAsk =
		/\b(if\s+i\s+put|deposit|save)\s+\$?([\d.,]+)\s+(?:in\s+a\s+)?(?:hysa|high[-\s]?yield\s+savings|savings\s+account)/i.test(
			text
		);

	if (!isAsk) return null;

	const amountMatch = text.match(/\$?([\d.,]+)/);
	if (!amountMatch) return null;

	const amount = toNumber(amountMatch[1]);
	if (!amount || amount <= 0) return null;

	// Current competitive APY range (4.5% - 5.0%)
	const lowAPY = 4.5;
	const highAPY = 5.0;

	// Calculate monthly and yearly interest
	const monthlyLow = (amount * lowAPY) / 100 / 12;
	const monthlyHigh = (amount * highAPY) / 100 / 12;
	const yearlyLow = (amount * lowAPY) / 100;
	const yearlyHigh = (amount * highAPY) / 100;

	const nf = (n: number) => formatCurrency(n, 'en-US', 'USD');

	const answer = `With **${nf(amount)}** in a HYSA:
• **Monthly interest:** ${nf(monthlyLow)} - ${nf(monthlyHigh)} (4.5% - 5.0% APY)
• **Yearly interest:** ${nf(yearlyLow)} - ${nf(yearlyHigh)}

*Rates change frequently—check current APY before opening.*`;

	return {
		answer,
		actions: [
			{
				label: 'Create Savings Goal',
				action: ActionType.OPEN_GOAL_FORM,
				params: { type: 'savings' },
			},
		],
		confidence: 0.9,
		matchedPattern: 'HYSA_INTEREST_ESTIMATOR',
	};
}

/**
 * HYSA advisor for high-yield savings account suggestions
 */
export function hysaAdvisor(
	text: string,
	ctx?: ChatContext
): MicroSolverResult | null {
	const isAsk =
		/\b(high[-\s]?yield\s+savings|hysa|high\s+yield\s+account|high\s+yield)\b/i.test(
			text
		) && /\b(suggest|recommend|which|any|do\s+you\s+have)\b/i.test(text);
	if (!isAsk) return null;

	const answer = `What to look for in a high-yield savings account (HYSA):
• **FDIC/NCUA insured** at the bank/credit union level.  
• **APY** near the current top tier (rates change—avoid teaser promo traps).  
• **No/low fees** and **$0 minimums** if possible.  
• **ACH transfer speed** (1–2 business days) and decent daily limits.  
• **Sub-accounts/"buckets"** to separate goals.  
• Solid mobile app and customer support.`;

	return {
		answer,
		actions: [
			{
				label: 'Create Savings Goal',
				action: ActionType.OPEN_GOAL_FORM,
				params: { type: 'savings' },
			},
			{ label: 'Open Goals', action: ActionType.OPEN_GOAL_WIZARD },
		],
		confidence: 0.9,
		matchedPattern: 'HYSA_CRITERIA',
	};
}

/**
 * Main micro-solver dispatcher with context support
 */
export function microSolve(
	question: string,
	context?: ChatContext
): MicroSolverResult | null {
	const text = normalizeText(question);
	const lang: Lang = detectLang(question);

	// Try each micro-solver in order of speed/cheapness
	const result =
		emergencyFundMonthly(text, context) || // NEW: calculate monthly
		hysaInterestEstimator(text, context) || // NEW: HYSA interest calculator
		hysaAdvisor(text, context) || // NEW: HYSA suggestions
		quickMath(text, context, lang) ||
		dateCalculations(text, context, lang) ||
		appNavigation(text, context, lang) ||
		financialBasics(text, context, lang);

	return result;
}

/**
 * Quick math calculations for financial questions
 */
function quickMath(
	text: string,
	context?: ChatContext,
	lang: Lang = 'en'
): MicroSolverResult | null {
	// Savings timeline: "If I save 200 a month how long to reach 5000?"
	const savingsMatch = text.match(
		/save\s+\$?([\d.,]+)\s+(?:a|per)\s+month.*reach\s+\$?([\d.,]+)/
	);
	if (savingsMatch) {
		const monthly = toNumber(savingsMatch[1]);
		const target = toNumber(savingsMatch[2]);
		if (monthly && target && monthly > 0 && target > 0) {
			const months = Math.ceil(target / monthly);
			const years = Math.floor(months / 12);
			const remainingMonths = months % 12;

			let timeStr = '';
			if (years > 0) {
				timeStr = `${years} year${years > 1 ? 's' : ''}`;
				if (remainingMonths > 0) {
					timeStr += ` and ${remainingMonths} month${
						remainingMonths > 1 ? 's' : ''
					}`;
				}
			} else {
				timeStr = `${months} month${months > 1 ? 's' : ''}`;
			}

			const locale = context?.locale || 'en-US';
			const currency = context?.currency || 'USD';

			return {
				answer: `At ${formatCurrency(
					monthly,
					locale,
					currency
				)}/month, you'd reach ${formatCurrency(
					target,
					locale,
					currency
				)} in about ${timeStr}. A small buffer for unexpected expenses is wise.`,
				actions: [
					{
						label: 'Create a Goal',
						action: ActionType.OPEN_GOAL_FORM,
						params: { target, monthly },
					},
				],
				confidence: 0.95,
				matchedPattern: 'savingsTimeline',
			};
		}
	}

	// Percentage calculations: "What's 15% of 2000?" with improved parsing
	const percentCalc = parsePercentageCalculation(text);
	if (percentCalc) {
		const { percent, amount } = percentCalc;
		const result = (percent / 100) * amount;

		const locale = context?.locale || 'en-US';
		const currency = context?.currency || 'USD';

		return {
			answer: `${formatPercentage(percent)} of ${formatCurrency(
				amount,
				locale,
				currency
			)} is ${formatCurrency(result, locale, currency)}.`,
			actions: [],
			confidence: 0.95,
			matchedPattern: 'percentageCalc',
		};
	}

	// Monthly to yearly conversion: "200 a month is how much a year?"
	const monthlyToYearlyMatch = text.match(
		/(?:\$?([\d.,]+)\s+(?:a|per)\s+month.*\byear\b)|\bmonthly\b.*\byearly\b/i
	);
	if (monthlyToYearlyMatch) {
		const monthly = toNumber(monthlyToYearlyMatch[1]);
		if (monthly) {
			const yearly = monthly * 12;
			const locale = context?.locale || 'en-US';
			const currency = context?.currency || 'USD';

			return {
				answer: `${formatCurrency(
					monthly,
					locale,
					currency
				)}/month equals ${formatCurrency(yearly, locale, currency)}/year.`,
				actions: [],
				confidence: 0.9,
				matchedPattern: 'monthlyToYearly',
			};
		}
	}

	// Emergency fund calculation with context-aware expenses
	const emergencyFund = parseEmergencyFund(text);
	if (emergencyFund) {
		const { months } = emergencyFund;

		// Use context if available, otherwise default
		let monthlyExpenses = 3000; // Default
		if (context?.recurringExpenses) {
			const essentials = context.recurringExpenses
				.filter((e: any) => e.isEssential)
				.reduce((sum: number, e: any) => sum + (e.amount || 0), 0);
			if (essentials > 0) {
				monthlyExpenses = essentials;
			}
		}

		const emergencyFundAmount = months * monthlyExpenses;
		const locale = context?.locale || 'en-US';
		const currency = context?.currency || 'USD';

		return {
			answer: `For a ${months}-month emergency fund, aim for 3-6 months of essential expenses. If your monthly essentials are ${formatCurrency(
				monthlyExpenses,
				locale,
				currency
			)}, that's ${formatCurrency(
				emergencyFundAmount,
				locale,
				currency
			)}. Adjust based on your actual expenses.`,
			actions: [
				{
					label: 'Add monthly expenses',
					action: ActionType.OPEN_RECURRING_FORM,
				},
			],
			confidence: 0.9,
			matchedPattern: 'emergencyFund',
		};
	}

	return null;
}

/**
 * Date calculations for financial planning
 */
function dateCalculations(
	text: string,
	context?: ChatContext,
	lang: Lang = 'en'
): MicroSolverResult | null {
	// Days until goal: "How many days until my goal?"
	const daysUntilMatch = text.match(/how many days until|days until|when.*due/);
	if (daysUntilMatch) {
		return {
			answer:
				"I'd need to know your goal's target date to calculate the days remaining. You can set this when creating or editing a goal.",
			actions: [
				{
					label: 'Open Goals',
					action: ActionType.OPEN_GOAL_WIZARD,
				},
			],
			confidence: 0.85,
			matchedPattern: 'daysUntil',
		};
	}

	// Next payday: "When's my next payday?"
	const paydayMatch = text.match(/next payday|when.*paid|payday/);
	if (paydayMatch) {
		return {
			answer:
				"I don't track your pay schedule, but you can add your payday to get better budget timing. Most people get paid bi-weekly or monthly.",
			actions: [
				{
					label: 'Add income schedule',
					action: ActionType.OPEN_INCOME_FORM,
				},
			],
			confidence: 0.85,
			matchedPattern: 'payday',
		};
	}

	// Business days: "How many business days until..."
	const businessDaysMatch = text.match(
		/business days|weekdays|d[ií]as h[aá]biles/i
	);
	if (businessDaysMatch) {
		// Try to extract a date from the text
		const dateMatch = text.match(/\b(\d{4}-\d{2}-\d{2})\b/); // YYYY-MM-DD
		if (dateMatch) {
			const end = new Date(dateMatch[1]);
			const days = businessDaysBetween(new Date(), end);
			return {
				answer: `There are ${formatBusinessDays(
					days
				)} until ${end.toDateString()}.`,
				actions: [],
				confidence: 0.95,
				matchedPattern: 'businessDays',
			};
		}
		return {
			answer:
				"Business days exclude weekends. If you give me a date like 2025-09-30, I'll calculate it.",
			actions: [],
			confidence: 0.9,
			matchedPattern: 'businessDays',
		};
	}

	return null;
}

/**
 * App navigation and how-to questions
 */
function appNavigation(
	text: string,
	context?: ChatContext,
	lang: Lang = 'en'
): MicroSolverResult | null {
	// Mark bill as paid
	const isMarkPaid =
		lang === 'es'
			? /marcar.*(factura|suscripción|recurrente).*(pagad[oa]|hecho)/i
			: /mark.*(?:bill|recurring|subscription).*(?:paid|done)/i;

	if (isMarkPaid.test(text)) {
		return {
			answer:
				lang === 'es'
					? 'Ve a Gastos Recurrentes → ' +
					  copy.es.markAsPaid +
					  ' Esto mantiene tu gasto del mes actualizado.'
					: 'Open Recurring Expenses → ' +
					  copy.en.markAsPaid +
					  ' This keeps your month-to-date spending accurate.',
			actions: [
				{
					label: lang === 'es' ? copy.es.openRecurring : copy.en.openRecurring,
					action: ActionType.OPEN_RECURRING_TAB,
				},
			],
			confidence: 0.9,
			matchedPattern: 'markPaid',
		};
	}

	// Create budget
	if (/create.*budget|make.*budget|new.*budget/.test(text)) {
		return {
			answer:
				'Go to Budgets → tap the + button → choose your category and amount. Start with your biggest expenses like rent and groceries.',
			actions: [
				{
					label: 'Create Budget',
					action: ActionType.OPEN_BUDGET_FORM,
				},
			],
			confidence: 0.9,
			matchedPattern: 'createBudget',
		};
	}

	// Add goal
	if (/create.*goal|add.*goal|new.*goal|saving.*goal/.test(text)) {
		return {
			answer:
				"Go to Goals → tap the + button → set your target amount and date. I'll help you figure out how much to save monthly.",
			actions: [
				{
					label: 'Create Goal',
					action: ActionType.OPEN_GOAL_FORM,
				},
			],
			confidence: 0.9,
			matchedPattern: 'addGoal',
		};
	}

	// Edit budget
	if (/edit.*budget|change.*budget|update.*budget/.test(text)) {
		return {
			answer:
				'Go to Budgets → tap on any budget → adjust the amount or category. Changes take effect immediately.',
			actions: [
				{
					label: 'Open Budgets',
					action: ActionType.OPEN_BUDGETS,
				},
			],
			confidence: 0.9,
			matchedPattern: 'editBudget',
		};
	}

	// Link bank account
	if (/link.*bank|connect.*bank|add.*account/.test(text)) {
		return {
			answer:
				"Bank linking is coming soon! For now, you can manually add transactions and I'll help you track everything.",
			actions: [
				{
					label: 'Add Transaction',
					action: ActionType.OPEN_TRANSACTION_FORM,
				},
			],
			confidence: 0.85,
			matchedPattern: 'linkBank',
		};
	}

	// Categorize transaction
	if (/categorize|categorize.*transaction|what.*category/.test(text)) {
		return {
			answer:
				"Go to Transactions → tap on any transaction → select a category. I'll learn your patterns and suggest categories automatically.",
			actions: [
				{
					label: 'Open Transactions',
					action: ActionType.OPEN_TRANSACTIONS_TAB,
				},
			],
			confidence: 0.9,
			matchedPattern: 'categorize',
		};
	}

	return null;
}

/**
 * Financial basics and definitions
 */
function financialBasics(
	text: string,
	context?: ChatContext,
	lang: Lang = 'en'
): MicroSolverResult | null {
	// Investing starter (educational, not advice) - but not for HYSA queries
	if (
		/\b(invest|investing|stocks?|etfs?|index\s+funds?)\b/i.test(text) &&
		!/\b(high[-\s]?yield\s+savings|hysa|banks?|accounts?)\b/i.test(text)
	) {
		return {
			answer:
				lang === 'es'
					? `Orden inicial (educativo, no consejo):
1) Construir un colchón de efectivo (1-3 meses de gastos esenciales).
2) Pagar primero las deudas de alto interés (≈8-10%+ APR).
3) Capturar cualquier coincidencia del empleador (401(k)/403(b)).
4) Comenzar con fondos índice/ETFs amplios y de baja comisión; automatizar contribuciones mensuales (DCA).
5) Elegir una asignación que puedas mantener (ej., más bonos cuando las metas se acerquen).`
					: `Starter order (educational, not advice):
1) Build a cash buffer (1–3 months of essentials).
2) Clear high-interest debt first (≈8–10%+ APR).
3) Capture any employer match (401(k)/403(b)).
4) Start with broad, low-fee index funds/ETFs; automate monthly contributions (DCA).
5) Pick an allocation you can stick with (e.g., more bonds as goals get closer).`,
			actions: [
				{
					label:
						lang === 'es'
							? 'Crear Meta de Fondo de Emergencia'
							: 'Create Emergency Fund Goal',
					action: ActionType.OPEN_GOAL_FORM,
					params: { type: 'emergency_fund' },
				},
				{
					label: lang === 'es' ? 'Abrir Metas' : 'Open Goals',
					action: ActionType.OPEN_GOAL_WIZARD,
				},
			],
			confidence: 0.9,
			matchedPattern: 'investing_starter',
		};
	}

	// 50/30/20 rule
	const is503020 =
		lang === 'es'
			? /50.*30.*20|necesidades.*deseos.*ahorros|regla.*gastos/i
			: /50.*30.*20|needs.*wants.*savings|spending.*rule/i;

	if (is503020.test(text)) {
		return {
			answer:
				lang === 'es'
					? 'La regla 50/30/20: 50% para necesidades (renta, comida, facturas), 30% para deseos (entretenimiento, restaurantes), 20% para ahorros y pago de deudas. Es una plantilla inicial—ajusta según tu situación.'
					: "The 50/30/20 rule: 50% for needs (rent, groceries, bills), 30% for wants (entertainment, dining), 20% for savings and debt payoff. It's a starting template—adjust based on your situation.",
			actions: [
				{
					label:
						lang === 'es'
							? 'Crear Presupuesto desde Regla'
							: 'Create Budget from Rule',
					action: ActionType.CREATE_50_30_20_BUDGET,
				},
			],
			confidence: 0.9,
			matchedPattern: '50_30_20',
		};
	}

	// Emergency fund
	if (/emergency.*fund|rainy.*day|emergency.*savings/.test(text)) {
		return {
			answer:
				'Emergency fund: 3-6 months of essential expenses. Start with 1 month if cash is tight. Keep it in a high-yield savings account, not invested.',
			actions: [
				{
					label: 'Create Emergency Fund Goal',
					action: ActionType.OPEN_GOAL_FORM,
					params: { type: 'emergency_fund' },
				},
			],
			confidence: 0.9,
			matchedPattern: 'emergencyFund',
		};
	}

	// APR vs APY
	if (/apr.*apy|interest.*rate|apy.*apr/.test(text)) {
		return {
			answer:
				"APR = Annual Percentage Rate (what you pay on loans). APY = Annual Percentage Yield (what you earn on savings). APY includes compound interest, so it's higher than APR for the same rate.",
			actions: [],
			confidence: 0.9,
			matchedPattern: 'apr_apy',
		};
	}

	// Snowball vs avalanche
	if (/snowball.*avalanche|debt.*payoff|pay.*debt/.test(text)) {
		return {
			answer:
				'Snowball method: pay smallest debt first (motivation). Avalanche method: pay highest APR first (saves money). Avalanche is mathematically better, but snowball works if you need motivation.',
			actions: [],
			confidence: 0.9,
			matchedPattern: 'debt_payoff',
		};
	}

	// Compound interest
	if (/compound.*interest|interest.*compound/.test(text)) {
		return {
			answer:
				'Compound interest = earning interest on your interest. The longer you save, the more powerful it becomes. Start early, even with small amounts.',
			actions: [
				{
					label: 'Calculate Compound Interest',
					action: ActionType.OPEN_COMPOUND_CALCULATOR,
				},
			],
			confidence: 0.9,
			matchedPattern: 'compoundInterest',
		};
	}

	return null;
}

/**
 * Check if a question is suitable for micro-solving
 */
export function isSimpleQuestion(
	question: string,
	detectedIntent?: string
): boolean {
	const text = question.toLowerCase();

	// Quick patterns that suggest simple questions
	const simplePatterns = [
		/^what'?s?\s+/, // "What's the 50/30/20 rule?"
		/^how\s+do\s+i\s+/, // "How do I mark a bill paid?"
		/^how\s+much\s+/, // "How much should I save?"
		/^when'?s?\s+/, // "When's my next payday?"
		/^if\s+i\s+save/, // "If I save 200 a month..."
		/^explain\s+/, // "Explain compound interest"
		/^what\s+does\s+/, // "What does APR mean?"
		/^where\s+should\s+i\s+/, // "Where should I invest my money?"
	];

	// Check if it matches simple patterns
	const matchesSimplePattern = simplePatterns.some((pattern) =>
		pattern.test(text)
	);

	// Check if it's a general QA intent
	const isGeneralQA = detectedIntent === 'GENERAL_QA';

	// Check if it's a how-to question
	const isHowTo = /how\s+to|how\s+do\s+i|how\s+can\s+i/.test(text);

	// Check if it's a definition question
	const isDefinition = /what'?s?\s+.*mean|what\s+does|explain|define/.test(
		text
	);

	// Check if it's app navigation
	const isAppNav =
		/mark.*paid|create.*budget|add.*goal|edit.*budget|link.*bank|categorize/.test(
			text
		);

	// Check if it's an investing question
	const isInvestingAsk =
		/\b(invest|investing|stocks?|etfs?|index\s+funds?)\b/i.test(text);

	// Check if it's a monthly contribution question
	const isMonthlyContrib =
		/\b(how\s+much\s+(should|to)\s+(i\s+)?(put|save|contribute)\b.*(monthly|per\s*month))\b/i.test(
			text
		);

	// Check if it's a HYSA question
	const isHYSA = /\b(high[-\s]?yield\s+savings|hysa)\b/i.test(text);
	const asksPicks = /\b(best|which|recommend|suggest|top)\b/i.test(text);

	// If it's HYSA and asks for picks, let the research agent handle it
	if (isHYSA && asksPicks) {
		return false; // Don't use simple QA, use research agent
	}

	return (
		matchesSimplePattern ||
		isGeneralQA ||
		isHowTo ||
		isDefinition ||
		isAppNav ||
		isInvestingAsk ||
		isMonthlyContrib ||
		isHYSA
	);
}
