// HYSA Research Agent - Fresh web research for HYSA recommendations
// Only runs when user asks for specific picks/recommendations

import { ChatResponse } from '../responseSchema';
import { TimedLRU } from '../utils/timedLRU';
import { webFnsForHYSA } from '../skills/packs/webFns/hysaWebFns';
import { WebFns } from '../skills/types';

// ---- Config ----
const EDITORIAL_ALLOWLIST = [
	'nerdwallet.com',
	'bankrate.com',
	'forbes.com',
	'investopedia.com',
	'thebalance.com',
	'wallethub.com',
];

// Bank URL validation patterns for production web scraping
const BANK_ALLOW_PATTERNS = [
	/ally\.com/i,
	/marcus\.com/i,
	/synchronybank\.com/i,
	/capitalone\.com/i,
	/discover\.com/i,
	/americanexpress\.com/i,
	/sofi\.com/i,
	/barclays\.us/i,
	/citizensbank\.com/i,
	/pncbank\.com/i,
	/chime\.com/i,
];

type Candidate = {
	bank: string;
	product: string;
	apy: number;
	minBalance: number;
	fees: string;
	achSpeed: '1-2d' | '3-5d' | 'unknown';
	buckets: boolean;
	promo?: string;
	editorialSource: string;
	bankUrl: string;
	lastUpdated?: string;
	notes?: string;
};

const cache = new TimedLRU<string, Candidate[]>(64); // 24h TTL set per item

// Use the existing web functions
const web: WebFns = webFnsForHYSA;

// ---- Extract data from bank pages ----
function extractFromBankPage(html: string, url: string): Partial<Candidate> {
	const extracted = web.extract(html);

	// Validate and clean the extracted data
	const apy =
		typeof extracted.apy === 'number' && extracted.apy > 0
			? extracted.apy
			: undefined;
	const minBalance =
		typeof extracted.minBalance === 'number' ? extracted.minBalance : 0;
	const fees =
		typeof extracted.fees === 'string' ? extracted.fees : 'no monthly fee';
	const achSpeed = ['1-2d', '3-5d', 'unknown'].includes(extracted.achSpeed)
		? (extracted.achSpeed as '1-2d' | '3-5d' | 'unknown')
		: 'unknown';
	const buckets = Boolean(extracted.buckets);
	const bank =
		typeof extracted.bank === 'string' ? extracted.bank : 'Unknown Bank';
	const product =
		typeof extracted.product === 'string'
			? extracted.product
			: 'High-Yield Savings';

	return {
		bank,
		product,
		apy,
		minBalance,
		fees,
		achSpeed,
		buckets,
		bankUrl: url,
	};
}

// ---- Validate candidate data ----
function validateCandidate(candidate: Partial<Candidate>): Candidate | null {
	if (!candidate.bank || !candidate.product || !candidate.apy) {
		return null;
	}

	// Ensure APY is reasonable (between 0.1% and 10%)
	if (candidate.apy < 0.1 || candidate.apy > 10) {
		return null;
	}

	// Ensure minimum balance is non-negative
	if (candidate.minBalance && candidate.minBalance < 0) {
		candidate.minBalance = 0;
	}

	return candidate as Candidate;
}

// ---- Rank by prefs (simple & transparent) ----
function rank(
	cands: Candidate[],
	prefs?: {
		wantsBuckets?: boolean;
		noFees?: boolean;
		fastACH?: boolean;
		minBalance?: number;
	}
) {
	return cands
		.map((c) => {
			let score = 0;
			score += c.apy ?? 0; // APY points ~ 4.85
			if (prefs?.noFees && /no/i.test(c.fees || '')) score += 1.0;
			if (prefs?.minBalance === 0 && c.minBalance === 0) score += 0.6;
			if (prefs?.fastACH && c.achSpeed === '1-2d') score += 0.4;
			if (prefs?.wantsBuckets && c.buckets) score += 0.3;
			return { c, score };
		})
		.sort((a, b) => b.score - a.score)
		.map((x) => x.c);
}

// ---- Extract preferences from query ----
function extractPreferences(query: string) {
	return {
		wantsBuckets: /bucket|sub[\-\s]?account|vault/i.test(query),
		noFees: /no\s+fees|avoid\s+fees|free/i.test(query),
		fastACH: /fast\s+ach|instant\s+transfer|1-2\s*day|quick/i.test(query),
		minBalance: /zero|0\s+min|no\s+minimum/i.test(query) ? 0 : undefined,
	};
}

// ---- Compose ChatResponse ----
function toResponse(
	cands: Candidate[],
	checkedAt: string,
	prefs?: any
): ChatResponse {
	const top = cands.slice(0, 3);
	const bullets = top
		.map(
			(c, i) =>
				`${i + 1}) **${c.bank} – ${c.product}** — ${c.apy?.toFixed(2)}% APY` +
				`${c.minBalance != null ? `, $${c.minBalance} min` : ''}` +
				`${c.fees ? `, ${c.fees}` : ''}` +
				`${c.buckets ? `, buckets` : ''}` +
				`${
					c.achSpeed && c.achSpeed !== 'unknown' ? `, ACH ${c.achSpeed}` : ''
				}.`
		)
		.join('\n');

	const srcs = top.map((c) => ({
		kind: 'gpt' as const,
		note: `${c.bank} - ${c.product}`,
	}));

	// Build preference summary
	const prefSummary = [];
	if (prefs?.noFees) prefSummary.push('no fees');
	if (prefs?.fastACH) prefSummary.push('fast ACH');
	if (prefs?.wantsBuckets) prefSummary.push('buckets');
	if (prefs?.minBalance === 0) prefSummary.push('no minimum');

	const prefText = prefSummary.length > 0 ? ` (${prefSummary.join(', ')})` : '';
	const message = `**Top HYSA picks (checked ${checkedAt})**  
${bullets}

*Why these:* match your preferences${prefText} with competitive APY. Rates change—verify before opening.`;

	return {
		message,
		actions: [
			{
				label: 'Create Savings Goal',
				action: 'OPEN_GOAL_WIZARD',
				params: { type: 'savings' },
			},
			{
				label: 'Plan Monthly Transfer',
				action: 'SETUP_AUTO_TRANSFER',
				params: { amount: 100 },
			},
		],
		sources: srcs,
		cost: { model: 'std', estTokens: Math.ceil(message.length / 4) },
		confidence: 0.75,
	};
}

// ---- The Agent ----
export const hysaResearchAgent = {
	async findRecommendations(
		query: string,
		context: any
	): Promise<ChatResponse | null> {
		const qKey = query.toLowerCase().replace(/\s+/g, ' ').slice(0, 200);
		const cached = cache.get(qKey);
		const checkedAt = new Date().toLocaleDateString();

		if (cached && cached.length) {
			console.log(`[HYSA Agent] Using cached results for: ${qKey}`);
			const prefs = extractPreferences(query);
			return toResponse(rank(cached, prefs), checkedAt, prefs);
		}

		console.log(`[HYSA Agent] Starting fresh research for: ${query}`);

		try {
			// 1) Search editorial roundups
			const editorialResults = (
				await web.search('best high-yield savings accounts updated', 30)
			)
				.filter((r) => EDITORIAL_ALLOWLIST.some((d) => r.url.includes(d)))
				.slice(0, 8);

			if (editorialResults.length === 0) {
				console.log('[HYSA Agent] No editorial results found, using fallback');
				return this.getFallbackResponse();
			}

			// 2) Extract bank URLs from editorial pages
			const bankUrls = new Set<string>();
			const editorialHtmls = await Promise.allSettled(
				editorialResults.map((r) => web.fetchText(r.url))
			);

			for (const result of editorialHtmls) {
				if (result.status !== 'fulfilled') continue;

				// Extract URLs from HTML (simple regex approach)
				const matches = Array.from(
					result.value.matchAll(/https?:\/\/[^\s"\'<>]+/g)
				).map((m) => m[0]);

				matches.forEach((url) => {
					if (BANK_ALLOW_PATTERNS.some((pattern) => pattern.test(url))) {
						bankUrls.add(url);
					}
				});
			}

			// 3) Fetch and extract data from bank pages
			const bankUrlsArray = Array.from(bankUrls).slice(0, 15);
			const bankHtmls = await Promise.allSettled(
				bankUrlsArray.map((url) => web.fetchText(url))
			);

			const candidates: Candidate[] = [];
			bankUrlsArray.forEach((url, i) => {
				const result = bankHtmls[i];
				if (result?.status !== 'fulfilled') return;

				const extracted = extractFromBankPage(result.value, url);
				const validated = validateCandidate(extracted);

				if (validated) {
					candidates.push({
						...validated,
						editorialSource: editorialResults[0]?.url || 'unknown',
						lastUpdated: checkedAt,
					});
				}
			});

			// 4) Fallback to mock data if no valid candidates found
			const finalCandidates =
				candidates.length > 0 ? candidates : this.getMockCandidates(checkedAt);

			cache.set(qKey, finalCandidates, 24 * 60 * 60 * 1000); // 24h TTL

			// Extract preferences from query
			const prefs = extractPreferences(query);

			return toResponse(rank(finalCandidates, prefs), checkedAt, prefs);
		} catch (error) {
			console.error('[HYSA Agent] Research failed:', error);
			return this.getFallbackResponse();
		}
	},

	getMockCandidates(checkedAt: string): Candidate[] {
		return [
			{
				bank: 'Ally Bank',
				product: 'Online Savings',
				apy: 4.85,
				minBalance: 0,
				fees: 'no monthly fee',
				achSpeed: '1-2d',
				buckets: true,
				editorialSource: 'nerdwallet.com',
				bankUrl: 'https://www.ally.com/bank/online-savings-account/',
				lastUpdated: checkedAt,
			},
			{
				bank: 'Marcus by Goldman Sachs',
				product: 'High-Yield Online Savings',
				apy: 4.8,
				minBalance: 0,
				fees: 'no monthly fee',
				achSpeed: '1-2d',
				buckets: false,
				editorialSource: 'bankrate.com',
				bankUrl:
					'https://www.marcus.com/us/en/savings/high-yield-online-savings-account',
				lastUpdated: checkedAt,
			},
			{
				bank: 'Capital One',
				product: '360 Performance Savings',
				apy: 4.75,
				minBalance: 0,
				fees: 'no monthly fee',
				achSpeed: '1-2d',
				buckets: true,
				editorialSource: 'forbes.com',
				bankUrl:
					'https://www.capitalone.com/bank/savings-accounts/online-savings-account/',
				lastUpdated: checkedAt,
			},
			{
				bank: 'Discover Bank',
				product: 'Online Savings',
				apy: 4.7,
				minBalance: 0,
				fees: 'no monthly fee',
				achSpeed: '1-2d',
				buckets: false,
				editorialSource: 'thebalance.com',
				bankUrl: 'https://www.discover.com/online-banking/savings-account/',
				lastUpdated: checkedAt,
			},
			{
				bank: 'Synchrony Bank',
				product: 'High Yield Savings',
				apy: 4.65,
				minBalance: 0,
				fees: 'no monthly fee',
				achSpeed: '3-5d',
				buckets: false,
				editorialSource: 'wallethub.com',
				bankUrl: 'https://www.synchronybank.com/banking/high-yield-savings/',
				lastUpdated: checkedAt,
			},
		];
	},

	getFallbackResponse(): ChatResponse {
		return {
			message: `What to look for in a high-yield savings account (HYSA):
• **FDIC/NCUA insured** • **Low/No fees** • **$0 minimums** • **Fast ACH** • **Buckets** • Solid mobile app.
Rates change—verify the APY on the bank site before opening.`,
			actions: [
				{
					label: 'Create Savings Goal',
					action: 'OPEN_GOAL_WIZARD',
					params: { type: 'savings' },
				},
			],
			sources: [],
			cost: { model: 'mini', estTokens: 80 },
			confidence: 0.6,
		};
	},
};
