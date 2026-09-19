import { getDatabase } from '../database/db';
import { RecurringRule, FrequencyType } from '../types/database';
import { createTransaction } from './ledgerService';

export async function getAllRecurringRules(activeOnly = false): Promise<RecurringRule[]> {
  const db = await getDatabase();
  const query = activeOnly
    ? 'SELECT * FROM recurring_rules WHERE is_active = 1 ORDER BY next_due_date ASC'
    : 'SELECT * FROM recurring_rules ORDER BY is_active DESC, next_due_date ASC';
  return await db.getAllAsync<RecurringRule>(query);
}

export async function createRecurringRule(rule: Omit<RecurringRule, 'created_at'>): Promise<RecurringRule> {
  const db = await getDatabase();
  const now = new Date().toISOString();
  const newRule: RecurringRule = {
    ...rule,
    created_at: now,
  };

  await db.runAsync(
    `INSERT INTO recurring_rules (
      id, type, account_id, to_account_id, category_id, amount,
      frequency, start_date, end_date, next_due_date, auto_create,
      is_active, notes, gross_amount, deductions_json, payout_day_1, payout_day_2, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      newRule.id,
      newRule.type,
      newRule.account_id,
      newRule.to_account_id ?? null,
      newRule.category_id ?? null,
      newRule.amount,
      newRule.frequency,
      newRule.start_date,
      newRule.end_date ?? null,
      newRule.next_due_date,
      newRule.auto_create,
      newRule.is_active,
      newRule.notes ?? '',
      newRule.gross_amount ?? null,
      newRule.deductions_json ?? null,
      newRule.payout_day_1 ?? null,
      newRule.payout_day_2 ?? null,
      newRule.created_at,
    ]
  );

  return newRule;
}

export async function updateRecurringRule(rule: Partial<RecurringRule> & { id: string }): Promise<void> {
  const db = await getDatabase();
  const existing = await db.getFirstAsync<RecurringRule>('SELECT * FROM recurring_rules WHERE id = ?', [rule.id]);
  if (!existing) throw new Error('Recurring rule not found');

  await db.runAsync(
    `UPDATE recurring_rules
     SET type = ?, account_id = ?, to_account_id = ?, category_id = ?, amount = ?,
         frequency = ?, start_date = ?, end_date = ?, next_due_date = ?,
         auto_create = ?, is_active = ?, notes = ?, gross_amount = ?, deductions_json = ?,
         payout_day_1 = ?, payout_day_2 = ?
     WHERE id = ?`,
    [
      rule.type ?? existing.type,
      rule.account_id ?? existing.account_id,
      rule.to_account_id ?? existing.to_account_id ?? null,
      rule.category_id ?? existing.category_id ?? null,
      rule.amount ?? existing.amount,
      rule.frequency ?? existing.frequency,
      rule.start_date ?? existing.start_date,
      rule.end_date ?? existing.end_date ?? null,
      rule.next_due_date ?? existing.next_due_date,
      rule.auto_create ?? existing.auto_create,
      rule.is_active ?? existing.is_active,
      rule.notes ?? existing.notes ?? '',
      rule.gross_amount ?? existing.gross_amount ?? null,
      rule.deductions_json ?? existing.deductions_json ?? null,
      rule.payout_day_1 ?? existing.payout_day_1 ?? null,
      rule.payout_day_2 ?? existing.payout_day_2 ?? null,
      rule.id,
    ]
  );
}

export async function deleteRecurringRule(id: string): Promise<void> {
  const db = await getDatabase();
  await db.runAsync('DELETE FROM recurring_rules WHERE id = ?', [id]);
}

export async function getRecurringRuleById(id: string): Promise<RecurringRule | null> {
  const db = await getDatabase();
  return await db.getFirstAsync<RecurringRule>('SELECT * FROM recurring_rules WHERE id = ?', [id]);
}

export async function claimRecurringRule(ruleId: string): Promise<string> {
  const db = await getDatabase();
  const rule = await getRecurringRuleById(ruleId);
  if (!rule) throw new Error('Recurring rule not found');

  const nextDue = computeNextDueDate(
    rule.next_due_date,
    rule.frequency,
    rule.payout_day_1,
    rule.payout_day_2
  );
  await db.runAsync('UPDATE recurring_rules SET next_due_date = ? WHERE id = ?', [nextDue, rule.id]);
  return nextDue;
}

function formatYearMonthDay(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function computeNextDueDate(
  currentDateStr: string,
  frequency: FrequencyType,
  payoutDay1?: number | null,
  payoutDay2?: number | null
): string {
  const [yearStr, monthStr, dayStr] = currentDateStr.split('-');
  const year = parseInt(yearStr, 10);
  const month = parseInt(monthStr, 10) - 1; // 0-indexed
  const day = parseInt(dayStr, 10);

  switch (frequency) {
    case 'daily': {
      const d = new Date(year, month, day + 1);
      return formatYearMonthDay(d);
    }
    case 'weekly': {
      const d = new Date(year, month, day + 7);
      return formatYearMonthDay(d);
    }
    case 'biweekly': {
      const d = new Date(year, month, day + 14);
      return formatYearMonthDay(d);
    }
    case 'semi_monthly': {
      const rawDay1 = payoutDay1 && payoutDay1 >= 1 && payoutDay1 <= 31 ? payoutDay1 : 15;
      const rawDay2 = payoutDay2 && payoutDay2 >= 1 && payoutDay2 <= 31 ? payoutDay2 : 30;
      const [firstDay, secondDay] = rawDay1 <= rawDay2 ? [rawDay1, rawDay2] : [rawDay2, rawDay1];

      const daysInCurrentMonth = new Date(year, month + 1, 0).getDate();
      const effectiveSecondDay = Math.min(secondDay, daysInCurrentMonth);

      if (day < effectiveSecondDay) {
        // Next is the 2nd cutoff of the current month
        return formatYearMonthDay(new Date(year, month, effectiveSecondDay));
      } else {
        // Next is the 1st cutoff of the following month
        const targetMonth = month + 1;
        const daysInTargetMonth = new Date(year, targetMonth + 1, 0).getDate();
        const effectiveFirstDay = Math.min(firstDay, daysInTargetMonth);
        return formatYearMonthDay(new Date(year, targetMonth, effectiveFirstDay));
      }
    }
    case 'monthly': {
      const targetMonth = month + 1;
      const daysInTargetMonth = new Date(year, targetMonth + 1, 0).getDate();
      const targetDay = Math.min(day, daysInTargetMonth);
      return formatYearMonthDay(new Date(year, targetMonth, targetDay));
    }
    case 'yearly': {
      return formatYearMonthDay(new Date(year + 1, month, day));
    }
  }
}

/**
 * Checks all active rules. If auto_create is 1 and next_due_date <= today,
 * creates transaction and advances next_due_date.
 */
export async function processDueRecurringRules(): Promise<number> {
  const db = await getDatabase();
  const todayStr = new Date().toISOString().split('T')[0];

  const dueRules = await db.getAllAsync<RecurringRule>(
    'SELECT * FROM recurring_rules WHERE is_active = 1 AND auto_create = 1 AND next_due_date <= ?',
    [todayStr]
  );

  let processedCount = 0;

  for (const rule of dueRules) {
    // Check if end_date has passed
    if (rule.end_date && rule.end_date < todayStr) {
      await db.runAsync('UPDATE recurring_rules SET is_active = 0 WHERE id = ?', [rule.id]);
      continue;
    }

    let deductions: Array<{ name: string; amount: number; cutoff?: string }> | undefined = undefined;
    if (rule.deductions_json) {
      try {
        deductions = JSON.parse(rule.deductions_json);
      } catch (e) {
        // ignore parse errors
      }
    }

    // For semi_monthly, check if this is the 1st cutoff or 2nd cutoff
    let activeDeductions = deductions;
    let cutoffPrefix = '';
    if (rule.frequency === 'semi_monthly') {
      const dueDay = parseInt(rule.next_due_date.split('-')[2], 10);
      const day1 = rule.payout_day_1 ?? 15;
      const day2 = rule.payout_day_2 ?? 30;
      const isFirstCutoff = dueDay <= Math.floor((day1 + day2) / 2);
      cutoffPrefix = isFirstCutoff ? '[1st Cutoff] ' : '[2nd Cutoff] ';

      if (deductions && deductions.length > 0) {
        activeDeductions = deductions.filter((d) => {
          if (!d.cutoff || d.cutoff === 'both') return true;
          return isFirstCutoff ? d.cutoff === 'first' : d.cutoff === 'second';
        });
      }
    }

    const cutoffDeductionsTotal = (activeDeductions || []).reduce((sum, d) => sum + d.amount, 0);
    const transactionAmount = rule.gross_amount
      ? Math.max(0, rule.gross_amount - cutoffDeductionsTotal)
      : rule.amount;

    // Create recurring transaction
    await createTransaction({
      type: rule.type,
      account_id: rule.account_id,
      to_account_id: rule.to_account_id,
      category_id: rule.category_id,
      amount: transactionAmount,
      date: rule.next_due_date,
      notes: `[Auto-recurring] ${cutoffPrefix}${rule.notes || ''}`.trim(),
      gross_amount: rule.gross_amount ?? null,
      deductions: activeDeductions,
      is_recurring: 1,
      recurring_rule_id: rule.id,
    });

    const nextDue = computeNextDueDate(
      rule.next_due_date,
      rule.frequency,
      rule.payout_day_1,
      rule.payout_day_2
    );
    await db.runAsync('UPDATE recurring_rules SET next_due_date = ? WHERE id = ?', [nextDue, rule.id]);
    processedCount++;
  }

  return processedCount;
}
