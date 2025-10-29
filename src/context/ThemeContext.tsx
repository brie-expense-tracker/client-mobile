import React, {
	createContext,
	useContext,
	useState,
	useEffect,
	ReactNode,
} from 'react';
import { useColorScheme } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createLogger } from '../utils/sublogger';

const themeContextLog = createLogger('ThemeContext');

type ThemeMode = 'light' | 'dark' | 'system';

interface ThemeContextType {
	theme: ThemeMode;
	setTheme: (theme: ThemeMode) => void;
	colors: {
		isDark: boolean;
		bg: string;
		text: string;
		subtext: string;
		subtle: string;
		line: string;
		card: string;
		tint: string;
		success: string;
		warn: string;
		danger: string;
		slate: string;
		ringTrack: string;
	};
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

// Theme factory function
const makeColors = (isDark: boolean) => ({
	isDark,
	bg: isDark ? '#0b1220' : '#ffffff',
	text: isDark ? '#e5e7eb' : '#0f172a',
	subtext: isDark ? '#9aa4b2' : '#475569',
	subtle: isDark ? '#6b7280' : '#94a3b8',
	line: isDark ? '#1f2a37' : '#e2e8f0',
	card: isDark ? '#111827' : '#ffffff',
	tint: '#3b82f6',
	success: '#10b981',
	warn: '#f59e0b',
	danger: '#ef4444',
	slate: isDark ? '#0f172a' : '#f8fafc',
	ringTrack: isDark ? '#1f2937' : '#e5e7eb',
});

interface ThemeProviderProps {
	children: ReactNode;
}

export function ThemeProvider({ children }: ThemeProviderProps) {
	const systemColorScheme = useColorScheme();
	const [theme, setThemeState] = useState<ThemeMode>('light');

	// Load saved theme preference on app start
	useEffect(() => {
		const loadTheme = async () => {
			try {
				const savedTheme = await AsyncStorage.getItem('theme_preference');
				if (savedTheme && ['light', 'dark', 'system'].includes(savedTheme)) {
					setThemeState(savedTheme as ThemeMode);
				}
			} catch (error) {
				themeContextLog.error('Error loading theme preference', error);
			}
		};

		loadTheme();
	}, []);

	// Save theme preference when it changes
	const setTheme = async (newTheme: ThemeMode) => {
		try {
			await AsyncStorage.setItem('theme_preference', newTheme);
			setThemeState(newTheme);
		} catch (error) {
			themeContextLog.error('Error saving theme preference', error);
		}
	};

	// Determine if we should use dark mode
	const isDark =
		theme === 'system' ? systemColorScheme === 'dark' : theme === 'dark';

	const colors = makeColors(isDark);

	const value = {
		theme,
		setTheme,
		colors,
	};

	return (
		<ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
	);
}

export function useTheme() {
	const context = useContext(ThemeContext);
	if (context === undefined) {
		throw new Error('useTheme must be used within a ThemeProvider');
	}
	return context;
}

// Export the makeColors function for use in components that don't need the full context
export { makeColors };
