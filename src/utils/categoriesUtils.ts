// src/utils/categoryUtils.ts
import { Ionicons } from '@expo/vector-icons';

export interface CategoryMeta {
	name: string;
	icon: keyof typeof Ionicons.glyphMap;
	color: string;
}

// Category name to icon/color mapping
const CATEGORY_ICON_MAP: Record<
	string,
	{ icon: keyof typeof Ionicons.glyphMap; color: string }
> = {
	// Income categories
	Salary: { icon: 'cash-outline', color: '#4CAF50' },
	Work: { icon: 'briefcase-outline', color: '#4CAF50' },
	Freelance: { icon: 'laptop-outline', color: '#4CAF50' },
	Consulting: { icon: 'people-outline', color: '#4CAF50' },
	Investment: { icon: 'trending-up-outline', color: '#009688' },

	// Expense categories
	Groceries: { icon: 'cart-outline', color: '#4CAF50' },
	Food: { icon: 'restaurant-outline', color: '#FF9800' },
	Coffee: { icon: 'cafe-outline', color: '#8D6E63' },
	Dining: { icon: 'restaurant-outline', color: '#FF9800' },
	Utilities: { icon: 'flash-outline', color: '#FFC107' },
	Phone: { icon: 'call-outline', color: '#2196F3' },
	Housing: { icon: 'home-outline', color: '#795548' },
	Rent: { icon: 'home-outline', color: '#795548' },
	Health: { icon: 'fitness-outline', color: '#F44336' },
	Fitness: { icon: 'fitness-outline', color: '#F44336' },
	Transportation: { icon: 'car-outline', color: '#2196F3' },
	Gas: { icon: 'car-outline', color: '#2196F3' },
	'Ride Share': { icon: 'car-outline', color: '#2196F3' },
	Entertainment: { icon: 'game-controller-outline', color: '#9C27B0' },
	Travel: { icon: 'airplane-outline', color: '#2196F3' },
	Shopping: { icon: 'bag-outline', color: '#E91E63' },
	Education: { icon: 'school-outline', color: '#3F51B5' },
	Gifts: { icon: 'gift-outline', color: '#E91E63' },
};

// If you ever need a default fallback:
export const DEFAULT_CATEGORY: CategoryMeta = {
	name: 'Other',
	icon: 'ellipsis-horizontal-outline',
	color: '#9E9E9E',
};

export function getCategoryMeta(
	cat:
		| Partial<CategoryMeta>
		| string
		| { name: string; type?: string; color?: string; icon?: string }
): CategoryMeta {
	// If it's already a CategoryMeta object, return it
	if (typeof cat === 'object' && cat.icon && cat.color && cat.name) {
		return cat as CategoryMeta;
	}

	// If it's a Category object with name, try to map it
	if (typeof cat === 'object' && cat.name) {
		const categoryName = cat.name;
		const mappedCategory = CATEGORY_ICON_MAP[categoryName];

		if (mappedCategory) {
			return {
				name: categoryName,
				icon: mappedCategory.icon,
				color: mappedCategory.color,
			};
		}

		// If we have color and icon from the category object, use them
		if (cat.color && cat.icon) {
			return {
				name: categoryName,
				icon: cat.icon as keyof typeof Ionicons.glyphMap,
				color: cat.color,
			};
		}
	}

	// If it's a string (category name), try to map it
	if (typeof cat === 'string') {
		const mappedCategory = CATEGORY_ICON_MAP[cat];
		if (mappedCategory) {
			return {
				name: cat,
				icon: mappedCategory.icon,
				color: mappedCategory.color,
			};
		}
	}

	// Fall back to default
	return DEFAULT_CATEGORY;
}
