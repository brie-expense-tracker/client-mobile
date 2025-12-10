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
	Keyboard,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { DebtsService } from '../../../../src/services/feature/debtsService';
import { DateField } from '../../../../src/components/DateField';
import { palette, radius, space } from '../../../../src/ui/theme';

export default function NewDebtScreen() {
	const router = useRouter();
	const [name, setName] = useState('');
	const [balance, setBalance] = useState('');
	const [apr, setApr] = useState('');
	const [minPayment, setMinPayment] = useState('');
	const [dueDate, setDueDate] = useState<string>('');
	const [loading, setLoading] = useState(false);

	const onSave = async () => {
		// Validation
		if (!name.trim()) {
			return Alert.alert('Missing information', 'Please enter a debt name.');
		}

		const balNum = Number(balance);
		if (isNaN(balNum) || balNum <= 0) {
			return Alert.alert(
				'Invalid amount',
				'Please enter a valid current balance greater than 0.'
			);
		}

		const aprNum = apr ? Number(apr) : undefined;
		if (aprNum !== undefined && (isNaN(aprNum) || aprNum < 0 || aprNum > 100)) {
			return Alert.alert(
				'Invalid interest rate',
				'Interest rate must be between 0 and 100%.'
			);
		}

		const minPaymentNum = minPayment ? Number(minPayment) : undefined;
		if (
			minPaymentNum !== undefined &&
			(isNaN(minPaymentNum) || minPaymentNum < 0)
		) {
			return Alert.alert(
				'Invalid amount',
				'Minimum payment must be a positive number.'
			);
		}

		const dueDayNum = dueDate ? new Date(dueDate).getDate() : undefined;

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
		<SafeAreaView style={styles.container} edges={['left', 'right']}>
			<ScrollView
				style={styles.scrollView}
				contentContainerStyle={styles.scrollContent}
				showsVerticalScrollIndicator={false}
				contentInsetAdjustmentBehavior="automatic"
				keyboardShouldPersistTaps="handled"
				onScrollBeginDrag={Keyboard.dismiss}
				automaticallyAdjustKeyboardInsets
			>
				{/* Header / Hero */}
				<View style={styles.header}>
					<View style={styles.pill}>
						<Text style={styles.pillText}>New debt</Text>
					</View>
					<Text style={styles.title}>Add a new debt</Text>
					<Text style={styles.subtitle}>
						Track what you owe, your interest rate, and minimum payment so Brie
						can help you plan payoff strategies.
					</Text>
				</View>

				{/* Card */}
				<View style={styles.card}>
					<Text style={styles.sectionLabel}>Details</Text>

					<View style={styles.fieldGroup}>
						<Label text="Name" required />
						<TextInput
							style={styles.input}
							placeholder="Chase Sapphire, Student Loan"
							placeholderTextColor={palette.textSubtle}
							value={name}
							onChangeText={setName}
							autoCapitalize="words"
							returnKeyType="next"
						/>
					</View>

					<View style={styles.fieldGroup}>
						<Label text="Current balance" required />
						<TextInput
							style={styles.input}
							placeholder="0.00"
							placeholderTextColor={palette.textSubtle}
							value={balance}
							onChangeText={(text) => {
								const cleaned = text.replace(/[^0-9.]/g, '');
								setBalance(cleaned);
							}}
							keyboardType="decimal-pad"
						/>
						<Text style={styles.helperText}>
							Include your latest statement balance.
						</Text>
					</View>

					<View style={styles.inlineRow}>
						<View style={[styles.fieldGroup, styles.inlineItem]}>
							<Label text="Interest rate (APR %)" optional />
							<TextInput
								style={styles.input}
								placeholder="24.99"
								placeholderTextColor={palette.textSubtle}
								value={apr}
								onChangeText={(text) => {
									const cleaned = text.replace(/[^0-9.]/g, '');
									setApr(cleaned);
								}}
								keyboardType="decimal-pad"
							/>
						</View>

						<View style={[styles.fieldGroup, styles.inlineItem]}>
							<Label text="Minimum payment" optional />
							<TextInput
								style={styles.input}
								placeholder="0.00"
								placeholderTextColor={palette.textSubtle}
								value={minPayment}
								onChangeText={(text) => {
									const cleaned = text.replace(/[^0-9.]/g, '');
									setMinPayment(cleaned);
								}}
								keyboardType="decimal-pad"
							/>
						</View>
					</View>

					<View style={styles.fieldGroup}>
						<Label text="Next due date" optional />
						<DateField
							value={dueDate}
							onChange={setDueDate}
							title=""
							placeholder="Pick a date"
						/>
						<Text style={styles.helperText}>
							Used for reminders and payoff projections.
						</Text>
					</View>
				</View>
			</ScrollView>

			{/* Footer CTA */}
			<View style={styles.footer}>
				<TouchableOpacity
					style={[styles.cta, loading && { opacity: 0.7 }]}
					onPress={onSave}
					disabled={loading}
					activeOpacity={0.85}
				>
					{loading ? (
						<ActivityIndicator color={palette.primaryTextOn} />
					) : (
						<Text style={styles.ctaText}>Save debt</Text>
					)}
				</TouchableOpacity>
			</View>
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
	container: {
		flex: 1,
		backgroundColor: palette.surfaceAlt,
	},
	scrollView: { flex: 1 },
	scrollContent: {
		paddingHorizontal: space.lg,
		paddingTop: space.sm, // reduced to tighten space under nav
		paddingBottom: space.xl,
	},
	header: {
		marginBottom: space.lg,
	},
	pill: {
		alignSelf: 'flex-start',
		paddingHorizontal: space.sm + 2,
		paddingVertical: 4,
		borderRadius: radius.pill,
		backgroundColor: palette.accentSoft,
		marginBottom: space.sm,
	},
	pillText: {
		color: palette.accent,
		fontSize: 12,
		fontWeight: '600',
		letterSpacing: 0.5,
		textTransform: 'uppercase',
	},
	title: {
		fontSize: 24,
		fontWeight: '700',
		color: palette.text,
		marginBottom: 4,
	},
	subtitle: {
		fontSize: 14,
		color: palette.textMuted,
		lineHeight: 20,
	},
	card: {
		borderRadius: radius.xl,
		backgroundColor: palette.surface,
		paddingHorizontal: space.lg,
		paddingVertical: space.lg,
		borderWidth: 1,
		borderColor: palette.border,
		gap: space.md,
	},
	sectionLabel: {
		fontSize: 12,
		fontWeight: '600',
		color: palette.textMuted,
		textTransform: 'uppercase',
		letterSpacing: 0.6,
		marginBottom: 2,
	},
	fieldGroup: {
		marginTop: 8,
	},
	label: {
		fontWeight: '600',
		color: palette.text,
		marginBottom: 4,
		fontSize: 14,
	},
	required: {
		color: palette.danger,
	},
	optional: {
		color: palette.textMuted,
		fontWeight: '400',
		fontSize: 12,
	},
	input: {
		height: 44,
		borderRadius: radius.md,
		borderWidth: 1,
		borderColor: palette.border,
		paddingHorizontal: space.md,
		fontSize: 16,
		color: palette.text,
		backgroundColor: palette.surface,
	},
	helperText: {
		marginTop: 4,
		fontSize: 12,
		color: palette.textMuted,
	},
	inlineRow: {
		flexDirection: 'row',
		gap: space.md,
		marginTop: space.sm,
	},
	inlineItem: {
		flex: 1,
	},
	footer: {
		paddingHorizontal: space.lg,
		paddingBottom: space.xl,
		paddingTop: space.sm,
		borderTopWidth: 1,
		borderTopColor: palette.border,
		backgroundColor: palette.surface,
	},
	cta: {
		height: 52,
		borderRadius: radius.lg,
		backgroundColor: palette.accent,
		alignItems: 'center',
		justifyContent: 'center',
	},
	ctaText: {
		color: palette.primaryTextOn,
		fontWeight: '700',
		fontSize: 16,
	},
});
