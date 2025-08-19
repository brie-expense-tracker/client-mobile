import React, { useState, useEffect, useMemo } from 'react';
import {
	Text,
	View,
	StyleSheet,
	Alert,
	ScrollView,
	ActivityIndicator,
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
	}, [params.openModal]);

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
	// Modal Handlers
	// ==========================================
	const showModal = () => {
		router.push('/(stack)/addGoal');
	};

	const showEditModal = (goal: Goal) => {
		router.push(`/(stack)/editGoal?id=${goal.id}`);
	};

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
					{error ||
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
				<GoalsFeed
					scrollEnabled={false}
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
});
