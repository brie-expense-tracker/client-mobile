import React from 'react';
import { View, StyleSheet, Animated } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { accessibilityProps, dynamicTextStyle } from '../utils/accessibility';

interface SkeletonProps {
  width?: number | string;
  height?: number;
  borderRadius?: number;
  style?: any;
  animated?: boolean;
}

// Individual skeleton item
export const SkeletonItem: React.FC<SkeletonProps> = ({
  width = '100%',
  height = 20,
  borderRadius = 4,
  style,
  animated = true,
}) => {
  const animatedValue = React.useRef(new Animated.Value(0)).current;

  React.useEffect(() => {
    if (animated) {
      const animation = Animated.loop(
        Animated.sequence([
          Animated.timing(animatedValue, {
            toValue: 1,
            duration: 1000,
            useNativeDriver: false,
          }),
          Animated.timing(animatedValue, {
            toValue: 0,
            duration: 1000,
            useNativeDriver: false,
          }),
        ])
      );
      animation.start();
      return () => animation.stop();
    }
  }, [animated, animatedValue]);

  const opacity = animatedValue.interpolate({
    inputRange: [0, 1],
    outputRange: [0.3, 0.7],
  });

  return (
    <Animated.View
      style={[
        styles.skeleton,
        {
          width,
          height,
          borderRadius,
          opacity,
        },
        style,
      ]}
      accessibilityLabel="Loading content"
      accessibilityRole="image"
      accessibilityHint="Content is being loaded"
    />
  );
};

// Skeleton for budget cards
export const BudgetCardSkeleton: React.FC = () => (
  <View style={styles.budgetCardSkeleton} accessibilityRole="none">
    <SkeletonItem width="60%" height={24} borderRadius={6} />
    <View style={styles.budgetCardContent}>
      <SkeletonItem width="40%" height={16} />
      <SkeletonItem width="30%" height={16} />
    </View>
    <View style={styles.budgetCardProgress}>
      <SkeletonItem width="100%" height={8} borderRadius={4} />
    </View>
  </View>
);

// Skeleton for goal cards
export const GoalCardSkeleton: React.FC = () => (
  <View style={styles.goalCardSkeleton} accessibilityRole="none">
    <SkeletonItem width="70%" height={20} borderRadius={6} />
    <View style={styles.goalCardContent}>
      <SkeletonItem width="50%" height={16} />
      <SkeletonItem width="35%" height={16} />
    </View>
    <View style={styles.goalCardProgress}>
      <SkeletonItem width="80%" height={8} borderRadius={4} />
    </View>
  </View>
);

// Skeleton for transaction items
export const TransactionItemSkeleton: React.FC = () => (
  <View style={styles.transactionItemSkeleton} accessibilityRole="none">
    <View style={styles.transactionItemLeft}>
      <SkeletonItem width={40} height={40} borderRadius={20} />
      <View style={styles.transactionItemText}>
        <SkeletonItem width="80%" height={16} />
        <SkeletonItem width="60%" height={14} />
      </View>
    </View>
    <SkeletonItem width="25%" height={18} />
  </View>
);

// Skeleton for dashboard widgets
export const DashboardWidgetSkeleton: React.FC = () => (
  <View style={styles.dashboardWidgetSkeleton} accessibilityRole="none">
    <SkeletonItem width="50%" height={20} borderRadius={6} />
    <SkeletonItem width="80%" height={32} borderRadius={6} />
    <SkeletonItem width="40%" height={16} />
  </View>
);

// Skeleton for assistant messages
export const MessageSkeleton: React.FC = () => (
  <View style={styles.messageSkeleton} accessibilityRole="none">
    <View style={styles.messageHeader}>
      <SkeletonItem width={32} height={32} borderRadius={16} />
      <SkeletonItem width="30%" height={16} />
    </View>
    <View style={styles.messageContent}>
      <SkeletonItem width="90%" height={16} />
      <SkeletonItem width="70%" height={16} />
      <SkeletonItem width="85%" height={16} />
    </View>
  </View>
);

// Skeleton for insights panel
export const InsightsPanelSkeleton: React.FC = () => (
  <View style={styles.insightsPanelSkeleton} accessibilityRole="none">
    <SkeletonItem width="40%" height={24} borderRadius={6} />
    <View style={styles.insightsList}>
      {[1, 2, 3].map((item) => (
        <View key={item} style={styles.insightItem}>
          <SkeletonItem width="80%" height={16} />
          <SkeletonItem width="60%" height={14} />
        </View>
      ))}
    </View>
  </View>
);

// Skeleton for charts
export const ChartSkeleton: React.FC = () => (
  <View style={styles.chartSkeleton} accessibilityRole="image">
    <SkeletonItem width="100%" height={200} borderRadius={8} />
    <View style={styles.chartLegend}>
      <SkeletonItem width="30%" height={16} />
      <SkeletonItem width="25%" height={16} />
      <SkeletonItem width="35%" height={16} />
    </View>
  </View>
);

// Main skeleton container
export const SkeletonContainer: React.FC<{
  children: React.ReactNode;
  isLoading: boolean;
  fallback?: React.ReactNode;
}> = ({ children, isLoading, fallback }) => {
  if (isLoading) {
    return <>{fallback || <View style={styles.container}>{children}</View>}</>;
  }
  return <>{children}</>;
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  skeleton: {
    backgroundColor: '#E5E7EB',
    overflow: 'hidden',
  },
  budgetCardSkeleton: {
    padding: 16,
    backgroundColor: 'white',
    borderRadius: 12,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  budgetCardContent: {
    marginTop: 8,
    gap: 4,
  },
  budgetCardProgress: {
    marginTop: 12,
  },
  goalCardSkeleton: {
    padding: 16,
    backgroundColor: 'white',
    borderRadius: 12,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  goalCardContent: {
    marginTop: 8,
    gap: 4,
  },
  goalCardProgress: {
    marginTop: 12,
  },
  transactionItemSkeleton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  transactionItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  transactionItemText: {
    marginLeft: 12,
    flex: 1,
    gap: 4,
  },
  dashboardWidgetSkeleton: {
    padding: 16,
    backgroundColor: 'white',
    borderRadius: 12,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  messageSkeleton: {
    padding: 16,
    backgroundColor: 'white',
    borderRadius: 12,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  messageHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 8,
  },
  messageContent: {
    gap: 8,
  },
  insightsPanelSkeleton: {
    padding: 16,
    backgroundColor: 'white',
    borderRadius: 12,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  insightsList: {
    marginTop: 16,
    gap: 12,
  },
  insightItem: {
    gap: 4,
  },
  chartSkeleton: {
    padding: 16,
    backgroundColor: 'white',
    borderRadius: 12,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  chartLegend: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 16,
    gap: 8,
  },
});

export default SkeletonContainer;
