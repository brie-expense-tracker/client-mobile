/**
 * Service Status Indicator Component
 *
 * Shows the health status of various services with circuit breaker information.
 * Provides visual feedback about service availability and performance.
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
	View,
	Text,
	StyleSheet,
	TouchableOpacity,
	Modal,
	ScrollView,
	ActivityIndicator,
	RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ResilientApiService } from '../../../services/resilience/resilientApiService';
import { CircuitBreakerStats } from '../../../services/resilience/circuitBreaker';
import { createLogger } from '../../../utils/sublogger';

const serviceStatusIndicatorLog = createLogger('ServiceStatusIndicator');

interface ServiceStatusIndicatorProps {
	onRetry?: () => void;
	isRetrying?: boolean;
}

interface ServiceStatus {
	name: string;
	healthy: boolean;
	stats: CircuitBreakerStats;
	color: string;
	icon: string;
}

export default function ServiceStatusIndicator({
	onRetry,
	isRetrying = false,
}: ServiceStatusIndicatorProps) {
	const [services, setServices] = useState<ServiceStatus[]>([]);
	const [showDetails, setShowDetails] = useState(false);
	const [isLoading, setIsLoading] = useState(false);

	const updateServiceStatus = useCallback(async () => {
		setIsLoading(true);
		try {
			const healthStatus = ResilientApiService.getHealthStatus();

			const serviceList: ServiceStatus[] = [
				{
					name: 'AI Orchestrator',
					healthy:
						healthStatus.orchestrator.state === 'CLOSED' ||
						healthStatus.orchestrator.state === 'HALF_OPEN',
					stats: healthStatus.orchestrator,
					color: getServiceColor(healthStatus.orchestrator),
					icon: 'brain',
				},
				{
					name: 'Streaming',
					healthy:
						healthStatus.streaming.state === 'CLOSED' ||
						healthStatus.streaming.state === 'HALF_OPEN',
					stats: healthStatus.streaming,
					color: getServiceColor(healthStatus.streaming),
					icon: 'flash',
				},
				{
					name: 'Tools',
					healthy:
						healthStatus.tools.state === 'CLOSED' ||
						healthStatus.tools.state === 'HALF_OPEN',
					stats: healthStatus.tools,
					color: getServiceColor(healthStatus.tools),
					icon: 'construct',
				},
			];

			setServices(serviceList);
		} catch (error) {
			serviceStatusIndicatorLog.error('Failed to update status', error);
			// Set services to show error state
			setServices([]);
		} finally {
			setIsLoading(false);
		}
	}, []);

	useEffect(() => {
		updateServiceStatus();
		// Update status every 30 seconds
		const interval = setInterval(updateServiceStatus, 30000);
		return () => clearInterval(interval);
	}, [updateServiceStatus]);

	const getServiceColor = (stats: CircuitBreakerStats): string => {
		switch (stats.state) {
			case 'CLOSED':
				return '#10b981'; // Green
			case 'HALF_OPEN':
				return '#f59e0b'; // Orange
			case 'OPEN':
				return '#ef4444'; // Red
			default:
				return '#6b7280'; // Gray
		}
	};

	const getServiceIcon = (stats: CircuitBreakerStats): string => {
		switch (stats.state) {
			case 'CLOSED':
				return 'checkmark-circle';
			case 'HALF_OPEN':
				return 'alert-circle';
			case 'OPEN':
				return 'close-circle';
			default:
				return 'help-circle';
		}
	};

	const getOverallStatus = (): {
		healthy: boolean;
		color: string;
		text: string;
	} => {
		const healthyServices = services.filter((s) => s.healthy).length;
		const totalServices = services.length;

		if (totalServices === 0) {
			return { healthy: false, color: '#6b7280', text: 'Unknown' };
		}

		const healthRatio = healthyServices / totalServices;

		if (healthRatio === 1) {
			return { healthy: true, color: '#10b981', text: 'All Services Healthy' };
		} else if (healthRatio >= 0.5) {
			return {
				healthy: false,
				color: '#f59e0b',
				text: 'Some Services Degraded',
			};
		} else {
			return { healthy: false, color: '#ef4444', text: 'Services Unavailable' };
		}
	};

	const formatResponseTime = (time: number): string => {
		if (time < 1000) {
			return `${time.toFixed(0)}ms`;
		} else {
			return `${(time / 1000).toFixed(1)}s`;
		}
	};

	const formatDate = (date: Date | undefined): string => {
		if (!date) return 'Never';

		const now = new Date();
		const diffMs = now.getTime() - date.getTime();
		const diffMins = Math.floor(diffMs / (1000 * 60));
		const diffHours = Math.floor(diffMs / (1000 * 60 * 60));

		if (diffMins < 1) return 'Just now';
		if (diffMins < 60) return `${diffMins}m ago`;
		if (diffHours < 24) return `${diffHours}h ago`;
		return date.toLocaleDateString();
	};

	const overallStatus = getOverallStatus();

	return (
		<>
			<TouchableOpacity
				style={[styles.container, { borderColor: overallStatus.color }]}
				onPress={() => setShowDetails(true)}
				disabled={isLoading}
				accessibilityLabel={`Service status: ${overallStatus.text}`}
				accessibilityHint="Tap to view detailed service status information"
				accessibilityRole="button"
			>
				<View style={styles.statusRow}>
					<View style={styles.statusLeft}>
						<Ionicons
							name={overallStatus.healthy ? 'checkmark-circle' : 'alert-circle'}
							size={16}
							color={overallStatus.color}
						/>
						<Text style={[styles.statusText, { color: overallStatus.color }]}>
							{overallStatus.text}
						</Text>
					</View>

					<View style={styles.statusRight}>
						{isLoading ? (
							<ActivityIndicator size="small" color="#6b7280" />
						) : (
							<>
								<Ionicons name="chevron-forward" size={16} color="#6b7280" />
								{onRetry && (
									<TouchableOpacity
										style={styles.retryButton}
										onPress={onRetry}
										disabled={isRetrying}
										accessibilityLabel="Retry failed services"
										accessibilityHint="Tap to retry failed service calls"
										accessibilityRole="button"
									>
										{isRetrying ? (
											<ActivityIndicator size="small" color="#3b82f6" />
										) : (
											<Ionicons name="refresh" size={14} color="#3b82f6" />
										)}
									</TouchableOpacity>
								)}
							</>
						)}
					</View>
				</View>
			</TouchableOpacity>

			<Modal
				visible={showDetails}
				animationType="slide"
				presentationStyle="pageSheet"
				onRequestClose={() => setShowDetails(false)}
			>
				<View style={styles.modalContainer}>
					<View style={styles.modalHeader}>
						<Text style={styles.modalTitle}>Service Status</Text>
						<TouchableOpacity
							style={styles.closeButton}
							onPress={() => setShowDetails(false)}
							accessibilityLabel="Close service status details"
							accessibilityHint="Tap to close the service status modal"
							accessibilityRole="button"
						>
							<Ionicons name="close" size={24} color="#374151" />
						</TouchableOpacity>
					</View>

					<ScrollView
						style={styles.modalContent}
						refreshControl={
							<RefreshControl
								refreshing={isLoading}
								onRefresh={updateServiceStatus}
								tintColor="#3b82f6"
								title="Pull to refresh service status"
							/>
						}
					>
						{services.length === 0 ? (
							<View style={styles.emptyState}>
								<Ionicons
									name="alert-circle-outline"
									size={48}
									color="#6b7280"
								/>
								<Text style={styles.emptyStateTitle}>No Service Data</Text>
								<Text style={styles.emptyStateText}>
									Unable to retrieve service status information. Please check
									your connection and try again.
								</Text>
								<TouchableOpacity
									style={styles.retryEmptyButton}
									onPress={updateServiceStatus}
									disabled={isLoading}
									accessibilityLabel="Retry loading service status"
									accessibilityRole="button"
								>
									<Ionicons name="refresh" size={16} color="#3b82f6" />
									<Text style={styles.retryEmptyButtonText}>
										{isLoading ? 'Loading...' : 'Try Again'}
									</Text>
								</TouchableOpacity>
							</View>
						) : (
							services.map((service, index) => (
								<View
									key={index}
									style={styles.serviceCard}
									accessibilityLabel={`${service.name} service is ${
										service.healthy ? 'healthy' : 'unhealthy'
									}`}
									accessibilityRole="summary"
								>
									<View style={styles.serviceHeader}>
										<View style={styles.serviceInfo}>
											<Ionicons
												name={getServiceIcon(service.stats) as any}
												size={20}
												color={service.color}
											/>
											<Text style={styles.serviceName}>{service.name}</Text>
										</View>
										<View
											style={[
												styles.statusBadge,
												{ backgroundColor: service.color + '20' },
											]}
										>
											<Text
												style={[
													styles.statusBadgeText,
													{ color: service.color },
												]}
											>
												{service.stats.state}
											</Text>
										</View>
									</View>

									<View style={styles.serviceStats}>
										<View style={styles.statRow}>
											<Text style={styles.statLabel}>Total Calls</Text>
											<Text style={styles.statValue}>
												{service.stats.totalCalls}
											</Text>
										</View>
										<View style={styles.statRow}>
											<Text style={styles.statLabel}>Success Rate</Text>
											<Text style={styles.statValue}>
												{service.stats.totalCalls > 0
													? `${(
															(service.stats.totalSuccesses /
																service.stats.totalCalls) *
															100
													  ).toFixed(1)}%`
													: 'N/A'}
											</Text>
										</View>
										<View style={styles.statRow}>
											<Text style={styles.statLabel}>Avg Response Time</Text>
											<Text style={styles.statValue}>
												{formatResponseTime(service.stats.averageResponseTime)}
											</Text>
										</View>
										<View style={styles.statRow}>
											<Text style={styles.statLabel}>Last Success</Text>
											<Text style={styles.statValue}>
												{formatDate(service.stats.lastSuccessTime)}
											</Text>
										</View>
										<View style={styles.statRow}>
											<Text style={styles.statLabel}>Last Failure</Text>
											<Text style={styles.statValue}>
												{formatDate(service.stats.lastFailureTime)}
											</Text>
										</View>
									</View>
								</View>
							))
						)}

						<View style={styles.actions}>
							<TouchableOpacity
								style={styles.refreshButton}
								onPress={updateServiceStatus}
								disabled={isLoading}
								accessibilityLabel="Refresh service status"
								accessibilityHint="Tap to manually refresh all service statuses"
								accessibilityRole="button"
							>
								<Ionicons name="refresh" size={16} color="#3b82f6" />
								<Text style={styles.refreshButtonText}>
									{isLoading ? 'Updating...' : 'Refresh Status'}
								</Text>
							</TouchableOpacity>

							<TouchableOpacity
								style={styles.resetButton}
								onPress={() => {
									ResilientApiService.resetCircuitBreakers();
									updateServiceStatus();
								}}
								accessibilityLabel="Reset circuit breakers"
								accessibilityHint="Tap to reset all circuit breakers to closed state"
								accessibilityRole="button"
							>
								<Ionicons name="refresh-circle" size={16} color="#ef4444" />
								<Text style={styles.resetButtonText}>
									Reset Circuit Breakers
								</Text>
							</TouchableOpacity>
						</View>
					</ScrollView>
				</View>
			</Modal>
		</>
	);
}

const styles = StyleSheet.create({
	container: {
		backgroundColor: '#f9fafb',
		borderRadius: 8,
		borderWidth: 1,
		margin: 16,
		padding: 12,
	},
	statusRow: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		alignItems: 'center',
	},
	statusLeft: {
		flexDirection: 'row',
		alignItems: 'center',
		flex: 1,
	},
	statusText: {
		fontSize: 14,
		fontWeight: '500',
		marginLeft: 8,
	},
	statusRight: {
		flexDirection: 'row',
		alignItems: 'center',
	},
	retryButton: {
		marginLeft: 8,
		padding: 4,
	},
	modalContainer: {
		flex: 1,
		backgroundColor: '#ffffff',
	},
	modalHeader: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		alignItems: 'center',
		padding: 20,
		borderBottomWidth: 1,
		borderBottomColor: '#e5e7eb',
	},
	modalTitle: {
		fontSize: 20,
		fontWeight: '600',
		color: '#111827',
	},
	closeButton: {
		padding: 4,
	},
	modalContent: {
		flex: 1,
		padding: 20,
	},
	serviceCard: {
		backgroundColor: '#f9fafb',
		borderRadius: 12,
		padding: 16,
		marginBottom: 16,
		borderWidth: 1,
		borderColor: '#e5e7eb',
	},
	serviceHeader: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		alignItems: 'center',
		marginBottom: 12,
	},
	serviceInfo: {
		flexDirection: 'row',
		alignItems: 'center',
	},
	serviceName: {
		fontSize: 16,
		fontWeight: '600',
		color: '#111827',
		marginLeft: 8,
	},
	statusBadge: {
		paddingHorizontal: 8,
		paddingVertical: 4,
		borderRadius: 12,
	},
	statusBadgeText: {
		fontSize: 12,
		fontWeight: '500',
		textTransform: 'uppercase',
	},
	serviceStats: {
		gap: 8,
	},
	statRow: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		alignItems: 'center',
	},
	statLabel: {
		fontSize: 14,
		color: '#6b7280',
	},
	statValue: {
		fontSize: 14,
		fontWeight: '500',
		color: '#111827',
	},
	actions: {
		marginTop: 20,
		gap: 12,
	},
	refreshButton: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'center',
		backgroundColor: '#f3f4f6',
		borderRadius: 8,
		padding: 12,
		borderWidth: 1,
		borderColor: '#e5e7eb',
	},
	refreshButtonText: {
		fontSize: 14,
		fontWeight: '500',
		color: '#3b82f6',
		marginLeft: 8,
	},
	resetButton: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'center',
		backgroundColor: '#fef2f2',
		borderRadius: 8,
		padding: 12,
		borderWidth: 1,
		borderColor: '#fecaca',
	},
	resetButtonText: {
		fontSize: 14,
		fontWeight: '500',
		color: '#ef4444',
		marginLeft: 8,
	},
	emptyState: {
		alignItems: 'center',
		justifyContent: 'center',
		padding: 40,
		marginTop: 60,
	},
	emptyStateTitle: {
		fontSize: 18,
		fontWeight: '600',
		color: '#374151',
		marginTop: 16,
		marginBottom: 8,
	},
	emptyStateText: {
		fontSize: 14,
		color: '#6b7280',
		textAlign: 'center',
		lineHeight: 20,
		marginBottom: 24,
	},
	retryEmptyButton: {
		flexDirection: 'row',
		alignItems: 'center',
		backgroundColor: '#f3f4f6',
		borderRadius: 8,
		paddingHorizontal: 16,
		paddingVertical: 12,
		borderWidth: 1,
		borderColor: '#e5e7eb',
	},
	retryEmptyButtonText: {
		fontSize: 14,
		fontWeight: '500',
		color: '#3b82f6',
		marginLeft: 8,
	},
});
