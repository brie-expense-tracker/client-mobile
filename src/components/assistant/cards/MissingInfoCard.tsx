import React, { useState, useEffect } from 'react';
import {
	View,
	Text,
	StyleSheet,
	TouchableOpacity,
	TextInput,
	Modal,
	FlatList,
	Animated,
	ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import {
	missingInfoService,
	MissingInfoState,
} from '../../../services/feature/missingInfoService';

export interface MissingInfoChip {
	id: string;
	label: string;
	description: string;
	required: boolean;
	priority: 'high' | 'medium' | 'low';
	examples: string[];
	placeholder: string;
	inputType: 'text' | 'number' | 'date' | 'select';
	options?: string[];
	slot?: string; // dotpath for intent system
}

interface MissingInfoCardProps {
	chips: MissingInfoChip[];
	onChipPress: (chip: MissingInfoChip) => void;
	onValueSubmit: (chipId: string, value: string) => void;
	style?: any;
	showProgress?: boolean;
	enableBulkActions?: boolean;
	onBulkSubmit?: (values: Record<string, string>) => void;
	accessibilityLabel?: string;
	accessibilityHint?: string;
}

function MissingInfoCard({
	chips,
	onChipPress,
	onValueSubmit,
	style,
	showProgress = true,
	enableBulkActions = false,
	onBulkSubmit,
	accessibilityLabel,
	accessibilityHint,
}: MissingInfoCardProps) {
	const [selectedChip, setSelectedChip] = useState<MissingInfoChip | null>(
		null
	);
	const [inputValue, setInputValue] = useState('');
	const [modalVisible, setModalVisible] = useState(false);
	const [serviceState, setServiceState] = useState<MissingInfoState>(
		missingInfoService.getState()
	);
	const [bulkMode, setBulkMode] = useState(false);
	const [bulkValues, setBulkValues] = useState<Record<string, string>>({});
	const [fadeAnim] = useState(new Animated.Value(0));
	const [slideAnim] = useState(new Animated.Value(0));

	useEffect(() => {
		// Initialize service with chips
		missingInfoService.setMissingInfoChips(chips);

		// Subscribe to service state changes
		const unsubscribe = missingInfoService.subscribe(setServiceState);

		// Animate in
		Animated.parallel([
			Animated.timing(fadeAnim, {
				toValue: 1,
				duration: 300,
				useNativeDriver: true,
			}),
			Animated.timing(slideAnim, {
				toValue: 1,
				duration: 300,
				useNativeDriver: true,
			}),
		]).start();

		return () => {
			unsubscribe();
		};
	}, [chips, fadeAnim, slideAnim]);

	const handleChipPress = (chip: MissingInfoChip) => {
		setSelectedChip(chip);
		setInputValue('');
		setModalVisible(true);
		onChipPress(chip);
	};

	const handleSubmit = () => {
		if (!selectedChip || !inputValue.trim()) return;

		// Use service for validation and state management
		const result = missingInfoService.submitValue(
			selectedChip.id,
			inputValue.trim()
		);

		if (result.success) {
			onValueSubmit(selectedChip.id, inputValue.trim());
			setModalVisible(false);
			setSelectedChip(null);
			setInputValue('');
		} else {
			// Handle validation error
			console.error('Validation error:', result.error);
		}
	};

	const handleBulkSubmit = () => {
		if (onBulkSubmit) {
			onBulkSubmit(bulkValues);
			setBulkMode(false);
			setBulkValues({});
		}
	};

	const handleBulkValueChange = (chipId: string, value: string) => {
		setBulkValues((prev) => ({
			...prev,
			[chipId]: value,
		}));
	};

	const handleSelectOption = (option: string) => {
		if (!selectedChip) return;
		onValueSubmit(selectedChip.id, option);
		setModalVisible(false);
		setSelectedChip(null);
		setInputValue('');
	};

	const getPriorityColor = (priority: 'high' | 'medium' | 'low') => {
		switch (priority) {
			case 'high':
				return '#ef4444'; // red
			case 'medium':
				return '#f59e0b'; // amber
			case 'low':
				return '#6b7280'; // gray
			default:
				return '#6b7280';
		}
	};

	const getPriorityIcon = (priority: 'high' | 'medium' | 'low') => {
		switch (priority) {
			case 'high':
				return 'alert-circle';
			case 'medium':
				return 'information-circle';
			case 'low':
				return 'help-circle';
			default:
				return 'help-circle';
		}
	};

	const renderProgressBar = () => {
		if (!showProgress) return null;

		const progress = serviceState.completionRate;
		const progressSummary = missingInfoService.getProgressSummary();

		return (
			<View style={styles.progressContainer}>
				<View style={styles.progressHeader}>
					<Text style={styles.progressTitle}>Progress</Text>
					<Text style={styles.progressText}>
						{progressSummary.collected}/{progressSummary.total} completed
					</Text>
				</View>
				<View style={styles.progressBar}>
					<Animated.View
						style={[
							styles.progressFill,
							{
								width: `${progress}%`,
								opacity: fadeAnim,
							},
						]}
					/>
				</View>
				{progressSummary.requiredRemaining > 0 && (
					<Text style={styles.requiredRemaining}>
						{progressSummary.requiredRemaining} required fields remaining
					</Text>
				)}
			</View>
		);
	};

	const renderChip = ({ item }: { item: MissingInfoChip }) => {
		const isCompleted = missingInfoService.isChipCompleted(item.id);
		const currentValue = missingInfoService.getChipValue(item.id);

		return (
			<Animated.View
				style={[
					{
						opacity: fadeAnim,
						transform: [
							{
								translateY: slideAnim.interpolate({
									inputRange: [0, 1],
									outputRange: [20, 0],
								}),
							},
						],
					},
				]}
			>
				<TouchableOpacity
					style={[
						styles.chip,
						{
							borderColor: getPriorityColor(item.priority),
							backgroundColor: isCompleted
								? '#f0fdf4'
								: item.required
								? '#fef2f2'
								: '#f9fafb',
						},
					]}
					onPress={() => handleChipPress(item)}
					accessibilityRole="button"
					accessibilityLabel={`${item.label}${
						item.required ? ', required' : ''
					}${isCompleted ? ', completed' : ''}`}
					accessibilityHint={item.description}
				>
					<View style={styles.chipContent}>
						<View style={styles.chipHeader}>
							<Ionicons
								name={
									isCompleted
										? 'checkmark-circle'
										: getPriorityIcon(item.priority)
								}
								size={16}
								color={
									isCompleted ? '#10b981' : getPriorityColor(item.priority)
								}
							/>
							<Text
								style={[
									styles.chipLabel,
									{
										color: isCompleted
											? '#10b981'
											: getPriorityColor(item.priority),
										textDecorationLine: isCompleted ? 'line-through' : 'none',
									},
								]}
							>
								{item.label}
							</Text>
							{item.required && <Text style={styles.requiredText}>*</Text>}
							{isCompleted && (
								<Ionicons name="checkmark" size={14} color="#10b981" />
							)}
						</View>
						<Text style={styles.chipDescription}>{item.description}</Text>
						{isCompleted && currentValue ? (
							<Text style={styles.chipValue}>Value: {currentValue}</Text>
						) : (
							<Text style={styles.chipPlaceholder}>{item.placeholder}</Text>
						)}
					</View>
				</TouchableOpacity>
			</Animated.View>
		);
	};

	const renderInputModal = () => {
		if (!selectedChip) return null;

		return (
			<Modal
				visible={modalVisible}
				animationType="slide"
				transparent={true}
				onRequestClose={() => setModalVisible(false)}
			>
				<View style={styles.modalOverlay}>
					<View style={styles.modalContent}>
						<View style={styles.modalHeader}>
							<Text style={styles.modalTitle}>{selectedChip.label}</Text>
							<TouchableOpacity
								onPress={() => setModalVisible(false)}
								style={styles.closeButton}
							>
								<Ionicons name="close" size={24} color="#6b7280" />
							</TouchableOpacity>
						</View>

						<Text style={styles.modalDescription}>
							{selectedChip.description}
						</Text>

						{selectedChip.inputType === 'select' && selectedChip.options ? (
							<FlatList
								data={selectedChip.options}
								keyExtractor={(item) => item}
								renderItem={({ item }) => (
									<TouchableOpacity
										style={styles.optionItem}
										onPress={() => handleSelectOption(item)}
									>
										<Text style={styles.optionText}>{item}</Text>
										<Ionicons
											name="chevron-forward"
											size={20}
											color="#6b7280"
										/>
									</TouchableOpacity>
								)}
								style={styles.optionsList}
							/>
						) : (
							<View style={styles.inputContainer}>
								<TextInput
									style={styles.textInput}
									value={inputValue}
									onChangeText={setInputValue}
									placeholder={selectedChip.placeholder}
									placeholderTextColor="#9ca3af"
									keyboardType={
										selectedChip.inputType === 'number' ? 'numeric' : 'default'
									}
									autoFocus={true}
								/>
								<TouchableOpacity
									style={[
										styles.submitButton,
										!inputValue.trim() && styles.submitButtonDisabled,
									]}
									onPress={handleSubmit}
									disabled={!inputValue.trim()}
								>
									<Text style={styles.submitButtonText}>Submit</Text>
								</TouchableOpacity>
							</View>
						)}

						{selectedChip.examples.length > 0 && (
							<View style={styles.examplesContainer}>
								<Text style={styles.examplesTitle}>Examples:</Text>
								<Text style={styles.examplesText}>
									{selectedChip.examples.join(', ')}
								</Text>
							</View>
						)}
					</View>
				</View>
			</Modal>
		);
	};

	const renderBulkActions = () => {
		if (!enableBulkActions) return null;

		return (
			<View style={styles.bulkActionsContainer}>
				<TouchableOpacity
					style={[styles.bulkButton, bulkMode && styles.bulkButtonActive]}
					onPress={() => setBulkMode(!bulkMode)}
					accessibilityRole="button"
					accessibilityLabel={bulkMode ? 'Exit bulk mode' : 'Enter bulk mode'}
				>
					<Ionicons
						name={bulkMode ? 'close' : 'list'}
						size={16}
						color={bulkMode ? '#ef4444' : '#3b82f6'}
					/>
					<Text
						style={[
							styles.bulkButtonText,
							bulkMode && styles.bulkButtonTextActive,
						]}
					>
						{bulkMode ? 'Exit Bulk' : 'Bulk Edit'}
					</Text>
				</TouchableOpacity>

				{bulkMode && (
					<TouchableOpacity
						style={styles.bulkSubmitButton}
						onPress={handleBulkSubmit}
						disabled={Object.keys(bulkValues).length === 0}
						accessibilityRole="button"
						accessibilityLabel="Submit all bulk changes"
					>
						<Text style={styles.bulkSubmitText}>Submit All</Text>
					</TouchableOpacity>
				)}
			</View>
		);
	};

	const renderBulkInputs = () => {
		if (!bulkMode) return null;

		return (
			<View style={styles.bulkInputsContainer}>
				<Text style={styles.bulkInputsTitle}>Bulk Edit Mode</Text>
				{chips.map((chip) => (
					<View key={chip.id} style={styles.bulkInputItem}>
						<Text style={styles.bulkInputLabel}>{chip.label}</Text>
						<TextInput
							style={styles.bulkInput}
							value={bulkValues[chip.id] || ''}
							onChangeText={(value) => handleBulkValueChange(chip.id, value)}
							placeholder={chip.placeholder}
							placeholderTextColor="#9ca3af"
							keyboardType={chip.inputType === 'number' ? 'numeric' : 'default'}
						/>
					</View>
				))}
			</View>
		);
	};

	return (
		<Animated.View
			style={[
				styles.container,
				style,
				{
					opacity: fadeAnim,
					transform: [
						{
							translateY: slideAnim.interpolate({
								inputRange: [0, 1],
								outputRange: [20, 0],
							}),
						},
					],
				},
			]}
			accessibilityRole="none"
			accessibilityLabel={
				accessibilityLabel || 'Missing information collection form'
			}
			accessibilityHint={
				accessibilityHint || 'Fill in the required information to continue'
			}
		>
			<View style={styles.header}>
				<Ionicons name="information-circle" size={20} color="#3b82f6" />
				<Text style={styles.headerTitle}>Missing Information</Text>
				{missingInfoService.isComplete() && (
					<Ionicons name="checkmark-circle" size={20} color="#10b981" />
				)}
			</View>
			<Text style={styles.headerDescription}>
				I need some information to help you better. Please provide the
				following:
			</Text>

			{renderProgressBar()}
			{renderBulkActions()}
			{renderBulkInputs()}

			<ScrollView
				showsVerticalScrollIndicator={false}
				style={styles.chipsList}
				accessibilityLabel="List of information fields to complete"
			>
				{chips.map((chip, index) => (
					<View key={chip.id}>{renderChip({ item: chip })}</View>
				))}
			</ScrollView>

			{renderInputModal()}
		</Animated.View>
	);
}

const styles = StyleSheet.create({
	container: {
		backgroundColor: '#ffffff',
		borderRadius: 12,
		padding: 16,
		marginVertical: 8,
		borderWidth: 1,
		borderColor: '#e5e7eb',
		shadowColor: '#000',
		shadowOffset: {
			width: 0,
			height: 2,
		},
		shadowOpacity: 0.1,
		shadowRadius: 3.84,
		elevation: 5,
	},
	header: {
		flexDirection: 'row',
		alignItems: 'center',
		marginBottom: 8,
	},
	headerTitle: {
		fontSize: 16,
		fontWeight: '600',
		color: '#111827',
		marginLeft: 8,
	},
	headerDescription: {
		fontSize: 14,
		color: '#6b7280',
		marginBottom: 16,
		lineHeight: 20,
	},
	chipsList: {
		maxHeight: 200,
	},
	chip: {
		borderWidth: 1,
		borderRadius: 8,
		padding: 12,
		marginBottom: 8,
	},
	chipContent: {
		flex: 1,
	},
	chipHeader: {
		flexDirection: 'row',
		alignItems: 'center',
		marginBottom: 4,
	},
	chipLabel: {
		fontSize: 14,
		fontWeight: '600',
		marginLeft: 6,
		flex: 1,
	},
	requiredText: {
		color: '#ef4444',
		fontSize: 16,
		fontWeight: 'bold',
	},
	chipDescription: {
		fontSize: 12,
		color: '#6b7280',
		marginBottom: 4,
	},
	chipPlaceholder: {
		fontSize: 12,
		color: '#9ca3af',
		fontStyle: 'italic',
	},
	modalOverlay: {
		flex: 1,
		backgroundColor: 'rgba(0, 0, 0, 0.5)',
		justifyContent: 'center',
		alignItems: 'center',
		padding: 20,
	},
	modalContent: {
		backgroundColor: '#ffffff',
		borderRadius: 12,
		padding: 20,
		width: '100%',
		maxHeight: '80%',
	},
	modalHeader: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		alignItems: 'center',
		marginBottom: 12,
	},
	modalTitle: {
		fontSize: 18,
		fontWeight: '600',
		color: '#111827',
		flex: 1,
	},
	closeButton: {
		padding: 4,
	},
	modalDescription: {
		fontSize: 14,
		color: '#6b7280',
		marginBottom: 20,
		lineHeight: 20,
	},
	inputContainer: {
		marginBottom: 20,
	},
	textInput: {
		borderWidth: 1,
		borderColor: '#d1d5db',
		borderRadius: 8,
		padding: 12,
		fontSize: 16,
		marginBottom: 12,
		backgroundColor: '#f9fafb',
	},
	submitButton: {
		backgroundColor: '#3b82f6',
		borderRadius: 8,
		padding: 12,
		alignItems: 'center',
	},
	submitButtonDisabled: {
		backgroundColor: '#e5e7eb',
	},
	submitButtonText: {
		color: '#ffffff',
		fontSize: 16,
		fontWeight: '600',
	},
	optionsList: {
		maxHeight: 200,
		marginBottom: 20,
	},
	optionItem: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		alignItems: 'center',
		padding: 12,
		borderBottomWidth: 1,
		borderBottomColor: '#e5e7eb',
	},
	optionText: {
		fontSize: 16,
		color: '#111827',
	},
	examplesContainer: {
		backgroundColor: '#f9fafb',
		borderRadius: 8,
		padding: 12,
	},
	examplesTitle: {
		fontSize: 12,
		fontWeight: '600',
		color: '#6b7280',
		marginBottom: 4,
	},
	examplesText: {
		fontSize: 12,
		color: '#6b7280',
		lineHeight: 16,
	},
	// Progress bar styles
	progressContainer: {
		marginBottom: 16,
		padding: 12,
		backgroundColor: '#f8fafc',
		borderRadius: 8,
		borderWidth: 1,
		borderColor: '#e2e8f0',
	},
	progressHeader: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		alignItems: 'center',
		marginBottom: 8,
	},
	progressTitle: {
		fontSize: 14,
		fontWeight: '600',
		color: '#374151',
	},
	progressText: {
		fontSize: 12,
		color: '#6b7280',
	},
	progressBar: {
		height: 6,
		backgroundColor: '#e2e8f0',
		borderRadius: 3,
		overflow: 'hidden',
	},
	progressFill: {
		height: '100%',
		backgroundColor: '#3b82f6',
		borderRadius: 3,
	},
	requiredRemaining: {
		fontSize: 11,
		color: '#ef4444',
		marginTop: 4,
		fontWeight: '500',
	},
	// Chip value styles
	chipValue: {
		fontSize: 12,
		color: '#10b981',
		fontWeight: '500',
		fontStyle: 'italic',
	},
	// Bulk actions styles
	bulkActionsContainer: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		alignItems: 'center',
		marginBottom: 16,
		paddingHorizontal: 4,
	},
	bulkButton: {
		flexDirection: 'row',
		alignItems: 'center',
		paddingVertical: 8,
		paddingHorizontal: 12,
		borderRadius: 6,
		borderWidth: 1,
		borderColor: '#d1d5db',
		backgroundColor: '#ffffff',
	},
	bulkButtonActive: {
		borderColor: '#ef4444',
		backgroundColor: '#fef2f2',
	},
	bulkButtonText: {
		fontSize: 12,
		fontWeight: '500',
		color: '#3b82f6',
		marginLeft: 4,
	},
	bulkButtonTextActive: {
		color: '#ef4444',
	},
	bulkSubmitButton: {
		paddingVertical: 8,
		paddingHorizontal: 16,
		borderRadius: 6,
		backgroundColor: '#3b82f6',
	},
	bulkSubmitText: {
		fontSize: 12,
		fontWeight: '600',
		color: '#ffffff',
	},
	// Bulk inputs styles
	bulkInputsContainer: {
		backgroundColor: '#f8fafc',
		borderRadius: 8,
		padding: 16,
		marginBottom: 16,
		borderWidth: 1,
		borderColor: '#e2e8f0',
	},
	bulkInputsTitle: {
		fontSize: 14,
		fontWeight: '600',
		color: '#374151',
		marginBottom: 12,
	},
	bulkInputItem: {
		marginBottom: 12,
	},
	bulkInputLabel: {
		fontSize: 12,
		fontWeight: '500',
		color: '#6b7280',
		marginBottom: 4,
	},
	bulkInput: {
		borderWidth: 1,
		borderColor: '#d1d5db',
		borderRadius: 6,
		padding: 8,
		fontSize: 14,
		backgroundColor: '#ffffff',
	},
});

export default MissingInfoCard;
