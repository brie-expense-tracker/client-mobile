import React, { useRef, useState, useEffect } from 'react';
import {
	View,
	TextInput,
	TouchableOpacity,
	ActivityIndicator,
	StyleSheet,
	Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { palette, radius, space } from '../../../../src/ui/theme';

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
	const [lineCount, setLineCount] = useState(1);
	const inputRef = useRef<TextInput>(null);

	const handlePress = async () => {
		const trimmed = text.trim();
		if (!trimmed || isSending || disabled) return;

		// Snapshot first; clear only after send completes
		const toSend = trimmed;
		try {
			await Promise.resolve(onSend(toSend));
			setText(''); // clear after successful send
			setLineCount(1); // reset line count
			inputRef.current?.focus(); // keep keyboard up
		} catch {
			// keep text if send fails
		}
	};

	const calculateLineCount = (height: number) => {
		// Calculate line count based on actual rendered height
		// minHeight is 40px (1 line)
		// Each additional line adds approximately 20-22px
		const minHeight = 40;
		const lineHeight = 20; // Approximate line height increment

		if (height <= minHeight) {
			return 1;
		} else {
			const heightDiff = height - minHeight;
			const additionalLines = Math.ceil(heightDiff / lineHeight);
			return 1 + additionalLines;
		}
	};

	const handleContentSizeChange = (event: {
		nativeEvent: { contentSize: { height: number } };
	}) => {
		const { height } = event.nativeEvent.contentSize;
		const lines = calculateLineCount(height);
		setLineCount(lines);
	};

	const handleLayout = (event: {
		nativeEvent: { layout: { height: number } };
	}) => {
		const { height } = event.nativeEvent.layout;
		const lines = calculateLineCount(height);
		setLineCount(lines);
	};

	// Calculate line count based on text as fallback
	useEffect(() => {
		if (!text.trim()) {
			setLineCount(1);
			return;
		}

		// Count explicit newlines
		const newlineCount = (text.match(/\n/g) || []).length;

		// Estimate wrapping: approximate characters per line (assuming ~30-35 chars per line on mobile)
		// This is a rough estimate, but helps when onContentSizeChange doesn't fire
		const estimatedCharsPerLine = 32;
		const linesFromWrapping = Math.ceil(text.length / estimatedCharsPerLine);

		// Use the maximum of newlines + 1 or estimated wrapping
		const estimatedLines = Math.max(newlineCount + 1, linesFromWrapping);

		// Update using functional form to avoid dependency on lineCount
		setLineCount((current) => {
			// Only update if estimated is higher (to avoid overriding accurate measurements)
			if (estimatedLines > current || (estimatedLines === 1 && current > 1)) {
				return estimatedLines;
			}
			return current;
		});
	}, [text]);

	// Calculate borderRadius based on line count
	const getBorderRadius = () => {
		if (lineCount === 1) return radius.pill;
		if (lineCount === 2) return radius.xl;
		if (lineCount === 3) return radius.lg;
		if (lineCount === 4) return radius.md;
		return radius.sm; // 5+ lines
	};

	const dynamicBorderRadius = getBorderRadius();

	return (
		<View style={styles.bar}>
			<View
				style={[styles.inputWrapper, { borderRadius: dynamicBorderRadius }]}
				onLayout={handleLayout}
			>
				<TextInput
					ref={inputRef}
					value={text}
					onChangeText={setText}
					placeholder={placeholder}
					placeholderTextColor={palette.textMuted}
					style={[styles.input, { borderRadius: dynamicBorderRadius }]}
					multiline
					autoCorrect={true}
					textContentType="none"
					returnKeyType={Platform.OS === 'ios' ? 'send' : 'default'}
					onSubmitEditing={Platform.OS === 'ios' ? handlePress : undefined}
					onContentSizeChange={handleContentSizeChange}
				/>
			</View>
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
		alignItems: 'center',
		gap: space.md,
		overflow: 'hidden',
	},
	inputWrapper: {
		flex: 1,
		flexShrink: 1,
		overflow: 'hidden',
		minWidth: 0,
	},
	input: {
		width: '100%',
		flexShrink: 1,
		minHeight: 40,
		maxHeight: 120,
		borderWidth: StyleSheet.hairlineWidth,
		borderColor: palette.borderSubtle,
		backgroundColor: palette.surfaceAlt,
		paddingHorizontal: space.lg,
		paddingTop: Platform.OS === 'ios' ? 12 : 0,
		paddingBottom: Platform.OS === 'ios' ? 12 : 0,
		fontSize: 16,
		fontWeight: '400',
		color: palette.text,
		textAlignVertical: 'center',
	},
	sendBtn: {
		width: 40,
		height: 40,
		borderRadius: radius.full,
		backgroundColor: palette.primary,
		alignItems: 'center',
		justifyContent: 'center',
	},
	sendBtnDisabled: {
		backgroundColor: palette.iconMuted,
	},
});
