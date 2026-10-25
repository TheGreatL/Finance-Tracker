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
 * Formats an amount with an explicit sign based on transaction type.
 * Ensures expenses do not display as double negatives (--₱X) and zero amounts do not display with negative signs (-₱0.00).
 */
export function formatSignedCurrency(
  amount: number,
  type: 'income' | 'expense' | 'transfer',
  currency: string = '₱'
): string {
  const absAmount = Math.abs(amount);
  const formatted = formatCurrency(absAmount, currency);

  if (absAmount === 0) {
    return formatted;
  }

  if (type === 'income') {
    return `+${formatted}`;
  }

  if (type === 'expense') {
    return `-${formatted}`;
  }

  return formatted;
}

/**
 * Returns a human-friendly relative date string ("Today", "Yesterday", or formatted month/day).
 */
export function formatRelativeDate(dateString: string): string {
  const date = new Date(dateString);
  if (isNaN(date.getTime())) {
    return 'Invalid date';
  }

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

/**
 * Formats a YYYY-MM-DD date string into a human-readable display string (e.g. "Nov 24, 2026").
 */
export function formatDisplayDate(dateString?: string): string {
  if (!dateString) return 'Select date';
  if (dateString.includes('-')) {
    const parts = dateString.split('-');
    if (parts.length === 3) {
      const y = parseInt(parts[0], 10);
      const m = parseInt(parts[1], 10) - 1;
      const d = parseInt(parts[2], 10);
      const date = new Date(y, m, d);
      if (!isNaN(date.getTime())) {
        return date.toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
          year: 'numeric',
        });
      }
    }
  }
  return dateString;
}
