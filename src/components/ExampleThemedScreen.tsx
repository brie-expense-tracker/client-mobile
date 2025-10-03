import React from 'react';
import {
	View,
	Text,
	StyleSheet,
	ScrollView,
	TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';

// Example of how to use the global theme in any screen
export default function ExampleThemedScreen() {
	const { colors, theme, setTheme } = useTheme();

	return (
		<ScrollView style={[styles.container, { backgroundColor: colors.bg }]}>
			<View style={styles.content}>
				<Text style={[styles.title, { color: colors.text }]}>
					Theme Example Screen
				</Text>

				<Text style={[styles.subtitle, { color: colors.subtext }]}>
					Current theme: {theme}
				</Text>

				<View
					style={[
						styles.card,
						{ backgroundColor: colors.card, borderColor: colors.line },
					]}
				>
					<Text style={[styles.cardTitle, { color: colors.text }]}>
						Theme Colors
					</Text>

					<View style={styles.colorGrid}>
						<View
							style={[styles.colorItem, { backgroundColor: colors.success }]}
						>
							<Text style={styles.colorLabel}>Success</Text>
						</View>
						<View style={[styles.colorItem, { backgroundColor: colors.warn }]}>
							<Text style={styles.colorLabel}>Warning</Text>
						</View>
						<View
							style={[styles.colorItem, { backgroundColor: colors.danger }]}
						>
							<Text style={styles.colorLabel}>Danger</Text>
						</View>
						<View style={[styles.colorItem, { backgroundColor: colors.tint }]}>
							<Text style={styles.colorLabel}>Tint</Text>
						</View>
					</View>

					<TouchableOpacity
						style={[styles.button, { backgroundColor: colors.tint }]}
						onPress={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
					>
						<Ionicons name="color-palette" size={20} color="#fff" />
						<Text style={styles.buttonText}>Toggle Theme</Text>
					</TouchableOpacity>
				</View>
			</View>
		</ScrollView>
	);
}

const styles = StyleSheet.create({
	container: {
		flex: 1,
	},
	content: {
		padding: 20,
	},
	title: {
		fontSize: 24,
		fontWeight: 'bold',
		marginBottom: 8,
	},
	subtitle: {
		fontSize: 16,
		marginBottom: 20,
	},
	card: {
		padding: 20,
		borderRadius: 12,
		borderWidth: 1,
		marginBottom: 20,
	},
	cardTitle: {
		fontSize: 18,
		fontWeight: '600',
		marginBottom: 16,
	},
	colorGrid: {
		flexDirection: 'row',
		flexWrap: 'wrap',
		gap: 12,
		marginBottom: 20,
	},
	colorItem: {
		width: 80,
		height: 80,
		borderRadius: 8,
		alignItems: 'center',
		justifyContent: 'center',
	},
	colorLabel: {
		color: '#fff',
		fontSize: 12,
		fontWeight: '600',
	},
	button: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'center',
		paddingVertical: 12,
		paddingHorizontal: 20,
		borderRadius: 8,
		gap: 8,
	},
	buttonText: {
		color: '#fff',
		fontSize: 16,
		fontWeight: '600',
	},
});
