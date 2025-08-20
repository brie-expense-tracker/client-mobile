import AsyncStorage from '@react-native-async-storage/async-storage';

export interface TransactionFeatures {
	description: string;
	amount: number;
	vendor: string;
	dayOfWeek: number;
	dayOfMonth: number;
	month: number;
	isWeekend: boolean;
	amountCategory: 'low' | 'medium' | 'high';
	descriptionLength: number;
	hasNumbers: boolean;
	commonKeywords: string[];
}

export interface CategorizationResult {
	category: string;
	confidence: number;
	reason: string;
	budgetMatch?: string;
	vendorPattern?: string;
}

export interface SpendingPattern {
	category: string;
	averageAmount: number;
	frequency: number;
	dayOfWeekPreference: number[];
	amountRange: { min: number; max: number };
	seasonalTrend: 'stable' | 'increasing' | 'decreasing';
}

export class LocalMLService {
	private static instance: LocalMLService;
	private vendorPatterns = new Map<string, Map<string, number>>();
	private categoryPatterns = new Map<string, SpendingPattern>();
	private userPreferences = new Map<string, any>();
	private readonly MIN_CONFIDENCE = 0.6;
	private readonly MIN_SAMPLES = 5;

	static getInstance(): LocalMLService {
		if (!LocalMLService.instance) {
			LocalMLService.instance = new LocalMLService();
		}
		return LocalMLService.instance;
	}

	/**
	 * Initialize local ML models
	 */
	async initialize(): Promise<void> {
		try {
			console.log('[LocalMLService] Starting local ML initialization...');

			// Add timeout protection for storage operations
			const storageTimeout = new Promise((_, reject) => {
				setTimeout(() => reject(new Error('Storage operation timeout')), 5000);
			});

			const initPromise = this.loadModelsFromStorage();

			await Promise.race([initPromise, storageTimeout]);

			console.log('[LocalMLService] Local ML models initialized successfully');
		} catch (error) {
			console.error('[LocalMLService] Error initializing models:', error);
			// Don't throw - allow service to continue with empty models
			this.vendorPatterns = new Map();
			this.categoryPatterns = new Map();
		}
	}

	/**
	 * Categorize transaction using local ML
	 */
	async categorizeTransaction(
		description: string,
		amount: number,
		userId: string,
		userBudgets: any[]
	): Promise<CategorizationResult> {
		try {
			// Extract features from transaction
			const features = this.extractFeatures(description, amount);

			// Get vendor-based prediction
			const vendorPrediction = this.predictFromVendor(features.vendor, userId);

			// Get amount-based prediction
			const amountPrediction = this.predictFromAmount(amount, userId);

			// Get pattern-based prediction
			const patternPrediction = this.predictFromPatterns(features, userId);

			// Combine predictions using ensemble method
			const finalPrediction = this.combinePredictions([
				vendorPrediction,
				amountPrediction,
				patternPrediction,
			]);

			// Find best budget match
			const budgetMatch = this.findBestBudgetMatch(
				finalPrediction.category,
				userBudgets
			);

			return {
				category: finalPrediction.category,
				confidence: finalPrediction.confidence,
				reason: finalPrediction.reason,
				budgetMatch: budgetMatch?.name,
				vendorPattern: vendorPrediction.vendorPattern,
			};
		} catch (error) {
			console.error('[LocalMLService] Error categorizing transaction:', error);
			return {
				category: 'Uncategorized',
				confidence: 0,
				reason: 'Error in local ML processing',
			};
		}
	}

	/**
	 * Learn from user feedback to improve predictions
	 */
	async learnFromFeedback(
		transactionId: string,
		originalPrediction: CategorizationResult,
		correctCategory: string,
		userId: string
	): Promise<void> {
		try {
			// Update vendor patterns
			this.updateVendorPattern(
				userId,
				originalPrediction.vendorPattern || '',
				correctCategory
			);

			// Update category patterns
			this.updateCategoryPattern(userId, correctCategory, originalPrediction);

			// Persist updated models
			await this.persistModelsToStorage();

			console.log(
				`[LocalMLService] Learned from feedback: ${originalPrediction.category} → ${correctCategory}`
			);
		} catch (error) {
			console.error('[LocalMLService] Error learning from feedback:', error);
		}
	}

	/**
	 * Analyze spending patterns for insights
	 */
	async analyzeSpendingPatterns(
		transactions: any[],
		userId: string
	): Promise<SpendingPattern[]> {
		try {
			const patterns: SpendingPattern[] = [];
			const categoryGroups = this.groupTransactionsByCategory(transactions);

			for (const [category, categoryTransactions] of categoryGroups.entries()) {
				const pattern = this.calculateCategoryPattern(categoryTransactions);
				patterns.push(pattern);

				// Update global patterns
				this.categoryPatterns.set(category, pattern);
			}

			// Persist updated patterns
			await this.persistModelsToStorage();

			return patterns;
		} catch (error) {
			console.error(
				'[LocalMLService] Error analyzing spending patterns:',
				error
			);
			return [];
		}
	}

	/**
	 * Get ML model performance metrics
	 */
	getModelMetrics(): {
		totalVendorPatterns: number;
		totalCategoryPatterns: number;
		averageConfidence: number;
		learningProgress: number;
	} {
		try {
			const totalVendorPatterns = this.vendorPatterns.size;
			const totalCategoryPatterns = this.categoryPatterns.size;

			// Calculate average confidence (placeholder for now)
			const averageConfidence = 0.75;

			// Calculate learning progress based on pattern diversity
			const learningProgress = Math.min(
				(totalVendorPatterns + totalCategoryPatterns) / 100,
				1.0
			);

			return {
				totalVendorPatterns,
				totalCategoryPatterns,
				averageConfidence,
				learningProgress,
			};
		} catch (error) {
			console.error('[LocalMLService] Error getting model metrics:', error);
			// Return safe defaults
			return {
				totalVendorPatterns: 0,
				totalCategoryPatterns: 0,
				averageConfidence: 0.5,
				learningProgress: 0,
			};
		}
	}

	// Private helper methods

	private extractFeatures(
		description: string,
		amount: number
	): TransactionFeatures {
		const vendor = this.extractVendor(description);
		const date = new Date();

		return {
			description,
			amount,
			vendor,
			dayOfWeek: date.getDay(),
			dayOfMonth: date.getDate(),
			month: date.getMonth(),
			isWeekend: date.getDay() === 0 || date.getDay() === 6,
			amountCategory: this.categorizeAmount(amount),
			descriptionLength: description.length,
			hasNumbers: /\d/.test(description),
			commonKeywords: this.extractKeywords(description),
		};
	}

	private extractVendor(description: string): string {
		// Common patterns for vendor extraction
		const patterns = [
			/^([A-Z\s]+)\s*/, // All caps at start
			/^([A-Za-z\s]+?)\s*[-*]/i, // Text before dash or asterisk
			/^([A-Za-z\s]+?)\s*\d/, // Text before numbers
			/^([A-Za-z\s]+?)\s*$/, // Just text
		];

		for (const pattern of patterns) {
			const match = description.match(pattern);
			if (match && match[1].trim().length > 2) {
				return match[1].trim();
			}
		}

		return description.split(' ')[0];
	}

	private categorizeAmount(amount: number): 'low' | 'medium' | 'high' {
		if (amount < 25) return 'low';
		if (amount < 100) return 'medium';
		return 'high';
	}

	private extractKeywords(description: string): string[] {
		const commonKeywords = [
			'grocery',
			'food',
			'restaurant',
			'gas',
			'fuel',
			'transport',
			'uber',
			'lyft',
			'amazon',
			'walmart',
			'target',
			'coffee',
			'starbucks',
			'netflix',
			'spotify',
			'phone',
			'internet',
			'utility',
			'rent',
			'mortgage',
			'insurance',
			'medical',
		];

		const lowerDesc = description.toLowerCase();
		return commonKeywords.filter((keyword) => lowerDesc.includes(keyword));
	}

	private predictFromVendor(
		vendor: string,
		userId: string
	): {
		category: string;
		confidence: number;
		reason: string;
		vendorPattern: string;
	} {
		const userPatterns = this.vendorPatterns.get(userId);
		if (!userPatterns || !userPatterns.has(vendor)) {
			return {
				category: 'Uncategorized',
				confidence: 0.3,
				reason: 'New vendor, no patterns yet',
				vendorPattern: vendor,
			};
		}

		const vendorData = userPatterns.get(vendor)!;
		const categories = Object.entries(vendorData);
		const sortedCategories = categories.sort((a, b) => b[1] - a[1]);

		if (sortedCategories.length === 0) {
			return {
				category: 'Uncategorized',
				confidence: 0.3,
				reason: 'No category data for vendor',
				vendorPattern: vendor,
			};
		}

		const [topCategory, frequency] = sortedCategories[0];
		const totalTransactions = Object.values(vendorData).reduce(
			(sum, val) => sum + val,
			0
		);
		const confidence = Math.min(frequency / totalTransactions, 0.95);

		return {
			category: topCategory,
			confidence,
			reason: `Based on ${frequency} previous transactions from this vendor`,
			vendorPattern: vendor,
		};
	}

	private predictFromAmount(
		amount: number,
		userId: string
	): {
		category: string;
		confidence: number;
		reason: string;
	} {
		// Simple amount-based heuristics
		if (amount < 10) {
			return {
				category: 'Food & Dining',
				confidence: 0.4,
				reason: 'Low amount suggests food/coffee purchase',
			};
		} else if (amount > 200) {
			return {
				category: 'Shopping',
				confidence: 0.3,
				reason: 'High amount suggests major purchase',
			};
		}

		return {
			category: 'Uncategorized',
			confidence: 0.2,
			reason: 'Amount alone insufficient for categorization',
		};
	}

	private predictFromPatterns(
		features: TransactionFeatures,
		userId: string
	): {
		category: string;
		confidence: number;
		reason: string;
	} {
		// Pattern-based prediction using day/time and amount patterns
		let category = 'Uncategorized';
		let confidence = 0.2;
		let reason = 'Pattern analysis inconclusive';

		// Weekend spending patterns
		if (features.isWeekend && features.amount > 50) {
			category = 'Entertainment';
			confidence = 0.5;
			reason = 'Weekend high-amount spending suggests entertainment';
		}

		// Grocery patterns (typically weekdays, medium amounts)
		if (
			!features.isWeekend &&
			features.amountCategory === 'medium' &&
			features.description.toLowerCase().includes('grocery')
		) {
			category = 'Food & Dining';
			confidence = 0.6;
			reason = 'Weekday medium amount with grocery keyword';
		}

		// Coffee patterns (low amounts, early in day)
		if (features.amount < 10 && features.dayOfMonth < 15) {
			category = 'Food & Dining';
			confidence = 0.4;
			reason = 'Low amount early in month suggests coffee/food';
		}

		return { category, confidence, reason };
	}

	private combinePredictions(
		predictions: Array<{
			category: string;
			confidence: number;
			reason: string;
		}>
	): {
		category: string;
		confidence: number;
		reason: string;
	} {
		// Simple ensemble method: weighted average by confidence
		const categoryScores = new Map<
			string,
			{ totalScore: number; count: number; reasons: string[] }
		>();

		predictions.forEach((pred) => {
			if (!categoryScores.has(pred.category)) {
				categoryScores.set(pred.category, {
					totalScore: 0,
					count: 0,
					reasons: [],
				});
			}

			const score = categoryScores.get(pred.category)!;
			score.totalScore += pred.confidence;
			score.count += 1;
			score.reasons.push(pred.reason);
		});

		// Find category with highest average confidence
		let bestCategory = 'Uncategorized';
		let bestConfidence = 0;
		let bestReasons: string[] = [];

		for (const [category, score] of categoryScores.entries()) {
			const avgConfidence = score.totalScore / score.count;
			if (avgConfidence > bestConfidence) {
				bestCategory = category;
				bestConfidence = avgConfidence;
				bestReasons = score.reasons;
			}
		}

		return {
			category: bestCategory,
			confidence: Math.min(bestConfidence, 0.95),
			reason: bestReasons.join('; '),
		};
	}

	private findBestBudgetMatch(
		category: string,
		userBudgets: any[]
	): any | null {
		// Simple keyword matching for budget categories
		const categoryLower = category.toLowerCase();

		return (
			userBudgets.find((budget) => {
				const budgetName = budget.name.toLowerCase();
				return (
					budgetName.includes(categoryLower) ||
					categoryLower.includes(budgetName)
				);
			}) || null
		);
	}

	private updateVendorPattern(
		userId: string,
		vendor: string,
		category: string
	): void {
		if (!this.vendorPatterns.has(userId)) {
			this.vendorPatterns.set(userId, new Map());
		}

		const userPatterns = this.vendorPatterns.get(userId)!;
		if (!userPatterns.has(vendor)) {
			userPatterns.set(vendor, {});
		}

		const vendorData = userPatterns.get(vendor)!;
		vendorData[category] = (vendorData[category] || 0) + 1;
	}

	private updateCategoryPattern(
		userId: string,
		category: string,
		prediction: CategorizationResult
	): void {
		// Update category patterns based on prediction accuracy
		if (!this.categoryPatterns.has(category)) {
			this.categoryPatterns.set(category, {
				category,
				averageAmount: 0,
				frequency: 0,
				dayOfWeekPreference: new Array(7).fill(0),
				amountRange: { min: 0, max: 0 },
				seasonalTrend: 'stable',
			});
		}
	}

	private groupTransactionsByCategory(transactions: any[]): Map<string, any[]> {
		const groups = new Map<string, any[]>();

		transactions.forEach((transaction) => {
			const category = transaction.category || 'Uncategorized';
			if (!groups.has(category)) {
				groups.set(category, []);
			}
			groups.get(category)!.push(transaction);
		});

		return groups;
	}

	private calculateCategoryPattern(transactions: any[]): SpendingPattern {
		if (transactions.length === 0) {
			return {
				category: 'Unknown',
				averageAmount: 0,
				frequency: 0,
				dayOfWeekPreference: new Array(7).fill(0),
				amountRange: { min: 0, max: 0 },
				seasonalTrend: 'stable',
			};
		}

		const amounts = transactions.map((t) => t.amount);
		const averageAmount =
			amounts.reduce((sum, amount) => sum + amount, 0) / amounts.length;

		const dayOfWeekPreference = new Array(7).fill(0);
		transactions.forEach((t) => {
			const day = new Date(t.date).getDay();
			dayOfWeekPreference[day]++;
		});

		return {
			category: transactions[0].category || 'Unknown',
			averageAmount,
			frequency: transactions.length,
			dayOfWeekPreference,
			amountRange: {
				min: Math.min(...amounts),
				max: Math.max(...amounts),
			},
			seasonalTrend: 'stable', // Simplified for now
		};
	}

	private async loadModelsFromStorage(): Promise<void> {
		try {
			console.log('[LocalMLService] Loading models from storage...');
			const [vendorData, categoryData] = await Promise.all([
				AsyncStorage.getItem('vendor_patterns'),
				AsyncStorage.getItem('category_patterns'),
			]);

			if (vendorData) {
				const parsed = JSON.parse(vendorData);
				// Convert back to nested Maps
				for (const [userId, userData] of Object.entries(parsed)) {
					this.vendorPatterns.set(userId, new Map(Object.entries(userData)));
				}
				console.log(
					`[LocalMLService] Loaded vendor patterns for ${this.vendorPatterns.size} users`
				);
			} else {
				console.log('[LocalMLService] No vendor patterns found');
			}

			if (categoryData) {
				const parsed = JSON.parse(categoryData);
				this.categoryPatterns = new Map(Object.entries(parsed));
				console.log(
					`[LocalMLService] Loaded ${this.categoryPatterns.size} category patterns`
				);
			} else {
				console.log('[LocalMLService] No category patterns found');
			}
		} catch (error) {
			console.error(
				'[LocalMLService] Error loading models from storage:',
				error
			);
			// Continue with empty models
			this.vendorPatterns = new Map();
			this.categoryPatterns = new Map();
		}
	}

	private async persistModelsToStorage(): Promise<void> {
		try {
			// Convert Maps to objects for storage
			const vendorObj = Object.fromEntries(
				Array.from(this.vendorPatterns.entries()).map(([userId, userData]) => [
					userId,
					Object.fromEntries(userData),
				])
			);

			const categoryObj = Object.fromEntries(this.categoryPatterns);

			await Promise.all([
				AsyncStorage.setItem('vendor_patterns', JSON.stringify(vendorObj)),
				AsyncStorage.setItem('category_patterns', JSON.stringify(categoryObj)),
			]);
		} catch (error) {
			console.error(
				'[LocalMLService] Error persisting models to storage:',
				error
			);
		}
	}
}

export default LocalMLService;
