import React, { useState, useMemo, useCallback } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Calendar, LocaleConfig } from 'react-native-calendars';
import { RectButton } from 'react-native-gesture-handler';
import { Ionicons } from '@expo/vector-icons';
import dayjs from 'dayjs';

// Calendar locale configuration
LocaleConfig.locales.us = {
	monthNames: [
		'January',
		'February',
		'March',
		'April',
		'May',
		'June',
		'July',
		'August',
		'September',
		'October',
		'November',
		'December',
	],
	monthNamesShort: [
		'Jan',
		'Feb',
		'Mar',
		'Apr',
		'May',
		'Jun',
		'Jul',
		'Aug',
		'Sep',
		'Oct',
		'Nov',
		'Dec',
	],
	dayNames: [
		'Sunday',
		'Monday',
		'Tuesday',
		'Wednesday',
		'Thursday',
		'Friday',
		'Saturday',
	],
	dayNamesShort: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'],
	today: 'Today',
};
LocaleConfig.defaultLocale = 'us';

export type DateFieldProps = {
	value: string; // yyyy-mm-dd format
	onChange: (isoDate: string) => void;
	title?: string;
	minDate?: string; // optional: '2020-01-01'
	maxDate?: string; // optional: dayjs().format('YYYY-MM-DD')
	testID?: string;
	placeholder?: string;
	showQuickActions?: boolean;
	containerStyle?: any;
};

export const DateField: React.FC<DateFieldProps> = ({
	value,
	onChange,
	title,
	minDate,
	maxDate,
	testID = 'date-field',
	placeholder = 'Select a date',
	showQuickActions = true,
	containerStyle,
}) => {
	const [open, setOpen] = useState(false);

	const marked = useMemo(() => {
		if (!value) return {};
		return {
			[value]: {
				selected: true,
				selectedColor: '#00a2ff',
				selectedTextColor: '#fff',
				disableTouchEvent: true,
			},
		};
	}, [value]);

	const handleDayPress = useCallback(
		(d: any) => {
			// d.dateString is already 'YYYY-MM-DD'
			onChange(d.dateString);
			setOpen(false);
		},
		[onChange]
	);

	const setToday = useCallback(() => {
		onChange(dayjs().format('YYYY-MM-DD'));
		setOpen(false);
	}, [onChange]);

	const setYesterday = useCallback(() => {
		onChange(dayjs().subtract(1, 'day').format('YYYY-MM-DD'));
		setOpen(false);
	}, [onChange]);

	const clearDate = useCallback(() => {
		// Set to today for safety
		onChange(dayjs().format('YYYY-MM-DD'));
		setOpen(false);
	}, [onChange]);

	return (
		<View style={[containerStyle]} testID={testID}>
			{title && <Text style={styles.sectionTitle}>{title}</Text>}

			{/* Trigger */}
			<TouchableOpacity
				style={styles.dateSelector}
				onPress={() => setOpen((s) => !s)}
				accessibilityLabel="Select date"
				accessibilityHint={open ? 'Collapse calendar' : 'Expand calendar'}
				accessibilityState={{ expanded: open }}
				testID="date-trigger"
			>
				<Ionicons name="calendar-outline" size={18} color="#007AFF" />
				<Text style={styles.dateText}>
					{value ? new Date(value).toLocaleDateString() : placeholder}
				</Text>
				<Ionicons
					name={open ? 'chevron-up' : 'chevron-down'}
					size={16}
					color="#666"
				/>
			</TouchableOpacity>

			{/* Calendar Panel */}
			{open && (
				<View style={calendarStyles.card} testID="calendar-panel" accessible>
					{/* Quick actions */}
					{showQuickActions && (
						<View style={calendarStyles.quickRow}>
							<RectButton
								style={calendarStyles.quickBtn}
								onPress={setToday}
								testID="quick-today"
							>
								<Text style={calendarStyles.quickText}>Today</Text>
							</RectButton>
							<RectButton
								style={calendarStyles.quickBtn}
								onPress={setYesterday}
								testID="quick-yesterday"
							>
								<Text style={calendarStyles.quickText}>Yesterday</Text>
							</RectButton>
							<RectButton
								style={calendarStyles.quickBtn}
								onPress={clearDate}
								testID="quick-clear"
							>
								<Text style={calendarStyles.quickText}>Clear</Text>
							</RectButton>
						</View>
					)}

					{/* Calendar grid */}
					<Calendar
						onDayPress={handleDayPress}
						markedDates={marked}
						firstDay={0} // Sunday start
						enableSwipeMonths
						renderArrow={(direction) => (
							<Ionicons
								name={direction === 'left' ? 'chevron-back' : 'chevron-forward'}
								size={18}
								color="#111"
							/>
						)}
						theme={{
							backgroundColor: '#fff',
							calendarBackground: '#fff',
							textSectionTitleColor: '#6b7280',
							selectedDayBackgroundColor: '#00a2ff',
							selectedDayTextColor: '#fff',
							todayTextColor: '#0A66FF',
							dayTextColor: '#111',
							textDisabledColor: '#d1d5db',
							monthTextColor: '#111',
							arrowColor: '#111',
							textDayFontWeight: '500',
							textMonthFontWeight: '700',
							textDayHeaderFontWeight: '600',
							textDayFontSize: 14,
							textMonthFontSize: 16,
							textDayHeaderFontSize: 12,
						}}
						minDate={minDate}
						maxDate={maxDate}
						accessibilityElementsHidden={false}
						importantForAccessibility="yes"
						style={{ transform: [] }}
					/>
				</View>
			)}
		</View>
	);
};

const styles = StyleSheet.create({
	sectionTitle: {
		fontSize: 16,
		fontWeight: '700',
		color: '#111',
		marginBottom: 10,
	},
	dateSelector: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 10,
		paddingVertical: 12,
		paddingHorizontal: 16,
		borderRadius: 12,
		borderWidth: 1,
		borderColor: '#e0e0e0',
		backgroundColor: '#fff',
	},
	dateText: {
		flex: 1,
		fontSize: 16,
		color: '#111',
		fontWeight: '500',
	},
});

// Calendar-specific styles
const calendarStyles = StyleSheet.create({
	card: {
		marginTop: 10,
		borderRadius: 12,
		borderWidth: 1,
		borderColor: '#eee',
		backgroundColor: '#fff',
		shadowColor: '#000',
		shadowOpacity: 0.06,
		shadowRadius: 8,
		shadowOffset: { width: 0, height: 4 },
		elevation: 2,
	},
	quickRow: {
		flexDirection: 'row',
		gap: 8,
		paddingHorizontal: 12,
		paddingTop: 12,
	},
	quickBtn: {
		borderWidth: 1,
		borderColor: '#e0e0e0',
		backgroundColor: '#f9fafb',
		borderRadius: 10,
		paddingVertical: 8,
		paddingHorizontal: 12,
	},
	quickText: {
		color: '#111',
		fontWeight: '600',
		fontSize: 13,
	},
});
