// Ledger transaction row – MVP: Cash In / Cash Out, fixed categories, theme tokens
import React, { useCallback, useMemo } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
	useSharedValue,
	useAnimatedStyle,
	withSpring,
	withTiming,
	runOnJS,
	Easing,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { normalizeIconName } from '../../../../../src/constants/uiConstants';
import type { Transaction } from '../../../../../src/context/transactionContext';
import { palette, radius, space } from '../../../../../src/ui/theme';

// Helper function to format date without time
const formatDateWithoutTime = (dateString: string): string => {
	try {
		// Handle empty, null, or undefined date strings
		if (
			!dateString ||
			typeof dateString !== 'string' ||
			dateString.trim() === ''
		) {
			return 'Invalid Date';
		}

		// Extract just the date part (YYYY-MM-DD) if it's a longer string
		const datePart = dateString.slice(0, 10);

		// Check if it's a valid YYYY-MM-DD format
		if (!/^\d{4}-\d{2}-\d{2}$/.test(datePart)) {
			return 'Invalid Date';
		}

		// Parse the date in local timezone by creating a date object
		// and adjusting for timezone offset
		const [year, month, day] = datePart.split('-').map(Number);
		const date = new Date(year, month - 1, day); // month is 0-indexed

		// Check if the date is valid
		if (isNaN(date.getTime())) {
			return 'Invalid Date';
		}

		return date.toLocaleDateString('en-US', {
			month: 'short',
			day: 'numeric',
		});
	} catch {
		return 'Invalid Date';
	}
};

// Infer icon and color from description/category; uses theme palette
const getSmartFallback = (description: string | undefined, type: 'income' | 'expense') => {
	if (!description || typeof description !== 'string') {
		if (type === 'income') {
			return { icon: 'trending-up-outline' as keyof typeof Ionicons.glyphMap, color: palette.success };
		}
		return { icon: 'trending-down-outline' as keyof typeof Ionicons.glyphMap, color: palette.danger };
	}
	const desc = description.toLowerCase();

	if (type === 'income') {
		if (desc.includes('salary') || desc.includes('payroll') || desc.includes('wage')) {
			return { icon: 'briefcase-outline' as keyof typeof Ionicons.glyphMap, color: palette.success };
		}
		if (desc.includes('freelance') || desc.includes('contract') || desc.includes('gig')) {
			return { icon: 'laptop-outline' as keyof typeof Ionicons.glyphMap, color: palette.primary };
		}
		if (desc.includes('investment') || desc.includes('dividend') || desc.includes('stock')) {
			return { icon: 'trending-up-outline' as keyof typeof Ionicons.glyphMap, color: palette.primaryMuted };
		}
		if (desc.includes('refund') || desc.includes('rebate')) {
			return { icon: 'arrow-back-outline' as keyof typeof Ionicons.glyphMap, color: palette.success };
		}
		if (desc.includes('gift') || desc.includes('bonus')) {
			return { icon: 'gift-outline' as keyof typeof Ionicons.glyphMap, color: palette.warning };
		}
		return { icon: 'trending-up-outline' as keyof typeof Ionicons.glyphMap, color: palette.success };
	}

	// Expense (Cash Out) – map to theme
	if (desc.includes('food') || desc.includes('restaurant') || desc.includes('grocery') || desc.includes('dining')) {
		return { icon: 'restaurant-outline' as keyof typeof Ionicons.glyphMap, color: palette.warning };
	}
	if (desc.includes('gas') || desc.includes('fuel') || desc.includes('transport') || desc.includes('uber') || desc.includes('lyft')) {
		return { icon: 'car-outline' as keyof typeof Ionicons.glyphMap, color: palette.primary };
	}
	if (desc.includes('rent') || desc.includes('mortgage') || desc.includes('housing') || desc.includes('utilities')) {
		return { icon: 'home-outline' as keyof typeof Ionicons.glyphMap, color: palette.primaryMuted };
	}
	if (desc.includes('shopping') || desc.includes('store') || desc.includes('amazon') || desc.includes('retail')) {
		return { icon: 'bag-outline' as keyof typeof Ionicons.glyphMap, color: palette.danger };
	}
	if (desc.includes('entertainment') || desc.includes('movie') || desc.includes('game') || desc.includes('streaming')) {
		return { icon: 'game-controller-outline' as keyof typeof Ionicons.glyphMap, color: palette.primaryMuted };
	}
	if (desc.includes('health') || desc.includes('medical') || desc.includes('doctor') || desc.includes('pharmacy')) {
		return { icon: 'medical-outline' as keyof typeof Ionicons.glyphMap, color: palette.danger };
	}
	if (desc.includes('education') || desc.includes('school') || desc.includes('course') || desc.includes('book')) {
		return { icon: 'school-outline' as keyof typeof Ionicons.glyphMap, color: palette.primary };
	}
	if (desc.includes('subscription') || desc.includes('netflix') || desc.includes('spotify') || desc.includes('premium')) {
		return { icon: 'card-outline' as keyof typeof Ionicons.glyphMap, color: palette.primaryMuted };
	}
	if (desc.includes('insurance') || desc.includes('tax') || desc.includes('fee')) {
		return { icon: 'shield-outline' as keyof typeof Ionicons.glyphMap, color: palette.textMuted };
	}
	return { icon: 'trending-down-outline' as keyof typeof Ionicons.glyphMap, color: palette.danger };
};

interface TransactionRowProps {
	item: Transaction;
	onDelete: (id: string, resetAnimation: () => void) => void;
	onEdit?: (transaction: Transaction) => void;
}

const TransactionRowComponent: React.FC<TransactionRowProps> = ({
	item,
	onDelete,
	onEdit,
}) => {
	const translateX = useSharedValue(0);
	const iconScale = useSharedValue(1);
	const hasHaptics = useSharedValue(false);
	const TRANSLATE_THRESHOLD = -70;
	const DELETE_WIDTH = 60;

	// MVP: fixed category from metadata; show category when present for both income and expense
	const rowDisplay = useMemo(() => {
		const category = item.metadata?.category;
		const smartFallback = getSmartFallback(
			item.description ?? category,
			item.type
		);
		const fallbackLabel = item.type === 'income' ? 'Cash In' : 'Cash Out';
		return {
			name: category ?? fallbackLabel,
			icon: normalizeIconName(smartFallback.icon),
			color: smartFallback.color,
		};
	}, [item.type, item.description, item.metadata?.category]);

	// Clean description by removing " - Bill" suffix
	const cleanDescription = useMemo(() => {
		if (!item.description) return '';
		// Remove " - Bill" (case insensitive)
		return item.description
			.replace(/\s*-\s*Bill/gi, '')
			.trim();
	}, [item.description]);

	// Title: category or type fallback (never the full description)
	const displayTitle = rowDisplay.name;

	// Subtitle: description only, truncated to one line (handled via numberOfLines + ellipsizeMode)
	const displaySubtitle = cleanDescription || '';

	const triggerHaptic = useCallback(() => {
		Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
	}, []);

	// Memoize the reset animation function
	const resetAnimation = useCallback(() => {
		translateX.value = withSpring(0, { damping: 20 });
		iconScale.value = withSpring(1, { damping: 15, stiffness: 150 });
		hasHaptics.value = false;
	}, [translateX, iconScale, hasHaptics]);

	const isPanning = useSharedValue(false);

	const panGesture = useMemo(
		() =>
			Gesture.Pan()
				.activeOffsetX([-15, 15])
				.failOffsetY([-10, 10])
				.onStart(() => {
					isPanning.value = true;
				})
				.onUpdate(({ translationX }) => {
					translateX.value = Math.min(0, translationX);
					if (translateX.value < TRANSLATE_THRESHOLD && !hasHaptics.value) {
						hasHaptics.value = true;
						iconScale.value = withSpring(1.5, { damping: 15, stiffness: 150 });
						runOnJS(triggerHaptic)();
					} else if (
						translateX.value >= TRANSLATE_THRESHOLD &&
						hasHaptics.value
					) {
						hasHaptics.value = false;
						iconScale.value = withSpring(1, { damping: 15, stiffness: 150 });
					}
				})
				.onEnd(() => {
					isPanning.value = false;
					if (translateX.value < TRANSLATE_THRESHOLD) {
						// Only reveal the delete button; confirmation happens on trash icon tap
						translateX.value = withTiming(
							-DELETE_WIDTH,
							{ duration: 400, easing: Easing.bezier(0.25, 0.1, 0.25, 1) }
						);
					} else {
						translateX.value = withSpring(0, { damping: 20 });
						iconScale.value = withSpring(1, { damping: 15, stiffness: 150 });
					}
				}),
		[
			translateX,
			iconScale,
			hasHaptics,
			triggerHaptic,
			isPanning,
			TRANSLATE_THRESHOLD,
			DELETE_WIDTH,
		]
	);

	const tapGesture = useMemo(
		() =>
			Gesture.Tap()
				.onBegin(() => {
					// Cancel tap if panning is active
					if (isPanning.value) {
						return false;
					}
				})
				.onEnd(() => {
					// Only trigger edit if not panning
					if (!isPanning.value && onEdit) {
						runOnJS(onEdit)(item);
					}
				}),
		[onEdit, item, isPanning]
	);

	const combinedGesture = useMemo(
		() => Gesture.Race(panGesture, tapGesture),
		[panGesture, tapGesture]
	);

	const animatedRowStyle = useAnimatedStyle(() => ({
		transform: [{ translateX: translateX.value }],
	}));

	const animatedIconStyle = useAnimatedStyle(() => ({
		transform: [{ scale: iconScale.value }],
	}));

	const formattedAmount = useMemo(() => {
		const safeAmount = isNaN(item.amount) ? 0 : item.amount;
		const magnitude = Math.abs(safeAmount).toFixed(2);
		const sign = item.type === 'income' ? '+' : '-';
		return `${sign}$${magnitude}`;
	}, [item.amount, item.type]);

	return (
		<View style={styles.container}>
			<View style={styles.deleteBackground}>
				<Animated.View style={animatedIconStyle}>
					<TouchableOpacity onPress={() => onDelete(item.id, resetAnimation)}>
						<Ionicons name="trash-outline" size={18} color={palette.primaryTextOn} />
					</TouchableOpacity>
				</Animated.View>
			</View>

			<GestureDetector gesture={combinedGesture}>
				<Animated.View style={[styles.row, animatedRowStyle]}>
					<View
						style={[
							styles.iconCircle,
							{ backgroundColor: `${rowDisplay.color}20` },
						]}
					>
						<Ionicons
							name={rowDisplay.icon as React.ComponentProps<typeof Ionicons>['name']}
							size={20}
							color={rowDisplay.color}
						/>
					</View>
					<View style={styles.textContainer}>
						<View style={styles.descriptionContainer}>
							<Text style={styles.title}>{displayTitle}</Text>
						</View>
						{displaySubtitle ? (
							<Text
								style={styles.subtitle}
								numberOfLines={1}
								ellipsizeMode="tail"
							>
								{displaySubtitle}
							</Text>
						) : null}

						{/* Transaction Details */}
						{(item.notes ||
							item.source ||
							item.metadata?.location ||
							item.metadata?.paymentMethod) && (
							<View style={styles.detailsContainer}>
								{item.notes && (
									<View style={styles.detailRow}>
										<Ionicons
											name="document-text-outline"
											size={12}
											color={palette.textMuted}
										/>
										<Text style={styles.detailText}>{item.notes}</Text>
									</View>
								)}
								<View style={styles.detailsRow}>
									{item.metadata?.location && (
										<View style={styles.detailBadge}>
											<Ionicons name="location-outline" size={10} color={palette.textMuted} />
											<Text style={styles.detailBadgeText}>{item.metadata.location}</Text>
										</View>
									)}
									{item.metadata?.paymentMethod && (
										<View style={styles.detailBadge}>
											<Ionicons name="card-outline" size={10} color={palette.textMuted} />
											<Text style={styles.detailBadgeText}>{item.metadata.paymentMethod}</Text>
										</View>
									)}
									{item.source && item.source !== 'manual' && (
										<View style={styles.detailBadge}>
											<Ionicons
												name={
													item.source === 'plaid'
														? 'link-outline'
														: item.source === 'ai'
														? 'sparkles-outline'
														: 'download-outline'
												}
												size={10}
												color={palette.textMuted}
											/>
											<Text style={styles.detailBadgeText}>
												{item.source.charAt(0).toUpperCase() + item.source.slice(1)}
											</Text>
										</View>
									)}
								</View>
							</View>
						)}
					</View>
					<View style={styles.amountDate}>
						<Text
							style={[
								styles.amount,
								item.type === 'income' ? styles.income : styles.expense,
							]}
						>
							{formattedAmount}
						</Text>
						<Text style={styles.date}>{formatDateWithoutTime(item.date)}</Text>
					</View>
				</Animated.View>
			</GestureDetector>
		</View>
	);
};

// Memoize the component to prevent unnecessary re-renders
export const TransactionRow = React.memo(
	TransactionRowComponent,
	(prevProps, nextProps) => {
		// Re-render when any displayed field or metadata.category changes (MVP: fixed category)
		const shouldUpdate =
			prevProps.item.id === nextProps.item.id &&
			prevProps.item.description === nextProps.item.description &&
			prevProps.item.amount === nextProps.item.amount &&
			prevProps.item.date === nextProps.item.date &&
			prevProps.item.type === nextProps.item.type &&
			prevProps.item.metadata?.category === nextProps.item.metadata?.category &&
			prevProps.item.notes === nextProps.item.notes &&
			prevProps.item.source === nextProps.item.source &&
			prevProps.item.target === nextProps.item.target &&
			prevProps.item.targetModel === nextProps.item.targetModel &&
			prevProps.item.recurringPattern?.patternId === nextProps.item.recurringPattern?.patternId;

		return shouldUpdate;
	}
);

// Default export for React Router compatibility
export default TransactionRow;

const styles = StyleSheet.create({
	container: { overflow: 'hidden' },
	deleteBackground: {
		position: 'absolute',
		right: 0,
		top: 0,
		bottom: 0,
		width: '100%',
		backgroundColor: palette.danger,
		justifyContent: 'center',
		alignItems: 'flex-end',
		paddingRight: space.lg,
	},
	row: {
		flexDirection: 'row',
		alignItems: 'center',
		paddingVertical: space.md,
		backgroundColor: palette.surface,
		paddingHorizontal: space.xl,
	},
	iconCircle: {
		width: 36,
		height: 36,
		borderRadius: radius.sm,
		justifyContent: 'center',
		alignItems: 'center',
	},
	textContainer: {
		marginLeft: space.md,
		flex: 1,
	},
	descriptionContainer: {
		flexDirection: 'row',
		alignItems: 'center',
	},
	title: {
		fontSize: 16,
		fontWeight: '500',
		color: palette.text,
		flex: 1,
	},
	subtitle: {
		fontSize: 12,
		color: palette.textSubtle,
		marginTop: space.xs,
		fontWeight: '500',
		// Single line with ellipsis is enforced via numberOfLines + ellipsizeMode
	},
	amountDate: {
		alignItems: 'flex-end',
	},
	amount: {
		fontSize: 16,
		fontWeight: '600',
	},
	income: {
		color: palette.success,
	},
	expense: {
		color: palette.danger,
	},
	date: {
		fontSize: 12,
		color: palette.textSubtle,
		marginTop: space.xs,
	},
	detailsContainer: {
		marginTop: space.sm,
		gap: space.xs,
	},
	detailRow: {
		flexDirection: 'row',
		alignItems: 'flex-start',
		gap: space.sm,
		marginTop: 2,
	},
	detailText: {
		fontSize: 11,
		color: palette.textMuted,
		flex: 1,
		lineHeight: 14,
	},
	detailsRow: {
		flexDirection: 'row',
		flexWrap: 'wrap',
		gap: space.sm,
		marginTop: 2,
	},
	detailBadge: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: space.xs,
		paddingHorizontal: space.sm,
		paddingVertical: 2,
		backgroundColor: palette.subtle,
		borderRadius: radius.sm,
	},
	detailBadgeText: {
		fontSize: 10,
		color: palette.textMuted,
		fontWeight: '500',
	},
});
