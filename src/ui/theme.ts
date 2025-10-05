export const palette = {
	bg: '#FFFFFF',
	text: '#111827',
	textMuted: '#6B7280',
	border: '#E5E7EB',
	primary: '#00A2FF',
	primaryTextOn: '#FFFFFF',
	warning: '#F59E0B',
	danger: '#EF4444',
	success: '#10B981',
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
	small: { fontSize: 12, fontWeight: '500' as const },
};
