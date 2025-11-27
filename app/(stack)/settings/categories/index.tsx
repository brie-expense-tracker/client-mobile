import React, { useState, useEffect } from 'react';
import {
	View,
	Text,
	StyleSheet,
	ScrollView,
	TextInput,
	TouchableOpacity,
	Alert,
	Keyboard,
} from 'react-native';
import {
	SafeAreaView,
	useSafeAreaInsets,
} from 'react-native-safe-area-context';
import { Stack, router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { BorderlessButton } from 'react-native-gesture-handler';
import { useBudget } from '../../../../src/context/budgetContext';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { palette, radius, space, type } from '../../../../src/ui/theme';

const STORAGE_KEY = '@brie:available_categories';

export default function CategoriesScreen() {
	const insets = useSafeAreaInsets();
	const { getAllCategories } = useBudget();
	const [newCategory, setNewCategory] = useState('');
	const [storedCategories, setStoredCategories] = useState<string[]>([]);
	const [loading, setLoading] = useState(true);

	// Get categories from budgets
	const budgetCategories = getAllCategories();

	// Load stored categories from AsyncStorage
	useEffect(() => {
		const loadStoredCategories = async () => {
			try {
				const stored = await AsyncStorage.getItem(STORAGE_KEY);
				if (stored) {
					const parsed = JSON.parse(stored);
					setStoredCategories(Array.isArray(parsed) ? parsed : []);
				}
			} catch (error) {
				console.error('Error loading stored categories:', error);
			} finally {
				setLoading(false);
			}
		};

		loadStoredCategories();
	}, []);

	// Combine budget categories and stored categories, remove duplicates
	const allCategories = Array.from(
		new Set([...budgetCategories, ...storedCategories])
	).sort();

	const handleAddCategory = async () => {
		const trimmed = newCategory.trim();
		if (!trimmed) {
			Alert.alert('Error', 'Please enter a category name');
			return;
		}

		// Check if category already exists (case-insensitive)
		const categoryExists = allCategories.some(
			(cat) => cat.toLowerCase() === trimmed.toLowerCase()
		);

		if (categoryExists) {
			Alert.alert('Category exists', 'This category already exists.');
			setNewCategory('');
			return;
		}

		try {
			const updated = [...storedCategories, trimmed];
			setStoredCategories(updated);
			await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
			setNewCategory('');
			Keyboard.dismiss();
		} catch (error) {
			console.error('Error saving category:', error);
			Alert.alert('Error', 'Failed to save category. Please try again.');
		}
	};

	const handleDeleteCategory = async (category: string) => {
		// Only allow deleting stored categories (not ones from budgets)
		if (budgetCategories.includes(category)) {
			Alert.alert(
				'Cannot delete',
				'This category is currently used in a budget. Remove it from all budgets first.'
			);
			return;
		}

		Alert.alert(
			'Delete Category',
			`Are you sure you want to delete "${category}"?`,
			[
				{ text: 'Cancel', style: 'cancel' },
				{
					text: 'Delete',
					style: 'destructive',
					onPress: async () => {
						try {
							const updated = storedCategories.filter((c) => c !== category);
							setStoredCategories(updated);
							await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
						} catch (error) {
							console.error('Error deleting category:', error);
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

	if (loading) {
		return (
			<SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
				<Stack.Screen
					options={{
						title: 'Categories',
						headerShown: true,
						headerBackButtonDisplayMode: 'minimal',
						headerShadowVisible: false,
						headerStyle: { backgroundColor: palette.bg },
						headerTitleStyle: {
							fontSize: 20,
							fontWeight: '600',
							color: palette.text,
						},
						headerLeft: () => (
							<BorderlessButton
								onPress={() => router.back()}
								style={{ width: 50 }}
							>
								<Ionicons name="chevron-back" size={24} color={palette.text} />
							</BorderlessButton>
						),
					}}
				/>
				<View style={styles.loadingContainer}>
					<Text style={[type.body, { color: palette.textSubtle }]}>
						Loading...
					</Text>
				</View>
			</SafeAreaView>
		);
	}

	return (
		<SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
			<Stack.Screen
				options={{
					title: 'Categories',
					headerShown: true,
					headerBackButtonDisplayMode: 'minimal',
					headerShadowVisible: false,
					headerStyle: { backgroundColor: palette.bg },
					headerTitleStyle: {
						fontSize: 20,
						fontWeight: '600',
						color: palette.text,
					},
					headerLeft: () => (
						<BorderlessButton
							onPress={() => router.back()}
							style={{ width: 50 }}
						>
							<Ionicons name="chevron-back" size={24} color={palette.text} />
						</BorderlessButton>
					),
				}}
			/>

			<ScrollView
				style={styles.content}
				contentContainerStyle={[
					styles.contentContainer,
					{ paddingBottom: insets.bottom + 32 },
				]}
				showsVerticalScrollIndicator={false}
				keyboardShouldPersistTaps="handled"
			>
				{/* Info Card */}
				<View style={styles.infoCard}>
					<Ionicons name="information-circle" size={20} color={palette.info} />
					<Text style={[type.body, styles.infoText]}>
						Categories help organize your budgets. Categories currently used in
						budgets can&apos;t be deleted.
					</Text>
				</View>

				{/* Categories List */}
				<View style={styles.section}>
					<Text style={[type.labelSm, styles.sectionTitle]}>
						All Categories
					</Text>
					{allCategories.length > 0 ? (
						<View style={styles.categoriesList}>
							{allCategories.map((category, index) => {
								const isFromBudget = budgetCategories.includes(category);
								const isLast = index === allCategories.length - 1;

								return (
									<View
										key={category}
										style={[
											styles.categoryRow,
											isLast && styles.categoryRowLast,
										]}
									>
										<View style={styles.categoryInfo}>
											<Text style={[type.body, styles.categoryName]}>
												{category}
											</Text>
											{isFromBudget && (
												<View style={styles.budgetBadge}>
													<Text style={[type.small, styles.budgetBadgeText]}>
														In use
													</Text>
												</View>
											)}
										</View>
										{!isFromBudget && (
											<TouchableOpacity
												style={styles.deleteButton}
												onPress={() => handleDeleteCategory(category)}
												hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
											>
												<Ionicons
													name="trash-outline"
													size={18}
													color={palette.danger}
												/>
											</TouchableOpacity>
										)}
									</View>
								);
							})}
						</View>
					) : (
						<View style={styles.emptyContainer}>
							<Ionicons
								name="pricetag-outline"
								size={40}
								color={palette.textSubtle}
							/>
							<Text style={[type.body, styles.emptyText]}>
								No categories yet
							</Text>
							<Text style={[type.small, styles.emptySubtext]}>
								Add a category below to get started.
							</Text>
						</View>
					)}
				</View>

				{/* Add New Category */}
				<View style={styles.section}>
					<Text style={[type.labelSm, styles.sectionTitle]}>
						Add New Category
					</Text>
					<View style={styles.addCategoryRow}>
						<TextInput
							style={[type.body, styles.categoryInput]}
							value={newCategory}
							onChangeText={setNewCategory}
							placeholder="Category name"
							placeholderTextColor={palette.textSubtle}
							returnKeyType="done"
							onSubmitEditing={handleAddCategory}
						/>
						<TouchableOpacity
							style={[
								styles.addButton,
								!newCategory.trim() && styles.addButtonDisabled,
							]}
							onPress={handleAddCategory}
							disabled={!newCategory.trim()}
							activeOpacity={0.7}
						>
							<Text
								style={[
									type.body,
									styles.addButtonText,
									!newCategory.trim() && styles.addButtonTextDisabled,
								]}
							>
								Add
							</Text>
						</TouchableOpacity>
					</View>
				</View>
			</ScrollView>
		</SafeAreaView>
	);
}

const styles = StyleSheet.create({
	safeArea: {
		flex: 1,
		backgroundColor: palette.surfaceAlt,
	},
	content: {
		flex: 1,
	},
	contentContainer: {
		paddingHorizontal: space.lg,
		paddingTop: space.md,
	},
	loadingContainer: {
		flex: 1,
		justifyContent: 'center',
		alignItems: 'center',
	},
	infoCard: {
		flexDirection: 'row',
		alignItems: 'flex-start',
		backgroundColor: palette.infoSubtle,
		padding: space.md,
		borderRadius: radius.lg,
		marginBottom: space.lg,
		borderLeftWidth: 4,
		borderLeftColor: palette.info,
	},
	infoText: {
		flex: 1,
		marginLeft: space.sm,
		color: palette.text,
		lineHeight: 20,
	},
	section: {
		marginBottom: space.xl,
	},
	sectionTitle: {
		color: palette.textSubtle,
		marginBottom: space.xs,
	},
	categoriesList: {
		backgroundColor: palette.surface,
		borderRadius: radius.lg,
		borderWidth: 1,
		borderColor: palette.border,
		overflow: 'hidden',
	},
	categoryRow: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
		paddingHorizontal: space.md,
		paddingVertical: space.md,
		borderBottomWidth: 1,
		borderBottomColor: palette.borderMuted,
	},
	categoryRowLast: {
		borderBottomWidth: 0,
	},
	categoryInfo: {
		flex: 1,
		flexDirection: 'row',
		alignItems: 'center',
		columnGap: space.sm,
	},
	categoryName: {
		color: palette.text,
	},
	budgetBadge: {
		backgroundColor: palette.primarySubtle,
		paddingHorizontal: space.xs,
		paddingVertical: 2,
		borderRadius: radius.pill,
	},
	budgetBadgeText: {
		color: palette.primary,
		fontWeight: '600',
	},
	deleteButton: {
		padding: space.xs,
	},
	emptyContainer: {
		alignItems: 'center',
		justifyContent: 'center',
		paddingVertical: space.xxl,
		backgroundColor: palette.surface,
		borderRadius: radius.lg,
		borderWidth: 1,
		borderColor: palette.border,
	},
	emptyText: {
		color: palette.text,
		marginTop: space.md,
		fontWeight: '600',
	},
	emptySubtext: {
		color: palette.textSubtle,
		marginTop: space.xs,
		textAlign: 'center',
	},
	addCategoryRow: {
		flexDirection: 'row',
		alignItems: 'center',
		backgroundColor: palette.surface,
		borderRadius: radius.lg,
		borderWidth: 1,
		borderColor: palette.border,
		paddingHorizontal: space.md,
		columnGap: space.sm,
	},
	categoryInput: {
		flex: 1,
		paddingVertical: space.md,
		color: palette.text,
	},
	addButton: {
		paddingVertical: space.sm,
		paddingHorizontal: space.md,
		backgroundColor: palette.primary,
		borderRadius: radius.md,
	},
	addButtonDisabled: {
		backgroundColor: palette.subtle,
	},
	addButtonText: {
		color: palette.primaryTextOn,
		fontWeight: '600',
	},
	addButtonTextDisabled: {
		color: palette.textSubtle,
	},
});
