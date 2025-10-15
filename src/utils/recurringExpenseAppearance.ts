import { Ionicons } from '@expo/vector-icons';
import { RecurringExpense } from '../services';

// Vendor icon/color mappings - smart defaults for known services
const VENDOR_MAPPINGS: Record<
	string,
	{ icon: keyof typeof Ionicons.glyphMap; color: string }
> = {
	// Streaming & Entertainment
	netflix: { icon: 'film-outline', color: '#E50914' },
	spotify: { icon: 'musical-notes-outline', color: '#1DB954' },

	// E-commerce
	amazon: { icon: 'bag-outline', color: '#FF9900' },
	shopify: { icon: 'bag-outline', color: '#95BF47' },
	woocommerce: { icon: 'bag-outline', color: '#7F54B3' },

	// Transportation
	uber: { icon: 'car-outline', color: '#000000' },
	lyft: { icon: 'car-outline', color: '#FF00BF' },

	// Food Delivery
	doordash: { icon: 'restaurant-outline', color: '#FF3008' },
	grubhub: { icon: 'restaurant-outline', color: '#F63440' },
	instacart: { icon: 'cart-outline', color: '#43B02A' },

	// Tech Giants
	apple: { icon: 'logo-apple', color: '#000000' },
	google: { icon: 'logo-google', color: '#4285F4' },
	microsoft: { icon: 'logo-microsoft', color: '#00A1F1' },

	// Design Tools
	adobe: { icon: 'color-palette-outline', color: '#FF0000' },
	figma: { icon: 'color-palette-outline', color: '#F24E1E' },
	canva: { icon: 'color-palette-outline', color: '#00C4CC' },

	// Communication
	zoom: { icon: 'videocam-outline', color: '#2D8CFF' },
	slack: { icon: 'chatbubbles-outline', color: '#4A154B' },
	intercom: { icon: 'chatbubbles-outline', color: '#1F8DED' },
	drift: { icon: 'chatbubbles-outline', color: '#FF6B6B' },
	zendesk: { icon: 'chatbubbles-outline', color: '#03363D' },

	// Productivity
	notion: { icon: 'document-text-outline', color: '#000000' },

	// Cloud Storage
	dropbox: { icon: 'cloud-outline', color: '#0061FF' },
	box: { icon: 'cube-outline', color: '#0061D5' },

	// Dev Tools & Hosting
	github: { icon: 'logo-github', color: '#181717' },
	gitlab: { icon: 'logo-github', color: '#FCA326' },
	bitbucket: { icon: 'logo-github', color: '#0052CC' },
	heroku: { icon: 'cloud-outline', color: '#430098' },
	vercel: { icon: 'cloud-outline', color: '#000000' },
	netlify: { icon: 'cloud-outline', color: '#00AD9F' },
	digitalocean: { icon: 'water-outline', color: '#0080FF' },
	aws: { icon: 'cloud-outline', color: '#FF9900' },
	azure: { icon: 'cloud-outline', color: '#0089D6' },
	gcp: { icon: 'cloud-outline', color: '#4285F4' },

	// Payments
	stripe: { icon: 'card-outline', color: '#6772E5' },
	paypal: { icon: 'card-outline', color: '#003087' },

	// Website Builders
	squarespace: { icon: 'globe-outline', color: '#000000' },
	wix: { icon: 'globe-outline', color: '#000000' },

	// Marketing
	mailchimp: { icon: 'mail-outline', color: '#FFE01B' },
	convertkit: { icon: 'mail-outline', color: '#FB6970' },
	klaviyo: { icon: 'mail-outline', color: '#E31C79' },
	hubspot: { icon: 'business-outline', color: '#FF7A59' },
	salesforce: { icon: 'business-outline', color: '#00A1E0' },

	// Scheduling & Forms
	calendly: { icon: 'calendar-outline', color: '#006BFF' },
	acuity: { icon: 'calendar-outline', color: '#4A90E2' },
	typeform: { icon: 'document-text-outline', color: '#262627' },
	surveymonkey: { icon: 'document-text-outline', color: '#00BF6F' },
};

/**
 * Get brand-mapped icon and color for a vendor (fallback logic only)
 */
function getVendorBrandMapping(vendor: string): {
	icon: keyof typeof Ionicons.glyphMap;
	color: string;
} {
	const vendorLower = vendor.toLowerCase();

	// Check for exact match first (case-insensitive)
	if (VENDOR_MAPPINGS[vendorLower]) {
		return VENDOR_MAPPINGS[vendorLower];
	}

	// Check for partial matches (handles "Netflix Premium", "Spotify Pro", etc.)
	for (const [key, value] of Object.entries(VENDOR_MAPPINGS)) {
		if (vendorLower.includes(key)) {
			return value;
		}
	}

	// No brand mapping found
	return { icon: 'repeat-outline', color: '#1E88E5' };
}

/**
 * Resolve the appearance (icon & color) for a recurring expense
 * Respects user's appearanceMode to prevent vendor mapping from overriding custom choices
 */
export function resolveRecurringExpenseAppearance(
	expense: RecurringExpense & {
		appearanceMode?: 'custom' | 'brand' | 'default';
	}
): {
	icon: keyof typeof Ionicons.glyphMap;
	color: string;
	source: 'custom' | 'brand' | 'default';
} {
	console.log('🎨 [AppearanceResolver] Resolving for:', expense.vendor);
	console.log('  - appearanceMode:', expense.appearanceMode);
	console.log('  - icon:', expense.icon);
	console.log('  - color:', expense.color);

	// 1) Custom overrides win - user explicitly chose icon/color
	if (expense.appearanceMode === 'custom') {
		const result = {
			icon:
				(expense.icon as keyof typeof Ionicons.glyphMap) || 'repeat-outline',
			color: expense.color || '#1E88E5',
			source: 'custom' as const,
		};
		console.log('  ✅ Using CUSTOM appearance:', result);
		return result;
	}

	// 2) Brand mapping if enabled (default for most expenses)
	if (expense.appearanceMode === 'brand' || expense.appearanceMode == null) {
		const brandMapping = getVendorBrandMapping(expense.vendor);
		const result = {
			icon: brandMapping.icon,
			color: brandMapping.color,
			source: 'brand' as const,
		};
		console.log('  ✅ Using BRAND appearance:', result);
		return result;
	}

	// 3) Neutral default
	const result = {
		icon: 'repeat-outline' as keyof typeof Ionicons.glyphMap,
		color: '#1E88E5',
		source: 'default' as const,
	};
	console.log('  ✅ Using DEFAULT appearance:', result);
	return result;
}
