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
import { TransactionContext } from '../../../../src/context/transactionContext';

export default function LedgerFilterScreen() {
	const {
		selectedCategories,
		setSelectedCategories,
		dateFilterMode,
		setDateFilterMode,
	} = useContext(FilterContext);

	// --- get all transactions to derive categories ---
	const { transactions } = useContext(TransactionContext);

	// Initialize local state from context
	const [localSelectedCategories, setLocalSelectedCategories] =
		useState<string[]>(selectedCategories);
	const [localDateFilterMode, setLocalDateFilterMode] =
		useState<string>(dateFilterMode);

	// --- derive available categories from the full list ---
	const availableCategories = useMemo(() => {
		const cats = new Set<string>();
		transactions.forEach((tx) => {
			tx.categories.forEach((c) => {
				if (c.name && c.name.trim()) cats.add(c.name.trim());
			});
		});
		return Array.from(cats).sort((a, b) => a.localeCompare(b));
	}, [transactions]);

	const handleCategoryToggle = (cat: string) => {
		if (cat === '') {
			setLocalSelectedCategories([]);
		} else if (localSelectedCategories.includes(cat)) {
			setLocalSelectedCategories(
				localSelectedCategories.filter((c) => c !== cat)
			);
		} else {
			setLocalSelectedCategories([...localSelectedCategories, cat]);
		}
	};

	const handleBack = () => {
		// push edits back into global filter context
		setSelectedCategories(localSelectedCategories);
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

				{/* Categories */}
				<Section title="Categories">
					<SectionSubtext>Select which categories to include</SectionSubtext>

					{/* "All" option */}
					<OptionRow
						label="All Categories"
						selected={localSelectedCategories.length === 0}
						onPress={() => handleCategoryToggle('')}
					/>

					{availableCategories.length ? (
						availableCategories.map((cat) => (
							<OptionRow
								key={cat}
								label={cat}
								selected={localSelectedCategories.includes(cat)}
								onPress={() => handleCategoryToggle(cat)}
							/>
						))
					) : (
						<Text style={styles.noCatsText}>No categories available</Text>
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
