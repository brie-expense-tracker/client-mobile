import React, { useState, useEffect } from 'react';
import {
	View,
	Text,
	TouchableOpacity,
	StyleSheet,
	SafeAreaView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams } from 'expo-router';
import * as Haptics from 'expo-haptics';
import BudgetScreen from './index';
import GoalsScreen from './goals';
import RecurringExpensesScreen from './recurringExpenses';
import {
	accessibilityProps,
	dynamicTextStyle,
	generateAccessibilityLabel,
	voiceOverHints,
} from '../../../src/utils/accessibility';
import { palette, space } from '../../../src/ui/theme';

export default function BudgetLayout() {
	const [activeTab, setActiveTab] = useState('budgets');
	const params = useLocalSearchParams();

	// Auto-switch to appropriate tab based on tab parameter
	useEffect(() => {
		if (params.tab === 'goals') {
			setActiveTab('goals');
		} else if (params.tab === 'budgets') {
			setActiveTab('budgets');
		} else if (params.tab === 'recurring') {
			setActiveTab('recurring');
		}
	}, [params.tab]);

	// Handle tab selection with haptic feedback
	const handleTabPress = async (tabName: string) => {
		if (activeTab !== tabName) {
			// Add haptic feedback with error handling
			try {
				await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
			} catch (error) {
				// Haptics not available on this device, silently continue
				console.warn('Haptic feedback not available:', error);
			}
			setActiveTab(tabName);
		}
	};

	return (
		<SafeAreaView style={styles.container}>
			<View style={styles.container}>
				{/* Custom Header with Tabs */}
				<View style={styles.header}>
					<View
						style={styles.tabContainer}
						accessibilityRole="tablist"
						accessibilityLabel="Budget management tabs"
					>
						<TouchableOpacity
							style={[styles.tab, activeTab === 'budgets' && styles.activeTab]}
							onPress={() => handleTabPress('budgets')}
							{...accessibilityProps.button}
							accessibilityRole="tab"
							accessibilityLabel={generateAccessibilityLabel.button(
								'Budgets',
								'tab'
							)}
							accessibilityHint={voiceOverHints.select}
							accessibilityState={{ selected: activeTab === 'budgets' }}
						>
							<Ionicons
								name="wallet-outline"
								size={20}
								color={
									activeTab === 'budgets' ? palette.text : palette.textMuted
								}
								accessibilityRole="image"
								accessibilityLabel="Budgets icon"
							/>
							<Text
								style={[
									styles.tabText,
									activeTab === 'budgets' && styles.activeTabText,
									dynamicTextStyle,
								]}
								accessibilityRole="text"
							>
								Budgets
							</Text>
						</TouchableOpacity>

						<TouchableOpacity
							style={[styles.tab, activeTab === 'goals' && styles.activeTab]}
							onPress={() => handleTabPress('goals')}
							{...accessibilityProps.button}
							accessibilityRole="tab"
							accessibilityLabel={generateAccessibilityLabel.button(
								'Goals',
								'tab'
							)}
							accessibilityHint={voiceOverHints.select}
							accessibilityState={{ selected: activeTab === 'goals' }}
						>
							<Ionicons
								name="flag-outline"
								size={20}
								color={activeTab === 'goals' ? palette.text : palette.textMuted}
								accessibilityRole="image"
								accessibilityLabel="Goals icon"
							/>
							<Text
								style={[
									styles.tabText,
									activeTab === 'goals' && styles.activeTabText,
									dynamicTextStyle,
								]}
								accessibilityRole="text"
							>
								Goals
							</Text>
						</TouchableOpacity>

						<TouchableOpacity
							style={[
								styles.tab,
								activeTab === 'recurring' && styles.activeTab,
							]}
							onPress={() => handleTabPress('recurring')}
							{...accessibilityProps.button}
							accessibilityRole="tab"
							accessibilityLabel={generateAccessibilityLabel.button(
								'Recurring',
								'tab'
							)}
							accessibilityHint={voiceOverHints.select}
							accessibilityState={{ selected: activeTab === 'recurring' }}
						>
							<Ionicons
								name="repeat-outline"
								size={20}
								color={
									activeTab === 'recurring' ? palette.text : palette.textMuted
								}
								accessibilityRole="image"
								accessibilityLabel="Recurring expenses icon"
							/>
							<Text
								style={[
									styles.tabText,
									activeTab === 'recurring' && styles.activeTabText,
									dynamicTextStyle,
								]}
								accessibilityRole="text"
							>
								Recurring
							</Text>
						</TouchableOpacity>
					</View>
				</View>

				{/* Content Area */}
				<View
					style={styles.content}
					accessibilityLabel={`${activeTab} content`}
				>
					{activeTab === 'budgets' ? (
						<BudgetScreen />
					) : activeTab === 'goals' ? (
						<GoalsScreen />
					) : (
						<RecurringExpensesScreen />
					)}
				</View>
			</View>
		</SafeAreaView>
	);
}

const styles = StyleSheet.create({
	container: {
		flex: 1,
		backgroundColor: palette.bg,
	},
	header: {
		backgroundColor: palette.bg,
		borderBottomWidth: 1,
		borderBottomColor: palette.border,
	},
	tabContainer: {
		flexDirection: 'row',
		paddingHorizontal: space.xl,
	},
	tab: {
		flex: 1,
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'center',
		paddingVertical: space.md,
		marginHorizontal: 4,
		borderBottomWidth: 2,
		borderBottomColor: 'transparent',
	},
	activeTab: {
		borderBottomColor: palette.text,
	},
	tabText: {
		marginLeft: 8,
		fontSize: 16,
		fontWeight: '600',
		color: palette.textMuted,
	},

	activeTabText: {
		color: palette.text,
	},
	content: {
		flex: 1,
	},
});
