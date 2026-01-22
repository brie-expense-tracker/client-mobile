export const palette = {
	// Base
	bg: '#FFFFFF',
	surface: '#FFFFFF',
	surfaceAlt: '#F8FAFC',
	text: '#111827',
	textSecondary: '#333333',
	textMuted: '#6B7280',
	textSubtle: '#9CA3AF',
	border: '#E5E7EB',
	borderMuted: '#E5E5E5',

	// Primary
	primary: '#00A2FF',
	primaryMuted: '#0EA5E9',
	primaryStrong: '#0284C7', // slightly deeper than primaryMuted
	primarySubtle: '#E0F2FE',
	primarySoft: '#EFF6FF',
	primaryBorder: '#7DD3FC', // for subtle outlines when needed
	primaryTextOn: '#FFFFFF',

	// Text roles
	textOnDark: '#FFFFFF', // for dark hero cards
	textOnPrimary: '#FFFFFF', // alias to primaryTextOn
	textLink: '#00A2FF', // use primary, but a named role helps

	// Surfaces
	surfaceRaised: '#FFFFFF', // same as surface, but role clarifies usage
	surfaceSunken: '#F1F5F9', // for wallet "page well" if you want it distinct (optional)

	// Hero
	heroBg: '#0F172A', // dark hero background
	heroText: '#FFFFFF', // text on hero
	heroSubtle: 'rgba(255,255,255,0.72)', // or just use opacity in style

	// Dividers / hairlines
	hairline: '#E5E7EB', // alias to borderSubtle

	// Semantic
	warning: '#F59E0B',
	danger: '#EF4444',
	dangerSubtle: '#FEF2F2',
	dangerSoft: '#FFF1F2',
	dangerBorder: '#FECACA',
	success: '#10B981',
	successSoft: '#DCFCE7',
	successStrong: '#166534',
	successSubtle: '#F0FDF4',
	info: '#00A2FF',
	infoSubtle: '#F0F8FF',

	// Track/Progress
	track: '#EEF2F7',

	// UI Elements
	chipBg: '#F8FAFC',
	chipText: '#0F172A',
	subtle: '#F3F4F6',
	iconMuted: '#A1A1AA',

	// Aliases for compatibility
	accent: '#00A2FF', // same as primary
	accentSoft: '#EFF6FF', // same as primarySoft
	textStrong: '#111827', // same as text
	onAccent: '#FFFFFF', // same as primaryTextOn
	onPrimary: '#FFFFFF', // same as primaryTextOn
	surfaceSubtle: '#F3F4F6', // same as subtle
	borderSubtle: '#E5E7EB', // same as border
	borderAccent: '#D4D4D8', // for dashed borders
	positive: '#10B981', // same as success
	warningStrong: '#92400E', // for warning text
};

export const radius = {
	sm: 8,
	md: 12,
	lg: 16,
	xl: 20,
	pill: 999,
	full: 999,
};

export const space = {
	xs: 6,
	sm: 8,
	md: 12,
	lg: 16,
	xl: 24,
	xxl: 32,
};

// Helper to create shadow styles with tokenized colors
export const makeShadow = (
	shadowColor: string,
	opacity: number,
	radius: number,
	y: number,
	elevation: number,
) => ({
	shadowColor,
	shadowOpacity: opacity,
	shadowRadius: radius,
	shadowOffset: { width: 0, height: y },
	elevation,
});

export const shadow = {
	card: makeShadow('#000', 0.06, 10, 4, 2),
	hero: makeShadow(palette.primary, 0.3, 8, 4, 8),
	soft: makeShadow('#000', 0.04, 8, 2, 1),
	toolbar: makeShadow('#000', 0.05, 8, -2, 3),
};

export const type = {
	h1: { fontSize: 20, fontWeight: '700' as const },
	h2: { fontSize: 16, fontWeight: '600' as const },
	body: { fontSize: 14, fontWeight: '400' as const },
	bodySm: { fontSize: 13, fontWeight: '400' as const },
	bodyXs: { fontSize: 12, fontWeight: '400' as const },
	small: { fontSize: 12, fontWeight: '500' as const },
	labelXs: {
		fontSize: 11,
		fontWeight: '500' as const,
	},
	labelSm: {
		fontSize: 12,
		fontWeight: '600' as const,
		textTransform: 'uppercase' as const,
		letterSpacing: 0.6,
	},
	titleMd: { fontSize: 20, fontWeight: '600' as const },
	titleSm: { fontSize: 17, fontWeight: '700' as const },
	num2xl: { fontSize: 32, fontWeight: '700' as const },
	numLg: { fontSize: 18, fontWeight: '700' as const },
	numMd: { fontSize: 16, fontWeight: '600' as const },
};
