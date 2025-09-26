import React from 'react';
import { StyleSheet, View, Text, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import SmartSuggestions from './SmartSuggestions';
import { InterfaceMode } from '../../../../src/services/assistant/types';

interface InterfacePanelProps {
	type: InterfaceMode;
	onClose: () => void;
	onPickPrompt: (text: string) => void;
}

export default function InterfacePanel({
	type,
	onClose,
	onPickPrompt,
}: InterfacePanelProps) {
	const router = useRouter();

	const getPanelConfig = () => {
		switch (type) {
			case 'INSIGHTS':
				return {
					icon: 'analytics',
					title: 'AI Insights',
					color: '#8b5cf6',
					iconColor: '#3b82f6',
				};
			case 'ACTIONS':
				return {
					icon: 'flash',
					title: 'Quick Actions',
					color: '#10b981',
					iconColor: '#10b981',
				};
			default:
				return {
					icon: 'sparkles',
					title: 'AI Panel',
					color: '#3b82f6',
					iconColor: '#3b82f6',
				};
		}
	};

	const config = getPanelConfig();

	const renderActionsGrid = () => {
		if (type === 'ACTIONS') {
			return (
				<View style={styles.actionsGrid}>
					<TouchableOpacity
						style={styles.actionButton}
						onPress={() => {
							onClose();
							router.push('/(stack)/addBudget');
						}}
					>
						<Ionicons name="add-circle" size={24} color="#3b82f6" />
						<Text style={styles.actionText}>Create Budget</Text>
					</TouchableOpacity>

					<TouchableOpacity
						style={styles.actionButton}
						onPress={() => {
							onClose();
							router.push('/(stack)/addGoal');
						}}
					>
						<Ionicons name="flag" size={24} color="#10b981" />
						<Text style={styles.actionText}>Set Goal</Text>
					</TouchableOpacity>

					<TouchableOpacity
						style={styles.actionButton}
						onPress={() => {
							onClose();
							router.push('/(tabs)/transaction/expense');
						}}
					>
						<Ionicons name="add" size={24} color="#f59e0b" />
						<Text style={styles.actionText}>Add Expense</Text>
					</TouchableOpacity>

					<TouchableOpacity
						style={styles.actionButton}
						onPress={() => {
							onClose();
							onPickPrompt('Show me my spending analysis');
						}}
					>
						<Ionicons name="analytics" size={24} color="#8b5cf6" />
						<Text style={styles.actionText}>Analyze Spending</Text>
					</TouchableOpacity>
				</View>
			);
		}
		return null;
	};

	return (
		<View style={styles.interfacePanel}>
			<View style={styles.panelHeader}>
				<Ionicons
					name={config.icon as any}
					size={20}
					color={config.iconColor}
				/>
				<Text style={styles.panelTitle}>{config.title}</Text>
				<TouchableOpacity onPress={onClose} style={styles.closeButton}>
					<Ionicons name="close" size={20} color="#6b7280" />
				</TouchableOpacity>
			</View>

			{renderActionsGrid()}

			{/* Smart suggestions for the current mode */}
			<SmartSuggestions onPick={onPickPrompt} mode={type} />
		</View>
	);
}

const styles = StyleSheet.create({
	interfacePanel: {
		backgroundColor: '#ffffff',
		borderBottomWidth: 1,
		borderBottomColor: '#e2e8f0',
		paddingHorizontal: 20,
		paddingBottom: 20,
		shadowColor: '#000',
		shadowOpacity: 0.05,
		shadowRadius: 8,
		shadowOffset: { width: 0, height: -2 },
		elevation: 3,
	},
	panelHeader: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
		marginBottom: 12,
		paddingTop: 16,
	},
	panelTitle: {
		fontSize: 18,
		fontWeight: '700',
		color: '#1e293b',
		flex: 1,
		textAlign: 'center',
	},
	closeButton: {
		padding: 8,
	},
	actionsGrid: {
		flexDirection: 'row',
		flexWrap: 'wrap',
		justifyContent: 'space-around',
		gap: 12,
	},
	actionButton: {
		flex: 1,
		alignItems: 'center',
		backgroundColor: '#f1f5f9',
		borderRadius: 12,
		paddingVertical: 16,
		paddingHorizontal: 12,
		borderWidth: 1,
		borderColor: '#e2e8f0',
		shadowColor: '#000',
		shadowOpacity: 0.04,
		shadowRadius: 4,
		shadowOffset: { width: 0, height: 1 },
		elevation: 1,
	},
	actionText: {
		fontSize: 12,
		fontWeight: '600',
		color: '#374151',
		marginTop: 8,
	},
});
