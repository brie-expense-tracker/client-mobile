import AsyncStorage from '@react-native-async-storage/async-storage';
import { logger } from '../../utils/logger';


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
	confidence: number;
	lastUpdated: number;
}

export interface ModelMetrics {
	totalVendorPatterns: number;
	totalCategoryPatterns: number;
	averageConfidence: number;
	learningProgress: number;
	accuracy: number;
	lastTrainingTime: number;
	modelVersion: string;
}

export interface PredictionResult {
	category: string;
	confidence: number;
	reason: string;
	budgetMatch?: string;
	vendorPattern?: string;
	features: TransactionFeatures;
	modelVersion: string;
	timestamp: number;
}

export interface TrainingData {
	transactions: any[];
	userId: string;
	validationSplit: number;
}

export class LocalMLService {
	private static instance: LocalMLService;
	private vendorPatterns = new Map<
		string,
		Map<string, Record<string, number>>
	>();
	private categoryPatterns = new Map<string, SpendingPattern>();
	private userPreferences = new Map<string, any>();
	private readonly MIN_CONFIDENCE = 0.6;
	private readonly MIN_SAMPLES = 5;
	private readonly MODEL_VERSION = '1.0.0';

	// Performance tracking
	private predictionCount = 0;
	private correctPredictions = 0;
	private lastTrainingTime = 0;
	private modelAccuracy = 0;

	// Feature extraction cache
	private featureCache = new Map<string, TransactionFeatures>();
	private readonly CACHE_SIZE_LIMIT = 1000;

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
			logger.debug('[LocalMLService] Starting local ML initialization...');

			// Add timeout protection for storage operations
			const storageTimeout = new Promise((_, reject) => {
				setTimeout(() => reject(new Error('Storage operation timeout')), 5000);
			});

			const initPromise = this.loadModelsFromStorage();

			await Promise.race([initPromise, storageTimeout]);

			logger.debug('[LocalMLService] Local ML models initialized successfully');
		} catch (error) {
			logger.error('[LocalMLService] Error initializing models:', error);
			// Don't throw - allow service to continue with empty models
			this.vendorPatterns = new Map();
			this.categoryPatterns = new Map();
		}
	}

	/**
	 * Categorize transaction using local ML with enhanced features
	 */
	async categorizeTransaction(
		description: string,
		amount: number,
		userId: string,
		userBudgets: any[]
	): Promise<CategorizationResult> {
		const startTime = Date.now();
		this.predictionCount++;

		try {
			// Validate inputs
			this.validateTransactionInputs(description, amount, userId);

			// Extract features from transaction (with caching)
			const features = this.extractFeaturesWithCache(description, amount);

			// Get vendor-based prediction
			const vendorPrediction = this.predictFromVendor(features.vendor, userId);

			// Get amount-based prediction
			const amountPrediction = this.predictFromAmount(amount, userId);

			// Get pattern-based prediction
			const patternPrediction = this.predictFromPatterns(features, userId);

			// Get keyword-based prediction
			const keywordPrediction = this.predictFromKeywords(features, userId);

			// Get time-based prediction
			const timePrediction = this.predictFromTime(features, userId);

			// Combine predictions using enhanced ensemble method
			const finalPrediction = this.combinePredictions([
				vendorPrediction,
				amountPrediction,
				patternPrediction,
				keywordPrediction,
				timePrediction,
			]);

			// Find best budget match
			const budgetMatch = this.findBestBudgetMatch(
				finalPrediction.category,
				userBudgets
			);

			// Calculate processing time
			const processingTime = Date.now() - startTime;

			const result: CategorizationResult = {
				category: finalPrediction.category,
				confidence: finalPrediction.confidence,
				reason: finalPrediction.reason,
				budgetMatch: budgetMatch?.name,
				vendorPattern: vendorPrediction.vendorPattern,
			};

			// Log performance metrics
			if (processingTime > 100) {
				logger.warn(`[LocalMLService] Slow prediction: ${processingTime}ms`);
			}

			return result;
		} catch (error) {
			logger.error('[LocalMLService] Error categorizing transaction:', error);
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
			// Track accuracy
			if (originalPrediction.category === correctCategory) {
				this.correctPredictions++;
			}

			// Update vendor patterns
			this.updateVendorPattern(
				userId,
				originalPrediction.vendorPattern || '',
				correctCategory
			);

			// Update category patterns
			this.updateCategoryPattern(userId, correctCategory, originalPrediction);

			// Update model accuracy
			this.modelAccuracy = this.correctPredictions / this.predictionCount;

			// Persist updated models
			await this.persistModelsToStorage();

			logger.debug(
				`[LocalMLService] Learned from feedback: ${
					originalPrediction.category
				} → ${correctCategory} (Accuracy: ${(this.modelAccuracy * 100).toFixed(
					1
				)}%)`
			);
		} catch (error) {
			logger.error('[LocalMLService] Error learning from feedback:', error);
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
			logger.error(
				'[LocalMLService] Error analyzing spending patterns:',
				error
			);
			return [];
		}
	}

	/**
	 * Check if we have learned patterns for a specific vendor
	 */
	hasVendorPattern(vendor: string): boolean {
		// Check if any user has patterns for this vendor
		for (const userPatterns of this.vendorPatterns.values()) {
			if (userPatterns.has(vendor.toLowerCase())) {
				return true;
			}
		}
		return false;
	}

	/**
	 * Get comprehensive ML model performance metrics
	 */
	getModelMetrics(): ModelMetrics {
		try {
			const totalVendorPatterns = Array.from(
				this.vendorPatterns.values()
			).reduce((sum, userPatterns) => sum + userPatterns.size, 0);
			const totalCategoryPatterns = this.categoryPatterns.size;

			// Calculate accuracy based on feedback
			const accuracy =
				this.predictionCount > 0
					? this.correctPredictions / this.predictionCount
					: 0;

			// Calculate average confidence from recent patterns
			const averageConfidence = this.calculateAverageConfidence();

			// Calculate learning progress based on pattern diversity and accuracy
			const learningProgress = Math.min(
				(totalVendorPatterns + totalCategoryPatterns) / 200 + accuracy * 0.5,
				1.0
			);

			return {
				totalVendorPatterns,
				totalCategoryPatterns,
				averageConfidence,
				learningProgress,
				accuracy,
				lastTrainingTime: this.lastTrainingTime,
				modelVersion: this.MODEL_VERSION,
			};
		} catch (error) {
			logger.error('[LocalMLService] Error getting model metrics:', error);
			// Return safe defaults
			return {
				totalVendorPatterns: 0,
				totalCategoryPatterns: 0,
				averageConfidence: 0.5,
				learningProgress: 0,
				accuracy: 0,
				lastTrainingTime: 0,
				modelVersion: this.MODEL_VERSION,
			};
		}
	}

	/**
	 * Train model with new data
	 */
	async trainModel(trainingData: TrainingData): Promise<void> {
		try {
			logger.debug(
				`[LocalMLService] Training model with ${trainingData.transactions.length} transactions`
			);

			const startTime = Date.now();

			// Process training data
			for (const transaction of trainingData.transactions) {
				if (
					transaction.category &&
					transaction.description &&
					transaction.amount
				) {
					const features = this.extractFeatures(
						transaction.description,
						transaction.amount
					);

					// Update vendor patterns
					this.updateVendorPattern(
						trainingData.userId,
						features.vendor,
						transaction.category
					);

					// Update category patterns
					this.updateCategoryPatternFromTransaction(
						trainingData.userId,
						transaction.category,
						transaction
					);
				}
			}

			// Persist updated models
			await this.persistModelsToStorage();

			this.lastTrainingTime = Date.now();
			const trainingTime = this.lastTrainingTime - startTime;

			logger.debug(
				`[LocalMLService] Model training completed in ${trainingTime}ms`
			);
		} catch (error) {
			logger.error('[LocalMLService] Error training model:', error);
			throw error;
		}
	}

	/**
	 * Validate model integrity
	 */
	async validateModel(): Promise<{ isValid: boolean; issues: string[] }> {
		const issues: string[] = [];

		try {
			// Check vendor patterns integrity
			for (const [userId, userPatterns] of this.vendorPatterns.entries()) {
				for (const [vendor, categories] of userPatterns.entries()) {
					if (!categories || typeof categories !== 'object') {
						issues.push(
							`Invalid vendor pattern for user ${userId}, vendor ${vendor}`
						);
					}
				}
			}

			// Check category patterns integrity
			for (const [category, pattern] of this.categoryPatterns.entries()) {
				if (!pattern.category || pattern.averageAmount < 0) {
					issues.push(`Invalid category pattern for ${category}`);
				}
			}

			// Check feature cache size
			if (this.featureCache.size > this.CACHE_SIZE_LIMIT) {
				issues.push(`Feature cache exceeds limit: ${this.featureCache.size}`);
			}

			return {
				isValid: issues.length === 0,
				issues,
			};
		} catch (error) {
			logger.error('[LocalMLService] Error validating model:', error);
			return {
				isValid: false,
				issues: ['Model validation failed: ' + error],
			};
		}
	}

	/**
	 * Reset model to initial state
	 */
	async resetModel(): Promise<void> {
		try {
			this.vendorPatterns.clear();
			this.categoryPatterns.clear();
			this.userPreferences.clear();
			this.featureCache.clear();
			this.predictionCount = 0;
			this.correctPredictions = 0;
			this.modelAccuracy = 0;
			this.lastTrainingTime = 0;

			// Clear storage
			await Promise.all([
				AsyncStorage.removeItem('vendor_patterns'),
				AsyncStorage.removeItem('category_patterns'),
			]);

			logger.debug('[LocalMLService] Model reset completed');
		} catch (error) {
			logger.error('[LocalMLService] Error resetting model:', error);
			throw error;
		}
	}

	// Private helper methods

	private validateTransactionInputs(
		description: string,
		amount: number,
		userId: string
	): void {
		if (
			!description ||
			typeof description !== 'string' ||
			description.trim().length === 0
		) {
			throw new Error('Valid description is required');
		}
		if (typeof amount !== 'number' || amount < 0) {
			throw new Error('Valid amount is required');
		}
		if (!userId || typeof userId !== 'string') {
			throw new Error('Valid userId is required');
		}
	}

	private extractFeaturesWithCache(
		description: string,
		amount: number
	): TransactionFeatures {
		const cacheKey = `${description}_${amount}`;

		const cached = this.featureCache.get(cacheKey);
		if (cached) {
			return cached;
		}

		const features = this.extractFeatures(description, amount);

		// Cache the features (with size limit)
		if (this.featureCache.size >= this.CACHE_SIZE_LIMIT) {
			const firstKey = this.featureCache.keys().next().value;
			if (firstKey) {
				this.featureCache.delete(firstKey);
			}
		}
		this.featureCache.set(cacheKey, features);

		return features;
	}

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

	private predictFromKeywords(
		features: TransactionFeatures,
		userId: string
	): {
		category: string;
		confidence: number;
		reason: string;
	} {
		const keywords = features.commonKeywords;
		let category = 'Uncategorized';
		let confidence = 0.2;
		let reason = 'No keyword matches found';

		// Enhanced keyword matching with confidence scoring
		const keywordCategories: Record<
			string,
			{ category: string; confidence: number }
		> = {
			grocery: { category: 'Food & Dining', confidence: 0.8 },
			food: { category: 'Food & Dining', confidence: 0.7 },
			restaurant: { category: 'Food & Dining', confidence: 0.9 },
			gas: { category: 'Transportation', confidence: 0.8 },
			fuel: { category: 'Transportation', confidence: 0.8 },
			uber: { category: 'Transportation', confidence: 0.9 },
			lyft: { category: 'Transportation', confidence: 0.9 },
			amazon: { category: 'Shopping', confidence: 0.7 },
			walmart: { category: 'Shopping', confidence: 0.8 },
			target: { category: 'Shopping', confidence: 0.8 },
			coffee: { category: 'Food & Dining', confidence: 0.6 },
			starbucks: { category: 'Food & Dining', confidence: 0.9 },
			netflix: { category: 'Entertainment', confidence: 0.9 },
			spotify: { category: 'Entertainment', confidence: 0.9 },
			phone: { category: 'Utilities', confidence: 0.7 },
			internet: { category: 'Utilities', confidence: 0.8 },
			utility: { category: 'Utilities', confidence: 0.8 },
			rent: { category: 'Housing', confidence: 0.9 },
			mortgage: { category: 'Housing', confidence: 0.9 },
			insurance: { category: 'Insurance', confidence: 0.8 },
			medical: { category: 'Healthcare', confidence: 0.8 },
		};

		// Find best keyword match
		for (const keyword of keywords) {
			if (keywordCategories[keyword]) {
				const match = keywordCategories[keyword];
				if (match.confidence > confidence) {
					category = match.category;
					confidence = match.confidence;
					reason = `Keyword match: ${keyword}`;
				}
			}
		}

		return { category, confidence, reason };
	}

	private predictFromTime(
		features: TransactionFeatures,
		userId: string
	): {
		category: string;
		confidence: number;
		reason: string;
	} {
		let category = 'Uncategorized';
		let confidence = 0.2;
		let reason = 'Time-based analysis inconclusive';

		// Time-based patterns
		const hour = new Date().getHours();
		const dayOfWeek = features.dayOfWeek;

		// Morning coffee/food patterns
		if (hour >= 6 && hour <= 10 && features.amount < 15) {
			category = 'Food & Dining';
			confidence = 0.6;
			reason = 'Morning low-amount purchase suggests coffee/food';
		}
		// Lunch patterns
		else if (
			hour >= 11 &&
			hour <= 14 &&
			features.amount >= 10 &&
			features.amount <= 30
		) {
			category = 'Food & Dining';
			confidence = 0.5;
			reason = 'Lunch time medium amount suggests food';
		}
		// Evening entertainment
		else if (hour >= 18 && hour <= 23 && features.amount > 50) {
			category = 'Entertainment';
			confidence = 0.4;
			reason = 'Evening high amount suggests entertainment';
		}
		// Weekend shopping
		else if ((dayOfWeek === 0 || dayOfWeek === 6) && features.amount > 100) {
			category = 'Shopping';
			confidence = 0.5;
			reason = 'Weekend high amount suggests shopping';
		}

		return { category, confidence, reason };
	}

	private calculateAverageConfidence(): number {
		// Calculate average confidence from category patterns
		if (this.categoryPatterns.size === 0) {
			return 0.5;
		}

		const confidences = Array.from(this.categoryPatterns.values()).map(
			(pattern) => pattern.confidence || 0.5
		);

		return (
			confidences.reduce((sum, conf) => sum + conf, 0) / confidences.length
		);
	}

	private updateCategoryPatternFromTransaction(
		userId: string,
		category: string,
		transaction: any
	): void {
		if (!this.categoryPatterns.has(category)) {
			this.categoryPatterns.set(category, {
				category,
				averageAmount: transaction.amount,
				frequency: 1,
				dayOfWeekPreference: new Array(7).fill(0),
				amountRange: { min: transaction.amount, max: transaction.amount },
				seasonalTrend: 'stable',
				confidence: 0.5,
				lastUpdated: Date.now(),
			});
		} else {
			const pattern = this.categoryPatterns.get(category)!;
			const newFrequency = pattern.frequency + 1;
			const newAverage =
				(pattern.averageAmount * pattern.frequency + transaction.amount) /
				newFrequency;

			pattern.averageAmount = newAverage;
			pattern.frequency = newFrequency;
			pattern.amountRange.min = Math.min(
				pattern.amountRange.min,
				transaction.amount
			);
			pattern.amountRange.max = Math.max(
				pattern.amountRange.max,
				transaction.amount
			);
			pattern.lastUpdated = Date.now();

			// Update day of week preference
			const dayOfWeek = new Date(transaction.date).getDay();
			pattern.dayOfWeekPreference[dayOfWeek]++;
		}
	}

	private combinePredictions(
		predictions: {
			category: string;
			confidence: number;
			reason: string;
		}[]
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
				confidence: 0.5,
				lastUpdated: Date.now(),
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
				confidence: 0.5,
				lastUpdated: Date.now(),
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
			confidence: 0.7,
			lastUpdated: Date.now(),
		};
	}

	private async loadModelsFromStorage(): Promise<void> {
		try {
			logger.debug('[LocalMLService] Loading models from storage...');
			const [vendorData, categoryData] = await Promise.all([
				AsyncStorage.getItem('vendor_patterns'),
				AsyncStorage.getItem('category_patterns'),
			]);

			if (vendorData) {
				const parsed = JSON.parse(vendorData) as Record<
					string,
					Record<string, Record<string, number>>
				>;
				// Convert back to nested Maps
				for (const [userId, userData] of Object.entries(parsed)) {
					this.vendorPatterns.set(userId, new Map(Object.entries(userData)));
				}
				logger.debug(
					`[LocalMLService] Loaded vendor patterns for ${this.vendorPatterns.size} users`
				);
			} else {
				logger.debug('[LocalMLService] No vendor patterns found');
			}

			if (categoryData) {
				const parsed = JSON.parse(categoryData);
				this.categoryPatterns = new Map(Object.entries(parsed));
				logger.debug(
					`[LocalMLService] Loaded ${this.categoryPatterns.size} category patterns`
				);
			} else {
				logger.debug('[LocalMLService] No category patterns found');
			}
		} catch (error) {
			logger.error(
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
			logger.error(
				'[LocalMLService] Error persisting models to storage:',
				error
			);
		}
	}
}

export default LocalMLService;
