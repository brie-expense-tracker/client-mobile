import React, {
	createContext,
	useContext,
	useState,
	useEffect,
	ReactNode,
} from 'react';
import { ApiService } from '../services/apiService';
import useAuth from './AuthContext';

interface ProfilePreferences {
	adviceFrequency: string;
	autoSave: {
		enabled: boolean;
		amount: number;
	};
	notifications: {
		enableNotifications: boolean;
		weeklySummary: boolean;
		overspendingAlert: boolean;
		aiSuggestion: boolean;
		budgetMilestones: boolean;
	};
	aiInsights: {
		enabled: boolean;
		frequency: 'daily' | 'weekly' | 'monthly';
		pushNotifications: boolean;
		emailAlerts: boolean;
		insightTypes: {
			budgetingTips: boolean;
			expenseReduction: boolean;
			incomeSuggestions: boolean;
		};
	};
	budgetSettings: {
		cycleType: 'monthly' | 'weekly' | 'biweekly';
		cycleStart: number;
		alertPct: number;
		carryOver: boolean;
		autoSync: boolean;
	};
	goalSettings: {
		defaults: {
			target: number;
			dueDays: number;
			sortBy: 'percent' | 'name' | 'date';
			currency: string;
		};
		ai: {
			enabled: boolean;
			tone: 'friendly' | 'technical' | 'minimal';
			frequency: 'low' | 'medium' | 'high';
			whatIf: boolean;
		};
		notifications: {
			milestoneAlerts: boolean;
			weeklySummary: boolean;
			offTrackAlert: boolean;
		};
		display: {
			showCompleted: boolean;
			autoArchive: boolean;
			rounding: 'none' | '1' | '5';
		};
		security: {
			lockEdit: boolean;
			undoWindow: number;
		};
	};
}

interface RiskProfile {
	tolerance: string;
	experience: string;
}

interface Expenses {
	housing: number;
	loans: number;
	subscriptions: number;
}

interface Profile {
	_id: string;
	userId: string;
	firstName: string;
	lastName: string;
	ageRange: string;
	monthlyIncome: number;
	financialGoal: string;
	expenses: Expenses;
	savings: number;
	debt: number;
	riskProfile: RiskProfile;
	preferences: ProfilePreferences;
	phone?: string;
	email?: string;
	createdAt: string;
	updatedAt: string;
}

interface ProfileContextType {
	profile: Profile | null;
	loading: boolean;
	error: string | null;
	fetchProfile: () => Promise<void>;
	updateProfile: (updates: Partial<Profile>) => Promise<void>;
	updatePreferences: (
		preferences: Partial<ProfilePreferences>
	) => Promise<void>;
	updateNotificationSettings: (
		settings: Partial<ProfilePreferences['notifications']>
	) => Promise<void>;
	updateAIInsightsSettings: (
		settings: Partial<ProfilePreferences['aiInsights']>
	) => Promise<void>;
	updateBudgetSettings: (
		settings: Partial<ProfilePreferences['budgetSettings']>
	) => Promise<void>;
	updateGoalSettings: (
		settings: Partial<ProfilePreferences['goalSettings']>
	) => Promise<void>;
	refreshProfile: () => Promise<void>;
}

const ProfileContext = createContext<ProfileContextType | undefined>(undefined);

export const useProfile = () => {
	const context = useContext(ProfileContext);
	if (context === undefined) {
		throw new Error('useProfile must be used within a ProfileProvider');
	}
	return context;
};

interface ProfileProviderProps {
	children: ReactNode;
}

export const ProfileProvider: React.FC<ProfileProviderProps> = ({
	children,
}) => {
	const [profile, setProfile] = useState<Profile | null>(null);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const { user, firebaseUser } = useAuth();

	const fetchProfile = async () => {
		if (!user || !firebaseUser) {
			console.log('ProfileProvider: No user or firebaseUser, skipping fetch');
			setProfile(null);
			setLoading(false);
			return;
		}

		try {
			// console.log('ProfileProvider: Fetching profile for user:', user._id);
			setLoading(true);
			setError(null);

			const response = await ApiService.get<{ data: Profile }>('/profiles/me');
			// console.log('ProfileProvider: API response:', response);

			if (response.success && response.data) {
				// Handle nested data structure: response.data.data
				const profileData = response.data.data || response.data;
				// console.log(
				// 	'ProfileProvider: Profile fetched successfully:',
				// 	profileData
				// );
				setProfile(profileData);
			} else if (
				response.error &&
				response.error.includes('Profile not found')
			) {
				// Profile doesn't exist, create a default one
				console.log(
					'ProfileProvider: Profile not found, creating default profile'
				);
				await createDefaultProfile();
			} else {
				console.log('ProfileProvider: API returned error:', response.error);
				setError(response.error || 'Failed to fetch profile');
			}
		} catch (err) {
			console.error('ProfileProvider: Error fetching profile:', err);
			setError(err instanceof Error ? err.message : 'Failed to fetch profile');
		} finally {
			setLoading(false);
		}
	};

	const createDefaultProfile = async () => {
		try {
			const defaultProfile = {
				firstName: 'User',
				lastName: 'Name',
				ageRange: '25-34',
				monthlyIncome: 0,
				financialGoal: 'Save money',
				expenses: {
					housing: 0,
					loans: 0,
					subscriptions: 0,
				},
				savings: 0,
				debt: 0,
				riskProfile: {
					tolerance: 'moderate',
					experience: 'beginner',
				},
				preferences: {
					adviceFrequency: 'weekly',
					autoSave: {
						enabled: false,
						amount: 0,
					},
					notifications: {
						enableNotifications: true,
						weeklySummary: true,
						overspendingAlert: false,
						aiSuggestion: true,
						budgetMilestones: false,
					},
					aiInsights: {
						enabled: true,
						frequency: 'weekly',
						pushNotifications: true,
						emailAlerts: false,
						insightTypes: {
							budgetingTips: true,
							expenseReduction: true,
							incomeSuggestions: true,
						},
					},
					budgetSettings: {
						cycleType: 'monthly',
						cycleStart: 1,
						alertPct: 80,
						carryOver: false,
						autoSync: true,
					},
					goalSettings: {
						defaults: {
							target: 1000,
							dueDays: 90,
							sortBy: 'percent',
							currency: 'USD',
						},
						ai: {
							enabled: true,
							tone: 'friendly',
							frequency: 'medium',
							whatIf: true,
						},
						notifications: {
							milestoneAlerts: true,
							weeklySummary: false,
							offTrackAlert: true,
						},
						display: {
							showCompleted: true,
							autoArchive: true,
							rounding: '1',
						},
						security: {
							lockEdit: false,
							undoWindow: 24,
						},
					},
				},
			};

			const response = await ApiService.post<{
				profileId: string;
				profile: Profile;
			}>('/profiles', defaultProfile);

			if (response.success && response.data) {
				console.log(
					'ProfileProvider: Default profile created successfully:',
					response.data
				);
				// The createProfile endpoint returns { profileId, profile }
				const profileData = response.data.profile || response.data;
				setProfile(profileData);
			} else {
				console.error(
					'ProfileProvider: Failed to create default profile:',
					response.error
				);
				setError('Failed to create profile');
			}
		} catch (err) {
			console.error('ProfileProvider: Error creating default profile:', err);
			setError('Failed to create profile');
		}
	};

	const updateProfile = async (updates: Partial<Profile>) => {
		if (!user || !firebaseUser) {
			throw new Error('User not authenticated');
		}

		try {
			setError(null);

			const response = await ApiService.put<{ data: Profile }>(
				'/profiles/me',
				updates
			);

			if (response.success && response.data) {
				// Handle nested data structure: response.data.data
				const profileData = response.data.data || response.data;
				setProfile(profileData);
			} else {
				throw new Error(response.error || 'Failed to update profile');
			}
		} catch (err) {
			console.error('Error updating profile:', err);
			setError(err instanceof Error ? err.message : 'Failed to update profile');
			throw err;
		}
	};

	const updatePreferences = async (
		preferences: Partial<ProfilePreferences>
	) => {
		if (!user || !firebaseUser) {
			throw new Error('User not authenticated');
		}

		try {
			setError(null);

			const response = await ApiService.put<ProfilePreferences>(
				'/profiles/preferences',
				preferences
			);

			if (response.success && response.data) {
				// Update the profile state with new preferences
				setProfile((prev) =>
					prev
						? {
								...prev,
								preferences: { ...prev.preferences, ...response.data },
						  }
						: null
				);
			} else {
				throw new Error(response.error || 'Failed to update preferences');
			}
		} catch (err) {
			console.error('Error updating preferences:', err);
			setError(
				err instanceof Error ? err.message : 'Failed to update preferences'
			);
			throw err;
		}
	};

	const updateNotificationSettings = async (
		settings: Partial<ProfilePreferences['notifications']>
	) => {
		if (!user || !firebaseUser) {
			throw new Error('User not authenticated');
		}

		try {
			setError(null);

			const response = await ApiService.put<
				ProfilePreferences['notifications']
			>('/profiles/notifications', settings);

			if (response.success && response.data) {
				// Update the profile state with new notification settings
				setProfile((prev) =>
					prev
						? {
								...prev,
								preferences: {
									...prev.preferences,
									notifications: {
										...prev.preferences.notifications,
										...response.data,
									},
								},
						  }
						: null
				);
			} else {
				throw new Error(
					response.error || 'Failed to update notification settings'
				);
			}
		} catch (err) {
			console.error('Error updating notification settings:', err);
			setError(
				err instanceof Error
					? err.message
					: 'Failed to update notification settings'
			);
			throw err;
		}
	};

	const updateAIInsightsSettings = async (
		settings: Partial<ProfilePreferences['aiInsights']>
	) => {
		if (!user || !firebaseUser) {
			throw new Error('User not authenticated');
		}

		try {
			setError(null);

			const response = await ApiService.put<ProfilePreferences['aiInsights']>(
				'/profiles/ai-insights',
				settings
			);

			if (response.success && response.data) {
				// Update the profile state with new AI insights settings
				setProfile((prev) =>
					prev
						? {
								...prev,
								preferences: {
									...prev.preferences,
									aiInsights: {
										...prev.preferences.aiInsights,
										...response.data,
									},
								},
						  }
						: null
				);
			} else {
				throw new Error(
					response.error || 'Failed to update AI insights settings'
				);
			}
		} catch (err) {
			console.error('Error updating AI insights settings:', err);
			setError(
				err instanceof Error
					? err.message
					: 'Failed to update AI insights settings'
			);
			throw err;
		}
	};

	const updateBudgetSettings = async (
		settings: Partial<ProfilePreferences['budgetSettings']>
	) => {
		if (!user || !firebaseUser) {
			throw new Error('User not authenticated');
		}

		try {
			setError(null);

			const response = await ApiService.put<
				ProfilePreferences['budgetSettings']
			>('/profiles/budget-settings', settings);

			if (response.success && response.data) {
				// Update the profile state with new budget settings
				setProfile((prev) =>
					prev
						? {
								...prev,
								preferences: {
									...prev.preferences,
									budgetSettings: {
										...prev.preferences.budgetSettings,
										...response.data,
									},
								},
						  }
						: null
				);
			} else {
				throw new Error(response.error || 'Failed to update budget settings');
			}
		} catch (err) {
			console.error('Error updating budget settings:', err);
			setError(
				err instanceof Error ? err.message : 'Failed to update budget settings'
			);
			throw err;
		}
	};

	const updateGoalSettings = async (
		settings: Partial<ProfilePreferences['goalSettings']>
	) => {
		if (!user || !firebaseUser) {
			throw new Error('User not authenticated');
		}

		try {
			setError(null);

			const response = await ApiService.put<ProfilePreferences['goalSettings']>(
				'/profiles/goal-settings',
				settings
			);

			if (response.success && response.data) {
				// Update the profile state with new goal settings
				setProfile((prev) =>
					prev
						? {
								...prev,
								preferences: {
									...prev.preferences,
									goalSettings: {
										...prev.preferences.goalSettings,
										...response.data,
									},
								},
						  }
						: null
				);
			} else {
				throw new Error(response.error || 'Failed to update goal settings');
			}
		} catch (err) {
			console.error('Error updating goal settings:', err);
			setError(
				err instanceof Error ? err.message : 'Failed to update goal settings'
			);
			throw err;
		}
	};

	const refreshProfile = async () => {
		await fetchProfile();
	};

	// Fetch profile when user changes
	useEffect(() => {
		// console.log('ProfileProvider: User or firebaseUser changed:', {
		// 	user: !!user,
		// 	firebaseUser: !!firebaseUser,
		// });
		if (user && firebaseUser) {
			fetchProfile();
		} else {
			setProfile(null);
			setLoading(false);
			setError(null);
		}
	}, [user, firebaseUser]);

	const value: ProfileContextType = {
		profile,
		loading,
		error,
		fetchProfile,
		updateProfile,
		updatePreferences,
		updateNotificationSettings,
		updateAIInsightsSettings,
		updateBudgetSettings,
		updateGoalSettings,
		refreshProfile,
	};

	return (
		<ProfileContext.Provider value={value}>{children}</ProfileContext.Provider>
	);
};
