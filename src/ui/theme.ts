/** Aligned with `apps/web/src/app/globals.css` @theme tokens (dark workspace). */
export const palette = {
	bg: '#121315',
	surface: '#1b1d21',
	surfaceAlt: '#121315',
	surfaceRaised: '#1b1d21',
	surfaceSunken: '#17181b',
	text: '#f3f1ec',
	textSecondary: 'rgba(243, 241, 236, 0.85)',
	textMuted: 'rgba(243, 241, 236, 0.62)',
	textSubtle: 'rgba(243, 241, 236, 0.4)',
	border: 'rgba(255, 255, 255, 0.08)',
	borderMuted: 'rgba(255, 255, 255, 0.06)',
	line: 'rgba(255, 255, 255, 0.06)',

	primary: '#6f8f8a',
	primaryMuted: '#5a736f',
	primaryStrong: '#95aea9',
	primarySubtle: 'rgba(111, 143, 138, 0.22)',
	primarySoft: 'rgba(111, 143, 138, 0.14)',
	primaryBorder: 'rgba(111, 143, 138, 0.35)',
	primaryTextOn: '#f3f1ec',

	textOnDark: '#f3f1ec',
	textOnPrimary: '#121315',
	textLink: '#95aea9',

	input: 'rgba(27, 29, 33, 0.94)',
	shell: 'rgba(23, 24, 27, 0.92)',

	heroBg: '#121315',
	heroText: '#f3f1ec',
	heroSubtle: 'rgba(243, 241, 236, 0.72)',

	hairline: 'rgba(255, 255, 255, 0.08)',

	warning: '#f59e0b',
	danger: '#f87171',
	dangerSubtle: 'rgba(248, 113, 113, 0.12)',
	dangerSoft: 'rgba(248, 113, 113, 0.08)',
	dangerBorder: 'rgba(248, 113, 113, 0.35)',
	success: '#34d399',
	successSoft: 'rgba(52, 211, 153, 0.14)',
	successStrong: '#6ee7b7',
	successSubtle: 'rgba(52, 211, 153, 0.1)',
	info: '#95aea9',
	infoSubtle: 'rgba(111, 143, 138, 0.14)',

	track: 'rgba(255, 255, 255, 0.06)',

	/** Matches web `--color-panel` / `--color-panel2` (translucent surfaces). */
	panel: 'rgba(27, 29, 33, 0.72)',
	panel2: 'rgba(27, 29, 33, 0.78)',

	chipBg: 'rgba(27, 29, 33, 0.72)',
	chipText: '#f3f1ec',
	subtle: 'rgba(27, 29, 33, 0.55)',
	iconMuted: 'rgba(243, 241, 236, 0.45)',

	accent: '#6f8f8a',
	accentSoft: 'rgba(111, 143, 138, 0.14)',
	textStrong: '#f3f1ec',
	onAccent: '#f3f1ec',
	onPrimary: '#121315',
	surfaceSubtle: '#17181b',
	borderSubtle: 'rgba(255, 255, 255, 0.06)',
	borderAccent: 'rgba(111, 143, 138, 0.3)',
	positive: '#34d399',
	warningStrong: '#fcd34d',
};

/** Matches web `globals.css`: `--radius-xl2`, `--radius-xl3`, workspace chrome. */
export const radius = {
	sm: 8,
	md: 12,
	lg: 16,
	xl: 20,
	/** 0.625rem — buttons, inputs (`rounded-xl2`). */
	xl2: 10,
	/** 0.875rem — compact panels (`rounded-xl3`). */
	xl3: 14,
	/** ~1.35rem — main workspace-style surfaces. */
	shell: 22,
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
	card: makeShadow('#000000', 0.45, 24, 10, 6),
	hero: makeShadow('#000000', 0.35, 16, 6, 8),
	soft: makeShadow('#000000', 0.3, 12, 4, 3),
	toolbar: makeShadow('#000000', 0.35, 10, -2, 4),
};

/** Aligned with web `@utility text-app-title`, `text-section`, `text-body`, `text-meta`. */
export const type = {
	h1: {
		fontSize: 22,
		fontWeight: '600' as const,
		lineHeight: 28,
		letterSpacing: -0.35,
	},
	/** Section titles (`text-section` ~1.0625rem). */
	h2: {
		fontSize: 17,
		fontWeight: '600' as const,
		lineHeight: 23,
		letterSpacing: -0.16,
	},
	body: {
		fontSize: 16,
		lineHeight: 24,
		fontWeight: '400' as const,
	},
	bodySm: { fontSize: 14, lineHeight: 20, fontWeight: '400' as const },
	bodyXs: { fontSize: 12, lineHeight: 17, fontWeight: '400' as const },
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
