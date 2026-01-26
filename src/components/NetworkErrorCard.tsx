import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AppCard, AppText, AppButton } from '../ui/primitives';
import { ErrorState } from '../services/errorService';
import { palette, space, type, radius } from '../ui/theme';

interface NetworkErrorCardProps {
	error: ErrorState;
	onRetry: () => void;
}

/**
 * Reusable error banner component for displaying API errors with retry functionality
 * Use this component in any screen that needs to show error states from API calls
 */
export function NetworkErrorCard({ error, onRetry }: NetworkErrorCardProps) {
	return (
		<AppCard>
			<View style={styles.container}>
				<Ionicons name="cloud-offline-outline" size={24} color={palette.danger} />
				<View style={styles.content}>
					<AppText.Heading style={styles.title}>
						{error.message}
					</AppText.Heading>
					{error.recoverySuggestions && error.recoverySuggestions.length > 0 && (
						<View style={styles.suggestions}>
							{error.recoverySuggestions.slice(0, 2).map((suggestion, idx) => (
								<AppText.Caption
									key={idx}
									color="muted"
									style={styles.suggestion}
								>
									• {suggestion}
								</AppText.Caption>
							))}
						</View>
					)}
				</View>
				{error.retryable && (
					<AppButton
						label={error.action || 'Retry'}
						variant="ghost"
						icon="refresh"
						onPress={onRetry}
					/>
				)}
			</View>
		</AppCard>
	);
}

const styles = StyleSheet.create({
	container: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 12,
	},
	content: {
		flex: 1,
	},
	title: {
		...type.body,
		fontWeight: '600',
		color: palette.danger,
		marginBottom: 4,
	},
	suggestions: {
		marginTop: 4,
	},
	suggestion: {
		...type.small,
		marginTop: 2,
	},
});
