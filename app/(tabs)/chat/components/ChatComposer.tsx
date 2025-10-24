import React, { useRef, useState } from 'react';
import {
	View,
	TextInput,
	TouchableOpacity,
	ActivityIndicator,
	StyleSheet,
	Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

type Props = {
	onSend: (text: string) => Promise<void> | void;
	isSending?: boolean;
	placeholder?: string;
	disabled?: boolean;
};

export default function ChatComposer({
	onSend,
	isSending = false,
	placeholder = 'Ask about your finances…',
	disabled = false,
}: Props) {
	const [text, setText] = useState('');
	const inputRef = useRef<TextInput>(null);

	const handlePress = async () => {
		const trimmed = text.trim();
		if (!trimmed || isSending || disabled) return;

		// Snapshot first; clear only after send completes
		const toSend = trimmed;
		try {
			await Promise.resolve(onSend(toSend));
			setText(''); // clear after successful send
			inputRef.current?.focus(); // keep keyboard up
		} catch {
			// keep text if send fails
		}
	};

	return (
		<View style={styles.bar}>
			<TextInput
				ref={inputRef}
				value={text}
				onChangeText={setText}
				placeholder={placeholder}
				placeholderTextColor="#9ca3af"
				style={styles.input}
				multiline
				autoCorrect={false}
				autoComplete="off"
				textContentType="none"
				returnKeyType={Platform.OS === 'ios' ? 'default' : 'send'}
				onSubmitEditing={handlePress}
				blurOnSubmit={false}
			/>
			<TouchableOpacity
				style={[
					styles.sendBtn,
					(!text.trim() || isSending || disabled) && styles.sendBtnDisabled,
				]}
				onPress={handlePress}
				disabled={!text.trim() || isSending || disabled}
				activeOpacity={0.7}
			>
				{isSending ? (
					<ActivityIndicator size="small" color="#fff" />
				) : (
					<Ionicons name="send" size={18} color="#fff" />
				)}
			</TouchableOpacity>
		</View>
	);
}

const styles = StyleSheet.create({
	bar: {
		flexDirection: 'row',
		alignItems: 'flex-end',
		padding: 12,
		gap: 12,
	},
	input: {
		flex: 1,
		maxHeight: 120,
		borderWidth: 1,
		borderColor: '#e5e7eb',
		backgroundColor: '#f9fafb',
		borderRadius: 18,
		paddingHorizontal: 14,
		paddingVertical: 10,
		fontSize: 16,
	},
	sendBtn: {
		width: 42,
		height: 42,
		borderRadius: 21,
		backgroundColor: '#3b82f6',
		alignItems: 'center',
		justifyContent: 'center',
	},
	sendBtnDisabled: {
		backgroundColor: '#cbd5e1',
	},
});
