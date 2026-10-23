import React from 'react';
import { View, Text, StyleSheet, StyleProp, ViewStyle } from 'react-native';
import { Icon } from '../../icons';

export interface MessageReceiptTicksProps {
  status: 'SENT' | 'DELIVERED' | 'READ';
  size?: number;
  greyColor?: string;
  blueColor?: string;
  style?: StyleProp<ViewStyle>;
  isGroup?: boolean;
  readCount?: number;
  totalRecipients?: number;
  isAllRead?: boolean;
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
  isGroup = false,
  readCount = 0,
  totalRecipients = 0,
  isAllRead = false,
}) => {
  // If explicitly all read or status is READ
  const isFullyRead = isAllRead || status === 'READ';

  if (isFullyRead) {
    return (
      <View style={[styles.container, style]}>
        <Icon name="doubleCheck" size={size} color={blueColor} />
      </View>
    );
  }

  // In a group, if some (but not all) recipients have read it
  if (isGroup && readCount > 0) {
    return (
      <View style={[styles.container, style]}>
        <Icon name="doubleCheck" size={size} color={greyColor} />
        <Text style={[styles.groupCount, { color: greyColor, fontSize: Math.max(9, size - 4) }]}>
          {totalRecipients > 0 ? `${readCount}/${totalRecipients}` : `${readCount}`}
        </Text>
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
    gap: 2,
  },
  groupCount: {
    fontWeight: '600',
    marginLeft: 2,
    lineHeight: 11,
  },
});
