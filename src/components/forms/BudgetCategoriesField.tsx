import React, { useState } from 'react';
import {
	View,
	StyleSheet,
	TextInput,
	Text,
	TouchableOpacity,
	Keyboard,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { palette, radius, space, type } from '../../ui/theme';

interface BudgetCategoriesFieldProps {
	value: string[];
	onChange: (next: string[]) => void;
}

export const BudgetCategoriesField: React.FC<BudgetCategoriesFieldProps> = ({
	value,
	onChange,
}) => {
	const [isOpen, setIsOpen] = useState(false);
	const [draft, setDraft] = useState('');

	const handleToggle = () => {
		Keyboard.dismiss();
		setIsOpen((prev) => !prev);
	};

	const handleAdd = () => {
		const trimmed = draft.trim();
		if (!trimmed || value.includes(trimmed)) return;
		onChange([...value, trimmed]);
		setDraft('');
	};

	const handleRemove = (index: number) => {
		onChange(value.filter((_, i) => i !== index));
	};

	const selectedCount = value.length;

	return (
		<View style={styles.categoriesCard}>
			<TouchableOpacity
				style={styles.categoriesHeader}
				onPress={handleToggle}
				activeOpacity={0.9}
			>
				<View style={styles.categoriesHeaderTextWrapper}>
					<Text style={[type.body, styles.categoriesHeaderText]}>
						{selectedCount > 0
							? `${selectedCount} categor${
									selectedCount === 1 ? 'y' : 'ies'
							  } selected`
							: 'Add categories'}
					</Text>

					{selectedCount > 0 && (
						<View style={styles.categoriesPreviewChips}>
							{value.slice(0, 2).map((category, index) => (
								<View key={index} style={styles.categoryChipMini}>
									<Text style={[type.small, styles.categoryChipMiniText]}>
										{category}
									</Text>
								</View>
							))}
							{selectedCount > 2 && (
								<Text style={[type.small, styles.moreCategoriesText]}>
									+{selectedCount - 2} more
								</Text>
							)}
						</View>
					)}
				</View>

				<Ionicons
					name={isOpen ? 'chevron-up' : 'chevron-down'}
					size={20}
					color={palette.textSubtle}
				/>
			</TouchableOpacity>

			{isOpen && (
				<View style={styles.categoriesBody}>
					<View style={styles.categoryInputRow}>
						<Ionicons
							name="add-circle-outline"
							size={18}
							color={palette.textSubtle}
							style={{ marginRight: 6 }}
						/>
						<TextInput
							style={[type.body, styles.categoryInput]}
							value={draft}
							onChangeText={setDraft}
							placeholder="Enter category name"
							placeholderTextColor={palette.textSubtle}
							returnKeyType="done"
							onSubmitEditing={handleAdd}
						/>
					</View>

					{value.length > 0 && (
						<View style={styles.categoriesList}>
							{value.map((category, index) => (
								<View key={index} style={styles.categoryChip}>
									<Text style={[type.small, styles.categoryChipText]}>
										{category}
									</Text>
									<TouchableOpacity
										onPress={() => handleRemove(index)}
										hitSlop={{
											top: 4,
											bottom: 4,
											left: 4,
											right: 4,
										}}
									>
										<Ionicons
											name="close"
											size={14}
											color={palette.textSubtle}
										/>
									</TouchableOpacity>
								</View>
							))}
						</View>
					)}
				</View>
			)}
		</View>
	);
};

const styles = StyleSheet.create({
	categoriesCard: {
		borderRadius: radius.lg,
		borderWidth: 1,
		borderColor: palette.border,
		backgroundColor: palette.surface,
		overflow: 'hidden',
	},
	categoriesHeader: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
		paddingHorizontal: space.md,
		paddingVertical: space.md,
	},
	categoriesHeaderTextWrapper: {
		flex: 1,
		marginRight: space.sm,
	},
	categoriesHeaderText: {
		color: palette.text,
	},
	categoriesPreviewChips: {
		flexDirection: 'row',
		flexWrap: 'wrap',
		marginTop: 4,
		gap: 4,
	},
	categoryChipMini: {
		paddingHorizontal: space.xs,
		paddingVertical: 2,
		borderRadius: radius.pill,
		backgroundColor: palette.chipBg,
	},
	categoryChipMiniText: {
		color: palette.textMuted,
	},
	moreCategoriesText: {
		color: palette.textMuted,
	},
	categoriesBody: {
		borderTopWidth: 1,
		borderTopColor: palette.borderMuted,
		paddingHorizontal: space.md,
		paddingBottom: space.md,
		paddingTop: space.sm,
		backgroundColor: palette.surfaceAlt,
	},
	categoryInputRow: {
		flexDirection: 'row',
		alignItems: 'center',
		borderRadius: radius.lg,
		borderWidth: 1,
		borderColor: palette.border,
		paddingHorizontal: space.sm,
		paddingVertical: space.xs,
		backgroundColor: palette.surface,
		marginBottom: space.sm,
	},
	categoryInput: {
		flex: 1,
		paddingVertical: space.sm,
		color: palette.text,
	},
	categoriesList: {
		flexDirection: 'row',
		flexWrap: 'wrap',
		gap: space.xs,
	},
	categoryChip: {
		flexDirection: 'row',
		alignItems: 'center',
		backgroundColor: palette.primarySubtle,
		paddingHorizontal: space.sm,
		paddingVertical: space.xs,
		borderRadius: radius.pill,
	},
	categoryChipText: {
		color: palette.primary,
		marginRight: 4,
	},
});

