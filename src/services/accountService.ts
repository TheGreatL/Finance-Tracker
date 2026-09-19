import { getDatabase } from '../database/db';
import { Account, AccountType } from '../types/database';

export async function getAllAccounts(includeArchived = false): Promise<Account[]> {
  const db = await getDatabase();
  const query = includeArchived
    ? 'SELECT * FROM accounts ORDER BY is_archived ASC, name ASC'
    : 'SELECT * FROM accounts WHERE is_archived = 0 ORDER BY name ASC';
  return await db.getAllAsync<Account>(query);
}

export async function getAccountById(id: string): Promise<Account | null> {
  const db = await getDatabase();
  return await db.getFirstAsync<Account>('SELECT * FROM accounts WHERE id = ?', [id]);
}

export async function createAccount(account: Omit<Account, 'created_at' | 'updated_at'>): Promise<Account> {
  const db = await getDatabase();
  const now = new Date().toISOString();
  const newAccount: Account = {
    ...account,
    created_at: now,
    updated_at: now,
  };

  await db.runAsync(
    `INSERT INTO accounts (id, name, type, currency, opening_balance, current_balance, credit_limit, statement_day, due_day, color, icon, is_archived, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      newAccount.id,
      newAccount.name,
      newAccount.type,
      newAccount.currency,
      newAccount.opening_balance,
      newAccount.current_balance,
      newAccount.credit_limit ?? 0,
      newAccount.statement_day ?? null,
      newAccount.due_day ?? null,
      newAccount.color,
      newAccount.icon,
      newAccount.is_archived,
      newAccount.created_at,
      newAccount.updated_at,
    ]
  );

  return newAccount;
}

export async function updateAccount(account: Partial<Account> & { id: string }): Promise<void> {
  const db = await getDatabase();
  const now = new Date().toISOString();
  const existing = await getAccountById(account.id);
  if (!existing) throw new Error('Account not found');

  await db.runAsync(
    `UPDATE accounts
     SET name = ?, type = ?, currency = ?, credit_limit = ?, statement_day = ?, due_day = ?, color = ?, icon = ?, is_archived = ?, updated_at = ?
     WHERE id = ?`,
    [
      account.name ?? existing.name,
      account.type ?? existing.type,
      account.currency ?? existing.currency,
      account.credit_limit ?? existing.credit_limit ?? 0,
      account.statement_day ?? existing.statement_day ?? null,
      account.due_day ?? existing.due_day ?? null,
      account.color ?? existing.color,
      account.icon ?? existing.icon,
      account.is_archived ?? existing.is_archived,
      now,
      account.id,
    ]
  );
}

export async function deleteAccount(id: string): Promise<void> {
  const db = await getDatabase();
  // Check if account has transactions
  const txCount = await db.getFirstAsync<{ count: number }>(
    'SELECT COUNT(*) as count FROM transactions WHERE account_id = ? OR to_account_id = ?',
    [id, id]
  );

  if (txCount && txCount.count > 0) {
    // If it has transactions, archive it to preserve ledger integrity
    await db.runAsync('UPDATE accounts SET is_archived = 1, updated_at = ? WHERE id = ?', [new Date().toISOString(), id]);
  } else {
    await db.runAsync('DELETE FROM accounts WHERE id = ?', [id]);
  }
}
