import React, { useMemo, useEffect } from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { palette, radius, space } from '../../../src/ui/theme';
import { AppCard, AppText, AppButton, AppRow } from '../../../src/ui/primitives';
import Animated, {
	useSharedValue,
	withTiming,
	useAnimatedStyle,
} from 'react-native-reanimated';
import { useProfile } from '../../../src/context/profileContext';
import { useOnboarding } from '../../../src/context/OnboardingContext';

const currency = (amount: number) =>
	new Intl.NumberFormat('en-US', {
		style: 'currency',
		currency: 'USD',
		maximumFractionDigits: 0,
	}).format(amount);

type SectionKey = 'profile' | 'income' | 'expenses' | 'savings' | 'debt';

export default function OnboardingEditIndex() {
	const router = useRouter();
	const insets = useSafeAreaInsets();
	const { profile } = useProfile();
	const { setIsEditingOnboarding } = useOnboarding();

	const sections = useMemo(() => {
		const monthlyIncome = profile?.monthlyIncome ?? 0;
		const savings = profile?.savings ?? 0;
		const debt = profile?.debt ?? 0;
		const expenses = profile?.expenses ?? { housing: 0, loans: 0, subscriptions: 0 };
		const totalExpenses =
			(expenses.housing ?? 0) + (expenses.loans ?? 0) + (expenses.subscriptions ?? 0);

		return [
			{
				key: 'profile' as SectionKey,
				title: 'Profile',
				subtitle: profile?.firstName
					? `Looks good, ${profile.firstName}`
					: 'Review your basics',
				icon: 'person-circle-outline' as const,
				route: '/(onboarding)/edit/profile' as const,
			},
			{
				key: 'income' as SectionKey,
				title: 'Income',
				subtitle: monthlyIncome
					? `${currency(monthlyIncome)}/mo`
					: 'Add your monthly income',
				icon: 'cash-outline' as const,
				route: '/(onboarding)/edit/income' as const,
			},
			{
				key: 'expenses' as SectionKey,
				title: 'Expenses',
				subtitle: totalExpenses
					? `${currency(totalExpenses)}/mo`
					: 'Housing, loans, subscriptions',
				icon: 'receipt-outline' as const,
				route: '/(onboarding)/edit/expenses' as const,
			},
			{
				key: 'savings' as SectionKey,
				title: 'Savings & Investments',
				subtitle: savings
					? `${currency(savings)} saved`
					: 'Adding savings improves your score',
				icon: 'wallet-outline' as const,
				route: '/(onboarding)/edit/savings' as const,
			},
			{
				key: 'debt' as SectionKey,
				title: 'Debt',
				subtitle: debt ? `${currency(debt)} total` : 'Add any debt (optional)',
				icon: 'card-outline' as const,
				route: '/(onboarding)/edit/debt' as const,
			},
		];
	}, [profile]);

	const opacity = useSharedValue(0);
	const translateY = useSharedValue(8);

	useEffect(() => {
		opacity.value = withTiming(1, { duration: 220 });
		translateY.value = withTiming(0, { duration: 220 });
	}, [opacity, translateY]);

	const animStyle = useAnimatedStyle(() => ({
		opacity: opacity.value,
		transform: [{ translateY: translateY.value }],
	}));

	const onDone = async () => {
		await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
		setIsEditingOnboarding(false);
		router.back();
	};

	return (
		<View style={[styles.screen, { paddingTop: insets.top }]}>
			<Animated.View style={[styles.container, animStyle]}>
				<View style={styles.header}>
					<AppText.Title style={styles.title}>Review your details</AppText.Title>
					<AppText.Caption color="muted" style={styles.subtitle}>
						Update anything below — your snapshot and health score will adjust
						automatically.
					</AppText.Caption>
				</View>

				<ScrollView
					style={styles.scroll}
					contentContainerStyle={[
						styles.content,
						{ paddingBottom: insets.bottom + space.xxl },
					]}
					showsVerticalScrollIndicator={false}
				>
					<AppCard padding={0} borderRadius={radius.lg}>
						{sections.map((s, i) => (
							<AppRow
								key={s.key}
								icon={s.icon}
								iconColor={palette.primary}
								label={s.title}
								description={s.subtitle}
								onPress={() => router.push(s.route)}
								bordered={i < sections.length - 1}
							/>
						))}
					</AppCard>

					<View style={styles.footer}>
						<AppButton
							label="Done reviewing"
							variant="primary"
							onPress={onDone}
							fullWidth
						/>
					</View>
				</ScrollView>
			</Animated.View>
		</View>
	);
}

const styles = StyleSheet.create({
	screen: {
		flex: 1,
		backgroundColor: palette.bg,
	},
	container: {
		flex: 1,
	},
	header: {
		paddingHorizontal: space.lg,
		paddingVertical: space.md,
		borderBottomWidth: StyleSheet.hairlineWidth,
		borderBottomColor: palette.border,
	},
	title: {
		textAlign: 'center',
	},
	subtitle: {
		marginTop: 6,
		textAlign: 'center',
	},
	scroll: {
		flex: 1,
	},
	content: {
		paddingHorizontal: space.lg,
		paddingTop: space.lg,
		gap: space.lg,
	},
	footer: {
		marginTop: space.lg,
	},
});

