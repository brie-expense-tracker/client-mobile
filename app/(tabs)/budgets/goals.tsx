import React, { useState, useEffect } from 'react';
import {
	View,
	Text,
	StyleSheet,
	FlatList,
	Dimensions,
	TextInput,
	KeyboardAvoidingView,
	Platform,
	Alert,
	ScrollView,
	RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { BorderlessButton, RectButton } from 'react-native-gesture-handler';
import { useGoal, Goal } from '../../../src/context/goalContext';
import { useLocalSearchParams, useRouter } from 'expo-router';
import DateTimePicker from '@react-native-community/datetimepicker';
import RNModal from 'react-native-modal';
import QuickAddTransaction from '../../../src/components/QuickAddTransaction';

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
	const { goals, addGoal, updateGoal, deleteGoal, refetch } = useGoal();

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
	const [isOptionsModalVisible, setIsOptionsModalVisible] = useState(false);
	const [selectedGoal, setSelectedGoal] = useState<Goal | null>(null);
	const [editingGoal, setEditingGoal] = useState<Goal | null>(null);
	const [pendingEditGoal, setPendingEditGoal] = useState<Goal | null>(null);
	const [showColorPicker, setShowColorPicker] = useState(false);
	const [showIconPicker, setShowIconPicker] = useState(false);
	const [showCustomTarget, setShowCustomTarget] = useState(false);
	const [showDatePicker, setShowDatePicker] = useState(false);
	const [selectedDate, setSelectedDate] = useState(new Date());
	const [isPressed, setIsPressed] = useState(false);
	const [showQuickAddModal, setShowQuickAddModal] = useState(false);
	const [selectedGoalForTransaction, setSelectedGoalForTransaction] =
		useState<Goal | null>(null);
	const [refreshing, setRefreshing] = useState(false);
	const [newGoal, setNewGoal] = useState({
		name: '',
		target: '',
		deadline: '',
		icon: 'flag-outline' as keyof typeof Ionicons.glyphMap,
		color: COLOR_PALETTE.blue.base,
		categories: [] as string[],
	});

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
	// Refresh Handler
	// ==========================================
	const onRefresh = async () => {
		setRefreshing(true);
		try {
			// Trigger a refresh of goals data from the server
			await refetch();
		} catch (error) {
			console.error('Error refreshing goals:', error);
		} finally {
			setRefreshing(false);
		}
	};

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
		setShowIconPicker(false);
		setShowCustomTarget(false);
		setShowDatePicker(false);
		setSelectedDate(new Date());
		setIsModalVisible(true);
	};

	const hideModal = () => {
		setIsModalVisible(false);
		// Update the URL to remove the openModal parameter
		router.setParams({ openModal: 'false' });
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
		setShowIconPicker(false);
		setShowCustomTarget(false);
		setShowDatePicker(false);
		setSelectedDate(new Date(goal.deadline));
		setIsEditModalVisible(true);
	};

	const hideEditModal = () => {
		setIsEditModalVisible(false);
		setEditingGoal(null);
		// Update the URL to remove the openModal parameter
		router.setParams({ openModal: 'false' });
	};

	const showOptionsModal = (goal: Goal) => {
		setSelectedGoal(goal);
		setIsOptionsModalVisible(true);
	};

	const hideOptionsModal = () => {
		console.log('hideOptionsModal called');
		setIsOptionsModalVisible(false);
		setSelectedGoal(null);
	};

	const handleOptionsModalHide = () => {
		console.log('Options modal hidden, checking for pending edit');
		if (pendingEditGoal) {
			console.log('Showing edit modal for pending goal:', pendingEditGoal);
			showEditModal(pendingEditGoal);
			setPendingEditGoal(null);
		}
	};

	const handleEditFromOptions = () => {
		console.log('handleEditFromOptions called, selectedGoal:', selectedGoal);
		if (selectedGoal) {
			// Store the goal to edit and hide the options modal
			setPendingEditGoal(selectedGoal);
			hideOptionsModal();
		}
	};

	const handleDeleteFromOptions = async () => {
		if (selectedGoal) {
			hideOptionsModal();
			await handleDeleteGoal(selectedGoal.id);
		}
	};

	const handleQuickAddTransaction = (goal: Goal) => {
		setSelectedGoalForTransaction(goal);
		setShowQuickAddModal(true);
	};

	const handleCloseQuickAddModal = () => {
		setShowQuickAddModal(false);
		setSelectedGoalForTransaction(null);
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
								onPress={() => {
									setNewGoal({ ...newGoal, color: colors.base });
									setShowColorPicker(!showColorPicker);
								}}
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
								onPress={() => {
									setNewGoal({ ...newGoal, color: colors.pastel });
									setShowColorPicker(!showColorPicker);
								}}
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
								onPress={() => {
									setNewGoal({ ...newGoal, color: colors.dark });
									setShowColorPicker(!showColorPicker);
								}}
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
							size={20}
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
							style={[
								styles.iconOption,
								newGoal.icon === icon && {
									backgroundColor: newGoal.color,
								},
							]}
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
	// Date Picker Component
	// ==========================================
	const DatePicker = () => (
		<View style={styles.datePickerContainer}>
			<Text style={styles.label}>Target Date</Text>
			<RectButton
				style={styles.dateButton}
				onPress={() => setShowDatePicker(!showDatePicker)}
			>
				<View style={styles.dateButtonContent}>
					<View
						style={[styles.dateIcon, { backgroundColor: newGoal.color + '20' }]}
					>
						<Ionicons name="calendar-outline" size={16} color={newGoal.color} />
					</View>
					<Text style={styles.dateButtonText}>
						{newGoal.deadline || 'Select date'}
					</Text>
					<Ionicons name="chevron-down" size={20} color="#757575" />
				</View>
			</RectButton>

			{showDatePicker && (
				<DateTimePicker
					mode="date"
					display="inline"
					onChange={(event, date) => {
						setShowDatePicker(false);
						if (date) {
							setSelectedDate(date);
							const formattedDate = date.toISOString().split('T')[0];
							setNewGoal({ ...newGoal, deadline: formattedDate });
						}
					}}
					minimumDate={new Date()}
					value={selectedDate}
				/>
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
			<RectButton
				style={styles.card}
				onPress={() => handleQuickAddTransaction(item)}
			>
				<View style={styles.cardHeader}>
					<View
						style={[styles.iconWrapper, { backgroundColor: `${item.color}20` }]}
					>
						<Ionicons name={item.icon as any} size={24} color={item.color} />
					</View>
					<Text style={styles.categoryText}>{item.name}</Text>
					<BorderlessButton
						style={styles.optionsButton}
						onPress={() => showOptionsModal(item)}
						onActiveStateChange={setIsPressed}
					>
						<Ionicons name="ellipsis-horizontal" size={20} color="#757575" />
					</BorderlessButton>
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
	// Empty State Component
	// ==========================================
	const EmptyState = () => (
		<View style={styles.emptyContainer}>
			<View style={styles.emptyContent}>
				<Ionicons name="flag-outline" size={64} color="#e0e0e0" />
				<Text style={styles.emptyTitle}>No Goals Yet</Text>
				<Text style={styles.emptySubtext}>
					Create your first goal to start saving towards your dreams
				</Text>
				<RectButton style={styles.emptyAddButton} onPress={showModal}>
					<Ionicons name="add" size={20} color="#fff" />
					<Text style={styles.emptyAddButtonText}>Add Goal</Text>
				</RectButton>
			</View>
		</View>
	);

	// ==========================================
	// Main Render
	// ==========================================
	// Show empty state if no goals, otherwise show goals with add button
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
			{goals.length === 0 ? (
				<EmptyState />
			) : (
				<FlatList
					data={goalsWithAdd}
					keyExtractor={(item) => item.id}
					refreshControl={
						<RefreshControl
							refreshing={refreshing}
							onRefresh={onRefresh}
							tintColor="#00a2ff"
							colors={['#00a2ff']}
						/>
					}
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
			)}

			{/* Add Goal Modal */}
			<RNModal
				isVisible={isModalVisible}
				style={styles.modal}
				animationIn="slideInUp"
				animationOut="slideOutDown"
				useNativeDriver
			>
				<KeyboardAvoidingView
					behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
					style={styles.modalContainer}
				>
					<View style={styles.modalContent}>
						<View style={styles.modalHeader}>
							<Text style={styles.modalTitle}>Add New Goal</Text>
							<BorderlessButton
								onActiveStateChange={setIsPressed}
								onPress={hideModal}
							>
								<Ionicons name="close" size={24} color="#757575" />
							</BorderlessButton>
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
											onPress={() => {
												setNewGoal({
													...newGoal,
													target: amount.toString(),
												});
												setShowCustomTarget(false);
											}}
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
									<RectButton
										style={[
											styles.targetPreset,
											showCustomTarget && styles.selectedTargetPreset,
										]}
										onPress={() => {
											setShowCustomTarget(!showCustomTarget);
											if (!showCustomTarget) {
												setNewGoal({ ...newGoal, target: '' });
											}
										}}
									>
										<Text
											style={[
												styles.targetPresetText,
												showCustomTarget && styles.selectedTargetPresetText,
											]}
										>
											Custom
										</Text>
									</RectButton>
								</View>

								{/* Custom Amount Input */}
								{showCustomTarget && (
									<View style={styles.customInputContainer}>
										<Text style={styles.inputLabel}>Enter custom amount</Text>
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
								)}
							</View>

							<DatePicker />

							<IconPicker />
							<ColorPicker />

							<RectButton
								style={[styles.addButton, { backgroundColor: newGoal.color }]}
								onPress={handleAddGoal}
							>
								<Text style={styles.addButtonText}>Add Goal</Text>
							</RectButton>
						</ScrollView>
					</View>
				</KeyboardAvoidingView>
			</RNModal>

			{/* Edit Goal Modal */}
			<RNModal
				isVisible={isEditModalVisible}
				style={styles.modal}
				animationIn="slideInUp"
				animationOut="slideOutDown"
				useNativeDriver
			>
				<KeyboardAvoidingView
					behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
					style={styles.modalContainer}
				>
					<View style={styles.modalContent}>
						<View style={styles.modalHeader}>
							<Text style={styles.modalTitle}>Edit Goal</Text>
							<BorderlessButton
								onActiveStateChange={setIsPressed}
								onPress={hideEditModal}
							>
								<Ionicons name="close" size={24} color="#757575" />
							</BorderlessButton>
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
											onPress={() => {
												setNewGoal({
													...newGoal,
													target: amount.toString(),
												});
												setShowCustomTarget(false);
											}}
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
									<RectButton
										style={[
											styles.targetPreset,
											showCustomTarget && styles.selectedTargetPreset,
										]}
										onPress={() => {
											setShowCustomTarget(!showCustomTarget);
											if (!showCustomTarget) {
												setNewGoal({ ...newGoal, target: '' });
											}
										}}
									>
										<Text
											style={[
												styles.targetPresetText,
												showCustomTarget && styles.selectedTargetPresetText,
											]}
										>
											Custom
										</Text>
									</RectButton>
								</View>

								{/* Custom Amount Input */}
								{showCustomTarget && (
									<View style={styles.customInputContainer}>
										<Text style={styles.inputLabel}>Enter custom amount</Text>
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
								)}
							</View>

							<DatePicker />

							<IconPicker />
							<ColorPicker />

							<View style={styles.modalButtonContainer}>
								<RectButton
									style={[styles.addButton, { backgroundColor: newGoal.color }]}
									onPress={handleEditGoal}
								>
									<Text style={styles.addButtonText}>Update Goal</Text>
								</RectButton>

								{editingGoal && (
									<RectButton
										style={styles.deleteButton}
										onPress={() => {
											Alert.alert(
												'Delete Goal',
												'Are you sure you want to delete this goal? This action cannot be undone.',
												[
													{
														text: 'Cancel',
														style: 'cancel',
													},
													{
														text: 'Delete',
														style: 'destructive',
														onPress: () => {
															handleDeleteGoal(editingGoal.id);
															hideEditModal();
														},
													},
												]
											);
										}}
									>
										<Text style={styles.deleteButtonText}>Delete Goal</Text>
									</RectButton>
								)}
							</View>
						</ScrollView>
					</View>
				</KeyboardAvoidingView>
			</RNModal>

			{/* Options Menu Modal */}
			<RNModal
				isVisible={isOptionsModalVisible}
				onBackdropPress={hideOptionsModal}
				onBackButtonPress={hideOptionsModal}
				onModalHide={handleOptionsModalHide}
				animationIn="fadeIn"
				animationOut="fadeOut"
				backdropOpacity={0.5}
				useNativeDriver
				style={styles.optionsModal}
			>
				<View style={styles.optionsModalContent}>
					<Text style={styles.optionsTitle}>{selectedGoal?.name}</Text>

					<RectButton
						style={styles.optionButton}
						onPress={handleEditFromOptions}
					>
						<View style={styles.optionContent}>
							<Ionicons name="create-outline" size={20} color="#00a2ff" />
							<Text style={styles.optionText}>Edit</Text>
						</View>
					</RectButton>

					<RectButton
						style={styles.optionButton}
						onPress={handleDeleteFromOptions}
					>
						<View style={styles.optionContent}>
							<Ionicons name="trash-outline" size={20} color="#E53935" />
							<Text style={[styles.optionText, { color: '#E53935' }]}>
								Delete
							</Text>
						</View>
					</RectButton>

					<RectButton style={styles.optionButton} onPress={hideOptionsModal}>
						<View style={styles.optionContent}>
							<Ionicons name="close-outline" size={20} color="#757575" />
							<Text style={styles.optionText}>Cancel</Text>
						</View>
					</RectButton>
				</View>
			</RNModal>

			{/* Quick Add Transaction Modal */}
			<QuickAddTransaction
				isVisible={showQuickAddModal}
				onClose={handleCloseQuickAddModal}
				goalId={selectedGoalForTransaction?.id}
				goalName={selectedGoalForTransaction?.name}
				goalColor={selectedGoalForTransaction?.color}
			/>
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
	optionsButton: {
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
	modal: {
		margin: 0,
		justifyContent: 'flex-end',
	},
	modalOverlay: {
		flex: 1,
		backgroundColor: 'rgba(0, 0, 0, 0.5)',
	},
	modalAnimationContainer: {
		flex: 1,
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
		backgroundColor: '#ffffff',
		borderColor: '#E53935',
		borderWidth: 1,
		borderRadius: 12,
		padding: 16,
		alignItems: 'center',
		marginTop: 12,
	},
	deleteButtonText: {
		color: '#E53935',
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
	datePickerContainer: {
		marginBottom: 20,
	},
	dateButton: {
		backgroundColor: '#F5F5F5',
		borderRadius: 12,
		padding: 16,
	},
	dateButtonContent: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
	},
	dateIcon: {
		width: 24,
		height: 24,
		borderRadius: 6,
		justifyContent: 'center',
		alignItems: 'center',
	},
	dateButtonText: {
		fontSize: 16,
		color: '#212121',
		flex: 1,
		marginLeft: 12,
	},
	datePickerWrapper: {
		backgroundColor: '#F5F5F5',
		borderRadius: 12,
		padding: 8,
		marginTop: 8,
		borderWidth: 1,
		borderColor: '#E0E0E0',
	},
	customInputContainer: {
		marginTop: 10,
	},
	optionsModal: {
		margin: 0,
		justifyContent: 'flex-end',
	},
	optionsModalContent: {
		backgroundColor: 'white',
		borderRadius: 16,
		padding: 24,
		maxWidth: 400,
		alignItems: 'center',
	},

	optionsTitle: {
		fontSize: 20,
		fontWeight: '600',
		color: '#212121',
		marginBottom: 24,
		textAlign: 'center',
	},
	optionButton: {
		flexDirection: 'row',
		alignItems: 'center',
		backgroundColor: '#f8f9fa',
		paddingVertical: 16,
		paddingHorizontal: 20,
		borderRadius: 12,
		marginBottom: 12,
		width: '100%',
		justifyContent: 'center',
	},
	optionContent: {
		flexDirection: 'row',
		alignItems: 'center',
	},
	optionText: {
		fontSize: 16,
		fontWeight: '500',
		color: '#212121',
		marginLeft: 12,
	},
	quickAddHint: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'center',
		marginTop: 8,
		paddingTop: 8,
		borderTopWidth: 1,
		borderTopColor: '#F0F0F0',
		gap: 4,
	},
	quickAddHintText: {
		fontSize: 12,
		color: '#757575',
		fontWeight: '400',
	},
	emptyContainer: {
		flex: 1,
		justifyContent: 'center',
		alignItems: 'center',
		paddingHorizontal: 24,
	},
	emptyContent: {
		alignItems: 'center',
		maxWidth: 280,
	},
	emptyTitle: {
		fontSize: 24,
		fontWeight: '600',
		color: '#212121',
		marginTop: 16,
		marginBottom: 8,
		textAlign: 'center',
	},
	emptySubtext: {
		fontSize: 16,
		color: '#757575',
		textAlign: 'center',
		marginBottom: 32,
		lineHeight: 22,
	},
	emptyAddButton: {
		backgroundColor: '#00a2ff',
		borderRadius: 12,
		paddingVertical: 16,
		paddingHorizontal: 24,
		flexDirection: 'row',
		alignItems: 'center',
		gap: 8,
	},
	emptyAddButtonText: {
		color: '#FFFFFF',
		fontSize: 16,
		fontWeight: '600',
	},
});
