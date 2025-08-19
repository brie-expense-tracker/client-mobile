import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { RectButton } from 'react-native-gesture-handler';
import CircularProgressBar from './CircularProgressBar';

interface AllBudgetCircleProps {
	percentage?: number;
	spent?: number;
	total?: number;
	onPeriodToggle: () => void;
	isActive?: boolean;
}

const AllBudgetCircle = ({
	percentage = 0,
	spent = 0,
	total = 0,
	onPeriodToggle,
	isActive = true,
}: AllBudgetCircleProps) => {
	const size = 140; // diameter for the circular progress bar

	return (
		<View style={styles.circleContainer}>
			<View style={styles.circleCard}>
				{/* Period Toggle Button */}
				<RectButton style={styles.periodToggleButton} onPress={onPeriodToggle}>
					<View style={styles.periodToggleContent}>
						<Text style={styles.periodToggleText}>All</Text>
					</View>
				</RectButton>

				<View style={styles.circleAndTextRow}>
					<View style={styles.circleWrapper}>
						<CircularProgressBar
							percent={percentage}
							size={size}
							strokeWidth={6}
							color="#00a2ff"
							trackColor="#f0f0f0"
							animated={true}
							centerLabel={`${percentage.toFixed(1)}%`}
						/>
					</View>

					<View style={styles.textContent}>
						<View style={styles.amountSection}>
							<Text style={styles.spentLabel}>Spent</Text>
							<View style={styles.circleAmountColumn}>
								<Text style={styles.circleSpent}>${spent.toFixed(2)}</Text>
								<Text style={styles.circleTotal}>/ ${total.toFixed(2)}</Text>
							</View>
						</View>

						<View style={styles.progressSection}>
							<Text style={styles.progressLabel}>Progress</Text>
							<View style={styles.circleFooter}>
								<Text style={styles.circleUsed}>
									{percentage.toFixed(0)}% used
								</Text>
								<Text style={styles.circleRemaining}>remaining</Text>
							</View>
						</View>
					</View>
				</View>
			</View>
		</View>
	);
};

const styles = StyleSheet.create({
	circleContainer: {
		alignItems: 'center',
		justifyContent: 'center',
		backgroundColor: '#fff',
	},
	circleCard: {
		alignItems: 'center',
		paddingHorizontal: 24,
		backgroundColor: '#ffffff',
		borderRadius: 16,
		position: 'relative',
	},
	periodToggleButton: {
		position: 'absolute',
		top: 12,
		right: 12,
		paddingVertical: 6,
		paddingHorizontal: 12,
		borderRadius: 16,
		backgroundColor: '#f5f5f5',
		borderWidth: 1,
		borderColor: '#E0E0E0',
		zIndex: 1,
	},
	periodToggleContent: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 4,
	},
	periodToggleText: {
		fontSize: 12,
		fontWeight: '500',
		color: '#212121',
	},
	circleAndTextRow: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'center',
		gap: 24,
		marginTop: 8,
	},
	circleWrapper: {
		position: 'relative',
		alignItems: 'center',
		justifyContent: 'center',
	},
	circleContent: {
		position: 'absolute',
		top: 0,
		left: 0,
		right: 0,
		bottom: 0,
		alignItems: 'center',
		justifyContent: 'center',
	},
	textContent: {
		flex: 1,
		justifyContent: 'space-between',
		height: 140,
		paddingVertical: 8,
	},
	amountSection: {
		marginBottom: 10,
	},
	progressSection: {
		marginTop: 8,
	},
	spentLabel: {
		fontSize: 12,
		fontWeight: '600',
		color: '#9ca3af',
		textTransform: 'uppercase',
		letterSpacing: 0.5,
		marginBottom: 4,
	},
	progressLabel: {
		fontSize: 12,
		fontWeight: '600',
		color: '#9ca3af',
		textTransform: 'uppercase',
		letterSpacing: 0.5,
		marginBottom: 4,
	},
	iconCenter: {
		marginBottom: 12,
		backgroundColor: '#daf1fe',
		width: 100,
		height: 100,
		borderRadius: 100,
		alignItems: 'center',
		justifyContent: 'center',
	},
	percentageText: {
		fontSize: 24,
		fontWeight: '700',
		color: '#212121',
	},
	circleLabel: {
		fontSize: 14,
		fontWeight: '500',
		color: '#757575',
	},
	circleAmountRow: {
		flexDirection: 'row',
		alignItems: 'baseline',
	},
	circleAmountColumn: {
		flexDirection: 'column',
		alignItems: 'flex-start',
		gap: 2,
	},
	circleSpent: {
		fontSize: 28,
		fontWeight: '700',
		color: '#212121',
	},
	circleTotal: {
		fontSize: 18,
		color: '#6b7280',
		fontWeight: '500',
	},
	circleFooter: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 8,
	},
	circleUsed: {
		fontSize: 16,
		fontWeight: '600',
		color: '#374151',
	},
	circleRemaining: {
		fontSize: 16,
		fontWeight: '400',
		color: '#6b7280',
	},
});

export default AllBudgetCircle;
