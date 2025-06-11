// ==========================================
// Imports
// ==========================================
import React, { useState, useMemo, useEffect } from 'react';
import {
	View,
	Text,
	StyleSheet,
	Dimensions,
	TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { LineChart, yAxisSides } from 'react-native-gifted-charts';

// ==========================================
// Type Definitions
// ==========================================
interface StockData {
	date: string;
	open: number;
}

interface StockChartProps {
	data: { value: number; date: string; label?: string; labelTextStyle?: any }[];
	maxValue: number;
	spacing: number;
	width: number;
}

// ==========================================
// Mock Data
// ==========================================
const NVDA_DATA = [
	{ value: 143.25, date: '06/10/2025' },
	{ value: 143.19, date: '06/09/2025' },
	{ value: 142.85, date: '06/08/2025' },
	{ value: 142.51, date: '06/06/2025' },
	{ value: 142.17, date: '06/05/2025' },
	{ value: 142.19, date: '06/04/2025' },
	{ value: 138.78, date: '06/03/2025' },
	{ value: 135.49, date: '06/02/2025' },
	{ value: 138.72, date: '05/30/2025' },
	{ value: 142.25, date: '05/29/2025' },
	{ value: 136.03, date: '05/28/2025' },
	{ value: 134.15, date: '05/27/2025' },
	{ value: 130.0, date: '05/23/2025' },
	{ value: 132.23, date: '05/22/2025' },
	{ value: 133.06, date: '05/21/2025' },
	{ value: 134.29, date: '05/20/2025' },
	{ value: 132.39, date: '05/19/2025' },
	{ value: 136.22, date: '05/16/2025' },
	{ value: 134.3, date: '05/15/2025' },
	{ value: 133.2, date: '05/14/2025' },
	{ value: 124.98, date: '05/13/2025' },
	{ value: 121.97, date: '05/12/2025' },
	{ value: 117.35, date: '05/09/2025' },
	{ value: 118.25, date: '05/08/2025' },
	{ value: 113.05, date: '05/07/2025' },
	{ value: 111.48, date: '05/06/2025' },
	{ value: 112.91, date: '05/05/2025' },
	{ value: 114.18, date: '05/02/2025' },
	{
		value: 113.08,
		date: '05/01/2025',
		label: 'May',
		labelTextStyle: { color: 'lightgray', width: 60 },
	},
	{ value: 104.47, date: '04/30/2025' },
	{ value: 107.67, date: '04/29/2025' },
	{ value: 109.69, date: '04/28/2025' },
	{ value: 106.85, date: '04/25/2025' },
	{ value: 103.48, date: '04/24/2025' },
	{ value: 104.52, date: '04/23/2025' },
	{ value: 98.78, date: '04/22/2025' },
	{ value: 98.77, date: '04/21/2025' },
	{ value: 104.45, date: '04/17/2025' },
	{ value: 104.55, date: '04/16/2025' },
	{ value: 110.97, date: '04/15/2025' },
	{ value: 114.11, date: '04/14/2025' },
	{ value: 108.5, date: '04/11/2025' },
	{ value: 109.37, date: '04/10/2025' },
	{ value: 98.89, date: '04/09/2025' },
	{ value: 103.81, date: '04/08/2025' },
	{ value: 87.46, date: '04/07/2025' },
	{ value: 98.91, date: '04/04/2025' },
	{ value: 103.51, date: '04/03/2025' },
	{ value: 107.29, date: '04/02/2025' },
	{
		value: 108.52,
		date: '04/01/2025',
		label: 'Apr',
		labelTextStyle: { color: 'lightgray', width: 60 },
	},
];

// ==========================================
// Components
// ==========================================
const StockChart: React.FC<StockChartProps> = ({
	data,
	maxValue,
	spacing,
	width,
}) => {
	const pointerConfig = {
		pointerStripHeight: 160,
		pointerStripColor: 'lightgray',
		pointerStripWidth: 2,
		pointerColor: '#0099ff',
		radius: 6,
		pointerLabelWidth: 100,
		pointerLabelHeight: 90,
		activatePointersOnLongPress: true,
		autoAdjustPointerLabelPosition: true,
		pointerLabelComponent: (items: { value: number; date: string }[]) => {
			return (
				<View
					style={{
						height: 90,
						width: 100,
						justifyContent: 'center',
						marginTop: -30,
						marginLeft: -40,
						position: 'absolute',
						zIndex: 1000,
					}}
				>
					<Text
						style={{
							color: '#3c424c',
							fontSize: 14,
							marginBottom: 6,
							textAlign: 'center',
						}}
					>
						{items[0].date}
					</Text>

					<View
						style={{
							paddingHorizontal: 14,
							paddingVertical: 6,
							borderRadius: 16,
							backgroundColor: 'white',
							shadowColor: '#000',
							shadowOffset: {
								width: 0,
								height: 2,
							},
							shadowOpacity: 0.25,
							shadowRadius: 3.84,
							elevation: 5,
						}}
					>
						<Text
							style={{
								fontWeight: 'bold',
								textAlign: 'center',
								color: '#2a2a2a',
							}}
						>
							{'$' + items[0].value}
						</Text>
					</View>
				</View>
			);
		},
	};

	return (
		<LineChart
			areaChart
			data={data}
			width={width}
			isAnimated
			animationDuration={1000}
			spacing={spacing}
			curved={true}
			initialSpacing={0}
			endSpacing={0}
			color="#007AFF"
			height={100}
			hideDataPoints
			dataPointsColor1="blue"
			startFillColor1="#b8e2ff"
			endFillColor1="#67b8f1"
			maxValue={maxValue}
			yAxisLabelPrefix="$"
			yAxisColor={'#8a8a8a'}
			yAxisSide={yAxisSides.RIGHT}
			yAxisTextStyle={{ color: '#8a8a8a', fontSize: 10 }}
			xAxisColor={'#8a8a8a'}
			xAxisLabelTextStyle={{ color: '#000000' }}
			pointerConfig={pointerConfig}
			disableScroll
			noOfSections={4}
		/>
	);
};

// ==========================================
// Main Component
// ==========================================
const ProfitGraphScreen: React.FC = () => {
	const screenWidth = Dimensions.get('window').width;
	const chartWidth = screenWidth - 20;
	const [stockData, setStockData] = useState<StockData[]>([]);
	const [selectedTimeRange, setSelectedTimeRange] = useState<
		'month' | '6months' | 'year' | 'all'
	>('month');

	useEffect(() => {
		try {
			console.log('Starting data processing...');
			// Process the array data directly
			const parsedData = NVDA_DATA.map((item) => ({
				date: item.date,
				open: item.value,
			}));

			console.log('Successfully processed data points:', parsedData.length);
			console.log('First few data points:', parsedData.slice(0, 3));

			setStockData(parsedData);
		} catch (error) {
			console.error('Error processing stock data:', error);
		}
	}, []);

	// Add TimeRangeSelector component
	const TimeRangeSelector = () => {
		const ranges = [
			{ label: 'Month', value: 'month' },
			{ label: '6 Months', value: '6months' },
			{ label: 'Year', value: 'year' },
			{ label: 'All', value: 'all' },
		];

		return (
			<View style={styles.timeRangeContainer}>
				{ranges.map((range) => (
					<TouchableOpacity
						key={range.value}
						style={[
							styles.timeRangeButton,
							selectedTimeRange === range.value && styles.timeRangeButtonActive,
						]}
						onPress={() => setSelectedTimeRange(range.value as any)}
					>
						<Text
							style={[
								styles.timeRangeButtonText,
								selectedTimeRange === range.value &&
									styles.timeRangeButtonTextActive,
							]}
						>
							{range.label}
						</Text>
					</TouchableOpacity>
				))}
			</View>
		);
	};

	// Helper function to process chart data
	const processChartData = (
		data: StockData[],
		cutoffDate: Date,
		timeRange: 'month' | '6months' | 'year' | 'all'
	) => {
		if (data.length === 0) {
			return { data: [], maxValue: 0 };
		}

		const filteredData = data.filter((item) => {
			const [month, day, year] = item.date.split('/');
			const itemDate = new Date(
				parseInt(year),
				parseInt(month) - 1,
				parseInt(day)
			);
			return itemDate >= cutoffDate;
		});

		const processedData = filteredData
			.map((item) => {
				const [month, day, year] = item.date.split('/');
				const date = new Date(
					parseInt(year),
					parseInt(month) - 1,
					parseInt(day)
				);

				const formattedDate = date.toLocaleDateString('en-US', {
					month: 'short',
				});

				let showLabel = false;
				let labelText = '';

				if (timeRange === 'month') {
					// For month view, show weekly labels
					const dayNum = parseInt(day);
					const totalDays = filteredData.length;
					const index = filteredData.findIndex((d) => d.date === item.date);

					// Show exactly 4 labels, evenly spaced
					if (
						index === 1 || // First point
						index === Math.floor(totalDays / 3) || // 1/3 of the way
						index === Math.floor((totalDays * 2) / 3) || // 2/3 of the way
						index === totalDays - 1
					) {
						// Last point
						showLabel = true;
						// Format: "May 02"
						labelText = `${formattedDate} ${day.padStart(2, '0')}`;
					}
				} else if (timeRange === '6months') {
					// For 6 months view, show first day of each month
					// Get the first occurrence of each month
					const currentMonth = date.getMonth();
					const isFirstOccurrence = !filteredData
						.slice(
							0,
							filteredData.findIndex((d) => d.date === item.date)
						)
						.some((d) => {
							const [prevMonth] = d.date.split('/');
							return parseInt(prevMonth) - 1 === currentMonth;
						});

					if (isFirstOccurrence) {
						showLabel = true;
						labelText = formattedDate;
					}
				} else {
					showLabel = parseInt(day) === 1;
					labelText = formattedDate;
				}

				return {
					value: item.open,
					date: item.date,
					label: showLabel ? labelText : '',
					labelTextStyle: { color: 'lightgray', width: 60 },
				};
			})
			.reverse();

		const maxValue = Math.max(...processedData.map((point) => point.value));
		const minValue = Math.min(...processedData.map((point) => point.value));
		const range = maxValue - minValue;
		const niceRange = Math.ceil((maxValue + range * 0.1) / 10) * 10; // Add 10% padding to the top

		return {
			data: processedData,
			maxValue: niceRange,
		};
	};

	// Create separate data for each time range
	const monthData = useMemo(() => {
		const now = new Date();
		const cutoffDate = new Date(
			now.getFullYear(),
			now.getMonth() - 1,
			now.getDate()
		);
		return processChartData(stockData, cutoffDate, 'month');
	}, [stockData]);

	const sixMonthsData = useMemo(() => {
		const now = new Date();
		const cutoffDate = new Date(
			now.getFullYear(),
			now.getMonth() - 6,
			now.getDate()
		);
		return processChartData(stockData, cutoffDate, '6months');
	}, [stockData]);

	const yearData = useMemo(() => {
		const now = new Date();
		const cutoffDate = new Date(
			now.getFullYear() - 1,
			now.getMonth(),
			now.getDate()
		);
		return processChartData(stockData, cutoffDate, 'year');
	}, [stockData]);

	const allTimeData = useMemo(() => {
		const cutoffDate = new Date(0);
		return processChartData(stockData, cutoffDate, 'all');
	}, [stockData]);

	return (
		<SafeAreaView style={styles.safeArea}>
			<StatusBar style="light" />
			<View style={styles.container}>
				<View style={styles.header}>
					<Text style={styles.headerTitle}>Profit Graph</Text>
				</View>

				<TimeRangeSelector />

				<View style={styles.chartContainer}>
					{selectedTimeRange === 'month' && monthData.data.length > 0 && (
						<StockChart
							data={monthData.data}
							maxValue={monthData.maxValue}
							spacing={Math.max(
								2,
								Math.min(18, (screenWidth - 60) / monthData.data.length)
							)}
							width={screenWidth - 80}
						/>
					)}

					{selectedTimeRange === '6months' && sixMonthsData.data.length > 0 && (
						<StockChart
							data={sixMonthsData.data}
							maxValue={sixMonthsData.maxValue}
							spacing={Math.max(
								2,
								Math.min(18, (screenWidth - 60) / sixMonthsData.data.length)
							)}
							width={screenWidth - 80}
						/>
					)}

					{selectedTimeRange === 'year' && yearData.data.length > 0 && (
						<StockChart
							data={yearData.data}
							maxValue={yearData.maxValue}
							spacing={Math.max(
								2,
								Math.min(18, (screenWidth - 60) / yearData.data.length)
							)}
							width={screenWidth - 80}
						/>
					)}

					{selectedTimeRange === 'all' && allTimeData.data.length > 0 && (
						<StockChart
							data={allTimeData.data}
							maxValue={allTimeData.maxValue}
							spacing={Math.max(
								2,
								Math.min(18, (screenWidth - 60) / allTimeData.data.length)
							)}
							width={screenWidth - 80}
						/>
					)}
				</View>
			</View>
		</SafeAreaView>
	);
};

// ==========================================
// Styles
// ==========================================
const styles = StyleSheet.create({
	safeArea: {
		flex: 1,
		backgroundColor: '#F0F2F5',
	},
	container: {
		flex: 1,
		backgroundColor: '#ffffff',
	},
	header: {
		padding: 20,
		backgroundColor: '#ffffff',
		borderBottomWidth: 1,
		borderBottomColor: '#e0e0e0',
	},
	headerTitle: {
		fontSize: 24,
		fontWeight: 'bold',
		color: '#333333',
	},
	chartContainer: {
		flex: 1,
		backgroundColor: '#FFFFFF',
		borderRadius: 15,
		width: '100%',
		alignItems: 'center',
		justifyContent: 'center',
		overflow: 'hidden',
		paddingHorizontal: 10,
		paddingVertical: 10,
		shadowColor: '#000',
		shadowOffset: { width: 0, height: 2 },
		shadowOpacity: 0.1,
		shadowRadius: 6,
		elevation: 3,
	},
	timeRangeContainer: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		paddingHorizontal: 10,
		paddingVertical: 10,
		backgroundColor: '#F8F9FA',
		borderRadius: 8,
		margin: 10,
	},
	timeRangeButton: {
		paddingHorizontal: 12,
		paddingVertical: 6,
		borderRadius: 6,
		backgroundColor: '#FFFFFF',
		borderWidth: 1,
		borderColor: '#E9ECEF',
	},
	timeRangeButtonActive: {
		backgroundColor: '#007AFF',
		borderColor: '#007AFF',
	},
	timeRangeButtonText: {
		fontSize: 12,
		color: '#495057',
		fontWeight: '500',
	},
	timeRangeButtonTextActive: {
		color: '#FFFFFF',
	},
});

export default ProfitGraphScreen;
