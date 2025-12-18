import React, { useMemo, useEffect } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import { palette, radius, space, type, shadow } from '../../../src/ui/theme';
import Animated, {
	useSharedValue,
	withTiming,
	useAnimatedStyle,
} from 'react-native-reanimated';
import { useProfile } from '../../../src/context/profileContext';
import { useOnboarding } from '../../../src/context/OnboardingContext';
import { currency } from '../../../src/utils/format';

type SectionKey = 'profile' | 'income' | 'savings' | 'debt';

function SectionCard({
	title,
	subtitle,
	icon,
	onPress,
}: {
	title: string;
	subtitle: string;
	icon: keyof typeof Ionicons.glyphMap;
	onPress: () => void;
}) {
	return (
		<Pressable
			onPress={onPress}
			style={({ pressed }) => [styles.card, pressed && { opacity: 0.9 }]}
		>
			<View style={styles.cardLeft}>
				<View style={styles.iconWrap}>
					<Ionicons name={icon} size={18} color={palette.primary} />
				</View>
				<View style={{ flex: 1 }}>
					<Text style={styles.cardTitle}>{title}</Text>
					<Text style={styles.cardSub}>{subtitle}</Text>
				</View>
			</View>
			<Ionicons name="chevron-forward" size={18} color={palette.textSubtle} />
		</Pressable>
	);
}

export default function OnboardingEditIndex() {
	const router = useRouter();
	const { profile } = useProfile();
	const { setIsEditingOnboarding } = useOnboarding();

	const sections = useMemo(() => {
		const monthlyIncome = profile?.monthlyIncome ?? 0;
		const savings = profile?.savings ?? 0;
		const debt = profile?.debt ?? 0;

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
		router.replace('/(tabs)/dashboard');
	};

	return (
		<View style={styles.screen}>
			<Animated.View style={[{ flex: 1 }, animStyle]}>
				<View style={styles.header}>
					<Text style={styles.title}>Review your details</Text>
					<Text style={styles.subtitle}>
						Update anything below — your snapshot and health score will adjust
						automatically.
					</Text>
				</View>

				<View style={styles.content}>
					{sections.map((s) => (
						<SectionCard
							key={s.key}
							title={s.title}
							subtitle={s.subtitle}
							icon={s.icon}
							onPress={() => router.push(s.route)}
						/>
					))}
				</View>

				<View style={styles.footer}>
					<Pressable
						onPress={onDone}
						style={({ pressed }) => [styles.doneBtn, pressed && { opacity: 0.9 }]}
					>
						<Text style={styles.doneText}>Done reviewing</Text>
					</Pressable>
				</View>
			</Animated.View>
		</View>
	);
}

const styles = StyleSheet.create({
	screen: {
		flex: 1,
		backgroundColor: palette.surfaceAlt,
	},
	header: {
		padding: space.lg,
		paddingTop: 60,
	},
	title: {
		...type.titleMd,
		color: palette.text,
	},
	subtitle: {
		...type.body,
		color: palette.textMuted,
		marginTop: 6,
	},
	content: {
		flex: 1,
		paddingHorizontal: space.lg,
		gap: space.sm,
	},
	card: {
		backgroundColor: palette.surface,
		borderRadius: radius.lg,
		padding: space.md,
		...shadow.soft,
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
		borderWidth: 1,
		borderColor: palette.border,
	},
	cardLeft: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: space.md,
		flex: 1,
	},
	iconWrap: {
		width: 40,
		height: 40,
		borderRadius: 20,
		backgroundColor: palette.primarySubtle,
		alignItems: 'center',
		justifyContent: 'center',
	},
	cardTitle: {
		...type.h2,
		color: palette.text,
	},
	cardSub: {
		...type.small,
		color: palette.textMuted,
		marginTop: 2,
	},
	footer: {
		padding: space.lg,
		paddingBottom: 40,
	},
	doneBtn: {
		height: 54,
		borderRadius: radius.lg,
		backgroundColor: palette.primary,
		alignItems: 'center',
		justifyContent: 'center',
		...shadow.card,
	},
	doneText: {
		...type.body,
		fontWeight: '700',
		color: palette.primaryTextOn,
	},
});

