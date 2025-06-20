import React, { useState, useMemo } from 'react';
import {
	View,
	Text,
	TextInput,
	Pressable,
	StyleSheet,
	Alert,
	KeyboardAvoidingView,
	Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';

export default function UpdatePasswordScreen() {
	const nav = useNavigation();

	// ────────────────────────────────────
	// form state
	// ────────────────────────────────────
	const [currentPw, setCurrentPw] = useState('');
	const [newPw, setNewPw] = useState('');
	const [confirmPw, setConfirmPw] = useState('');

	const canSubmit = useMemo(
		() =>
			currentPw.trim().length > 0 &&
			newPw.trim().length > 0 &&
			confirmPw.trim().length > 0 &&
			newPw === confirmPw,
		[currentPw, newPw, confirmPw]
	);

	const onSubmit = () => {
		if (!canSubmit) return;

		// 🔗 integrate with your auth backend here
		Alert.alert('Success', 'Password updated!');
		setCurrentPw('');
		setNewPw('');
		setConfirmPw('');
	};

	// ────────────────────────────────────
	// render
	// ────────────────────────────────────
	return (
		<KeyboardAvoidingView
			style={styles.container}
			behavior={Platform.OS === 'ios' ? 'padding' : undefined}
		>
			{/* Back button */}
			<Pressable style={styles.backBtn} onPress={() => nav.goBack()}>
				<Ionicons name="chevron-back" size={28} color="white" />
			</Pressable>

			{/* Title */}
			<Text style={styles.heading}>Update password</Text>

			{/* Inputs */}
			<Text style={styles.label}>Current Password</Text>
			<TextInput
				style={styles.input}
				placeholder="Current password"
				placeholderTextColor="#7d7d7d"
				secureTextEntry
				value={currentPw}
				onChangeText={setCurrentPw}
			/>

			<Text style={styles.label}>New Password</Text>
			<TextInput
				style={styles.input}
				placeholder="New password"
				placeholderTextColor="#7d7d7d"
				secureTextEntry
				value={newPw}
				onChangeText={setNewPw}
			/>

			<Text style={styles.label}>Confirm New Password</Text>
			<TextInput
				style={styles.input}
				placeholder="Confirm new password"
				placeholderTextColor="#7d7d7d"
				secureTextEntry
				value={confirmPw}
				onChangeText={setConfirmPw}
			/>

			{/* Forgot link */}
			<Pressable onPress={() => Alert.alert('Reset flow', 'Send reset email…')}>
				<Text style={styles.forgot}>Forgot password?</Text>
			</Pressable>

			{/* Submit */}
			<Pressable
				style={[styles.submit, !canSubmit && styles.submitDisabled]}
				onPress={onSubmit}
				disabled={!canSubmit}
			>
				<Text style={styles.submitText}>Submit</Text>
			</Pressable>
		</KeyboardAvoidingView>
	);
}

const BORDER = '#e1e1e1';

const styles = StyleSheet.create({
	container: {
		flex: 1,
		backgroundColor: '#ffffff',
		paddingHorizontal: 24,
		paddingTop: 70,
	},
	backBtn: {
		position: 'absolute',
		top: 60,
		left: 20,
		padding: 4,
	},
	heading: {
		fontSize: 26,
		fontWeight: '600',
		color: '#1a1a1a',
		alignSelf: 'center',
		marginBottom: 40,
	},
	input: {
		borderWidth: 1,
		borderColor: BORDER,
		borderRadius: 12,
		padding: 16,
		fontSize: 16,
		color: '#1a1a1a',
		marginBottom: 20,
		backgroundColor: '#fafafa',
	},
	forgot: {
		color: '#007AFF',
		textDecorationLine: 'underline',
		marginBottom: 40,
		textAlign: 'center',
	},
	submit: {
		position: 'absolute',
		bottom: 40,
		left: 24,
		right: 24,
		backgroundColor: '#007AFF',
		borderRadius: 12,
		paddingVertical: 18,
		alignItems: 'center',
		shadowColor: '#000',
		shadowOffset: {
			width: 0,
			height: 2,
		},
		shadowOpacity: 0.1,
		shadowRadius: 4,
		elevation: 3,
	},
	submitDisabled: {
		opacity: 0.5,
		backgroundColor: '#cccccc',
	},
	submitText: {
		fontSize: 17,
		fontWeight: '600',
		color: '#ffffff',
	},
	label: {
		fontSize: 16,
		fontWeight: '600',
		color: '#1a1a1a',
		marginBottom: 8,
	},
});
