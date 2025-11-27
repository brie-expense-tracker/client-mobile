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

const DebtsFeed: React.FC<Props> = ({
	debts,
	scrollEnabled = true,
	isLoading = false,
}) => {
	const router = useRouter();

	const renderItem = ({ item }: { item: Debt }) => {
		const typeLabel = DebtsService.formatDebtType(item.type);
		const hasMin = typeof item.minPayment === 'number' && item.minPayment > 0;
		const hasApr = item.interestRate > 0;

		const iconName: keyof typeof Ionicons.glyphMap =
			item.type === 'creditCard'
				? 'card-outline'
				: item.type === 'studentLoan'
				? 'school-outline'
				: item.type === 'mortgage'
				? 'home-outline'
				: 'cash-outline';

		const handlePress = () => {
			router.push({
				pathname: '/(tabs)/wallet/debts/[id]',
				params: { id: item._id },
			});
		};

		return (
			<View style={styles.itemContainer}>
				<View style={styles.shadowWrapper}>
					<Pressable
						onPress={handlePress}
						style={({ pressed, hovered }) => [
							styles.card,
							(pressed || hovered) && styles.cardPressed,
						]}
						android_ripple={{ color: `${palette.borderMuted}60` }}
						accessibilityRole="button"
						accessibilityLabel={`Open debt ${item.name}`}
					>
						{/* Icon + title */}
						<View style={styles.topRow}>
							<View style={styles.iconCircle}>
								<Ionicons name={iconName} size={20} color={palette.primary} />
							</View>

							<View style={styles.titleBlock}>
								<Text style={styles.name}>{item.name}</Text>
								<Text style={styles.subtitle}>{typeLabel}</Text>
							</View>

							<Text style={styles.balance}>
								{currency(item.currentBalance)}
							</Text>
						</View>

						{/* Meta chips */}
						<View style={styles.metaRow}>
							{hasMin && (
								<View style={[styles.pill, styles.pillSoft]}>
									<Text style={styles.pillText}>
										Min {currency(item.minPayment!)}
									</Text>
								</View>
							)}

							{hasApr && (
								<View style={[styles.pill, styles.pillSoft]}>
									<Text style={styles.pillText}>
										{DebtsService.formatInterestRate(item.interestRate)} APR
									</Text>
								</View>
							)}

							{item.isSynthetic && (
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
					</Pressable>
				</View>
			</View>
		);
	};

	if (isLoading && debts.length === 0) {
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
			renderItem={renderItem}
			scrollEnabled={scrollEnabled}
			ItemSeparatorComponent={() => <View style={styles.separator} />}
			contentContainerStyle={
				debts.length === 0
					? { flexGrow: 1, paddingVertical: space.sm }
					: { paddingVertical: space.sm }
			}
			ListEmptyComponent={
				<View style={styles.emptyState}>
					<Ionicons name="card-outline" size={40} color={palette.iconMuted} />
					<Text style={styles.emptyTitle}>No debts tracked yet</Text>
					<Text style={styles.emptySubtitle}>
						Add your credit cards, loans, or any balances you want to track.
					</Text>
				</View>
			}
		/>
	);
};

const styles = StyleSheet.create({
	itemContainer: {
		// prevents overlapping shadows between rows
		paddingHorizontal: 0,
	},
	shadowWrapper: {
		borderRadius: radius.xl,
		backgroundColor: 'transparent',
		width: '100%',
	},
	card: {
		backgroundColor: palette.surface,
		borderRadius: radius.xl,
		paddingHorizontal: space.lg,
		paddingVertical: space.lg,
		overflow: 'hidden',
	},
	cardPressed: {
		backgroundColor: palette.surfaceAlt,
		opacity: 0.96,
		transform: [{ scale: 0.99 }],
	},
	separator: {
		height: space.sm,
	},
	topRow: {
		flexDirection: 'row',
		alignItems: 'center',
		marginBottom: space.sm,
	},
	iconCircle: {
		width: 40,
		height: 40,
		borderRadius: 20,
		backgroundColor: palette.surfaceSubtle,
		alignItems: 'center',
		justifyContent: 'center',
		marginRight: space.md,
	},
	titleBlock: {
		flex: 1,
	},
	name: {
		...typography.labelSm,
		color: palette.text,
		fontWeight: '600',
	},
	subtitle: {
		...typography.bodyXs,
		color: palette.textMuted,
		marginTop: 2,
	},
	balance: {
		...typography.labelSm,
		color: palette.text,
		fontWeight: '600',
		marginLeft: space.md,
	},
	metaRow: {
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
});

export default DebtsFeed;
