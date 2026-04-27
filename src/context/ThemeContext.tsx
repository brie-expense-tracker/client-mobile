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
	bg: isDark ? '#121315' : '#ffffff',
	text: isDark ? '#f3f1ec' : '#0f172a',
	subtext: isDark ? 'rgba(243, 241, 236, 0.62)' : '#475569',
	subtle: isDark ? 'rgba(243, 241, 236, 0.4)' : '#94a3b8',
	line: isDark ? 'rgba(255, 255, 255, 0.08)' : '#e2e8f0',
	card: isDark ? '#1b1d21' : '#ffffff',
	tint: isDark ? '#6f8f8a' : '#3b82f6',
	success: '#34d399',
	warn: '#f59e0b',
	danger: '#f87171',
	slate: isDark ? '#121315' : '#f8fafc',
	ringTrack: isDark ? 'rgba(255, 255, 255, 0.06)' : '#e5e7eb',
});

interface ThemeProviderProps {
	children: ReactNode;
}

export function ThemeProvider({ children }: ThemeProviderProps) {
	const systemColorScheme = useColorScheme();
	const [theme, setThemeState] = useState<ThemeMode>('dark');

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
