import { useState, useEffect, useCallback, useContext, useMemo } from 'react';
import {
	WeeklyReflectionService,
	WeeklyReflection,
	SaveReflectionData,
} from '../services';
import { TransactionContext } from '../context/transactionContext';
import { useBudget } from '../context/budgetContext';
import { useGoal } from '../context/goalContext';
import { createLogger } from '../utils/sublogger';

const weeklyReflectionHookLog = createLogger('useWeeklyReflection');

export interface UseWeeklyReflectionReturn {
	currentReflection: WeeklyReflection | null;
	recentReflections: WeeklyReflection[];
	streakCount: number;
	loading: boolean;
	saving: boolean;
	error: string | null;
	saveReflection: (data: SaveReflectionData) => Promise<WeeklyReflection>;
	updateMoodRating: (rating: number) => Promise<void>;
	updateWinOfTheWeek: (win: string) => Promise<void>;
	updateReflectionNotes: (notes: string) => Promise<void>;
	refreshReflection: () => Promise<void>;
}

export function useWeeklyReflection(): UseWeeklyReflectionReturn {
	const [currentReflection, setCurrentReflection] =
		useState<WeeklyReflection | null>(null);
	const [recentReflections, setRecentReflections] = useState<
		WeeklyReflection[]
	>([]);
	const [loading, setLoading] = useState(true);
	const [saving, setSaving] = useState(false);
	const [error, setError] = useState<string | null>(null);

	const { transactions } = useContext(TransactionContext);
	const { budgets } = useBudget();
	const { goals } = useGoal();

	// Fetch recent reflections (excluding current)
	const fetchRecentReflections = useCallback(async () => {
		try {
			const reflections = await WeeklyReflectionService.getReflectionHistory(
				20,
				0
			);
			setRecentReflections(reflections);
		} catch (err) {
			weeklyReflectionHookLog.error('Error fetching recent reflections', err);
			// Don't set error state for this, just log it
		}
	}, []);

	// Calculate streak count from recent reflections
	const calculateStreakCount = useCallback(
		(reflections: WeeklyReflection[]): number => {
			if (!reflections || reflections.length === 0) return 0;

			// Sort by weekStartDate descending (most recent first)
			const sorted = [...reflections].sort((a, b) => {
				const dateA = new Date(a.weekStartDate).getTime();
				const dateB = new Date(b.weekStartDate).getTime();
				return dateB - dateA;
			});

			// Only count completed reflections
			const completed = sorted.filter((r) => r.completed);
			if (completed.length === 0) return 0;

			// Check if the most recent completed reflection is from the current or last week
			const now = new Date();
			const dayOfWeek = now.getDay();
			const daysToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
			const currentWeekStart = new Date(now);
			currentWeekStart.setDate(now.getDate() - daysToMonday);
			currentWeekStart.setHours(0, 0, 0, 0);

			const lastWeekStart = new Date(currentWeekStart);
			lastWeekStart.setDate(currentWeekStart.getDate() - 7);

			let streak = 0;
			let expectedWeekStart = new Date(currentWeekStart);

			for (const reflection of completed) {
				const reflectionWeekStart = new Date(reflection.weekStartDate);
				reflectionWeekStart.setHours(0, 0, 0, 0);

				// Check if this reflection matches the expected week
				if (
					reflectionWeekStart.getTime() === expectedWeekStart.getTime() ||
					// Allow for the previous week if we're early in the current week
					(streak === 0 &&
						reflectionWeekStart.getTime() === lastWeekStart.getTime())
				) {
					streak++;
					expectedWeekStart.setDate(expectedWeekStart.getDate() - 7);
				} else {
					// If there's a gap, stop counting
					break;
				}
			}

			return streak;
		},
		[]
	);

	// Fetch current week's reflection
	const fetchCurrentReflection = useCallback(async () => {
		try {
			setLoading(true);
			setError(null);
			const reflection =
				await WeeklyReflectionService.getCurrentWeekReflection();
			setCurrentReflection(reflection);

			// Also fetch recent reflections
			await fetchRecentReflections();
		} catch (err) {
			weeklyReflectionHookLog.error('Error fetching current reflection', err);
			setError('Failed to load weekly reflection');
		} finally {
			setLoading(false);
		}
	}, [fetchRecentReflections]);

	// Save reflection data
	const saveReflection = useCallback(
		async (data: SaveReflectionData): Promise<WeeklyReflection> => {
			try {
				setSaving(true);
				setError(null);

				// Calculate financial metrics if not provided
				if (!data.financialMetrics) {
					data.financialMetrics =
						WeeklyReflectionService.calculateFinancialMetrics(
							transactions,
							budgets,
							goals
						);
				}

				const updatedReflection =
					await WeeklyReflectionService.saveWeeklyReflection(data);
				
				// If we're updating a specific reflection (not current week), update it in recentReflections
				// Otherwise, update currentReflection
				if (data.reflectionId && data.reflectionId !== currentReflection?._id) {
					// Update the reflection in recentReflections state
					setRecentReflections((prev) =>
						prev.map((r) =>
							r._id === data.reflectionId ? updatedReflection : r
						)
					);
					// Clear cache and refresh to ensure we have the latest data
					const { ApiService } = await import('../services');
					ApiService.clearCacheByPrefix('/api/weekly-reflections');
					await fetchRecentReflections();
				} else {
					setCurrentReflection(updatedReflection);
					// Refresh recent reflections after saving current week
					await fetchRecentReflections();
				}
				
				return updatedReflection;
			} catch (err) {
				weeklyReflectionHookLog.error('Error saving reflection', err);
				setError('Failed to save weekly reflection');
				throw err;
			} finally {
				setSaving(false);
			}
		},
		[transactions, budgets, goals, fetchRecentReflections, currentReflection]
	);

	// Update mood rating
	const updateMoodRating = useCallback(
		async (rating: number) => {
			if (!currentReflection) return;

			await saveReflection({
				moodRating: rating,
				winOfTheWeek: currentReflection.winOfTheWeek,
				reflectionNotes: currentReflection.reflectionNotes,
			});
		},
		[currentReflection, saveReflection]
	);

	// Update win of the week
	const updateWinOfTheWeek = useCallback(
		async (win: string) => {
			if (!currentReflection) return;

			await saveReflection({
				moodRating: currentReflection.moodRating,
				winOfTheWeek: win,
				reflectionNotes: currentReflection.reflectionNotes,
			});
		},
		[currentReflection, saveReflection]
	);

	// Update reflection notes
	const updateReflectionNotes = useCallback(
		async (notes: string) => {
			if (!currentReflection) return;

			await saveReflection({
				moodRating: currentReflection.moodRating,
				winOfTheWeek: currentReflection.winOfTheWeek,
				reflectionNotes: notes,
			});
		},
		[currentReflection, saveReflection]
	);

	// Refresh reflection data
	const refreshReflection = useCallback(async () => {
		await fetchCurrentReflection();
	}, [fetchCurrentReflection]);

	// Calculate streak count from all reflections (current + recent)
	const streakCount = useMemo(() => {
		const allReflections = currentReflection
			? [currentReflection, ...recentReflections]
			: recentReflections;
		return calculateStreakCount(allReflections);
	}, [currentReflection, recentReflections, calculateStreakCount]);

	// Load reflection on mount
	useEffect(() => {
		fetchCurrentReflection();
	}, [fetchCurrentReflection]);

	return {
		currentReflection,
		recentReflections,
		streakCount,
		loading,
		saving,
		error,
		saveReflection,
		updateMoodRating,
		updateWinOfTheWeek,
		updateReflectionNotes,
		refreshReflection,
	};
}
