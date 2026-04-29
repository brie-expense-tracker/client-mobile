import React from 'react';
import { Text, TextProps, StyleSheet } from 'react-native';
import { palette, type } from '../theme';

export type AppTextProps = TextProps & {
	/** Text variant */
	variant?: 'title' | 'heading' | 'body' | 'label' | 'caption' | 'subtitle';
	/** Text color variant */
	color?:
		| 'default'
		| 'muted'
		| 'subtle'
		| 'primary'
		| 'success'
		| 'danger'
		| 'warning';
	children: React.ReactNode;
};

type AppTextComponent = React.FC<AppTextProps> & {
	Title: React.FC<Omit<AppTextProps, 'variant'>>;
	Heading: React.FC<Omit<AppTextProps, 'variant'>>;
	Body: React.FC<Omit<AppTextProps, 'variant'>>;
	Label: React.FC<Omit<AppTextProps, 'variant'>>;
	Caption: React.FC<Omit<AppTextProps, 'variant'>>;
	Subtitle: React.FC<Omit<AppTextProps, 'variant'>>;
};

/**
 * AppText - Standardized text component with theme-aware variants
 * 
 * @example
 * <AppText.Title>Main Heading</AppText.Title>
 * <AppText.Body color="muted">Secondary text</AppText.Body>
 */
const AppTextBase: React.FC<AppTextProps> = ({
	variant = 'body',
	color = 'default',
	style,
	children,
	...props
}) => {
	const colorValue =
		color === 'muted'
			? palette.textMuted
			: color === 'subtle'
				? palette.textSubtle
				: color === 'primary'
					? palette.primary
					: color === 'success'
						? palette.success
						: color === 'danger'
							? palette.danger
							: color === 'warning'
								? palette.warningStrong
								: palette.text;

	const variantStyle =
		variant === 'title'
			? styles.title
			: variant === 'heading'
				? styles.heading
				: variant === 'label'
					? styles.label
					: variant === 'caption'
						? styles.caption
						: variant === 'subtitle'
							? styles.subtitle
							: styles.body;

	return (
		<Text style={[variantStyle, { color: colorValue }, style]} {...props}>
			{children}
		</Text>
	);
};

// Convenience components for common text variants
const createVariant = (variant: AppTextProps['variant']) => {
	return (props: Omit<AppTextProps, 'variant'>) => (
		<AppTextBase variant={variant} {...props} />
	);
};

const AppTextWithVariants = AppTextBase as AppTextComponent;

AppTextWithVariants.Title = createVariant('title');
AppTextWithVariants.Heading = createVariant('heading');
AppTextWithVariants.Body = createVariant('body');
AppTextWithVariants.Label = createVariant('label');
AppTextWithVariants.Caption = createVariant('caption');
AppTextWithVariants.Subtitle = createVariant('subtitle');

export const AppText = AppTextWithVariants;

const styles = StyleSheet.create({
	title: {
		...type.h1,
		color: palette.text,
	},
	heading: {
		...type.h2,
		color: palette.text,
	},
	body: {
		...type.body,
		color: palette.text,
	},
	label: {
		...type.labelSm,
		color: palette.text,
	},
	caption: {
		...type.small,
		color: palette.text,
	},
	subtitle: {
		...type.bodySm,
		color: palette.text,
	},
});
