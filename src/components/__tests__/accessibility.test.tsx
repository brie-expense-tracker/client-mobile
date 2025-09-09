import {
	accessibilityProps,
	dynamicTextStyle,
	generateAccessibilityLabel,
} from '../../utils/accessibility';

describe('Accessibility Utilities', () => {
	describe('accessibilityProps', () => {
		it('should provide button accessibility props', () => {
			expect(accessibilityProps.button).toEqual({
				accessibilityRole: 'button',
				accessibilityHint: 'Double tap to activate',
			});
		});

		it('should provide link accessibility props', () => {
			expect(accessibilityProps.link).toEqual({
				accessibilityRole: 'link',
				accessibilityHint: 'Double tap to open',
			});
		});

		it('should provide image accessibility props', () => {
			expect(accessibilityProps.image).toEqual({
				accessibilityRole: 'image',
			});
		});
	});

	describe('dynamicTextStyle', () => {
		it('should include allowFontScaling', () => {
			expect(dynamicTextStyle.allowFontScaling).toBe(true);
		});

		it('should have fontSize property', () => {
			expect(dynamicTextStyle).toHaveProperty('fontSize');
		});
	});

	describe('generateAccessibilityLabel', () => {
		it('should generate budget card labels', () => {
			const label = generateAccessibilityLabel.budgetCard(
				'Groceries',
				'$500',
				'$200'
			);
			expect(label).toBe('Groceries budget. Total amount: $500. Spent: $200');
		});

		it('should generate goal card labels', () => {
			const label = generateAccessibilityLabel.goalCard(
				'Vacation',
				'$2000',
				'$800'
			);
			expect(label).toBe(
				'Vacation goal. Target: $2000. Current progress: $800'
			);
		});

		it('should generate transaction labels', () => {
			const label = generateAccessibilityLabel.transactionItem(
				'Coffee',
				'$4.50',
				'2024-01-15'
			);
			expect(label).toBe('Coffee. Amount: $4.50. Date: 2024-01-15');
		});

		it('should generate button labels with context', () => {
			const label = generateAccessibilityLabel.button('Add', 'budget');
			expect(label).toBe('Add budget');
		});

		it('should generate button labels without context', () => {
			const label = generateAccessibilityLabel.button('Save');
			expect(label).toBe('Save');
		});
	});
});
