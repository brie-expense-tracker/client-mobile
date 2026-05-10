import React, { useEffect, useMemo, useState } from 'react';
import {
	View,
	Text,
	TouchableOpacity,
	StyleSheet,
	Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import BottomSheet from '../../../../../src/components/BottomSheet';
import { palette, radius, space } from '../../../../../src/ui/theme';

type Props = {
	visible: boolean;
	value?: string; // ISO "YYYY-MM-DD"
	onClose: () => void;
	onChange: (isoDate: string) => void;
	minDate?: string; // optional ISO
	maxDate?: string; // optional ISO
};

const toISO = (d: Date) => {
	// Format date directly from local components to avoid timezone conversion issues
	const year = d.getFullYear();
	const month = String(d.getMonth() + 1).padStart(2, '0');
	const day = String(d.getDate()).padStart(2, '0');
	return `${year}-${month}-${day}`;
};

const startOfMonth = (d: Date) => new Date(d.getFullYear(), d.getMonth(), 1);
const addMonths = (d: Date, n: number) =>
	new Date(d.getFullYear(), d.getMonth() + n, 1);

const sameDay = (a: Date, b: Date) =>
	a.getFullYear() === b.getFullYear() &&
	a.getMonth() === b.getMonth() &&
	a.getDate() === b.getDate();

const isBefore = (a: Date, b: Date) => a.getTime() < b.getTime();
const isAfter = (a: Date, b: Date) => a.getTime() > b.getTime();

export default function CalendarSheet({
	visible,
	value,
	onClose,
	onChange,
	minDate,
	maxDate,
}: Props) {
	const today = useMemo(() => new Date(), []);
	const selected = useMemo(
		() => (value ? new Date(value + 'T00:00:00') : undefined),
		[value]
	);

	const [viewMonth, setViewMonth] = useState<Date>(() =>
		selected ? startOfMonth(selected) : startOfMonth(today)
	);

	useEffect(() => {
		if (!visible) return;
		setViewMonth(selected ? startOfMonth(selected) : startOfMonth(today));
	}, [visible, value, selected, today]);

	const monthMatrix = useMemo(() => {
		// Build 6x7 grid (Sun–Sat)
		const first = startOfMonth(viewMonth);
		const firstWeekday = (first.getDay() + 7) % 7; // Sun=0
		const gridStart = new Date(first);
		gridStart.setDate(first.getDate() - firstWeekday);

		const weeks: Date[][] = [];
		let cursor = new Date(gridStart);

		for (let w = 0; w < 6; w++) {
			const row: Date[] = [];
			for (let d = 0; d < 7; d++) {
				row.push(new Date(cursor));
				cursor.setDate(cursor.getDate() + 1);
			}
			weeks.push(row);
		}
		return weeks;
	}, [viewMonth]);

	const min = minDate ? new Date(minDate + 'T00:00:00') : undefined;
	const max = maxDate ? new Date(maxDate + 'T00:00:00') : undefined;

	const handlePick = (d: Date) => {
		if (min && isBefore(d, min)) return;
		if (max && isAfter(d, max)) return;
		onChange(toISO(d));
		onClose();
	};

	const monthTitle = viewMonth.toLocaleDateString('en-US', {
		month: 'long',
		year: 'numeric',
	});

	const weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

	return (
		<BottomSheet
			isOpen={visible}
			onClose={onClose}
			snapPoints={[0.58]}
			initialSnapIndex={0}
			enablePanGesture={false}
			closeOnBackdropPress={false}
			closeOnPanDown={false}
			dismissOnHardwareBack={false}
			maxBackdropOpacity={0.52}
			backdropA11yLabel="Calendar overlay"
			header={
				<View style={styles.sheetHeader}>
					<TouchableOpacity
						style={styles.navBtn}
						onPress={() => setViewMonth((m) => addMonths(m, -1))}
						accessibilityRole="button"
						accessibilityLabel="Previous month"
					>
						<Ionicons name="chevron-back" size={22} color={palette.text} />
					</TouchableOpacity>

					<Text style={styles.headerTitle} numberOfLines={1}>
						{monthTitle}
					</Text>

					<TouchableOpacity
						style={styles.navBtn}
						onPress={() => setViewMonth((m) => addMonths(m, 1))}
						accessibilityRole="button"
						accessibilityLabel="Next month"
					>
						<Ionicons name="chevron-forward" size={22} color={palette.text} />
					</TouchableOpacity>

					<TouchableOpacity
						onPress={onClose}
						style={styles.closeHit}
						hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
						accessibilityLabel="Close calendar"
						accessibilityRole="button"
					>
						<Ionicons name="close" size={22} color={palette.textMuted} />
					</TouchableOpacity>
				</View>
			}
		>
			<View style={styles.sheetBody}>
				{/* Weekday labels */}
				<View style={styles.weekRow}>
					{weekDays.map((w) => (
						<Text key={w} style={styles.weekLabel}>
							{w}
						</Text>
					))}
				</View>

				{/* Grid */}
				<View>
					{monthMatrix.map((week, wi) => (
						<View key={wi} style={styles.weekRow}>
							{week.map((d, di) => {
								const inMonth = d.getMonth() === viewMonth.getMonth();
								const isToday = sameDay(d, today);
								const isSelected = selected ? sameDay(d, selected) : false;

								const disabled =
									(min && isBefore(d, min)) || (max && isAfter(d, max));

								const dayStyle = [
									styles.day,
									!inMonth && styles.dayOut,
									isToday && styles.dayToday,
									isSelected && styles.daySelected,
									disabled && styles.dayDisabled,
								];

								return (
									<TouchableOpacity
										key={di}
										style={dayStyle}
										onPress={() => handlePick(d)}
										disabled={disabled}
										accessibilityRole="button"
										accessibilityLabel={d.toDateString()}
									>
										<Text
											style={[
												styles.dayText,
												!inMonth && styles.dayTextOut,
												isSelected && styles.dayTextSelected,
												disabled && styles.dayTextDisabled,
											]}
										>
											{d.getDate()}
										</Text>
									</TouchableOpacity>
								);
							})}
						</View>
					))}
				</View>

				{/* Quick actions */}
				<View style={styles.quickRow}>
					<TouchableOpacity
						style={styles.quickBtn}
						onPress={() => {
							onChange(toISO(today));
							onClose();
						}}
					>
						<Ionicons name="calendar" size={16} color={palette.primary} />
						<Text style={styles.quickText}>Today</Text>
					</TouchableOpacity>

					<TouchableOpacity
						style={styles.quickBtn}
						onPress={() => {
							onChange('');
							onClose();
						}}
					>
						<Ionicons name="close-circle" size={16} color={palette.primary} />
						<Text style={styles.quickText}>Clear</Text>
					</TouchableOpacity>
				</View>
			</View>
		</BottomSheet>
	);
}

const styles = StyleSheet.create({
	sheetHeader: {
		flexDirection: 'row',
		alignItems: 'center',
		paddingHorizontal: space.lg,
		paddingVertical: space.sm,
		minHeight: 52,
		borderBottomWidth: StyleSheet.hairlineWidth,
		borderBottomColor: palette.border,
	},
	navBtn: {
		padding: 4,
	},
	headerTitle: {
		flex: 1,
		minWidth: 0,
		textAlign: 'center',
		fontSize: 16,
		fontWeight: '600',
		color: palette.text,
	},
	closeHit: {
		width: 44,
		height: 44,
		alignItems: 'center',
		justifyContent: 'center',
		marginLeft: 4,
	},
	sheetBody: {
		paddingTop: 4,
		paddingBottom: Platform.select({ ios: 8, android: 0 }),
	},
	weekRow: {
		flexDirection: 'row',
		justifyContent: 'space-between',
	},
	weekLabel: {
		flex: 1,
		textAlign: 'center',
		paddingVertical: 6,
		fontSize: 12,
		fontWeight: '600',
		color: palette.textMuted,
	},
	day: {
		flex: 1,
		marginVertical: 6,
		marginHorizontal: 2,
		height: 40,
		borderRadius: radius.xl2,
		justifyContent: 'center',
		alignItems: 'center',
	},
	dayOut: {
		opacity: 0.45,
	},
	dayToday: {
		borderWidth: 1,
		borderColor: palette.primary,
	},
	daySelected: {
		backgroundColor: palette.primary,
	},
	dayDisabled: {
		opacity: 0.3,
	},
	dayText: {
		fontSize: 14,
		color: palette.text,
		fontWeight: '600',
	},
	dayTextOut: {
		color: palette.textMuted,
	},
	dayTextSelected: {
		color: palette.textOnPrimary,
	},
	dayTextDisabled: {
		color: palette.textSubtle,
	},
	quickRow: {
		flexDirection: 'row',
		justifyContent: 'flex-end',
		gap: 12,
		marginTop: 6,
	},
	quickBtn: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 6,
		paddingVertical: 8,
		paddingHorizontal: 10,
		borderRadius: radius.xl2,
		backgroundColor: palette.primarySoft,
	},
	quickText: {
		fontSize: 13,
		fontWeight: '600',
		color: palette.primary,
	},
});
