import { slotResolver } from '../slotResolver';
import { ChatContext } from '../../feature/chatController';

describe('SlotResolver', () => {
	let mockContext: ChatContext;

	beforeEach(() => {
		mockContext = {
			accounts: [
				{ id: 'acc1', name: 'Checking Account', type: 'checking' },
				{ id: 'acc2', name: 'Savings Account', type: 'savings' },
			],
			goals: [
				{ id: 'goal1', name: 'Emergency Fund', category: 'emergency' },
				{ id: 'goal2', name: 'Vacation', category: 'travel' },
			],
			transactions: [
				{ id: 'tx1', merchant: 'Amazon', amount: 50, category: 'shopping' },
				{ id: 'tx2', merchant: 'Starbucks', amount: 5, category: 'dining' },
			],
			budgets: [
				{ id: 'budget1', name: 'Groceries', amount: 500 },
				{ id: 'budget2', name: 'Entertainment', amount: 200 },
			],
		};
	});

	describe('resolveSlots', () => {
		it('should resolve time period slots', () => {
			const result = slotResolver.resolveSlots(
				'Show me spending for this month',
				['period'],
				mockContext
			);

			expect(result.resolved.period).toBeDefined();
			expect(result.resolved.period?.type).toBe('period');
			expect(result.resolved.period?.value).toBe('this_month');
			expect(result.resolved.period?.confidence).toBeGreaterThan(0.9);
		});

		it('should resolve amount slots', () => {
			const result = slotResolver.resolveSlots(
				'I spent $100 on groceries',
				['amount'],
				mockContext
			);

			expect(result.resolved.amount).toBeDefined();
			expect(result.resolved.amount?.type).toBe('amount');
			expect(result.resolved.amount?.value).toBe(100);
			expect(result.resolved.amount?.confidence).toBeGreaterThan(0.9);
		});

		it('should resolve category slots', () => {
			const result = slotResolver.resolveSlots(
				'Show me dining expenses',
				['category'],
				mockContext
			);

			expect(result.resolved.category).toBeDefined();
			expect(result.resolved.category?.type).toBe('category');
			expect(result.resolved.category?.value).toBe('dining');
		});

		it('should resolve merchant slots', () => {
			const result = slotResolver.resolveSlots(
				'I bought something from Amazon',
				['merchant'],
				mockContext
			);

			expect(result.resolved.merchant).toBeDefined();
			expect(result.resolved.merchant?.type).toBe('merchant');
			expect(result.resolved.merchant?.value).toBe('Amazon');
		});

		it('should resolve account slots', () => {
			const result = slotResolver.resolveSlots(
				'Transfer money to my checking account',
				['account'],
				mockContext
			);

			expect(result.resolved.account).toBeDefined();
			expect(result.resolved.account?.type).toBe('account');
			expect(result.resolved.account?.value).toBe('checking');
		});

		it('should resolve goal slots', () => {
			const result = slotResolver.resolveSlots(
				'Add money to my emergency fund',
				['goal_id'],
				mockContext
			);

			expect(result.resolved.goal_id).toBeDefined();
			expect(result.resolved.goal_id?.type).toBe('goal_id');
			expect(result.resolved.goal_id?.value).toBe('goal1');
		});

		it('should handle multiple slots', () => {
			const result = slotResolver.resolveSlots(
				'Show me $500 spent on groceries this month',
				['amount', 'category', 'period'],
				mockContext
			);

			expect(result.resolved.amount).toBeDefined();
			expect(result.resolved.category).toBeDefined();
			expect(result.resolved.period).toBeDefined();
			expect(result.missing).toHaveLength(0);
		});

		it('should identify missing slots', () => {
			const result = slotResolver.resolveSlots(
				'Show me spending',
				['amount', 'category', 'period'],
				mockContext
			);

			expect(result.missing).toContain('amount');
			expect(result.missing).toContain('category');
			expect(result.resolved.period).toBeDefined(); // period has default
		});

		it('should validate inputs', () => {
			expect(() => {
				slotResolver.resolveSlots('', ['period'], mockContext);
			}).toThrow('Invalid utterance');

			expect(() => {
				slotResolver.resolveSlots('test', null as any, mockContext);
			}).toThrow('Invalid requiredSlots');

			expect(() => {
				slotResolver.resolveSlots('test', ['period'], null as any);
			}).toThrow('Invalid context');
		});
	});

	describe('createClarifyingQuestion', () => {
		it('should create questions for missing slots', () => {
			const question = slotResolver.createClarifyingQuestion(
				'test-skill',
				['amount', 'category'],
				{ amount: ['$100', '$500'], category: ['groceries', 'dining'] }
			);

			expect(question).toContain('What amount?');
			expect(question).toContain('Which category?');
			expect(question).toContain('Quick picks');
		});

		it('should return empty string for no missing slots', () => {
			const question = slotResolver.createClarifyingQuestion(
				'test-skill',
				[],
				{}
			);

			expect(question).toBe('');
		});
	});

	describe('utility methods', () => {
		it('should get available slot types', () => {
			const types = slotResolver.getAvailableSlotTypes();
			expect(types).toContain('period');
			expect(types).toContain('amount');
			expect(types).toContain('category');
			expect(types).toContain('merchant');
			expect(types).toContain('account');
			expect(types).toContain('goal_id');
		});

		it('should get resolver for slot type', () => {
			const periodResolver = slotResolver.getResolver('period');
			expect(periodResolver).toBeDefined();
		});

		it('should validate resolution', () => {
			const result = slotResolver.resolveSlots(
				'$100 this month',
				['amount', 'period'],
				mockContext
			);

			expect(slotResolver.validateResolution(result)).toBe(true);
		});

		it('should calculate overall confidence', () => {
			const result = slotResolver.resolveSlots(
				'$100 this month',
				['amount', 'period'],
				mockContext
			);

			const confidence = slotResolver.getOverallConfidence(result);
			expect(confidence).toBeGreaterThan(0);
			expect(confidence).toBeLessThanOrEqual(1);
		});
	});
});
