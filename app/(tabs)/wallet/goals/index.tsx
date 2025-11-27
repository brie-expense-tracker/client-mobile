// app/(tabs)/wallet/goals.tsx

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
	ScrollView,
	RefreshControl,
	StyleSheet,
	View,
	Text,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useLocalSearchParams, useRouter } from 'expo-router';

import { useGoal, Goal } from '../../../../src/context/goalContext';
import QuickAddTransaction from '../components/shared/QuickAddTransaction';
import GoalsSummaryCard from '../components/goals/GoalsSummaryCard';
import GoalsFeed from '../components/goals/GoalsFeed';

import {
	Page,
	Section,
	LoadingState,
	EmptyState,
	SegmentedControl,
	Card,
	palette,
	radius,
	space,
	type as typography,
} from '../../../../src/ui';

import { isDevMode } from '../../../../src/config/environment';
import { createLogger } from '../../../../src/utils/sublogger';

const goalsScreenLog = createLogger('GoalsScreen');

type GoalStatus = 'ongoing' | 'completed' | 'cancelled';

const daysLeft = (deadline: string) => {
	const end = new Date(deadline).setHours(0, 0, 0, 0);
	const now = new Date().setHours(0, 0, 0, 0);
	return Math.ceil((end - now) / (1000 * 60 * 60 * 24));
};

const getGoalStatus = (goal: Goal): GoalStatus => {
	if (goal.current >= goal.target) return 'completed';
	const dl = daysLeft(goal.deadline);
	if (dl < 0) return 'cancelled';
	return 'ongoing';
};

export default function GoalsScreen() {
	const { goals, isLoading, hasLoaded, refetch } = useGoal();

	const params = useLocalSearchParams();
	const router = useRouter();

	const [showQuickAddModal, setShowQuickAddModal] = useState(false);
	const [selectedGoalForTransaction, setSelectedGoalForTransaction] =
		useState<Goal | null>(null);
	const [filterBy, setFilterBy] = useState<
		'all' | 'active' | 'completed' | 'overdue'
	>('all');
	const [refreshing, setRefreshing] = useState(false);

	// Summary stats
	const summaryStats = useMemo(() => {
		const totalGoals = goals.length;
		const completedGoals = goals.filter(
			(goal) => goal.current >= goal.target
		).length;
		const totalTarget = goals.reduce((sum, goal) => sum + goal.target, 0);
		const totalCurrent = goals.reduce((sum, goal) => sum + goal.current, 0);

		const activeGoals = goals.filter(
			(goal) => getGoalStatus(goal) === 'ongoing'
		).length;
		const overdueGoals = goals.filter(
			(goal) => getGoalStatus(goal) === 'cancelled'
		).length;

		return {
			totalGoals,
			completedGoals,
			activeGoals,
			overdueGoals,
			totalTarget,
			totalCurrent,
		};
	}, [goals]);

	// Navigation helpers
	const showModal = useCallback(() => {
		router.push('/(tabs)/wallet/goals/new');
	}, [router]);

	// Pull to refresh
	const handleRefresh = useCallback(async () => {
		setRefreshing(true);
		try {
			await refetch();
		} catch (error) {
			if (isDevMode) goalsScreenLog.error('Error refreshing goals', error);
		} finally {
			setRefreshing(false);
		}
	}, [refetch]);

	// Refresh on focus
	useFocusEffect(
		useCallback(() => {
			if (!hasLoaded) {
				if (isDevMode) {
					goalsScreenLog.debug(
						'🔄 [Goals] Screen focused, no data loaded yet - fetching...'
					);
				}
				refetch();
			} else {
				if (isDevMode) {
					goalsScreenLog.debug(
						'Screen focused, refreshing to ensure latest data'
					);
				}
				const timer = setTimeout(() => {
					refetch();
				}, 300);
				return () => clearTimeout(timer);
			}
		}, [refetch, hasLoaded])
	);

	// Auto-open modal via params
	useEffect(() => {
		if (params.openModal === 'true') {
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

	// Loading states
	if (isLoading && !hasLoaded) {
		return <LoadingState label="Loading goals..." />;
	}

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
		<Page>
			<ScrollView
				style={styles.scroll}
				showsVerticalScrollIndicator={false}
				contentContainerStyle={styles.scrollContent}
				refreshControl={
					<RefreshControl
						refreshing={refreshing}
						onRefresh={handleRefresh}
						tintColor={palette.primary}
						colors={[palette.primary]}
					/>
				}
			>
				{/* Hero – same pattern as BudgetScreen */}
				<Section style={styles.heroSection}>
					<Card style={styles.heroCard}>
						<GoalsSummaryCard
							totalGoals={summaryStats.totalGoals}
							completedGoals={summaryStats.completedGoals}
							totalTarget={summaryStats.totalTarget}
							totalCurrent={summaryStats.totalCurrent}
							onAddGoal={showModal}
						/>
					</Card>
				</Section>

				{/* List – title above filter */}
				<Section style={styles.goalsSection}>
					<View style={styles.goalsHeader}>
						<Text style={styles.goalsTitle}>Your goals</Text>
						<SegmentedControl
							value={filterBy}
							onChange={(key) => setFilterBy(key as any)}
							segments={[
								{ key: 'all', label: `All (${summaryStats.totalGoals})` },
								{
									key: 'active',
									label: `Active (${summaryStats.activeGoals})`,
								},
								{
									key: 'completed',
									label: `Done (${summaryStats.completedGoals})`,
								},
								{
									key: 'overdue',
									label: `Overdue (${summaryStats.overdueGoals})`,
								},
							]}
						/>
					</View>
					<GoalsFeed scrollEnabled={false} goals={goals} filterBy={filterBy} />
				</Section>
			</ScrollView>

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

const styles = StyleSheet.create({
	scroll: {
		flex: 1,
		backgroundColor: palette.surfaceAlt,
	},
	scrollContent: {
		paddingTop: space.sm,
		paddingBottom: space.xl,
	},
	heroSection: {
		marginTop: space.md,
	},
	heroCard: {
		paddingHorizontal: space.lg,
		paddingVertical: space.lg,

		backgroundColor: palette.surface,
		borderRadius: radius.xl,

		// subtle outline, like budgets / bills summary
		borderWidth: 1,
		borderColor: palette.borderMuted,

		// soft floating shadow
		shadowColor: '#000',
		shadowOpacity: 0.07,
		shadowRadius: 18,
		shadowOffset: { width: 0, height: 8 },

		// Android
		elevation: 3,
	},
	goalsSection: {
		marginTop: space.lg,
	},
	goalsHeader: {
		marginBottom: space.sm,
	},
	goalsTitle: {
		...typography.titleSm,
		color: palette.text,
		marginBottom: space.sm,
	},
});
