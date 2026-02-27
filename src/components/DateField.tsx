/**
 * Date field for transaction edit: displays a date (YYYY-MM-DD) and allows picking/editing.
 */
import React, { useState } from 'react';
import {
	View,
	Text,
	TouchableOpacity,
	Modal,
	TextInput,
	StyleSheet,
	Platform,
	type ViewStyle,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { palette, space } from '../ui/theme';

const formatDisplayDate = (value: string): string => {
	if (!value || typeof value !== 'string') return '';
	const part = value.slice(0, 10);
	if (!/^\d{4}-\d{2}-\d{2}$/.test(part)) return value;
	const [y, m, d] = part.split('-').map(Number);
	const date = new Date(y, m - 1, d);
	if (isNaN(date.getTime())) return value;
	return date.toLocaleDateString('en-US', {
		month: 'short',
		day: 'numeric',
		year: 'numeric',
	});
};

export interface DateFieldProps {
	value: string;
	onChange: (date: string) => void;
	placeholder?: string;
	containerStyle?: ViewStyle;
}

export function DateField({
	value,
	onChange,
	placeholder = 'Select a date',
	containerStyle,
}: DateFieldProps) {
	const [modalVisible, setModalVisible] = useState(false);
	const [inputValue, setInputValue] = useState(value.slice(0, 10));

	const openPicker = () => {
		setInputValue(value ? value.slice(0, 10) : '');
		setModalVisible(true);
	};

	const handleDone = () => {
		const trimmed = inputValue.trim();
		if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
			const [y, m, d] = trimmed.split('-').map(Number);
			const d2 = new Date(y, m - 1, d);
			if (!isNaN(d2.getTime())) {
				onChange(trimmed);
			}
		}
		setModalVisible(false);
	};

	const setToday = () => {
		const today = new Date();
		const y = today.getFullYear();
		const m = String(today.getMonth() + 1).padStart(2, '0');
		const d = String(today.getDate()).padStart(2, '0');
		onChange(`${y}-${m}-${d}`);
		setModalVisible(false);
	};

	return (
		<>
			<TouchableOpacity
				onPress={openPicker}
				activeOpacity={0.7}
				style={[styles.container, containerStyle]}
				accessibilityRole="button"
				accessibilityLabel={value ? formatDisplayDate(value) : placeholder}
			>
				<Ionicons
					name="calendar-outline"
					size={18}
					color={palette.textMuted}
					style={styles.icon}
				/>
				<Text
					style={[styles.text, !value && styles.placeholder]}
					numberOfLines={1}
				>
					{value ? formatDisplayDate(value) : placeholder}
				</Text>
				<Ionicons name="chevron-down" size={18} color={palette.textMuted} />
			</TouchableOpacity>

			<Modal
				visible={modalVisible}
				transparent
				animationType="fade"
				onRequestClose={() => setModalVisible(false)}
			>
				<TouchableOpacity
					activeOpacity={1}
					style={styles.modalOverlay}
					onPress={() => setModalVisible(false)}
				>
					<View style={styles.modalContent} onStartShouldSetResponder={() => true}>
						<Text style={styles.modalTitle}>Date</Text>
						<TextInput
							style={styles.input}
							value={inputValue}
							onChangeText={setInputValue}
							placeholder="YYYY-MM-DD"
							placeholderTextColor={palette.textMuted}
							keyboardType={Platform.OS === 'ios' ? 'numbers-and-punctuation' : 'numeric'}
							maxLength={10}
							accessibilityLabel="Date (YYYY-MM-DD)"
						/>
						<View style={styles.modalActions}>
							<TouchableOpacity style={styles.todayBtn} onPress={setToday}>
								<Text style={styles.todayBtnText}>Today</Text>
							</TouchableOpacity>
							<TouchableOpacity style={styles.doneBtn} onPress={handleDone}>
								<Text style={styles.doneBtnText}>Done</Text>
							</TouchableOpacity>
						</View>
					</View>
				</TouchableOpacity>
			</Modal>
		</>
	);
}

const styles = StyleSheet.create({
	container: {
		flexDirection: 'row',
		alignItems: 'center',
		minHeight: 52,
		paddingHorizontal: space.md,
		borderRadius: 12,
		borderWidth: 1,
		borderColor: palette.border,
		backgroundColor: palette.surfaceAlt,
	},
	icon: {
		marginRight: space.sm,
	},
	text: {
		flex: 1,
		fontSize: 16,
		color: palette.text,
	},
	placeholder: {
		color: palette.textMuted,
	},
	modalOverlay: {
		flex: 1,
		backgroundColor: 'rgba(0,0,0,0.5)',
		justifyContent: 'center',
		padding: 24,
	},
	modalContent: {
		backgroundColor: palette.surface,
		borderRadius: 16,
		padding: 20,
	},
	modalTitle: {
		fontSize: 18,
		fontWeight: '600',
		color: palette.text,
		marginBottom: 12,
	},
	input: {
		borderWidth: 1,
		borderColor: palette.border,
		borderRadius: 12,
		paddingHorizontal: 12,
		paddingVertical: 12,
		fontSize: 16,
		color: palette.text,
		marginBottom: 16,
	},
	modalActions: {
		flexDirection: 'row',
		gap: 12,
	},
	todayBtn: {
		flex: 1,
		paddingVertical: 12,
		alignItems: 'center',
		borderRadius: 12,
		backgroundColor: palette.surfaceAlt,
	},
	todayBtnText: {
		fontSize: 16,
		fontWeight: '600',
		color: palette.textSecondary,
	},
	doneBtn: {
		flex: 1,
		paddingVertical: 12,
		alignItems: 'center',
		borderRadius: 12,
		backgroundColor: palette.primary,
	},
	doneBtnText: {
		fontSize: 16,
		fontWeight: '600',
		color: palette.primaryTextOn,
	},
});
