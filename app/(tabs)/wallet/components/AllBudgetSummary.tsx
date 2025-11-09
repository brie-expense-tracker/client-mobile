import React from 'react';
import { View, TouchableOpacity, StyleSheet } from 'react-native';
import CircularProgressBar from './CircularProgressBar';
import { palette, space } from '../../../../src/ui';
import { currency } from '../../../../src/utils/format';

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
	const subtitle = `${currency(spent)} / ${currency(total)}`;

	return (
		<View style={styles.container}>
			<TouchableOpacity
				onPress={onPeriodToggle}
				activeOpacity={0.7}
				accessibilityRole="button"
				accessibilityLabel={
					isActive ? 'Collapse all-time budget' : 'Expand all-time budget'
				}
			>
				<CircularProgressBar
					percent={percentage}
					size={140}
					strokeWidth={8}
					color={isActive ? palette.primary : palette.primaryMuted}
					trackColor={palette.track}
					centerLabel={centerLabel}
					subtitle={subtitle}
					animated={true}
				/>
			</TouchableOpacity>
		</View>
	);
};

const styles = StyleSheet.create({
	container: {
		alignItems: 'center',
		justifyContent: 'center',
		paddingVertical: space.lg,
	},
});

export default AllBudgetSummary;
