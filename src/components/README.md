# Financial Graph Components

A collection of colorful and sleek React Native graph components for financial data visualization. These components are designed to provide comprehensive insights into spending patterns, budget tracking, and goal progress.

## Components Overview

### 1. FinancialDashboard

A comprehensive dashboard that combines all graph components with period selection and summary statistics.

**Features:**

- Period selector (Week, Month, Quarter, Year)
- Summary cards for Income, Expenses, and Net
- Integrated data fetching from API
- Pull-to-refresh functionality
- Error handling and loading states

**Usage:**

```tsx
import { FinancialDashboard } from '../components';

<FinancialDashboard title="Financial Overview" />;
```

### 2. BudgetOverviewGraph

A bar chart component that displays budget allocation vs spending across categories.

**Features:**

- Color-coded bars based on budget status
- Over-budget indicators (red bars)
- Detailed legend with percentages
- Responsive design

**Usage:**

```tsx
import { BudgetOverviewGraph } from '../components';

const budgets = [
	{
		id: '1',
		category: 'Food & Dining',
		allocated: 500,
		spent: 320,
		icon: 'restaurant',
		color: '#FF6B6B',
	},
	// ... more budgets
];

<BudgetOverviewGraph budgets={budgets} title="Budget Overview" />;
```

### 3. GoalsProgressGraph

A pie chart component that shows financial goal progress with detailed breakdown.

**Features:**

- Donut chart with center progress indicator
- Summary statistics (Total Progress, Active Goals, Completed)
- Individual goal progress bars
- Completion badges
- Empty state handling

**Usage:**

```tsx
import { GoalsProgressGraph } from '../components';

const goals = [
	{
		id: '1',
		name: 'Emergency Fund',
		target: 10000,
		current: 6500,
		deadline: '2024-12-31',
		icon: 'shield-checkmark',
		color: '#4CAF50',
	},
	// ... more goals
];

<GoalsProgressGraph goals={goals} title="Goals Progress" />;
```

### 4. SpendingTrendsGraph

A line chart component that displays spending patterns over time.

**Features:**

- Time-based filtering (Week, Month, Quarter, Year)
- Income vs Expense visualization
- Summary cards with key metrics
- Top spending categories
- Average daily expense calculation

**Usage:**

```tsx
import { SpendingTrendsGraph } from '../components';

const transactions = [
	{
		id: '1',
		type: 'expense',
		amount: 45,
		date: '2024-01-15',
	},
	// ... more transactions
];

<SpendingTrendsGraph
	transactions={transactions}
	title="Spending Trends"
	period="month"
/>;
```

## Data Structures

### Budget Interface

```typescript
interface Budget {
	id: string;
	category: string;
	allocated: number;
	spent: number;
	icon: string;
	color: string;
	userId?: string;
	createdAt?: string;
	updatedAt?: string;
}
```

### Goal Interface

```typescript
interface Goal {
	id: string;
	name: string;
	target: number;
	current: number;
	deadline: string;
	icon: string;
	color: string;
	userId?: string;
	createdAt?: string;
	updatedAt?: string;
}
```

### Transaction Interface

```typescript
interface Transaction {
	id: string;
	type: 'income' | 'expense';
	amount: number;
	date: string;
}
```

## Color Schemes

The components use a consistent color palette:

- **Primary Blue**: `#2E78B7` - Used for main elements and highlights
- **Success Green**: `#4CAF50` - Used for income and positive metrics
- **Warning Red**: `#FF6B6B` - Used for expenses and over-budget indicators
- **Secondary Colors**: Various colors for categories and goals
- **Background**: `#F8F9FA` - Light gray background
- **Cards**: `#FFFFFF` - White card backgrounds

## Styling

All components use consistent styling patterns:

- **Border Radius**: 12px for cards, 8px for buttons
- **Shadows**: Subtle shadows for depth
- **Typography**: Consistent font weights and sizes
- **Spacing**: 20px margins, 16px padding
- **Responsive**: Adapts to different screen sizes

## Dependencies

The components require the following dependencies:

```json
{
	"react-native-gifted-charts": "^1.3.0",
	"@expo/vector-icons": "^13.0.0"
}
```

## Demo Screen

A demo screen is available at `app/(tabs)/dashboard/graphs.tsx` that showcases all components with sample data. You can navigate to this screen to see all graphs in action.

## Integration

To integrate these components into your app:

1. **Import the components:**

```tsx
import {
	FinancialDashboard,
	BudgetOverviewGraph,
	GoalsProgressGraph,
	SpendingTrendsGraph,

} from '../components';
```

2. **Use with your data:**

```tsx
// Fetch data from your API
const { budgets } = useBudget();
const { goals } = useGoal();
const [transactions, setTransactions] = useState([]);

// Render the dashboard
<FinancialDashboard title="My Financial Overview" />;
```

3. **Customize as needed:**

```tsx
<BudgetOverviewGraph budgets={budgets} title="Custom Budget View" />
```

## Features

### Responsive Design

All components adapt to different screen sizes and orientations.

### Accessibility

Components include proper accessibility labels and support for screen readers.

### Performance

Optimized rendering with proper memoization and efficient data processing.

### Error Handling

Comprehensive error states and loading indicators.

### Customization

Flexible props for customizing colors, titles, and data sources.

## Contributing

When adding new graph components:

1. Follow the existing naming convention
2. Use the established color scheme
3. Include proper TypeScript interfaces
4. Add comprehensive error handling
5. Include empty states
6. Update this README with documentation

## License

This component library is part of the Brie financial app project.
