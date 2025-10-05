import React, {
	createContext,
	useContext,
	useState,
	useEffect,
	useCallback,
	ReactNode,
	startTransition,
} from 'react';
import { ApiService } from '../services';
import useAuth from './AuthContext';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
	AppEvents,
	EVT_AI_INSIGHTS_CHANGED,
	EVT_ASSISTANT_CONFIG_CHANGED,
	AIInsightsChangedEvent,
	AssistantConfigChangedEvent,
} from '../lib/eventBus';

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
		monthlyFinancialCheck: boolean;
		monthlySavingsTransfer: boolean;
	};
	assistant: {
		mode: 'private' | 'personalized' | 'proactive';
		useBudgetsGoals: boolean;
		useTransactions: boolean;
		showProactiveCards: boolean;
		costSaver: boolean;
		privacyHardStop: boolean;
	};
	// Legacy support - keep for migration
	aiInsights?: {
		enabled: boolean;
		frequency: 'daily' | 'weekly' | 'monthly' | 'disabled';
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
	recurringExpenses: {
		enabled: boolean;
		notifications: boolean;
		autoCategorization: boolean;
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
	createdAt: string;
	updatedAt: string;
}

interface ProfileContextType {
	profile: Profile | null;
	loading: boolean;
	error: string | null;
	isOffline: boolean;
	lastSyncTime: number | null;
	fetchProfile: () => Promise<void>;
	updateProfile: (updates: Partial<Profile>) => Promise<void>;
	updatePreferences: (
		preferences: Partial<ProfilePreferences>
	) => Promise<void>;
	updateNotificationSettings: (
		settings: Partial<ProfilePreferences['notifications']>
	) => Promise<void>;
	updateAssistantSettings: (
		settings: Partial<ProfilePreferences['assistant']>
	) => Promise<void>;
	updateBudgetSettings: (
		settings: Partial<ProfilePreferences['budgetSettings']>
	) => Promise<void>;
	updateGoalSettings: (
		settings: Partial<ProfilePreferences['goalSettings']>
	) => Promise<void>;
	refreshProfile: () => Promise<void>;
	clearCache: () => Promise<void>;
	syncProfile: () => Promise<void>;
}

const ProfileContext = createContext<ProfileContextType | undefined>(undefined);

export const useProfile = () => {
	const context = useContext(ProfileContext);
	if (context === undefined) {
		throw new Error('useProfile must be used within a ProfileProvider');
	}
	return context;
};

// Validation utilities
const validateProfile = (profile: Partial<Profile>): string[] => {
	const errors: string[] = [];

	if (profile.firstName && profile.firstName.trim().length < 2) {
		errors.push('First name must be at least 2 characters long');
	}

	if (profile.lastName && profile.lastName.trim().length < 2) {
		errors.push('Last name must be at least 2 characters long');
	}

	if (profile.monthlyIncome !== undefined && profile.monthlyIncome < 0) {
		errors.push('Monthly income cannot be negative');
	}

	if (profile.savings !== undefined && profile.savings < 0) {
		errors.push('Savings cannot be negative');
	}

	if (profile.debt !== undefined && profile.debt < 0) {
		errors.push('Debt cannot be negative');
	}

	return errors;
};

const validatePreferences = (
	preferences: Partial<ProfilePreferences>
): string[] => {
	const errors: string[] = [];

	if (
		preferences.autoSave?.amount !== undefined &&
		preferences.autoSave.amount < 0
	) {
		errors.push('Auto-save amount cannot be negative');
	}

	if (
		preferences.budgetSettings?.alertPct !== undefined &&
		(preferences.budgetSettings.alertPct < 0 ||
			preferences.budgetSettings.alertPct > 100)
	) {
		errors.push('Budget alert percentage must be between 0 and 100');
	}

	if (
		preferences.goalSettings?.defaults?.target !== undefined &&
		preferences.goalSettings.defaults.target < 0
	) {
		errors.push('Goal target cannot be negative');
	}

	if (
		preferences.goalSettings?.defaults?.dueDays !== undefined &&
		preferences.goalSettings.defaults.dueDays < 1
	) {
		errors.push('Goal due days must be at least 1');
	}

	return errors;
};

// Cache utilities
const CACHE_KEY = 'profile_cache';
const CACHE_TIMESTAMP_KEY = 'profile_cache_timestamp';
const CACHE_EXPIRY_MS = 5 * 60 * 1000; // 5 minutes

const saveToCache = async (profile: Profile): Promise<void> => {
	try {
		await AsyncStorage.setItem(CACHE_KEY, JSON.stringify(profile));
		await AsyncStorage.setItem(CACHE_TIMESTAMP_KEY, Date.now().toString());
	} catch (error) {
		console.warn('Failed to save profile to cache:', error);
	}
};

const loadFromCache = async (): Promise<Profile | null> => {
	try {
		const [cachedProfile, timestamp] = await Promise.all([
			AsyncStorage.getItem(CACHE_KEY),
			AsyncStorage.getItem(CACHE_TIMESTAMP_KEY),
		]);

		if (!cachedProfile || !timestamp) {
			return null;
		}

		const cacheAge = Date.now() - parseInt(timestamp, 10);
		if (cacheAge > CACHE_EXPIRY_MS) {
			// Cache expired, clear it
			await clearCache();
			return null;
		}

		return JSON.parse(cachedProfile);
	} catch (error) {
		console.warn('Failed to load profile from cache:', error);
		return null;
	}
};

const clearCache = async (): Promise<void> => {
	try {
		await Promise.all([
			AsyncStorage.removeItem(CACHE_KEY),
			AsyncStorage.removeItem(CACHE_TIMESTAMP_KEY),
		]);
	} catch (error) {
		console.warn('Failed to clear profile cache:', error);
	}
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
	const [isOffline, setIsOffline] = useState(false);
	const [lastSyncTime, setLastSyncTime] = useState<number | null>(null);
	const { user, firebaseUser } = useAuth();

	const fetchProfile = useCallback(async () => {
		if (!user || !firebaseUser) {
			setProfile(null);
			setLoading(false);
			return;
		}

		try {
			setLoading(true);
			setError(null);
			setIsOffline(false);

			// Try to load from cache first
			const cachedProfile = await loadFromCache();
			if (cachedProfile) {
				setProfile(cachedProfile);
				setLastSyncTime(Date.now());
			}

			const response = await ApiService.get<{ data: Profile }>(
				'/api/profiles/me'
			);

			if (response.success && response.data) {
				const profileData = response.data.data || response.data;
				setProfile(profileData);
				setLastSyncTime(Date.now());
				setIsOffline(false);

				// Save to cache
				await saveToCache(profileData);
			} else if (
				response.error &&
				response.error.includes('Profile not found')
			) {
				// Profile doesn't exist, create a default one
				await createDefaultProfile();
			} else {
				setError(response.error || 'Failed to fetch profile');
			}
		} catch (err) {
			console.error('ProfileProvider: Error fetching profile:', err);

			// If we have cached data, use it and mark as offline
			if (profile) {
				setIsOffline(true);
				console.log('Using cached profile data due to network error');
			} else {
				setError(
					err instanceof Error ? err.message : 'Failed to fetch profile'
				);
			}
		} finally {
			setLoading(false);
		}
	}, [user, firebaseUser]);

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
						monthlyFinancialCheck: true,
						monthlySavingsTransfer: false,
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
					recurringExpenses: {
						enabled: false,
						notifications: false,
						autoCategorization: false,
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

	const updateProfile = useCallback(
		async (updates: Partial<Profile>) => {
			if (!user || !firebaseUser) {
				throw new Error('User not authenticated');
			}

			// Validate input
			const validationErrors = validateProfile(updates);
			if (validationErrors.length > 0) {
				const errorMessage = `Validation failed: ${validationErrors.join(
					', '
				)}`;
				setError(errorMessage);
				throw new Error(errorMessage);
			}

			// Store the previous state for potential rollback
			const previousProfile = profile;

			// Optimistically update the profile state immediately
			setProfile((prev) =>
				prev
					? {
							...prev,
							...updates,
					  }
					: null
			);

			try {
				setError(null);

				const response = await ApiService.put<{ data: Profile }>(
					'/api/profiles/me',
					updates
				);

				if (response.success && response.data) {
					// The optimistic update was correct, no need to update again
					console.log('Profile updated successfully');
					setLastSyncTime(Date.now());
					setIsOffline(false);

					// Update cache
					if (previousProfile) {
						const updatedProfile = { ...previousProfile, ...updates };
						await saveToCache(updatedProfile);
					}
				} else {
					// API call failed, revert to previous state
					setProfile(previousProfile);
					throw new Error(response.error || 'Failed to update profile');
				}
			} catch (err) {
				console.error('Error updating profile:', err);
				// Revert to previous state on error
				setProfile(previousProfile);
				setError(
					err instanceof Error ? err.message : 'Failed to update profile'
				);
				throw err;
			}
		},
		[user, firebaseUser, profile]
	);

	const updatePreferences = useCallback(
		async (preferences: Partial<ProfilePreferences>) => {
			if (!user || !firebaseUser) {
				throw new Error('User not authenticated');
			}

			// Validate input
			const validationErrors = validatePreferences(preferences);
			if (validationErrors.length > 0) {
				const errorMessage = `Validation failed: ${validationErrors.join(
					', '
				)}`;
				setError(errorMessage);
				throw new Error(errorMessage);
			}

			// Store the previous state for potential rollback
			const previousProfile = profile;

			// 1) Optimistic next state
			const nextProfile = profile
				? {
						...profile,
						preferences: { ...profile.preferences, ...preferences },
				  }
				: null;

			// 2) Immediate UI update with transition
			startTransition(() => {
				setProfile(nextProfile);
			});

			// 3) Emit AI insights change event if relevant (legacy support)
			if (preferences.aiInsights?.enabled !== undefined) {
				const enabled = !!preferences.aiInsights.enabled;
				AppEvents.emit(EVT_AI_INSIGHTS_CHANGED, {
					enabled,
				} as AIInsightsChangedEvent);
			}

			// 4) Emit assistant config change event if relevant
			if (preferences.assistant) {
				AppEvents.emit(EVT_ASSISTANT_CONFIG_CHANGED, {
					config: preferences.assistant,
				} as AssistantConfigChangedEvent);
			}

			try {
				setError(null);

				const response = await ApiService.put<ProfilePreferences>(
					'/api/profiles/preferences',
					preferences
				);

				if (response.success && response.data) {
					// The optimistic update was correct, no need to update again
					console.log('Preferences updated successfully');
				} else {
					// API call failed, revert to previous state
					startTransition(() => setProfile(previousProfile));

					// Emit rollback events
					if (preferences.aiInsights?.enabled !== undefined) {
						const enabled = !!previousProfile?.preferences?.aiInsights?.enabled;
						AppEvents.emit(EVT_AI_INSIGHTS_CHANGED, {
							enabled,
						} as AIInsightsChangedEvent);
					}
					if (
						preferences.assistant &&
						previousProfile?.preferences?.assistant
					) {
						AppEvents.emit(EVT_ASSISTANT_CONFIG_CHANGED, {
							config: previousProfile.preferences.assistant,
						} as AssistantConfigChangedEvent);
					}

					throw new Error(response.error || 'Failed to update preferences');
				}
			} catch (err) {
				console.error('Error updating preferences:', err);
				// Revert to previous state on error
				startTransition(() => setProfile(previousProfile));

				// Emit rollback events
				if (preferences.aiInsights?.enabled !== undefined) {
					const enabled = !!previousProfile?.preferences?.aiInsights?.enabled;
					AppEvents.emit(EVT_AI_INSIGHTS_CHANGED, {
						enabled,
					} as AIInsightsChangedEvent);
				}
				if (preferences.assistant && previousProfile?.preferences?.assistant) {
					AppEvents.emit(EVT_ASSISTANT_CONFIG_CHANGED, {
						config: previousProfile.preferences.assistant,
					} as AssistantConfigChangedEvent);
				}

				setError(
					err instanceof Error ? err.message : 'Failed to update preferences'
				);
				throw err;
			}
		},
		[user, firebaseUser, profile]
	);

	const updateAssistantSettings = async (
		settings: Partial<ProfilePreferences['assistant']>
	) => {
		if (!user || !firebaseUser) {
			throw new Error('User not authenticated');
		}

		// Store the previous state for potential rollback
		const previousProfile = profile;

		// Optimistically update the profile state immediately
		setProfile((prev) =>
			prev
				? {
						...prev,
						preferences: {
							...prev.preferences,
							assistant: {
								...prev.preferences.assistant,
								...settings,
							},
						},
				  }
				: null
		);

		// Emit assistant config change event
		if (settings) {
			AppEvents.emit(EVT_ASSISTANT_CONFIG_CHANGED, {
				config: { ...profile?.preferences?.assistant, ...settings },
			} as AssistantConfigChangedEvent);
		}

		try {
			setError(null);

			const response = await ApiService.put<ProfilePreferences['assistant']>(
				'/profiles/assistant',
				settings
			);

			if (response.success && response.data) {
				// The optimistic update was correct, no need to update again
				console.log('Assistant settings updated successfully');
			} else {
				// API call failed, revert to previous state
				setProfile(previousProfile);
				if (previousProfile?.preferences?.assistant) {
					AppEvents.emit(EVT_ASSISTANT_CONFIG_CHANGED, {
						config: previousProfile.preferences.assistant,
					} as AssistantConfigChangedEvent);
				}
				throw new Error(
					response.error || 'Failed to update assistant settings'
				);
			}
		} catch (err) {
			console.error('Error updating assistant settings:', err);
			// Revert to previous state on error
			setProfile(previousProfile);
			if (previousProfile?.preferences?.assistant) {
				AppEvents.emit(EVT_ASSISTANT_CONFIG_CHANGED, {
					config: previousProfile.preferences.assistant,
				} as AssistantConfigChangedEvent);
			}
			setError(
				err instanceof Error
					? err.message
					: 'Failed to update assistant settings'
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

		// Store the previous state for potential rollback
		const previousProfile = profile;

		// Optimistically update the profile state immediately
		setProfile((prev) =>
			prev
				? {
						...prev,
						preferences: {
							...prev.preferences,
							notifications: {
								...prev.preferences.notifications,
								...settings,
							},
						},
				  }
				: null
		);

		try {
			setError(null);

			const response = await ApiService.put<
				ProfilePreferences['notifications']
			>('/profiles/notifications', settings);

			if (response.success && response.data) {
				// The optimistic update was correct, no need to update again
				console.log('Notification settings updated successfully');
			} else {
				// API call failed, revert to previous state
				setProfile(previousProfile);
				throw new Error(
					response.error || 'Failed to update notification settings'
				);
			}
		} catch (err) {
			console.error('Error updating notification settings:', err);
			// Revert to previous state on error
			setProfile(previousProfile);
			setError(
				err instanceof Error
					? err.message
					: 'Failed to update notification settings'
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

		// Store the previous state for potential rollback
		const previousProfile = profile;

		// Optimistically update the profile state immediately
		setProfile((prev) => {
			if (!prev) {
				console.warn('Profile not loaded, cannot update local state');
				return null;
			}

			return {
				...prev,
				preferences: {
					...prev.preferences,
					budgetSettings: {
						...prev.preferences.budgetSettings,
						...settings,
					},
				},
			};
		});

		try {
			setError(null);

			console.log('Updating budget settings with:', settings);

			const response = await ApiService.put<
				ProfilePreferences['budgetSettings']
			>('/profiles/budget-settings', settings);

			console.log('Budget settings update response:', response);

			if (response.success && response.data) {
				// The optimistic update was correct, no need to update again
				console.log('Budget settings updated successfully');
			} else {
				// API call failed, revert to previous state
				setProfile(previousProfile);
				console.error('Budget settings update failed:', response.error);
				throw new Error(response.error || 'Failed to update budget settings');
			}
		} catch (err) {
			console.error('Error updating budget settings:', err);
			// Revert to previous state on error
			setProfile(previousProfile);
			const errorMessage =
				err instanceof Error ? err.message : 'Failed to update budget settings';
			setError(errorMessage);
			throw new Error(errorMessage);
		}
	};

	const updateGoalSettings = async (
		settings: Partial<ProfilePreferences['goalSettings']>
	) => {
		if (!user || !firebaseUser) {
			throw new Error('User not authenticated');
		}

		// Store the previous state for potential rollback
		const previousProfile = profile;

		// Optimistically update the profile state immediately
		setProfile((prev) =>
			prev
				? {
						...prev,
						preferences: {
							...prev.preferences,
							goalSettings: {
								...prev.preferences.goalSettings,
								...settings,
							},
						},
				  }
				: null
		);

		try {
			setError(null);

			const response = await ApiService.put<ProfilePreferences['goalSettings']>(
				'/profiles/goal-settings',
				settings
			);

			if (response.success && response.data) {
				// The optimistic update was correct, no need to update again
				console.log('Goal settings updated successfully');
			} else {
				// API call failed, revert to previous state
				setProfile(previousProfile);
				throw new Error(response.error || 'Failed to update goal settings');
			}
		} catch (err) {
			console.error('Error updating goal settings:', err);
			// Revert to previous state on error
			setProfile(previousProfile);
			setError(
				err instanceof Error ? err.message : 'Failed to update goal settings'
			);
			throw err;
		}
	};

	const refreshProfile = useCallback(async () => {
		await fetchProfile();
	}, [user, firebaseUser]);

	const clearCache = useCallback(async () => {
		await clearCache();
		setProfile(null);
		setLastSyncTime(null);
	}, []);

	const syncProfile = useCallback(async () => {
		if (isOffline) {
			try {
				await fetchProfile();
			} catch (error) {
				console.warn('Failed to sync profile:', error);
			}
		}
	}, [isOffline, user, firebaseUser]);

	// Fetch profile when user changes (only listen to user, not firebaseUser)
	useEffect(() => {
		// console.log('ProfileProvider: User changed:', {
		// 	user: !!user,
		// 	userId: user?._id,
		// });
		if (user) {
			fetchProfile();
		} else {
			setProfile(null);
			setLoading(false);
			setError(null);
		}
	}, [user, firebaseUser, fetchProfile]); // Include firebaseUser to ensure we have auth before fetching

	const value: ProfileContextType = {
		profile,
		loading,
		error,
		isOffline,
		lastSyncTime,
		fetchProfile,
		updateProfile,
		updatePreferences,
		updateNotificationSettings,
		updateAssistantSettings,
		updateBudgetSettings,
		updateGoalSettings,
		refreshProfile,
		clearCache,
		syncProfile,
	};

	return (
		<ProfileContext.Provider value={value}>{children}</ProfileContext.Provider>
	);
};
