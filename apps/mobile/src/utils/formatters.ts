/**
 * Formats a number into a localized currency string.
 * Negative numbers place the minus sign before the currency symbol (e.g., -₱1,200.00).
 */
export function formatCurrency(amount: number, currency: string = '₱'): string {
    const isNegative = amount < 0;
    const absAmount = Math.abs(amount);
    const formattedNumber = absAmount.toLocaleString('en-US', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    });

    return isNegative ? `-${currency}${formattedNumber}` : `${currency}${formattedNumber}`;
}

/**
 * Formats an amount with an explicit sign based on transaction type.
 * Ensures expenses do not display as double negatives (--₱X) and zero amounts do not display with negative signs (-₱0.00).
 */
export function formatSignedCurrency(amount: number, type: 'income' | 'expense' | 'transfer', currency: string = '₱'): string {
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

    const isToday = date.getDate() === now.getDate() && date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear();

    if (isToday) {
        return 'Today';
    }

    const yesterday = new Date(now);
    yesterday.setDate(now.getDate() - 1);
    const isYesterday =
        date.getDate() === yesterday.getDate() && date.getMonth() === yesterday.getMonth() && date.getFullYear() === yesterday.getFullYear();

    if (isYesterday) {
        return 'Yesterday';
    }

    return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric'
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
                    year: 'numeric'
                });
            }
        }
    }
    return dateString;
}

/**
 * Formats a Date object, timestamp number, ISO date string, or 24-hour time string into a 12-hour time format (e.g. "4:08 PM", "12:15 AM").
 */
export function formatTime12(dateOrString?: Date | string | number | null): string {
    if (!dateOrString && dateOrString !== 0) return '';

    // If it's already in 12-hour format with AM/PM
    if (typeof dateOrString === 'string') {
        const trimmed = dateOrString.trim();
        if (/am|pm/i.test(trimmed)) {
            return trimmed;
        }

        // If it's a 24-hour time string (e.g., "16:08" or "09:30" or "16:08:30")
        const timeMatch = trimmed.match(/^(\d{1,2}):(\d{2})(?::\d{2})?$/);
        if (timeMatch) {
            let hours = parseInt(timeMatch[1], 10);
            const minutes = timeMatch[2];
            if (hours >= 0 && hours <= 23) {
                const period = hours >= 12 ? 'PM' : 'AM';
                hours = hours % 12 || 12;
                return `${hours}:${minutes} ${period}`;
            }
        }
    }

    const date = typeof dateOrString === 'object' && dateOrString instanceof Date ? dateOrString : new Date(dateOrString);

    if (isNaN(date.getTime())) {
        return typeof dateOrString === 'string' ? dateOrString : '';
    }

    return date.toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
    });
}

/**
 * Formats a raw user input string into real-time money display format with comma thousands separators.
 * Preserves incomplete decimal typing (e.g., "1,234." or "0.") and restricts to at most 2 decimal places.
 */
export function formatMoneyInput(raw: string): string {
    if (!raw) return '';

    // Keep only digits and decimal points
    const sanitized = raw.replace(/[^0-9.]/g, '');
    if (!sanitized) return '';

    // Handle multiple dots by treating the first dot as the decimal separator
    const parts = sanitized.split('.');
    let integerPart = parts[0];
    const hasDecimal = parts.length > 1;

    // Handle leading zeros: if integerPart is e.g. "05", strip leading zeros to "5".
    // If it is "00", keep a single "0".
    if (integerPart.length > 1 && integerPart.startsWith('0')) {
        integerPart = integerPart.replace(/^0+(?=\d)/, '');
        if (integerPart === '') {
            integerPart = '0';
        }
    }

    // If user started directly with a dot (e.g. "."), integerPart is empty -> normalize to "0"
    if (integerPart === '' && hasDecimal) {
        integerPart = '0';
    }

    // Format integer part with thousands separators
    const formattedInteger = integerPart.replace(/\B(?=(\d{3})+(?!\d))/g, ',');

    if (!hasDecimal) {
        return formattedInteger;
    }

    // Join everything after the first dot as decimal part, capped to 2 digits
    const decimalPart = parts.slice(1).join('').slice(0, 2);
    return `${formattedInteger}.${decimalPart}`;
}

/**
 * Safely parses a formatted money input string back into a numeric number.
 */
export function parseMoneyInput(formatted: string): number {
    if (!formatted) return 0;
    const clean = formatted.replace(/,/g, '').trim();
    const num = parseFloat(clean);
    return isNaN(num) ? 0 : num;
}
