import React, { useState } from 'react';
import {
	View,
	Text,
	TextInput,
	TouchableOpacity,
	StyleSheet,
	ActivityIndicator,
	Alert,
	ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { DebtsService } from '../../../src/services/feature/debtsService';

const palette = {
	bg: '#FFFFFF',
	text: '#0F172A',
	sub: '#64748B',
	line: '#E2E8F0',
	accent: '#0095FF',
};

export default function NewDebtScreen() {
	const router = useRouter();
	const [name, setName] = useState('');
	const [balance, setBalance] = useState('');
	const [apr, setApr] = useState('');
	const [minPayment, setMinPayment] = useState('');
	const [dueDay, setDueDay] = useState('');
	const [loading, setLoading] = useState(false);

	const onSave = async () => {
		// Validation
		if (!name.trim()) {
			return Alert.alert('Missing Information', 'Please enter a debt name.');
		}

		const balNum = Number(balance);
		if (isNaN(balNum) || balNum <= 0) {
			return Alert.alert(
				'Invalid Amount',
				'Please enter a valid current balance greater than 0.'
			);
		}

		const aprNum = apr ? Number(apr) : undefined;
		if (aprNum !== undefined && (isNaN(aprNum) || aprNum < 0 || aprNum > 100)) {
			return Alert.alert(
				'Invalid Interest Rate',
				'Interest rate must be between 0 and 100%.'
			);
		}

		const minPaymentNum = minPayment ? Number(minPayment) : undefined;
		if (
			minPaymentNum !== undefined &&
			(isNaN(minPaymentNum) || minPaymentNum < 0)
		) {
			return Alert.alert(
				'Invalid Amount',
				'Minimum payment must be a positive number.'
			);
		}

		const dueDayNum = dueDay ? Number(dueDay) : undefined;
		if (
			dueDayNum !== undefined &&
			(isNaN(dueDayNum) || dueDayNum < 1 || dueDayNum > 31)
		) {
			return Alert.alert(
				'Invalid Due Day',
				'Due day must be between 1 and 31.'
			);
		}

		setLoading(true);
		try {
			await DebtsService.create({
				name: name.trim(),
				currentBalance: balNum,
				interestRate: aprNum,
				minPayment: minPaymentNum,
				dueDayOfMonth: dueDayNum,
			});
			router.back();
		} catch (err: any) {
			Alert.alert(
				'Error',
				err?.message || 'Unable to create debt. Please try again.'
			);
		} finally {
			setLoading(false);
		}
	};

	return (
		<SafeAreaView style={styles.container} edges={['left', 'right', 'bottom']}>
			<ScrollView
				style={styles.scrollView}
				contentContainerStyle={styles.scrollContent}
				showsVerticalScrollIndicator={false}
			>
				<View style={styles.form}>
					<Label text="Name" required style={{ marginTop: 16 }} />
					<TextInput
						style={styles.input}
						placeholder="e.g., Chase Sapphire, Student Loan"
						placeholderTextColor="#999"
						value={name}
						onChangeText={setName}
						autoCapitalize="words"
					/>

					<Label text="Current balance" required />
					<TextInput
						style={styles.input}
						placeholder="0.00"
						placeholderTextColor="#999"
						value={balance}
						onChangeText={(text) => {
							// Allow only numbers and decimal point
							const cleaned = text.replace(/[^0-9.]/g, '');
							setBalance(cleaned);
						}}
						keyboardType="decimal-pad"
					/>

					<Label text="Interest rate (APR %)" optional />
					<TextInput
						style={styles.input}
						placeholder="e.g., 24.99"
						placeholderTextColor="#999"
						value={apr}
						onChangeText={(text) => {
							// Allow only numbers and decimal point
							const cleaned = text.replace(/[^0-9.]/g, '');
							setApr(cleaned);
						}}
						keyboardType="decimal-pad"
					/>

					<Label text="Minimum payment" optional />
					<TextInput
						style={styles.input}
						placeholder="0.00"
						placeholderTextColor="#999"
						value={minPayment}
						onChangeText={(text) => {
							// Allow only numbers and decimal point
							const cleaned = text.replace(/[^0-9.]/g, '');
							setMinPayment(cleaned);
						}}
						keyboardType="decimal-pad"
					/>

					<Label text="Due day of month" optional />
					<TextInput
						style={styles.input}
						placeholder="1-31"
						placeholderTextColor="#999"
						value={dueDay}
						onChangeText={(text) => {
							// Allow only numbers
							const cleaned = text.replace(/[^0-9]/g, '');
							if (
								cleaned === '' ||
								(Number(cleaned) >= 1 && Number(cleaned) <= 31)
							) {
								setDueDay(cleaned);
							}
						}}
						keyboardType="number-pad"
						maxLength={2}
					/>
				</View>
			</ScrollView>

			<TouchableOpacity
				style={[styles.cta, loading && { opacity: 0.6 }]}
				onPress={onSave}
				disabled={loading}
			>
				{loading ? (
					<ActivityIndicator color="#fff" />
				) : (
					<Text style={styles.ctaText}>Save Debt</Text>
				)}
			</TouchableOpacity>
		</SafeAreaView>
	);
}

function Label({
	text,
	required,
	optional,
	style,
}: {
	text: string;
	required?: boolean;
	optional?: boolean;
	style?: any;
}) {
	return (
		<Text style={[styles.label, style]}>
			{text}
			{required && <Text style={styles.required}> *</Text>}
			{optional && <Text style={styles.optional}> (optional)</Text>}
		</Text>
	);
}

const styles = StyleSheet.create({
	container: { flex: 1, backgroundColor: palette.bg },
	form: {
		paddingHorizontal: 16,
		paddingTop: 0,
		gap: 10,
	},
	label: {
		fontWeight: '600',
		color: palette.text,
		marginTop: 0,
		marginBottom: 2,
		fontSize: 14,
	},
	required: {
		color: '#EF4444',
	},
	optional: {
		color: palette.sub,
		fontWeight: '400',
		fontSize: 12,
	},
	input: {
		height: 44,
		borderRadius: 12,
		borderWidth: 1,
		borderColor: palette.line,
		paddingHorizontal: 12,
		fontSize: 16,
		color: palette.text,
		backgroundColor: '#FFFFFF',
	},
	scrollView: { flex: 1 },
	scrollContent: {
		paddingBottom: 24,
	},
	cta: {
		marginTop: 'auto',
		marginHorizontal: 16,
		marginBottom: 24,
		height: 50,
		borderRadius: 14,
		backgroundColor: palette.accent,
		alignItems: 'center',
		justifyContent: 'center',
	},
	ctaText: { color: '#fff', fontWeight: '700', fontSize: 16 },
});
