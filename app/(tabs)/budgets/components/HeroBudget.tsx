import React, { memo } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import CircularProgressBar from './CircularProgressBar';
import { palette, shadow } from '../../../../src/ui';

type Props = {
	mode: 'all' | 'monthly' | 'weekly';
	percent: number; // 0..100+
	spent: number; // raw number
	total: number; // raw number
	subtitle: string; // e.g., "Oct 5 – Oct 31" / "This Week"
	daysLeft?: number | null; // show only when monthly/weekly
	projected?: number | null;
	onPress: () => void; // cycle periods
	variant?: 'default' | 'compact'; // compact = use when there's a top bar
};

const currency = (n = 0) =>
	new Intl.NumberFormat('en-US', {
		style: 'currency',
		currency: 'USD',
	}).format(Math.max(0, n));

const Chip = ({
	label,
	value,
	danger,
}: {
	label: string;
	value: string;
	danger?: boolean;
}) => (
	<View style={styles.chip} accessibilityLabel={`${label} ${value}`}>
		<Text style={styles.chipLabel}>{label}</Text>
		<Text style={[styles.chipValue, danger && { color: '#ef4444' }]}>
			{value}
		</Text>
	</View>
);

const RiskBadge = ({ over }: { over: number }) => (
	<View
		style={styles.badge}
		accessibilityLabel={`Projected over by ${currency(over)}`}
	>
		<Ionicons name="warning-outline" size={14} color="#ef4444" />
		<Text style={styles.badgeText}>Over by {currency(over)}</Text>
	</View>
);

function HeroBudget({
	mode,
	percent,
	spent,
	total,
	subtitle,
	daysLeft,
	projected,
	onPress,
	variant = 'default',
}: Props) {
	const center = `${Math.max(0, Math.round(percent))}%`;
	const remaining = Math.max(0, total - spent);
	const over = projected && total > 0 ? Math.max(0, projected - total) : 0;

	return (
		<TouchableOpacity
			activeOpacity={0.9}
			onPress={onPress}
			accessibilityRole="button"
			accessibilityHint="Tap to cycle between All, Monthly, and Weekly views"
		>
			<View style={styles.container}>
				{/* header (hidden in compact mode to avoid duplication with top bar) */}
				{variant === 'default' && (
					<View style={styles.header}>
						<View style={{ flexDirection: 'row', alignItems: 'center' }}>
							<Text style={styles.title}>Budgets</Text>
							<View style={styles.modePill}>
								<Ionicons
									name={
										mode === 'weekly'
											? 'calendar-outline'
											: mode === 'monthly'
											? 'calendar'
											: 'grid-outline'
									}
									size={12}
									color="#0A84FF"
								/>
								<Text style={styles.modeText}>
									{mode === 'all'
										? 'All'
										: mode === 'monthly'
										? 'Monthly'
										: 'Weekly'}
								</Text>
							</View>
						</View>
						<View style={styles.chevron}>
							<Ionicons name="chevron-down" size={16} color="#0A84FF" />
						</View>
					</View>
				)}

				{/* ring + chips */}
				<View style={[styles.body, variant === 'compact' && { marginTop: 0 }]}>
					<CircularProgressBar
						percent={percent}
						size={156}
						strokeWidth={10}
						color={percent > 100 ? '#ef4444' : '#0A84FF'}
						trackColor="#EAF1F8"
						centerLabel={center}
						subtitle={`${currency(spent)} / ${currency(total)}`}
						animated
					/>

					<View style={styles.chipsCol}>
						<Chip label="Spent" value={currency(spent)} />
						<Chip label="Total" value={currency(total)} />
						<Chip label="Remaining" value={currency(remaining)} />
						{typeof daysLeft === 'number' && (
							<Chip label="Days left" value={`${daysLeft}`} />
						)}
						{typeof projected === 'number' && (
							<Chip
								label="Projected"
								value={currency(projected)}
								danger={over > 0}
							/>
						)}
						{over > 0 && <RiskBadge over={over} />}
					</View>
				</View>

				{/* footer */}
				<View
					style={[styles.footer, variant === 'compact' && { marginTop: 10 }]}
				>
					<Text style={styles.subtitle} numberOfLines={1}>
						{subtitle}
					</Text>
					<Text style={styles.tapHint}>Tap to switch period</Text>
				</View>
			</View>
		</TouchableOpacity>
	);
}

export default memo(HeroBudget);

const styles = StyleSheet.create({
	container: {
		backgroundColor: palette.surface,
		borderRadius: 20,
		padding: 14,
		borderWidth: 1,
		borderColor: palette.border,

	},
	header: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
		marginBottom: 8,
	},
	title: { fontSize: 18, fontWeight: '700', color: '#0F172A' },
	modePill: {
		marginLeft: 8,
		paddingHorizontal: 8,
		paddingVertical: 4,
		borderRadius: 999,
		backgroundColor: '#E6F0FF',
		flexDirection: 'row',
		alignItems: 'center',
		gap: 6,
	},
	modeText: { fontSize: 12, fontWeight: '600', color: '#0A84FF' },
	chevron: {
		width: 26,
		height: 26,
		borderRadius: 13,
		backgroundColor: '#FFFFFF',
		alignItems: 'center',
		justifyContent: 'center',
		borderWidth: 1,
		borderColor: '#E6EDF5',
	},
	body: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
		marginTop: 4,
	},
	chipsCol: { flex: 1, marginLeft: 16, rowGap: 8 },
	chip: {
		backgroundColor: '#FFFFFF',
		borderRadius: 12,
		paddingVertical: 8,
		paddingHorizontal: 12,
		borderWidth: 1,
		borderColor: '#EEF2F7',
	},
	chipLabel: { fontSize: 12, color: '#64748B' },
	chipValue: { fontSize: 16, fontWeight: '700', color: '#0F172A' },
	badge: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 6,
		alignSelf: 'flex-start',
		paddingHorizontal: 10,
		paddingVertical: 6,
		borderRadius: 999,
		backgroundColor: '#FFF1F1',
		borderWidth: 1,
		borderColor: '#FFD7D7',
		marginTop: 2,
	},
	badgeText: { fontSize: 12, color: '#ef4444', fontWeight: '600' },
	footer: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		alignItems: 'center',
		marginTop: 14,
	},
	subtitle: { color: '#64748B', fontSize: 13, fontWeight: '500', flex: 1 },
	tapHint: { color: '#94A3B8', fontSize: 12, marginLeft: 12 },
});
