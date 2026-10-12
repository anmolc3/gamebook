import React from 'react';
import { View, StyleSheet, StyleProp, ViewStyle } from 'react-native';
import { Icon } from '../../icons';

export interface MessageReceiptTicksProps {
  status: 'SENT' | 'DELIVERED' | 'READ';
  size?: number;
  greyColor?: string;
  blueColor?: string;
  style?: StyleProp<ViewStyle>;
}

// Authentic WhatsApp Blue Tick color (#34B7F1 / #53BDEB) and Grey Tick color (#8696A0)
export const WHATSAPP_BLUE = '#34B7F1';
export const WHATSAPP_GREY = '#8696A0';

export const MessageReceiptTicks: React.FC<MessageReceiptTicksProps> = ({
  status,
  size = 14,
  greyColor = WHATSAPP_GREY,
  blueColor = WHATSAPP_BLUE,
  style,
}) => {
  if (status === 'READ') {
    return (
      <View style={[styles.container, style]}>
        <Icon name="doubleCheck" size={size} color={blueColor} />
      </View>
    );
  }

  if (status === 'DELIVERED') {
    return (
      <View style={[styles.container, style]}>
        <Icon name="doubleCheck" size={size} color={greyColor} />
      </View>
    );
  }

  // Fallback to SENT: 1 grey tick
  return (
    <View style={[styles.container, style]}>
      <Icon name="check" size={size} color={greyColor} />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
