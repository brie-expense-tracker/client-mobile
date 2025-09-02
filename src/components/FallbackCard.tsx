import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

type Action = {
	label: string;
	action:
		| 'CONNECT_ACCOUNT'
		| 'OPEN_BUDGET'
		| 'PICK_TIME_WINDOW'
		| 'CREATE_RULE'
		| 'MARK_PAID'
		| 'SET_LIMIT';
	payload?: any;
};

interface FallbackCardProps {
	status: string;
	tinyFact?: string;
	actions: Action[];
	timeWindow: { start: string; end: string; tz: string };
	onAction: (action: Action) => void;
}

export function FallbackCard({
	status,
	tinyFact,
	actions,
	timeWindow,
	onAction,
}: FallbackCardProps) {
	const getActionIcon = (action: string) => {
		switch (action) {
			case 'CONNECT_ACCOUNT':
				return 'link';
			case 'OPEN_BUDGET':
				return 'wallet';
			case 'PICK_TIME_WINDOW':
				return 'calendar';
			case 'CREATE_RULE':
				return 'add-circle';
			case 'MARK_PAID':
				return 'checkmark-circle';
			case 'SET_LIMIT':
				return 'settings';
			default:
				return 'arrow-forward';
		}
	};

	const getActionColor = (action: string) => {
		switch (action) {
			case 'CONNECT_ACCOUNT':
				return '#3b82f6'; // Blue
			case 'OPEN_BUDGET':
				return '#10b981'; // Green
			case 'PICK_TIME_WINDOW':
				return '#f59e0b'; // Amber
			case 'CREATE_RULE':
				return '#8b5cf6'; // Purple
			case 'MARK_PAID':
				return '#059669'; // Emerald
			case 'SET_LIMIT':
				return '#dc2626'; // Red
			default:
				return '#6b7280'; // Gray
		}
	};

	return (
		<View style={styles.container}>
			<Text style={styles.status}>{status}</Text>

			<View style={styles.timeWindowContainer}>
				<Ionicons name="time" size={14} color="#6b7280" />
				<Text style={styles.timeWindowText}>
					{timeWindow.start}–{timeWindow.end} • {timeWindow.tz}
				</Text>
			</View>

			{tinyFact && (
				<View style={styles.factContainer}>
					<Ionicons name="information-circle" size={16} color="#3b82f6" />
					<Text style={styles.factText}>{tinyFact}</Text>
				</View>
			)}

			<View style={styles.actionsContainer}>
				{actions.slice(0, 3).map((action, index) => (
					<TouchableOpacity
						key={index}
						style={[
							styles.actionButton,
							{ borderColor: getActionColor(action.action) },
						]}
						onPress={() => onAction(action)}
						activeOpacity={0.7}
					>
						<Ionicons
							name={getActionIcon(action.action) as any}
							size={16}
							color={getActionColor(action.action)}
						/>
						<Text
							style={[
								styles.actionText,
								{ color: getActionColor(action.action) },
							]}
						>
							{action.label}
						</Text>
					</TouchableOpacity>
				))}
			</View>
		</View>
	);
}

const styles = StyleSheet.create({
	container: {
		padding: 16,
		borderRadius: 16,
		backgroundColor: '#ffffff',
		shadowColor: '#000',
		shadowOpacity: 0.1,
		shadowRadius: 8,
		shadowOffset: { width: 0, height: 2 },
		elevation: 3,
		marginHorizontal: 20,
		marginVertical: 8,
	},
	status: {
		fontSize: 16,
		fontWeight: '600',
		color: '#1f2937',
		lineHeight: 22,
	},
	timeWindowContainer: {
		flexDirection: 'row',
		alignItems: 'center',
		marginTop: 8,
		gap: 6,
	},
	timeWindowText: {
		fontSize: 12,
		color: '#6b7280',
		fontWeight: '500',
	},
	factContainer: {
		flexDirection: 'row',
		alignItems: 'flex-start',
		marginTop: 12,
		gap: 8,
		padding: 12,
		backgroundColor: '#f8fafc',
		borderRadius: 8,
		borderLeftWidth: 3,
		borderLeftColor: '#3b82f6',
	},
	factText: {
		fontSize: 14,
		color: '#374151',
		lineHeight: 20,
		flex: 1,
	},
	actionsContainer: {
		flexDirection: 'row',
		flexWrap: 'wrap',
		marginTop: 16,
		gap: 8,
	},
	actionButton: {
		flexDirection: 'row',
		alignItems: 'center',
		paddingHorizontal: 12,
		paddingVertical: 8,
		borderRadius: 12,
		backgroundColor: '#ffffff',
		borderWidth: 1.5,
		gap: 6,
		minWidth: 100,
		justifyContent: 'center',
	},
	actionText: {
		fontSize: 13,
		fontWeight: '600',
	},
});
