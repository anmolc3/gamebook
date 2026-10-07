import React from 'react';
import { Text, TextProps, StyleSheet } from 'react-native';
import { useTheme } from '../../theme';

interface TypographyProps extends TextProps {
  variant?:
    | 'display'
    | 'headingLarge'
    | 'headingMedium'
    | 'headingSmall'
    | 'bodyLarge'
    | 'bodyMedium'
    | 'bodySmall'
    | 'caption'
    | 'label'
    | 'button';
  color?: string;
  align?: 'left' | 'center' | 'right';
  children: React.ReactNode;
}

export const Typography: React.FC<TypographyProps> = ({
  variant = 'bodyLarge',
  color,
  align = 'left',
  style,
  children,
  ...props
}) => {
  const { theme } = useTheme();
  const tokenStyle = theme.typography[variant];

  return (
    <Text
      style={[
        tokenStyle,
        color ? { color } : undefined,
        align ? { textAlign: align } : undefined,
        style,
      ]}
      {...props}
    >
      {children}
    </Text>
  );
};
