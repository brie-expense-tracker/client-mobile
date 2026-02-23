// ledgerFilter.tsx
import React, { useState, useContext, useMemo } from 'react';
import {
	View,
	Text,
	StyleSheet,
	TouchableOpacity,
	ScrollView,
	SafeAreaView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { dateFilterModes } from './_layout';
import { FilterContext } from '../../../../src/context/filterContext';

export default function LedgerFilterScreen() {
	const {
		dateFilterMode,
		setDateFilterMode,
		transactionTypes,
		setTransactionTypes,
	} = useContext(FilterContext);

	const [localDateFilterMode, setLocalDateFilterMode] =
		useState<string>(dateFilterMode);

	const handleBack = () => {
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
		setLocalDateFilterMode('month');
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
});
