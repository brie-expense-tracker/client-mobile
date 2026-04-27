// ledgerFilter.tsx
import React, { useState } from 'react';
import {
	View,
	Text,
	StyleSheet,
	TouchableOpacity,
	ScrollView,
	SafeAreaView,
} from 'react-native';
import { router } from 'expo-router';
import { dateFilterModes } from './_layout';
import {
	useFilter,
	type DateFilterMode,
} from '../../../../src/context/filterContext';
import { palette, radius, space, type } from '../../../../src/ui/theme';

export default function LedgerFilterScreen() {
	const {
		dateFilterMode,
		setDateFilterMode,
		transactionTypes,
		setTransactionTypes,
	} = useFilter();

	const [localDateFilterMode, setLocalDateFilterMode] =
		useState<DateFilterMode>(dateFilterMode);

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
				{/* Cash In / Cash Out (MVP terminology) */}
				<Section title="Show">
					<SectionSubtext>
						Select Cash In, Cash Out, or both
					</SectionSubtext>
					<OptionRow
						label="Cash In"
						selected={transactionTypes.income}
						onPress={() => handleTransactionTypeToggle('income')}
					/>
					<OptionRow
						label="Cash Out"
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
							onPress={() => setLocalDateFilterMode(mode.value as DateFilterMode)}
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
		backgroundColor: palette.bg,
	},
	scrollContent: {
		padding: space.lg,
		paddingBottom: 100,
	},
	sectionHeader: {
		...type.h2,
		color: palette.text,
		marginBottom: 12,
	},
	sectionSubtext: {
		fontSize: 12,
		color: palette.textMuted,
		marginBottom: 12,
	},
	optionRow: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		alignItems: 'center',
		paddingVertical: 12,
		borderBottomWidth: 1,
		borderBottomColor: palette.border,
	},
	optionLabel: {
		fontSize: 16,
		color: palette.text,
	},
	check: {
		fontSize: 18,
		color: palette.textSubtle,
		fontWeight: 'bold',
	},
	checkSelected: {
		color: palette.primary,
	},
	actionButtons: {
		flexDirection: 'row',
		paddingHorizontal: space.lg,
		paddingVertical: 12,
		backgroundColor: palette.bg,
		borderTopWidth: 1,
		borderTopColor: palette.border,
		position: 'absolute',
		bottom: 0,
		left: 0,
		right: 0,
	},
	resetButton: {
		flex: 1,
		backgroundColor: palette.surfaceAlt,
		paddingVertical: 12,
		paddingHorizontal: space.lg,
		borderRadius: radius.xl2,
		marginRight: space.sm,
		alignItems: 'center',
	},
	resetButtonText: {
		color: palette.textMuted,
		fontSize: 16,
		fontWeight: '500',
	},
	applyButton: {
		flex: 1,
		backgroundColor: palette.primary,
		paddingVertical: 12,
		paddingHorizontal: space.lg,
		borderRadius: radius.xl2,
		marginLeft: space.sm,
		alignItems: 'center',
	},
	applyButtonText: {
		color: palette.textOnPrimary,
		fontSize: 16,
		fontWeight: '600',
	},
});
