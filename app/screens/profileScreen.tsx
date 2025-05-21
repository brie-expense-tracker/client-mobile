// ProfileScreen.tsx
import React from 'react';
import {
	SafeAreaView,
	View,
	Text,
	StyleSheet,
	Image,
	TouchableOpacity,
	Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LineChart, PieChart } from 'react-native-chart-kit';
import { Link, useRouter } from 'expo-router';

const screenWidth = Dimensions.get('window').width;

export default function ProfileScreen() {
	const router = useRouter();
	// dummy data
	const lineData = {
		labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
		datasets: [{ data: [450, 380, 500, 620, 580, 700] }],
	};
	const pieData = [
		{
			name: 'Food',
			population: 45,
			color: '#d47c7c',
			legendFontColor: '#333',
			legendFontSize: 12,
		},
		{
			name: 'Rent',
			population: 30,
			color: '#7cd47c',
			legendFontColor: '#333',
			legendFontSize: 12,
		},
		{
			name: 'Misc',
			population: 25,
			color: '#7cb2d4',
			legendFontColor: '#333',
			legendFontSize: 12,
		},
	];

	return (
		<SafeAreaView style={styles.container}>
			{/* Header icons */}
			<TouchableOpacity
				style={styles.headerLeft}
				onPress={() => {
					router.back();
				}}
			>
				<Ionicons name="chevron-back-outline" size={32} color="#555" />
			</TouchableOpacity>
			<View style={styles.headerRight}>
				<TouchableOpacity style={styles.iconButton}>
					<Ionicons name="notifications-outline" size={32} color="#555" />
				</TouchableOpacity>
				<TouchableOpacity style={styles.iconButton}>
					<Ionicons name="settings-outline" size={32} color="#555" />
				</TouchableOpacity>
			</View>

			{/* Profile picture */}
			<View style={styles.profilePicWrapper}>
				<Image
					source={require('../../assets/images/profile.jpg')}
					style={styles.profilePic}
				/>
			</View>

			{/* Stats cards */}
			<View style={styles.statsContainer}>
				<View style={styles.statCard}>
					<Text style={styles.statValue}>$1,250</Text>
					<Text style={styles.statLabel}>This Month</Text>
				</View>
				<View style={styles.statCard}>
					<Text style={styles.statValue}>$6,400</Text>
					<Text style={styles.statLabel}>Year to Date</Text>
				</View>
			</View>

			{/* Charts */}
			<View style={styles.charts}>
				<Text style={styles.chartTitle}>Spending Over Time</Text>
				<LineChart
					data={lineData}
					width={screenWidth - 40}
					height={220}
					chartConfig={chartConfig}
					style={styles.chart}
				/>

				<Text style={styles.chartTitle}>Category Breakdown</Text>
				<PieChart
					data={pieData}
					width={screenWidth - 40}
					height={180}
					chartConfig={chartConfig}
					accessor="population"
					backgroundColor="transparent"
					paddingLeft="15"
					style={{ marginVertical: 8 }}
				/>
			</View>

			{/* Floating "+" button */}
			{/* <TouchableOpacity style={styles.fab}>
				<Ionicons name="add" size={32} color="#fff" />
			</TouchableOpacity> */}
		</SafeAreaView>
	);
}

const chartConfig = {
	backgroundGradientFrom: '#f9f9f9',
	backgroundGradientTo: '#f9f9f9',
	decimalPlaces: 0,
	color: (opacity = 1) => `rgba(0, 122, 255, ${opacity})`,
	labelColor: (opacity = 1) => `rgba(0,0,0,${opacity})`,
	propsForDots: {
		r: '4',
	},
};

const styles = StyleSheet.create({
	container: { flex: 1, backgroundColor: '#f9f9f9' },
	headerLeft: {
		position: 'absolute',
		top: 60,
		left: 16,
	},
	headerRight: {
		position: 'absolute',
		top: 60,
		right: 16,
		flexDirection: 'row',
	},
	iconButton: { marginLeft: 12 },
	profilePicWrapper: {
		marginTop: 60,
		alignItems: 'center',
	},
	profilePic: {
		width: 100,
		height: 100,
		borderRadius: 50,
		borderWidth: 2,
		borderColor: '#ddd',
	},
	statsContainer: {
		flexDirection: 'row',
		justifyContent: 'space-around',
		marginTop: 24,
		paddingHorizontal: 16,
	},
	statCard: {
		backgroundColor: '#fff',
		padding: 16,
		borderRadius: 12,
		alignItems: 'center',
		flex: 1,
		marginHorizontal: 8,
		elevation: 2,
	},
	statValue: { fontSize: 20, fontWeight: 'bold' },
	statLabel: { fontSize: 12, color: '#666', marginTop: 4 },
	charts: { marginTop: 24, alignItems: 'center' },
	chartTitle: { fontSize: 16, fontWeight: '600', marginVertical: 8 },
	chart: { borderRadius: 12 },
	fab: {
		position: 'absolute',
		bottom: 24,
		right: 24,
		backgroundColor: '#4fa166',
		width: 60,
		height: 60,
		borderRadius: 30,
		justifyContent: 'center',
		alignItems: 'center',
		elevation: 4,
	},
});
