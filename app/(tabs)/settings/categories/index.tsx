import React, { useState, useContext } from 'react';
import {
	SafeAreaView,
	ScrollView,
	View,
	Text,
	TextInput,
	FlatList,
	Alert,
	StyleSheet,
	ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Stack } from 'expo-router';
import { RectButton } from 'react-native-gesture-handler';
import { TransactionContext } from '../../../../src/context/transactionContext';
import { Category } from '../../../../src/data/transactions';

export default function CategorySettingsScreen() {
	const { getCategories, addCategory, deleteCategory, categoriesLoading } =
		useContext(TransactionContext);
	const [newCategory, setNewCategory] = useState('');
	const [type, setType] = useState<'income' | 'expense'>('expense');
	const [isAdding, setIsAdding] = useState(false);

	// Get categories from transaction context
	const allCategories = getCategories();
	const categoriesByType = allCategories.filter((cat) => cat.type === type);

	const handleAddCategory = async () => {
		if (!newCategory.trim()) return;

		const exists = allCategories.find(
			(cat) =>
				cat.name.toLowerCase() === newCategory.toLowerCase() &&
				cat.type === type
		);

		if (exists) {
			Alert.alert('Category already exists');
			return;
		}

		setIsAdding(true);
		try {
			const newCat: Category = {
				name: newCategory.trim(),
				type,
				icon: type === 'income' ? 'plus' : 'minus',
				color: type === 'income' ? '#4CAF50' : '#F44336',
			};

			await addCategory(newCat);
			setNewCategory('');
			Alert.alert('Success', 'Category added successfully!');
		} catch (error) {
			Alert.alert('Error', 'Failed to add category. Please try again.');
		} finally {
			setIsAdding(false);
		}
	};

	const handleDeleteCategory = async (
		categoryId: string,
		categoryName: string
	) => {
		Alert.alert(
			'Delete Category',
			`Are you sure you want to delete "${categoryName}"?`,
			[
				{ text: 'Cancel', style: 'cancel' },
				{
					text: 'Delete',
					style: 'destructive',
					onPress: async () => {
						try {
							await deleteCategory(categoryId);
							Alert.alert('Success', 'Category deleted successfully!');
						} catch (error) {
							Alert.alert(
								'Error',
								'Failed to delete category. Please try again.'
							);
						}
					},
				},
			]
		);
	};

	if (categoriesLoading) {
		return (
			<SafeAreaView style={styles.safe}>
				<Stack.Screen options={{ title: 'Category Settings' }} />
				<View style={styles.loadingContainer}>
					<ActivityIndicator size="large" color="#007AFF" />
					<Text style={styles.loadingText}>Loading categories...</Text>
				</View>
			</SafeAreaView>
		);
	}

	return (
		<SafeAreaView style={styles.safe}>
			<Stack.Screen options={{ title: 'Category Settings' }} />
			<ScrollView contentContainerStyle={styles.container}>
				{/* Add New Category */}
				<Section title="Add New Category">
					<SectionSubtext>
						Create custom categories to better organize your transactions
					</SectionSubtext>

					<Label>Category Type</Label>
					<LabelSubtext>
						Choose whether this category is for income or expenses
					</LabelSubtext>
					<View style={styles.toggleRow}>
						<RectButton
							onPress={() => setType('expense')}
							style={[
								styles.toggleButton,
								type === 'expense' && styles.activeToggle,
							]}
						>
							<Text
								style={[
									styles.toggleText,
									type === 'expense' && styles.activeToggleText,
								]}
							>
								Expense
							</Text>
						</RectButton>
						<RectButton
							onPress={() => setType('income')}
							style={[
								styles.toggleButton,
								type === 'income' && styles.activeToggle,
							]}
						>
							<Text
								style={[
									styles.toggleText,
									type === 'income' && styles.activeToggleText,
								]}
							>
								Income
							</Text>
						</RectButton>
					</View>

					<Label>Category Name</Label>
					<LabelSubtext>
						Enter a descriptive name for your new category
					</LabelSubtext>
					<View style={styles.inputRow}>
						<TextInput
							placeholder="e.g., Groceries, Salary, Entertainment"
							value={newCategory}
							onChangeText={setNewCategory}
							style={styles.input}
							editable={!isAdding}
						/>
						<RectButton
							onPress={handleAddCategory}
							style={[styles.addButton, isAdding && styles.addButtonDisabled]}
							enabled={!isAdding}
						>
							{isAdding ? (
								<ActivityIndicator size="small" color="white" />
							) : (
								<Text style={styles.addButtonText}>Add</Text>
							)}
						</RectButton>
					</View>
				</Section>

				{/* Category List */}
				<Section
					title={`${type.charAt(0).toUpperCase() + type.slice(1)} Categories`}
				>
					<SectionSubtext>
						Manage your existing {type} categories
					</SectionSubtext>

					{categoriesByType.length === 0 ? (
						<View style={styles.emptyState}>
							<Text style={styles.emptyStateText}>
								No {type} categories found. Add some categories to get started!
							</Text>
						</View>
					) : (
						<FlatList
							data={categoriesByType}
							keyExtractor={(item) => item.id || `${item.name}-${item.type}`}
							scrollEnabled={false}
							renderItem={({ item }) => (
								<View style={styles.categoryItem}>
									<View style={styles.categoryInfo}>
										<Ionicons
											name={
												(item.icon as any) ||
												(item.type === 'income' ? 'plus' : 'minus')
											}
											size={18}
											style={[
												styles.categoryIcon,
												{ color: item.color || '#666' },
											]}
										/>
										<Text style={styles.categoryName}>{item.name}</Text>
										{item.isDefault && (
											<Text style={styles.defaultBadge}>Default</Text>
										)}
									</View>
									{!item.isDefault && (
										<RectButton
											onPress={() => handleDeleteCategory(item.id!, item.name)}
											style={styles.deleteButton}
										>
											<Ionicons name="trash" size={16} color="#FF3B30" />
										</RectButton>
									)}
								</View>
							)}
						/>
					)}
				</Section>
			</ScrollView>
		</SafeAreaView>
	);
}

const Section = ({
	title,
	children,
}: {
	title: string;
	children: React.ReactNode;
}) => (
	<View style={{ marginBottom: 32 }}>
		<Text style={styles.sectionHeader}>{title}</Text>
		{children}
	</View>
);

const SectionSubtext = ({ children }: { children: React.ReactNode }) => (
	<Text style={styles.sectionSubtext}>{children}</Text>
);

const Label = ({ children }: { children: React.ReactNode }) => (
	<Text style={styles.label}>{children}</Text>
);

const LabelSubtext = ({ children }: { children: React.ReactNode }) => (
	<Text style={styles.labelSubtext}>{children}</Text>
);

const styles = StyleSheet.create({
	safe: { flex: 1, backgroundColor: '#fff' },
	container: { padding: 24, paddingBottom: 48 },
	loadingContainer: {
		flex: 1,
		justifyContent: 'center',
		alignItems: 'center',
	},
	loadingText: {
		marginTop: 12,
		color: '#666',
		fontSize: 16,
	},
	sectionHeader: { fontSize: 18, fontWeight: '600', marginBottom: 12 },
	sectionSubtext: { fontSize: 12, color: '#666', marginBottom: 12 },
	label: { fontSize: 14, color: '#666', marginTop: 12, marginBottom: 4 },
	labelSubtext: { fontSize: 12, color: '#666', marginBottom: 8 },
	inputRow: {
		flexDirection: 'row',
		marginBottom: 10,
		gap: 10,
	},
	input: {
		flex: 1,
		borderWidth: 1,
		borderColor: '#ddd',
		padding: 10,
		borderRadius: 8,
		fontSize: 16,
	},
	addButton: {
		backgroundColor: '#007AFF',
		padding: 10,
		borderRadius: 8,
		justifyContent: 'center',
		minWidth: 60,
	},
	addButtonDisabled: {
		backgroundColor: '#ccc',
	},
	addButtonText: {
		color: 'white',
		fontWeight: '600',
		textAlign: 'center',
	},
	toggleRow: {
		flexDirection: 'row',
		marginBottom: 20,
		gap: 1,
	},
	toggleButton: {
		flex: 1,
		padding: 12,
		borderWidth: 1,
		borderColor: '#ddd',
		alignItems: 'center',
		backgroundColor: '#f8f8f8',
	},
	activeToggle: {
		backgroundColor: '#007AFF',
		borderColor: '#007AFF',
	},
	toggleText: {
		fontWeight: '500',
		color: '#333',
	},
	activeToggleText: {
		color: 'white',
	},
	categoryItem: {
		flexDirection: 'row',
		alignItems: 'center',
		paddingVertical: 12,
		borderBottomWidth: 1,
		borderBottomColor: '#efefef',
		justifyContent: 'space-between',
	},
	categoryInfo: {
		flexDirection: 'row',
		alignItems: 'center',
		flex: 1,
	},
	categoryIcon: {
		marginRight: 12,
	},
	categoryName: {
		fontSize: 16,
		color: '#333',
		flex: 1,
	},
	defaultBadge: {
		fontSize: 10,
		color: '#666',
		backgroundColor: '#f0f0f0',
		paddingHorizontal: 6,
		paddingVertical: 2,
		borderRadius: 4,
		marginLeft: 8,
	},
	deleteButton: {
		padding: 8,
	},
	emptyState: {
		padding: 20,
		alignItems: 'center',
	},
	emptyStateText: {
		color: '#666',
		fontSize: 14,
		textAlign: 'center',
	},
});
