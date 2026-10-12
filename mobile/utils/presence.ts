import { useState, useEffect } from 'react';

/**
 * Format online / last seen status in WhatsApp-style human-friendly format
 * Uses the user's local time zone.
 * Never outputs a future timestamp or fabricated data.
 */
export function formatPresenceStatus(
  isOnline: boolean,
  lastSeen?: string | Date | null
): string {
  if (isOnline) {
    return 'online';
  }

  if (!lastSeen) {
    return '';
  }

  const date = typeof lastSeen === 'string' ? new Date(lastSeen) : lastSeen;
  if (isNaN(date.getTime())) {
    return '';
  }

  const now = new Date();
  // Ensure we never display a future timestamp
  const clampedTime = Math.min(date.getTime(), now.getTime());
  const effectiveDate = new Date(clampedTime);

  const diffMs = now.getTime() - clampedTime;
  const diffSec = Math.max(0, Math.floor(diffMs / 1000));
  const diffMin = Math.floor(diffSec / 60);

  // Less than 1 minute ago
  if (diffMin < 1) {
    return 'last seen just now';
  }

  // Under 60 minutes ago
  if (diffMin < 60) {
    return `last seen ${diffMin} minute${diffMin === 1 ? '' : 's'} ago`;
  }

  const isToday =
    effectiveDate.getDate() === now.getDate() &&
    effectiveDate.getMonth() === now.getMonth() &&
    effectiveDate.getFullYear() === now.getFullYear();

  const yesterday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1);
  const isYesterday =
    effectiveDate.getDate() === yesterday.getDate() &&
    effectiveDate.getMonth() === yesterday.getMonth() &&
    effectiveDate.getFullYear() === yesterday.getFullYear();

  // Format time in local time (e.g., "6:30 PM")
  const timeStr = effectiveDate.toLocaleTimeString([], {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });

  if (isToday) {
    return `last seen today at ${timeStr}`;
  }

  if (isYesterday) {
    return `last seen yesterday at ${timeStr}`;
  }

  // Within past 6 days, show weekday (e.g. "Mon at 4:15 PM")
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  if (diffDays < 7) {
    const weekday = effectiveDate.toLocaleDateString([], { weekday: 'short' });
    return `last seen ${weekday} at ${timeStr}`;
  }

  // Older: show date (e.g. "Oct 10 at 4:15 PM")
  const dateStr = effectiveDate.toLocaleDateString([], {
    month: 'short',
    day: 'numeric',
  });
  return `last seen ${dateStr} at ${timeStr}`;
}

/**
 * Custom React hook that auto-updates presence status on screen at periodic intervals
 * (e.g., transitions from "just now" -> "1 minute ago" -> "5 minutes ago" live)
 */
export function usePresenceStatus(
  isOnline: boolean,
  lastSeen?: string | Date | null
): string {
  const [statusText, setStatusText] = useState<string>(() =>
    formatPresenceStatus(isOnline, lastSeen)
  );

  useEffect(() => {
    setStatusText(formatPresenceStatus(isOnline, lastSeen));

    // If online or no lastSeen, re-renders are only driven by state changes
    if (isOnline || !lastSeen) return;

    // Refresh every 30 seconds so relative timestamps update smoothly
    const interval = setInterval(() => {
      setStatusText(formatPresenceStatus(isOnline, lastSeen));
    }, 30000);

    return () => clearInterval(interval);
  }, [isOnline, lastSeen]);

  return statusText;
}
