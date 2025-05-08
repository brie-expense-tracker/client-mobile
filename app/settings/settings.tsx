import React, { useState } from 'react';
import { View, Text, Switch, StyleSheet } from 'react-native';
import { Picker as NativePicker } from '@react-native-picker/picker';

export default function Settings() {
	const [currency, setCurrency] = useState('USD');
	const [notificationsEnabled, setNotificationsEnabled] = useState(true);

	return (
		<View style={styles.container}>
			<Text style={styles.title}>Settings</Text>

			<View style={styles.settingItem}>
				<Text style={styles.settingText}>Currency</Text>
				<NativePicker
					selectedValue={currency}
					style={styles.picker}
					onValueChange={(itemValue: string) => setCurrency(itemValue)}
				>
					<NativePicker.Item label="USD" value="USD" />
					<NativePicker.Item label="EUR" value="EUR" />
					<NativePicker.Item label="GBP" value="GBP" />
				</NativePicker>
			</View>

			<View style={styles.settingItem}>
				<Text style={styles.settingText}>Notifications</Text>
				<Switch
					value={notificationsEnabled}
					onValueChange={setNotificationsEnabled}
				/>
			</View>
		</View>
	);
}

const styles = StyleSheet.create({
	container: {
		flex: 1,
		padding: 20,
	},
	title: {
		fontSize: 24,
		fontWeight: 'bold',
		marginBottom: 20,
	},
	settingItem: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		alignItems: 'center',
		marginBottom: 20,
	},
	settingText: {
		fontSize: 18,
	},
	picker: {
		height: 50,
		width: 150,
	},
});
