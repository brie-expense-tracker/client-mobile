import React, { useState, useEffect } from 'react';
import {
	View,
	StyleSheet,
	TextInput,
	Pressable,
	ScrollView,
	KeyboardAvoidingView,
	Platform,
	Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { palette, radius, space } from '../../../src/ui/theme';
import { AppCard, AppText, AppButton } from '../../../src/ui/primitives';
import { useProfile } from '../../../src/context/profileContext';

export default function EditProfileScreen() {
	const router = useRouter();
	const insets = useSafeAreaInsets();
	const { profile, updateProfile } = useProfile();

	const [firstName, setFirstName] = useState(profile?.firstName || '');
	const [lastName, setLastName] = useState(profile?.lastName || '');
	const [loading, setLoading] = useState(false);

	useEffect(() => {
		if (!profile) return;
		setFirstName(profile.firstName || '');
		setLastName(profile.lastName || '');
	}, [profile]);

	const handleSave = async () => {
		if (firstName.trim().length < 2 || lastName.trim().length < 2) return;

		setLoading(true);
		try {
			await updateProfile({
				firstName: firstName.trim(),
				lastName: lastName.trim(),
			});
			router.back();
		} catch (error) {
			const message = error instanceof Error ? error.message : 'Failed to save';
			Alert.alert('Couldn’t save', message, [{ text: 'OK' }]);
		} finally {
			setLoading(false);
		}
	};

	const isValid = firstName.trim().length >= 2 && lastName.trim().length >= 2;

	return (
		<View style={[styles.screen, { paddingTop: insets.top }]}>
			<KeyboardAvoidingView
				behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
				style={styles.flex}
			>
				<View style={styles.header}>
					<Pressable onPress={() => router.back()} style={styles.backBtn}>
						<Ionicons name="chevron-back" size={24} color={palette.text} />
					</Pressable>
					<AppText.Title style={styles.title}>Basic Profile</AppText.Title>
					<View style={styles.headerSpacer} />
				</View>

				<ScrollView
					style={styles.scroll}
					contentContainerStyle={[
						styles.content,
						{ paddingBottom: insets.bottom + space.xxl },
					]}
					keyboardShouldPersistTaps="handled"
					showsVerticalScrollIndicator={false}
				>
					<AppText.Caption color="muted" style={styles.description}>
						Your name is used across the app and when syncing your data.
					</AppText.Caption>

					<AppCard padding={space.lg} borderRadius={radius.xl}>
						<AppText.Label color="subtle" style={styles.inputLabel}>
							First Name
						</AppText.Label>
						<View style={styles.inputWithIcon}>
							<Ionicons name="person-outline" size={20} color={palette.textSubtle} />
							<TextInput
								value={firstName}
								onChangeText={setFirstName}
								style={styles.inputWithIconText}
								placeholder="Enter first name"
								placeholderTextColor={palette.textSubtle}
								autoFocus
							/>
						</View>
						<AppText.Label color="subtle" style={[styles.inputLabel, styles.inputLabelTop]}>
							Last Name
						</AppText.Label>
						<View style={styles.inputWithIcon}>
							<Ionicons name="person-outline" size={20} color={palette.textSubtle} />
							<TextInput
								value={lastName}
								onChangeText={setLastName}
								style={styles.inputWithIconText}
								placeholder="Enter last name"
								placeholderTextColor={palette.textSubtle}
							/>
						</View>
					</AppCard>

					<View style={styles.footer}>
						<AppButton
							label={loading ? 'Saving…' : 'Save Profile'}
							variant="primary"
							onPress={handleSave}
							disabled={!isValid || loading}
							loading={loading}
							fullWidth
						/>
					</View>
				</ScrollView>
			</KeyboardAvoidingView>
		</View>
	);
}

const styles = StyleSheet.create({
	screen: {
		flex: 1,
		backgroundColor: palette.bg,
	},
	flex: { flex: 1 },
	header: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
		paddingHorizontal: space.lg,
		paddingVertical: space.md,
		borderBottomWidth: StyleSheet.hairlineWidth,
		borderBottomColor: palette.border,
	},
	backBtn: {
		padding: 4,
		marginRight: space.sm,
	},
	title: {
		flex: 1,
		textAlign: 'center',
	},
	headerSpacer: { width: 40 },
	scroll: { flex: 1 },
	content: {
		paddingHorizontal: space.xl,
		paddingTop: space.lg,
	},
	description: {
		marginBottom: space.xl,
	},
	inputLabel: {
		marginBottom: space.xs,
	},
	inputLabelTop: {
		marginTop: space.lg,
	},
	inputWithIcon: {
		flexDirection: 'row',
		alignItems: 'center',
		height: 52,
		backgroundColor: palette.surfaceAlt,
		borderRadius: radius.md,
		paddingHorizontal: space.md,
		borderWidth: 1,
		borderColor: palette.border,
	},
	inputWithIconText: {
		flex: 1,
		marginLeft: space.xs,
		fontSize: 16,
		color: palette.text,
	},
	footer: {
		marginTop: space.xl,
	},
});
