import { getDatabase } from '../database/db';
import { SavingsGoal, GoalStatus } from '../types/database';
import { createTransaction } from './ledgerService';

export async function getAllSavingsGoals(status?: GoalStatus): Promise<SavingsGoal[]> {
  const db = await getDatabase();
  const query = status
    ? 'SELECT * FROM savings_goals WHERE status = ? ORDER BY created_at DESC'
    : 'SELECT * FROM savings_goals ORDER BY (status = "active") DESC, created_at DESC';
  const params = status ? [status] : [];
  return await db.getAllAsync<SavingsGoal>(query, params);
}

export async function getSavingsGoalById(id: string): Promise<SavingsGoal | null> {
  const db = await getDatabase();
  return await db.getFirstAsync<SavingsGoal>('SELECT * FROM savings_goals WHERE id = ?', [id]);
}

export async function createSavingsGoal(goal: Omit<SavingsGoal, 'created_at'>): Promise<SavingsGoal> {
  const db = await getDatabase();
  const now = new Date().toISOString();
  const newGoal: SavingsGoal = {
    ...goal,
    created_at: now,
  };

  await db.runAsync(
    `INSERT INTO savings_goals (id, name, target_amount, current_amount, target_date, account_id, color, icon, status, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      newGoal.id,
      newGoal.name,
      newGoal.target_amount,
      newGoal.current_amount,
      newGoal.target_date ?? null,
      newGoal.account_id ?? null,
      newGoal.color,
      newGoal.icon,
      newGoal.status,
      newGoal.created_at,
    ]
  );

  return newGoal;
}

export async function updateSavingsGoal(goal: Partial<SavingsGoal> & { id: string }): Promise<void> {
  const db = await getDatabase();
  const existing = await getSavingsGoalById(goal.id);
  if (!existing) throw new Error('Savings goal not found');

  const targetAmount = goal.target_amount ?? existing.target_amount;
  const currentAmount = goal.current_amount ?? existing.current_amount;
  let status = goal.status ?? existing.status;
  if (currentAmount >= targetAmount && status === 'active') {
    status = 'reached';
  }

  await db.runAsync(
    `UPDATE savings_goals
     SET name = ?, target_amount = ?, current_amount = ?, target_date = ?, account_id = ?, color = ?, icon = ?, status = ?
     WHERE id = ?`,
    [
      goal.name ?? existing.name,
      targetAmount,
      currentAmount,
      goal.target_date ?? existing.target_date ?? null,
      goal.account_id ?? existing.account_id ?? null,
      goal.color ?? existing.color,
      goal.icon ?? existing.icon,
      status,
      goal.id,
    ]
  );
}

export async function contributeToGoal(
  goalId: string,
  amount: number,
  sourceAccountId: string,
  notes?: string
): Promise<void> {
  const goal = await getSavingsGoalById(goalId);
  if (!goal) throw new Error('Goal not found');

  // Record transfer or expense linked to this goal
  await createTransaction({
    type: 'expense',
    account_id: sourceAccountId,
    amount,
    date: new Date().toISOString().split('T')[0],
    notes: notes || `Contribution to savings goal: ${goal.name}`,
    expense_nature: 'investment',
    linked_goal_id: goalId,
  });

  // Check if reached
  const updated = await getSavingsGoalById(goalId);
  if (updated && updated.current_amount >= updated.target_amount && updated.status === 'active') {
    await updateSavingsGoal({ id: goalId, status: 'reached' });
  }
}

export async function deleteSavingsGoal(id: string): Promise<void> {
  const db = await getDatabase();
  await db.runAsync('DELETE FROM savings_goals WHERE id = ?', [id]);
}
