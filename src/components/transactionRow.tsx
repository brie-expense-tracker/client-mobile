// src/components/TransactionRow.tsx
import React, { useCallback } from 'react';
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
import type { Transaction } from '../data/transactions';

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
	} catch (error) {
		return 'Invalid Date';
	}
};

interface TransactionRowProps {
	item: Transaction;
	onDelete: (id: string, resetAnimation: () => void) => void;
}

const TransactionRowComponent: React.FC<TransactionRowProps> = ({
	item,
	onDelete,
}) => {
	const translateX = useSharedValue(0);
	const iconScale = useSharedValue(1);
	const hasHaptics = useSharedValue(false);
	const TRANSLATE_THRESHOLD = -70;
	const DELETE_WIDTH = 60;

	// Fallback category mapping for when categories don't have icon/color data
	const categoryMap: Record<
		string,
		{ name: keyof typeof Ionicons.glyphMap; color: string }
	> = {
		Groceries: { name: 'cart-outline', color: '#4CAF50' },
		Utilities: { name: 'flash-outline', color: '#FFC107' },
		Entertainment: { name: 'game-controller-outline', color: '#9C27B0' },
		Food: { name: 'restaurant-outline', color: '#F44336' },
		Transportation: { name: 'car-outline', color: '#2196F3' },
		Housing: { name: 'home-outline', color: '#795548' },
		Healthcare: { name: 'medical-outline', color: '#00BCD4' },
		Shopping: { name: 'cart-outline', color: '#9E9E9E' },
		Education: { name: 'school-outline', color: '#3F51B5' },
		Salary: { name: 'cash-outline', color: '#4CAF50' },
		Investment: { name: 'trending-up-outline', color: '#009688' },
		Freelance: { name: 'briefcase-outline', color: '#2196F3' },
		Bonus: { name: 'gift-outline', color: '#9C27B0' },
		// …other categories…
		Other: { name: 'ellipsis-horizontal-outline', color: '#9E9E9E' },
	};

	// Get the primary category (first category in the array)
	const primaryCategory = item.categories[0];
	const primary = primaryCategory?.name || 'Other';

	// Get icon and color from the category if available, otherwise use fallback
	const categoryIcon = primaryCategory?.icon;
	const categoryColor = primaryCategory?.color;

	// Use category data if available, otherwise fall back to the mapping
	const { name: fallbackIcon, color: fallbackColor } =
		categoryMap[primary] || categoryMap.Other;

	const iconName =
		(categoryIcon as keyof typeof Ionicons.glyphMap) || fallbackIcon;
	const iconColor = categoryColor || fallbackColor;

	const triggerHaptic = () => {
		Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
	};
	//  Your existing resetAnimation
	const resetAnimation = () => {
		translateX.value = withSpring(0, { damping: 20 });
		iconScale.value = withSpring(1, { damping: 15, stiffness: 150 });
		hasHaptics.value = false;
	};

	const handleDeleteJS = useCallback(() => {
		onDelete(item.id, resetAnimation);
	}, [item.id, onDelete, resetAnimation]);

	const panGesture = Gesture.Pan()
		.activeOffsetX([-15, 15])
		.failOffsetY([-10, 10])
		.onUpdate(({ translationX }) => {
			translateX.value = Math.min(0, translationX);
			if (translateX.value < TRANSLATE_THRESHOLD && !hasHaptics.value) {
				hasHaptics.value = true;
				iconScale.value = withSpring(1.5, { damping: 15, stiffness: 150 });
				runOnJS(triggerHaptic)();
			} else if (translateX.value >= TRANSLATE_THRESHOLD && hasHaptics.value) {
				hasHaptics.value = false;
				iconScale.value = withSpring(1, { damping: 15, stiffness: 150 });
				runOnJS(triggerHaptic)();
			}
		})
		.onEnd(() => {
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
		});

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

			<GestureDetector gesture={panGesture}>
				<Animated.View style={[styles.row, animatedRowStyle]}>
					<View
						style={[styles.iconCircle, { backgroundColor: `${iconColor}20` }]}
					>
						<Ionicons name={iconName} size={20} color={iconColor} />
					</View>
					<View style={styles.textContainer}>
						<Text style={styles.description}>{item.description}</Text>
						<Text style={styles.category}>
							{item.categories.map((cat) => cat.name).join(', ')}
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

export const TransactionRow = React.memo(
	TransactionRowComponent,
	(prev, next) =>
		prev.item.id === next.item.id &&
		prev.item.amount === next.item.amount &&
		// you can add more granular checks if needed
		prev.item.description === next.item.description &&
		prev.item.date === next.item.date
);

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
	description: {
		fontSize: 16,
		fontWeight: '500',
		color: '#212121',
	},
	category: {
		fontSize: 12,
		color: '#9ca3af',
		marginTop: 4,
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
