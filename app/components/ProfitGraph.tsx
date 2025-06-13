import React from 'react';
import { LineChart, LineChartBicolor } from 'react-native-gifted-charts';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import { Transaction } from '../../data/transactions';

interface ProfitGraphProps {
	transactions: Transaction[];
}

const ProfitGraph: React.FC<ProfitGraphProps> = ({ transactions }) => {
	// Get current date and date 5 months ago
	const now = new Date();
	const fiveMonthsAgo = new Date();
	fiveMonthsAgo.setMonth(now.getMonth() - 5);

	// Sort transactions by date and filter last 5 months
	const sortedTransactions = [...transactions]
		.filter((t) => new Date(t.date) >= fiveMonthsAgo)
		.sort((a, b) => {
			const dateA = new Date(a.date).getTime();
			const dateB = new Date(b.date).getTime();
			return dateA - dateB; // Ascending order (oldest to newest)
		});

	// Find the first transaction date
	const firstTransactionDate =
		sortedTransactions.length > 0 ? new Date(sortedTransactions[0].date) : now;

	// Use the later date between 5 months ago and first transaction
	const startDate = new Date(
		Math.max(fiveMonthsAgo.getTime(), firstTransactionDate.getTime())
	);

	// Generate array of days from start date to current day
	const days: { date: Date; label: string }[] = [];
	let currentDate = new Date(startDate);
	const endDate = new Date(now);

	while (currentDate <= endDate) {
		// Only add label for the first day of each month
		const label =
			currentDate.getDate() === 1
				? currentDate.toLocaleString('default', { month: 'short' })
				: '';

		days.push({
			date: new Date(currentDate),
			label,
		});
		currentDate.setDate(currentDate.getDate() + 1);
	}

	// Calculate cumulative profit/loss for each day
	const dailyData = new Map<string, number>();
	let cumulativeAmount = 0;
	let lastAmount = 0;

	// Initialize all days with the last known amount
	days.forEach((day) => {
		dailyData.set(day.date.toISOString(), lastAmount);
	});

	// Update amounts on transaction days
	sortedTransactions.forEach((transaction) => {
		const amount =
			transaction.type === 'income' ? transaction.amount : -transaction.amount;
		cumulativeAmount += amount;
		lastAmount = cumulativeAmount;

		// Update all subsequent days with the new amount
		const transactionDate = new Date(transaction.date);
		days.forEach((day) => {
			if (day.date >= transactionDate) {
				dailyData.set(day.date.toISOString(), lastAmount);
			}
		});
	});

	// Filter out days with no profit change
	const filteredDays = days.filter((day, index) => {
		if (index === 0) return true; // Always include first day
		const currentValue = dailyData.get(day.date.toISOString()) || 0;
		const previousValue =
			dailyData.get(days[index - 1].date.toISOString()) || 0;
		return currentValue !== previousValue;
	});

	// Calculate 7-day moving average
	const calculateMovingAverage = (data: number[], windowSize: number = 7) => {
		const result: number[] = [];
		for (let i = 0; i < data.length; i++) {
			const start = Math.max(0, i - windowSize + 1);
			const window = data.slice(start, i + 1);
			const average = window.reduce((sum, val) => sum + val, 0) / window.length;
			result.push(average);
		}
		return result;
	};

	const customDataPoint = () => {
		return (
			<View
				style={{
					width: 20,
					height: 20,
					backgroundColor: 'white',
					borderWidth: 4,
					borderRadius: 10,
					borderColor: '#07BAD1',
				}}
			/>
		);
	};

	const customLabel = (val: string) => {
		return (
			<View style={{ width: 70, marginLeft: 7 }}>
				<Text style={{ color: 'white', fontWeight: 'bold' }}>{val}</Text>
			</View>
		);
	};

	// Get all values and calculate moving average
	const allValues = filteredDays.map(
		(day) => dailyData.get(day.date.toISOString()) || 0
	);
	const movingAverages = calculateMovingAverage(allValues);

	// Create data points for each day with moving averages
	const data = filteredDays.map((day, index) => {
		const value = movingAverages[index];
		// Only show label every 30 data points
		const shouldShowLabel = index % 30 === 0;
		return {
			value,
			label: shouldShowLabel ? day.label : '',
			customDataPoint: customDataPoint,
			hideDataPoint: true, // Hide all data points except transaction points
		};
	});

	// Calculate spacing based on screen width
	const screenWidth = Dimensions.get('window').width;
	const horizontalPadding = 100; // 50px padding on each side
	const availableWidth = screenWidth - horizontalPadding;
	const spacing = (availableWidth - 80) / (data.length - 1); // Subtract 80px for the last label

	return (
		<View style={styles.container}>
			<View style={styles.graphContainer}>
				<LineChartBicolor
					data={data}
					thickness={6}
					color="#07BAD1"
					maxValue={Math.max(...data.map((d) => d.value)) * 1.5}
					noOfSections={3}
					areaChart
					curved
					colorNegative="red"
					startFillColor="rgb(84,219,234)"
					startFillColorNegative="red"
					yAxisTextStyle={{ color: 'lightgray' }}
					hideYAxisText
					endFillColor={'rgb(84,219,234)'}
					startOpacity={0.4}
					endOpacity={0.4}
					spacing={spacing}
					rulesColor="gray"
					rulesType="solid"
					initialSpacing={10}
					yAxisThickness={0}
					endSpacing={80}
					yAxisColor="lightgray"
					xAxisColor="lightgray"
					dataPointsHeight={20}
					adjustToWidth
					hideRules
					hideDataPoints={false}
					xAxisLabelTextStyle={{ color: 'white', fontSize: 12 }}
					showVerticalLines={false}
				/>
			</View>
		</View>
	);
};

const styles = StyleSheet.create({
	container: {
		alignItems: 'center',
		justifyContent: 'center',
		paddingVertical: 10,
		width: '100%',
		overflow: 'hidden',
	},
	graphContainer: {
		width: '100%',
		alignItems: 'center',
		overflow: 'hidden',
	},
});

export default ProfitGraph;
