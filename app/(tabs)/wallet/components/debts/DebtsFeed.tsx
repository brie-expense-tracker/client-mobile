// app/(tabs)/wallet/components/debts/DebtsFeed.tsx

import React from 'react';
import {
	View,
	Text,
	StyleSheet,
	FlatList,
	Pressable,
	ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

import {
	Debt,
	DebtsService,
} from '../../../../../src/services/feature/debtsService';
import {
	palette,
	radius,
	space,
	type as typography,
} from '../../../../../src/ui';
import { currency } from '../../../../../src/utils/format';

interface Props {
	debts: Debt[];
	scrollEnabled?: boolean;
	isLoading?: boolean;
}

// ---------- Row component (same flow as other feeds) ----------

function DebtRow({ debt }: { debt: Debt }) {
	const router = useRouter();

	const typeLabel = DebtsService.formatDebtType(debt.type);
	const hasMin = typeof debt.minPayment === 'number' && debt.minPayment > 0;
	const hasApr = debt.interestRate > 0;

	const iconName: keyof typeof Ionicons.glyphMap =
		debt.type === 'creditCard'
			? 'card-outline'
			: debt.type === 'studentLoan'
			? 'school-outline'
			: debt.type === 'mortgage'
			? 'home-outline'
			: 'cash-outline';

	const handlePress = () => {
		router.push({
			pathname: '/(tabs)/wallet/debts/[id]',
			params: { id: debt._id },
		});
	};

	return (
		<Pressable
			onPress={handlePress}
			style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
			android_ripple={{ color: palette.borderMuted, borderless: false }}
			accessibilityRole="button"
			accessibilityLabel={`Open debt ${debt.name}`}
		>
			{/* Top row — icon + title/subtitle + balance (same as budgets/bills/goals header) */}
			<View style={styles.headerRow}>
				<View style={styles.leftCol}>
					<View style={styles.iconBubble}>
						<Ionicons name={iconName} size={20} color={palette.primary} />
					</View>

					<View style={styles.titleBlock}>
						<Text style={styles.title} numberOfLines={1}>
							{debt.name}
						</Text>
						<Text style={styles.subtitle} numberOfLines={1}>
							{typeLabel}
						</Text>
					</View>
				</View>

				<View style={styles.amountCol}>
					<Text style={styles.amountLabel}>Balance</Text>
					<Text style={styles.amountValue}>
						{currency(debt.currentBalance)}
					</Text>
				</View>
			</View>

			{/* Bottom row — meta chips on the left, future room on the right */}
			<View style={styles.metaInlineRow}>
				<View style={styles.metaChipsRow}>
					{hasMin && (
						<View style={[styles.pill, styles.pillSoft]}>
							<Text style={styles.pillText}>
								Min {currency(debt.minPayment!)}
							</Text>
						</View>
					)}

					{hasApr && (
						<View style={[styles.pill, styles.pillSoft]}>
							<Text style={styles.pillText}>
								{DebtsService.formatInterestRate(debt.interestRate)} APR
							</Text>
						</View>
					)}

					{debt.isSynthetic && (
						<View style={[styles.pill, styles.pillAlt]}>
							<Ionicons
								name="sparkles-outline"
								size={14}
								color={palette.textMuted}
								style={{ marginRight: 4 }}
							/>
							<Text style={styles.pillText}>Auto-tracked</Text>
						</View>
					)}
				</View>
			</View>
		</Pressable>
	);
}

// ---------- Feed component (matches other feeds) ----------

const DebtsFeed: React.FC<Props> = ({
	debts,
	scrollEnabled = true,
	isLoading = false,
}) => {
	const isEmpty = debts.length === 0;

	if (isLoading && isEmpty) {
		return (
			<View style={styles.loadingState}>
				<ActivityIndicator size="small" color={palette.primary} />
				<Text style={styles.loadingText}>Loading debts…</Text>
			</View>
		);
	}

	return (
		<FlatList
			data={debts}
			keyExtractor={(d, idx) => d._id ?? `debt-${idx}`}
			renderItem={({ item }) => <DebtRow debt={item} />}
			scrollEnabled={scrollEnabled}
			contentContainerStyle={[
				styles.listContent,
				isEmpty && styles.listContentEmpty,
			]}
			ListEmptyComponent={
				<View style={styles.emptyState}>
					<Ionicons name="card-outline" size={40} color={palette.iconMuted} />
					<Text style={styles.emptyTitle}>No debts tracked yet</Text>
					<Text style={styles.emptySubtitle}>
						Add your credit cards, loans, or any balances you want to track.
					</Text>
				</View>
			}
			ListFooterComponent={
				!isEmpty ? <View style={styles.footerSpacer} /> : null
			}
		/>
	);
};

const styles = StyleSheet.create({
	// Card – same family as budgets/bills/goals
	card: {
		backgroundColor: palette.surface,
		borderRadius: radius.xl,
		paddingHorizontal: space.lg,
		paddingVertical: space.lg,
		borderWidth: 1,
		borderColor: palette.borderMuted,
		marginBottom: space.sm,
	},
	cardPressed: {
		backgroundColor: palette.surfaceSubtle,
		opacity: 0.98,
		transform: [{ scale: 0.99 }],
	},

	headerRow: {
		flexDirection: 'row',
		alignItems: 'center',
		marginBottom: space.sm,
	},
	leftCol: {
		flex: 1,
		flexDirection: 'row',
		alignItems: 'center',
	},
	iconBubble: {
		width: 40,
		height: 40,
		borderRadius: 20,
		backgroundColor: palette.surfaceSubtle,
		alignItems: 'center',
		justifyContent: 'center',
		marginRight: space.md,
	},
	titleBlock: {
		flexShrink: 1,
	},
	title: {
		color: palette.text,
		fontWeight: '600',
	},
	subtitle: {
		...typography.bodyXs,
		color: palette.textMuted,
		marginTop: 2,
	},
	amountCol: {
		alignItems: 'flex-end',
		marginLeft: space.md,
	},
	amountLabel: {
		...typography.bodyXs,
		color: palette.textMuted,
		marginBottom: 2,
	},
	amountValue: {
		...typography.labelSm,
		color: palette.text,
		fontWeight: '600',
	},

	metaInlineRow: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
	},
	metaChipsRow: {
		flexDirection: 'row',
		flexWrap: 'wrap',
		gap: 8,
	},

	pill: {
		flexDirection: 'row',
		alignItems: 'center',
		paddingHorizontal: 10,
		paddingVertical: 4,
		borderRadius: radius.full,
	},
	pillSoft: {
		backgroundColor: palette.surfaceSubtle,
	},
	pillAlt: {
		backgroundColor: palette.surfaceAlt,
	},
	pillText: {
		...typography.bodyXs,
		color: palette.textMuted,
	},

	loadingState: {
		flex: 1,
		justifyContent: 'center',
		alignItems: 'center',
		paddingVertical: 40,
	},
	loadingText: {
		...typography.bodySm,
		color: palette.textMuted,
		marginTop: 8,
	},

	emptyState: {
		flex: 1,
		justifyContent: 'center',
		alignItems: 'center',
		paddingVertical: 40,
		paddingHorizontal: 32,
	},
	emptyTitle: {
		...typography.titleSm,
		color: palette.text,
		textAlign: 'center',
		marginTop: 16,
	},
	emptySubtitle: {
		...typography.bodySm,
		color: palette.textMuted,
		textAlign: 'center',
		marginTop: 8,
		lineHeight: 20,
	},

	listContent: {
		paddingVertical: space.sm,
	},
	listContentEmpty: {
		flexGrow: 1,
	},
	footerSpacer: {
		height: space.md,
	},
});

export default DebtsFeed;
