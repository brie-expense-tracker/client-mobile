import React, { useMemo, useState, useEffect, useCallback } from 'react';
import { logger } from '../../../../src/utils/logger';
import {
	View,
	Text,
	StyleSheet,
	TextInput,
	Alert,
	ScrollView,
	ActivityIndicator,
	Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { RectButton, BorderlessButton } from 'react-native-gesture-handler';
import useAuth from '../../../../src/context/AuthContext';

// Account deletion reasons
const DELETION_REASONS = [
	{ key: 'broken', label: 'Something was broken or not working' },
	{ key: 'no_invites', label: "I'm not getting any invites" },
	{ key: 'privacy', label: 'I have privacy concerns' },
	{ key: 'confusing', label: 'The app is too confusing to use' },
	{ key: 'notifications', label: 'Too many emails and notifications' },
	{ key: 'alternative', label: 'I found a better alternative' },
	{ key: 'personal', label: 'Personal reasons' },
	{ key: 'other', label: 'Other' },
] as const;

type DeletionReason = (typeof DELETION_REASONS)[number]['key'];

export default function DeleteAccountScreen() {
	const router = useRouter();
	const {
		firebaseUser,
		deleteAccountAfterReauth,
		reauthWithPassword,
		reauthWithGoogle,
		refreshUserData,
	} = useAuth();

	// Wizard state
	const [currentStep, setCurrentStep] = useState(0);
	const [busy, setBusy] = useState(false);
	const [formError, setFormError] = useState<string | null>(null);

	// Step 1: Reason selection
	const [selectedReason, setSelectedReason] = useState<DeletionReason | ''>('');

	// Step 2: Additional feedback
	const [additionalFeedback, setAdditionalFeedback] = useState('');

	// Step 3: Data export preference
	const [exportData, setExportData] = useState(false);

	// Step 4: Final verification
	const [confirmText, setConfirmText] = useState('');
	const [password, setPassword] = useState('');
	const [showPassword, setShowPassword] = useState(false);
	const [reauthComplete, setReauthComplete] = useState(false);

	// Determine user's sign-in providers
	const providers: string[] = useMemo(() => {
		const ids =
			firebaseUser?.providerData
				?.map((p: any) => p?.providerId)
				.filter(Boolean) ?? [];
		return Array.from(new Set(ids));
	}, [firebaseUser]);

	const usesPassword = providers.includes('password');
	const usesGoogle = providers.includes('google.com');
	const usesApple = providers.includes('apple.com');

	// Defensive provider detection - if providerData is empty, refresh user data
	useEffect(() => {
		if (
			firebaseUser &&
			(!firebaseUser.providerData || firebaseUser.providerData.length === 0)
		) {
			(async () => {
				try {
					await refreshUserData();
				} catch (error) {
					logger.debug(
						'Failed to refresh user data for provider detection:',
						error
					);
				}
			})();
		}
	}, [firebaseUser, refreshUserData]);

	// Step titles and navigation
	const stepTitles = [
		'Why are you leaving?',
		'Tell us more',
		'About your data',
		'Verify & delete',
	];

	const canProceed = useMemo(() => {
		switch (currentStep) {
			case 0:
				return !!selectedReason;
			case 1:
				return true; // Optional feedback
			case 2:
				return true; // Optional export
			case 3:
				return confirmText.trim().toUpperCase() === 'DELETE';
			default:
				return false;
		}
	}, [currentStep, selectedReason, confirmText]);

	const nextStep = () => {
		if (canProceed && currentStep < 3) {
			setCurrentStep((prev) => prev + 1);
			setFormError(null);
		}
	};

	const prevStep = () => {
		if (!busy && currentStep > 0) {
			setCurrentStep((prev) => prev - 1);
			setFormError(null);
		}
	};

	// Submit feedback (non-blocking)
	const submitFeedback = useCallback(async () => {
		try {
			// Optional: Send feedback to your API
			// await ApiService.post('/feedback/account-deletion', {
			//   reason: selectedReason,
			//   feedback: additionalFeedback,
			//   exportData,
			// });
		} catch (error) {
			logger.debug('Failed to submit feedback:', error);
		}
	}, []);

	const handleVerifyIdentity = async () => {
		setFormError(null);
		if (confirmText.trim().toUpperCase() !== 'DELETE') {
			setFormError('Type DELETE to confirm before verifying your identity.');
			return;
		}
		if (usesPassword && password.trim().length < 6) {
			setFormError('Please enter your password.');
			return;
		}

		try {
			setBusy(true);
			if (usesPassword) {
				await reauthWithPassword(password.trim());
			} else if (usesGoogle) {
				await reauthWithGoogle();
			} else if (usesApple) {
				throw new Error(
					'Apple Sign-In reauthentication not yet available. Please contact support.'
				);
			} else {
				throw new Error('Unsupported sign-in method. Please contact support.');
			}
			setReauthComplete(true);
			await submitFeedback();
			Alert.alert(
				'Verified',
				'Identity verified. You can now confirm deletion.'
			);
		} catch (e: any) {
			logger.warn('Reauth failed:', e);
			setFormError(
				e?.code === 'auth/wrong-password'
					? 'Incorrect password. Please try again.'
					: e?.code === 'auth/popup-closed-by-user' ||
					  e?.message?.includes('cancel')
					? 'Verification was cancelled.'
					: e?.message || 'Verification failed. Please try again.'
			);
		} finally {
			setBusy(false);
		}
	};

	const handleFinalDelete = useCallback(() => {
		if (!(confirmText.trim().toUpperCase() === 'DELETE' && reauthComplete))
			return;

		Alert.alert(
			'Final Confirmation',
			'You will permanently lose all your budgets, goals, transactions and profile. This cannot be undone.',
			[
				{ text: 'Keep Account', style: 'cancel' },
				{
					text: 'Delete',
					style: 'destructive',
					onPress: async () => {
						try {
							setBusy(true);
							await deleteAccountAfterReauth();
							// Navigate to login immediately to avoid ProfileProvider unmount errors
							router.replace('/(auth)/login');
							// Show success message after a brief delay to ensure navigation completes
							setTimeout(() => {
								Alert.alert(
									'Account deleted',
									'Your account has been permanently deleted.'
								);
							}, 500);
						} catch (error: any) {
							logger.error('Delete error:', error);
							Alert.alert(
								'Error',
								error?.code === 'auth/requires-recent-login'
									? 'Please verify your identity again and retry.'
									: 'Failed to delete account. Please try again.'
							);
							setReauthComplete(false);
							setBusy(false);
						}
					},
				},
			]
		);
	}, [confirmText, reauthComplete, deleteAccountAfterReauth, router]);

	return (
		<SafeAreaView style={styles.container} edges={['top']}>
			{/* Header */}
			<View style={styles.header}>
				<BorderlessButton
					enabled={!busy}
					onPress={() => router.back()}
					style={styles.headerButton}
				>
					<Ionicons name="chevron-back" size={24} color="#111827" />
				</BorderlessButton>
				<Text style={styles.headerTitle}>{stepTitles[currentStep]}</Text>
				<View style={{ width: 24 }} />
			</View>

			{/* Progress Bar */}
			<View style={styles.progressContainer}>
				<View
					style={[
						styles.progressBar,
						{ width: `${((currentStep + 1) / 4) * 100}%` },
					]}
				/>
			</View>

			{/* Main Content Area */}
			<View style={styles.mainContent}>
				<ScrollView
					style={styles.scrollView}
					contentContainerStyle={styles.scrollContent}
					showsVerticalScrollIndicator={false}
				>
					{/* Step Navigation */}
					{currentStep > 0 && (
						<View style={styles.stepNavigation}>
							<RectButton
								style={styles.stepBackButton}
								onPress={prevStep}
								enabled={!busy}
							>
								<Ionicons name="chevron-back" size={20} color="#6B7280" />
								<Text style={styles.stepBackText}>Back</Text>
							</RectButton>
						</View>
					)}

					{/* Step 1: Reason Selection */}
					{currentStep === 0 && (
						<View style={[styles.stepCard, shadowCard]}>
							<Text style={styles.stepSubtitle}>
								Your feedback helps us improve.
							</Text>

							<View style={styles.reasonsList}>
								{DELETION_REASONS.map((reason) => (
									<RectButton
										key={reason.key}
										style={[
											styles.reasonOption,
											selectedReason === reason.key &&
												styles.reasonOptionSelected,
										]}
										onPress={() => setSelectedReason(reason.key)}
									>
										<View
											style={[
												styles.radioButton,
												selectedReason === reason.key &&
													styles.radioButtonSelected,
											]}
										/>
										<Text
											style={[
												styles.reasonText,
												selectedReason === reason.key &&
													styles.reasonTextSelected,
											]}
										>
											{reason.label}
										</Text>
									</RectButton>
								))}
							</View>
						</View>
					)}

					{/* Step 2: Additional Feedback */}
					{currentStep === 1 && (
						<View style={[styles.stepCard, shadowCard]}>
							<Text style={styles.stepSubtitle}>
								Totally optional, but it really helps us fix things.
							</Text>

							<View style={[styles.textAreaContainer, shadowLite]}>
								<TextInput
									style={styles.textArea}
									value={additionalFeedback}
									onChangeText={setAdditionalFeedback}
									multiline
									maxLength={500}
									placeholder="Your explanation is entirely optional…"
									placeholderTextColor="#9CA3AF"
									textAlignVertical="top"
								/>
							</View>
							<Text style={styles.charCount}>
								{additionalFeedback.length}/500
							</Text>
						</View>
					)}

					{/* Step 3: Data Export */}
					{currentStep === 2 && (
						<View style={[styles.stepCard, shadowCard]}>
							<Text style={styles.stepSubtitle}>
								You may request a copy of your data to be sent to your email
								before deletion.
							</Text>

							<RectButton
								style={styles.checkboxContainer}
								onPress={() => setExportData(!exportData)}
							>
								<View
									style={[
										styles.checkbox,
										exportData && styles.checkboxSelected,
									]}
								>
									{exportData && (
										<Ionicons name="checkmark" size={16} color="#fff" />
									)}
								</View>
								<Text style={styles.checkboxText}>
									Yes, send my data to my email
								</Text>
							</RectButton>

							{firebaseUser?.email && (
								<View style={styles.emailPill}>
									<Ionicons name="mail" size={16} color="#1F2937" />
									<Text style={styles.emailText}>{firebaseUser.email}</Text>
								</View>
							)}

							<Text style={styles.disclaimer}>
								Note: Export is processed asynchronously and may take up to 24
								hours. Deleting your account will not proceed until the export
								is complete if selected.
							</Text>
						</View>
					)}

					{/* Step 4: Verification & Deletion */}
					{currentStep === 3 && (
						<View style={[styles.stepCard, shadowCard]}>
							<Text style={styles.stepSubtitle}>
								Type <Text style={styles.monoText}>DELETE</Text> and verify your
								identity to continue.
							</Text>

							<TextInput
								style={styles.input}
								value={confirmText}
								onChangeText={setConfirmText}
								placeholder="Type DELETE"
								placeholderTextColor="#9CA3AF"
								autoCapitalize="characters"
								keyboardType={
									Platform.OS === 'ios' ? 'ascii-capable' : 'default'
								}
							/>

							{usesPassword ? (
								<View style={styles.passwordSection}>
									<Text style={styles.inputLabel}>Password</Text>
									<View style={styles.passwordContainer}>
										<TextInput
											style={styles.passwordInput}
											value={password}
											onChangeText={setPassword}
											placeholder="Enter your password"
											placeholderTextColor="#9CA3AF"
											secureTextEntry={!showPassword}
											autoCapitalize="none"
										/>
										<BorderlessButton
											onPress={() => setShowPassword(!showPassword)}
											style={styles.eyeButton}
										>
											<Ionicons
												name={showPassword ? 'eye-off' : 'eye'}
												size={20}
												color="#6B7280"
											/>
										</BorderlessButton>
									</View>

									<RectButton
										style={[
											styles.verifyButton,
											(!canProceed || password.length < 1 || busy) &&
												styles.buttonDisabled,
										]}
										onPress={handleVerifyIdentity}
										enabled={canProceed && !busy}
									>
										{busy ? (
											<ActivityIndicator size="small" color="#fff" />
										) : (
											<Text style={styles.verifyButtonText}>
												{reauthComplete ? 'Verified ✓' : 'Verify'}
											</Text>
										)}
									</RectButton>
								</View>
							) : (
								<RectButton
									style={[
										styles.providerButton,
										(!canProceed || busy) && styles.buttonDisabled,
									]}
									onPress={handleVerifyIdentity}
									enabled={canProceed && !busy}
								>
									{busy ? (
										<ActivityIndicator size="small" color="#1F2937" />
									) : (
										<>
											{usesGoogle && (
												<Ionicons
													name="logo-google"
													size={20}
													color="#1D4ED8"
												/>
											)}
											<Text style={styles.providerButtonText}>
												Verify with {usesGoogle ? 'Google' : 'your provider'}
											</Text>
										</>
									)}
								</RectButton>
							)}

							{formError && <Text style={styles.errorText}>{formError}</Text>}

							{reauthComplete && (
								<View style={styles.verifiedPill}>
									<Ionicons name="checkmark-circle" size={18} color="#16A34A" />
									<Text style={styles.verifiedText}>Identity verified</Text>
								</View>
							)}

							<RectButton
								style={[
									styles.deleteButton,
									!(canProceed && reauthComplete) && styles.buttonDisabled,
								]}
								onPress={handleFinalDelete}
								enabled={canProceed && reauthComplete}
							>
								<Text style={styles.deleteButtonText}>Confirm deletion</Text>
							</RectButton>

							<RectButton
								style={styles.cancelButton}
								onPress={() => router.back()}
							>
								<Text style={styles.cancelButtonText}>Keep account</Text>
							</RectButton>
						</View>
					)}
				</ScrollView>

				{/* Bottom Navigation */}
				{currentStep < 3 && (
					<View style={styles.bottomNavigation}>
						<RectButton
							style={[styles.navButton, styles.cancelNavButton]}
							onPress={() => router.back()}
						>
							<Text style={styles.cancelNavButtonText}>Cancel</Text>
						</RectButton>
						<RectButton
							style={[
								styles.navButton,
								styles.continueNavButton,
								!canProceed && styles.buttonDisabled,
							]}
							onPress={nextStep}
							enabled={canProceed}
						>
							<Text style={styles.continueNavButtonText}>Continue</Text>
						</RectButton>
					</View>
				)}
			</View>
		</SafeAreaView>
	);
}

const shadowCard = Platform.select({
	ios: {
		shadowColor: '#000',
		shadowOpacity: 0.07,
		shadowOffset: { width: 0, height: 6 },
		shadowRadius: 16,
	},
	android: { elevation: 2 },
});

const shadowLite = Platform.select({
	ios: {
		shadowColor: '#000',
		shadowOpacity: 0.05,
		shadowOffset: { width: 0, height: 3 },
		shadowRadius: 8,
	},
	android: { elevation: 1 },
});

const styles = StyleSheet.create({
	container: {
		flex: 1,
		backgroundColor: '#fff',
	},

	// Header
	header: {
		height: 56,
		flexDirection: 'row',
		alignItems: 'center',
		paddingHorizontal: 16,
		backgroundColor: '#fff',
		borderBottomWidth: StyleSheet.hairlineWidth,
		borderBottomColor: '#E5E7EB',
	},
	headerButton: {
		width: 24,
		height: 24,
		alignItems: 'center',
		justifyContent: 'center',
	},
	headerTitle: {
		flex: 1,
		textAlign: 'center',
		fontSize: 18,
		fontWeight: '800',
		color: '#111827',
	},

	// Progress
	progressContainer: {
		height: 4,
		backgroundColor: '#E5E7EB',
		marginHorizontal: 16,
		borderRadius: 999,
	},
	progressBar: {
		height: 4,
		backgroundColor: '#111827',
		borderRadius: 999,
	},

	// Main Content Area
	mainContent: {
		flex: 1,
		flexDirection: 'column',
	},
	scrollView: {
		flex: 1,
	},
	scrollContent: {
		padding: 16,
		paddingBottom: 24,
	},

	// Step Navigation
	stepNavigation: {
		marginBottom: 16,
	},
	stepBackButton: {
		flexDirection: 'row',
		alignItems: 'center',
		alignSelf: 'flex-start',
		paddingVertical: 8,
		paddingHorizontal: 12,
		borderRadius: 8,
		backgroundColor: '#F3F4F6',
		gap: 6,
	},
	stepBackText: {
		fontSize: 14,
		fontWeight: '600',
		color: '#6B7280',
	},

	// Step Cards
	stepCard: {
		backgroundColor: '#fff',
		borderRadius: 14,
		padding: 20,
		marginTop: 12,
		borderWidth: StyleSheet.hairlineWidth,
		borderColor: '#E5E7EB',
	},
	stepTitle: {
		fontSize: 20,
		fontWeight: '800',
		color: '#111827',
		marginBottom: 6,
	},
	stepSubtitle: {
		fontSize: 14,
		color: '#6B7280',
		marginBottom: 16,
	},

	// Reason Selection
	reasonsList: {
		gap: 12,
	},
	reasonOption: {
		flexDirection: 'row',
		alignItems: 'center',
		paddingVertical: 12,
		paddingHorizontal: 16,
		borderRadius: 12,
		borderWidth: 1,
		borderColor: '#E5E7EB',
		backgroundColor: '#fff',
	},
	reasonOptionSelected: {
		borderColor: '#111827',
		backgroundColor: '#F9FAFB',
	},
	radioButton: {
		width: 20,
		height: 20,
		borderRadius: 10,
		borderWidth: 2,
		borderColor: '#CBD5E1',
		backgroundColor: '#fff',
		marginRight: 12,
	},
	radioButtonSelected: {
		borderColor: '#111827',
		backgroundColor: '#111827',
	},
	reasonText: {
		flex: 1,
		fontSize: 16,
		fontWeight: '600',
		color: '#111827',
	},
	reasonTextSelected: {
		color: '#111827',
	},

	// Text Area
	textAreaContainer: {
		borderRadius: 12,
		borderWidth: 1,
		borderColor: '#E5E7EB',
		backgroundColor: '#fff',
	},
	textArea: {
		minHeight: 120,
		padding: 16,
		fontSize: 16,
		color: '#111827',
	},
	charCount: {
		alignSelf: 'flex-end',
		marginTop: 8,
		fontSize: 12,
		color: '#9CA3AF',
	},

	// Checkbox
	checkboxContainer: {
		flexDirection: 'row',
		alignItems: 'center',
		paddingVertical: 12,
		paddingHorizontal: 16,
		borderRadius: 12,
		borderWidth: 1,
		borderColor: '#E5E7EB',
		backgroundColor: '#fff',
		marginTop: 12,
	},
	checkbox: {
		width: 22,
		height: 22,
		borderRadius: 6,
		borderWidth: 2,
		borderColor: '#CBD5E1',
		backgroundColor: '#fff',
		alignItems: 'center',
		justifyContent: 'center',
		marginRight: 12,
	},
	checkboxSelected: {
		borderColor: '#111827',
		backgroundColor: '#111827',
	},
	checkboxText: {
		flex: 1,
		fontSize: 16,
		fontWeight: '600',
		color: '#111827',
	},

	// Email Pill
	emailPill: {
		flexDirection: 'row',
		alignItems: 'center',
		alignSelf: 'flex-start',
		marginTop: 12,
		paddingHorizontal: 12,
		paddingVertical: 8,
		borderRadius: 999,
		backgroundColor: '#F3F4F6',
		borderWidth: 1,
		borderColor: '#E5E7EB',
		gap: 6,
	},
	emailText: {
		fontSize: 13,
		fontWeight: '600',
		color: '#1F2937',
	},

	// Disclaimer
	disclaimer: {
		marginTop: 12,
		fontSize: 12,
		color: '#6B7280',
		lineHeight: 16,
	},

	// Inputs
	input: {
		height: 48,
		borderRadius: 12,
		borderWidth: 1,
		borderColor: '#E5E7EB',
		backgroundColor: '#fff',
		paddingHorizontal: 16,
		fontSize: 16,
		color: '#111827',
		marginTop: 12,
	},
	inputLabel: {
		fontSize: 14,
		fontWeight: '700',
		color: '#374151',
		marginTop: 12,
	},
	monoText: {
		fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
		fontWeight: '800',
	},

	// Password
	passwordSection: {
		marginTop: 12,
	},
	passwordContainer: {
		flexDirection: 'row',
		alignItems: 'center',
		height: 48,
		borderRadius: 12,
		borderWidth: 1,
		borderColor: '#E5E7EB',
		backgroundColor: '#fff',
		marginTop: 6,
	},
	passwordInput: {
		flex: 1,
		height: 48,
		paddingHorizontal: 16,
		fontSize: 16,
		color: '#111827',
	},
	eyeButton: {
		paddingHorizontal: 16,
		height: 48,
		alignItems: 'center',
		justifyContent: 'center',
	},

	// Buttons
	verifyButton: {
		height: 48,
		borderRadius: 12,
		backgroundColor: '#111827',
		alignItems: 'center',
		justifyContent: 'center',
		marginTop: 12,
	},
	verifyButtonText: {
		color: '#fff',
		fontSize: 16,
		fontWeight: '800',
	},
	providerButton: {
		height: 48,
		borderRadius: 12,
		backgroundColor: '#fff',
		borderWidth: 1,
		borderColor: '#E5E7EB',
		alignItems: 'center',
		justifyContent: 'center',
		marginTop: 12,
		flexDirection: 'row',
		gap: 10,
	},
	providerButtonText: {
		fontSize: 16,
		fontWeight: '700',
		color: '#1F2937',
	},
	deleteButton: {
		height: 48,
		borderRadius: 12,
		backgroundColor: '#EF4444',
		alignItems: 'center',
		justifyContent: 'center',
		marginTop: 16,
	},
	deleteButtonText: {
		color: '#fff',
		fontSize: 16,
		fontWeight: '800',
	},
	cancelButton: {
		height: 48,
		borderRadius: 12,
		backgroundColor: '#fff',
		borderWidth: 1,
		borderColor: '#E5E7EB',
		alignItems: 'center',
		justifyContent: 'center',
		marginTop: 12,
	},
	cancelButtonText: {
		color: '#374151',
		fontSize: 16,
		fontWeight: '700',
	},

	// Bottom Navigation
	bottomNavigation: {
		flexDirection: 'row',
		paddingHorizontal: 16,
		paddingVertical: 12,
		backgroundColor: '#F8FAFC',
		borderTopWidth: StyleSheet.hairlineWidth,
		borderTopColor: '#E5E7EB',
		gap: 12,
	},
	navButton: {
		flex: 1,
		height: 48,
		borderRadius: 12,
		alignItems: 'center',
		justifyContent: 'center',
	},
	cancelNavButton: {
		backgroundColor: '#fff',
		borderWidth: 1,
		borderColor: '#E5E7EB',
	},
	cancelNavButtonText: {
		color: '#374151',
		fontSize: 16,
		fontWeight: '700',
	},
	continueNavButton: {
		backgroundColor: '#111827',
	},
	continueNavButtonText: {
		color: '#fff',
		fontSize: 16,
		fontWeight: '800',
	},

	// Status
	verifiedPill: {
		flexDirection: 'row',
		alignItems: 'center',
		alignSelf: 'flex-start',
		marginTop: 12,
		paddingHorizontal: 12,
		paddingVertical: 8,
		borderRadius: 999,
		backgroundColor: '#ECFDF5',
		borderWidth: 1,
		borderColor: '#A7F3D0',
		gap: 6,
	},
	verifiedText: {
		fontSize: 13,
		fontWeight: '700',
		color: '#065F46',
	},
	errorText: {
		color: '#DC2626',
		fontSize: 12,
		marginTop: 8,
	},

	// States
	buttonDisabled: {
		opacity: 0.6,
	},
});
