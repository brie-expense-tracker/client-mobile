import React, { useState } from 'react';
import {
	View,
	Text,
	StyleSheet,
	TouchableOpacity,
	ScrollView,
	Modal,
	Alert,
	ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
	useSharedValue,
	useAnimatedStyle,
	withSpring,
	runOnJS,
} from 'react-native-reanimated';

type Row = {
	label: string;
	route?: string; // optional – map to your screen names
	badge?: string; // small green sub-label (e.g. "Face ID")
	action?: () => void; // custom action instead of navigation
};

type Section = {
	title: string;
	description?: string;
	rows: Row[];
};

export default function PrivacySecurityScreen() {
	const router = useRouter();
	const [showFaceIdModal, setShowFaceIdModal] = useState(false);
	const [showOverlay, setShowOverlay] = useState(false);
	const [isEnabling, setIsEnabling] = useState(false);

	// Animation values for pan gesture
	const translateY = useSharedValue(0);
	const modalHeight = useSharedValue(0);

	const handleEnableFaceId = async () => {
		setIsEnabling(true);

		try {
			// Simulate Face ID setup process
			await new Promise((resolve) => setTimeout(resolve, 2000));

			// Here you would integrate with actual Face ID setup API
			// For now, we'll simulate success
			Alert.alert(
				'Face ID Enabled',
				'Face ID has been successfully enabled for your account.',
				[
					{
						text: 'OK',
						onPress: () => {
							setShowFaceIdModal(false);
							setShowOverlay(false);
							setIsEnabling(false);
						},
					},
				]
			);
		} catch (error) {
			Alert.alert('Error', 'Failed to enable Face ID. Please try again.', [
				{
					text: 'OK',
					onPress: () => {
						setIsEnabling(false);
					},
				},
			]);
		}
	};

	const handleCancelFaceId = () => {
		if (isEnabling) {
			Alert.alert(
				'Cancel Face ID Setup',
				'Are you sure you want to cancel? Face ID setup will be stopped.',
				[
					{
						text: 'Continue Setup',
						style: 'cancel',
					},
					{
						text: 'Cancel',
						style: 'destructive',
						onPress: () => {
							setShowFaceIdModal(false);
							setShowOverlay(false);
							setIsEnabling(false);
						},
					},
				]
			);
		} else {
			setShowFaceIdModal(false);
			setShowOverlay(false);
		}
	};

	const closeModal = () => {
		setShowFaceIdModal(false);
		setShowOverlay(false);
		translateY.value = 0;
	};

	const panGesture = Gesture.Pan()
		.onStart(() => {
			// Store initial position
		})
		.onUpdate((event) => {
			// Only allow downward swipes with a maximum limit
			if (event.translationY > 0) {
				// Limit the maximum downward movement to 150px with damping
				const dampedTranslation = event.translationY * 0.4; // 60% of the actual translation
				translateY.value = Math.min(dampedTranslation, 150);
			}
		})
		.onEnd((event) => {
			// If swiped down more than 50px or with velocity > 500, close modal

			// Snap back to original position with faster spring
			translateY.value = withSpring(0, {
				stiffness: 500,
				damping: 50,
				mass: 0.8,
			});
		});

	const animatedStyle = useAnimatedStyle(() => {
		return {
			transform: [{ translateY: translateY.value }],
		};
	});

	const sections: Section[] = [
		{
			title: 'Security',
			description: 'Protect your account with additional layers of security.',
			rows: [
				{
					label: 'Change Password',
					route: './privacyandsecurity/changePassword',
				},
				// {
				// 	label: 'Enable Face ID',
				// 	action: () => {
				// 		setShowOverlay(true);
				// 		setShowFaceIdModal(true);
				// 	},
				// },
			],
		},
		{
			title: 'Privacy',
			description: 'Manage how your data is used.',
			rows: [
				// { label: 'Manage profile visibility', route: 'ProfileVisibility' },
				// { label: 'Blocking', route: 'Blocking' },
				{
					label: 'Download your data',
					route: './privacyandsecurity/downloadData',
				},
				{
					label: 'Privacy Policy',
					route: './privacyandsecurity/privacyPolicy',
				},
			],
		},
	];

	const renderRow = (row: Row, index: number) => (
		<TouchableOpacity
			key={row.label}
			onPress={() => {
				if (row.action) {
					row.action();
				} else if (row.route) {
					router.push(row.route as any);
				}
			}}
			style={[
				styles.row,
				// add a divider except on the last row of a section
				index !== -1 && styles.rowDivider,
			]}
			activeOpacity={0.6}
		>
			<View>
				<Text style={styles.rowLabel}>{row.label}</Text>
				{row.badge && <Text style={styles.badge}>{row.badge}</Text>}
			</View>
			<Ionicons name="chevron-forward" size={20} color="#C7C7CC" />
		</TouchableOpacity>
	);

	return (
		<View style={styles.container}>
			<ScrollView
				contentInsetAdjustmentBehavior="automatic"
				showsVerticalScrollIndicator={false}
			>
				{sections.map((section) => (
					<View key={section.title} style={styles.section}>
						<Text style={styles.sectionTitle}>{section.title}</Text>

						{section.description && (
							<Text style={styles.sectionDesc}>{section.description}</Text>
						)}

						<View style={styles.card}>
							{section.rows.map((row, idx) =>
								renderRow(row, idx === section.rows.length - 1 ? -1 : idx)
							)}
						</View>
					</View>
				))}

				{/* Keep a little space at bottom so the last row isn't flush */}
				<View style={{ height: 48 }} />
			</ScrollView>

			{/* Enable Face ID Modal */}
			<Modal
				visible={showFaceIdModal}
				transparent={true}
				animationType="slide"
				statusBarTranslucent={true}
			>
				<View
					style={[
						styles.modalOverlay,
						{
							backgroundColor: showOverlay
								? 'rgba(0, 0, 0, 0.5)'
								: 'transparent',
						},
					]}
				>
					<GestureDetector gesture={panGesture}>
						<Animated.View style={[styles.modalContent, animatedStyle]}>
							{/* Handle bar */}
							<View style={styles.handleBar} />

							{/* Header */}
							<View style={styles.modalHeader}>
								<View style={styles.modalHeaderLeft}>
									<Text style={styles.modalHeaderTitle}>Enable Face ID</Text>
								</View>
								<TouchableOpacity
									onPress={handleCancelFaceId}
									style={styles.closeButton}
								>
									<Ionicons name="close" size={24} color="#666" />
								</TouchableOpacity>
							</View>

							<View style={styles.iconContainer}>
								<View style={styles.iconBackground}>
									<Ionicons name="scan" size={48} color="#007AFF" />
								</View>
							</View>

							<Text style={styles.modalTitle}>Enable Face ID</Text>
							<Text style={styles.modalDescription}>
								Use Face ID to quickly and securely sign in to your account.
								Your face data is stored securely on your device and never
								shared.
							</Text>

							<View style={styles.benefitsContainer}>
								<View style={styles.benefitItem}>
									<Ionicons name="shield-checkmark" size={20} color="#34C759" />
									<Text style={styles.benefitText}>
										Secure biometric authentication
									</Text>
								</View>
								<View style={styles.benefitItem}>
									<Ionicons name="flash" size={20} color="#34C759" />
									<Text style={styles.benefitText}>
										Quick and convenient sign-in
									</Text>
								</View>
								<View style={styles.benefitItem}>
									<Ionicons name="lock-closed" size={20} color="#34C759" />
									<Text style={styles.benefitText}>
										Your data stays on your device
									</Text>
								</View>
							</View>

							<TouchableOpacity
								style={styles.createButton}
								onPress={handleEnableFaceId}
								activeOpacity={0.8}
							>
								<Text style={styles.createButtonText}>Enable Face ID</Text>
							</TouchableOpacity>

							<TouchableOpacity
								style={styles.cancelButton}
								onPress={handleCancelFaceId}
							>
								<Text style={styles.cancelButtonText}>Cancel</Text>
							</TouchableOpacity>
						</Animated.View>
					</GestureDetector>
				</View>
			</Modal>

			{/* Loading Modal */}
			<Modal
				visible={isEnabling}
				transparent={true}
				animationType="fade"
				statusBarTranslucent={true}
			>
				<View style={styles.loadingOverlay}>
					<View style={styles.loadingContent}>
						<ActivityIndicator size="large" color="#007AFF" />
						<Text style={styles.loadingTitle}>Setting Up Face ID...</Text>
						<Text style={styles.loadingDescription}>
							Please follow the prompts on your device to set up Face ID.
						</Text>
						<TouchableOpacity
							style={styles.loadingCancelButton}
							onPress={handleCancelFaceId}
						>
							<Text style={styles.loadingCancelButtonText}>Cancel</Text>
						</TouchableOpacity>
					</View>
				</View>
			</Modal>
		</View>
	);
}

const styles = StyleSheet.create({
	container: { flex: 1, backgroundColor: '#f7f7f7' },

	/* Section heading */
	section: { paddingHorizontal: 20, marginTop: 24 },
	sectionTitle: {
		fontSize: 28,
		fontWeight: '700',
		color: '#000',
		marginBottom: 8,
	},
	sectionDesc: {
		fontSize: 15,
		color: '#555',
		marginBottom: 16,
		lineHeight: 21,
	},

	/* Card wrapper around rows */
	card: {
		borderRadius: 12,
		overflow: 'hidden',
		backgroundColor: '#fff',
		/* subtle shadow (iOS) */
		shadowColor: '#000',
		shadowOpacity: 0.04,
		shadowRadius: 6,
		shadowOffset: { width: 0, height: 2 },
		/* subtle shadow (Android) */
		elevation: 1,
	},

	/* Individual row */
	row: {
		flexDirection: 'row',
		alignItems: 'center',
		paddingHorizontal: 16,
		paddingVertical: 12,
		justifyContent: 'space-between',
		height: 56,
	},
	rowDivider: {
		borderBottomWidth: 1,
		borderColor: '#efefef',
	},
	rowLabel: { fontSize: 16, fontWeight: '400' },

	/* Sub-label (e.g. "Face ID") */
	badge: {
		marginTop: 4,
		fontSize: 13,
		color: '#05c000', // Robinhood-like green
		fontWeight: '600',
	},

	/* Modal Styles */
	modalOverlay: {
		flex: 1,
		justifyContent: 'flex-end',
	},
	modalContent: {
		backgroundColor: '#fff',
		paddingHorizontal: 24,
		paddingTop: 20,
		paddingBottom: 40,
		flex: 1,
		marginTop: 48,
		borderTopLeftRadius: 20,
		borderTopRightRadius: 20,
		marginBottom: -100,
	},
	handleBar: {
		width: 36,
		height: 5,
		backgroundColor: '#e0e0e0',
		borderRadius: 2.5,
		alignSelf: 'center',
		marginBottom: 20,
	},
	modalHeader: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
		marginBottom: 32,
	},
	modalHeaderLeft: {
		flex: 1,
	},
	modalHeaderTitle: {
		fontSize: 20,
		fontWeight: '600',
		color: '#000',
	},
	closeButton: {
		padding: 4,
	},
	iconContainer: {
		alignItems: 'center',
		marginBottom: 32,
	},
	iconBackground: {
		width: 100,
		height: 100,
		borderRadius: 50,
		backgroundColor: '#f0f8ff',
		alignItems: 'center',
		justifyContent: 'center',
	},
	modalTitle: {
		fontSize: 28,
		fontWeight: '700',
		color: '#000',
		marginBottom: 16,
		textAlign: 'center',
	},
	modalDescription: {
		fontSize: 16,
		color: '#666',
		textAlign: 'center',
		lineHeight: 24,
		marginBottom: 32,
		paddingHorizontal: 16,
	},
	benefitsContainer: {
		width: '100%',
		marginBottom: 40,
	},
	benefitItem: {
		flexDirection: 'row',
		alignItems: 'center',
		marginBottom: 16,
		paddingHorizontal: 16,
	},
	benefitText: {
		fontSize: 16,
		color: '#333',
		marginLeft: 12,
		fontWeight: '500',
	},
	createButton: {
		backgroundColor: '#007AFF',
		paddingVertical: 16,
		paddingHorizontal: 32,
		borderRadius: 12,
		marginBottom: 16,
		width: '100%',
		alignItems: 'center',
	},
	createButtonText: {
		color: '#fff',
		fontSize: 17,
		fontWeight: '600',
	},
	cancelButton: {
		paddingVertical: 16,
		paddingHorizontal: 32,
		alignItems: 'center',
	},
	cancelButtonText: {
		color: '#007AFF',
		fontSize: 17,
		fontWeight: '500',
	},

	/* Loading Modal Styles */
	loadingOverlay: {
		flex: 1,
		backgroundColor: 'rgba(0, 0, 0, 0.5)',
		justifyContent: 'center',
		alignItems: 'center',
		paddingHorizontal: 40,
	},
	loadingContent: {
		backgroundColor: '#fff',
		borderRadius: 16,
		padding: 32,
		alignItems: 'center',
		width: '100%',
		maxWidth: 320,
		shadowColor: '#000',
		shadowOffset: {
			width: 0,
			height: 10,
		},
		shadowOpacity: 0.25,
		shadowRadius: 20,
		elevation: 10,
	},
	loadingTitle: {
		fontSize: 20,
		fontWeight: '600',
		color: '#000',
		marginTop: 16,
		marginBottom: 8,
		textAlign: 'center',
	},
	loadingDescription: {
		fontSize: 16,
		color: '#666',
		textAlign: 'center',
		lineHeight: 22,
		marginBottom: 24,
	},
	loadingCancelButton: {
		paddingVertical: 12,
		paddingHorizontal: 24,
	},
	loadingCancelButtonText: {
		color: '#FF3B30',
		fontSize: 17,
		fontWeight: '500',
	},
});
