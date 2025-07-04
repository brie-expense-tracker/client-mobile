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
	ActivityIndicator,
	ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { BorderlessButton, RectButton } from 'react-native-gesture-handler';
import { useBudget, Budget } from '../../../src/context/budgetContext';
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

// Popular budget icons
const budgetIcons: (keyof typeof Ionicons.glyphMap)[] = [
	'restaurant-outline',
	'cart-outline',
	'car-outline',
	'home-outline',
	'game-controller-outline',
	'airplane-outline',
	'bag-outline',
	'fitness-outline',
	'school-outline',
	'gift-outline',
	'flash-outline',
	'call-outline',
	'medical-outline',
	'book-outline',
	'musical-notes-outline',
];

// Quick amount presets
const amountPresets = [200, 500, 1000, 2000, 5000];

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
export default function BudgetScreen() {
	// ==========================================
	// Context
	// ==========================================
	const { budgets, isLoading, addBudget, updateBudget, deleteBudget } =
		useBudget();

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
	const [editingBudget, setEditingBudget] = useState<Budget | null>(null);
	const [showColorPicker, setShowColorPicker] = useState(false);
	const [showIconPicker, setShowIconPicker] = useState(false);
	const [showCustomAmount, setShowCustomAmount] = useState(false);
	const [newBudget, setNewBudget] = useState({
		category: '',
		allocated: '',
		icon: 'cart-outline' as keyof typeof Ionicons.glyphMap,
		color: COLOR_PALETTE.blue.base,
	});
	const [isPressed, setIsPressed] = useState(false);

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
	useEffect(() => {}, [newBudget]);

	// ==========================================
	// Loading Screen Component
	// ==========================================
	const LoadingScreen = () => (
		<View style={styles.loadingContainer}>
			<View style={styles.loadingContent}>
				<ActivityIndicator size="large" color="#00a2ff" />
				<Text style={styles.loadingText}>Loading budgets...</Text>
			</View>
		</View>
	);

	// ==========================================
	// Budget Management
	// ==========================================
	const handleAddBudget = async () => {
		if (!newBudget.category || !newBudget.allocated) {
			console.log('Validation failed: missing category or allocated amount');
			return;
		}

		console.log('Adding budget:', newBudget);

		try {
			const result = await addBudget({
				category: newBudget.category,
				allocated: parseFloat(newBudget.allocated),
				icon: newBudget.icon,
				color: newBudget.color,
				categories: [],
			});

			console.log('Budget added successfully:', result);

			hideModal();
			// Update the URL to remove the openModal parameter
			router.setParams({ openModal: 'false' });
			setNewBudget({
				category: '',
				allocated: '',
				icon: 'cart-outline',
				color: COLOR_PALETTE.blue.base,
			});
		} catch (error) {
			console.error('Error adding budget:', error);
		}
	};

	const handleEditBudget = async () => {
		if (!editingBudget || !newBudget.category || !newBudget.allocated) {
			return;
		}

		try {
			await updateBudget(editingBudget.id, {
				category: newBudget.category,
				allocated: parseFloat(newBudget.allocated),
				icon: newBudget.icon,
				color: newBudget.color,
				categories: [],
			});

			hideEditModal();
			// Update the URL to remove the openModal parameter
			router.setParams({ openModal: 'false' });
			setNewBudget({
				category: '',
				allocated: '',
				icon: 'cart-outline',
				color: COLOR_PALETTE.blue.base,
			});
			setEditingBudget(null);
		} catch (error) {
			console.error('Error updating budget:', error);
		}
	};

	const handleDeleteBudget = async (budgetId: string) => {
		try {
			await deleteBudget(budgetId);
		} catch (error) {
			console.error('Error deleting budget:', error);
		}
	};

	// ==========================================
	// Modal Handlers
	// ==========================================
	const showModal = () => {
		console.log('showModal called - resetting newBudget state');
		setNewBudget({
			category: '',
			allocated: '',
			icon: 'cart-outline' as keyof typeof Ionicons.glyphMap,
			color: COLOR_PALETTE.blue.base,
		});
		setShowColorPicker(false);
		setShowIconPicker(false);
		setShowCustomAmount(false);
		setIsModalVisible(true);
		Animated.spring(slideAnim, {
			toValue: 1,
			useNativeDriver: true,
			tension: 50,
			friction: 9,
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

	const showEditModal = (budget: Budget) => {
		setEditingBudget(budget);
		setNewBudget({
			category: budget.category,
			allocated: budget.allocated.toString(),
			icon: budget.icon as keyof typeof Ionicons.glyphMap,
			color: budget.color,
		});
		setShowColorPicker(false);
		setShowIconPicker(false);
		setShowCustomAmount(false);
		setIsEditModalVisible(true);
		Animated.spring(slideAnim, {
			toValue: 1,
			useNativeDriver: true,
			tension: 50,
			friction: 9,
		}).start();
	};

	const hideEditModal = () => {
		Animated.timing(slideAnim, {
			toValue: 0,
			duration: 200,
			useNativeDriver: true,
		}).start(() => {
			setIsEditModalVisible(false);
			setEditingBudget(null);
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
						style={[styles.colorPreview, { backgroundColor: newBudget.color }]}
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
								onPress={() =>
									setNewBudget({ ...newBudget, color: colors.base })
								}
							>
								<View
									style={[styles.colorSquare, { backgroundColor: colors.base }]}
								>
									{newBudget.color === colors.base && (
										<View style={styles.selectedIndicator}>
											<Ionicons name="checkmark" size={20} color="#FFF" />
										</View>
									)}
								</View>
							</RectButton>
							<RectButton
								style={styles.colorOptionContainer}
								onPress={() =>
									setNewBudget({ ...newBudget, color: colors.pastel })
								}
							>
								<View
									style={[
										styles.colorSquare,
										{ backgroundColor: colors.pastel },
									]}
								>
									{newBudget.color === colors.pastel && (
										<View style={styles.selectedIndicator}>
											<Ionicons name="checkmark" size={20} color="#000" />
										</View>
									)}
								</View>
							</RectButton>
							<RectButton
								style={styles.colorOptionContainer}
								onPress={() =>
									setNewBudget({ ...newBudget, color: colors.dark })
								}
							>
								<View
									style={[styles.colorSquare, { backgroundColor: colors.dark }]}
								>
									{newBudget.color === colors.dark && (
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
							{ backgroundColor: newBudget.color + '20' },
						]}
					>
						<Ionicons
							name={newBudget.icon as any}
							size={18}
							color={newBudget.color}
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
					{budgetIcons.map((icon) => (
						<RectButton
							key={icon}
							style={[
								styles.iconOption,
								newBudget.icon === icon && {
									backgroundColor: newBudget.color,
								},
							]}
							onPress={() => {
								setNewBudget({ ...newBudget, icon });
							}}
						>
							<Ionicons
								name={icon as any}
								size={24}
								color={newBudget.icon === icon ? 'white' : newBudget.color}
							/>
						</RectButton>
					))}
				</View>
			)}
		</View>
	);

	// ==========================================
	// Render Functions
	// ==========================================
	const renderItem = ({ item }: { item: Budget }) => {
		const percent = Math.min((item.spent / item.allocated) * 100, 100);

		return (
			<BorderlessButton
				style={styles.card}
				onPress={() => showEditModal(item)}
				onActiveStateChange={setIsPressed}
			>
				<View style={styles.cardHeader}>
					<View
						style={[styles.iconWrapper, { backgroundColor: `${item.color}20` }]}
					>
						<Ionicons name={item.icon as any} size={24} color={item.color} />
					</View>
					<Text style={styles.categoryText}>{item.category}</Text>
				</View>

				<View style={styles.amounts}>
					<Text style={styles.spentText}>${item.spent.toFixed(2)}</Text>
					<Text style={styles.allocatedText}>
						/ ${item.allocated.toFixed(2)}
					</Text>
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

				<Text style={styles.percentageText}>{percent.toFixed(0)}%</Text>
			</BorderlessButton>
		);
	};

	// ==========================================
	// Main Render
	// ==========================================
	// Show loading screen while data is being loaded
	if (isLoading) {
		return <LoadingScreen />;
	}

	// Add the "Add Budget" card to the data
	const budgetsWithAdd = [
		...budgets,
		{
			id: 'add',
			category: 'Add Budget',
			allocated: 0,
			spent: 0,
			icon: 'add-circle-outline',
			color: '#00a2ff',
		} as Budget,
	];

	return (
		<View style={styles.mainContainer}>
			<FlatList
				data={budgetsWithAdd}
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
									<Text style={styles.categoryText}>{item.category}</Text>
								</View>
							</RectButton>
						);
					}
					return renderItem({ item });
				}}
				contentContainerStyle={styles.listContent}
				showsVerticalScrollIndicator={false}
			/>

			{/* Add Budget Modal */}
			<Modal
				visible={isModalVisible}
				transparent
				animationType="fade"
				onRequestClose={hideModal}
			>
				<KeyboardAvoidingView
					behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
					style={styles.modalContainer}
				>
					<Animated.View
						style={[
							styles.modalAnimationContainer,
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
						<View style={styles.modalContainer}>
							<View style={styles.modalContent}>
								<View style={styles.modalHeader}>
									<Text style={styles.modalTitle}>Add New Budget</Text>
									<RectButton onPress={hideModal}>
										<Ionicons name="close" size={24} color="#757575" />
									</RectButton>
								</View>
								<ScrollView
									showsVerticalScrollIndicator={false}
									contentContainerStyle={{
										paddingBottom: 24,
										justifyContent: 'flex-end',
									}}
								>
									<View style={styles.formGroup}>
										<Text style={styles.label}>Category Name</Text>
										<TextInput
											style={styles.input}
											value={newBudget.category}
											onChangeText={(text) =>
												setNewBudget({ ...newBudget, category: text })
											}
											placeholder="e.g., Groceries"
											placeholderTextColor="#9E9E9E"
											autoComplete="off"
											autoCorrect={false}
										/>
									</View>

									<View style={styles.formGroup}>
										<Text style={styles.label}>Budget Amount</Text>
										<Text style={styles.amountSubtext}>
											Set your monthly spending limit for this category
										</Text>

										{/* Quick Amount Presets */}
										<View style={styles.amountPresetsContainer}>
											{amountPresets.map((amount) => (
												<RectButton
													key={amount}
													style={[
														styles.amountPreset,
														newBudget.allocated === amount.toString() &&
															styles.selectedAmountPreset,
													]}
													onPress={() => {
														setNewBudget({
															...newBudget,
															allocated: amount.toString(),
														});
														setShowCustomAmount(false);
													}}
												>
													<Text
														style={[
															styles.amountPresetText,
															newBudget.allocated === amount.toString() &&
																styles.selectedAmountPresetText,
														]}
													>
														${amount}
													</Text>
												</RectButton>
											))}

											{/* Custom Amount Button */}
											<RectButton
												style={[
													styles.amountPreset,
													showCustomAmount && styles.selectedAmountPreset,
												]}
												onPress={() => {
													setShowCustomAmount(!showCustomAmount);
													if (!showCustomAmount) {
														setNewBudget({
															...newBudget,
															allocated: '',
														});
													}
												}}
											>
												<Text
													style={[
														styles.amountPresetText,
														showCustomAmount && styles.selectedAmountPresetText,
													]}
												>
													Custom
												</Text>
											</RectButton>
										</View>

										{/* Custom Amount Input */}
										{showCustomAmount && (
											<>
												<Text style={styles.inputLabel}>
													Enter custom amount
												</Text>
												<TextInput
													style={styles.input}
													value={newBudget.allocated}
													onChangeText={(text) =>
														setNewBudget({ ...newBudget, allocated: text })
													}
													placeholder="e.g., 500"
													keyboardType="numeric"
													placeholderTextColor="#9E9E9E"
													autoComplete="off"
												/>
											</>
										)}
									</View>

									<IconPicker />
									<ColorPicker />

									<RectButton
										style={[
											styles.addButton,
											{ backgroundColor: newBudget.color },
										]}
										onPress={handleAddBudget}
									>
										<Text style={styles.addButtonText}>Add Budget</Text>
									</RectButton>
								</ScrollView>
							</View>
						</View>
					</Animated.View>
				</KeyboardAvoidingView>
			</Modal>

			{/* Edit Budget Modal */}
			<Modal
				visible={isEditModalVisible}
				transparent
				animationType="fade"
				onRequestClose={hideEditModal}
			>
				<KeyboardAvoidingView
					behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
					style={styles.modalContainer}
				>
					<Animated.View
						style={[
							styles.modalAnimationContainer,
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
						<View style={styles.modalContainer}>
							<View style={styles.modalContent}>
								<View style={styles.modalHeader}>
									<Text style={styles.modalTitle}>Edit Budget</Text>
									<RectButton onPress={hideEditModal}>
										<Ionicons name="close" size={24} color="#757575" />
									</RectButton>
								</View>
								<ScrollView
									showsVerticalScrollIndicator={false}
									contentContainerStyle={{
										paddingBottom: 24,
										justifyContent: 'flex-end',
									}}
								>
									<View style={styles.formGroup}>
										<Text style={styles.label}>Category Name</Text>
										<TextInput
											style={styles.input}
											value={newBudget.category}
											onChangeText={(text) =>
												setNewBudget({ ...newBudget, category: text })
											}
											placeholder="e.g., Groceries"
											placeholderTextColor="#9E9E9E"
											autoComplete="off"
											autoCorrect={false}
										/>
									</View>

									<View style={styles.formGroup}>
										<Text style={styles.label}>Budget Amount</Text>
										<Text style={styles.amountSubtext}>
											Set your monthly spending limit for this category
										</Text>

										{/* Quick Amount Presets */}
										<View style={styles.amountPresetsContainer}>
											{amountPresets.map((amount) => (
												<RectButton
													key={amount}
													style={[
														styles.amountPreset,
														newBudget.allocated === amount.toString() &&
															styles.selectedAmountPreset,
													]}
													onPress={() => {
														setNewBudget({
															...newBudget,
															allocated: amount.toString(),
														});
														setShowCustomAmount(false);
													}}
												>
													<Text
														style={[
															styles.amountPresetText,
															newBudget.allocated === amount.toString() &&
																styles.selectedAmountPresetText,
														]}
													>
														${amount}
													</Text>
												</RectButton>
											))}

											{/* Custom Amount Button */}
											<RectButton
												style={[
													styles.amountPreset,
													showCustomAmount && styles.selectedAmountPreset,
												]}
												onPress={() => {
													setShowCustomAmount(!showCustomAmount);
													if (!showCustomAmount) {
														setNewBudget({
															...newBudget,
															allocated: '',
														});
													}
												}}
											>
												<Text
													style={[
														styles.amountPresetText,
														showCustomAmount && styles.selectedAmountPresetText,
													]}
												>
													Custom
												</Text>
											</RectButton>
										</View>

										{/* Custom Amount Input */}
										{showCustomAmount && (
											<>
												<Text style={styles.inputLabel}>
													Enter custom amount
												</Text>
												<TextInput
													style={styles.input}
													value={newBudget.allocated}
													onChangeText={(text) =>
														setNewBudget({ ...newBudget, allocated: text })
													}
													placeholder="e.g., 500"
													keyboardType="numeric"
													placeholderTextColor="#9E9E9E"
													autoComplete="off"
												/>
											</>
										)}
									</View>

									<IconPicker />
									<ColorPicker />

									<View style={styles.modalButtonContainer}>
										<RectButton
											style={[
												styles.addButton,
												{ backgroundColor: newBudget.color },
											]}
											onPress={handleEditBudget}
										>
											<Text style={styles.addButtonText}>Update Budget</Text>
										</RectButton>

										{editingBudget && (
											<RectButton
												style={styles.deleteButton}
												onPress={() => handleDeleteBudget(editingBudget.id)}
											>
												<Text style={styles.deleteButtonText}>
													Delete Budget
												</Text>
											</RectButton>
										)}
									</View>
								</ScrollView>
							</View>
						</View>
					</Animated.View>
				</KeyboardAvoidingView>
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
	loadingContainer: {
		flex: 1,
		backgroundColor: '#fff',
		justifyContent: 'center',
		alignItems: 'center',
	},
	loadingContent: {
		alignItems: 'center',
	},
	loadingText: {
		marginTop: 16,
		fontSize: 16,
		color: '#757575',
		fontWeight: '500',
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
		shadowOpacity: 0.05,
		shadowRadius: 8,
		// Android shadow
		elevation: 2,
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
	percentageText: {
		marginTop: 6,
		fontSize: 12,
		fontWeight: '500',
		color: '#757575',
		textAlign: 'right',
	},
	modalAnimationContainer: {
		flex: 1,
		backgroundColor: 'rgba(0, 0, 0, 0.5)',
	},
	modalContainer: {
		flex: 1,
	},
	modalContent: {
		flex: 1,
		backgroundColor: '#ffffff',
		borderTopLeftRadius: 20,
		borderTopRightRadius: 20,
		padding: 24,
		marginTop: 80,
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
		backgroundColor: '#00a2ff',
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
	amountSubtext: {
		fontSize: 12,
		fontWeight: '500',
		color: '#757575',
		marginBottom: 8,
	},
	amountPresetsContainer: {
		flexDirection: 'row',
		flexWrap: 'wrap',
		gap: 8,
		marginBottom: 12,
	},
	amountPreset: {
		padding: 12,
		borderRadius: 8,
		backgroundColor: 'white',
		borderWidth: 1,
		borderColor: '#E0E0E0',
	},
	selectedAmountPreset: {
		borderColor: '#00a2ff',
		backgroundColor: '#f0f9ff',
	},
	amountPresetText: {
		fontSize: 16,
		fontWeight: '600',
		color: '#212121',
	},
	selectedAmountPresetText: {
		color: '#00a2ff',
		fontWeight: '600',
	},
	inputLabel: {
		fontSize: 14,
		fontWeight: '500',
		color: '#757575',
		marginBottom: 8,
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
		padding: 10,
		borderWidth: 1,
		borderColor: '#E0E0E0',
		borderRadius: 8,
	},
	categoryOptionContent: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
	},
	categoryIcon: {
		width: 24,
		height: 24,
		borderRadius: 8,
		justifyContent: 'center',
		alignItems: 'center',
		marginRight: 10,
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
