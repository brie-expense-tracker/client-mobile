// ledgerFilter.tsx
import React, { useState, useContext, useMemo } from 'react';
import {
	View,
	Text,
	StyleSheet,
	TouchableOpacity,
	ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router, Stack } from 'expo-router';
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

	return (
		<View style={styles.mainContainer}>
			<ScrollView contentContainerStyle={styles.scrollContent}>
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

				<View style={styles.divider} />

				{/* Goals */}
				<Section title="Goals">
					<SectionSubtext>Select which goals to include (income transactions)</SectionSubtext>

					{/* "All" option */}
					<OptionRow
						label="All Goals"
						selected={localSelectedGoals.length === 0}
						onPress={() => handleGoalToggle('')}
					/>

					{goals.length ? (
						goals.map((goal) => (
							<OptionRow
								key={goal.id}
								label={goal.name}
								selected={localSelectedGoals.includes(goal.id)}
								onPress={() => handleGoalToggle(goal.id)}
							/>
						))
					) : (
						<Text style={styles.noCatsText}>No goals available</Text>
					)}
				</Section>

				<View style={styles.divider} />

				{/* Budgets */}
				<Section title="Budgets">
					<SectionSubtext>Select which budgets to include (expense transactions)</SectionSubtext>

					{/* "All" option */}
					<OptionRow
						label="All Budgets"
						selected={localSelectedBudgets.length === 0}
						onPress={() => handleBudgetToggle('')}
					/>

					{budgets.length ? (
						budgets.map((budget) => (
							<OptionRow
								key={budget.id}
								label={budget.category}
								selected={localSelectedBudgets.includes(budget.id)}
								onPress={() => handleBudgetToggle(budget.id)}
							/>
						))
					) : (
						<Text style={styles.noCatsText}>No budgets available</Text>
					)}
				</Section>
			</ScrollView>
			<Stack.Screen
				options={{
					headerShown: true,
					headerBackButtonDisplayMode: 'minimal',
					headerTitle: 'Filter',
					headerShadowVisible: false,
					headerTitleStyle: {
						fontSize: 20,
						fontWeight: '600',
						color: '#333',
					},
					headerStyle: {
						backgroundColor: '#ffffff',
					},

					headerLeft: () => (
						<TouchableOpacity onPress={handleBack} style={{}}>
							<Ionicons name="chevron-back" size={24} color="#212121" />
						</TouchableOpacity>
					),
				}}
			/>
		</View>
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
	scrollContent: {
		padding: 16,
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
});
