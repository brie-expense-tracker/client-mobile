import React, { useState } from 'react';
import {
	SafeAreaView,
	ScrollView,
	View,
	Text,
	TextInput,
	FlatList,
	Alert,
	StyleSheet,
} from 'react-native';
import { FontAwesome } from '@expo/vector-icons';
import { Stack } from 'expo-router';
import { RectButton } from 'react-native-gesture-handler';

type Category = {
	id: string;
	name: string;
	type: 'income' | 'expense';
	icon?: string;
};

export default function CategorySettingsScreen() {
	const [categories, setCategories] = useState<Category[]>([
		{ id: '1', name: 'Groceries', type: 'expense', icon: 'shopping-cart' },
		{ id: '2', name: 'Salary', type: 'income', icon: 'money' },
	]);
	const [newCategory, setNewCategory] = useState('');
	const [type, setType] = useState<'income' | 'expense'>('expense');

	const addCategory = () => {
		if (!newCategory.trim()) return;
		const exists = categories.find(
			(cat) =>
				cat.name.toLowerCase() === newCategory.toLowerCase() &&
				cat.type === type
		);
		if (exists) {
			Alert.alert('Category already exists');
			return;
		}
		const newCat: Category = {
			id: Date.now().toString(),
			name: newCategory.trim(),
			type,
			icon: type === 'income' ? 'plus' : 'minus',
		};
		setCategories((prev) => [...prev, newCat]);
		setNewCategory('');
	};

	const deleteCategory = (id: string) => {
		Alert.alert('Delete Category', 'Are you sure?', [
			{ text: 'Cancel', style: 'cancel' },
			{
				text: 'Delete',
				style: 'destructive',
				onPress: () => setCategories(categories.filter((cat) => cat.id !== id)),
			},
		]);
	};

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
						/>
						<RectButton onPress={addCategory} style={styles.addButton}>
							<Text style={styles.addButtonText}>Add</Text>
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

					<FlatList
						data={categories.filter((cat) => cat.type === type)}
						keyExtractor={(item) => item.id}
						scrollEnabled={false}
						renderItem={({ item }) => (
							<View style={styles.categoryItem}>
								<View style={styles.categoryInfo}>
									<FontAwesome
										name={(item.icon as any) || 'tag'}
										size={18}
										style={styles.categoryIcon}
									/>
									<Text style={styles.categoryName}>{item.name}</Text>
								</View>
								<RectButton
									onPress={() => deleteCategory(item.id)}
									style={styles.deleteButton}
								>
									<FontAwesome name="trash" size={16} color="#FF3B30" />
								</RectButton>
							</View>
						)}
					/>
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
		color: '#666',
	},
	categoryName: {
		fontSize: 16,
		color: '#333',
	},
	deleteButton: {
		padding: 8,
	},
});
