import React, { useState, useEffect } from 'react';
import {
	View,
	Text,
	StyleSheet,
	FlatList,
	Dimensions,
	Modal,
	TextInput,
	Animated,
	KeyboardAvoidingView,
	Platform,
	Alert,
	ScrollView,
	SafeAreaView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { RectButton } from 'react-native-gesture-handler';
import { useGoal, Goal } from '../../../src/context/goalContext';
import { useContext } from 'react';
import { TransactionContext } from '../../../src/context/transactionContext';
import { useLocalSearchParams, useRouter } from 'expo-router';

const { width } = Dimensions.get('window');

// ==========================================
// Types
// ==========================================
type ColorOption = {
	base: string;
	pastel: string;
	dark: string;
};

// ==========================================
// Constants
// ==========================================
const CARD_WIDTH = width - 48;
const CARD_PADDING = 16;

// Popular goal icons
const goalIcons: (keyof typeof Ionicons.glyphMap)[] = [
	'flag-outline',
	'home-outline',
	'car-outline',
	'airplane-outline',
	'gift-outline',
	'medical-outline',
	'book-outline',
	'fitness-outline',
	'game-controller-outline',
	'bag-outline',
	'heart-outline',
	'star-outline',
	'diamond-outline',
	'trophy-outline',
	'rocket-outline',
];

// Quick target presets
const targetPresets = [500, 1000, 2500, 5000, 10000];

const COLOR_PALETTE: Record<string, ColorOption> = {
	red: {
		base: '#E53935',
		pastel: '#EF5350',
		dark: '#B71C1C',
	},
	orange: {
		base: '#FB8C00',
		pastel: '#FFB74D',
		dark: '#E65100',
	},
	yellow: {
		base: '#FDD835',
		pastel: '#FFEE58',
		dark: '#FBC02D',
	},
	green: {
		base: '#43A047',
		pastel: '#A5D6A7',
		dark: '#1B5E20',
	},
	blue: {
		base: '#1E88E5',
		pastel: '#42A5F5',
		dark: '#0D47A1',
	},
	indigo: {
		base: '#5E35B1',
		pastel: '#5C6BC0',
		dark: '#311B92',
	},
	violet: {
		base: '#8E24AA',
		pastel: '#AB47BC',
		dark: '#4A0072',
	},
	grey: {
		base: '#424242',
		pastel: '#757575',
		dark: '#212121',
	},
};

// ==========================================
// Main Component
// ==========================================
export default function GoalsScreen() {
	// ==========================================
	// Context
	// ==========================================
	const { goals, addGoal, updateGoal, deleteGoal } = useGoal();
	const { categories } = useContext(TransactionContext);

	// ==========================================
	// Route Parameters
	// ==========================================
	const params = useLocalSearchParams();
	const router = useRouter();

	// ==========================================
	// State Management
	// ==========================================
	const [isModalVisible, setIsModalVisible] = useState(false);
	const [isEditModalVisible, setIsEditModalVisible] = useState(false);
	const [editingGoal, setEditingGoal] = useState<Goal | null>(null);
	const [showColorPicker, setShowColorPicker] = useState(false);
	const [showCategoryPicker, setShowCategoryPicker] = useState(false);
	const [showIconPicker, setShowIconPicker] = useState(false);
	const [newGoal, setNewGoal] = useState({
		name: '',
		target: '',
		deadline: '',
		icon: 'flag-outline' as keyof typeof Ionicons.glyphMap,
		color: COLOR_PALETTE.blue.base,
		categories: [] as string[],
	});

	// ==========================================
	// Animation Setup
	// ==========================================
	const slideAnim = React.useRef(new Animated.Value(0)).current;

	// ==========================================
	// Auto-open modal on navigation
	// ==========================================
	useEffect(() => {
		// Check if we should auto-open the modal
		if (params.openModal === 'true') {
			// Small delay to ensure component is fully mounted
			const timer = setTimeout(() => {
				showModal();
			}, 100);
			return () => clearTimeout(timer);
		}
	}, [params.openModal]);

	// ==========================================
	// Debug logging
	// ==========================================
	useEffect(() => {}, [newGoal]);

	// ==========================================
	// Goal Management
	// ==========================================
	const validateDate = (dateString: string): boolean => {
		const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
		if (!dateRegex.test(dateString)) {
			return false;
		}

		const date = new Date(dateString);
		return date instanceof Date && !isNaN(date.getTime());
	};

	const handleAddGoal = async () => {
		if (!newGoal.name || !newGoal.target || !newGoal.deadline) {
			console.log('Validation failed: missing name, target, or deadline');
			return;
		}

		if (!validateDate(newGoal.deadline)) {
			Alert.alert(
				'Invalid Date',
				'Please enter a valid date in YYYY-MM-DD format (e.g., 2024-12-31)',
				[{ text: 'OK' }]
			);
			return;
		}

		console.log('Adding goal:', newGoal);

		try {
			const result = await addGoal({
				name: newGoal.name,
				target: parseFloat(newGoal.target),
				deadline: newGoal.deadline,
				icon: newGoal.icon,
				color: newGoal.color,
				categories: newGoal.categories,
			});

			console.log('Goal added successfully:', result);

			hideModal();
			// Update the URL to remove the openModal parameter
			router.setParams({ openModal: 'false' });
			setNewGoal({
				name: '',
				target: '',
				deadline: '',
				icon: 'flag-outline',
				color: COLOR_PALETTE.blue.base,
				categories: [],
			});
		} catch (error) {
			console.error('Error adding goal:', error);
			// You might want to show an error message to the user
		}
	};

	const handleEditGoal = async () => {
		if (!editingGoal || !newGoal.name || !newGoal.target || !newGoal.deadline) {
			return;
		}

		if (!validateDate(newGoal.deadline)) {
			Alert.alert(
				'Invalid Date',
				'Please enter a valid date in YYYY-MM-DD format (e.g., 2024-12-31)',
				[{ text: 'OK' }]
			);
			return;
		}

		try {
			await updateGoal(editingGoal.id, {
				name: newGoal.name,
				target: parseFloat(newGoal.target),
				deadline: newGoal.deadline,
				icon: newGoal.icon,
				color: newGoal.color,
				categories: newGoal.categories,
			});

			hideEditModal();
			// Update the URL to remove the openModal parameter
			router.setParams({ openModal: 'false' });
			setNewGoal({
				name: '',
				target: '',
				deadline: '',
				icon: 'flag-outline',
				color: COLOR_PALETTE.blue.base,
				categories: [],
			});
			setEditingGoal(null);
		} catch (error) {
			console.error('Error updating goal:', error);
		}
	};

	const handleDeleteGoal = async (goalId: string) => {
		try {
			await deleteGoal(goalId);
		} catch (error) {
			console.error('Error deleting goal:', error);
		}
	};

	// ==========================================
	// Modal Handlers
	// ==========================================
	const showModal = () => {
		console.log('showModal called - resetting newGoal state');
		setNewGoal({
			name: '',
			target: '',
			deadline: '',
			icon: 'flag-outline' as keyof typeof Ionicons.glyphMap,
			color: COLOR_PALETTE.blue.base,
			categories: [],
		});
		setShowColorPicker(false);
		setShowCategoryPicker(false);
		setShowIconPicker(false);
		setIsModalVisible(true);
		Animated.spring(slideAnim, {
			toValue: 1,
			useNativeDriver: true,
			tension: 50,
			friction: 7,
		}).start();
	};

	const hideModal = () => {
		Animated.timing(slideAnim, {
			toValue: 0,
			duration: 200,
			useNativeDriver: true,
		}).start(() => {
			setIsModalVisible(false);
			// Update the URL to remove the openModal parameter
			router.setParams({ openModal: 'false' });
		});
	};

	const showEditModal = (goal: Goal) => {
		setEditingGoal(goal);
		setNewGoal({
			name: goal.name,
			target: goal.target.toString(),
			deadline: goal.deadline.split('T')[0],
			icon: goal.icon as keyof typeof Ionicons.glyphMap,
			color: goal.color,
			categories: goal.categories || [],
		});
		setShowColorPicker(false);
		setShowCategoryPicker(false);
		setShowIconPicker(false);
		setIsEditModalVisible(true);
		Animated.spring(slideAnim, {
			toValue: 1,
			useNativeDriver: true,
			tension: 50,
			friction: 7,
		}).start();
	};

	const hideEditModal = () => {
		Animated.timing(slideAnim, {
			toValue: 0,
			duration: 200,
			useNativeDriver: true,
		}).start(() => {
			setIsEditModalVisible(false);
			setEditingGoal(null);
			// Update the URL to remove the openModal parameter
			router.setParams({ openModal: 'false' });
		});
	};

	// ==========================================
	// Color Selection Component
	// ==========================================
	const ColorPicker = () => (
		<View style={styles.colorPickerContainer}>
			<Text style={styles.label}>Choose Color</Text>
			<RectButton
				style={styles.colorButton}
				onPress={() => setShowColorPicker(!showColorPicker)}
			>
				<View style={styles.colorButtonContent}>
					<View
						style={[styles.colorPreview, { backgroundColor: newGoal.color }]}
					/>
					<Text style={styles.colorButtonText}>Choose Color</Text>
					<Ionicons
						name={showColorPicker ? 'chevron-up' : 'chevron-down'}
						size={20}
						color="#757575"
					/>
				</View>
			</RectButton>

			{showColorPicker && (
				<View style={styles.colorGrid}>
					{Object.entries(COLOR_PALETTE).map(([name, colors]) => (
						<View key={name} style={styles.colorColumn}>
							<RectButton
								style={styles.colorOptionContainer}
								onPress={() => setNewGoal({ ...newGoal, color: colors.base })}
							>
								<View
									style={[styles.colorSquare, { backgroundColor: colors.base }]}
								>
									{newGoal.color === colors.base && (
										<View style={styles.selectedIndicator}>
											<Ionicons name="checkmark" size={20} color="#FFF" />
										</View>
									)}
								</View>
							</RectButton>
							<RectButton
								style={styles.colorOptionContainer}
								onPress={() => setNewGoal({ ...newGoal, color: colors.pastel })}
							>
								<View
									style={[
										styles.colorSquare,
										{ backgroundColor: colors.pastel },
									]}
								>
									{newGoal.color === colors.pastel && (
										<View style={styles.selectedIndicator}>
											<Ionicons name="checkmark" size={20} color="#000" />
										</View>
									)}
								</View>
							</RectButton>
							<RectButton
								style={styles.colorOptionContainer}
								onPress={() => setNewGoal({ ...newGoal, color: colors.dark })}
							>
								<View
									style={[styles.colorSquare, { backgroundColor: colors.dark }]}
								>
									{newGoal.color === colors.dark && (
										<View style={styles.selectedIndicator}>
											<Ionicons name="checkmark" size={20} color="#FFF" />
										</View>
									)}
								</View>
							</RectButton>
						</View>
					))}
				</View>
			)}
		</View>
	);

	// ==========================================
	// Icon Selection Component
	// ==========================================
	const IconPicker = () => (
		<View style={styles.iconPickerContainer}>
			<Text style={styles.label}>Choose Icon</Text>
			<RectButton
				style={styles.iconButton}
				onPress={() => setShowIconPicker(!showIconPicker)}
			>
				<View style={styles.iconButtonContent}>
					<View
						style={[
							styles.iconPreview,
							{ backgroundColor: newGoal.color + '20' },
						]}
					>
						<Ionicons
							name={newGoal.icon as any}
							size={24}
							color={newGoal.color}
						/>
					</View>
					<Text style={styles.iconButtonText}>Choose Icon</Text>
					<Ionicons
						name={showIconPicker ? 'chevron-up' : 'chevron-down'}
						size={20}
						color="#757575"
					/>
				</View>
			</RectButton>

			{showIconPicker && (
				<View style={styles.iconGrid}>
					{goalIcons.map((icon) => (
						<RectButton
							key={icon}
							style={styles.iconOption}
							onPress={() => {
								setNewGoal({ ...newGoal, icon });
								setShowIconPicker(false);
							}}
						>
							<Ionicons
								name={icon as any}
								size={24}
								color={newGoal.icon === icon ? 'white' : newGoal.color}
							/>
						</RectButton>
					))}
				</View>
			)}
		</View>
	);

	// ==========================================
	// Category Selection Component
	// ==========================================
	const CategoryPicker = () => (
		<View style={styles.categoryPickerContainer}>
			<Text style={styles.label}>Select Categories</Text>
			<Text style={styles.categorySubtext}>
				Choose which spending categories contribute to this goal
			</Text>
			<RectButton
				style={styles.categoryButton}
				onPress={() => setShowCategoryPicker(!showCategoryPicker)}
			>
				<View style={styles.categoryButtonContent}>
					<View style={styles.categoryButtonLeft}>
						<View
							style={[
								styles.categoryIcon,
								{ backgroundColor: newGoal.color + '20' },
							]}
						>
							<Ionicons name="list" size={16} color={newGoal.color} />
						</View>
						<Text style={styles.categoryButtonText}>
							{newGoal.categories.length > 0
								? `${newGoal.categories.length} categories selected`
								: 'Choose categories'}
						</Text>
					</View>
					<Ionicons
						name={showCategoryPicker ? 'chevron-up' : 'chevron-down'}
						size={20}
						color="#757575"
					/>
				</View>
			</RectButton>

			{showCategoryPicker && (
				<ScrollView
					style={styles.categoryList}
					showsVerticalScrollIndicator={false}
				>
					{categories.map((category) => (
						<RectButton
							key={category.id}
							style={styles.categoryOption}
							onPress={() => {
								const isSelected = newGoal.categories.includes(category.name);
								if (isSelected) {
									setNewGoal({
										...newGoal,
										categories: newGoal.categories.filter(
											(cat) => cat !== category.name
										),
									});
								} else {
									setNewGoal({
										...newGoal,
										categories: [...newGoal.categories, category.name],
									});
								}
							}}
						>
							<View style={styles.categoryOptionContent}>
								<View
									style={[
										styles.categoryIcon,
										{ backgroundColor: category.color + '20' },
									]}
								>
									<Ionicons
										name={category.icon as any}
										size={16}
										color={category.color}
									/>
								</View>
								<Text style={styles.categoryName}>{category.name}</Text>
								<View style={styles.checkboxContainer}>
									{newGoal.categories.includes(category.name) && (
										<Ionicons
											name="checkmark-circle"
											size={20}
											color={newGoal.color}
										/>
									)}
								</View>
							</View>
						</RectButton>
					))}
				</ScrollView>
			)}
		</View>
	);

	// ==========================================
	// Render Functions
	// ==========================================
	const renderItem = ({ item }: { item: Goal }) => {
		const percent = Math.min((item.current / item.target) * 100, 100);
		const deadline = new Date(item.deadline);
		const today = new Date();
		const daysLeft = Math.ceil(
			(deadline.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
		);

		return (
			<RectButton style={styles.card} onPress={() => showEditModal(item)}>
				<View style={styles.cardHeader}>
					<View
						style={[styles.iconWrapper, { backgroundColor: `${item.color}20` }]}
					>
						<Ionicons name={item.icon as any} size={24} color={item.color} />
					</View>
					<Text style={styles.categoryText}>{item.name}</Text>
				</View>

				<View style={styles.amounts}>
					<Text style={styles.spentText}>${item.current.toFixed(2)}</Text>
					<Text style={styles.allocatedText}>/ ${item.target.toFixed(2)}</Text>
				</View>

				<View style={styles.progressBarBackground}>
					<View
						style={[
							styles.progressBarFill,
							{
								width: `${percent}%`,
								backgroundColor: item.color,
							},
						]}
					/>
				</View>

				<View style={styles.goalFooter}>
					<Text style={styles.percentageText}>{percent.toFixed(0)}%</Text>
					<Text style={styles.deadlineText}>{daysLeft} days left</Text>
				</View>
			</RectButton>
		);
	};

	// ==========================================
	// Main Render
	// ==========================================
	// Add the "Add Goal" card to the data
	const goalsWithAdd = [
		...goals,
		{
			id: 'add',
			name: 'Add Goal',
			target: 0,
			current: 0,
			deadline: '',
			icon: 'add-circle-outline',
			color: '#00a2ff',
		} as Goal,
	];

	return (
		<View style={styles.mainContainer}>
			<FlatList
				data={goalsWithAdd}
				keyExtractor={(item) => item.id}
				renderItem={({ item }) => {
					if (item.id === 'add') {
						return (
							<RectButton style={styles.card} onPress={showModal}>
								<View style={styles.cardHeader}>
									<View
										style={[
											styles.iconWrapper,
											{ backgroundColor: `${item.color}20` },
										]}
									>
										<Ionicons
											name={item.icon as any}
											size={24}
											color={item.color}
										/>
									</View>
									<Text style={styles.categoryText}>{item.name}</Text>
								</View>
							</RectButton>
						);
					}
					return renderItem({ item });
				}}
				contentContainerStyle={styles.listContent}
				showsVerticalScrollIndicator={false}
			/>

			{/* Add Goal Modal */}
			<Modal
				visible={isModalVisible}
				transparent
				animationType="fade"
				onRequestClose={hideModal}
			>
				<SafeAreaView style={styles.safeAreaContainer}>
					<KeyboardAvoidingView
						behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
						style={styles.modalContainer}
					>
						<Animated.View
							style={[
								styles.modalContent,
								{
									transform: [
										{
											translateY: slideAnim.interpolate({
												inputRange: [0, 1],
												outputRange: [600, 0],
											}),
										},
									],
								},
							]}
						>
							<View style={styles.modalHeader}>
								<Text style={styles.modalTitle}>Add New Goal</Text>
								<RectButton onPress={hideModal}>
									<Ionicons name="close" size={24} color="#757575" />
								</RectButton>
							</View>
							<ScrollView
								showsVerticalScrollIndicator={false}
								contentContainerStyle={{ paddingBottom: 24 }}
							>
								<View style={styles.formGroup}>
									<Text style={styles.label}>Goal Name</Text>
									<TextInput
										style={styles.input}
										value={newGoal.name}
										onChangeText={(text) =>
											setNewGoal({ ...newGoal, name: text })
										}
										placeholder="e.g., Emergency Fund"
										placeholderTextColor="#9E9E9E"
										autoComplete="off"
										autoCorrect={false}
									/>
								</View>

								<View style={styles.formGroup}>
									<Text style={styles.label}>Target Amount</Text>
									<Text style={styles.targetSubtext}>
										Set your target amount for this goal
									</Text>

									{/* Quick Target Presets */}
									<View style={styles.targetPresetsContainer}>
										{targetPresets.map((amount) => (
											<RectButton
												key={amount}
												style={[
													styles.targetPreset,
													newGoal.target === amount.toString() &&
														styles.selectedTargetPreset,
												]}
												onPress={() =>
													setNewGoal({
														...newGoal,
														target: amount.toString(),
													})
												}
											>
												<Text
													style={[
														styles.targetPresetText,
														newGoal.target === amount.toString() &&
															styles.selectedTargetPresetText,
													]}
												>
													${amount}
												</Text>
											</RectButton>
										))}
									</View>

									{/* Custom Amount Input */}
									<Text style={styles.inputLabel}>Or enter custom amount</Text>
									<TextInput
										style={styles.input}
										value={newGoal.target}
										onChangeText={(text) =>
											setNewGoal({ ...newGoal, target: text })
										}
										placeholder="e.g., 10000"
										keyboardType="numeric"
										placeholderTextColor="#9E9E9E"
										autoComplete="off"
									/>
								</View>

								<View style={styles.formGroup}>
									<Text style={styles.label}>Target Date</Text>
									<TextInput
										style={styles.input}
										value={newGoal.deadline}
										onChangeText={(text) =>
											setNewGoal({ ...newGoal, deadline: text })
										}
										placeholder="YYYY-MM-DD"
										placeholderTextColor="#9E9E9E"
										autoComplete="off"
									/>
								</View>

								<IconPicker />
								<ColorPicker />
								<CategoryPicker />

								<RectButton
									style={[styles.addButton, { backgroundColor: newGoal.color }]}
									onPress={handleAddGoal}
								>
									<Text style={styles.addButtonText}>Add Goal</Text>
								</RectButton>
							</ScrollView>
						</Animated.View>
					</KeyboardAvoidingView>
				</SafeAreaView>
			</Modal>
		</View>
	);
}

// ==========================================
// Styles
// ==========================================
const styles = StyleSheet.create({
	mainContainer: {
		flex: 1,
		backgroundColor: '#fff',
	},

	listContent: {
		paddingHorizontal: 24,
		marginTop: 8,
	},
	card: {
		width: CARD_WIDTH,
		backgroundColor: '#ffffff',
		borderRadius: 16,
		padding: CARD_PADDING,
		marginVertical: 8,
		// iOS shadow
		shadowColor: '#000',
		shadowOffset: { width: 0, height: 2 },
		shadowOpacity: 0.1,
		shadowRadius: 4,
		// Android shadow
		elevation: 3,
	},
	cardHeader: {
		flexDirection: 'row',
		alignItems: 'center',
		marginBottom: 12,
	},
	iconWrapper: {
		width: 40,
		height: 40,
		borderRadius: 12,
		justifyContent: 'center',
		alignItems: 'center',
	},
	categoryText: {
		marginLeft: 12,
		fontSize: 18,
		fontWeight: '600',
		color: '#212121',
		flex: 1,
	},
	cardActions: {
		flexDirection: 'row',
		alignItems: 'center',
	},
	actionButton: {
		padding: 8,
		marginLeft: 4,
	},
	amounts: {
		flexDirection: 'row',
		alignItems: 'baseline',
		marginBottom: 8,
	},
	spentText: {
		fontSize: 20,
		fontWeight: '700',
		color: '#212121',
	},
	allocatedText: {
		marginLeft: 4,
		fontSize: 14,
		color: '#757575',
	},
	progressBarBackground: {
		width: '100%',
		height: 8,
		backgroundColor: '#e0e0e0',
		borderRadius: 4,
		overflow: 'hidden',
	},
	progressBarFill: {
		height: '100%',
		borderRadius: 4,
	},
	goalFooter: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		alignItems: 'center',
		marginTop: 6,
	},
	percentageText: {
		fontSize: 12,
		fontWeight: '500',
		color: '#757575',
	},
	deadlineText: {
		fontSize: 12,
		fontWeight: '500',
		color: '#757575',
	},
	safeAreaContainer: {
		flex: 1,
		backgroundColor: 'rgba(0, 0, 0, 0.5)',
	},
	modalContainer: {
		flex: 1,
	},
	modalContent: {
		backgroundColor: '#ffffff',
		borderTopLeftRadius: 20,
		borderTopRightRadius: 20,
		padding: 24,
	},
	modalHeader: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		alignItems: 'center',
		marginBottom: 24,
	},
	modalTitle: {
		fontSize: 20,
		fontWeight: '600',
		color: '#212121',
	},
	formGroup: {
		marginBottom: 20,
	},
	label: {
		fontSize: 14,
		fontWeight: '500',
		color: '#757575',
		marginBottom: 8,
	},
	input: {
		backgroundColor: '#F5F5F5',
		borderRadius: 12,
		padding: 16,
		fontSize: 16,
		color: '#212121',
	},
	addButton: {
		backgroundColor: '#0095FF',
		borderRadius: 12,
		padding: 16,
		alignItems: 'center',
		marginTop: 8,
	},
	addButtonText: {
		color: '#FFFFFF',
		fontSize: 16,
		fontWeight: '600',
	},
	modalButtonContainer: {
		marginTop: 8,
	},
	deleteButton: {
		backgroundColor: '#E53935',
		borderRadius: 12,
		padding: 16,
		alignItems: 'center',
		marginTop: 12,
	},
	deleteButtonText: {
		color: '#FFFFFF',
		fontSize: 16,
		fontWeight: '600',
	},
	iconPickerContainer: {
		marginBottom: 10,
	},
	iconButton: {
		backgroundColor: '#F5F5F5',
		borderRadius: 12,
		padding: 16,
		marginBottom: 8,
	},
	iconButtonContent: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
	},
	iconPreview: {
		width: 24,
		height: 24,
		borderRadius: 6,
		borderWidth: 1,
		borderColor: '#E0E0E0',
		justifyContent: 'center',
		alignItems: 'center',
	},
	iconButtonText: {
		fontSize: 16,
		color: '#212121',
		flex: 1,
		marginLeft: 12,
	},
	iconGrid: {
		flexDirection: 'row',
		flexWrap: 'wrap',
		gap: 8,
		marginTop: 2,
	},
	iconOption: {
		width: 40,
		height: 40,
		borderRadius: 20,
		backgroundColor: 'white',
		alignItems: 'center',
		justifyContent: 'center',
		borderWidth: 1,
		borderColor: '#E0E0E0',
	},
	targetSubtext: {
		fontSize: 12,
		fontWeight: '500',
		color: '#757575',
		marginBottom: 8,
	},
	targetPresetsContainer: {
		flexDirection: 'row',
		flexWrap: 'wrap',
		gap: 8,
		marginBottom: 12,
	},
	targetPreset: {
		padding: 12,
		borderRadius: 8,
		backgroundColor: 'white',
		borderWidth: 1,
		borderColor: '#E0E0E0',
	},
	selectedTargetPreset: {
		borderColor: '#00a2ff',
		backgroundColor: '#f0f9ff',
	},
	targetPresetText: {
		fontSize: 16,
		fontWeight: '600',
		color: '#212121',
	},
	selectedTargetPresetText: {
		color: '#00a2ff',
		fontWeight: '600',
	},
	inputLabel: {
		fontSize: 14,
		fontWeight: '500',
		color: '#757575',
		marginBottom: 8,
	},
	colorPickerContainer: {
		marginBottom: 10,
	},
	colorButton: {
		backgroundColor: '#F5F5F5',
		borderRadius: 12,
		padding: 16,
		marginBottom: 8,
	},
	colorButtonContent: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
	},
	colorPreview: {
		width: 24,
		height: 24,
		borderRadius: 6,
		borderWidth: 1,
		borderColor: '#E0E0E0',
	},
	colorButtonText: {
		fontSize: 16,
		color: '#212121',
		flex: 1,
		marginLeft: 12,
	},
	colorGrid: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		marginTop: 2,
		paddingRight: 10,
	},
	colorColumn: {
		alignItems: 'center',
	},
	colorOptionContainer: {
		width: 36,
		height: 36,
		marginBottom: 4,
	},
	colorSquare: {
		width: '100%',
		height: '100%',
		borderRadius: 8,
		borderWidth: 1,
		borderColor: '#E0E0E0',
	},
	selectedIndicator: {
		position: 'absolute',
		top: 0,
		left: 0,
		right: 0,
		bottom: 0,
		backgroundColor: 'rgba(0, 0, 0, 0.2)',
		borderRadius: 8,
		justifyContent: 'center',
		alignItems: 'center',
	},
	categoryPickerContainer: {
		marginBottom: 10,
	},
	categoryButton: {
		backgroundColor: '#F5F5F5',
		borderRadius: 12,
		padding: 16,
		marginBottom: 8,
	},
	categoryButtonContent: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
	},
	categoryButtonLeft: {
		flexDirection: 'row',
		alignItems: 'center',
		flex: 1,
	},
	categoryButtonText: {
		fontSize: 16,
		color: '#212121',
		marginLeft: 12,
	},
	categorySubtext: {
		fontSize: 12,
		fontWeight: '500',
		color: '#757575',
		marginBottom: 8,
	},
	categoryList: {
		padding: 10,
	},
	categoryOption: {
		padding: 8,
		borderWidth: 1,
		borderColor: '#E0E0E0',
		borderRadius: 8,
		marginBottom: 4,
	},
	categoryOptionContent: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
	},
	categoryIcon: {
		width: 24,
		height: 24,
		borderRadius: 4,
		justifyContent: 'center',
		alignItems: 'center',
		marginRight: 8,
	},
	categoryName: {
		fontSize: 16,
		fontWeight: '600',
		color: '#212121',
		flex: 1,
	},
	checkboxContainer: {
		width: 24,
		height: 24,
		borderRadius: 4,
		borderWidth: 1,
		borderColor: '#E0E0E0',
		justifyContent: 'center',
		alignItems: 'center',
	},
});
