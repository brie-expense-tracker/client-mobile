import React, { useState } from 'react';
import {
	View,
	Text,
	TouchableOpacity,
	StyleSheet,
	SafeAreaView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import BudgetScreen from './index';
import GoalsScreen from './goals';

export default function BudgetLayout() {
	const [activeTab, setActiveTab] = useState('budgets');

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
								color={activeTab === 'budgets' ? '#007ACC' : '#757575'}
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
								color={activeTab === 'goals' ? '#007ACC' : '#757575'}
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
					</View>
				</View>

				{/* Content Area */}
				<View style={styles.content}>
					{activeTab === 'budgets' ? <BudgetScreen /> : <GoalsScreen />}
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
		borderBottomWidth: 3,
		borderBottomColor: '#007ACC',
	},
	tabText: {
		marginLeft: 8,
		fontSize: 16,
		fontWeight: '500',
		color: '#757575',
	},
	activeTabText: {
		color: '#007ACC',
	},
	content: {
		flex: 1,
	},
});
