import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { FormInputGroup } from './FormInputGroup';
import { palette, radius, space, type } from '../../ui/theme';

type WeekStartDay = 0 | 1;
type MonthStartDay =
	| 1
	| 2
	| 3
	| 4
	| 5
	| 6
	| 7
	| 8
	| 9
	| 10
	| 11
	| 12
	| 13
	| 14
	| 15
	| 16
	| 17
	| 18
	| 19
	| 20
	| 21
	| 22
	| 23
	| 24
	| 25
	| 26
	| 27
	| 28;

interface BudgetPeriodDetailsProps {
	period: 'weekly' | 'monthly';
	weekStartDay: WeekStartDay;
	monthStartDay: MonthStartDay;
	onWeekStartChange: (day: WeekStartDay) => void;
	onMonthStartChange: (day: MonthStartDay) => void;
}

export const BudgetPeriodDetails: React.FC<BudgetPeriodDetailsProps> = ({
	period,
	weekStartDay,
	monthStartDay,
	onWeekStartChange,
	onMonthStartChange,
}) => {
	if (period === 'weekly') {
		return (
			<FormInputGroup
				label="Week Starts On"
				subtext="Choose which day your week begins"
			>
				<View style={styles.dayContainer}>
					<TouchableOpacity
						style={[
							styles.dayOption,
							weekStartDay === 0 && styles.selectedDayOption,
						]}
						onPress={() => onWeekStartChange(0)}
						activeOpacity={0.9}
					>
						<Text
							style={[
								type.body,
								styles.dayOptionText,
								weekStartDay === 0 && styles.selectedDayOptionText,
							]}
						>
							Sunday
						</Text>
					</TouchableOpacity>
					<TouchableOpacity
						style={[
							styles.dayOption,
							weekStartDay === 1 && styles.selectedDayOption,
						]}
						onPress={() => onWeekStartChange(1)}
						activeOpacity={0.9}
					>
						<Text
							style={[
								type.body,
								styles.dayOptionText,
								weekStartDay === 1 && styles.selectedDayOptionText,
							]}
						>
							Monday
						</Text>
					</TouchableOpacity>
				</View>
			</FormInputGroup>
		);
	}

	if (period === 'monthly') {
		return (
			<FormInputGroup
				label="Month Starts On Day"
				subtext="Choose which day of the month your budget resets"
			>
				<View style={styles.monthDayContainer}>
					{Array.from({ length: 28 }, (_, i) => (i + 1) as MonthStartDay).map(
						(day) => (
							<TouchableOpacity
								key={day}
								style={[
									styles.monthDayOption,
									monthStartDay === day && styles.selectedMonthDayOption,
								]}
								onPress={() => onMonthStartChange(day)}
								activeOpacity={0.9}
							>
								<Text
									style={[
										type.small,
										styles.monthDayOptionText,
										monthStartDay === day &&
											styles.selectedMonthDayOptionText,
									]}
								>
									{day}
								</Text>
							</TouchableOpacity>
						)
					)}
				</View>
			</FormInputGroup>
		);
	}

	return null;
};

const styles = StyleSheet.create({
	dayContainer: {
		flexDirection: 'row',
		gap: space.sm,
	},
	dayOption: {
		flex: 1,
		paddingVertical: space.md,
		borderRadius: radius.lg,
		backgroundColor: palette.surface,
		borderWidth: 1,
		borderColor: palette.border,
		alignItems: 'center',
	},
	selectedDayOption: {
		borderColor: palette.primary,
		backgroundColor: palette.primarySubtle,
	},
	dayOptionText: {
		color: palette.text,
	},
	selectedDayOptionText: {
		color: palette.primary,
		fontWeight: '600',
	},
	monthDayContainer: {
		flexDirection: 'row',
		flexWrap: 'wrap',
		gap: space.xs,
	},
	monthDayOption: {
		width: 38,
		height: 38,
		borderRadius: radius.pill,
		backgroundColor: palette.surface,
		borderWidth: 1,
		borderColor: palette.border,
		alignItems: 'center',
		justifyContent: 'center',
	},
	selectedMonthDayOption: {
		borderColor: palette.primary,
		backgroundColor: palette.primarySubtle,
	},
	monthDayOptionText: {
		color: palette.text,
	},
	selectedMonthDayOptionText: {
		color: palette.primary,
		fontWeight: '600',
	},
});
