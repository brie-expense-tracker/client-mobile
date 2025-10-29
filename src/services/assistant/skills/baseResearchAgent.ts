// BaseResearchAgent - Reusable web-backed research for any finance topic
// This is the generic web-backed piece any skill can use

import { TimedLRU } from '../utils/timedLRU';
import { ResearchSource, ResearchResult, WebFns } from './types';
import { logger } from '../../../../utils/logger';


export class BaseResearchAgent<T> {
	private cache = new TimedLRU<string, ResearchResult<T>>(64);

	constructor(
		private readonly key: string,
		private readonly web: WebFns,
		private readonly sources: ResearchSource,
		private readonly normalize: (url: string, raw: Record<string, any>) => T,
		private readonly rank: (item: T, query: string) => number // returns a score
	) {}

	async run(query: string): Promise<ResearchResult<T> | null> {
		const key = `${this.key}:${query
			.toLowerCase()
			.replace(/\s+/g, ' ')
			.slice(0, 200)}`;
		const cached = this.cache.get(key);

		if (cached) {
			logger.debug(`[BaseResearchAgent] Using cached results for: ${key}`);
			return cached;
		}

		logger.debug(`[BaseResearchAgent] Starting fresh research for: ${query}`);

		try {
			const recency = this.sources.recencyDays ?? 30;
			const editorial = (await this.web.search(`${this.key} updated`, recency))
				.filter((r) =>
					this.sources.editorialAllow.some((d) => r.url.includes(d))
				)
				.slice(0, 8);

			if (editorial.length === 0) {
				logger.debug('[BaseResearchAgent] No editorial results found');
				return null;
			}

			// Expand to official domains
			const htmls = await Promise.allSettled(
				editorial.map((r) => this.web.fetchText(r.url))
			);
			const bankLinks = new Set<string>();

			for (const res of htmls) {
				if (res.status !== 'fulfilled') continue;

				// Extract URLs from HTML (simple regex approach)
				const matches = Array.from(
					res.value.matchAll(/https?:\/\/[^\s"'<>]+/g)
				).map((m) => m[0]);
				matches.forEach((u) => {
					if (this.sources.domainAllowPatterns.some((rx) => rx.test(u))) {
						bankLinks.add(u);
					}
				});
			}

			const bankHtmls = await Promise.allSettled(
				[...bankLinks].slice(0, 15).map((u) => this.web.fetchText(u))
			);

			const items: T[] = [];
			[...bankLinks].slice(0, 15).forEach((url, i) => {
				const res = bankHtmls[i];
				if (res?.status !== 'fulfilled') return;

				const raw = this.web.extract(res.value);
				if (!raw) return;

				const normalized = this.normalize(url, raw);
				if (normalized) {
					items.push(normalized);
				}
			});

			if (items.length === 0) {
				logger.debug('[BaseResearchAgent] No valid items extracted');
				return null;
			}

			// Rank and sort items
			const scored = items
				.map((item) => ({ item, score: this.rank(item, query) }))
				.sort((a, b) => b.score - a.score)
				.map((x) => x.item);

			const result: ResearchResult<T> = {
				items: scored,
				checkedAt: new Date().toLocaleDateString(),
			};

			this.cache.set(key, result, 24 * 60 * 60 * 1000); // 24 hours
			logger.debug(
				`[BaseResearchAgent] Cached ${scored.length} items for: ${key}`
			);

			return result;
		} catch (error) {
			logger.error('[BaseResearchAgent] Research failed:', error);
			return null;
		}
	}

	// Get cache statistics
	getCacheStats() {
		return {
			size: this.cache.size(),
			key: this.key,
			sources: this.sources.editorialAllow.length,
		};
	}

	// Clear cache for this agent
	clearCache() {
		this.cache.clear();
	}
}
