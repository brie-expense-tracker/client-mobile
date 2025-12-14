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
import {
	palette,
	radius,
	space,
	type as typography,
} from '../../../../src/ui/theme';

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
				placeholderTextColor={palette.textMuted}
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
					<ActivityIndicator size="small" color={palette.onPrimary} />
				) : (
					<Ionicons name="send" size={18} color={palette.onPrimary} />
				)}
			</TouchableOpacity>
		</View>
	);
}

const styles = StyleSheet.create({
	bar: {
		flexDirection: 'row',
		alignItems: 'flex-end',
		padding: space.md,
		gap: space.md,
	},
	input: {
		flex: 1,
		minHeight: 48,
		maxHeight: 120,
		borderWidth: StyleSheet.hairlineWidth,
		borderColor: palette.borderSubtle,
		backgroundColor: palette.surfaceAlt,
		borderRadius: radius.pill,
		paddingHorizontal: space.lg,
		paddingVertical: space.md,
		...typography.body,
		color: palette.text,
	},
	sendBtn: {
		width: 48,
		height: 48,
		borderRadius: radius.full,
		backgroundColor: palette.primary,
		alignItems: 'center',
		justifyContent: 'center',
	},
	sendBtnDisabled: {
		backgroundColor: palette.iconMuted,
	},
});
