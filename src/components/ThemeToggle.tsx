import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';

interface ThemeToggleProps {
	style?: any;
}

export default function ThemeToggle({ style }: ThemeToggleProps) {
	const { theme, setTheme, colors } = useTheme();

	const getThemeIcon = (themeMode: string) => {
		switch (themeMode) {
			case 'light':
				return 'sunny';
			case 'dark':
				return 'moon';
			case 'system':
				return 'phone-portrait';
			default:
				return 'phone-portrait';
		}
	};

	const getThemeLabel = (themeMode: string) => {
		switch (themeMode) {
			case 'light':
				return 'Light';
			case 'dark':
				return 'Dark';
			case 'system':
				return 'System';
			default:
				return 'System';
		}
	};

	const cycleTheme = () => {
		if (theme === 'system') {
			setTheme('light');
		} else if (theme === 'light') {
			setTheme('dark');
		} else {
			setTheme('system');
		}
	};

	return (
		<TouchableOpacity
			style={[
				styles.container,
				{
					backgroundColor: colors.card,
					borderColor: colors.line,
				},
				style,
			]}
			onPress={cycleTheme}
			activeOpacity={0.7}
		>
			<View style={styles.leftContent}>
				<Ionicons
					name={getThemeIcon(theme)}
					size={20}
					color={colors.text}
					style={styles.icon}
				/>
				<View style={styles.textContainer}>
					<Text style={[styles.title, { color: colors.text }]}>Appearance</Text>
					<Text style={[styles.subtitle, { color: colors.subtext }]}>
						{getThemeLabel(theme)} mode
					</Text>
				</View>
			</View>
			<View style={styles.rightContent}>
				<Text style={[styles.themeLabel, { color: colors.subtext }]}>
					{getThemeLabel(theme)}
				</Text>
				<Ionicons name="chevron-forward" size={16} color={colors.subtle} />
			</View>
		</TouchableOpacity>
	);
}

const styles = StyleSheet.create({
	container: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
		paddingVertical: 12,
		paddingHorizontal: 16,
		borderRadius: 12,
		borderWidth: 1,
	},
	leftContent: {
		flexDirection: 'row',
		alignItems: 'center',
		flex: 1,
	},
	icon: {
		marginRight: 12,
	},
	textContainer: {
		flex: 1,
	},
	title: {
		fontSize: 16,
		fontWeight: '600',
		marginBottom: 2,
	},
	subtitle: {
		fontSize: 13,
		fontWeight: '400',
	},
	rightContent: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 8,
	},
	themeLabel: {
		fontSize: 14,
		fontWeight: '500',
	},
});
