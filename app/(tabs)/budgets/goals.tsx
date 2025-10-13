import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Alert, ScrollView } from 'react-native';
import { useGoals } from '../../../src/hooks/useGoals';
import { Goal } from '../../../src/context/goalContext';
import { useLocalSearchParams, useRouter } from 'expo-router';
import QuickAddTransaction from './components/QuickAddTransaction';
import GoalsSummaryCard from './components/GoalsSummaryCard';
import GoalsFeed from './components/GoalsFeed';
import {
	Page,
	Card,
	Section,
	LoadingState,
	ErrorState,
	EmptyState,
	SegmentedControl,
} from '../../../src/ui';

// ==========================================
// Main Component
// ==========================================
export default function GoalsScreen() {
	// ==========================================
	// Data Fetching
	// ==========================================
	const { goals, deleteGoal, isLoading, hasLoaded, error } = useGoals();

	// ==========================================
	// Route Parameters
	// ==========================================
	const params = useLocalSearchParams();
	const router = useRouter();

	// ==========================================
	// State Management
	// ==========================================
	const [showQuickAddModal, setShowQuickAddModal] = useState(false);
	const [selectedGoalForTransaction, setSelectedGoalForTransaction] =
		useState<Goal | null>(null);
	const [sortBy, setSortBy] = useState<
		'name' | 'deadline' | 'progress' | 'target' | 'created'
	>('deadline');
	const [filterBy, setFilterBy] = useState<
		'all' | 'active' | 'completed' | 'overdue'
	>('all');

	// ==========================================
	// Memoized Data
	// ==========================================
	// Calculate summary statistics
	const summaryStats = useMemo(() => {
		const totalGoals = goals.length;
		const completedGoals = goals.filter(
			(goal) => goal.current >= goal.target
		).length;
		const totalTarget = goals.reduce((sum, goal) => sum + goal.target, 0);
		const totalCurrent = goals.reduce((sum, goal) => sum + goal.current, 0);

		return {
			totalGoals,
			completedGoals,
			totalTarget,
			totalCurrent,
		};
	}, [goals]);

	// ==========================================
	// Modal Handlers
	// ==========================================
	const showModal = useCallback(() => {
		router.push('/(stack)/addGoal');
	}, [router]);

	const showEditModal = useCallback(
		(goal: Goal) => {
			router.push(`/(stack)/editGoal?id=${goal.id}`);
		},
		[router]
	);

	// ==========================================
	// Goal Management
	// ==========================================
	const handleDeleteGoal = async (goalId: string) => {
		try {
			await deleteGoal(goalId);
		} catch (error) {
			console.error('Error deleting goal:', error);
		}
	};

	// ==========================================
	// Auto-open modal on navigation and refresh data
	// ==========================================
	useEffect(() => {
		// Only refresh if we haven't loaded data yet
		if (!hasLoaded) {
			// Small delay to ensure component is fully mounted
			const timer = setTimeout(() => {
				// The useGoals hook will handle the initial fetch automatically
			}, 100);
			return () => clearTimeout(timer);
		}
	}, [hasLoaded]);

	// Handle modal opening from URL parameters
	useEffect(() => {
		// Check if we should auto-open the modal
		if (params.openModal === 'true') {
			// Small delay to ensure component is fully mounted
			const timer = setTimeout(() => {
				showModal();
			}, 100);
			return () => clearTimeout(timer);
		}
	}, [params.openModal, showModal]);

	const handleCloseQuickAddModal = () => {
		setShowQuickAddModal(false);
		setSelectedGoalForTransaction(null);
	};

	// ==========================================
	// Main Render
	// ==========================================
	// Show loading state while fetching data
	if (isLoading && !hasLoaded) {
		return <LoadingState label="Loading goals..." />;
	}

	// Show error state if there's an error
	if (error && hasLoaded) {
		return (
			<ErrorState
				title="Unable to load goals"
				onRetry={() => router.replace('/(tabs)/budgets/goals')}
			/>
		);
	}

	// Show empty state if no goals and data has loaded
	if (goals.length === 0 && hasLoaded) {
		return (
			<EmptyState
				icon="flag-outline"
				title="No Goals Yet"
				subtitle="Create your first goal to start saving towards your dreams."
				ctaLabel="Add Goal"
				onPress={showModal}
			/>
		);
	}

	return (
		<Page
			title="Goals"
			subtitle={`${summaryStats.completedGoals}/${summaryStats.totalGoals} completed`}
			right={
				<SegmentedControl
					value={filterBy}
					onChange={(key) => setFilterBy(key as any)}
					segments={[
						{ key: 'all', label: 'All' },
						{ key: 'active', label: 'Active' },
						{ key: 'completed', label: 'Done' },
						{ key: 'overdue', label: 'Overdue' },
					]}
				/>
			}
		>
			<ScrollView
				showsVerticalScrollIndicator={false}
				contentContainerStyle={{ paddingBottom: 24 }}
			>
				<Card>
					<GoalsSummaryCard
						totalGoals={summaryStats.totalGoals}
						completedGoals={summaryStats.completedGoals}
						totalTarget={summaryStats.totalTarget}
						totalCurrent={summaryStats.totalCurrent}
						onAddGoal={showModal}
					/>
				</Card>

				<Section title="Your Goals">
					<Card>
						<GoalsFeed
							scrollEnabled={false}
							goals={goals}
							filterBy={filterBy}
							sortBy={sortBy}
							onSortChange={setSortBy}
							onPressMenu={(id: string) => {
								const g = goals.find((gg) => gg.id === id);
								if (!g) return;
								Alert.alert(
									'Goal Options',
									`What would you like to do with "${g.name}"?`,
									[
										{ text: 'Edit', onPress: () => showEditModal(g) },
										{
											text: 'Delete',
											style: 'destructive',
											onPress: () => handleDeleteGoal(g.id),
										},
										{ text: 'Cancel', style: 'cancel' },
									]
								);
							}}
						/>
					</Card>
				</Section>
			</ScrollView>

			{/* Quick Add Transaction Modal */}
			<QuickAddTransaction
				isVisible={showQuickAddModal}
				onClose={handleCloseQuickAddModal}
				goalId={selectedGoalForTransaction?.id}
				goalName={selectedGoalForTransaction?.name}
				goalColor={selectedGoalForTransaction?.color}
			/>
		</Page>
	);
}
