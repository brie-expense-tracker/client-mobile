import { Platform } from 'react-native';

// Accessibility utility functions and constants
export const accessibilityProps = {
  // Common button accessibility props
  button: {
    accessibilityRole: 'button' as const,
    accessibilityHint: 'Double tap to activate',
  },
  
  // Common link accessibility props
  link: {
    accessibilityRole: 'link' as const,
    accessibilityHint: 'Double tap to open',
  },
  
  // Common image accessibility props
  image: {
    accessibilityRole: 'image' as const,
  },
  
  // Common header accessibility props
  header: {
    accessibilityRole: 'header' as const,
  },
  
  // Common list accessibility props
  list: {
    accessibilityRole: 'list' as const,
  },
  
  // Common list item accessibility props
  listItem: {
    accessibilityRole: 'listitem' as const,
  },
  
  // Common tab accessibility props
  tab: {
    accessibilityRole: 'tab' as const,
  },
  
  // Common tab list accessibility props
  tabList: {
    accessibilityRole: 'tablist' as const,
  },
  
  // Common summary accessibility props
  summary: {
    accessibilityRole: 'summary' as const,
  },
};

// Dynamic type support - ensures text scales with system font size
export const dynamicTextStyleBase = {
  allowFontScaling: true,
  // Use relative font sizes that work well with Dynamic Type
  fontSize: Platform.OS === 'ios' ? undefined : 16, // iOS will use system font sizes
};

// Function to get text styles with dynamic type support
import { type } from '../ui/theme';

type TextStyleName = 'title2' | 'footnote' | 'body' | 'caption2' | 'largeTitle';

export const dynamicTextStyle = (styleName: TextStyleName) => {
  const baseStyle = dynamicTextStyleBase;
  
  // Map style names to type styles
  const styleMap: Record<TextStyleName, any> = {
    title2: { ...type.h2, ...baseStyle },
    footnote: { ...type.bodyXs, ...baseStyle },
    body: { ...type.body, ...baseStyle },
    caption2: { ...type.bodyXs, ...baseStyle },
    largeTitle: { ...type.num2xl, ...baseStyle },
  };
  
  return styleMap[styleName] || { ...type.body, ...baseStyle };
};

// Accessibility label generators for common UI patterns
export const generateAccessibilityLabel = {
  // Budget related
  budgetCard: (name: string, amount: string, spent: string) => 
    `${name} budget. Total amount: ${amount}. Spent: ${spent}`,
  
  // Goal related
  goalCard: (name: string, target: string, current: string) => 
    `${name} goal. Target: ${target}. Current progress: ${current}`,
  
  // Transaction related
  transactionItem: (description: string, amount: string, date: string) => 
    `${description}. Amount: ${amount}. Date: ${date}`,
  
  // Button related
  button: (action: string, context?: string) => 
    context ? `${action} ${context}` : action,
  
  // Status related
  status: (item: string, status: string) => 
    `${item} status: ${status}`,
};

// VoiceOver specific hints for better user experience
export const voiceOverHints = {
  add: 'Double tap to add new item',
  edit: 'Double tap to edit this item',
  delete: 'Double tap to delete this item',
  save: 'Double tap to save changes',
  cancel: 'Double tap to cancel changes',
  retry: 'Double tap to retry the operation',
  refresh: 'Double tap to refresh data',
  expand: 'Double tap to expand details',
  collapse: 'Double tap to collapse details',
  navigate: 'Double tap to navigate to this screen',
  select: 'Double tap to select this option',
  toggle: 'Double tap to toggle this setting',
};

// Screen reader announcements for important state changes
export const screenReaderAnnouncements = {
  loading: 'Loading data',
  loaded: 'Data loaded successfully',
  error: 'An error occurred',
  offline: 'You are currently offline',
  online: 'Connection restored',
  saved: 'Changes saved successfully',
  deleted: 'Item deleted successfully',
  updated: 'Item updated successfully',
};

// Accessibility focus management
export const accessibilityFocus = {
  // Focus the first interactive element when screen loads
  firstInteractive: 'first-interactive',
  // Focus the main content area
  mainContent: 'main-content',
  // Focus the error message when errors occur
  errorMessage: 'error-message',
  // Focus the success message when operations complete
  successMessage: 'success-message',
};
