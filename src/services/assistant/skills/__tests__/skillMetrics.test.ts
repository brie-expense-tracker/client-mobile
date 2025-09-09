import { SkillMetricsCollector } from '../skillMetrics';
import { SkillExecutionResult } from '../types';
import { skillManager } from '../skillManager';

describe('SkillMetricsCollector', () => {
	let collector: SkillMetricsCollector;

	beforeEach(() => {
		// Create a fresh instance for each test
		collector = SkillMetricsCollector.getInstance();
		collector.clearMetrics();
	});

	describe('recordExecution', () => {
		it('should record execution with basic data', () => {
			const result: SkillExecutionResult = {
				response: null,
				skillId: 'test-skill',
				step: 'unknown',
				executionTimeMs: 1000,
				success: true,
				usefulness: 4.5,
				cached: false,
				metadata: {},
			};

			collector.recordExecution(result, 'user1');

			const analytics = collector.getSkillAnalytics('test-skill');
			expect(analytics).toBeDefined();
			expect(analytics?.usage.totalExecutions).toBe(1);
			expect(analytics?.performance.averageExecutionTime).toBe(1000);
		});

		it('should track parameter usage', () => {
			const result: SkillExecutionResult = {
				response: null,
				skillId: 'test-skill',
				step: 'unknown',
				executionTimeMs: 1000,
				success: true,
				usefulness: 4.5,
				cached: false,
				metadata: {},
			};

			const params = { amount: 100, category: 'groceries' };
			collector.recordExecution(result, 'user1', params);

			const analytics = collector.getSkillAnalytics('test-skill');
			expect(analytics?.usage.popularParams).toHaveProperty('amount=100');
			expect(analytics?.usage.popularParams).toHaveProperty(
				'category="groceries"'
			);
		});

		it('should track errors', () => {
			const result: SkillExecutionResult = {
				response: null,
				skillId: 'test-skill',
				step: 'unknown',
				executionTimeMs: 1000,
				success: false,
				usefulness: 1.0,
				cached: false,
				error: 'Test error',
				metadata: {},
			};

			collector.recordExecution(result, 'user1');

			const errorHistory = collector.getErrorHistory('test-skill');
			expect(errorHistory).toHaveLength(1);
			expect(errorHistory[0].error).toBe('Test error');
		});

		it('should generate alerts for performance issues', () => {
			const result: SkillExecutionResult = {
				response: null,
				skillId: 'test-skill',
				step: 'unknown',
				executionTimeMs: 6000, // Above fair threshold
				success: true,
				usefulness: 4.5,
				cached: false,
				metadata: {},
			};

			collector.recordExecution(result, 'user1');

			const alerts = collector.getAlerts('test-skill');
			expect(alerts).toHaveLength(1);
			expect(alerts[0].type).toBe('performance');
			expect(alerts[0].severity).toBe('warning');
		});
	});

	describe('getSkillAnalytics', () => {
		it('should return null for non-existent skill', () => {
			const analytics = collector.getSkillAnalytics('non-existent');
			expect(analytics).toBeNull();
		});

		it('should calculate correct metrics', () => {
			// Record multiple executions
			const results: SkillExecutionResult[] = [
				{
					response: null,
					skillId: 'test-skill',
					step: 'unknown',
					executionTimeMs: 1000,
					success: true,
					usefulness: 4.0,
					cached: false,
					metadata: {},
				},
				{
					response: null,
					skillId: 'test-skill',
					step: 'unknown',
					executionTimeMs: 2000,
					success: true,
					usefulness: 3.0,
					cached: true,
					metadata: {},
				},
				{
					response: null,
					skillId: 'test-skill',
					step: 'unknown',
					executionTimeMs: 1500,
					success: false,
					usefulness: 1.0,
					cached: false,
					error: 'Test error',
					metadata: {},
				},
			];

			results.forEach((result) => collector.recordExecution(result, 'user1'));

			const analytics = collector.getSkillAnalytics('test-skill');
			expect(analytics).toBeDefined();
			expect(analytics?.performance.averageExecutionTime).toBe(1500);
			expect(analytics?.performance.successRate).toBeCloseTo(66.67, 1);
			expect(analytics?.performance.cacheHitRate).toBeCloseTo(33.33, 1);
			expect(analytics?.performance.usefulnessScore).toBeCloseTo(2.67, 1);
			expect(analytics?.usage.totalExecutions).toBe(3);
		});
	});

	describe('getHealthReport', () => {
		it('should generate health report', () => {
			// Mock skillManager.getAllSkills
			const mockSkills = [
				{
					id: 'skill1',
					name: 'Test Skill 1',
					matches: () => true,
					run: async () => ({ success: true }),
				},
				{
					id: 'skill2',
					name: 'Test Skill 2',
					matches: () => true,
					run: async () => ({ success: true }),
				},
			];

			// Record some executions
			collector.recordExecution({
				response: null,
				skillId: 'skill1',
				step: 'unknown',
				executionTimeMs: 500,
				success: true,
				usefulness: 4.5,
				cached: false,
				metadata: {},
			});

			// Mock the skillManager dependency
			const originalGetAllSkills = skillManager.getAllSkills;
			skillManager.getAllSkills = jest.fn(() => mockSkills);

			const healthReport = collector.getHealthReport();

			expect(healthReport).toBeDefined();
			expect(healthReport.skillCount).toBe(2);
			expect(healthReport.lastUpdated).toBeGreaterThan(0);

			// Restore original function
			skillManager.getAllSkills = originalGetAllSkills;
		});
	});

	describe('getRealTimeMonitoring', () => {
		it('should return real-time monitoring data', () => {
			// Record some recent executions
			const now = Date.now();
			collector.recordExecution({
				response: null,
				skillId: 'skill1',
				step: 'unknown',
				executionTimeMs: 1000,
				success: true,
				usefulness: 4.0,
				cached: false,
				metadata: { timestamp: now },
			});

			collector.recordExecution({
				response: null,
				skillId: 'skill2',
				step: 'unknown',
				executionTimeMs: 2000,
				success: false,
				usefulness: 1.0,
				cached: false,
				error: 'Test error',
				metadata: { timestamp: now },
			});

			const monitoring = collector.getRealTimeMonitoring();

			expect(monitoring.totalExecutions).toBe(2);
			expect(monitoring.activeSkills).toBe(2);
			expect(monitoring.errorRate).toBe(50);
			expect(monitoring.averageResponseTime).toBe(1500);
			expect(monitoring.topSkills).toHaveLength(2);
		});
	});

	describe('getDailyMetrics', () => {
		it('should return daily metrics', () => {
			// Record execution for today
			collector.recordExecution({
				response: null,
				skillId: 'test-skill',
				step: 'unknown',
				executionTimeMs: 1000,
				success: true,
				usefulness: 4.0,
				cached: false,
				metadata: {},
			});

			const dailyMetrics = collector.getDailyMetrics('test-skill', 7);
			expect(dailyMetrics).toHaveLength(1);
			expect(dailyMetrics[0].executionCount).toBe(1);
			expect(dailyMetrics[0].averageExecutionTime).toBe(1000);
		});
	});

	describe('getSkillComparison', () => {
		it('should return skill comparison data', () => {
			// Record executions for multiple skills
			collector.recordExecution({
				response: null,
				skillId: 'skill1',
				step: 'unknown',
				executionTimeMs: 1000,
				success: true,
				usefulness: 4.0,
				cached: false,
				metadata: {},
			});

			collector.recordExecution({
				response: null,
				skillId: 'skill2',
				step: 'unknown',
				executionTimeMs: 2000,
				success: true,
				usefulness: 3.0,
				cached: false,
				metadata: {},
			});

			const comparison = collector.getSkillComparison(['skill1', 'skill2']);
			expect(comparison).toHaveLength(2);
			expect(comparison[0].skillId).toBe('skill1');
			expect(comparison[1].skillId).toBe('skill2');
		});
	});

	describe('exportMetrics', () => {
		it('should export metrics as JSON', () => {
			collector.recordExecution({
				response: null,
				skillId: 'test-skill',
				step: 'unknown',
				executionTimeMs: 1000,
				success: true,
				usefulness: 4.0,
				cached: false,
				metadata: {},
			});

			const jsonExport = collector.exportMetrics('json');
			const data = JSON.parse(jsonExport);

			expect(data.executionHistory).toHaveLength(1);
			expect(data.exportedAt).toBeDefined();
		});

		it('should export metrics as CSV', () => {
			collector.recordExecution({
				response: null,
				skillId: 'test-skill',
				step: 'unknown',
				executionTimeMs: 1000,
				success: true,
				usefulness: 4.0,
				cached: false,
				metadata: {},
			});

			const csvExport = collector.exportMetrics('csv');
			expect(csvExport).toContain(
				'skillId,executionTime,success,usefulness,timestamp'
			);
			expect(csvExport).toContain('test-skill,1000,true,4,');
		});
	});

	describe('clearMetrics', () => {
		it('should clear all metrics data', () => {
			collector.recordExecution({
				response: null,
				skillId: 'test-skill',
				step: 'unknown',
				executionTimeMs: 1000,
				success: true,
				usefulness: 4.0,
				cached: false,
				metadata: {},
			});

			collector.clearMetrics();

			const analytics = collector.getSkillAnalytics('test-skill');
			expect(analytics).toBeNull();
		});
	});

	describe('trend calculations', () => {
		it('should calculate execution trends', () => {
			// Record executions over multiple days
			const baseTime = Date.now() - 2 * 24 * 60 * 60 * 1000; // 2 days ago

			collector.recordExecution({
				response: null,
				skillId: 'test-skill',
				step: 'unknown',
				executionTimeMs: 1000,
				success: true,
				usefulness: 4.0,
				cached: false,
				metadata: { timestamp: baseTime },
			});

			collector.recordExecution({
				response: null,
				skillId: 'test-skill',
				step: 'unknown',
				executionTimeMs: 1000,
				success: true,
				usefulness: 4.0,
				cached: false,
				metadata: { timestamp: baseTime + 24 * 60 * 60 * 1000 },
			});

			const analytics = collector.getSkillAnalytics('test-skill', 3);
			expect(analytics?.trends.executionTrend).toHaveLength(3);
		});
	});
});
