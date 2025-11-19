import React, { useRef } from 'react';
import { View, TextInput, StyleSheet } from 'react-native';
import { dynamicTextStyle } from '../../../../src/utils/accessibility';

interface BaseTextAreaProps {
	value: string;
	onChange: (value: string) => void;
	disabled?: boolean;
	placeholder: string;
	accessibilityLabel: string;
	accessibilityHint?: string;
	minHeight?: number;
	numberOfLines?: number;
	marginBottom?: number;
}

function BaseTextAreaComponent({
	value,
	onChange,
	disabled = false,
	placeholder,
	accessibilityLabel,
	accessibilityHint,
	minHeight = 130,
	numberOfLines,
	marginBottom = 20,
}: BaseTextAreaProps) {
	const inputRef = useRef<TextInput>(null);

	return (
		<View style={[styles.container, { marginBottom }]}>
			<TextInput
				ref={inputRef}
				style={[styles.textInput, dynamicTextStyle, { minHeight }]}
				value={value}
				onChangeText={onChange}
				editable={!disabled}
				placeholder={placeholder}
				placeholderTextColor="#9CA3AF"
				multiline
				numberOfLines={numberOfLines}
				textAlignVertical="top"
				accessibilityLabel={accessibilityLabel}
				accessibilityHint={accessibilityHint}
			/>
		</View>
	);
}

export const BaseTextArea = React.memo(BaseTextAreaComponent);

const styles = StyleSheet.create({
	container: {},
	textInput: {
		backgroundColor: '#FFFFFF',
		borderWidth: 1,
		borderColor: '#E2E8F0',
		borderRadius: 14,
		paddingHorizontal: 14,
		paddingVertical: 12,
		fontSize: 16,
		color: '#111827',
		lineHeight: 22,
	},
});

export default BaseTextArea;

