import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
	Text,
	View,
	StyleSheet,
	Alert,
	ScrollView,
	ActivityIndicator,
	TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { RectButton } from 'react-native-gesture-handler';
import { useGoals } from '../../../src/hooks/useGoals';
import { Goal } from '../../../src/context/goalContext';
import { useLocalSearchParams, useRouter } from 'expo-router';
import QuickAddTransaction from './components/QuickAddTransaction';
import GoalsSummaryCard from './components/GoalsSummaryCard';
import GoalsFeed from './components/GoalsFeed';

// ==========================================
// Main Component
// ==========================================
export default function GoalsScreen() {
	// ==========================================
	// Data Fetching
	// ==========================================
	const {
		goals,
		deleteGoal,
		isLoading,
		hasLoaded,
		error,
		getGoalsByStatus,
		sortGoals,
	} = useGoals();

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

	// Filter and sort goals
	const filteredAndSortedGoals = useMemo(() => {
		let filteredGoals = goals;

		// Apply filter
		if (filterBy !== 'all') {
			filteredGoals = getGoalsByStatus(filterBy);
		}

		// Apply sorting
		return sortGoals(filteredGoals, sortBy);
	}, [goals, filterBy, sortBy, getGoalsByStatus, sortGoals]);

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
	// Loading State Component
	// ==========================================
	const LoadingState = () => (
		<View style={styles.loadingContainer}>
			<ActivityIndicator size="large" color="#00a2ff" />
			<Text style={styles.loadingText}>Loading goals...</Text>
		</View>
	);

	// ==========================================
	// Error State Component
	// ==========================================
	const ErrorState = () => (
		<View style={styles.errorContainer}>
			<View style={styles.errorContent}>
				<Ionicons name="warning-outline" size={64} color="#ff6b6b" />
				<Text style={styles.errorTitle}>Unable to Load Goals</Text>
				<Text style={styles.errorSubtext}>
					{error?.message ||
						'There was a problem connecting to the server. Please check your connection and try again.'}
				</Text>
				<RectButton
					style={styles.errorButton}
					onPress={() => router.replace('/(tabs)/budgets/goals')}
				>
					<Ionicons name="refresh" size={20} color="#fff" />
					<Text style={styles.errorButtonText}>Retry</Text>
				</RectButton>
			</View>
		</View>
	);

	// ==========================================
	// Empty State Component
	// ==========================================
	const EmptyState = () => (
		<View style={styles.emptyContainer}>
			<View style={styles.emptyContent}>
				<Ionicons name="flag-outline" size={64} color="#e0e0e0" />
				<Text style={styles.emptyTitle}>No Goals Yet</Text>
				<Text style={styles.emptySubtext}>
					Create your first goal to start saving towards your dreams
				</Text>
				<RectButton style={styles.emptyAddButton} onPress={showModal}>
					<Ionicons name="add" size={20} color="#fff" />
					<Text style={styles.emptyAddButtonText}>Add Goal</Text>
				</RectButton>
			</View>
		</View>
	);

	// ==========================================
	// Filter/Sort Header Component
	// ==========================================
	const FilterSortHeader = () => (
		<View style={styles.filterHeader}>
			<View style={styles.filterRow}>
				<Text style={styles.filterLabel}>Filter:</Text>
				<View style={styles.filterButtons}>
					{['all', 'active', 'completed', 'overdue'].map((filter) => (
						<TouchableOpacity
							key={filter}
							style={[
								styles.filterButton,
								filterBy === filter && styles.filterButtonActive,
							]}
							onPress={() => setFilterBy(filter as any)}
						>
							<Text
								style={[
									styles.filterButtonText,
									filterBy === filter && styles.filterButtonTextActive,
								]}
							>
								{filter.charAt(0).toUpperCase() + filter.slice(1)}
							</Text>
						</TouchableOpacity>
					))}
				</View>
			</View>
			<View style={styles.sortRow}>
				<Text style={styles.sortLabel}>Sort by:</Text>
				<View style={styles.sortButtons}>
					{[
						{ key: 'deadline', label: 'Deadline' },
						{ key: 'progress', label: 'Progress' },
						{ key: 'name', label: 'Name' },
						{ key: 'target', label: 'Amount' },
					].map((sort) => (
						<TouchableOpacity
							key={sort.key}
							style={[
								styles.sortButton,
								sortBy === sort.key && styles.sortButtonActive,
							]}
							onPress={() => setSortBy(sort.key as any)}
						>
							<Text
								style={[
									styles.sortButtonText,
									sortBy === sort.key && styles.sortButtonTextActive,
								]}
							>
								{sort.label}
							</Text>
						</TouchableOpacity>
					))}
				</View>
			</View>
		</View>
	);

	// ==========================================
	// Main Render
	// ==========================================
	// Show loading state while fetching data
	if (isLoading && !hasLoaded) {
		return <LoadingState />;
	}

	// Show error state if there's an error
	if (error && hasLoaded) {
		return <ErrorState />;
	}

	// Show empty state if no goals and data has loaded
	if (goals.length === 0 && hasLoaded) {
		return <EmptyState />;
	}

	// Show goals with add button
	return (
		<View style={styles.mainContainer}>
			<ScrollView
				showsVerticalScrollIndicator={false}
				contentContainerStyle={{ paddingBottom: 24 }}
			>
				<GoalsSummaryCard
					totalGoals={summaryStats.totalGoals}
					completedGoals={summaryStats.completedGoals}
					totalTarget={summaryStats.totalTarget}
					totalCurrent={summaryStats.totalCurrent}
					onAddGoal={showModal}
				/>
				{goals.length > 0 && <FilterSortHeader />}
				<GoalsFeed
					scrollEnabled={false}
					goals={filteredAndSortedGoals}
					onPressMenu={(id: string) => {
						const g = goals.find((gg) => gg.id === id);
						if (g) {
							Alert.alert(
								'Goal Options',
								`What would you like to do with "${g.name}"?`,
								[
									{
										text: 'Edit',
										onPress: () => showEditModal(g),
									},
									{
										text: 'Delete',
										style: 'destructive',
										onPress: () => handleDeleteGoal(g.id),
									},
									{
										text: 'Cancel',
										style: 'cancel',
									},
								]
							);
						}
					}}
				/>
			</ScrollView>

			{/* Quick Add Transaction Modal */}
			<QuickAddTransaction
				isVisible={showQuickAddModal}
				onClose={handleCloseQuickAddModal}
				goalId={selectedGoalForTransaction?.id}
				goalName={selectedGoalForTransaction?.name}
				goalColor={selectedGoalForTransaction?.color}
			/>
		</View>
	);
}

// ==========================================
// Styles
// ==========================================
const styles = StyleSheet.create({
	mainContainer: {
		flex: 1,
		backgroundColor: '#fff',
	},
	loadingContainer: {
		flex: 1,
		justifyContent: 'center',
		alignItems: 'center',
		backgroundColor: '#fff',
	},
	loadingText: {
		marginTop: 16,
		fontSize: 16,
		color: '#757575',
	},
	errorContainer: {
		flex: 1,
		justifyContent: 'center',
		alignItems: 'center',
		paddingHorizontal: 24,
		backgroundColor: '#fff',
	},
	errorContent: {
		alignItems: 'center',
		maxWidth: 280,
	},
	errorTitle: {
		fontSize: 24,
		fontWeight: '600',
		color: '#212121',
		marginTop: 16,
		marginBottom: 8,
		textAlign: 'center',
	},
	errorSubtext: {
		fontSize: 16,
		color: '#757575',
		textAlign: 'center',
		marginBottom: 32,
		lineHeight: 22,
	},
	errorButton: {
		backgroundColor: '#00a2ff',
		borderRadius: 12,
		paddingVertical: 16,
		paddingHorizontal: 24,
		flexDirection: 'row',
		alignItems: 'center',
		gap: 8,
	},
	errorButtonText: {
		color: '#FFFFFF',
		fontSize: 16,
		fontWeight: '600',
	},
	emptyContainer: {
		flex: 1,
		justifyContent: 'center',
		alignItems: 'center',
		paddingHorizontal: 24,
		backgroundColor: '#fff',
	},
	emptyContent: {
		alignItems: 'center',
		maxWidth: 280,
	},
	emptyTitle: {
		fontSize: 24,
		fontWeight: '600',
		color: '#212121',
		marginTop: 16,
		marginBottom: 8,
		textAlign: 'center',
	},
	emptySubtext: {
		fontSize: 16,
		color: '#757575',
		textAlign: 'center',
		marginBottom: 32,
		lineHeight: 22,
	},
	emptyAddButton: {
		backgroundColor: '#00a2ff',
		borderRadius: 12,
		paddingVertical: 16,
		paddingHorizontal: 24,
		flexDirection: 'row',
		alignItems: 'center',
		gap: 8,
	},
	emptyAddButtonText: {
		color: '#FFFFFF',
		fontSize: 16,
		fontWeight: '600',
	},
	// Filter/Sort Header Styles
	filterHeader: {
		backgroundColor: '#f8f9fa',
		paddingHorizontal: 16,
		paddingVertical: 12,
		borderBottomWidth: 1,
		borderBottomColor: '#e9ecef',
	},
	filterRow: {
		flexDirection: 'row',
		alignItems: 'center',
		marginBottom: 8,
	},
	filterLabel: {
		fontSize: 14,
		fontWeight: '600',
		color: '#495057',
		marginRight: 12,
		minWidth: 50,
	},
	filterButtons: {
		flexDirection: 'row',
		flex: 1,
		gap: 6,
	},
	filterButton: {
		paddingHorizontal: 12,
		paddingVertical: 6,
		borderRadius: 16,
		backgroundColor: '#fff',
		borderWidth: 1,
		borderColor: '#dee2e6',
	},
	filterButtonActive: {
		backgroundColor: '#00a2ff',
		borderColor: '#00a2ff',
	},
	filterButtonText: {
		fontSize: 12,
		fontWeight: '500',
		color: '#6c757d',
	},
	filterButtonTextActive: {
		color: '#fff',
	},
	sortRow: {
		flexDirection: 'row',
		alignItems: 'center',
	},
	sortLabel: {
		fontSize: 14,
		fontWeight: '600',
		color: '#495057',
		marginRight: 12,
		minWidth: 50,
	},
	sortButtons: {
		flexDirection: 'row',
		flex: 1,
		gap: 6,
	},
	sortButton: {
		paddingHorizontal: 10,
		paddingVertical: 4,
		borderRadius: 12,
		backgroundColor: '#fff',
		borderWidth: 1,
		borderColor: '#dee2e6',
	},
	sortButtonActive: {
		backgroundColor: '#28a745',
		borderColor: '#28a745',
	},
	sortButtonText: {
		fontSize: 11,
		fontWeight: '500',
		color: '#6c757d',
	},
	sortButtonTextActive: {
		color: '#fff',
	},
});
