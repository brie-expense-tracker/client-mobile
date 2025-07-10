import React, { useState, useEffect } from 'react';
import {
	View,
	Text,
	StyleSheet,
	FlatList,
	TextInput,
	KeyboardAvoidingView,
	Platform,
	ScrollView,
	RefreshControl,
	Alert,
} from 'react-native';
import RNModal from 'react-native-modal';
import { Ionicons } from '@expo/vector-icons';
import { BorderlessButton, RectButton } from 'react-native-gesture-handler';
import { useBudget, Budget } from '../../../src/context/budgetContext';
import { useLocalSearchParams, useRouter } from 'expo-router';
import QuickAddBudgetTransaction from '../../../src/components/QuickAddBudgetTransaction';

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
	const {
		budgets,
		isLoading,
		hasLoaded,
		addBudget,
		updateBudget,
		deleteBudget,
		refetch,
	} = useBudget();

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
	const [selectedBudget, setSelectedBudget] = useState<Budget | null>(null);
	const [editingBudget, setEditingBudget] = useState<Budget | null>(null);
	const [pendingEditBudget, setPendingEditBudget] = useState<Budget | null>(
		null
	);
	const [showColorPicker, setShowColorPicker] = useState(false);
	const [showIconPicker, setShowIconPicker] = useState(false);
	const [showCustomAmount, setShowCustomAmount] = useState(false);
	const [newBudget, setNewBudget] = useState({
		name: '',
		amount: '',
		icon: 'cart-outline' as keyof typeof Ionicons.glyphMap,
		color: COLOR_PALETTE.blue.base,
		period: 'monthly' as 'weekly' | 'monthly',
		weekStartDay: 1 as 0 | 1,
		monthStartDay: 1 as
			| 1
			| 2
			| 3
			| 4
			| 5
			| 6
			| 7
			| 8
			| 9
			| 10
			| 11
			| 12
			| 13
			| 14
			| 15
			| 16
			| 17
			| 18
			| 19
			| 20
			| 21
			| 22
			| 23
			| 24
			| 25
			| 26
			| 27
			| 28,
		rollover: false,
	});
	const [isPressed, setIsPressed] = useState(false);
	const [showQuickAddModal, setShowQuickAddModal] = useState(false);
	const [selectedBudgetForTransaction, setSelectedBudgetForTransaction] =
		useState<Budget | null>(null);
	const [refreshing, setRefreshing] = useState(false);

	// ==========================================
	// Calculate Total Budget Summary
	// ==========================================
	const totalBudgetSummary = budgets.reduce(
		(acc, budget) => {
			acc.totalAllocated += budget.amount;
			acc.totalSpent += budget.spent || 0;
			return acc;
		},
		{ totalAllocated: 0, totalSpent: 0 }
	);

	const totalPercentage =
		totalBudgetSummary.totalAllocated > 0
			? Math.min(
					(totalBudgetSummary.totalSpent / totalBudgetSummary.totalAllocated) *
						100,
					100
			  )
			: 0;

	// ==========================================
	// Debug logging for budgets data
	// ==========================================
	useEffect(() => {
		console.log('[BudgetScreen] Current budgets:', budgets);
		console.log('[BudgetScreen] Total summary:', totalBudgetSummary);
		console.log('[BudgetScreen] Total percentage:', totalPercentage);
	}, [budgets, totalBudgetSummary, totalPercentage]);

	// ==========================================
	// Animation Setup
	// ==========================================
	// Removed redundant animations since RNModal handles animations internally

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

	useEffect(() => {
		console.log('isEditModalVisible changed to:', isEditModalVisible);
	}, [isEditModalVisible]);

	// Debug useEffect to track all modal states
	useEffect(() => {
		console.log(
			'Modal states - isModalVisible:',
			isModalVisible,
			'isEditModalVisible:',
			isEditModalVisible,
			'isOptionsModalVisible:',
			isOptionsModalVisible
		);
	}, [isModalVisible, isEditModalVisible, isOptionsModalVisible]);

	// ==========================================
	// Empty State Component
	// ==========================================
	const EmptyState = () => (
		<View style={styles.emptyContainer}>
			<View style={styles.emptyContent}>
				<Ionicons name="wallet-outline" size={64} color="#e0e0e0" />
				<Text style={styles.emptyTitle}>No Budgets Yet</Text>
				<Text style={styles.emptySubtext}>
					Create your first budget to start tracking your spending
				</Text>
				<View style={styles.emptyButtonsContainer}>
					<RectButton style={styles.emptyAddButton} onPress={showModal}>
						<Ionicons name="add" size={20} color="#fff" />
						<Text style={styles.emptyAddButtonText}>Add Budget</Text>
					</RectButton>
					<RectButton
						style={styles.emptyRefreshButton}
						onPress={handleRefresh}
						enabled={!refreshing}
					>
						<Ionicons
							name={refreshing ? 'sync' : 'refresh'}
							size={20}
							color="#00a2ff"
							style={
								refreshing ? { transform: [{ rotate: '360deg' }] } : undefined
							}
						/>
						<Text style={styles.emptyRefreshButtonText}>
							{refreshing ? 'Refreshing...' : 'Refresh'}
						</Text>
					</RectButton>
				</View>
			</View>
		</View>
	);

	// ==========================================
	// Total Budget Summary Component
	// ==========================================
	const TotalBudgetSummary = () => (
		<View style={styles.totalBudgetCard}>
			<View style={styles.totalBudgetHeader}>
				<View style={styles.totalBudgetIconWrapper}>
					<Ionicons name="wallet-outline" size={24} color="#00a2ff" />
				</View>
				<Text style={styles.totalBudgetTitle}>Total Budget</Text>
			</View>

			<View style={styles.totalBudgetAmounts}>
				<Text style={styles.totalBudgetSpentText}>
					${totalBudgetSummary.totalSpent.toFixed(2)}
				</Text>
				<Text style={styles.totalBudgetAllocatedText}>
					/ ${totalBudgetSummary.totalAllocated.toFixed(2)}
				</Text>
			</View>

			<View style={styles.totalBudgetProgressBarBackground}>
				<View
					style={[
						styles.totalBudgetProgressBarFill,
						{
							width: `${totalPercentage}%`,
							backgroundColor:
								totalPercentage > 90
									? '#E53935'
									: totalPercentage > 75
									? '#FB8C00'
									: '#00a2ff',
						},
					]}
				/>
			</View>

			<View style={styles.totalBudgetFooter}>
				<Text style={styles.totalBudgetPercentageText}>
					{totalPercentage.toFixed(0)}% used
				</Text>
				<Text style={styles.totalBudgetRemainingText}>
					$
					{(
						totalBudgetSummary.totalAllocated - totalBudgetSummary.totalSpent
					).toFixed(2)}{' '}
					remaining
				</Text>
			</View>
		</View>
	);

	// ==========================================
	// Budget Management
	// ==========================================
	const handleAddBudget = async () => {
		if (!newBudget.name || !newBudget.amount) {
			console.log('Validation failed: missing name or amount');
			return;
		}

		console.log('Adding budget:', newBudget);

		try {
			const result = await addBudget({
				name: newBudget.name,
				amount: parseFloat(newBudget.amount),
				icon: newBudget.icon,
				color: newBudget.color,
				categories: [],
				period: newBudget.period,
				weekStartDay: newBudget.weekStartDay,
				monthStartDay: newBudget.monthStartDay,
				rollover: newBudget.rollover,
			});

			console.log('Budget added successfully:', result);

			hideModal();
			// Update the URL to remove the openModal parameter
			router.setParams({ openModal: 'false' });
			setNewBudget({
				name: '',
				amount: '',
				icon: 'cart-outline',
				color: COLOR_PALETTE.blue.base,
				period: 'monthly',
				weekStartDay: 1,
				monthStartDay: 1,
				rollover: false,
			});
		} catch (error) {
			console.error('Error adding budget:', error);

			// Show user-friendly error message
			let errorMessage = 'Failed to create budget. Please try again.';

			if (error instanceof Error) {
				if (error.message.includes('already have a budget for')) {
					errorMessage = error.message;
				} else if (error.message.includes('duplicate')) {
					errorMessage =
						'A budget with this name already exists. Please choose a different name.';
				}
			}

			// Show error to user
			Alert.alert('Error', errorMessage);
			console.log('User error:', errorMessage);
		}
	};

	const handleEditBudget = async () => {
		if (!editingBudget || !newBudget.name || !newBudget.amount) {
			return;
		}

		try {
			await updateBudget(editingBudget.id, {
				name: newBudget.name,
				amount: parseFloat(newBudget.amount),
				icon: newBudget.icon,
				color: newBudget.color,
				categories: [],
				period: newBudget.period,
				weekStartDay: newBudget.weekStartDay,
				monthStartDay: newBudget.monthStartDay,
				rollover: newBudget.rollover,
			});

			hideEditModal();
			// Update the URL to remove the openModal parameter
			router.setParams({ openModal: 'false' });
			setNewBudget({
				name: '',
				amount: '',
				icon: 'cart-outline',
				color: COLOR_PALETTE.blue.base,
				period: 'monthly',
				weekStartDay: 1,
				monthStartDay: 1,
				rollover: false,
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
			name: '',
			amount: '',
			icon: 'cart-outline' as keyof typeof Ionicons.glyphMap,
			color: COLOR_PALETTE.blue.base,
			period: 'monthly',
			weekStartDay: 1,
			monthStartDay: 1,
			rollover: false,
		});
		setShowColorPicker(false);
		setShowIconPicker(false);
		setShowCustomAmount(false);
		console.log('About to set isModalVisible to true');
		setIsModalVisible(true);
		console.log('Setting isModalVisible to true');
	};

	const hideModal = () => {
		setIsModalVisible(false);
		// Update the URL to remove the openModal parameter
		router.setParams({ openModal: 'false' });
	};

	const showOptionsModal = (budget: Budget) => {
		setSelectedBudget(budget);
		setIsOptionsModalVisible(true);
	};

	const hideOptionsModal = () => {
		console.log('hideOptionsModal called');
		setIsOptionsModalVisible(false);
		setSelectedBudget(null);
	};

	const handleOptionsModalHide = () => {
		console.log('Options modal hidden, checking for pending edit');
		if (pendingEditBudget) {
			console.log('Showing edit modal for pending budget:', pendingEditBudget);
			showEditModal(pendingEditBudget);
			setPendingEditBudget(null);
		}
	};

	const handleEditFromOptions = () => {
		console.log(
			'handleEditFromOptions called, selectedBudget:',
			selectedBudget
		);
		if (selectedBudget) {
			// Store the budget to edit and hide the options modal
			setPendingEditBudget(selectedBudget);
			hideOptionsModal();
		}
	};

	const handleDeleteFromOptions = async () => {
		if (selectedBudget) {
			hideOptionsModal();
			await handleDeleteBudget(selectedBudget.id);
		}
	};

	const handleQuickAddTransaction = (budget: Budget) => {
		setSelectedBudgetForTransaction(budget);
		setShowQuickAddModal(true);
	};

	const handleCloseQuickAddModal = () => {
		setShowQuickAddModal(false);
		setSelectedBudgetForTransaction(null);
	};

	const handleTransactionAdded = () => {
		// Refresh budgets when a transaction is added
		console.log('[BudgetScreen] Transaction added, refreshing budgets...');
		refetch();
	};

	const handleRefresh = async () => {
		setRefreshing(true);
		try {
			await refetch();
		} catch (error) {
			console.error('Error refreshing budgets:', error);
		} finally {
			setRefreshing(false);
		}
	};

	const showEditModal = (budget: Budget) => {
		console.log('showEditModal called with budget:', budget);
		console.log('Current isEditModalVisible state:', isEditModalVisible);

		setEditingBudget(budget);
		setNewBudget({
			name: budget.name || '',
			amount: budget.amount?.toString() || '0',
			icon: budget.icon as keyof typeof Ionicons.glyphMap,
			color: budget.color || COLOR_PALETTE.blue.base,
			period: budget.period || 'monthly',
			weekStartDay: budget.weekStartDay || 1,
			monthStartDay: budget.monthStartDay || 1,
			rollover: budget.rollover || false,
		});
		setShowColorPicker(false);
		setShowIconPicker(false);
		setShowCustomAmount(false);

		console.log('About to set isEditModalVisible to true');
		setIsEditModalVisible(true);
		console.log('Setting isEditModalVisible to true');
	};

	const hideEditModal = () => {
		setIsEditModalVisible(false);
		setEditingBudget(null);
		// Update the URL to remove the openModal parameter
		router.setParams({ openModal: 'false' });
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
	// Period Selection Component
	// ==========================================
	const PeriodPicker = () => (
		<View style={styles.periodPickerContainer}>
			<Text style={styles.label}>Budget Period</Text>
			<Text style={styles.periodSubtext}>
				Choose how often this budget resets
			</Text>

			<View style={styles.periodOptionsContainer}>
				<RectButton
					style={[
						styles.periodOption,
						newBudget.period === 'monthly' && styles.selectedPeriodOption,
					]}
					onPress={() => setNewBudget({ ...newBudget, period: 'monthly' })}
				>
					<View style={styles.periodOptionContent}>
						<Ionicons
							name="calendar-outline"
							size={20}
							color={newBudget.period === 'monthly' ? '#fff' : '#757575'}
						/>
						<Text
							style={[
								styles.periodOptionText,
								newBudget.period === 'monthly' &&
									styles.selectedPeriodOptionText,
							]}
						>
							Monthly
						</Text>
					</View>
				</RectButton>

				<RectButton
					style={[
						styles.periodOption,
						newBudget.period === 'weekly' && styles.selectedPeriodOption,
					]}
					onPress={() => setNewBudget({ ...newBudget, period: 'weekly' })}
				>
					<View style={styles.periodOptionContent}>
						<Ionicons
							name="calendar-clear-outline"
							size={20}
							color={newBudget.period === 'weekly' ? '#fff' : '#757575'}
						/>
						<Text
							style={[
								styles.periodOptionText,
								newBudget.period === 'weekly' &&
									styles.selectedPeriodOptionText,
							]}
						>
							Weekly
						</Text>
					</View>
				</RectButton>
			</View>
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
		const percent = Math.min(((item.spent || 0) / item.amount) * 100, 100);
		const isOverAlertThreshold = item.shouldAlert || false;

		return (
			<RectButton
				style={[styles.card, isOverAlertThreshold && styles.alertCard]}
				onPress={() => handleQuickAddTransaction(item)}
			>
				<View style={styles.cardHeader}>
					<View
						style={[styles.iconWrapper, { backgroundColor: `${item.color}20` }]}
					>
						<Ionicons name={item.icon as any} size={24} color={item.color} />
					</View>
					<Text style={styles.categoryText}>{item.name}</Text>
					<View style={styles.cardActions}>
						{isOverAlertThreshold && (
							<View style={styles.alertIndicator}>
								<Ionicons name="warning" size={16} color="#E53935" />
							</View>
						)}
						<BorderlessButton
							style={styles.optionsButton}
							onPress={() => showOptionsModal(item)}
							onActiveStateChange={setIsPressed}
						>
							<Ionicons name="ellipsis-horizontal" size={20} color="#757575" />
						</BorderlessButton>
					</View>
				</View>

				<View style={styles.amounts}>
					<Text style={styles.spentText}>${(item.spent || 0).toFixed(2)}</Text>
					<Text style={styles.allocatedText}>/ ${item.amount.toFixed(2)}</Text>
				</View>

				<View style={styles.progressBarBackground}>
					<View
						style={[
							styles.progressBarFill,
							{
								width: `${percent}%`,
								backgroundColor: isOverAlertThreshold ? '#E53935' : item.color,
							},
						]}
					/>
				</View>

				<View style={styles.budgetFooter}>
					<Text
						style={[
							styles.percentageText,
							isOverAlertThreshold && styles.alertPercentageText,
						]}
					>
						{percent.toFixed(0)}%
					</Text>
					<Text style={styles.periodText}>
						{item.period === 'weekly' ? 'Weekly' : 'Monthly'}
					</Text>
				</View>

				{isOverAlertThreshold && (
					<View style={styles.alertBanner}>
						<Ionicons name="notifications" size={14} color="#E53935" />
						<Text style={styles.alertBannerText}>Budget alert triggered</Text>
					</View>
				)}
			</RectButton>
		);
	};

	// ==========================================
	// Main Render
	// ==========================================
	// Show empty state if no budgets, otherwise show budgets with add button
	const budgetsWithAdd = [
		...budgets,
		{
			id: 'add',
			name: 'Add Budget',
			amount: 0,
			spent: 0,
			icon: 'add-circle-outline',
			color: '#00a2ff',
			period: 'monthly',
		} as Budget,
	];

	return (
		<View style={styles.mainContainer}>
			{isLoading && !hasLoaded ? (
				<View style={styles.loadingContainer}>
					<Text style={styles.loadingText}>Loading budgets...</Text>
				</View>
			) : budgets.length === 0 ? (
				<EmptyState />
			) : (
				<FlatList
					data={budgetsWithAdd}
					keyExtractor={(item) => item.id}
					ListHeaderComponent={TotalBudgetSummary}
					refreshControl={
						<RefreshControl
							refreshing={refreshing}
							onRefresh={handleRefresh}
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

			{/* Add Budget Modal */}
			<RNModal
				isVisible={isModalVisible}
				onBackdropPress={hideModal}
				onBackButtonPress={hideModal}
				style={styles.modal}
				animationIn="slideInUp"
				animationOut="slideOutDown"
				backdropOpacity={0.5}
				backdropColor="#000"
				useNativeDriver
			>
				<View style={styles.modalContent}>
					<View style={styles.modalHeader}>
						<Text style={styles.modalTitle}>Add New Budget</Text>
						<BorderlessButton
							onActiveStateChange={setIsPressed}
							onPress={hideModal}
						>
							<Ionicons name="close" size={24} color="#757575" />
						</BorderlessButton>
					</View>
					<ScrollView
						showsVerticalScrollIndicator={false}
						contentContainerStyle={{
							paddingBottom: 24,
							justifyContent: 'flex-end',
						}}
					>
						<View style={styles.formGroup}>
							<Text style={styles.label}>Budget Name</Text>
							<TextInput
								style={styles.input}
								value={newBudget.name}
								onChangeText={(text) =>
									setNewBudget({ ...newBudget, name: text })
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
											newBudget.amount === amount.toString() &&
												styles.selectedAmountPreset,
										]}
										onPress={() => {
											setNewBudget({
												...newBudget,
												amount: amount.toString(),
											});
											setShowCustomAmount(false);
										}}
									>
										<Text
											style={[
												styles.amountPresetText,
												newBudget.amount === amount.toString() &&
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
												amount: '',
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
									<Text style={styles.inputLabel}>Enter custom amount</Text>
									<TextInput
										style={styles.input}
										value={newBudget.amount}
										onChangeText={(text) =>
											setNewBudget({ ...newBudget, amount: text })
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
						<PeriodPicker />

						<RectButton
							style={[styles.addButton, { backgroundColor: newBudget.color }]}
							onPress={handleAddBudget}
						>
							<Text style={styles.addButtonText}>Add Budget</Text>
						</RectButton>
					</ScrollView>
				</View>
			</RNModal>

			{/* Edit Budget Modal */}
			<RNModal
				isVisible={isEditModalVisible}
				onBackdropPress={hideEditModal}
				onBackButtonPress={hideEditModal}
				animationIn="slideInUp"
				animationOut="slideOutDown"
				backdropOpacity={0.5}
				backdropColor="#000"
				useNativeDriver
				style={styles.modal}
			>
				<KeyboardAvoidingView
					behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
					style={styles.modalContainer}
				>
					<View style={styles.modalContent}>
						<View style={styles.modalHeader}>
							<Text style={styles.modalTitle}>Edit Budget</Text>
							<BorderlessButton
								onActiveStateChange={setIsPressed}
								onPress={hideEditModal}
							>
								<Ionicons name="close" size={24} color="#757575" />
							</BorderlessButton>
						</View>
						<ScrollView
							showsVerticalScrollIndicator={false}
							contentContainerStyle={{
								paddingBottom: 24,
								justifyContent: 'flex-end',
							}}
						>
							<View style={styles.formGroup}>
								<Text style={styles.label}>Budget Name</Text>
								<TextInput
									style={styles.input}
									value={newBudget.name}
									onChangeText={(text) =>
										setNewBudget({ ...newBudget, name: text })
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
												newBudget.amount === amount.toString() &&
													styles.selectedAmountPreset,
											]}
											onPress={() => {
												setNewBudget({
													...newBudget,
													amount: amount.toString(),
												});
												setShowCustomAmount(false);
											}}
										>
											<Text
												style={[
													styles.amountPresetText,
													newBudget.amount === amount.toString() &&
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
													amount: '',
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
										<Text style={styles.inputLabel}>Enter custom amount</Text>
										<TextInput
											style={styles.input}
											value={newBudget.amount}
											onChangeText={(text) =>
												setNewBudget({ ...newBudget, amount: text })
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
							<PeriodPicker />

							<RectButton
								style={[styles.addButton, { backgroundColor: newBudget.color }]}
								onPress={handleEditBudget}
							>
								<Text style={styles.addButtonText}>Update Budget</Text>
							</RectButton>
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
				animationIn="slideInUp"
				animationOut="slideOutDown"
				backdropOpacity={0.5}
				backdropColor="#000"
				useNativeDriver
				style={styles.optionsModal}
			>
				<View style={styles.optionsModalContent}>
					<Text style={styles.optionsTitle}>{selectedBudget?.name}</Text>

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
			<QuickAddBudgetTransaction
				isVisible={showQuickAddModal}
				onClose={handleCloseQuickAddModal}
				budgetId={selectedBudgetForTransaction?.id}
				budgetName={selectedBudgetForTransaction?.name}
				budgetColor={selectedBudgetForTransaction?.color}
				onTransactionAdded={handleTransactionAdded}
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
		paddingHorizontal: 0,
		marginTop: 8,
	},
	card: {
		backgroundColor: '#ffffff',
		borderRadius: 16,
		padding: 16,
		marginVertical: 8,
		marginHorizontal: 24,
		// iOS shadow
		shadowColor: '#000',
		shadowOffset: { width: 0, height: 2 },
		shadowOpacity: 0.05,
		shadowRadius: 8,
		// Android shadow
		elevation: 2,
	},
	alertCard: {
		borderWidth: 2,
		borderColor: '#E53935',
		borderStyle: 'dashed',
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
	alertPercentageText: {
		color: '#E53935',
		fontWeight: '600',
	},
	modal: {
		margin: 0,
		justifyContent: 'flex-end',
	},
	modalOverlay: {
		flex: 1,
	},
	modalAnimationContainer: {
		flex: 1,
	},
	modalContainer: {
		justifyContent: 'flex-end',
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
	optionsButton: {
		padding: 8,
		marginLeft: 4,
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
	periodPickerContainer: {
		marginBottom: 20,
	},
	periodSubtext: {
		fontSize: 12,
		fontWeight: '500',
		color: '#757575',
		marginBottom: 8,
	},
	periodOptionsContainer: {
		flexDirection: 'row',
		gap: 12,
	},
	periodOption: {
		flex: 1,
		padding: 16,
		borderRadius: 12,
		backgroundColor: 'white',
		borderWidth: 1,
		borderColor: '#E0E0E0',
	},
	selectedPeriodOption: {
		borderColor: '#00a2ff',
		backgroundColor: '#00a2ff',
	},
	periodOptionContent: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'center',
		gap: 8,
	},
	periodOptionText: {
		fontSize: 16,
		fontWeight: '600',
		color: '#212121',
	},
	selectedPeriodOptionText: {
		color: '#fff',
		fontWeight: '600',
	},
	budgetFooter: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		alignItems: 'center',
		marginTop: 6,
	},
	periodText: {
		fontSize: 12,
		fontWeight: '500',
		color: '#757575',
	},
	totalBudgetCard: {
		backgroundColor: '#ffffff',
		borderRadius: 16,
		padding: 20,
		marginVertical: 12,
		marginHorizontal: 24,
		// iOS shadow
		shadowColor: '#000',
		shadowOffset: { width: 0, height: 2 },
		shadowOpacity: 0.05,
		shadowRadius: 8,
		// Android shadow
		elevation: 2,
	},
	totalBudgetHeader: {
		flexDirection: 'row',
		alignItems: 'center',
		marginBottom: 12,
	},
	totalBudgetIconWrapper: {
		width: 40,
		height: 40,
		borderRadius: 12,
		justifyContent: 'center',
		alignItems: 'center',
		backgroundColor: '#e0f7fa',
		marginRight: 12,
	},
	totalBudgetTitle: {
		fontSize: 18,
		fontWeight: '600',
		color: '#212121',
	},
	totalBudgetAmounts: {
		flexDirection: 'row',
		alignItems: 'baseline',
		marginBottom: 8,
	},
	totalBudgetSpentText: {
		fontSize: 24,
		fontWeight: '700',
		color: '#212121',
	},
	totalBudgetAllocatedText: {
		marginLeft: 8,
		fontSize: 16,
		color: '#757575',
	},
	totalBudgetProgressBarBackground: {
		width: '100%',
		height: 8,
		backgroundColor: '#e0e0e0',
		borderRadius: 4,
		overflow: 'hidden',
	},
	totalBudgetProgressBarFill: {
		height: '100%',
		borderRadius: 4,
	},
	totalBudgetFooter: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		alignItems: 'center',
		marginTop: 12,
	},
	totalBudgetPercentageText: {
		fontSize: 14,
		fontWeight: '500',
		color: '#757575',
	},
	totalBudgetRemainingText: {
		fontSize: 14,
		fontWeight: '500',
		color: '#757575',
	},
	alertIndicator: {
		width: 24,
		height: 24,
		borderRadius: 12,
		backgroundColor: '#FFF4F4',
		justifyContent: 'center',
		alignItems: 'center',
		marginRight: 8,
	},
	alertBanner: {
		flexDirection: 'row',
		alignItems: 'center',
		backgroundColor: '#FFF4F4',
		borderRadius: 8,
		paddingVertical: 8,
		paddingHorizontal: 12,
		marginTop: 8,
		alignSelf: 'flex-start',
	},
	alertBannerText: {
		fontSize: 12,
		fontWeight: '500',
		color: '#E53935',
		marginLeft: 8,
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
		fontSize: 16,
		color: '#fff',
		fontWeight: '600',
	},
	emptyButtonsContainer: {
		flexDirection: 'row',
		gap: 12,
	},
	emptyRefreshButton: {
		borderRadius: 12,
		paddingVertical: 16,
		paddingHorizontal: 24,
		flexDirection: 'row',
		alignItems: 'center',
		gap: 8,
		borderWidth: 1,
		borderColor: '#00a2ff',
		backgroundColor: 'transparent',
	},
	emptyRefreshButtonText: {
		fontSize: 16,
		color: '#00a2ff',
		fontWeight: '600',
	},
	loadingContainer: {
		flex: 1,
		justifyContent: 'center',
		alignItems: 'center',
	},
	loadingText: {
		fontSize: 16,
		color: '#757575',
		marginTop: 12,
	},
});
