import React, { useState, useEffect } from 'react';
import {
	View,
	Text,
	StyleSheet,
	TouchableOpacity,
	ActivityIndicator,
	Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import {
	SpendingForecastService,
	MonthlyForecast,
	BudgetForecast,
} from '../../../../src/services/spendingForecastService';

interface SpendingForecastCardProps {
	showBudgetForecasts?: boolean;
	onPress?: () => void;
}

const SpendingForecastCard: React.FC<SpendingForecastCardProps> = ({
	showBudgetForecasts = true,
	onPress,
}) => {
	const [forecast, setForecast] = useState<MonthlyForecast | null>(null);
	const [budgetForecasts, setBudgetForecasts] = useState<BudgetForecast[]>([]);
	const [loading, setLoading] = useState(true);

	useEffect(() => {
		loadForecast();
	}, []);

	const loadForecast = async () => {
		try {
			setLoading(true);
			const data = await SpendingForecastService.getSpendingAnalysis();

			if (data) {
				setForecast(data.monthlyForecast);
				setBudgetForecasts(data.budgetForecasts);
			}
		} catch (error) {
			console.error('[SpendingForecastCard] Error loading forecast:', error);
			Alert.alert('Error', 'Failed to load spending forecast');
		} finally {
			setLoading(false);
		}
	};

	const handlePress = () => {
		if (onPress) {
			onPress();
		}
	};

	if (loading) {
		return (
			<View style={styles.loadingContainer}>
				<ActivityIndicator size="small" color="#007ACC" />
				<Text style={styles.loadingText}>Loading forecast...</Text>
			</View>
		);
	}

	// Hide the widget completely if there's no forecast data
	if (!forecast) {
		return null;
	}

	const status = SpendingForecastService.getForecastStatus(forecast);
	const trendColor = SpendingForecastService.getTrendColor(
		forecast.trendDirection
	);
	const trendIcon = SpendingForecastService.getTrendIcon(
		forecast.trendDirection
	);

	return (
		<TouchableOpacity style={styles.container} onPress={handlePress}>
			<View style={styles.header}>
				<View style={styles.titleRow}>
					<Ionicons name="trending-up" size={20} color="#007ACC" />
					<Text style={styles.title}>Spending Forecast</Text>
				</View>
				<View style={[styles.statusBadge, { backgroundColor: status.color }]}>
					<Ionicons name={status.icon} size={14} color="#fff" />
					<Text style={styles.statusText}>{status.status}</Text>
				</View>
			</View>

			<View style={styles.forecastContent}>
				<View style={styles.mainForecast}>
					<View style={styles.amountRow}>
						<Text style={styles.label}>Projected Total:</Text>
						<Text style={styles.amount}>
							${forecast.projectedTotal.toFixed(0)}
						</Text>
					</View>
					<View style={styles.amountRow}>
						<Text style={styles.label}>Current Spending:</Text>
						<Text style={styles.currentAmount}>
							${forecast.currentSpending.toFixed(0)}
						</Text>
					</View>
					<View style={styles.amountRow}>
						<Text style={styles.label}>Average Monthly:</Text>
						<Text style={styles.averageAmount}>
							${forecast.avgMonthlySpending.toFixed(0)}
						</Text>
					</View>
				</View>

				<View style={styles.trendSection}>
					<View style={styles.trendRow}>
						<Ionicons name={trendIcon} size={16} color={trendColor} />
						<Text style={[styles.trendText, { color: trendColor }]}>
							{SpendingForecastService.formatTrendDirection(
								forecast.trendDirection
							)}
						</Text>
					</View>
					<Text style={styles.percentageText}>
						{SpendingForecastService.formatPercentageDifference(
							forecast.percentageDifference
						)}{' '}
						vs average
					</Text>
				</View>

				<View style={styles.progressSection}>
					<View style={styles.progressBar}>
						<View
							style={[
								styles.progressFill,
								{
									width: `${Math.min(
										(forecast.currentSpending / forecast.projectedTotal) * 100,
										100
									)}%`,
									backgroundColor: forecast.isAboveAverage
										? '#f44336'
										: '#4caf50',
								},
							]}
						/>
					</View>
					<Text style={styles.progressText}>
						{forecast.daysRemaining} days remaining in month
					</Text>
				</View>
			</View>

			{showBudgetForecasts && budgetForecasts.length > 0 && (
				<View style={styles.budgetSection}>
					<Text style={styles.budgetTitle}>Budget Forecasts</Text>
					{budgetForecasts.slice(0, 3).map((budgetForecast) => {
						const budgetStatus =
							SpendingForecastService.getBudgetForecastStatus(budgetForecast);
						return (
							<View key={budgetForecast.budgetId} style={styles.budgetItem}>
								<View style={styles.budgetHeader}>
									<Text style={styles.budgetName}>
										{budgetForecast.budgetName}
									</Text>
									<View
										style={[
											styles.budgetStatus,
											{ backgroundColor: budgetStatus.color },
										]}
									>
										<Ionicons name={budgetStatus.icon} size={12} color="#fff" />
										<Text style={styles.budgetStatusText}>
											{budgetStatus.status}
										</Text>
									</View>
								</View>
								<View style={styles.budgetProgress}>
									<View style={styles.budgetProgressBar}>
										<View
											style={[
												styles.budgetProgressFill,
												{
													width: `${Math.min(
														budgetForecast.utilizationPercentage,
														100
													)}%`,
													backgroundColor: budgetForecast.willExceed
														? '#f44336'
														: '#4caf50',
												},
											]}
										/>
									</View>
									<Text style={styles.budgetProgressText}>
										${budgetForecast.currentSpending.toFixed(0)} / $
										{budgetForecast.budgetAmount.toFixed(0)}
									</Text>
								</View>
							</View>
						);
					})}
				</View>
			)}
		</TouchableOpacity>
	);
};

const styles = StyleSheet.create({
	container: {
		backgroundColor: '#fff',
		borderRadius: 12,
		padding: 16,
		marginHorizontal: 20,
		marginVertical: 8,
		borderWidth: 1,
		borderColor: '#f0f0f0',
		shadowColor: '#000',
		shadowOffset: { width: 0, height: 2 },
		shadowOpacity: 0.1,
		shadowRadius: 4,
		elevation: 2,
	},
	header: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		alignItems: 'center',
		marginBottom: 16,
	},
	titleRow: {
		flexDirection: 'row',
		alignItems: 'center',
	},
	title: {
		fontSize: 16,
		fontWeight: '600',
		color: '#333',
		marginLeft: 8,
	},
	statusBadge: {
		flexDirection: 'row',
		alignItems: 'center',
		paddingHorizontal: 8,
		paddingVertical: 4,
		borderRadius: 12,
	},
	statusText: {
		fontSize: 12,
		fontWeight: '600',
		color: '#fff',
		marginLeft: 4,
	},
	forecastContent: {
		marginBottom: 16,
	},
	mainForecast: {
		marginBottom: 12,
	},
	amountRow: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		alignItems: 'center',
		marginBottom: 4,
	},
	label: {
		fontSize: 14,
		color: '#666',
	},
	amount: {
		fontSize: 16,
		fontWeight: '700',
		color: '#007ACC',
	},
	currentAmount: {
		fontSize: 14,
		fontWeight: '600',
		color: '#666',
	},
	averageAmount: {
		fontSize: 14,
		fontWeight: '600',
		color: '#999',
	},
	trendSection: {
		marginBottom: 12,
	},
	trendRow: {
		flexDirection: 'row',
		alignItems: 'center',
		marginBottom: 2,
	},
	trendText: {
		fontSize: 14,
		fontWeight: '600',
		marginLeft: 4,
	},
	percentageText: {
		fontSize: 12,
		color: '#666',
		marginLeft: 20,
	},
	progressSection: {
		marginBottom: 8,
	},
	progressBar: {
		height: 6,
		backgroundColor: '#f0f0f0',
		borderRadius: 3,
		marginBottom: 4,
	},
	progressFill: {
		height: '100%',
		borderRadius: 3,
	},
	progressText: {
		fontSize: 12,
		color: '#999',
		textAlign: 'center',
	},
	budgetSection: {
		borderTopWidth: 1,
		borderTopColor: '#f0f0f0',
		paddingTop: 12,
	},
	budgetTitle: {
		fontSize: 14,
		fontWeight: '600',
		color: '#333',
		marginBottom: 8,
	},
	budgetItem: {
		marginBottom: 8,
	},
	budgetHeader: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		alignItems: 'center',
		marginBottom: 4,
	},
	budgetName: {
		fontSize: 13,
		fontWeight: '500',
		color: '#333',
	},
	budgetStatus: {
		flexDirection: 'row',
		alignItems: 'center',
		paddingHorizontal: 6,
		paddingVertical: 2,
		borderRadius: 8,
	},
	budgetStatusText: {
		fontSize: 10,
		fontWeight: '600',
		color: '#fff',
		marginLeft: 2,
	},
	budgetProgress: {
		flexDirection: 'row',
		alignItems: 'center',
	},
	budgetProgressBar: {
		flex: 1,
		height: 4,
		backgroundColor: '#f0f0f0',
		borderRadius: 2,
		marginRight: 8,
	},
	budgetProgressFill: {
		height: '100%',
		borderRadius: 2,
	},
	budgetProgressText: {
		fontSize: 11,
		color: '#666',
		width: 80,
		textAlign: 'right',
	},
	loadingContainer: {
		alignItems: 'center',
		padding: 20,
	},
	loadingText: {
		marginTop: 8,
		color: '#666',
		fontSize: 14,
	},
	emptyContainer: {
		alignItems: 'center',
		padding: 20,
	},
	emptyText: {
		marginTop: 8,
		color: '#999',
		fontSize: 14,
	},
});

export default SpendingForecastCard;
