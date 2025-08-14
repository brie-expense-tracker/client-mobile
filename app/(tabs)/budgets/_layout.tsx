import React, { useState, useEffect } from 'react';
import {
	View,
	Text,
	TouchableOpacity,
	StyleSheet,
	SafeAreaView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useSegments, router } from 'expo-router';
import BudgetScreen from './index';
import GoalsScreen from './goals';
import RecurringExpensesScreen from './recurringExpenses';

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

	return (
		<SafeAreaView style={styles.container}>
			<View style={styles.container}>
				{/* Custom Header with Tabs */}
				<View style={styles.header}>
					<View style={styles.tabContainer}>
						<TouchableOpacity
							style={[styles.tab, activeTab === 'budgets' && styles.activeTab]}
							onPress={() => setActiveTab('budgets')}
						>
							<Ionicons
								name="wallet-outline"
								size={20}
								color={activeTab === 'budgets' ? '#222222' : '#757575'}
							/>
							<Text
								style={[
									styles.tabText,
									activeTab === 'budgets' && styles.activeTabText,
								]}
							>
								Budgets
							</Text>
						</TouchableOpacity>

						<TouchableOpacity
							style={[styles.tab, activeTab === 'goals' && styles.activeTab]}
							onPress={() => setActiveTab('goals')}
						>
							<Ionicons
								name="flag-outline"
								size={20}
								color={activeTab === 'goals' ? '#222222' : '#757575'}
							/>
							<Text
								style={[
									styles.tabText,
									activeTab === 'goals' && styles.activeTabText,
								]}
							>
								Goals
							</Text>
						</TouchableOpacity>

						<TouchableOpacity
							style={[
								styles.tab,
								activeTab === 'recurring' && styles.activeTab,
							]}
							onPress={() => setActiveTab('recurring')}
						>
							<Ionicons
								name="repeat-outline"
								size={20}
								color={activeTab === 'recurring' ? '#222222' : '#757575'}
							/>
							<Text
								style={[
									styles.tabText,
									activeTab === 'recurring' && styles.activeTabText,
								]}
							>
								Recurring
							</Text>
						</TouchableOpacity>
					</View>
				</View>

				{/* Content Area */}
				<View style={styles.content}>
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
		backgroundColor: '#fff',
	},
	header: {
		backgroundColor: '#fff',
		borderBottomWidth: 1,
		borderBottomColor: '#e0e0e0',
	},
	tabContainer: {
		flexDirection: 'row',
		paddingHorizontal: 24,
	},
	tab: {
		flex: 1,
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'center',
		paddingVertical: 12,
		marginHorizontal: 4,
	},
	activeTab: {
		borderBottomWidth: 2,
		borderBottomColor: '#222222',
	},
	tabText: {
		marginLeft: 8,
		fontSize: 16,
		fontWeight: '600',
		color: '#757575',
	},
	
	activeTabText: {
		color: '#222222',
	},
	content: {
		flex: 1,
	},
});
