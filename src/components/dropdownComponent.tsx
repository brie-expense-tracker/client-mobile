import React from 'react';
import {
	View,
	Text,
	StyleSheet,
	TouchableOpacity,
	Animated,
	PanResponder,
	StatusBar,
	SafeAreaView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface DropdownComponentProps {
	isVisible: boolean;
	onClose: () => void;
	dateFilterMode: string;
	onDateModeSelect: (value: string) => void;
	selectedTag: string;
	onTagSelect: (tag: string) => void;
	allTags: string[];
	dropdownAnimation: Animated.Value;
}

const dateFilterModes = [
	{ label: 'Day', value: 'day', icon: 'calendar-outline' },
	{ label: 'Month', value: 'month', icon: 'calendar' },
];

export default function DropdownComponent({
	isVisible,
	onClose,
	dateFilterMode,
	onDateModeSelect,
	selectedTag,
	onTagSelect,
	allTags,
	dropdownAnimation,
}: DropdownComponentProps) {
	const currentAnimationValue = React.useRef(0);
	const lastGestureDy = React.useRef(0);
	const startY = React.useRef(0);

	const panResponder = React.useMemo(
		() =>
			PanResponder.create({
				onStartShouldSetPanResponder: () => true,
				onMoveShouldSetPanResponder: (_, gestureState) => {
					return Math.abs(gestureState.dy) > Math.abs(gestureState.dx);
				},
				onPanResponderGrant: (_, gestureState) => {
					startY.current = gestureState.y0;
					lastGestureDy.current = 0;
				},
				onPanResponderMove: (_, gestureState) => {
					const totalDistance = gestureState.moveY - startY.current;
					const newValue = Math.min(1, 1 + Math.min(0, totalDistance) / 400);

					currentAnimationValue.current = newValue;
					dropdownAnimation.setValue(newValue);
				},
				onPanResponderRelease: (_, gestureState) => {
					const velocity = gestureState.vy;
					const currentValue = currentAnimationValue.current;
					const totalDistance = gestureState.moveY - startY.current;

					const shouldClose = currentValue < 0.1;
					const finalValue = shouldClose ? 0 : 1;

					Animated.spring(dropdownAnimation, {
						toValue: finalValue,
						useNativeDriver: true,
						velocity: velocity / 400,
						tension: 45,
						friction: 10,
						restDisplacementThreshold: 0.01,
						restSpeedThreshold: 0.01,
					}).start(() => {
						if (finalValue === 0) {
							onClose();
							StatusBar.setHidden(false);
						} else {
							StatusBar.setHidden(true);
						}
					});
				},
			}),
		[dropdownAnimation, onClose]
	);

	const translateY = dropdownAnimation.interpolate({
		inputRange: [-1, 0, 1, 2],
		outputRange: [-800, -400, 0, 400],
	});

	if (!isVisible) return null;

	return (
		<Animated.View
			style={[
				styles.dropdown,
				{
					transform: [{ translateY }],
				},
			]}
			{...panResponder.panHandlers}
		>
			<View style={styles.dropdownBackground} />
			<SafeAreaView style={styles.dropdownContent}>
				<View style={styles.dropdownHeader}>
					<Text style={styles.dropdownTitle}>Filters</Text>
					<TouchableOpacity onPress={onClose} style={styles.closeButton}>
						<Ionicons name="close" size={24} color="#666" />
					</TouchableOpacity>
				</View>
				<View style={styles.filterModeList}>
					{dateFilterModes.map((mode) => (
						<TouchableOpacity
							key={mode.value}
							style={[
								styles.filterModeItem,
								dateFilterMode === mode.value && styles.filterModeItemSelected,
							]}
							onPress={() => onDateModeSelect(mode.value)}
						>
							<Ionicons
								name={mode.icon as any}
								size={24}
								color={dateFilterMode === mode.value ? '#fff' : '#555'}
							/>
							<Text
								style={[
									styles.filterModeText,
									dateFilterMode === mode.value &&
										styles.filterModeTextSelected,
								]}
							>
								{mode.label}
							</Text>
						</TouchableOpacity>
					))}
				</View>

				<View style={styles.dropdownDivider} />

				<View style={styles.dropdownSection}>
					<Text style={styles.dropdownSectionTitle}>Filter by Tags</Text>
					<View style={styles.tagList}>
						<TouchableOpacity
							style={[
								styles.tagItem,
								selectedTag === '' && styles.tagItemSelected,
							]}
							onPress={() => onTagSelect('')}
						>
							<Text
								style={[
									styles.tagText,
									selectedTag === '' && styles.tagTextSelected,
								]}
							>
								All Tags
							</Text>
						</TouchableOpacity>
						{allTags.map((tag) => (
							<TouchableOpacity
								key={tag}
								style={[
									styles.tagItem,
									selectedTag === tag && styles.tagItemSelected,
								]}
								onPress={() => onTagSelect(tag)}
							>
								<Text
									style={[
										styles.tagText,
										selectedTag === tag && styles.tagTextSelected,
									]}
								>
									{tag}
								</Text>
							</TouchableOpacity>
						))}
					</View>
				</View>
			</SafeAreaView>
			<View style={styles.dropdownIndicator} />
		</Animated.View>
	);
}

const styles = StyleSheet.create({
	dropdown: {
		position: 'absolute',
		top: 0,
		left: 0,
		right: 0,
		zIndex: 1000,
	},
	dropdownBackground: {
		position: 'absolute',
		top: 0,
		left: 0,
		right: 0,
		bottom: 0,
		backgroundColor: 'white',
		shadowColor: '#000',
		shadowOffset: {
			width: 0,
			height: 2,
		},
		shadowOpacity: 0.25,
		shadowRadius: 3.84,
		elevation: 5,
	},
	dropdownContent: {
		backgroundColor: 'white',
	},
	dropdownHeader: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		alignItems: 'center',
		padding: 16,
		borderBottomWidth: 1,
		borderBottomColor: '#eee',
	},
	dropdownTitle: {
		fontSize: 20,
		fontWeight: '600',
		color: '#333',
	},
	closeButton: {
		padding: 4,
	},
	filterModeList: {
		width: '100%',
		padding: 8,
	},
	filterModeItem: {
		flexDirection: 'row',
		alignItems: 'center',
		padding: 16,
		borderRadius: 8,
		marginBottom: 8,
		gap: 12,
	},
	filterModeItemSelected: {
		backgroundColor: '#32af29',
	},
	filterModeText: {
		fontSize: 16,
		color: '#333',
	},
	filterModeTextSelected: {
		color: '#fff',
		fontWeight: '600',
	},
	dropdownDivider: {
		height: 1,
		backgroundColor: '#eee',
		marginVertical: 16,
	},
	dropdownSection: {
		padding: 16,
	},
	dropdownSectionTitle: {
		fontSize: 16,
		fontWeight: '600',
		color: '#333',
		marginBottom: 12,
	},
	tagList: {
		flexDirection: 'row',
		flexWrap: 'wrap',
		gap: 8,
	},
	tagItem: {
		paddingHorizontal: 12,
		paddingVertical: 6,
		borderRadius: 16,
		backgroundColor: '#f0f0f0',
	},
	tagItemSelected: {
		backgroundColor: '#32af29',
	},
	tagText: {
		fontSize: 14,
		color: '#333',
	},
	tagTextSelected: {
		color: '#fff',
	},
	dropdownIndicator: {
		width: 40,
		height: 4,
		backgroundColor: '#E0E0E0',
		borderRadius: 2,
		alignSelf: 'center',
		marginTop: 8,
		marginBottom: 8,
	},
});
