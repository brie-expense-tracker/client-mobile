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

export default function EditSavingsScreen() {
	const router = useRouter();
	const { profile, updateProfile } = useProfile();

	const [savings, setSavings] = useState(profile?.savings?.toString() || '');
	const [loading, setLoading] = useState(false);

	// Hydrate local state from profile
	useEffect(() => {
		if (!profile) return;
		setSavings(profile.savings?.toString() || '');
	}, [profile]);

	const handleSave = async () => {
		const savingsNum = parseFloat(savings) || 0;
		if (savingsNum < 0) return;

		setLoading(true);
		try {
			await updateProfile({
				savings: savingsNum,
			});
			router.replace('/(tabs)/dashboard');
		} catch (error) {
			console.error('Failed to update savings:', error);
		} finally {
			setLoading(false);
		}
	};

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
					<Text style={styles.title}>Savings & Investments</Text>
					<View style={{ width: 40 }} />
				</View>

				<ScrollView
					style={{ flex: 1 }}
					contentContainerStyle={styles.content}
					keyboardShouldPersistTaps="handled"
				>
					<Text style={styles.description}>
						Include cash, emergency funds, and brokerage accounts. This helps us
						calculate your financial health score.
					</Text>

					<View style={styles.inputGroup}>
						<Text style={styles.label}>Total Savings</Text>
						<View style={styles.inputWithIcon}>
							<Ionicons name="logo-usd" size={18} color={palette.textSubtle} />
							<TextInput
								value={savings}
								onChangeText={setSavings}
								keyboardType="decimal-pad"
								style={styles.inputWithIconText}
								placeholder="0.00"
								autoFocus
							/>
						</View>
					</View>
				</ScrollView>

				<View style={styles.footer}>
					<Pressable
						onPress={handleSave}
						disabled={loading}
						style={({ pressed }) => [
							styles.saveBtn,
							loading && { opacity: 0.5 },
							pressed && { opacity: 0.9 },
						]}
					>
						<Text style={styles.saveText}>
							{loading ? 'Saving...' : 'Update Savings'}
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
	description: {
		...type.body,
		color: palette.textMuted,
		marginBottom: space.xl,
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
	inputWithIcon: {
		flexDirection: 'row',
		alignItems: 'center',
		height: 54,
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

