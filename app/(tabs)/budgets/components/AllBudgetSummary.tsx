import React from 'react';
import { View, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import CircularProgressBar from './CircularProgressBar';

interface AllBudgetSummaryProps {
	percentage?: number;
	spent?: number;
	total?: number;
	onPeriodToggle: () => void;
	isActive?: boolean;
}

const AllBudgetSummary: React.FC<AllBudgetSummaryProps> = ({
	percentage = 0,
	spent = 0,
	total = 0,
	onPeriodToggle,
	isActive = false,
}) => {
	const centerLabel = `${Math.round(percentage)}%`;
	const subtitle = `$${spent.toFixed(0)} / $${total.toFixed(0)}`;

	return (
		<View style={styles.container}>
			<TouchableOpacity
				style={[styles.progressContainer, isActive && styles.activeContainer]}
				onPress={onPeriodToggle}
				activeOpacity={0.7}
			>
				<CircularProgressBar
					percent={percentage}
					size={140}
					strokeWidth={8}
					color={isActive ? '#007ACC' : '#0EA5E9'}
					trackColor="#EEF2F7"
					centerLabel={centerLabel}
					subtitle={subtitle}
					animated={true}
				/>
				<View style={styles.toggleIndicator}>
					<Ionicons
						name={isActive ? 'chevron-up' : 'chevron-down'}
						size={16}
						color={isActive ? '#007ACC' : '#757575'}
					/>
				</View>
			</TouchableOpacity>
		</View>
	);
};

const styles = StyleSheet.create({
	container: {
		alignItems: 'center',
		justifyContent: 'center',
		paddingVertical: 16,
	},
	progressContainer: {
		alignItems: 'center',
		justifyContent: 'center',
		padding: 16,
		borderRadius: 20,
		backgroundColor: '#fff',
		borderWidth: 2,
		borderColor: 'transparent',
		shadowColor: '#000',
		shadowOffset: {
			width: 0,
			height: 2,
		},
		shadowOpacity: 0.1,
		shadowRadius: 4,
		elevation: 3,
	},
	activeContainer: {
		borderColor: '#007ACC',
		backgroundColor: '#f0f8ff',
	},
	toggleIndicator: {
		position: 'absolute',
		bottom: 8,
		right: 8,
		width: 24,
		height: 24,
		borderRadius: 12,
		backgroundColor: '#fff',
		justifyContent: 'center',
		alignItems: 'center',
		shadowColor: '#000',
		shadowOffset: {
			width: 0,
			height: 1,
		},
		shadowOpacity: 0.2,
		shadowRadius: 2,
		elevation: 2,
	},
});

export default AllBudgetSummary;
