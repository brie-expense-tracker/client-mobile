import { Ionicons } from '@expo/vector-icons';

// ==========================================
// Color Palette
// ==========================================
export const COLOR_PALETTE = {
	red: { base: '#E53935', pastel: '#EF5350', dark: '#B71C1C' },
	orange: { base: '#FB8C00', pastel: '#FFB74D', dark: '#E65100' },
	yellow: { base: '#FDD835', pastel: '#FFEE58', dark: '#FBC02D' },
	green: { base: '#43A047', pastel: '#A5D6A7', dark: '#1B5E20' },
	blue: { base: '#1E88E5', pastel: '#42A5F5', dark: '#0D47A1' },
	indigo: { base: '#5E35B1', pastel: '#5C6BC0', dark: '#311B92' },
	violet: { base: '#8E24AA', pastel: '#AB47BC', dark: '#4A0072' },
	grey: { base: '#424242', pastel: '#757575', dark: '#212121' },
} as const;

export type ColorOption = {
	base: string;
	pastel: string;
	dark: string;
};

// ==========================================
// Icon Sets
// ==========================================

// Popular goal icons
export const GOAL_ICONS: (keyof typeof Ionicons.glyphMap)[] = [
	'flag-outline',
	'trophy-outline',
	'star-outline',
	'diamond-outline',
	'ribbon-outline',
	'medal-outline',
	'checkmark-circle-outline',
	'home-outline',
	'business-outline',
	'construct-outline',
	'hammer-outline',
	'key-outline',
	'lock-open-outline',
	'car-outline',
	'airplane-outline',
	'train-outline',
	'bus-outline',
	'bicycle-outline',
	'boat-outline',
	'compass-outline',
	'map-outline',
	'location-outline',
	'camera-outline',
	'bed-outline',
	'umbrella-outline',
	'globe-outline',
	'book-outline',
	'school-outline',
	'library-outline',
	'briefcase-outline',
	'laptop-outline',
	'desktop-outline',
	'fitness-outline',
	'medical-outline',
	'heart-outline',
	'medkit-outline',
	'bandage-outline',
	'body-outline',
	'game-controller-outline',
	'musical-notes-outline',
	'film-outline',
	'color-palette-outline',
	'bag-outline',
	'cart-outline',
	'card-outline',
	'wallet-outline',
	'storefront-outline',
	'cut-outline',
	'phone-portrait-outline',
	'tablet-portrait-outline',
	'watch-outline',
	'headset-outline',
	'wifi-outline',
	'cloud-outline',
	'people-outline',
	'person-outline',
	'gift-outline',
	'rose-outline',
	'football-outline',
	'basketball-outline',
	'baseball-outline',
	'golf-outline',
	'tennisball-outline',
	'snow-outline',
	'calculator-outline',
	'pie-chart-outline',
	'trending-up-outline',
	'shield-checkmark-outline',
	'balloon-outline',
	'cafe-outline',
	'restaurant-outline',
	'fast-food-outline',
	'wine-outline',
	'pizza-outline',
	'paw-outline',
	'fish-outline',
	'leaf-outline',
	'rocket-outline',
	'flash-outline',
	'bulb-outline',
	'calendar-outline',
	'time-outline',
	'notifications-outline',
	'settings-outline',
];

// Popular budget icons
export const BUDGET_ICONS: (keyof typeof Ionicons.glyphMap)[] = [
	'restaurant-outline',
	'fast-food-outline',
	'wine-outline',
	'cafe-outline',
	'pizza-outline',
	'paw-outline',
	'fish-outline',
	'leaf-outline',
	'car-outline',
	'airplane-outline',
	'train-outline',
	'bus-outline',
	'bicycle-outline',
	'boat-outline',
	'compass-outline',
	'map-outline',
	'location-outline',
	'camera-outline',
	'bed-outline',
	'umbrella-outline',
	'globe-outline',
	'book-outline',
	'school-outline',
	'library-outline',
	'briefcase-outline',
	'laptop-outline',
	'desktop-outline',
	'fitness-outline',
	'medical-outline',
	'heart-outline',
	'medkit-outline',
	'bandage-outline',
	'body-outline',
	'game-controller-outline',
	'musical-notes-outline',
	'film-outline',
	'color-palette-outline',
	'bag-outline',
	'cart-outline',
	'card-outline',
	'wallet-outline',
	'storefront-outline',
	'cut-outline',
	'phone-portrait-outline',
	'tablet-portrait-outline',
	'watch-outline',
	'headset-outline',
	'wifi-outline',
	'cloud-outline',
	'people-outline',
	'person-outline',
	'gift-outline',
	'rose-outline',
	'football-outline',
	'basketball-outline',
	'baseball-outline',
	'golf-outline',
	'tennisball-outline',
	'snow-outline',
	'calculator-outline',
	'pie-chart-outline',
	'trending-up-outline',
	'shield-checkmark-outline',
	'balloon-outline',
	'rocket-outline',
	'flash-outline',
	'bulb-outline',
	'calendar-outline',
	'time-outline',
	'notifications-outline',
	'settings-outline',
];

// Removed emoji icons - using only Ionicons

// ==========================================
// Preset Values
// ==========================================

// Quick target presets for goals
export const GOAL_TARGET_PRESETS = [500, 1000, 2500, 5000, 10000] as const;

// Quick amount presets for budgets
export const BUDGET_AMOUNT_PRESETS = [200, 500, 1000, 2000, 5000] as const;

// ==========================================
// Default Values
// ==========================================
export const DEFAULT_GOAL_ICON: keyof typeof Ionicons.glyphMap = 'flag-outline';
export const DEFAULT_BUDGET_ICON: keyof typeof Ionicons.glyphMap =
	'cart-outline';
// Removed DEFAULT_EMOJI_ICON - using only Ionicons
export const DEFAULT_COLOR = COLOR_PALETTE.blue.base;

// ==========================================
// Helper Functions
// ==========================================

/**
 * Check if an icon is a valid Ionicons name
 */
export const isValidIoniconsName = (
	icon: string
): icon is keyof typeof Ionicons.glyphMap => {
	return (
		GOAL_ICONS.includes(icon as keyof typeof Ionicons.glyphMap) ||
		BUDGET_ICONS.includes(icon as keyof typeof Ionicons.glyphMap)
	);
};

// Removed isEmojiIcon function - using only Ionicons

// Removed emojiToIoniconMap - using only Ionicons

/**
 * Convert an icon to a valid Ionicons name (emoji support removed)
 */
export const normalizeIconName = (
	icon: string
): keyof typeof Ionicons.glyphMap => {
	// If it's already a valid ionicon name, return it
	if (isValidIoniconsName(icon)) {
		return icon as keyof typeof Ionicons.glyphMap;
	}

	// Check if it's an emoji (any non-ASCII character) and return fallback
	if (
		/[\u{1F600}-\u{1F64F}]|[\u{1F300}-\u{1F5FF}]|[\u{1F680}-\u{1F6FF}]|[\u{1F1E0}-\u{1F1FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]/u.test(
			icon
		)
	) {
		return 'ellipse-outline';
	}

	// Fallback for unknown icons
	return 'ellipse-outline';
};

/**
 * Get the appropriate icon set based on context
 */
export const getIconSet = (
	context: 'goal' | 'budget'
): (keyof typeof Ionicons.glyphMap)[] => {
	return context === 'goal' ? GOAL_ICONS : BUDGET_ICONS;
};
