// ledgerFilter.tsx
import React, { useState, useContext, useMemo } from 'react';
import {
	View,
	Text,
	StyleSheet,
	TouchableOpacity,
	ScrollView,
	SafeAreaView,
	TextInput,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { dateFilterModes } from './_layout';
import { FilterContext } from '../../../../src/context/filterContext';
import { useBudget } from '../../../../src/context/budgetContext';
import { useGoal } from '../../../../src/context/goalContext';

export default function LedgerFilterScreen() {
	const {
		selectedGoals,
		setSelectedGoals,
		selectedBudgets,
		setSelectedBudgets,
		dateFilterMode,
		setDateFilterMode,
		transactionTypes,
		setTransactionTypes,
	} = useContext(FilterContext);

	// Get goals and budgets from context
	const { goals } = useGoal();
	const { budgets } = useBudget();

	// Initialize local state from context
	const [localSelectedGoals, setLocalSelectedGoals] =
		useState<string[]>(selectedGoals);
	const [localSelectedBudgets, setLocalSelectedBudgets] =
		useState<string[]>(selectedBudgets);
	const [localDateFilterMode, setLocalDateFilterMode] =
		useState<string>(dateFilterMode);

	// Search and filter state
	const [goalSearchQuery, setGoalSearchQuery] = useState('');
	const [budgetSearchQuery, setBudgetSearchQuery] = useState('');

	// Filter goals and budgets based on search query
	const filteredGoals = useMemo(() => {
		if (!goalSearchQuery.trim()) return goals;
		return goals.filter((goal) =>
			goal.name.toLowerCase().includes(goalSearchQuery.toLowerCase())
		);
	}, [goals, goalSearchQuery]);

	const filteredBudgets = useMemo(() => {
		if (!budgetSearchQuery.trim()) return budgets;
		return budgets.filter((budget) =>
			budget.name.toLowerCase().includes(budgetSearchQuery.toLowerCase())
		);
	}, [budgets, budgetSearchQuery]);

	const handleGoalToggle = (goalId: string) => {
		if (goalId === '') {
			setLocalSelectedGoals([]);
		} else if (localSelectedGoals.includes(goalId)) {
			setLocalSelectedGoals(localSelectedGoals.filter((id) => id !== goalId));
		} else {
			setLocalSelectedGoals([...localSelectedGoals, goalId]);
		}
	};

	const handleBudgetToggle = (budgetId: string) => {
		if (budgetId === '') {
			setLocalSelectedBudgets([]);
		} else if (localSelectedBudgets.includes(budgetId)) {
			setLocalSelectedBudgets(
				localSelectedBudgets.filter((id) => id !== budgetId)
			);
		} else {
			setLocalSelectedBudgets([...localSelectedBudgets, budgetId]);
		}
	};

	const handleBack = () => {
		// push edits back into global filter context
		setSelectedGoals(localSelectedGoals);
		setSelectedBudgets(localSelectedBudgets);
		setDateFilterMode(localDateFilterMode);
		router.back();
	};

	const handleApply = () => {
		// Apply changes and go back
		handleBack();
	};

	const handleTransactionTypeToggle = (type: 'income' | 'expense') => {
		const newTypes = {
			...transactionTypes,
			[type]: !transactionTypes[type],
		};

		// Prevent deselecting both types - at least one must be selected
		if (!newTypes.income && !newTypes.expense) {
			// If both would be false, don't update the state
			return;
		}

		setTransactionTypes(newTypes);
	};

	const handleReset = () => {
		// Reset to default values
		setLocalSelectedGoals([]);
		setLocalSelectedBudgets([]);
		setLocalDateFilterMode('month');
		setGoalSearchQuery('');
		setBudgetSearchQuery('');
		setTransactionTypes({ income: true, expense: true });
	};

	return (
		<SafeAreaView style={styles.mainContainer}>
			<ScrollView contentContainerStyle={styles.scrollContent}>
				{/* Transaction Types */}
				<Section title="Transaction Types">
					<SectionSubtext>
						Select which types of transactions to show
					</SectionSubtext>
					<OptionRow
						label="Income"
						selected={transactionTypes.income}
						onPress={() => handleTransactionTypeToggle('income')}
					/>
					<OptionRow
						label="Expenses"
						selected={transactionTypes.expense}
						onPress={() => handleTransactionTypeToggle('expense')}
					/>
				</Section>

				{/* Date Range */}
				<Section title="Date Range">
					<SectionSubtext>Choose how to filter by date</SectionSubtext>
					{dateFilterModes.map((mode) => (
						<OptionRow
							key={mode.value}
							label={mode.label}
							selected={localDateFilterMode === mode.value}
							onPress={() => setLocalDateFilterMode(mode.value)}
						/>
					))}
				</Section>

				{/* Goals */}
				<Section title="Goals">
					<SectionSubtext>
						Select which goals to include (income transactions)
					</SectionSubtext>

					{/* Search Input */}
					<View style={styles.searchContainer}>
						<Ionicons
							name="search"
							size={20}
							color="#666"
							style={styles.searchIcon}
						/>
						<TextInput
							style={styles.searchInput}
							placeholder="Search goals..."
							value={goalSearchQuery}
							onChangeText={setGoalSearchQuery}
							placeholderTextColor="#999"
						/>
					</View>

					{/* "All" option */}
					<OptionRow
						label="All Goals"
						selected={localSelectedGoals.length === 0}
						onPress={() => handleGoalToggle('')}
					/>

					{filteredGoals.length ? (
						filteredGoals.map((goal) => (
							<OptionRow
								key={goal.id}
								label={goal.name}
								selected={localSelectedGoals.includes(goal.id)}
								onPress={() => handleGoalToggle(goal.id)}
							/>
						))
					) : (
						<Text style={styles.noCatsText}>
							{goalSearchQuery
								? 'No goals found matching your search'
								: 'No goals available'}
						</Text>
					)}
				</Section>

				{/* Budgets */}
				<Section title="Budgets">
					<SectionSubtext>
						Select which budgets to include (expense transactions)
					</SectionSubtext>

					{/* Search Input */}
					<View style={styles.searchContainer}>
						<Ionicons
							name="search"
							size={20}
							color="#666"
							style={styles.searchIcon}
						/>
						<TextInput
							style={styles.searchInput}
							placeholder="Search budgets..."
							value={budgetSearchQuery}
							onChangeText={setBudgetSearchQuery}
							placeholderTextColor="#999"
						/>
					</View>

					{/* "All" option */}
					<OptionRow
						label="All Budgets"
						selected={localSelectedBudgets.length === 0}
						onPress={() => handleBudgetToggle('')}
					/>

					{filteredBudgets.length ? (
						filteredBudgets.map((budget) => (
							<OptionRow
								key={budget.id}
								label={budget.name}
								selected={localSelectedBudgets.includes(budget.id)}
								onPress={() => handleBudgetToggle(budget.id)}
							/>
						))
					) : (
						<Text style={styles.noCatsText}>
							{budgetSearchQuery
								? 'No budgets found matching your search'
								: 'No budgets available'}
						</Text>
					)}
				</Section>
			</ScrollView>

			{/* Action Buttons */}
			<View style={styles.actionButtons}>
				<TouchableOpacity onPress={handleReset} style={styles.resetButton}>
					<Text style={styles.resetButtonText}>Reset</Text>
				</TouchableOpacity>
				<TouchableOpacity onPress={handleApply} style={styles.applyButton}>
					<Text style={styles.applyButtonText}>Apply Filters</Text>
				</TouchableOpacity>
			</View>
		</SafeAreaView>
	);
}
// ——— Shared sub-components ——————————————————————————————————

const Section = ({
	title,
	children,
}: {
	title: string;
	children: React.ReactNode;
}) => (
	<View style={{ marginBottom: 32 }}>
		<Text style={styles.sectionHeader}>{title}</Text>
		{children}
	</View>
);

const SectionSubtext = ({ children }: { children: React.ReactNode }) => (
	<Text style={styles.sectionSubtext}>{children}</Text>
);

const OptionRow = ({
	label,
	selected,
	onPress,
}: {
	label: string;
	selected: boolean;
	onPress: () => void;
}) => (
	<TouchableOpacity style={styles.optionRow} onPress={onPress}>
		<Text style={styles.optionLabel}>{label}</Text>
		<Text style={[styles.check, selected && styles.checkSelected]}>
			{selected ? '✓' : ''}
		</Text>
	</TouchableOpacity>
);

// ——— Styles —————————————————————————————————————————————————

const styles = StyleSheet.create({
	mainContainer: {
		flex: 1,
		backgroundColor: '#fff',
	},

	backButton: {
		padding: 4,
	},

	scrollContent: {
		padding: 16,
		paddingBottom: 100, // Space for action buttons
	},
	divider: {
		height: 1,
		backgroundColor: '#e2e2e2',
		marginVertical: 16,
	},
	sectionHeader: {
		fontSize: 18,
		fontWeight: '600',
		color: '#333',
		marginBottom: 12,
	},
	sectionSubtext: {
		fontSize: 12,
		color: '#666',
		marginBottom: 12,
	},
	optionRow: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		alignItems: 'center',
		paddingVertical: 12,
		borderBottomWidth: 1,
		borderBottomColor: '#efefef',
	},
	optionLabel: {
		fontSize: 16,
		color: '#333',
	},
	check: {
		fontSize: 18,
		color: '#ccc',
		fontWeight: 'bold',
	},
	checkSelected: {
		color: '#007AFF',
	},
	noCatsText: {
		fontStyle: 'italic',
		color: '#666',
		marginTop: 8,
		paddingHorizontal: 4,
	},
	actionButtons: {
		flexDirection: 'row',
		paddingHorizontal: 16,
		paddingVertical: 12,
		backgroundColor: '#fff',
		borderTopWidth: 1,
		borderTopColor: '#e2e2e2',
		position: 'absolute',
		bottom: 0,
		left: 0,
		right: 0,
	},
	resetButton: {
		flex: 1,
		backgroundColor: '#f5f5f5',
		paddingVertical: 12,
		paddingHorizontal: 16,
		borderRadius: 8,
		marginRight: 8,
		alignItems: 'center',
	},
	resetButtonText: {
		color: '#666',
		fontSize: 16,
		fontWeight: '500',
	},
	applyButton: {
		flex: 1,
		backgroundColor: '#007AFF',
		paddingVertical: 12,
		paddingHorizontal: 16,
		borderRadius: 8,
		marginLeft: 8,
		alignItems: 'center',
	},
	applyButtonText: {
		color: '#fff',
		fontSize: 16,
		fontWeight: '600',
	},
	searchContainer: {
		flexDirection: 'row',
		alignItems: 'center',
		backgroundColor: '#f5f5f5',
		borderRadius: 8,
		paddingHorizontal: 12,
		marginBottom: 12,
		borderWidth: 1,
		borderColor: '#e2e2e2',
	},
	searchIcon: {
		marginRight: 8,
	},
	searchInput: {
		flex: 1,
		paddingVertical: 10,
		fontSize: 16,
		color: '#333',
	},
});
