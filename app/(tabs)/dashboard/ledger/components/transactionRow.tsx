// src/components/TransactionRow.tsx
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
import { useBudget } from '../../../../../src/context/budgetContext';
import { useGoal } from '../../../../../src/context/goalContext';

// Transaction interface defined inline since we removed the mock data file
interface Transaction {
	id: string;
	description: string;
	amount: number;
	date: string; // ISO string
	type: 'income' | 'expense';
	target?: string; // ObjectId of the target Budget or Goal
	targetModel?: 'Budget' | 'Goal';
	updatedAt?: string; // ISO string for sorting by time when dates are the same
	recurringPattern?: {
		patternId: string;
		frequency: string;
		confidence: number;
		nextExpectedDate: string;
	};
}

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

	// Get budget and goal contexts
	const { budgets } = useBudget();
	const { goals } = useGoal();

	// Memoize the transaction context calculation to prevent unnecessary recalculations
	const transactionContext = useMemo(() => {
		// Check if transaction has a target and targetModel
		if (item.target && item.targetModel) {
			if (item.targetModel === 'Budget' && item.type === 'expense') {
				// For expenses, find the matching budget by ID
				const matchingBudget = budgets.find(
					(budget) => budget.id === item.target
				);

				if (matchingBudget) {
					// Calculate the incremental percentage this transaction contributes to the budget
					const transactionContribution =
						(item.amount / (matchingBudget.amount || 1)) * 100;

					return {
						type: 'budget' as const,
						name: matchingBudget.name,
						icon: matchingBudget.icon as keyof typeof Ionicons.glyphMap,
						color: matchingBudget.color,
						progress: transactionContribution,
						spent: matchingBudget.spent || 0,
						allocated: matchingBudget.amount || 0,
						transactionAmount: item.amount,
					};
				}
			} else if (item.targetModel === 'Goal' && item.type === 'income') {
				// For income, find the matching goal by ID
				const matchingGoal = goals.find((goal) => goal.id === item.target);

				if (matchingGoal) {
					// Calculate the incremental percentage this transaction contributes to the goal
					const transactionContribution =
						(item.amount / matchingGoal.target) * 100;

					return {
						type: 'goal' as const,
						name: matchingGoal.name,
						icon: matchingGoal.icon as keyof typeof Ionicons.glyphMap,
						color: matchingGoal.color,
						progress: transactionContribution,
						current: matchingGoal.current,
						target: matchingGoal.target,
						transactionAmount: item.amount,
					};
				}
			}
		}

		// Fallback for transactions without matching budget/goal or no target
		return {
			type: 'general' as const,
			name: item.type === 'income' ? 'Income' : 'Expense',
			icon:
				item.type === 'income'
					? 'trending-up-outline'
					: ('trending-down-outline' as keyof typeof Ionicons.glyphMap),
			color: item.type === 'income' ? '#4CAF50' : '#F44336',
			progress: 0,
			spent: 0,
			allocated: 0,
		};
	}, [item.target, item.targetModel, item.type, item.amount, budgets, goals]);

	const triggerHaptic = useCallback(() => {
		Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
	}, []);

	// Memoize the reset animation function
	const resetAnimation = useCallback(() => {
		translateX.value = withSpring(0, { damping: 20 });
		iconScale.value = withSpring(1, { damping: 15, stiffness: 150 });
		hasHaptics.value = false;
	}, [translateX, iconScale, hasHaptics]);

	const handleDeleteJS = useCallback(() => {
		onDelete(item.id, resetAnimation);
	}, [item.id, onDelete, resetAnimation]);

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
						translateX.value = withTiming(
							-DELETE_WIDTH,
							{ duration: 400, easing: Easing.bezier(0.25, 0.1, 0.25, 1) },
							() => {
								runOnJS(handleDeleteJS)();
							}
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
			handleDeleteJS,
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

	return (
		<View style={styles.container}>
			<View style={styles.deleteBackground}>
				<Animated.View style={animatedIconStyle}>
					<TouchableOpacity onPress={() => onDelete(item.id, resetAnimation)}>
						<Ionicons name="trash-outline" size={18} color="#fff" />
					</TouchableOpacity>
				</Animated.View>
			</View>

			<GestureDetector gesture={combinedGesture}>
				<Animated.View style={[styles.row, animatedRowStyle]}>
					<View
						style={[
							styles.iconCircle,
							{ backgroundColor: `${transactionContext.color}20` },
						]}
					>
						<Ionicons
							name={transactionContext.icon}
							size={20}
							color={transactionContext.color}
						/>
					</View>
					<View style={styles.textContainer}>
						<View style={styles.descriptionContainer}>
							<Text style={styles.description}>{item.description}</Text>
							{item.recurringPattern && (
								<View style={styles.recurringBadge}>
									<Ionicons name="repeat" size={12} color="#007ACC" />
								</View>
							)}
						</View>
						<Text style={styles.category}>
							{transactionContext.type === 'budget' &&
								`${
									transactionContext.name
								} • +${transactionContext.progress.toFixed(1)}% to budget`}
							{transactionContext.type === 'goal' &&
								`${
									transactionContext.name
								} • +${transactionContext.progress.toFixed(1)}% to goal`}
							{transactionContext.type === 'general' && transactionContext.name}
						</Text>
					</View>
					<View style={styles.amountDate}>
						<Text
							style={[
								styles.amount,
								item.type === 'income' ? styles.income : styles.expense,
							]}
						>
							{item.type === 'income' ? '+' : '-'}$
							{(isNaN(item.amount) ? 0 : item.amount).toFixed(2)}
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
		// Custom comparison function to determine if re-render is needed
		const shouldUpdate =
			prevProps.item.id === nextProps.item.id &&
			prevProps.item.description === nextProps.item.description &&
			prevProps.item.amount === nextProps.item.amount &&
			prevProps.item.date === nextProps.item.date &&
			prevProps.item.type === nextProps.item.type &&
			prevProps.item.target === nextProps.item.target &&
			prevProps.item.targetModel === nextProps.item.targetModel;

		// Debug logging for transaction updates
		if (!shouldUpdate) {
			console.log('[TransactionRow] Re-rendering due to changes:', {
				id: prevProps.item.id,
				prevDescription: prevProps.item.description,
				nextDescription: nextProps.item.description,
				prevAmount: prevProps.item.amount,
				nextAmount: nextProps.item.amount,
				prevTarget: prevProps.item.target,
				nextTarget: nextProps.item.target,
				prevTargetModel: prevProps.item.targetModel,
				nextTargetModel: nextProps.item.targetModel,
			});
		}

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
		backgroundColor: '#dc2626',
		justifyContent: 'center',
		alignItems: 'flex-end',
		paddingRight: 18,
	},
	row: {
		flexDirection: 'row',
		alignItems: 'center',
		paddingVertical: 16,
		backgroundColor: '#fff',
		paddingHorizontal: 24,
	},
	iconCircle: {
		width: 36,
		height: 36,
		borderRadius: 8,
		justifyContent: 'center',
		alignItems: 'center',
	},
	textContainer: {
		marginLeft: 12,
		flex: 1,
	},
	descriptionContainer: {
		flexDirection: 'row',
		alignItems: 'center',
	},
	description: {
		fontSize: 16,
		fontWeight: '500',
		color: '#212121',
		flex: 1,
	},
	recurringBadge: {
		marginLeft: 8,
		paddingHorizontal: 6,
		paddingVertical: 2,
		backgroundColor: '#e3f2fd',
		borderRadius: 4,
		borderWidth: 1,
		borderColor: '#007ACC',
	},
	category: {
		fontSize: 12,
		color: '#9ca3af',
		marginTop: 4,
		fontWeight: '500',
	},
	amountDate: {
		alignItems: 'flex-end',
	},
	amount: {
		fontSize: 16,
		fontWeight: '600',
	},
	income: {
		color: '#16a34a',
	},
	expense: {
		color: '#dc2626',
	},
	date: {
		fontSize: 12,
		color: '#9ca3af',
		marginTop: 4,
	},
});
