import React from 'react';
import { BarChart } from 'react-native-gifted-charts';
import { View, Text, StyleSheet, Dimensions } from 'react-native';

interface ProfitLossGraphProps {
	data: { name: string; Profit: number; Loss: number }[];
}

const ProfitLossGraph: React.FC<ProfitLossGraphProps> = ({ data }) => {
	const screenWidth = Dimensions.get('window').width;

	return (
		<View style={styles.container}>
			<BarChart
				data={data
					.map((item) => ({
						value: item.Profit,
						label: 'Profit',
						frontColor: '#2db762',
					}))
					.concat(
						data.map((item) => ({
							value: item.Loss,
							label: 'Loss',
							frontColor: '#c54444',
						}))
					)}
				barWidth={screenWidth * 0.25}
				barBorderRadius={5}
				width={300}
				height={200}
				yAxisThickness={0}
				xAxisThickness={0}
			/>
		</View>
	);
};

const styles = StyleSheet.create({
	container: {
		alignItems: 'center',
		justifyContent: 'center',
	},
});

export default ProfitLossGraph;
