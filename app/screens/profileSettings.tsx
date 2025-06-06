import React, { useState, useEffect } from 'react';
import {
	SafeAreaView,
	View,
	Text,
	StyleSheet,
	TouchableOpacity,
	TextInput,
	ScrollView,
	Alert,
	Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';

export default function ProfileSettingsScreen() {
	const router = useRouter();
	const [profile, setProfile] = useState({
		firstName: '',
		lastName: '',
		ageRange: '',
		monthlyIncome: '',
		financialGoal: '',
		expenses: {
			housing: '',
			loans: '',
			subscriptions: '',
		},
		savings: '',
		debt: '',
		riskProfile: {
			tolerance: '',
			experience: '',
		},
	});
	const [profileImage, setProfileImage] = useState<string | null>(null);

	useEffect(() => {
		fetchProfile();
	}, []);

	const fetchProfile = async () => {
		try {
			const response = await fetch('http://localhost:3000/api/profile');
			if (response.ok) {
				const data = await response.json();
				setProfile(data);
			}
		} catch (error) {
			console.error('Error fetching profile:', error);
		}
	};

	const pickImage = async () => {
		const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
		if (status !== 'granted') {
			Alert.alert(
				'Permission needed',
				'Please grant permission to access your photos'
			);
			return;
		}

		const result = await ImagePicker.launchImageLibraryAsync({
			mediaTypes: ImagePicker.MediaTypeOptions.Images,
			allowsEditing: true,
			aspect: [1, 1],
			quality: 1,
		});

		if (!result.canceled) {
			setProfileImage(result.assets[0].uri);
			// TODO: Upload image to server
		}
	};

	const updateProfile = async () => {
		try {
			const response = await fetch(
				'http://localhost:3000/api/profiles/68431f0b700221021c84552a',
				{
					method: 'PUT',
					headers: {
						'Content-Type': 'application/json',
					},
					body: JSON.stringify(profile),
				}
			);

			if (!response.ok) {
				throw new Error('Failed to update profile');
			}

			Alert.alert('Success', 'Profile updated successfully');
			router.back();
		} catch (error) {
			Alert.alert('Error', 'Failed to update profile');
		}
	};

	const ageRanges = ['18-24', '25-34', '35-44', '45-54', '55-64', '65+'];

	const riskTolerances = ['Conservative', 'Moderate', 'Aggressive'];

	const investmentExperiences = ['Beginner', 'Intermediate', 'Advanced'];

	const financialGoals = [
		'Save for retirement',
		'Buy a house',
		'Pay off debt',
		'Build emergency fund',
		'Invest for growth',
	];

	return (
		<SafeAreaView style={styles.container}>
			<View style={styles.header}>
				<TouchableOpacity
					onPress={() => router.back()}
					style={styles.backButton}
				>
					<Ionicons name="arrow-back" size={24} color="#333" />
				</TouchableOpacity>
				<Text style={styles.headerTitle}>Profile Settings</Text>
				<TouchableOpacity onPress={updateProfile} style={styles.saveButton}>
					<Text style={styles.saveButtonText}>Save</Text>
				</TouchableOpacity>
			</View>

			<ScrollView style={styles.content}>
				{/* Profile Image */}
				<View style={styles.imageSection}>
					<TouchableOpacity onPress={pickImage} style={styles.imageContainer}>
						{profileImage ? (
							<Image
								source={{ uri: profileImage }}
								style={styles.profileImage}
							/>
						) : (
							<View style={styles.placeholderImage}>
								<Ionicons name="person" size={40} color="#666" />
							</View>
						)}
						<View style={styles.editIconContainer}>
							<Ionicons name="camera" size={20} color="#fff" />
						</View>
					</TouchableOpacity>
				</View>

				{/* Personal Information */}
				<View style={styles.section}>
					<Text style={styles.sectionTitle}>Personal Information</Text>
					<View style={styles.inputGroup}>
						<Text style={styles.label}>First Name</Text>
						<TextInput
							style={styles.input}
							value={profile.firstName}
							onChangeText={(text) =>
								setProfile({ ...profile, firstName: text })
							}
							placeholder="Enter first name"
						/>
					</View>
					<View style={styles.inputGroup}>
						<Text style={styles.label}>Last Name</Text>
						<TextInput
							style={styles.input}
							value={profile.lastName}
							onChangeText={(text) =>
								setProfile({ ...profile, lastName: text })
							}
							placeholder="Enter last name"
						/>
					</View>
					<View style={styles.inputGroup}>
						<Text style={styles.label}>Age Range</Text>
						<View style={styles.optionsContainer}>
							{ageRanges.map((range) => (
								<TouchableOpacity
									key={range}
									style={[
										styles.optionButton,
										profile.ageRange === range && styles.selectedOption,
									]}
									onPress={() => setProfile({ ...profile, ageRange: range })}
								>
									<Text
										style={[
											styles.optionText,
											profile.ageRange === range && styles.selectedOptionText,
										]}
									>
										{range}
									</Text>
								</TouchableOpacity>
							))}
						</View>
					</View>
				</View>

				{/* Financial Information */}
				<View style={styles.section}>
					<Text style={styles.sectionTitle}>Financial Information</Text>
					<View style={styles.inputGroup}>
						<Text style={styles.label}>Monthly Income</Text>
						<TextInput
							style={styles.input}
							value={profile.monthlyIncome.toString()}
							onChangeText={(text) =>
								setProfile({ ...profile, monthlyIncome: text })
							}
							keyboardType="numeric"
							placeholder="Enter monthly income"
						/>
					</View>
					<View style={styles.inputGroup}>
						<Text style={styles.label}>Financial Goal</Text>
						<View style={styles.optionsContainer}>
							{financialGoals.map((goal) => (
								<TouchableOpacity
									key={goal}
									style={[
										styles.optionButton,
										profile.financialGoal === goal && styles.selectedOption,
									]}
									onPress={() =>
										setProfile({ ...profile, financialGoal: goal })
									}
								>
									<Text
										style={[
											styles.optionText,
											profile.financialGoal === goal &&
												styles.selectedOptionText,
										]}
									>
										{goal}
									</Text>
								</TouchableOpacity>
							))}
						</View>
					</View>
				</View>

				{/* Expenses */}
				<View style={styles.section}>
					<Text style={styles.sectionTitle}>Monthly Expenses</Text>
					<View style={styles.inputGroup}>
						<Text style={styles.label}>Housing</Text>
						<TextInput
							style={styles.input}
							value={profile.expenses.housing.toString()}
							onChangeText={(text) =>
								setProfile({
									...profile,
									expenses: { ...profile.expenses, housing: text },
								})
							}
							keyboardType="numeric"
							placeholder="Enter housing expenses"
						/>
					</View>
					<View style={styles.inputGroup}>
						<Text style={styles.label}>Loans</Text>
						<TextInput
							style={styles.input}
							value={profile.expenses.loans.toString()}
							onChangeText={(text) =>
								setProfile({
									...profile,
									expenses: { ...profile.expenses, loans: text },
								})
							}
							keyboardType="numeric"
							placeholder="Enter loan payments"
						/>
					</View>
					<View style={styles.inputGroup}>
						<Text style={styles.label}>Subscriptions</Text>
						<TextInput
							style={styles.input}
							value={profile.expenses.subscriptions.toString()}
							onChangeText={(text) =>
								setProfile({
									...profile,
									expenses: { ...profile.expenses, subscriptions: text },
								})
							}
							keyboardType="numeric"
							placeholder="Enter subscription costs"
						/>
					</View>
				</View>

				{/* Savings and Debt */}
				<View style={styles.section}>
					<Text style={styles.sectionTitle}>Savings & Debt</Text>
					<View style={styles.inputGroup}>
						<Text style={styles.label}>Total Savings</Text>
						<TextInput
							style={styles.input}
							value={profile.savings.toString()}
							onChangeText={(text) => setProfile({ ...profile, savings: text })}
							keyboardType="numeric"
							placeholder="Enter total savings"
						/>
					</View>
					<View style={styles.inputGroup}>
						<Text style={styles.label}>Total Debt</Text>
						<TextInput
							style={styles.input}
							value={profile.debt.toString()}
							onChangeText={(text) => setProfile({ ...profile, debt: text })}
							keyboardType="numeric"
							placeholder="Enter total debt"
						/>
					</View>
				</View>

				{/* Risk Profile */}
				<View style={styles.section}>
					<Text style={styles.sectionTitle}>Risk Profile</Text>
					<View style={styles.inputGroup}>
						<Text style={styles.label}>Risk Tolerance</Text>
						<View style={styles.optionsContainer}>
							{riskTolerances.map((tolerance) => (
								<TouchableOpacity
									key={tolerance}
									style={[
										styles.optionButton,
										profile.riskProfile.tolerance === tolerance &&
											styles.selectedOption,
									]}
									onPress={() =>
										setProfile({
											...profile,
											riskProfile: { ...profile.riskProfile, tolerance },
										})
									}
								>
									<Text
										style={[
											styles.optionText,
											profile.riskProfile.tolerance === tolerance &&
												styles.selectedOptionText,
										]}
									>
										{tolerance}
									</Text>
								</TouchableOpacity>
							))}
						</View>
					</View>
					<View style={styles.inputGroup}>
						<Text style={styles.label}>Investment Experience</Text>
						<View style={styles.optionsContainer}>
							{investmentExperiences.map((experience) => (
								<TouchableOpacity
									key={experience}
									style={[
										styles.optionButton,
										profile.riskProfile.experience === experience &&
											styles.selectedOption,
									]}
									onPress={() =>
										setProfile({
											...profile,
											riskProfile: { ...profile.riskProfile, experience },
										})
									}
								>
									<Text
										style={[
											styles.optionText,
											profile.riskProfile.experience === experience &&
												styles.selectedOptionText,
										]}
									>
										{experience}
									</Text>
								</TouchableOpacity>
							))}
						</View>
					</View>
				</View>
			</ScrollView>
		</SafeAreaView>
	);
}

const styles = StyleSheet.create({
	container: {
		flex: 1,
		backgroundColor: '#f9f9f9',
	},
	header: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
		padding: 16,
		borderBottomWidth: 1,
		borderBottomColor: '#eee',
	},
	backButton: {
		padding: 8,
	},
	headerTitle: {
		fontSize: 20,
		fontWeight: '600',
		color: '#333',
	},
	saveButton: {
		padding: 8,
	},
	saveButtonText: {
		color: '#0095FF',
		fontSize: 16,
		fontWeight: '600',
	},
	content: {
		flex: 1,
	},
	imageSection: {
		alignItems: 'center',
		padding: 20,
	},
	imageContainer: {
		position: 'relative',
	},
	profileImage: {
		width: 100,
		height: 100,
		borderRadius: 50,
	},
	placeholderImage: {
		width: 100,
		height: 100,
		borderRadius: 50,
		backgroundColor: '#eee',
		justifyContent: 'center',
		alignItems: 'center',
	},
	editIconContainer: {
		position: 'absolute',
		bottom: 0,
		right: 0,
		backgroundColor: '#0095FF',
		width: 32,
		height: 32,
		borderRadius: 16,
		justifyContent: 'center',
		alignItems: 'center',
		borderWidth: 2,
		borderColor: '#fff',
	},
	section: {
		padding: 16,
		borderBottomWidth: 1,
		borderBottomColor: '#eee',
	},
	sectionTitle: {
		fontSize: 18,
		fontWeight: '600',
		color: '#333',
		marginBottom: 16,
	},
	inputGroup: {
		marginBottom: 16,
	},
	label: {
		fontSize: 16,
		color: '#666',
		marginBottom: 8,
	},
	input: {
		backgroundColor: '#fff',
		padding: 12,
		borderRadius: 8,
		borderWidth: 1,
		borderColor: '#ddd',
		fontSize: 16,
	},
	optionsContainer: {
		flexDirection: 'row',
		flexWrap: 'wrap',
		marginHorizontal: -4,
	},
	optionButton: {
		padding: 12,
		borderRadius: 8,
		borderWidth: 1,
		borderColor: '#ddd',
		margin: 4,
		minWidth: '30%',
		alignItems: 'center',
	},
	selectedOption: {
		backgroundColor: '#0095FF',
		borderColor: '#0095FF',
	},
	optionText: {
		color: '#333',
		fontSize: 14,
	},
	selectedOptionText: {
		color: '#fff',
	},
});
