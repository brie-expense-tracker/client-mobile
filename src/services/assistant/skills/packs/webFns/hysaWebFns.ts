// Web functions for HYSA research
// Pluggable web functions (inject real search/fetch/extract)

import { WebFns } from '../../types';
import { logger } from '../../../../../../utils/logger';


// Mock implementation for development
// In production, replace with real search API (Bing, SerpAPI, Tavily, etc.)
export const webFnsForHYSA: WebFns = {
	async search(
		query: string,
		recencyDays = 30
	): Promise<{ title: string; url: string }[]> {
		logger.debug(
			`[HYSA WebFns] Mock search for: ${query} (${recencyDays} days)`
		);

		// Mock results for development
		return [
			{
				title: 'Best High-Yield Savings Accounts 2024',
				url: 'https://nerdwallet.com/best/banking/high-yield-savings-accounts',
			},
			{
				title: 'Top HYSA Rates This Month',
				url: 'https://bankrate.com/banking/savings/best-high-yield-savings-accounts/',
			},
			{
				title: 'Best Online Savings Accounts',
				url: 'https://www.forbes.com/advisor/banking/best-high-yield-savings-accounts/',
			},
			{
				title: 'High-Yield Savings Account Guide',
				url: 'https://www.investopedia.com/best-high-yield-savings-accounts-5072721',
			},
			{
				title: 'Best HYSA for 2024',
				url: 'https://www.thebalance.com/best-high-yield-savings-accounts-4171379',
			},
		];
	},

	async fetchText(url: string): Promise<string> {
		try {
			logger.debug(`[HYSA WebFns] Fetching: ${url}`);

			// Mock implementation - in production, use real fetch
			if (url.includes('nerdwallet.com')) {
				return `
          <html>
            <title>Best High-Yield Savings Accounts</title>
            <body>
              <h1>Best High-Yield Savings Accounts 2024</h1>
              <p>Ally Bank offers 4.85% APY with no minimum balance required.</p>
              <p>Marcus by Goldman Sachs provides 4.80% APY on their online savings account.</p>
              <p>Capital One 360 Performance Savings offers 4.75% APY with sub-accounts.</p>
              <a href="https://www.ally.com/bank/online-savings-account/">Ally Bank</a>
              <a href="https://www.marcus.com/us/en/savings/high-yield-online-savings-account">Marcus</a>
              <a href="https://www.capitalone.com/bank/savings-accounts/online-savings-account/">Capital One</a>
            </body>
          </html>
        `;
			}

			if (url.includes('bankrate.com')) {
				return `
          <html>
            <title>Top HYSA Rates</title>
            <body>
              <h1>Best High-Yield Savings Account Rates</h1>
              <p>Discover Bank offers 4.70% APY with no monthly fees.</p>
              <p>Synchrony Bank provides 4.65% APY on their high-yield savings account.</p>
              <a href="https://www.discover.com/online-banking/savings-account/">Discover Bank</a>
              <a href="https://www.synchronybank.com/banking/high-yield-savings/">Synchrony Bank</a>
            </body>
          </html>
        `;
			}

			// Default mock response
			return `
        <html>
          <title>High-Yield Savings Account</title>
          <body>
            <h1>High-Yield Savings Account Information</h1>
            <p>Current rates range from 4.5% to 5.0% APY.</p>
            <p>Look for FDIC insurance, no monthly fees, and competitive rates.</p>
          </body>
        </html>
      `;
		} catch (error) {
			logger.warn(`[HYSA WebFns] Failed to fetch ${url}:`, error);
			throw error;
		}
	},

	extract(html: string): Record<string, any> {
		// Simple regex-based extraction for development
		// In production, use a proper HTML parser like cheerio
		const text = html.replace(/\s+/g, ' ');

		// Extract APY
		const apyMatch = text.match(/(\d+(?:\.\d+)?)\s*%[^%]{0,20}APY/i);
		const apy = apyMatch ? Number(apyMatch[1]) : undefined;

		// Extract minimum balance
		const minMatch = text.match(/\$?\s?(\d[\d,\.]*)\s*(?:minimum|to\sopen)/i);
		const minBalance = minMatch
			? Number(minMatch[1].replace(/,/g, ''))
			: undefined;

		// Extract fees
		const feeMatch = text.match(
			/\b(no\s+monthly\s+fees?|monthly\s+fee[s]?\s*\$?\s*\d+)/i
		);
		const fees = feeMatch ? feeMatch[0] : undefined;

		// Extract bank name from title or content
		const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
		const title = titleMatch ? titleMatch[1] : '';
		const bank = title.match(/^([^-|•]+)/)?.[0]?.trim() || 'Unknown Bank';

		// Check for buckets/sub-accounts
		const buckets = /bucket|vault|sub-?account/i.test(text);

		// Determine ACH speed (mock logic)
		const achSpeed = /1-2\s*(?:business\s*)?days?|instant|same\s*day/i.test(
			text
		)
			? '1-2d'
			: /3-5\s*(?:business\s*)?days?/i.test(text)
			? '3-5d'
			: 'unknown';

		return {
			bank,
			apy,
			minBalance: minBalance ?? 0,
			fees: fees || 'no monthly fee',
			achSpeed,
			buckets,
			product: 'High-Yield Savings',
		};
	},
};
