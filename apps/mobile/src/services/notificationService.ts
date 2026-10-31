import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

// Set default notification behavior when app is in foreground
try {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
      shouldShowBanner: true,
      shouldShowList: true,
      priority: Notifications.AndroidNotificationPriority?.HIGH ?? 4,
    }),
  });
} catch (handlerErr) {
  console.warn('Could not initialize foreground notification handler:', handlerErr);
}

/**
 * Calculates a reminder trigger 3 days before the due date at 9:00 AM.
 * Returns null if the trigger timestamp is already in the past.
 */
export function calculateNotificationTrigger(
  dueDateStr: string,
  referenceDate: Date = new Date()
): Date | null {
  if (!dueDateStr) return null;

  // Parse YYYY-MM-DD
  const parts = dueDateStr.split('-').map((p) => parseInt(p, 10));
  if (parts.length < 3 || isNaN(parts[0]) || isNaN(parts[1]) || isNaN(parts[2])) {
    return null;
  }

  // year, monthIndex (0-based), day
  const due = new Date(parts[0], parts[1] - 1, parts[2], 9, 0, 0, 0);

  // 3 days before
  const trigger = new Date(due);
  trigger.setDate(trigger.getDate() - 3);

  if (trigger.getTime() <= referenceDate.getTime()) {
    return null;
  }

  return trigger;
}

export function formatReminderBody(details: {
  title: string;
  monthlyPayment: number;
  dueDate: string;
  institutionName: string;
}): string {
  return `₱${details.monthlyPayment.toLocaleString()} is due in 3 days (${details.dueDate}) on ${details.institutionName}.`;
}

/**
 * Calculates a reminder trigger N days (default 1 day) before a subscription's next_billing_date at 9:00 AM.
 * Returns null if the trigger timestamp is already in the past.
 */
export function calculateSubscriptionReminderTrigger(
  nextBillingDateStr: string,
  daysBefore: number = 1,
  referenceDate: Date = new Date()
): Date | null {
  if (!nextBillingDateStr) return null;

  const parts = nextBillingDateStr.split('-').map((p) => parseInt(p, 10));
  if (parts.length < 3 || isNaN(parts[0]) || isNaN(parts[1]) || isNaN(parts[2])) {
    return null;
  }

  const due = new Date(parts[0], parts[1] - 1, parts[2], 9, 0, 0, 0);
  const trigger = new Date(due);
  trigger.setDate(trigger.getDate() - Math.max(0, daysBefore));

  if (trigger.getTime() <= referenceDate.getTime()) {
    return null;
  }

  return trigger;
}

export function formatSubscriptionReminderBody(details: {
  serviceName: string;
  amount: number;
  nextBillingDate: string;
  pocketLabel: string;
  daysBefore?: number;
}): string {
  const days = details.daysBefore ?? 1;
  const whenLabel = days === 1 ? 'tomorrow' : `in ${days} days`;
  return `₱${details.amount.toLocaleString()} for ${details.serviceName} will be charged ${whenLabel} (${details.nextBillingDate}) from ${details.pocketLabel}.`;
}

/**
 * Requests local notification permissions from the user.
 */
export async function requestNotificationPermissions(): Promise<boolean> {
  if (Platform.OS === 'web') return false;

  try {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('loan-reminders', {
        name: 'Loan Payment Reminders',
        importance: Notifications.AndroidImportance.HIGH,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#18342B',
      });
      await Notifications.setNotificationChannelAsync('subscription-reminders', {
        name: 'Subscription Billing Alerts',
        importance: Notifications.AndroidImportance.HIGH,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#18342B',
      });
    }

    return finalStatus === 'granted';
  } catch (err) {
    console.warn('Failed to request notification permissions:', err);
    return false;
  }
}

/**
 * Schedules a local notification 3 days before the loan payment due date at 9:00 AM.
 * Returns the notification identifier string, or null if permissions were denied or due date is too soon.
 */
export async function scheduleLoanReminder(loan: {
  id: string;
  title: string;
  monthly_payment: number;
  due_date: string;
  institution_name: string;
}): Promise<string | null> {
  const triggerDate = calculateNotificationTrigger(loan.due_date);
  if (!triggerDate) {
    return null;
  }

  const hasPermission = await requestNotificationPermissions();
  if (!hasPermission) {
    return null;
  }

  try {
    const id = await Notifications.scheduleNotificationAsync({
      content: {
        title: `Loan Payment Due Soon: ${loan.title}`,
        body: formatReminderBody({
          title: loan.title,
          monthlyPayment: loan.monthly_payment,
          dueDate: loan.due_date,
          institutionName: loan.institution_name,
        }),
        data: { loanId: loan.id },
        sound: true,
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DATE,
        date: triggerDate,
        channelId: Platform.OS === 'android' ? 'loan-reminders' : undefined,
      },
    });

    return id;
  } catch (err) {
    console.warn('Failed to schedule local notification for loan:', err);
    return null;
  }
}

/**
 * Schedules a local reminder 1 day (or days_before) prior to a subscription's next billing date.
 */
export async function scheduleSubscriptionReminder(sub: {
  id: string;
  service_name: string;
  amount: number;
  next_billing_date: string;
  pocket_label: string;
  days_before?: number;
}): Promise<string | null> {
  const triggerDate = calculateSubscriptionReminderTrigger(
    sub.next_billing_date,
    sub.days_before ?? 1
  );
  if (!triggerDate) {
    return null;
  }

  const hasPermission = await requestNotificationPermissions();
  if (!hasPermission) {
    return null;
  }

  try {
    const id = await Notifications.scheduleNotificationAsync({
      content: {
        title: `Upcoming Subscription: ${sub.service_name}`,
        body: formatSubscriptionReminderBody({
          serviceName: sub.service_name,
          amount: sub.amount,
          nextBillingDate: sub.next_billing_date,
          pocketLabel: sub.pocket_label,
          daysBefore: sub.days_before ?? 1,
        }),
        data: { subscriptionId: sub.id },
        sound: true,
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DATE,
        date: triggerDate,
        channelId: Platform.OS === 'android' ? 'subscription-reminders' : undefined,
      },
    });
    return id;
  } catch (err) {
    console.warn('Failed to schedule subscription reminder:', err);
    return null;
  }
}

/**
 * Fires an immediate payment confirmation alert right after a subscription is automatically deducted.
 */
export async function sendSubscriptionPaymentConfirmation(charge: {
  service_name: string;
  amount: number;
  pocket_label: string;
  cycles?: number;
}): Promise<string | null> {
  const hasPermission = await requestNotificationPermissions();
  if (!hasPermission) {
    return null;
  }

  const cycleSuffix =
    charge.cycles && charge.cycles > 1 ? ` (${charge.cycles} cycles caught up)` : '';

  try {
    const id = await Notifications.scheduleNotificationAsync({
      content: {
        title: `Subscription Paid: ${charge.service_name}`,
        body: `₱${charge.amount.toLocaleString()} was automatically deducted from ${charge.pocket_label}${cycleSuffix}.`,
        sound: true,
      },
      trigger: null,
    });
    return id;
  } catch (err) {
    console.warn('Failed to send subscription payment confirmation:', err);
    return null;
  }
}

/**
 * Cancels a scheduled local notification reminder by its ID.
 */
export async function cancelLoanReminder(notificationId: string): Promise<void> {
  if (!notificationId) return;
  try {
    await Notifications.cancelScheduledNotificationAsync(notificationId);
  } catch (err) {
    console.warn('Failed to cancel scheduled notification:', notificationId, err);
  }
}
