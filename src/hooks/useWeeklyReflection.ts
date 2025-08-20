import { useState, useEffect, useCallback, useContext } from 'react';
import {
	WeeklyReflectionService,
	WeeklyReflection,
	SaveReflectionData,
} from '../services';
import { TransactionContext } from '../context/transactionContext';
import { useBudget } from '../context/budgetContext';
import { useGoal } from '../context/goalContext';

export interface UseWeeklyReflectionReturn {
	currentReflection: WeeklyReflection | null;
	loading: boolean;
	saving: boolean;
	error: string | null;
	saveReflection: (data: SaveReflectionData) => Promise<void>;
	updateMoodRating: (rating: number) => Promise<void>;
	updateWinOfTheWeek: (win: string) => Promise<void>;
	refreshReflection: () => Promise<void>;
}

export function useWeeklyReflection(): UseWeeklyReflectionReturn {
	const [currentReflection, setCurrentReflection] =
		useState<WeeklyReflection | null>(null);
	const [loading, setLoading] = useState(true);
	const [saving, setSaving] = useState(false);
	const [error, setError] = useState<string | null>(null);

	const { transactions } = useContext(TransactionContext);
	const { budgets } = useBudget();
	const { goals } = useGoal();

	// Fetch current week's reflection
	const fetchCurrentReflection = useCallback(async () => {
		try {
			setLoading(true);
			setError(null);
			const reflection =
				await WeeklyReflectionService.getCurrentWeekReflection();
			setCurrentReflection(reflection);
		} catch (err) {
			console.error('Error fetching current reflection:', err);
			setError('Failed to load weekly reflection');
		} finally {
			setLoading(false);
		}
	}, []);

	// Save reflection data
	const saveReflection = useCallback(
		async (data: SaveReflectionData) => {
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
				setCurrentReflection(updatedReflection);
			} catch (err) {
				console.error('Error saving reflection:', err);
				setError('Failed to save weekly reflection');
				throw err;
			} finally {
				setSaving(false);
			}
		},
		[transactions, budgets, goals]
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

	// Refresh reflection data
	const refreshReflection = useCallback(async () => {
		await fetchCurrentReflection();
	}, [fetchCurrentReflection]);

	// Load reflection on mount
	useEffect(() => {
		fetchCurrentReflection();
	}, [fetchCurrentReflection]);

	return {
		currentReflection,
		loading,
		saving,
		error,
		saveReflection,
		updateMoodRating,
		updateWinOfTheWeek,
		refreshReflection,
	};
}
