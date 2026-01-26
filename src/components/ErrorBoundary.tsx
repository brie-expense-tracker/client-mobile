import React, { Component, ErrorInfo, ReactNode } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { palette, space, type, radius } from '../ui/theme';
import { ErrorService } from '../services/errorService';
import { CrashReportingService } from '../services/feature/crashReporting';

interface Props {
	children: ReactNode;
	fallback?: ReactNode;
	onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

interface State {
	hasError: boolean;
	error: Error | null;
	errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends Component<Props, State> {
	private crashReporting: CrashReportingService;

	constructor(props: Props) {
		super(props);
		this.state = {
			hasError: false,
			error: null,
			errorInfo: null,
		};
		// Initialize crash reporting service
		this.crashReporting = new CrashReportingService({
			userConsent: true, // Assume consent for error boundaries
		});
	}

	static getDerivedStateFromError(error: Error): State {
		return {
			hasError: true,
			error,
			errorInfo: null,
		};
	}

	componentDidCatch(error: Error, errorInfo: ErrorInfo) {
		// Log to crash reporting
		this.crashReporting.captureError(error, {
			action: 'error_boundary',
			additional_data: {
				componentStack: errorInfo.componentStack,
				errorBoundary: true,
			},
		});

		// Log to error service for categorization
		const errorState = ErrorService.categorizeError(error);
		ErrorService.logError(error, {
			errorBoundary: true,
			componentStack: errorInfo.componentStack,
		});

		this.setState({
			error,
			errorInfo,
		});

		// Call custom error handler if provided
		this.props.onError?.(error, errorInfo);
	}

	handleReset = () => {
		this.setState({
			hasError: false,
			error: null,
			errorInfo: null,
		});
	};

	render() {
		if (this.state.hasError) {
			if (this.props.fallback) {
				return this.props.fallback;
			}

			return (
				<View style={styles.container}>
					<View style={styles.card}>
						<View style={styles.iconWrapper}>
							<Ionicons
								name="warning-outline"
								size={32}
								color={palette.danger}
							/>
						</View>
						<Text style={styles.title}>Something went wrong</Text>
						<Text style={styles.subtitle}>
							We're sorry for the inconvenience. The app encountered an
							unexpected error.
						</Text>
						{__DEV__ && this.state.error && (
							<View style={styles.errorDetails}>
								<Text style={styles.errorText}>
									{this.state.error.toString()}
								</Text>
								{this.state.errorInfo?.componentStack && (
									<Text style={styles.stackText}>
										{this.state.errorInfo.componentStack}
									</Text>
								)}
							</View>
						)}
						<TouchableOpacity
							style={styles.button}
							onPress={this.handleReset}
							activeOpacity={0.8}
						>
							<Text style={styles.buttonText}>Try Again</Text>
						</TouchableOpacity>
					</View>
				</View>
			);
		}

		return this.props.children;
	}
}

const styles = StyleSheet.create({
	container: {
		flex: 1,
		justifyContent: 'center',
		alignItems: 'center',
		backgroundColor: palette.surfaceAlt,
		padding: space.xl,
	},
	card: {
		width: '100%',
		maxWidth: 400,
		backgroundColor: palette.surface,
		borderRadius: radius.xl,
		padding: space.xl,
		alignItems: 'center',
	},
	iconWrapper: {
		width: 64,
		height: 64,
		borderRadius: 32,
		backgroundColor: palette.dangerSubtle,
		justifyContent: 'center',
		alignItems: 'center',
		marginBottom: space.md,
	},
	title: {
		...type.h2,
		color: palette.text,
		textAlign: 'center',
		marginBottom: space.sm,
	},
	subtitle: {
		...type.body,
		color: palette.textMuted,
		textAlign: 'center',
		marginBottom: space.lg,
	},
	errorDetails: {
		width: '100%',
		backgroundColor: palette.surfaceAlt,
		borderRadius: radius.md,
		padding: space.md,
		marginBottom: space.lg,
		maxHeight: 200,
	},
	errorText: {
		...type.small,
		color: palette.danger,
		fontFamily: 'monospace',
		marginBottom: space.sm,
	},
	stackText: {
		...type.small,
		color: palette.textMuted,
		fontFamily: 'monospace',
		fontSize: 10,
	},
	button: {
		backgroundColor: palette.primary,
		paddingHorizontal: space.xl,
		paddingVertical: space.md,
		borderRadius: radius.pill,
	},
	buttonText: {
		...type.body,
		color: palette.primaryTextOn,
		fontWeight: '600',
	},
});
