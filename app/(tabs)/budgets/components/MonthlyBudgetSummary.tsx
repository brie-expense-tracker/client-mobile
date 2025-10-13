import React from 'react';
import { TouchableOpacity, StyleSheet } from 'react-native';
import CircularProgressBar from './CircularProgressBar';
import { palette, space } from '../../../../src/ui';
import { currency } from '../../../../src/utils/format';

interface MonthlyBudgetSummaryProps {
	percentage?: number;
	spent?: number;
	total?: number;
	onPeriodToggle: () => void;
	isActive?: boolean;
}

const MonthlyBudgetSummary = (props: MonthlyBudgetSummaryProps) => {
	const {
		percentage = 0,
		spent = 0,
		total = 0,
		onPeriodToggle,
		isActive = false,
	} = props;

	return (
		<TouchableOpacity
			onPress={onPeriodToggle}
			activeOpacity={0.7}
			accessibilityRole="button"
			accessibilityLabel="Toggle monthly budget summary"
			style={styles.container}
		>
			<CircularProgressBar
				percent={percentage}
				centerLabel={currency(spent)}
				subtitle={`of ${currency(total)}`}
				color={
					percentage > 100
						? palette.danger
						: isActive
						? palette.primary
						: palette.primaryMuted
				}
				trackColor={palette.track}
			/>
		</TouchableOpacity>
	);
};

const styles = StyleSheet.create({
	container: {
		alignItems: 'center',
		justifyContent: 'center',
		paddingVertical: space.lg,
	},
});

export default MonthlyBudgetSummary;
