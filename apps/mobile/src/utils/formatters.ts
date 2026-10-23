/**
 * Formats a number into a localized currency string.
 * Negative numbers place the minus sign before the currency symbol (e.g., -₱1,200.00).
 */
export function formatCurrency(amount: number, currency: string = '₱'): string {
  const isNegative = amount < 0;
  const absAmount = Math.abs(amount);
  const formattedNumber = absAmount.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

  return isNegative ? `-${currency}${formattedNumber}` : `${currency}${formattedNumber}`;
}

/**
 * Returns a human-friendly relative date string ("Today", "Yesterday", or formatted month/day).
 */
export function formatRelativeDate(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();

  const isToday =
    date.getDate() === now.getDate() &&
    date.getMonth() === now.getMonth() &&
    date.getFullYear() === now.getFullYear();

  if (isToday) {
    return 'Today';
  }

  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  const isYesterday =
    date.getDate() === yesterday.getDate() &&
    date.getMonth() === yesterday.getMonth() &&
    date.getFullYear() === yesterday.getFullYear();

  if (isYesterday) {
    return 'Yesterday';
  }

  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  });
}

