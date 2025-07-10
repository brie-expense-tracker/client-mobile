import React, { useState } from 'react';
import {
	SafeAreaView,
	ScrollView,
	Text,
	StyleSheet,
	TouchableOpacity,
	View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import {
	BudgetOverviewGraph,
	GoalsProgressGraph,
	SpendingTrendsGraph,
	FinancialDashboard,
} from '../../../src/components';

// Import Transaction type from the graph components
interface Transaction {
	id: string;
	type: 'income' | 'expense';
	amount: number;
	date: string;
}

// Sample data for demonstration
const sampleBudgets = [
	{
		id: '1',
		category: 'Food & Dining',
		allocated: 500,
		spent: 320,
		icon: 'restaurant',
		color: '#FF6B6B',
		categories: [],
	},
	{
		id: '2',
		category: 'Transportation',
		allocated: 300,
		spent: 280,
		icon: 'car',
		color: '#4ECDC4',
		categories: [],
	},
	{
		id: '3',
		category: 'Entertainment',
		allocated: 200,
		spent: 150,
		icon: 'game-controller',
		color: '#45B7D1',
		categories: [],
	},
	{
		id: '4',
		category: 'Shopping',
		allocated: 400,
		spent: 450,
		icon: 'bag',
		color: '#96CEB4',
		categories: [],
	},
	{
		id: '5',
		category: 'Utilities',
		allocated: 250,
		spent: 220,
		icon: 'flash',
		color: '#FFEAA7',
		categories: [],
	},
];

const sampleGoals = [
	{
		id: '1',
		name: 'Emergency Fund',
		target: 10000,
		current: 6500,
		deadline: '2024-12-31',
		icon: 'shield-checkmark',
		color: '#4CAF50',
		categories: [],
	},
	{
		id: '2',
		name: 'Vacation Fund',
		target: 5000,
		current: 3200,
		deadline: '2024-08-15',
		icon: 'airplane',
		color: '#2196F3',
		categories: [],
	},
	{
		id: '3',
		name: 'New Car',
		target: 25000,
		current: 18000,
		deadline: '2025-06-30',
		icon: 'car-sport',
		color: '#FF9800',
		categories: [],
	},
	{
		id: '4',
		name: 'Home Down Payment',
		target: 50000,
		current: 42000,
		deadline: '2025-12-31',
		icon: 'home',
		color: '#9C27B0',
		categories: [],
	},
];

const sampleTransactions: Transaction[] = [
	{
		id: '1',
		type: 'expense' as const,
		amount: 45,
		date: '2024-01-15',
		category: 'Food & Dining',
	},
	{
		id: '2',
		type: 'expense' as const,
		amount: 30,
		date: '2024-01-16',
		category: 'Transportation',
	},
	{
		id: '3',
		type: 'income' as const,
		amount: 3000,
		date: '2024-01-17',
		category: 'Salary',
	},
	{
		id: '4',
		type: 'expense' as const,
		amount: 120,
		date: '2024-01-18',
		category: 'Shopping',
	},
	{
		id: '5',
		type: 'expense' as const,
		amount: 25,
		date: '2024-01-19',
		category: 'Food & Dining',
	},
	{
		id: '6',
		type: 'expense' as const,
		amount: 80,
		date: '2024-01-20',
		category: 'Entertainment',
	},
	{
		id: '7',
		type: 'expense' as const,
		amount: 150,
		date: '2024-01-21',
		category: 'Shopping',
	},
	{
		id: '8',
		type: 'expense' as const,
		amount: 35,
		date: '2024-01-22',
		category: 'Transportation',
	},
	{
		id: '9',
		type: 'expense' as const,
		amount: 60,
		date: '2024-01-23',
		category: 'Food & Dining',
	},
	{
		id: '10',
		type: 'expense' as const,
		amount: 200,
		date: '2024-01-24',
		category: 'Utilities',
	},
	{
		id: '11',
		type: 'income' as const,
		amount: 500,
		date: '2024-01-25',
		category: 'Freelance',
	},
	{
		id: '12',
		type: 'expense' as const,
		amount: 90,
		date: '2024-01-26',
		category: 'Entertainment',
	},
	{
		id: '13',
		type: 'expense' as const,
		amount: 40,
		date: '2024-01-27',
		category: 'Food & Dining',
	},
	{
		id: '14',
		type: 'expense' as const,
		amount: 180,
		date: '2024-01-28',
		category: 'Shopping',
	},
	{
		id: '15',
		type: 'expense' as const,
		amount: 50,
		date: '2024-01-29',
		category: 'Transportation',
	},
];

export default function GraphsDemoScreen() {
	const router = useRouter();
	const [selectedGraph, setSelectedGraph] = useState<string | null>(null);

	const graphOptions = [
		{
			id: 'dashboard',
			title: 'Financial Dashboard',
			description: 'Complete overview with all metrics',
			icon: 'analytics',
			color: '#2E78B7',
		},
		{
			id: 'budget',
			title: 'Budget Overview',
			description: 'Budget allocation vs spending',
			icon: 'wallet',
			color: '#4CAF50',
		},
		{
			id: 'goals',
			title: 'Goals Progress',
			description: 'Financial goals tracking',
			icon: 'flag',
			color: '#FF9800',
		},
		{
			id: 'trends',
			title: 'Spending Trends',
			description: 'Income and expense patterns',
			icon: 'trending-up',
			color: '#9C27B0',
		},
		{
			id: 'categories',
			title: 'Category Breakdown',
			description: 'Spending by category',
			icon: 'pie-chart',
			color: '#F44336',
		},
	];

	const renderSelectedGraph = () => {
		switch (selectedGraph) {
			case 'dashboard':
				return <FinancialDashboard title="Financial Dashboard" />;
			case 'budget':
				return (
					<BudgetOverviewGraph
						budgets={sampleBudgets}
						title="Budget Overview"
					/>
				);
			case 'goals':
				return (
					<GoalsProgressGraph goals={sampleGoals} title="Goals Progress" />
				);
			case 'trends':
				return (
					<SpendingTrendsGraph
						transactions={sampleTransactions}
						title="Spending Trends"
					/>
				);

			default:
				return null;
		}
	};

	return (
		<SafeAreaView style={styles.container}>
			{/* Header */}
			<View style={styles.header}>
				<TouchableOpacity
					style={styles.backButton}
					onPress={() => router.back()}
				>
					<Ionicons name="arrow-back" size={24} color="#1A1A1A" />
				</TouchableOpacity>
				<Text style={styles.headerTitle}>Graph Components</Text>
				<View style={styles.placeholder} />
			</View>

			{/* Graph Selector */}
			{!selectedGraph && (
				<ScrollView style={styles.selectorContainer}>
					<Text style={styles.selectorTitle}>Choose a Graph Component</Text>
					<Text style={styles.selectorSubtitle}>
						Explore different financial visualization options
					</Text>

					{graphOptions.map((option) => (
						<TouchableOpacity
							key={option.id}
							style={styles.graphOption}
							onPress={() => setSelectedGraph(option.id)}
						>
							<View
								style={[
									styles.graphIcon,
									{ backgroundColor: option.color + '20' },
								]}
							>
								<Ionicons
									name={option.icon as any}
									size={24}
									color={option.color}
								/>
							</View>
							<View style={styles.graphInfo}>
								<Text style={styles.graphTitle}>{option.title}</Text>
								<Text style={styles.graphDescription}>
									{option.description}
								</Text>
							</View>
							<Ionicons name="chevron-forward" size={20} color="#CCC" />
						</TouchableOpacity>
					))}
				</ScrollView>
			)}

			{/* Selected Graph */}
			{selectedGraph && (
				<View style={styles.graphContainer}>
					<View style={styles.graphHeader}>
						<TouchableOpacity
							style={styles.backToSelector}
							onPress={() => setSelectedGraph(null)}
						>
							<Ionicons name="arrow-back" size={20} color="#2E78B7" />
							<Text style={styles.backToSelectorText}>Back to Graphs</Text>
						</TouchableOpacity>
					</View>
					<ScrollView
						style={styles.graphScrollView}
						contentContainerStyle={styles.graphScrollContent}
						showsVerticalScrollIndicator={false}
					>
						{renderSelectedGraph()}
					</ScrollView>
				</View>
			)}
		</SafeAreaView>
	);
}

const styles = StyleSheet.create({
	container: {
		flex: 1,
		backgroundColor: '#F8F9FA',
	},
	header: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
		paddingHorizontal: 20,
		paddingVertical: 16,
		backgroundColor: '#FFFFFF',
		borderBottomWidth: 1,
		borderBottomColor: '#E0E0E0',
	},
	backButton: {
		padding: 8,
	},
	headerTitle: {
		fontSize: 18,
		fontWeight: '600',
		color: '#1A1A1A',
	},
	placeholder: {
		width: 40,
	},
	selectorContainer: {
		flex: 1,
		padding: 20,
	},
	selectorTitle: {
		fontSize: 24,
		fontWeight: '700',
		color: '#1A1A1A',
		marginBottom: 8,
	},
	selectorSubtitle: {
		fontSize: 16,
		color: '#666',
		marginBottom: 32,
	},
	graphOption: {
		flexDirection: 'row',
		alignItems: 'center',
		backgroundColor: '#FFFFFF',
		padding: 20,
		borderRadius: 12,
		marginBottom: 16,
		shadowColor: '#000',
		shadowOffset: { width: 0, height: 2 },
		shadowOpacity: 0.1,
		shadowRadius: 4,
		elevation: 2,
	},
	graphIcon: {
		width: 48,
		height: 48,
		borderRadius: 24,
		alignItems: 'center',
		justifyContent: 'center',
		marginRight: 16,
	},
	graphInfo: {
		flex: 1,
	},
	graphTitle: {
		fontSize: 18,
		fontWeight: '600',
		color: '#1A1A1A',
		marginBottom: 4,
	},
	graphDescription: {
		fontSize: 14,
		color: '#666',
	},
	graphContainer: {
		flex: 1,
		overflow: 'hidden',
	},
	graphHeader: {
		paddingHorizontal: 20,
		paddingVertical: 16,
		backgroundColor: '#FFFFFF',
		borderBottomWidth: 1,
		borderBottomColor: '#E0E0E0',
	},
	backToSelector: {
		flexDirection: 'row',
		alignItems: 'center',
	},
	backToSelectorText: {
		marginLeft: 8,
		fontSize: 16,
		fontWeight: '600',
		color: '#2E78B7',
	},
	graphScrollView: {
		flex: 1,
		overflow: 'hidden',
	},
	graphScrollContent: {
		padding: 20,
		paddingBottom: 40,
	},
});
