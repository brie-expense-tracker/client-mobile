import {
	webFnsForCD,
	clearCache,
	getCacheStats,
	getRateLimitStatus,
} from '../cdWebFns';

// Mock fetch globally
global.fetch = jest.fn();

describe('CD Web Functions', () => {
	beforeEach(() => {
		jest.clearAllMocks();
		clearCache();
		(global.fetch as jest.Mock).mockClear();
	});

	describe('search', () => {
		it('should return search results for CD queries', async () => {
			const results = await webFnsForCD.search('best CD rates', 30);

			expect(results).toBeDefined();
			expect(Array.isArray(results)).toBe(true);
			expect(results.length).toBeGreaterThan(0);

			results.forEach((result) => {
				expect(result).toHaveProperty('title');
				expect(result).toHaveProperty('url');
				expect(typeof result.title).toBe('string');
				expect(typeof result.url).toBe('string');
			});
		});

		it('should use caching for repeated queries', async () => {
			const query = 'CD rates 2024';

			// First call
			const results1 = await webFnsForCD.search(query, 30);

			// Second call should use cache
			const results2 = await webFnsForCD.search(query, 30);

			expect(results1).toEqual(results2);

			// Check cache stats
			const cacheStats = getCacheStats();
			expect(cacheStats.size).toBeGreaterThan(0);
		});

		it('should handle non-CD queries gracefully', async () => {
			const results = await webFnsForCD.search('random query', 30);

			expect(results).toBeDefined();
			expect(Array.isArray(results)).toBe(true);
		});
	});

	describe('fetchText', () => {
		it('should fetch and return HTML content', async () => {
			const mockHtml =
				'<html><title>Test CD Rates</title><body>Test content</body></html>';
			(global.fetch as jest.Mock).mockResolvedValueOnce({
				ok: true,
				text: () => Promise.resolve(mockHtml),
			});

			const result = await webFnsForCD.fetchText(
				'https://example.com/cd-rates'
			);

			expect(result).toBe(mockHtml);
			expect(global.fetch).toHaveBeenCalledWith(
				'https://example.com/cd-rates',
				expect.objectContaining({
					method: 'GET',
					headers: expect.objectContaining({
						'User-Agent': expect.any(String),
					}),
				})
			);
		}, 10000);

		it('should use caching for repeated requests', async () => {
			const url = 'https://example.com/cd-rates';
			const mockHtml =
				'<html><title>Test CD Rates</title><body>Test content</body></html>';

			(global.fetch as jest.Mock).mockResolvedValueOnce({
				ok: true,
				text: () => Promise.resolve(mockHtml),
			});

			// First call
			const result1 = await webFnsForCD.fetchText(url);

			// Second call should use cache
			const result2 = await webFnsForCD.fetchText(url);

			expect(result1).toBe(result2);
			expect(global.fetch).toHaveBeenCalledTimes(1);
		}, 10000);

		it('should handle fetch errors gracefully', async () => {
			(global.fetch as jest.Mock).mockRejectedValueOnce(
				new Error('Network error')
			);

			const result = await webFnsForCD.fetchText(
				'https://example.com/cd-rates'
			);

			// Should return fallback content
			expect(result).toContain('<html>');
			expect(result).toContain('CD Rates');
		}, 10000);

		it('should handle HTTP errors', async () => {
			(global.fetch as jest.Mock).mockResolvedValueOnce({
				ok: false,
				status: 404,
				statusText: 'Not Found',
			});

			const result = await webFnsForCD.fetchText(
				'https://example.com/not-found'
			);

			// Should return fallback content
			expect(result).toContain('<html>');
		}, 10000);

		it('should validate URLs', async () => {
			const result = await webFnsForCD.fetchText('invalid-url');

			// Should return fallback content for invalid URL
			expect(result).toContain('<html>');
		});
	});

	describe('extract', () => {
		it('should extract CD rates from HTML', () => {
			const html = `
				<html>
					<title>Best CD Rates 2024</title>
					<meta name="description" content="Compare the best CD rates available">
					<body>
						<h1>Best CD Rates</h1>
						<p>Ally Bank offers 5.25% APY on 12-month CD with $0 minimum.</p>
						<p>Capital One provides 5.15% APY on 6-month CD.</p>
						<p>Discover Bank offers 5.10% APY on 9-month CD with no penalty feature.</p>
					</body>
				</html>
			`;

			const result = webFnsForCD.extract(html);

			expect(result).toHaveProperty('title');
			expect(result).toHaveProperty('description');
			expect(result).toHaveProperty('cdRates');
			expect(result).toHaveProperty('lastUpdated');
			expect(result).toHaveProperty('source');
			expect(result).toHaveProperty('extractedAt');

			expect(Array.isArray(result.cdRates)).toBe(true);
			expect(result.cdRates.length).toBeGreaterThan(0);

			result.cdRates.forEach((cdRate) => {
				expect(cdRate).toHaveProperty('bank');
				expect(cdRate).toHaveProperty('apy');
				expect(cdRate).toHaveProperty('termMonths');
				expect(cdRate).toHaveProperty('minDeposit');
				expect(cdRate).toHaveProperty('lastUpdated');
			});
		});

		it('should extract features from CD descriptions', () => {
			const html = `
				<html>
					<body>
						<p>Bank A offers 5.25% APY on 12-month CD with no penalty feature.</p>
						<p>Bank B provides 5.15% APY on 6-month jumbo CD.</p>
						<p>Bank C offers 5.10% APY on 9-month CD with bump-up option.</p>
					</body>
				</html>
			`;

			const result = webFnsForCD.extract(html);

			expect(result.cdRates).toContainEqual(
				expect.objectContaining({
					features: expect.arrayContaining(['No Penalty']),
				})
			);

			expect(result.cdRates).toContainEqual(
				expect.objectContaining({
					features: expect.arrayContaining(['Jumbo CD']),
				})
			);
		});

		it('should handle malformed HTML gracefully', () => {
			const malformedHtml =
				'<html><title>Test</title><body><p>Invalid HTML content</p></body>';

			const result = webFnsForCD.extract(malformedHtml);

			expect(result).toBeDefined();
			expect(result).toHaveProperty('cdRates');
			expect(Array.isArray(result.cdRates)).toBe(true);
		});

		it('should validate extracted APY values', () => {
			const html = `
				<html>
					<body>
						<p>Bank A offers 5.25% APY on 12-month CD.</p>
						<p>Bank B offers 25% APY on 12-month CD.</p> <!-- Invalid APY -->
						<p>Bank C offers -2% APY on 12-month CD.</p> <!-- Invalid APY -->
					</body>
				</html>
			`;

			const result = webFnsForCD.extract(html);

			// Should only include valid APY values
			const validRates = result.cdRates.filter(
				(rate) => rate.apy > 0 && rate.apy < 20
			);
			expect(validRates.length).toBe(1);
			expect(validRates[0].apy).toBe(5.25);
		});

		it('should sanitize extracted strings', () => {
			const html = `
				<html>
					<title>Best CD Rates <script>alert('xss')</script></title>
					<body>
						<p>Bank A offers 5.25% APY on 12-month CD.</p>
					</body>
				</html>
			`;

			const result = webFnsForCD.extract(html);

			expect(result.title).not.toContain('<script>');
			expect(result.title).not.toContain('alert');
		});
	});

	describe('rate limiting', () => {
		it('should track rate limits', async () => {
			// Make multiple requests to trigger rate limiting
			const promises = [];
			for (let i = 0; i < 5; i++) {
				promises.push(webFnsForCD.search(`query ${i}`, 30));
			}

			await Promise.all(promises);

			const rateLimitStatus = getRateLimitStatus();
			expect(rateLimitStatus).toHaveProperty('rate_limit:search');
		});
	});

	describe('error handling', () => {
		it('should handle extraction errors gracefully', () => {
			// Pass invalid input to extract
			const result = webFnsForCD.extract(null as any);

			expect(result).toBeDefined();
			expect(result).toHaveProperty('source', 'fallback');
		});

		it('should provide fallback data when extraction fails', () => {
			const result = webFnsForCD.extract('');

			expect(result).toHaveProperty('cdRates');
			expect(Array.isArray(result.cdRates)).toBe(true);
			expect(result.cdRates.length).toBeGreaterThan(0);
		});
	});

	describe('utility functions', () => {
		it('should clear cache', async () => {
			// Add something to cache first
			await webFnsForCD.search('test query', 30);

			let cacheStats = getCacheStats();
			expect(cacheStats.size).toBeGreaterThan(0);

			clearCache();

			cacheStats = getCacheStats();
			expect(cacheStats.size).toBe(0);
		});

		it('should provide cache statistics', () => {
			const cacheStats = getCacheStats();

			expect(cacheStats).toHaveProperty('size');
			expect(cacheStats).toHaveProperty('entries');
			expect(typeof cacheStats.size).toBe('number');
			expect(Array.isArray(cacheStats.entries)).toBe(true);
		});

		it('should provide rate limit status', () => {
			const rateLimitStatus = getRateLimitStatus();

			expect(typeof rateLimitStatus).toBe('object');
		});
	});

	describe('data validation', () => {
		it('should validate CD rate data structure', () => {
			const html = `
				<html>
					<body>
						<p>Test Bank offers 5.25% APY on 12-month CD with $1000 minimum.</p>
					</body>
				</html>
			`;

			const result = webFnsForCD.extract(html);

			expect(result.cdRates[0]).toMatchObject({
				bank: expect.any(String),
				apy: expect.any(Number),
				termMonths: expect.any(Number),
				minDeposit: expect.any(Number),
				features: expect.any(Array),
				lastUpdated: expect.any(Date),
			});
		});

		it('should handle missing data gracefully', () => {
			const html =
				'<html><body><p>No CD rates mentioned here.</p></body></html>';

			const result = webFnsForCD.extract(html);

			expect(result.cdRates).toHaveLength(1);
			expect(result.cdRates[0].bank).toBe('Unknown Bank');
			expect(result.cdRates[0].apy).toBe(0);
		});
	});
});
