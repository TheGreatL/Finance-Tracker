import { describe, it, expect } from 'vitest';
import {
  calculateNotificationTrigger,
  formatReminderBody,
  calculateSubscriptionReminderTrigger,
  formatSubscriptionReminderBody,
} from '../src/services/notificationService';

describe('notificationService helper calculations', () => {
  it('calculateNotificationTrigger computes exactly 3 days prior at 9:00 AM', () => {
    // Due date: October 30, 2026
    const dueDateStr = '2026-10-30';
    const now = new Date('2026-10-24T08:00:00.000'); // Today is Oct 24

    const trigger = calculateNotificationTrigger(dueDateStr, now);

    expect(trigger).not.toBeNull();
    // 3 days before Oct 30 is Oct 27
    expect(trigger?.getFullYear()).toBe(2026);
    expect(trigger?.getMonth()).toBe(9); // 0-indexed: 9 = October
    expect(trigger?.getDate()).toBe(27);
    expect(trigger?.getHours()).toBe(9);
    expect(trigger?.getMinutes()).toBe(0);
  });

  it('calculateNotificationTrigger returns null if 3-day reminder is already in the past', () => {
    // Due date: Tomorrow (Oct 25), so 3 days prior was Oct 22 (in the past)
    const dueDateStr = '2026-10-25';
    const now = new Date('2026-10-24T08:00:00.000');

    const trigger = calculateNotificationTrigger(dueDateStr, now);
    expect(trigger).toBeNull();
  });

  it('formatReminderBody constructs clear, accurate message', () => {
    const body = formatReminderBody({
      title: 'GLoan',
      monthlyPayment: 2500,
      dueDate: '2026-10-30',
      institutionName: 'GCash',
    });

    expect(body).toContain('₱2,500');
    expect(body).toContain('3 days');
    expect(body).toContain('GCash');
    expect(body).toContain('2026-10-30');
  });

  it('calculateSubscriptionReminderTrigger schedules 1 day before next_billing_date at 9:00 AM', () => {
    const ref = new Date(2026, 10, 10, 8, 0, 0); // Nov 10, 2026
    const trigger = calculateSubscriptionReminderTrigger('2026-11-15', 1, ref);
    expect(trigger).not.toBeNull();
    expect(trigger?.getFullYear()).toBe(2026);
    expect(trigger?.getMonth()).toBe(10);
    expect(trigger?.getDate()).toBe(14);
    expect(trigger?.getHours()).toBe(9);
  });

  it('calculateSubscriptionReminderTrigger returns null when trigger time has already passed', () => {
    const ref = new Date(2026, 10, 14, 10, 0, 0); // Nov 14, 2026 10:00 AM
    const trigger = calculateSubscriptionReminderTrigger('2026-11-15', 1, ref);
    expect(trigger).toBeNull();
  });

  it('formatSubscriptionReminderBody includes amount, billing date, and pocket label', () => {
    const body = formatSubscriptionReminderBody({
      serviceName: 'Netflix',
      amount: 549,
      nextBillingDate: '2026-11-15',
      pocketLabel: 'GCash • Main Wallet',
      daysBefore: 1,
    });
    expect(body).toContain('₱549');
    expect(body).toContain('2026-11-15');
    expect(body).toContain('GCash • Main Wallet');
  });
});
