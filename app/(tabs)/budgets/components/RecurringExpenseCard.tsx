import React from 'react';
import {
	View,
	Text,
	StyleSheet,
	TouchableOpacity,
	ActivityIndicator,
	Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const { width } = Dimensions.get('window');
const LIST_ITEM_WIDTH = width - 48;

type RecurringExpenseCardProps = {
	vendor: string;
	amount: number;
	dueInDays: number;
	nextDueDate: string;
	frequency: string;
	onPressMarkPaid?: () => void;
	onPressEdit?: () => void;
	iconName?: keyof typeof Ionicons.glyphMap;
	color?: string; // category tint (e.g., Netflix = purple)
	isPaid?: boolean;
	isProcessing?: boolean;
};

const RecurringExpenseCard: React.FC<RecurringExpenseCardProps> = ({
	vendor,
	amount,
	dueInDays,
	nextDueDate,
	frequency,
	onPressMarkPaid,
	onPressEdit,
	iconName = 'repeat-outline',
	color = '#1E88E5', // Default: blue
	isPaid = false,
	isProcessing = false,
}) => {
	// Chip color by urgency
	let chipColor = '#E8F5E9';
	let chipText = '#2E7D32';

	if (dueInDays <= 3) {
		chipColor = '#FFEBEE';
		chipText = '#C62828';
	} else if (dueInDays <= 14) {
		chipColor = '#FFF3E0';
		chipText = '#EF6C00';
	}

	return (
		<View style={styles.listItem}>
			<View style={styles.listItemHeader}>
				<View style={[styles.iconWrapper, { backgroundColor: color + '20' }]}>
					<Ionicons name={iconName} size={24} color={color} />
				</View>
				<View style={styles.vendorAndAmount}>
					<Text style={styles.vendor}>{vendor}</Text>
					<Text style={styles.amount}>${amount.toFixed(2)}</Text>
				</View>
				<View style={styles.rightSection}>
					<View style={[styles.chip, { backgroundColor: chipColor }]}>
						<Text style={[styles.chipText, { color: chipText }]}>
							{dueInDays}d
						</Text>
					</View>
					<TouchableOpacity
						style={styles.optionsButton}
						onPress={() => {
							// Show options menu
							if (isPaid) {
								onPressEdit?.();
							} else {
								// Show options for unpaid expenses
								onPressMarkPaid?.();
							}
						}}
						disabled={isProcessing}
					>
						<Ionicons name="ellipsis-horizontal" size={16} color="#757575" />
					</TouchableOpacity>
				</View>
			</View>

			<View style={styles.metaRow}>
				<View style={styles.dateRow}>
					<Ionicons name="calendar-outline" size={12} color="#757575" />
					<Text style={styles.metaText}>{nextDueDate}</Text>
				</View>
				<Text style={styles.frequency}>{frequency}</Text>
			</View>
			<View style={styles.listItemDivider} />
		</View>
	);
};

const styles = StyleSheet.create({
	listItem: {
		paddingVertical: 16,
		paddingHorizontal: 24,
		backgroundColor: '#fff',
		marginVertical: 0,
		position: 'relative',
	},
	listItemDivider: {
		position: 'absolute',
		bottom: 0,
		left: 24,
		right: 24,
		height: 1,
		backgroundColor: '#E0E0E0',
	},
	listItemHeader: {
		flexDirection: 'row',
		alignItems: 'center',
		marginBottom: 12,
	},
	iconWrapper: {
		width: 40,
		height: 40,
		borderRadius: 12,
		justifyContent: 'center',
		alignItems: 'center',
		marginRight: 12,
	},
	vendorAndAmount: {
		flex: 1,
	},
	vendor: {
		fontSize: 18,
		fontWeight: '600',
		color: '#212121',
		marginBottom: 4,
	},
	amount: {
		fontSize: 20,
		fontWeight: '700',
		color: '#212121',
	},
	rightSection: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 8,
	},
	chip: {
		borderRadius: 12,
		paddingVertical: 2,
		paddingHorizontal: 6,
	},
	chipText: {
		fontSize: 10,
		fontWeight: '600',
	},
	metaRow: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		alignItems: 'center',
		marginTop: 8,
	},
	dateRow: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 4,
	},
	metaText: {
		fontSize: 12,
		color: '#757575',
	},
	frequency: {
		fontSize: 12,
		color: '#757575',
		fontWeight: '500',
	},
	optionsButton: {
		width: 24,
		height: 24,
		justifyContent: 'center',
		alignItems: 'center',
	},
});

export default RecurringExpenseCard;
