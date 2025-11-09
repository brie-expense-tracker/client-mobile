import React, { memo } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import CircularProgressBar from './CircularProgressBar';
import { palette, space, type as typography } from '../../../../src/ui';

type Props = {
	mode: 'all' | 'monthly' | 'weekly';
	percent: number; // 0..100+
	spent: number; // raw number
	total: number; // raw number
	subtitle: string; // e.g., "Oct 5 – Oct 31" / "This Week"
	daysLeft?: number | null; // show only when monthly/weekly
	onAddBudget?: () => void; // add budget handler
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
		<Text style={styles.chipLabel} numberOfLines={1}>
			{label}
		</Text>
		<Text
			style={[styles.chipValue, danger && { color: '#ef4444' }]}
			numberOfLines={1}
			ellipsizeMode="tail"
		>
			{value}
		</Text>
	</View>
);

function HeroBudget({
	mode,
	percent,
	spent,
	total,
	subtitle,
	daysLeft,
	onAddBudget,
	variant = 'default',
}: Props) {
	const center = `${Math.max(0, Math.round(percent))}%`;
	const remaining = Math.max(0, total - spent);

	return (
		<View style={styles.container}>
			{/* header */}
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
				</View>
			)}
			{/* compact mode header with add button */}
			{variant === 'compact' && (
				<View style={styles.header}>
					<View style={styles.headerContent}>
						<Text style={styles.headerTitle} numberOfLines={1}>
							Budget Overview
						</Text>
						<Text style={styles.headerSubtitle} numberOfLines={1}>
							Track your spending across all budgets
						</Text>
					</View>
					{onAddBudget && (
						<TouchableOpacity
							style={styles.addButton}
							onPress={onAddBudget}
							accessibilityRole="button"
							accessibilityLabel="Add new budget"
						>
							<Ionicons name="add" size={20} color="#0F172A" />
							<Text style={styles.addButtonText}>Add Budget</Text>
						</TouchableOpacity>
					)}
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
				</View>
			</View>

			{/* footer */}
			<View style={[styles.footer, variant === 'compact' && { marginTop: 10 }]}>
				<Text style={styles.subtitle} numberOfLines={1}>
					{subtitle}
				</Text>
			</View>
		</View>
	);
}

export default memo(HeroBudget);

const styles = StyleSheet.create({
	container: {
		backgroundColor: palette.surface,
		borderRadius: 20,
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
		overflow: 'hidden', // Prevent content from overflowing
	},
	chipsCol: {
		flex: 1,
		marginLeft: 16,
		rowGap: 8,
		minWidth: 0, // Allow flex children to shrink below content size
		overflow: 'hidden', // Prevent chips from falling off the card
	},
	chip: {
		backgroundColor: '#FFFFFF',
		borderRadius: 12,
		paddingVertical: 8,
		paddingHorizontal: 12,
		borderWidth: 1,
		borderColor: '#EEF2F7',
		flexShrink: 1, // Allow chip to shrink if needed
		minWidth: 0, // Allow chip to shrink below content size
	},
	chipLabel: { fontSize: 12, color: '#64748B' },
	chipValue: {
		fontSize: 16,
		fontWeight: '700',
		color: '#0F172A',
	},
	footer: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		alignItems: 'center',
		marginTop: 14,
	},
	subtitle: { color: '#64748B', fontSize: 13, fontWeight: '500', flex: 1 },
	tapHint: { color: '#94A3B8', fontSize: 12, marginLeft: 12 },
	headerContent: {
		flex: 1,
		minWidth: 0,
		marginRight: space.md,
	},
	headerTitle: {
		...typography.titleMd,
		color: palette.text,
	},
	headerSubtitle: {
		...typography.bodySm,
		color: palette.textMuted,
		marginTop: 4,
	},
	addButton: {
		backgroundColor: palette.surfaceAlt,
		borderRadius: 12,
		paddingVertical: space.md,
		paddingHorizontal: space.md,
		flexDirection: 'row',
		alignItems: 'center',
		gap: 6,
		flexShrink: 0,
		borderWidth: 1,
		borderColor: palette.borderMuted,
	},
	addButtonText: {
		color: palette.text,
		fontSize: 14,
		fontWeight: '600',
	},
});
