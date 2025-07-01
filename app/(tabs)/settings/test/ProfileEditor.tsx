import React, { useState } from 'react';
import {
	View,
	Text,
	TextInput,
	StyleSheet,
	TouchableOpacity,
	Alert,
	ScrollView,
	ActivityIndicator,
	SafeAreaView,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useProfile } from '../../../../src/context/profileContext';

export default function ProfileEditorScreen() {
	const router = useRouter();
	const { profile, updateProfile, loading, error } = useProfile();
	const [isUpdating, setIsUpdating] = useState(false);
	const [formData, setFormData] = useState({
		firstName: profile?.firstName || '',
		lastName: profile?.lastName || '',
		ageRange: profile?.ageRange || '',
		monthlyIncome: profile?.monthlyIncome?.toString() || '',
		financialGoal: profile?.financialGoal || '',
		savings: profile?.savings?.toString() || '',
		debt: profile?.debt?.toString() || '',
		riskTolerance: profile?.riskProfile?.tolerance || '',
		experience: profile?.riskProfile?.experience || '',
	});

	const handleSave = async () => {
		if (!profile) return;

		try {
			setIsUpdating(true);

			const updates = {
				firstName: formData.firstName,
				lastName: formData.lastName,
				ageRange: formData.ageRange,
				monthlyIncome: parseFloat(formData.monthlyIncome) || 0,
				financialGoal: formData.financialGoal,
				savings: parseFloat(formData.savings) || 0,
				debt: parseFloat(formData.debt) || 0,
				riskProfile: {
					tolerance: formData.riskTolerance,
					experience: formData.experience,
				},
			};

			await updateProfile(updates);
			Alert.alert('Success', 'Profile updated successfully!');
			router.back();
		} catch (err) {
			Alert.alert('Error', 'Failed to update profile. Please try again.');
		} finally {
			setIsUpdating(false);
		}
	};

	const handleCancel = () => {
		// Reset form data to original values
		setFormData({
			firstName: profile?.firstName || '',
			lastName: profile?.lastName || '',
			ageRange: profile?.ageRange || '',
			monthlyIncome: profile?.monthlyIncome?.toString() || '',
			financialGoal: profile?.financialGoal || '',
			savings: profile?.savings?.toString() || '',
			debt: profile?.debt?.toString() || '',
			riskTolerance: profile?.riskProfile?.tolerance || '',
			experience: profile?.riskProfile?.experience || '',
		});
		router.back();
	};

	if (loading) {
		return (
			<SafeAreaView style={styles.loadingContainer}>
				<ActivityIndicator size="large" color="#007ACC" />
				<Text style={styles.loadingText}>Loading profile...</Text>
			</SafeAreaView>
		);
	}

	if (error) {
		return (
			<SafeAreaView style={styles.errorContainer}>
				<Text style={styles.errorText}>Error: {error}</Text>
				<TouchableOpacity
					style={styles.retryButton}
					onPress={() => router.back()}
				>
					<Text style={styles.retryButtonText}>Go Back</Text>
				</TouchableOpacity>
			</SafeAreaView>
		);
	}

	if (!profile) {
		return (
			<SafeAreaView style={styles.errorContainer}>
				<Text style={styles.errorText}>No profile found</Text>
				<TouchableOpacity
					style={styles.retryButton}
					onPress={() => router.back()}
				>
					<Text style={styles.retryButtonText}>Go Back</Text>
				</TouchableOpacity>
			</SafeAreaView>
		);
	}

	return (
		<SafeAreaView style={styles.container}>
			{/* Header */}
			<View style={styles.header}>
				<TouchableOpacity onPress={handleCancel} style={styles.backButton}>
					<Ionicons name="arrow-back" size={24} color="#333" />
				</TouchableOpacity>
				<Text style={styles.headerTitle}>Edit Profile</Text>
				<TouchableOpacity
					onPress={handleSave}
					style={[styles.saveButton, isUpdating && styles.saveButtonDisabled]}
					disabled={isUpdating}
				>
					{isUpdating ? (
						<ActivityIndicator size="small" color="#fff" />
					) : (
						<Text style={styles.saveButtonText}>Save</Text>
					)}
				</TouchableOpacity>
			</View>

			<ScrollView
				style={styles.scrollView}
				showsVerticalScrollIndicator={false}
			>
				<View style={styles.section}>
					<Text style={styles.sectionTitle}>Personal Information</Text>

					<View style={styles.inputGroup}>
						<Text style={styles.label}>First Name</Text>
						<TextInput
							style={styles.input}
							value={formData.firstName}
							onChangeText={(text) =>
								setFormData((prev) => ({ ...prev, firstName: text }))
							}
							placeholder="Enter first name"
						/>
					</View>

					<View style={styles.inputGroup}>
						<Text style={styles.label}>Last Name</Text>
						<TextInput
							style={styles.input}
							value={formData.lastName}
							onChangeText={(text) =>
								setFormData((prev) => ({ ...prev, lastName: text }))
							}
							placeholder="Enter last name"
						/>
					</View>

					<View style={styles.inputGroup}>
						<Text style={styles.label}>Age Range</Text>
						<TextInput
							style={styles.input}
							value={formData.ageRange}
							onChangeText={(text) =>
								setFormData((prev) => ({ ...prev, ageRange: text }))
							}
							placeholder="e.g., 25-35"
						/>
					</View>
				</View>

				<View style={styles.section}>
					<Text style={styles.sectionTitle}>Financial Information</Text>

					<View style={styles.inputGroup}>
						<Text style={styles.label}>Monthly Income</Text>
						<TextInput
							style={styles.input}
							value={formData.monthlyIncome}
							onChangeText={(text) =>
								setFormData((prev) => ({ ...prev, monthlyIncome: text }))
							}
							placeholder="Enter monthly income"
							keyboardType="numeric"
						/>
					</View>

					<View style={styles.inputGroup}>
						<Text style={styles.label}>Financial Goal</Text>
						<TextInput
							style={styles.input}
							value={formData.financialGoal}
							onChangeText={(text) =>
								setFormData((prev) => ({ ...prev, financialGoal: text }))
							}
							placeholder="e.g., save_money, invest, debt_free"
						/>
					</View>

					<View style={styles.inputGroup}>
						<Text style={styles.label}>Current Savings</Text>
						<TextInput
							style={styles.input}
							value={formData.savings}
							onChangeText={(text) =>
								setFormData((prev) => ({ ...prev, savings: text }))
							}
							placeholder="Enter current savings"
							keyboardType="numeric"
						/>
					</View>

					<View style={styles.inputGroup}>
						<Text style={styles.label}>Current Debt</Text>
						<TextInput
							style={styles.input}
							value={formData.debt}
							onChangeText={(text) =>
								setFormData((prev) => ({ ...prev, debt: text }))
							}
							placeholder="Enter current debt"
							keyboardType="numeric"
						/>
					</View>
				</View>

				<View style={styles.section}>
					<Text style={styles.sectionTitle}>Risk Profile</Text>

					<View style={styles.inputGroup}>
						<Text style={styles.label}>Risk Tolerance</Text>
						<TextInput
							style={styles.input}
							value={formData.riskTolerance}
							onChangeText={(text) =>
								setFormData((prev) => ({ ...prev, riskTolerance: text }))
							}
							placeholder="e.g., conservative, moderate, aggressive"
						/>
					</View>

					<View style={styles.inputGroup}>
						<Text style={styles.label}>Investment Experience</Text>
						<TextInput
							style={styles.input}
							value={formData.experience}
							onChangeText={(text) =>
								setFormData((prev) => ({ ...prev, experience: text }))
							}
							placeholder="e.g., beginner, intermediate, advanced"
						/>
					</View>
				</View>
			</ScrollView>
		</SafeAreaView>
	);
}

const styles = StyleSheet.create({
	container: {
		flex: 1,
		backgroundColor: '#fff',
	},
	loadingContainer: {
		flex: 1,
		justifyContent: 'center',
		alignItems: 'center',
		backgroundColor: '#fff',
	},
	loadingText: {
		marginTop: 16,
		fontSize: 16,
		color: '#666',
	},
	errorContainer: {
		flex: 1,
		justifyContent: 'center',
		alignItems: 'center',
		padding: 20,
		backgroundColor: '#fff',
	},
	errorText: {
		fontSize: 16,
		color: '#dc2626',
		textAlign: 'center',
		marginBottom: 20,
	},
	retryButton: {
		backgroundColor: '#007ACC',
		paddingHorizontal: 20,
		paddingVertical: 12,
		borderRadius: 8,
	},
	retryButtonText: {
		color: '#fff',
		fontSize: 16,
		fontWeight: '500',
	},
	header: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
		paddingHorizontal: 16,
		paddingVertical: 12,
		borderBottomWidth: 1,
		borderBottomColor: '#f0f0f0',
	},
	backButton: {
		padding: 8,
	},
	headerTitle: {
		fontSize: 18,
		fontWeight: '600',
		color: '#333',
	},
	saveButton: {
		backgroundColor: '#007ACC',
		paddingHorizontal: 16,
		paddingVertical: 8,
		borderRadius: 6,
	},
	saveButtonDisabled: {
		backgroundColor: '#ccc',
	},
	saveButtonText: {
		color: '#fff',
		fontSize: 16,
		fontWeight: '500',
	},
	scrollView: {
		flex: 1,
	},
	section: {
		padding: 20,
		borderBottomWidth: 1,
		borderBottomColor: '#f0f0f0',
	},
	sectionTitle: {
		fontSize: 18,
		fontWeight: 'bold',
		color: '#333',
		marginBottom: 16,
	},
	inputGroup: {
		marginBottom: 16,
	},
	label: {
		fontSize: 14,
		fontWeight: '500',
		color: '#666',
		marginBottom: 8,
	},
	input: {
		borderWidth: 1,
		borderColor: '#ddd',
		borderRadius: 8,
		padding: 12,
		fontSize: 16,
		backgroundColor: '#f9f9f9',
	},
});
