// app/screens/DownloadDataScreen.tsx
import React, { useState } from 'react';
import {
	View,
	Text,
	TouchableOpacity,
	ActivityIndicator,
	StyleSheet,
	Alert,
} from 'react-native';
import axios from 'axios';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';

interface Transaction {
	id: string;
	description: string;
	amount: number;
	date: string; // ISO-8601 (e.g. "2025-06-19T15:24:00Z")
}

/** Convert an array of transactions to CSV */
const toCSV = (rows: Transaction[]) => {
	// header
	const header = ['Date', 'Description', 'Amount'];
	const escape = (value: string | number) =>
		`"${String(value).replace(/"/g, '""')}"`; // escape quotes

	const lines = rows.map((t) =>
		[new Date(t.date).toLocaleDateString(), t.description, t.amount.toFixed(2)]
			.map(escape)
			.join(',')
	);

	return [header.join(','), ...lines].join('\n');
};

export default function DownloadDataScreen() {
	const [loading, setLoading] = useState(false);

	const handleDownload = async () => {
		try {
			setLoading(true);

			// 1. Fetch transactions – change URL / auth headers as needed
			const { data } = await axios.get<Transaction[]>(
				'https://api.example.com/transactions',
				{
					headers: { Authorization: 'Bearer <token>' },
				}
			);

			// 2. Convert to CSV
			const csv = toCSV(data);

			// 3. Write to a file in the app’s doc dir
			const fileUri = FileSystem.documentDirectory + 'transactions.csv';
			await FileSystem.writeAsStringAsync(fileUri, csv, {
				encoding: FileSystem.EncodingType.UTF8,
			});

			// 4. Trigger the share sheet
			if (!(await Sharing.isAvailableAsync())) {
				Alert.alert(
					'Sharing not available',
					'Cannot share files on this platform.'
				);
				return;
			}
			await Sharing.shareAsync(fileUri, {
				mimeType: 'text/csv',
				dialogTitle: 'Export Transactions',
			});
		} catch (err: any) {
			console.error(err);
			Alert.alert('Export failed', err?.message ?? 'Something went wrong');
		} finally {
			setLoading(false);
		}
	};

	return (
		<View style={styles.container}>
			<TouchableOpacity
				style={styles.button}
				onPress={handleDownload}
				disabled={loading}
			>
				{loading ? (
					<ActivityIndicator color="#FFF" />
				) : (
					<Text style={styles.buttonText}>Download CSV</Text>
				)}
			</TouchableOpacity>
			<Text style={styles.hint}>
				A share sheet will open – choose “Save to Files”, “Gmail”, etc.
			</Text>
		</View>
	);
}

const styles = StyleSheet.create({
	container: {
		flex: 1,
		justifyContent: 'center',
		alignItems: 'center',
		padding: 24,
		backgroundColor: '#f7f7f7',
	},
	button: {
		backgroundColor: '#007AFF',
		paddingVertical: 14,
		paddingHorizontal: 28,
		borderRadius: 12,
	},
	buttonText: {
		color: '#FFF',
		fontSize: 16,
		fontWeight: '600',
	},
	hint: {
		marginTop: 16,
		color: '#666',
		textAlign: 'center',
	},
});
