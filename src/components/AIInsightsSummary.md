# AI Insights Summary Component

A reusable React Native component that displays AI-generated financial insights in a compact, user-friendly format.

## Features

- **Automatic Data Fetching**: Fetches insights from daily, weekly, and monthly periods
- **Smart Loading States**: Handles loading, error, and empty states gracefully
- **Compact Mode**: Optional compact layout for dashboard integration
- **Customizable**: Configurable number of insights, titles, and actions
- **Interactive**: Tap to navigate to full insights page or custom actions
- **Priority Indicators**: Visual priority indicators (high, medium, low)
- **Type Icons**: Different icons for different insight types (budgeting, savings, spending, income)

## Props

| Prop                 | Type                           | Default         | Description                                         |
| -------------------- | ------------------------------ | --------------- | --------------------------------------------------- |
| `maxInsights`        | `number`                       | `2`             | Maximum number of insights to display               |
| `showGenerateButton` | `boolean`                      | `false`         | Whether to show the generate insights button        |
| `onInsightPress`     | `(insight: AIInsight) => void` | `undefined`     | Custom handler for insight press                    |
| `compact`            | `boolean`                      | `false`         | Use compact layout (smaller padding, fewer details) |
| `title`              | `string`                       | `'AI Insights'` | Custom title for the component                      |

## Usage Examples

### Basic Usage

```tsx
import { AIInsightsSummary } from '../components';

<AIInsightsSummary />;
```

### Compact Dashboard Version

```tsx
<AIInsightsSummary maxInsights={1} compact={true} title="AI Coach" />
```

### With Generate Button

```tsx
<AIInsightsSummary maxInsights={3} showGenerateButton={true} />
```

### Custom Press Handler

```tsx
<AIInsightsSummary
	onInsightPress={(insight) => {
		console.log('Insight pressed:', insight);
		// Custom navigation or action
	}}
/>
```

## Insight Types

The component automatically displays different icons based on the insight type:

- **budgeting**: Wallet icon
- **savings**: Trending up icon
- **spending**: Trending down icon
- **income**: Cash icon
- **general**: Bulb icon

## Priority Colors

- **high**: Red (#dc2626)
- **medium**: Orange (#f59e0b)
- **low**: Green (#10b981)

## Integration with Dashboard

The component is designed to replace the static AI suggestion box in the dashboard:

```tsx
// Old static version
const AISuggestionBox = () => (
	<View style={styles.suggestionBox}>
		<Text>Static AI suggestion...</Text>
	</View>
);

// New dynamic version
const AISuggestionBox = () => (
	<AIInsightsSummary maxInsights={1} compact={true} title="AI Coach" />
);
```

## Error Handling

The component includes robust error handling:

- **Timeout Protection**: 5-second timeout for API calls
- **Graceful Degradation**: Falls back to empty state on errors
- **Automatic Retry**: Attempts to generate insights if none exist
- **User Feedback**: Shows appropriate loading and error states

## Dependencies

- `react-native`
- `@expo/vector-icons` (Ionicons)
- `expo-router`
- `../services/insightsService`

## Styling

The component uses a clean, modern design with:

- Rounded corners and subtle shadows
- Consistent spacing and typography
- Color-coded priority indicators
- Responsive layout that adapts to content

## Performance

- **Memoized Callbacks**: Uses `useCallback` for expensive operations
- **Efficient Re-renders**: Minimal re-renders with proper state management
- **Lazy Loading**: Only loads insights when component mounts
- **Smart Caching**: Reuses existing insights when possible
