import React, { useState, useEffect, useMemo } from 'react';
import {
	View,
	Text,
	StyleSheet,
	ScrollView,
	Alert,
	TouchableOpacity,
	RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { RectButton } from 'react-native-gesture-handler';
import { useBudgets } from '../../../src/hooks/useBudgets';
import { Budget } from '../../../src/context/budgetContext';
import { useLocalSearchParams, useRouter } from 'expo-router';
import MonthlyBudgetCircle from './components/MonthlyBudgetCircle';
import WeeklyBudgetCircle from './components/WeeklyBudgetCircle';
import AllBudgetCircle from './components/AllBudgetCircle';
import BudgetsFeed from './components/BudgetsFeed';

// ==========================================
// Main Component
// ==========================================
export default function BudgetScreen() {
	// ==========================================
	// Data Fetching
	// ==========================================
	const {
		budgets,
		isLoading,
		addBudget,
		updateBudget,
		deleteBudget,
		refetch,
		monthlyBudgets,
		weeklyBudgets,
		monthlySummary,
		weeklySummary,
		monthlyPercentage,
		weeklyPercentage,
		hasLoaded,
	} = useBudgets();

	// ==========================================
	// Route Parameters
	// ==========================================
	const params = useLocalSearchParams();
	const router = useRouter();

	// ==========================================
	// State Management
	// ==========================================
	const [activeTab, setActiveTab] = useState<'monthly' | 'weekly' | 'all'>(
		'all'
	);
	const [refreshing, setRefreshing] = useState(false);

	// ==========================================
	// Auto-open modal on navigation and refresh data
	// ==========================================
	useEffect(() => {
		// Only refresh if we haven't loaded data yet
		if (!hasLoaded) {
			refetch();
		}
	}, [refetch, hasLoaded]);

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
	// Pull to Refresh Handler
	// ==========================================
	const onRefresh = async () => {
		setRefreshing(true);
		try {
			await refetch();
		} catch (error) {
			console.error('Error refreshing budgets:', error);
		} finally {
			setRefreshing(false);
		}
	};

	// ==========================================
	// Empty State Component
	// ==========================================
	const EmptyState = () => (
		<View style={styles.emptyContainer}>
			<View style={styles.emptyContent}>
				<Ionicons name="wallet-outline" size={64} color="#e0e0e0" />
				<Text style={styles.emptyTitle}>No Budgets Yet</Text>
				<Text style={styles.emptySubtext}>
					Create your first budget to start tracking your spending
				</Text>
				<RectButton style={styles.emptyAddButton} onPress={showModal}>
					<Ionicons name="add" size={20} color="#fff" />
					<Text style={styles.emptyAddButtonText}>Add Budget</Text>
				</RectButton>
			</View>
		</View>
	);

	// ==========================================
	// Budget Summary Components
	// ==========================================
	const AllBudgetsSummary = () => (
		<AllBudgetCircle
			percentage={Math.min(
				((monthlySummary.totalSpent + weeklySummary.totalSpent) /
					(monthlySummary.totalAllocated + weeklySummary.totalAllocated)) *
					100,
				100
			)}
			spent={monthlySummary.totalSpent + weeklySummary.totalSpent}
			total={monthlySummary.totalAllocated + weeklySummary.totalAllocated}
			onPeriodToggle={handlePeriodToggle}
			isActive={activeTab === 'all'}
		/>
	);

	const MonthlyBudgetSummary = () => (
		<MonthlyBudgetCircle
			percentage={monthlyPercentage}
			spent={monthlySummary.totalSpent}
			total={monthlySummary.totalAllocated}
			onPeriodToggle={handlePeriodToggle}
			isActive={activeTab === 'monthly'}
		/>
	);

	const WeeklyBudgetSummary = () => (
		<WeeklyBudgetCircle
			percentage={weeklyPercentage}
			spent={weeklySummary.totalSpent}
			total={weeklySummary.totalAllocated}
			onPeriodToggle={handlePeriodToggle}
			isActive={activeTab === 'weekly'}
		/>
	);

	// ==========================================
	// Modal Handlers
	// ==========================================
	const showModal = () => {
		router.push('/(stack)/addBudget');
	};

	const showEditModal = (budget: Budget) => {
		router.push(`/(stack)/editBudget?id=${budget.id}`);
	};

	// ==========================================
	// Period Toggle Handler
	// ==========================================
	const handlePeriodToggle = () => {
		// Cycle through: all -> monthly -> weekly -> all
		if (activeTab === 'all') {
			setActiveTab('monthly');
		} else if (activeTab === 'monthly') {
			setActiveTab('weekly');
		} else {
			setActiveTab('all');
		}
	};

	// Filter budgets based on active tab
	const filteredBudgets = useMemo(() => {
		if (activeTab === 'all') {
			return budgets;
		} else if (activeTab === 'monthly') {
			return budgets.filter((budget) => budget.period === 'monthly');
		} else {
			return budgets.filter((budget) => budget.period === 'weekly');
		}
	}, [budgets, activeTab]);

	return (
		<View style={styles.mainContainer}>
			{budgets.length === 0 && !isLoading ? (
				<EmptyState />
			) : (
				<ScrollView
					showsVerticalScrollIndicator={false}
					contentContainerStyle={{ paddingBottom: 24 }}
					refreshControl={
						<RefreshControl
							refreshing={refreshing}
							onRefresh={onRefresh}
							tintColor="#00a2ff"
							colors={['#00a2ff']}
						/>
					}
				>
					{/* Page Header with Add Button */}
					<View style={styles.pageHeader}>
						<View style={styles.pageHeaderContent}>
							<Text style={styles.pageHeaderTitle}>Budgets Overview</Text>
							<Text style={styles.pageHeaderSubtitle}>
								Manage your spending across different categories
							</Text>
						</View>
						<TouchableOpacity style={styles.addButton} onPress={showModal}>
							<Ionicons name="add" size={20} color="#fff" />
							<Text style={styles.addButtonText}>Add Budget</Text>
						</TouchableOpacity>
					</View>

					{/* Header */}
					<View style={{ marginTop: 12 }}>
						{activeTab === 'all' ? (
							<AllBudgetsSummary />
						) : activeTab === 'monthly' ? (
							<MonthlyBudgetSummary />
						) : (
							<WeeklyBudgetSummary />
						)}
					</View>
					<View
						style={{
							marginTop: 16,
							borderTopWidth: 1,
							borderTopColor: '#E0E0E0',
						}}
					>
						<BudgetsFeed
							scrollEnabled={false}
							budgets={filteredBudgets}
							onPressMenu={(id: string) => {
								const b = budgets.find((bb) => bb.id === id);
								if (b) {
									Alert.alert(
										'Budget Options',
										`What would you like to do with "${b.name}"?`,
										[
											{
												text: 'Edit',
												onPress: () => showEditModal(b),
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
					</View>
				</ScrollView>
			)}
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
	emptyContainer: {
		flex: 1,
		justifyContent: 'center',
		alignItems: 'center',
		paddingHorizontal: 24,
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
		fontSize: 16,
		color: '#fff',
		fontWeight: '600',
	},
	pageHeader: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
		paddingHorizontal: 24,
		paddingTop: 16,
	},
	pageHeaderContent: {
		flex: 1,
	},
	pageHeaderTitle: {
		fontSize: 20,
		fontWeight: '600',
		color: '#212121',
	},
	pageHeaderSubtitle: {
		fontSize: 14,
		color: '#757575',
		marginTop: 4,
	},
	addButton: {
		backgroundColor: '#00a2ff',
		borderRadius: 12,
		paddingVertical: 12,
		paddingHorizontal: 16,
		flexDirection: 'row',
		alignItems: 'center',
		gap: 8,
	},
	addButtonText: {
		color: '#FFFFFF',
		fontSize: 14,
		fontWeight: '600',
	},
});
