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
      is_active, notes, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
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
         auto_create = ?, is_active = ?, notes = ?
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
      rule.id,
    ]
  );
}

export async function deleteRecurringRule(id: string): Promise<void> {
  const db = await getDatabase();
  await db.runAsync('DELETE FROM recurring_rules WHERE id = ?', [id]);
}

export function computeNextDueDate(currentDateStr: string, frequency: FrequencyType): string {
  const date = new Date(currentDateStr);
  switch (frequency) {
    case 'daily':
      date.setDate(date.getDate() + 1);
      break;
    case 'weekly':
      date.setDate(date.getDate() + 7);
      break;
    case 'biweekly':
      date.setDate(date.getDate() + 14);
      break;
    case 'monthly':
      date.setMonth(date.getMonth() + 1);
      break;
    case 'yearly':
      date.setFullYear(date.getFullYear() + 1);
      break;
  }
  return date.toISOString().split('T')[0];
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

    // Create recurring transaction
    await createTransaction({
      type: rule.type,
      account_id: rule.account_id,
      to_account_id: rule.to_account_id,
      category_id: rule.category_id,
      amount: rule.amount,
      date: rule.next_due_date,
      notes: `[Auto-recurring] ${rule.notes || ''}`.trim(),
      is_recurring: 1,
      recurring_rule_id: rule.id,
    });

    const nextDue = computeNextDueDate(rule.next_due_date, rule.frequency);
    await db.runAsync('UPDATE recurring_rules SET next_due_date = ? WHERE id = ?', [nextDue, rule.id]);
    processedCount++;
  }

  return processedCount;
}
