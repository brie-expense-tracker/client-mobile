import React, { useMemo, useState } from 'react';
import {
	View,
	Text,
	FlatList,
	TouchableOpacity,
	StyleSheet,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { RecurringExpense } from '../../../../src/services/recurringExpenseService';

const currency = (n: number) =>
	`$${n.toLocaleString(undefined, { maximumFractionDigits: 0 })}`;

const formatDate = (dateString: string) => {
	const date = new Date(dateString);
	return date.toLocaleDateString('en-US', {
		month: 'short',
		day: 'numeric',
		year: 'numeric',
	});
};

const getDaysUntilNext = (nextExpectedDate: string) => {
	const next = new Date(nextExpectedDate).setHours(0, 0, 0, 0);
	const now = new Date().setHours(0, 0, 0, 0);
	return Math.ceil((next - now) / (1000 * 60 * 60 * 24));
};

const getVendorIconAndColor = (
	vendor: string
): {
	icon: keyof typeof Ionicons.glyphMap;
	color: string;
} => {
	// Vendor-specific mappings
	const vendorMappings: Record<
		string,
		{ icon: keyof typeof Ionicons.glyphMap; color: string }
	> = {
		Netflix: { icon: 'film-outline', color: '#E50914' },
		Spotify: { icon: 'musical-notes-outline', color: '#1DB954' },
		Amazon: { icon: 'bag-outline', color: '#FF9900' },
		Uber: { icon: 'car-outline', color: '#000000' },
		Lyft: { icon: 'car-outline', color: '#FF00BF' },
		DoorDash: { icon: 'restaurant-outline', color: '#FF3008' },
		Grubhub: { icon: 'restaurant-outline', color: '#F63440' },
		Instacart: { icon: 'cart-outline', color: '#43B02A' },
		Apple: { icon: 'logo-apple', color: '#000000' },
		Google: { icon: 'logo-google', color: '#4285F4' },
		Microsoft: { icon: 'logo-microsoft', color: '#00A1F1' },
		Adobe: { icon: 'color-palette-outline', color: '#FF0000' },
		Zoom: { icon: 'videocam-outline', color: '#2D8CFF' },
		Slack: { icon: 'chatbubbles-outline', color: '#4A154B' },
		Notion: { icon: 'document-text-outline', color: '#000000' },
		Figma: { icon: 'color-palette-outline', color: '#F24E1E' },
		Canva: { icon: 'color-palette-outline', color: '#00C4CC' },
		Dropbox: { icon: 'cloud-outline', color: '#0061FF' },
		Box: { icon: 'cube-outline', color: '#0061D5' },
		GitHub: { icon: 'logo-github', color: '#181717' },
		GitLab: { icon: 'logo-github', color: '#FCA326' },
		Bitbucket: { icon: 'logo-github', color: '#0052CC' },
		Heroku: { icon: 'cloud-outline', color: '#430098' },
		Vercel: { icon: 'cloud-outline', color: '#000000' },
		Netlify: { icon: 'cloud-outline', color: '#00AD9F' },
		DigitalOcean: { icon: 'water-outline', color: '#0080FF' },
		AWS: { icon: 'cloud-outline', color: '#FF9900' },
		Azure: { icon: 'cloud-outline', color: '#0089D6' },
		GCP: { icon: 'cloud-outline', color: '#4285F4' },
		Stripe: { icon: 'card-outline', color: '#6772E5' },
		PayPal: { icon: 'card-outline', color: '#003087' },
		Squarespace: { icon: 'globe-outline', color: '#000000' },
		Wix: { icon: 'globe-outline', color: '#000000' },
		Shopify: { icon: 'bag-outline', color: '#95BF47' },
		WooCommerce: { icon: 'bag-outline', color: '#7F54B3' },
		Mailchimp: { icon: 'mail-outline', color: '#FFE01B' },
		ConvertKit: { icon: 'mail-outline', color: '#FB6970' },
		Klaviyo: { icon: 'mail-outline', color: '#E31C79' },
		HubSpot: { icon: 'business-outline', color: '#FF7A59' },
		Salesforce: { icon: 'business-outline', color: '#00A1E0' },
		Zendesk: { icon: 'chatbubbles-outline', color: '#03363D' },
		Intercom: { icon: 'chatbubbles-outline', color: '#1F8DED' },
		Drift: { icon: 'chatbubbles-outline', color: '#FF6B6B' },
		Calendly: { icon: 'calendar-outline', color: '#006BFF' },
		Acuity: { icon: 'calendar-outline', color: '#4A90E2' },
		Typeform: { icon: 'document-text-outline', color: '#262627' },
		SurveyMonkey: { icon: 'document-text-outline', color: '#00BF6F' },
		'Google Workspace': { icon: 'logo-google', color: '#4285F4' },
		'Microsoft 365': { icon: 'logo-microsoft', color: '#00A1F1' },
		'Zoom Pro': { icon: 'videocam-outline', color: '#2D8CFF' },
		'Slack Pro': { icon: 'chatbubbles-outline', color: '#4A154B' },
		'Notion Pro': { icon: 'document-text-outline', color: '#000000' },
		'Figma Pro': { icon: 'color-palette-outline', color: '#F24E1E' },
		'Canva Pro': { icon: 'color-palette-outline', color: '#00C4CC' },
		'Dropbox Pro': { icon: 'cloud-outline', color: '#0061FF' },
		'Box Pro': { icon: 'cube-outline', color: '#0061D5' },
		'GitHub Pro': { icon: 'logo-github', color: '#181717' },
		'GitLab Pro': { icon: 'logo-github', color: '#FCA326' },
		'Bitbucket Pro': { icon: 'logo-github', color: '#0052CC' },
		'Heroku Pro': { icon: 'cloud-outline', color: '#430098' },
		'Vercel Pro': { icon: 'cloud-outline', color: '#000000' },
		'Netlify Pro': { icon: 'cloud-outline', color: '#00AD9F' },
		'DigitalOcean Pro': { icon: 'water-outline', color: '#0080FF' },
		'AWS Pro': { icon: 'cloud-outline', color: '#FF9900' },
		'Azure Pro': { icon: 'cloud-outline', color: '#0089D6' },
		'GCP Pro': { icon: 'cloud-outline', color: '#4285F4' },
		'Stripe Pro': { icon: 'card-outline', color: '#6772E5' },
		'PayPal Pro': { icon: 'card-outline', color: '#003087' },
		'Squarespace Pro': { icon: 'globe-outline', color: '#000000' },
		'Wix Pro': { icon: 'globe-outline', color: '#000000' },
		'Shopify Pro': { icon: 'bag-outline', color: '#95BF47' },
		'WooCommerce Pro': { icon: 'bag-outline', color: '#7F54B3' },
		'Mailchimp Pro': { icon: 'mail-outline', color: '#FFE01B' },
		'ConvertKit Pro': { icon: 'mail-outline', color: '#FB6970' },
		'Klaviyo Pro': { icon: 'mail-outline', color: '#E31C79' },
		'HubSpot Pro': { icon: 'business-outline', color: '#FF7A59' },
		'Salesforce Pro': { icon: 'business-outline', color: '#00A1E0' },
		'Zendesk Pro': { icon: 'chatbubbles-outline', color: '#03363D' },
		'Intercom Pro': { icon: 'chatbubbles-outline', color: '#1F8DED' },
		'Drift Pro': { icon: 'chatbubbles-outline', color: '#FF6B6B' },
		'Calendly Pro': { icon: 'calendar-outline', color: '#006BFF' },
		'Acuity Pro': { icon: 'calendar-outline', color: '#4A90E2' },
		'Typeform Pro': { icon: 'document-text-outline', color: '#262627' },
		'SurveyMonkey Pro': { icon: 'document-text-outline', color: '#00BF6F' },
	};

	// Check for exact matches first
	if (vendorMappings[vendor]) {
		return vendorMappings[vendor];
	}

	// Check for partial matches
	for (const [key, value] of Object.entries(vendorMappings)) {
		if (vendor.toLowerCase().includes(key.toLowerCase())) {
			return value;
		}
	}

	// Check for common patterns
	if (vendor.toLowerCase().includes('netflix'))
		return { icon: 'film-outline', color: '#E50914' };
	if (vendor.toLowerCase().includes('spotify'))
		return { icon: 'musical-notes-outline', color: '#1DB954' };
	if (vendor.toLowerCase().includes('amazon'))
		return { icon: 'bag-outline', color: '#FF9900' };
	if (vendor.toLowerCase().includes('uber'))
		return { icon: 'car-outline', color: '#000000' };
	if (vendor.toLowerCase().includes('lyft'))
		return { icon: 'car-outline', color: '#FF00BF' };
	if (vendor.toLowerCase().includes('doordash'))
		return { icon: 'restaurant-outline', color: '#FF3008' };
	if (vendor.toLowerCase().includes('grubhub'))
		return { icon: 'restaurant-outline', color: '#F63440' };
	if (vendor.toLowerCase().includes('instacart'))
		return { icon: 'cart-outline', color: '#43B02A' };
	if (vendor.toLowerCase().includes('apple'))
		return { icon: 'logo-apple', color: '#000000' };
	if (vendor.toLowerCase().includes('google'))
		return { icon: 'logo-google', color: '#4285F4' };
	if (vendor.toLowerCase().includes('microsoft'))
		return { icon: 'logo-microsoft', color: '#00A1F1' };
	if (vendor.toLowerCase().includes('adobe'))
		return { icon: 'color-palette-outline', color: '#FF0000' };
	if (vendor.toLowerCase().includes('zoom'))
		return { icon: 'videocam-outline', color: '#2D8CFF' };
	if (vendor.toLowerCase().includes('slack'))
		return { icon: 'chatbubbles-outline', color: '#4A154B' };
	if (vendor.toLowerCase().includes('notion'))
		return { icon: 'document-text-outline', color: '#000000' };
	if (vendor.toLowerCase().includes('figma'))
		return { icon: 'color-palette-outline', color: '#F24E1E' };
	if (vendor.toLowerCase().includes('canva'))
		return { icon: 'color-palette-outline', color: '#00C4CC' };
	if (vendor.toLowerCase().includes('dropbox'))
		return { icon: 'cloud-outline', color: '#0061FF' };
	if (vendor.toLowerCase().includes('box'))
		return { icon: 'cube-outline', color: '#0061D5' };
	if (vendor.toLowerCase().includes('github'))
		return { icon: 'logo-github', color: '#181717' };
	if (vendor.toLowerCase().includes('gitlab'))
		return { icon: 'logo-github', color: '#FCA326' };
	if (vendor.toLowerCase().includes('bitbucket'))
		return { icon: 'logo-github', color: '#0052CC' };
	if (vendor.toLowerCase().includes('heroku'))
		return { icon: 'cloud-outline', color: '#430098' };
	if (vendor.toLowerCase().includes('vercel'))
		return { icon: 'cloud-outline', color: '#000000' };
	if (vendor.toLowerCase().includes('netlify'))
		return { icon: 'cloud-outline', color: '#00AD9F' };
	if (vendor.toLowerCase().includes('digitalocean'))
		return { icon: 'water-outline', color: '#0080FF' };
	if (vendor.toLowerCase().includes('aws'))
		return { icon: 'cloud-outline', color: '#FF9900' };
	if (vendor.toLowerCase().includes('azure'))
		return { icon: 'cloud-outline', color: '#0089D6' };
	if (vendor.toLowerCase().includes('gcp'))
		return { icon: 'cloud-outline', color: '#4285F4' };
	if (vendor.toLowerCase().includes('stripe'))
		return { icon: 'card-outline', color: '#6772E5' };
	if (vendor.toLowerCase().includes('paypal'))
		return { icon: 'card-outline', color: '#003087' };
	if (vendor.toLowerCase().includes('squarespace'))
		return { icon: 'globe-outline', color: '#000000' };
	if (vendor.toLowerCase().includes('wix'))
		return { icon: 'globe-outline', color: '#000000' };
	if (vendor.toLowerCase().includes('shopify'))
		return { icon: 'bag-outline', color: '#95BF47' };
	if (vendor.toLowerCase().includes('woocommerce'))
		return { icon: 'bag-outline', color: '#7F54B3' };
	if (vendor.toLowerCase().includes('mailchimp'))
		return { icon: 'mail-outline', color: '#FFE01B' };
	if (vendor.toLowerCase().includes('convertkit'))
		return { icon: 'mail-outline', color: '#FB6970' };
	if (vendor.toLowerCase().includes('klaviyo'))
		return { icon: 'mail-outline', color: '#E31C79' };
	if (vendor.toLowerCase().includes('hubspot'))
		return { icon: 'business-outline', color: '#FF7A59' };
	if (vendor.toLowerCase().includes('salesforce'))
		return { icon: 'business-outline', color: '#00A1E0' };
	if (vendor.toLowerCase().includes('zendesk'))
		return { icon: 'chatbubbles-outline', color: '#03363D' };
	if (vendor.toLowerCase().includes('intercom'))
		return { icon: 'chatbubbles-outline', color: '#1F8DED' };
	if (vendor.toLowerCase().includes('drift'))
		return { icon: 'chatbubbles-outline', color: '#FF6B6B' };
	if (vendor.toLowerCase().includes('calendly'))
		return { icon: 'calendar-outline', color: '#006BFF' };
	if (vendor.toLowerCase().includes('acuity'))
		return { icon: 'calendar-outline', color: '#4A90E2' };
	if (vendor.toLowerCase().includes('typeform'))
		return { icon: 'document-text-outline', color: '#262627' };
	if (vendor.toLowerCase().includes('surveymonkey'))
		return { icon: 'document-text-outline', color: '#00BF6F' };

	return { icon: 'repeat-outline', color: '#1E88E5' };
};

function RecurringExpenseRow({
	expense,
	onPressMenu,
	onPressRow,
}: {
	expense: RecurringExpense;
	onPressMenu?: (id: string) => void;
	onPressRow?: (expense: RecurringExpense) => void;
}) {
	const daysUntilNext = getDaysUntilNext(expense.nextExpectedDate);
	const { icon, color } = getVendorIconAndColor(expense.vendor);

	// Chip color by urgency
	let chipColor = '#E8F5E9';
	let chipText = '#2E7D32';

	if (daysUntilNext <= 3) {
		chipColor = '#FFEBEE';
		chipText = '#C62828';
	} else if (daysUntilNext <= 14) {
		chipColor = '#FFF3E0';
		chipText = '#EF6C00';
	}

	return (
		<TouchableOpacity
			style={styles.rowContainer}
			onPress={() => onPressRow?.(expense)}
			activeOpacity={0.7}
		>
			{/* Icon */}
			<View style={[styles.iconWrapper, { backgroundColor: color + '20' }]}>
				<Ionicons name={icon} size={24} color={color} />
			</View>

			{/* Middle content */}
			<View style={styles.rowMiddle}>
				<Text style={styles.title}>{expense.vendor}</Text>
				<Text style={styles.subtitleGray}>
					{expense.frequency.charAt(0).toUpperCase() +
						expense.frequency.slice(1)}{' '}
					• {formatDate(expense.nextExpectedDate)}
				</Text>
			</View>

			{/* Right side - Amount and Days */}
			<View style={styles.rightSection}>
				<Text style={styles.amountText}>{currency(expense.amount)}</Text>
				<View style={[styles.chip, { backgroundColor: chipColor }]}>
					<Text style={[styles.chipText, { color: chipText }]}>
						{daysUntilNext}d
					</Text>
				</View>
			</View>

			{/* Menu button */}
			<TouchableOpacity
				onPress={(e) => {
					e.stopPropagation();
					onPressMenu?.(expense.patternId);
				}}
				style={styles.kebabHit}
			>
				<Ionicons name="ellipsis-vertical" size={18} color="#a1a1aa" />
			</TouchableOpacity>
		</TouchableOpacity>
	);
}

const TABS = [
	{ key: 'all', label: 'All' },
	{ key: 'weekly', label: 'Weekly' },
	{ key: 'monthly', label: 'Monthly' },
] as const;
type TabKey = (typeof TABS)[number]['key'];

export default function RecurringExpensesFeed({
	scrollEnabled = true,
	onPressMenu,
	onPressRow,
	expenses = [],
}: {
	scrollEnabled?: boolean;
	onPressMenu?: (id: string) => void;
	onPressRow?: (expense: RecurringExpense) => void;
	expenses?: RecurringExpense[];
}) {
	const [tab, setTab] = useState<TabKey>('all');

	const filtered = useMemo(() => {
		if (tab === 'all') return expenses;
		return expenses.filter((expense) => expense.frequency === tab);
	}, [tab, expenses]);

	return (
		<View style={styles.screen}>
			{/* Segmented tabs */}
			<View style={styles.tabsRow}>
				{TABS.map((t) => {
					const active = tab === t.key;
					return (
						<TouchableOpacity
							key={t.key}
							onPress={() => setTab(t.key)}
							style={[
								styles.tabBtn,
								active ? styles.tabBtnActive : styles.tabBtnIdle,
							]}
						>
							<Text
								style={[
									styles.tabText,
									active ? styles.tabTextActive : styles.tabTextIdle,
								]}
							>
								{t.label}
							</Text>
						</TouchableOpacity>
					);
				})}
			</View>

			<FlatList
				data={filtered}
				keyExtractor={(expense) => expense.patternId}
				renderItem={({ item }) => (
					<RecurringExpenseRow
						expense={item}
						onPressMenu={onPressMenu ?? ((id) => console.log('menu:', id))}
						onPressRow={onPressRow}
					/>
				)}
				ItemSeparatorComponent={() => <View style={styles.separator} />}
				contentContainerStyle={{ paddingBottom: 24 }}
				scrollEnabled={scrollEnabled}
			/>
		</View>
	);
}

const styles = StyleSheet.create({
	screen: { flex: 1, backgroundColor: '#ffffff' },

	tabsRow: {
		flexDirection: 'row',
		paddingHorizontal: 16,
		paddingTop: 12,
		paddingBottom: 8,
	},
	tabBtn: {
		paddingHorizontal: 16,
		paddingVertical: 8,
		borderRadius: 16,
		borderWidth: 1,
		marginRight: 8,
	},
	tabBtnActive: { backgroundColor: '#18181b', borderColor: '#18181b' },
	tabBtnIdle: { backgroundColor: '#ffffff', borderColor: '#e5e7eb' },
	tabText: { fontSize: 13 },
	tabTextActive: { color: '#ffffff', fontWeight: '600' },
	tabTextIdle: { color: '#52525b' },

	separator: { height: 1, backgroundColor: '#f1f1f1' },

	rowContainer: {
		flexDirection: 'row',
		alignItems: 'flex-start',
		paddingHorizontal: 16,
		paddingVertical: 16,
		borderBottomWidth: 1,
		borderBottomColor: '#e5e7eb',
	},
	iconWrapper: {
		width: 48,
		height: 48,
		borderRadius: 24,
		marginRight: 12,
		justifyContent: 'center',
		alignItems: 'center',
	},

	rowMiddle: { flex: 1 },
	title: { fontSize: 17, fontWeight: '700', color: '#0a0a0a' },
	subtitleGray: { color: '#71717a', fontSize: 13, marginTop: 2 },

	rightSection: {
		flexDirection: 'column',
		alignItems: 'flex-end',
		gap: 4,
		marginRight: 8,
	},
	amountText: {
		fontSize: 17,
		fontWeight: '600',
		color: '#222222',
		textAlign: 'right',
	},
	chip: {
		paddingHorizontal: 8,
		paddingVertical: 4,
		borderRadius: 12,
		alignSelf: 'flex-end',
	},
	chipText: {
		fontSize: 11,
		fontWeight: '600',
		textAlign: 'center',
	},

	kebabHit: { paddingLeft: 4, paddingTop: 4, marginLeft: 4 },
});
