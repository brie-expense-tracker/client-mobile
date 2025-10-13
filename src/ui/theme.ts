export const palette = {
	// Base
	bg: '#FFFFFF',
	surface: '#FFFFFF',
	surfaceAlt: '#F8FAFC',
	text: '#111827',
	textMuted: '#6B7280',
	textSubtle: '#9CA3AF',
	border: '#E5E7EB',
	borderMuted: '#E5E5E5',

	// Primary
	primary: '#00A2FF',
	primaryMuted: '#0EA5E9',
	primarySubtle: '#E0F2FE',
	primaryTextOn: '#FFFFFF',

	// Semantic
	warning: '#F59E0B',
	danger: '#EF4444',
	dangerSubtle: '#FEF2F2',
	dangerBorder: '#FECACA',
	success: '#10B981',
	successSubtle: '#F0FDF4',
	info: '#00A2FF',
	infoSubtle: '#F0F8FF',

	// Track/Progress
	track: '#EEF2F7',

	// UI Elements
	chipBg: '#F8FAFC',
	chipText: '#0F172A',
	subtle: '#F3F4F6',
};

export const radius = {
	sm: 8,
	md: 12,
	lg: 16,
	xl: 20,
	pill: 999,
};

export const space = {
	xs: 6,
	sm: 8,
	md: 12,
	lg: 16,
	xl: 24,
	xxl: 32,
};

export const shadow = {
	card: {
		shadowColor: '#000',
		shadowOpacity: 0.06,
		shadowRadius: 10,
		shadowOffset: { width: 0, height: 4 },
		elevation: 2,
	},
};

export const type = {
	h1: { fontSize: 20, fontWeight: '700' as const },
	h2: { fontSize: 16, fontWeight: '600' as const },
	body: { fontSize: 14, fontWeight: '400' as const },
	bodySm: { fontSize: 14, fontWeight: '400' as const },
	small: { fontSize: 12, fontWeight: '500' as const },
	labelSm: {
		fontSize: 14,
		fontWeight: '600' as const,
		textTransform: 'uppercase' as const,
		letterSpacing: 0.5,
	},
	titleMd: { fontSize: 20, fontWeight: '600' as const },
	num2xl: { fontSize: 32, fontWeight: '700' as const },
	numLg: { fontSize: 18, fontWeight: '700' as const },
	numMd: { fontSize: 16, fontWeight: '600' as const },
};
