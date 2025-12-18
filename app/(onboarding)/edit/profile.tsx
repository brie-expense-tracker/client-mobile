import React, { useState, useEffect } from 'react';
import {
	View,
	Text,
	StyleSheet,
	TextInput,
	Pressable,
	ScrollView,
	KeyboardAvoidingView,
	Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { palette, radius, space, type, shadow } from '../../../src/ui/theme';
import { useProfile } from '../../../src/context/profileContext';

export default function EditProfileScreen() {
	const router = useRouter();
	const { profile, updateProfile } = useProfile();

	const [firstName, setFirstName] = useState(profile?.firstName || '');
	const [lastName, setLastName] = useState(profile?.lastName || '');
	const [financialGoal, setFinancialGoal] = useState(
		profile?.financialGoal || ''
	);
	const [loading, setLoading] = useState(false);

	// Hydrate local state from profile
	useEffect(() => {
		if (!profile) return;
		setFirstName(profile.firstName || '');
		setLastName(profile.lastName || '');
		setFinancialGoal(profile.financialGoal || '');
	}, [profile]);

	const handleSave = async () => {
		if (firstName.trim().length < 2 || lastName.trim().length < 2) return;

		setLoading(true);
		try {
			await updateProfile({
				firstName: firstName.trim(),
				lastName: lastName.trim(),
				financialGoal: financialGoal.trim(),
			});
			router.replace('/(tabs)/dashboard');
		} catch (error) {
			console.error('Failed to update profile:', error);
		} finally {
			setLoading(false);
		}
	};

	const isValid = firstName.trim().length >= 2 && lastName.trim().length >= 2;

	return (
		<View style={styles.screen}>
			<KeyboardAvoidingView
				behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
				style={{ flex: 1 }}
			>
				<View style={styles.header}>
					<Pressable onPress={() => router.back()} style={styles.backBtn}>
						<Ionicons name="arrow-back" size={24} color={palette.text} />
					</Pressable>
					<Text style={styles.title}>Basic Profile</Text>
					<View style={{ width: 40 }} />
				</View>

				<ScrollView
					style={{ flex: 1 }}
					contentContainerStyle={styles.content}
					keyboardShouldPersistTaps="handled"
				>
					<View style={styles.inputGroup}>
						<Text style={styles.label}>First Name</Text>
						<TextInput
							value={firstName}
							onChangeText={setFirstName}
							style={styles.input}
							placeholder="Enter first name"
							autoFocus
						/>
					</View>

					<View style={styles.inputGroup}>
						<Text style={styles.label}>Last Name</Text>
						<TextInput
							value={lastName}
							onChangeText={setLastName}
							style={styles.input}
							placeholder="Enter last name"
						/>
					</View>

					<View style={styles.inputGroup}>
						<Text style={styles.label}>Primary Goal</Text>
						<TextInput
							value={financialGoal}
							onChangeText={setFinancialGoal}
							style={styles.input}
							placeholder="Build an emergency fund..."
							placeholderTextColor={palette.textMuted}
						/>
					</View>
				</ScrollView>

				<View style={styles.footer}>
					<Pressable
						onPress={handleSave}
						disabled={!isValid || loading}
						style={({ pressed }) => [
							styles.saveBtn,
							(!isValid || loading) && { opacity: 0.5 },
							pressed && { opacity: 0.9 },
						]}
					>
						<Text style={styles.saveText}>
							{loading ? 'Saving...' : 'Save Profile'}
						</Text>
					</Pressable>
				</View>
			</KeyboardAvoidingView>
		</View>
	);
}

const styles = StyleSheet.create({
	screen: {
		flex: 1,
		backgroundColor: palette.surface,
	},
	header: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
		paddingHorizontal: space.lg,
		paddingTop: 60,
		paddingBottom: space.md,
		borderBottomWidth: 1,
		borderBottomColor: palette.border,
	},
	backBtn: {
		width: 40,
		height: 40,
		borderRadius: 20,
		alignItems: 'center',
		justifyContent: 'center',
	},
	title: {
		...type.h2,
		color: palette.text,
	},
	content: {
		padding: space.lg,
	},
	inputGroup: {
		marginBottom: space.lg,
	},
	label: {
		...type.small,
		color: palette.textMuted,
		marginBottom: space.xs,
		fontWeight: '700',
		textTransform: 'uppercase',
	},
	input: {
		height: 54,
		backgroundColor: palette.surfaceAlt,
		borderRadius: radius.md,
		paddingHorizontal: space.md,
		fontSize: 16,
		color: palette.text,
		borderWidth: 1,
		borderColor: palette.border,
	},
	footer: {
		padding: space.lg,
		paddingBottom: 40,
	},
	saveBtn: {
		height: 54,
		borderRadius: radius.lg,
		backgroundColor: palette.primary,
		alignItems: 'center',
		justifyContent: 'center',
		...shadow.card,
	},
	saveText: {
		...type.body,
		fontWeight: '700',
		color: palette.primaryTextOn,
	},
});

