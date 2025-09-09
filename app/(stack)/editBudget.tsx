import React, { useState, useEffect } from 'react';
import {
	View,
	Text,
	StyleSheet,
	TouchableOpacity,
	TextInput,
	ScrollView,
	Alert,
	ActivityIndicator,
	SafeAreaView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useBudgets } from '../../src/hooks/useBudgets';
import { Budget } from '../../src/context/budgetContext';

// Popular budget icons
const budgetIcons: (keyof typeof Ionicons.glyphMap)[] = [
	'restaurant-outline',
	'fast-food-outline',
	'wine-outline',
	'cafe-outline',
	'pizza-outline',
	'cart-outline',
	'bag-outline',
	'card-outline',
	'wallet-outline',
	'storefront-outline',
	'car-outline',
	'airplane-outline',
	'train-outline',
	'bus-outline',
	'bicycle-outline',
	'boat-outline',
	'home-outline',
	'flash-outline',
	'water-outline',
	'thermometer-outline',
	'construct-outline',
	'hammer-outline',
	'game-controller-outline',
	'musical-notes-outline',
	'film-outline',
	'ticket-outline',
	'bowling-ball-outline',
	'golf-outline',
	'tennisball-outline',
	'fitness-outline',
	'medical-outline',
	'heart-outline',
	'medkit-outline',
	'bandage-outline',
	'school-outline',
	'book-outline',
	'library-outline',
	'briefcase-outline',
	'laptop-outline',
	'desktop-outline',
	'cut-outline',
	'color-palette-outline',
	'body-outline',
	'eyedrop-outline',
	'rose-outline',
	'call-outline',
	'phone-portrait-outline',
	'wifi-outline',
	'cellular-outline',
	'cloud-outline',
	'globe-outline',
	'gift-outline',
	'star-outline',
	'balloon-outline',
	'paw-outline',
	'fish-outline',
	'leaf-outline',
	'football-outline',
	'basketball-outline',
	'baseball-outline',
	'snow-outline',
	'compass-outline',
	'map-outline',
	'location-outline',
	'camera-outline',
	'bed-outline',
	'umbrella-outline',
	'calculator-outline',
	'pie-chart-outline',
	'trending-up-outline',
	'shield-checkmark-outline',
	'key-outline',
	'lock-open-outline',
	'calendar-outline',
	'time-outline',
	'notifications-outline',
	'settings-outline',
];

// Quick amount presets
const amountPresets = [200, 500, 1000, 2000, 5000];

const COLOR_PALETTE = {
	red: { base: '#E53935', pastel: '#EF5350', dark: '#B71C1C' },
	orange: { base: '#FB8C00', pastel: '#FFB74D', dark: '#E65100' },
	yellow: { base: '#FDD835', pastel: '#FFEE58', dark: '#FBC02D' },
	green: { base: '#43A047', pastel: '#A5D6A7', dark: '#1B5E20' },
	blue: { base: '#1E88E5', pastel: '#42A5F5', dark: '#0D47A1' },
	indigo: { base: '#5E35B1', pastel: '#5C6BC0', dark: '#311B92' },
	violet: { base: '#8E24AA', pastel: '#AB47BC', dark: '#4A0072' },
	grey: { base: '#424242', pastel: '#757575', dark: '#212121' },
};

const EditBudgetScreen: React.FC = () => {
	const params = useLocalSearchParams();
	const budgetId = params.id as string;

	const [name, setName] = useState('');
	const [amount, setAmount] = useState('');
	const [icon, setIcon] =
		useState<keyof typeof Ionicons.glyphMap>('cart-outline');
	const [color, setColor] = useState(COLOR_PALETTE.blue.base);
	const [period, setPeriod] = useState<'weekly' | 'monthly'>('monthly');
	const [showIconPicker, setShowIconPicker] = useState(false);
	const [showColorPicker, setShowColorPicker] = useState(false);
	const [showCustomAmount, setShowCustomAmount] = useState(false);
	const [loading, setLoading] = useState(false);
	const [budget, setBudget] = useState<Budget | null>(null);

	const { budgets, updateBudget, deleteBudget } = useBudgets();

	// Load budget data when component mounts
	useEffect(() => {
		if (budgetId && budgets.length > 0) {
			const foundBudget = budgets.find((b) => b.id === budgetId);
			if (foundBudget) {
				setBudget(foundBudget);
				setName(foundBudget.name || '');
				setAmount(foundBudget.amount?.toString() || '');
				setIcon(foundBudget.icon as keyof typeof Ionicons.glyphMap);
				setColor(foundBudget.color || COLOR_PALETTE.blue.base);
				setPeriod(foundBudget.period || 'monthly');
			}
		}
	}, [budgetId, budgets]);

	const handleSave = async () => {
		if (!name.trim() || !amount.trim()) {
			Alert.alert('Error', 'Please fill in all required fields');
			return;
		}

		if (!budget) return;

		setLoading(true);
		try {
			await updateBudget(budget.id, {
				name: name.trim(),
				amount: parseFloat(amount),
				icon,
				color,
				categories: budget.categories || [],
				period,
				weekStartDay: budget.weekStartDay || 1,
				monthStartDay: budget.monthStartDay || 1,
				rollover: budget.rollover || false,
			});

			Alert.alert('Success', 'Budget updated successfully!', [
				{ text: 'OK', onPress: () => router.back() },
			]);
		} catch (error) {
			console.error('[EditBudgetScreen] Error updating:', error);
			Alert.alert('Error', 'Failed to update budget. Please try again.');
		} finally {
			setLoading(false);
		}
	};

	const handleDelete = () => {
		if (!budget) return;

		Alert.alert(
			'Delete Budget',
			'Are you sure you want to delete this budget? This action cannot be undone.',
			[
				{ text: 'Cancel', style: 'cancel' },
				{
					text: 'Delete',
					style: 'destructive',
					onPress: async () => {
						try {
							await deleteBudget(budget.id);
							router.back();
						} catch (error) {
							console.error('[EditBudgetScreen] Error deleting:', error);
							Alert.alert(
								'Error',
								'Failed to delete budget. Please try again.'
							);
						}
					},
				},
			]
		);
	};

	if (!budget) {
		return (
			<SafeAreaView style={styles.container}>
				<View style={styles.header}>
					<TouchableOpacity
						style={styles.backButton}
						onPress={() => router.back()}
					>
						<Ionicons name="chevron-back" size={24} color="#007ACC" />
					</TouchableOpacity>
					<Text style={styles.screenTitle}>Edit Budget</Text>
					<View style={styles.placeholderButton} />
				</View>
				<View style={styles.loadingContainer}>
					<ActivityIndicator size="large" color="#007ACC" />
					<Text style={styles.loadingText}>Loading budget...</Text>
				</View>
			</SafeAreaView>
		);
	}

	return (
		<SafeAreaView style={styles.container}>
			{/* Custom Header */}
			<View style={styles.header}>
				<TouchableOpacity
					style={styles.backButton}
					onPress={() => router.back()}
				>
					<Ionicons name="chevron-back" size={24} color="#007ACC" />
				</TouchableOpacity>
				<Text style={styles.screenTitle}>Edit Budget</Text>
				<TouchableOpacity
					onPress={handleSave}
					style={[styles.saveButton, loading && styles.saveButtonDisabled]}
					disabled={loading}
				>
					{loading ? (
						<ActivityIndicator size="small" color="#fff" />
					) : (
						<Text style={styles.saveButtonText}>Save</Text>
					)}
				</TouchableOpacity>
			</View>

			<ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
				<View style={styles.formContainer}>
					{/* Budget Name */}
					<View style={styles.inputGroup}>
						<Text style={styles.label}>Budget Name</Text>
						<TextInput
							style={styles.textInput}
							value={name}
							onChangeText={setName}
							placeholder="e.g., Groceries, Entertainment"
							placeholderTextColor="#999"
						/>
					</View>

					{/* Amount */}
					<View style={styles.inputGroup}>
						<Text style={styles.label}>Budget Amount</Text>
						<Text style={styles.subtext}>
							Set your spending limit for this category
						</Text>

						{/* Quick Amount Presets */}
						<View style={styles.presetsContainer}>
							{amountPresets.map((amountValue) => (
								<TouchableOpacity
									key={amountValue}
									style={[
										styles.preset,
										amount === amountValue.toString() && styles.selectedPreset,
									]}
									onPress={() => {
										setAmount(amountValue.toString());
										setShowCustomAmount(false);
									}}
								>
									<Text
										style={[
											styles.presetText,
											amount === amountValue.toString() &&
												styles.selectedPresetText,
										]}
									>
										${amountValue}
									</Text>
								</TouchableOpacity>
							))}
							<TouchableOpacity
								style={[
									styles.preset,
									showCustomAmount && styles.selectedPreset,
								]}
								onPress={() => {
									setShowCustomAmount(!showCustomAmount);
									if (!showCustomAmount) setAmount('');
								}}
							>
								<Text
									style={[
										styles.presetText,
										showCustomAmount && styles.selectedPresetText,
									]}
								>
									Custom
								</Text>
							</TouchableOpacity>
						</View>

						{/* Custom Amount Input */}
						{showCustomAmount && (
							<View style={styles.customInputContainer}>
								<Text style={styles.inputLabel}>Enter custom amount</Text>
								<TextInput
									style={styles.textInput}
									value={amount}
									onChangeText={setAmount}
									placeholder="e.g., 1500"
									keyboardType="numeric"
									placeholderTextColor="#999"
								/>
							</View>
						)}
					</View>

					{/* Period Selection */}
					<View style={styles.inputGroup}>
						<Text style={styles.label}>Budget Period</Text>
						<Text style={styles.subtext}>
							Choose how often this budget resets
						</Text>

						<View style={styles.periodContainer}>
							<TouchableOpacity
								style={[
									styles.periodOption,
									period === 'monthly' && styles.selectedPeriodOption,
								]}
								onPress={() => setPeriod('monthly')}
							>
								<View style={styles.periodOptionContent}>
									<Ionicons
										name="calendar-outline"
										size={20}
										color={period === 'monthly' ? '#fff' : '#007ACC'}
									/>
									<Text
										style={[
											styles.periodOptionText,
											period === 'monthly' && styles.selectedPeriodOptionText,
										]}
									>
										Monthly
									</Text>
								</View>
							</TouchableOpacity>

							<TouchableOpacity
								style={[
									styles.periodOption,
									period === 'weekly' && styles.selectedPeriodOption,
								]}
								onPress={() => setPeriod('weekly')}
							>
								<View style={styles.periodOptionContent}>
									<Ionicons
										name="time-outline"
										size={20}
										color={period === 'weekly' ? '#fff' : '#007ACC'}
									/>
									<Text
										style={[
											styles.periodOptionText,
											period === 'weekly' && styles.selectedPeriodOptionText,
										]}
									>
										Weekly
									</Text>
								</View>
							</TouchableOpacity>
						</View>
					</View>

					{/* Icon Selection */}
					<View style={styles.inputGroup}>
						<Text style={styles.label}>Choose Icon</Text>
						<TouchableOpacity
							style={styles.iconButton}
							onPress={() => setShowIconPicker(!showIconPicker)}
						>
							<View style={styles.iconButtonContent}>
								<View
									style={[
										styles.iconPreview,
										{ backgroundColor: color + '20' },
									]}
								>
									<Ionicons name={icon} size={20} color={color} />
								</View>
								<Text style={styles.iconButtonText}>Choose Icon</Text>
								<Ionicons
									name={showIconPicker ? 'chevron-up' : 'chevron-down'}
									size={20}
									color="#757575"
								/>
							</View>
						</TouchableOpacity>

						{showIconPicker && (
							<View style={styles.iconGrid}>
								{budgetIcons.map((iconName) => (
									<TouchableOpacity
										key={iconName}
										style={[
											styles.iconOption,
											icon === iconName && { backgroundColor: color },
										]}
										onPress={() => {
											setIcon(iconName);
											setShowIconPicker(false);
										}}
									>
										<Ionicons
											name={iconName}
											size={24}
											color={icon === iconName ? 'white' : color}
										/>
									</TouchableOpacity>
								))}
							</View>
						)}
					</View>

					{/* Color Selection */}
					<View style={styles.inputGroup}>
						<Text style={styles.label}>Choose Color</Text>
						<TouchableOpacity
							style={styles.colorButton}
							onPress={() => setShowColorPicker(!showColorPicker)}
						>
							<View style={styles.colorButtonContent}>
								<View
									style={[styles.colorPreview, { backgroundColor: color }]}
								/>
								<Text style={styles.colorButtonText}>Choose Color</Text>
								<Ionicons
									name={showColorPicker ? 'chevron-up' : 'chevron-down'}
									size={20}
									color="#757575"
								/>
							</View>
						</TouchableOpacity>

						{showColorPicker && (
							<View style={styles.colorGrid}>
								{Object.entries(COLOR_PALETTE).map(([name, colors]) => (
									<View key={name} style={styles.colorColumn}>
										<TouchableOpacity
											style={styles.colorOptionContainer}
											onPress={() => {
												setColor(colors.base);
												setShowColorPicker(false);
											}}
										>
											<View
												style={[
													styles.colorSquare,
													{ backgroundColor: colors.base },
												]}
											>
												{color === colors.base && (
													<View style={styles.selectedIndicator}>
														<Ionicons name="checkmark" size={20} color="#FFF" />
													</View>
												)}
											</View>
										</TouchableOpacity>
										<TouchableOpacity
											style={styles.colorOptionContainer}
											onPress={() => {
												setColor(colors.pastel);
												setShowColorPicker(false);
											}}
										>
											<View
												style={[
													styles.colorSquare,
													{ backgroundColor: colors.pastel },
												]}
											>
												{color === colors.pastel && (
													<View style={styles.selectedIndicator}>
														<Ionicons name="checkmark" size={20} color="#000" />
													</View>
												)}
											</View>
										</TouchableOpacity>
										<TouchableOpacity
											style={styles.colorOptionContainer}
											onPress={() => {
												setColor(colors.dark);
												setShowColorPicker(false);
											}}
										>
											<View
												style={[
													styles.colorSquare,
													{ backgroundColor: colors.dark },
												]}
											>
												{color === colors.dark && (
													<View style={styles.selectedIndicator}>
														<Ionicons name="checkmark" size={20} color="#FFF" />
													</View>
												)}
											</View>
										</TouchableOpacity>
									</View>
								))}
							</View>
						)}
					</View>

					{/* Delete Button */}
					<TouchableOpacity style={styles.deleteButton} onPress={handleDelete}>
						<Ionicons name="trash-outline" size={20} color="#E53935" />
						<Text style={styles.deleteButtonText}>Delete Budget</Text>
					</TouchableOpacity>
				</View>
			</ScrollView>
		</SafeAreaView>
	);
};

const styles = StyleSheet.create({
	container: {
		flex: 1,
		backgroundColor: '#ffffff',
		paddingTop: 0,
	},
	header: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
		paddingHorizontal: 16,
		paddingVertical: 12,
		borderBottomWidth: 1,
		borderBottomColor: '#e5e7eb',
		backgroundColor: '#ffffff',
	},
	backButton: {
		flexDirection: 'row',
		alignItems: 'center',
	},
	screenTitle: {
		fontSize: 20,
		fontWeight: 'bold',
		color: '#0a0a0a',
		flex: 1,
		textAlign: 'center',
	},
	placeholderButton: {
		width: 60,
	},
	saveButton: {
		backgroundColor: '#18181b',
		paddingHorizontal: 16,
		paddingVertical: 8,
		borderRadius: 16,
	},
	saveButtonDisabled: {
		backgroundColor: '#a1a1aa',
	},
	saveButtonText: {
		color: '#ffffff',
		fontSize: 14,
		fontWeight: '600',
	},
	content: {
		flex: 1,
	},
	formContainer: {
		padding: 16,
	},
	inputGroup: {
		marginBottom: 24,
	},
	label: {
		fontSize: 17,
		fontWeight: '700',
		color: '#0a0a0a',
		marginBottom: 8,
	},
	subtext: {
		fontSize: 12,
		fontWeight: '500',
		color: '#757575',
		marginBottom: 8,
	},
	textInput: {
		borderWidth: 1,
		borderColor: '#e5e7eb',
		borderRadius: 8,
		paddingHorizontal: 12,
		paddingVertical: 12,
		fontSize: 16,
		color: '#0a0a0a',
		backgroundColor: '#ffffff',
	},
	presetsContainer: {
		flexDirection: 'row',
		flexWrap: 'wrap',
		gap: 8,
		marginBottom: 12,
	},
	preset: {
		padding: 12,
		borderRadius: 8,
		backgroundColor: 'white',
		borderWidth: 1,
		borderColor: '#E0E0E0',
	},
	selectedPreset: {
		borderColor: '#00a2ff',
		backgroundColor: '#f0f9ff',
	},
	presetText: {
		fontSize: 16,
		fontWeight: '600',
		color: '#212121',
	},
	selectedPresetText: {
		color: '#00a2ff',
		fontWeight: '600',
	},
	customInputContainer: {
		marginTop: 10,
	},
	inputLabel: {
		fontSize: 14,
		fontWeight: '500',
		color: '#757575',
		marginBottom: 8,
	},
	periodContainer: {
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
		borderColor: '#007ACC',
		backgroundColor: '#007ACC',
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
	iconButton: {
		backgroundColor: '#F5F5F5',
		borderRadius: 12,
		padding: 16,
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
	colorButton: {
		backgroundColor: '#F5F5F5',
		borderRadius: 12,
		padding: 16,
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
	deleteButton: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'center',
		backgroundColor: '#ffffff',
		borderColor: '#E53935',
		borderWidth: 1,
		borderRadius: 12,
		padding: 16,
		marginTop: 24,
		gap: 8,
	},
	deleteButtonText: {
		color: '#E53935',
		fontSize: 16,
		fontWeight: '600',
	},
	loadingContainer: {
		flex: 1,
		justifyContent: 'center',
		alignItems: 'center',
	},
	loadingText: {
		marginTop: 16,
		fontSize: 16,
		color: '#666',
	},
});

export default EditBudgetScreen;
