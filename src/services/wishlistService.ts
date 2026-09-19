import { getDatabase } from '../database/db';
import { WishlistItem, WishlistStatus } from '../types/database';
import { getDashboardSummary } from './ledgerService';

export async function getAllWishlistItems(status?: WishlistStatus): Promise<WishlistItem[]> {
  const db = await getDatabase();
  const query = status
    ? 'SELECT * FROM wishlist_items WHERE status = ? ORDER BY priority DESC, estimated_cost ASC'
    : 'SELECT * FROM wishlist_items ORDER BY (status = "wishing") DESC, priority DESC, estimated_cost ASC';
  const params = status ? [status] : [];
  return await db.getAllAsync<WishlistItem>(query, params);
}

export async function getWishlistItemById(id: string): Promise<WishlistItem | null> {
  const db = await getDatabase();
  return await db.getFirstAsync<WishlistItem>('SELECT * FROM wishlist_items WHERE id = ?', [id]);
}

export async function createWishlistItem(item: Omit<WishlistItem, 'created_at'>): Promise<WishlistItem> {
  const db = await getDatabase();
  const now = new Date().toISOString();
  const newItem: WishlistItem = {
    ...item,
    created_at: now,
  };

  await db.runAsync(
    `INSERT INTO wishlist_items (id, title, estimated_cost, priority, target_date, notes, url, category_id, status, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      newItem.id,
      newItem.title,
      newItem.estimated_cost,
      newItem.priority,
      newItem.target_date ?? null,
      newItem.notes ?? '',
      newItem.url ?? '',
      newItem.category_id ?? null,
      newItem.status,
      newItem.created_at,
    ]
  );

  return newItem;
}

export async function updateWishlistItem(item: Partial<WishlistItem> & { id: string }): Promise<void> {
  const db = await getDatabase();
  const existing = await getWishlistItemById(item.id);
  if (!existing) throw new Error('Wishlist item not found');

  await db.runAsync(
    `UPDATE wishlist_items
     SET title = ?, estimated_cost = ?, priority = ?, target_date = ?, notes = ?, url = ?, category_id = ?, status = ?
     WHERE id = ?`,
    [
      item.title ?? existing.title,
      item.estimated_cost ?? existing.estimated_cost,
      item.priority ?? existing.priority,
      item.target_date ?? existing.target_date ?? null,
      item.notes ?? existing.notes ?? '',
      item.url ?? existing.url ?? '',
      item.category_id ?? existing.category_id ?? null,
      item.status ?? existing.status,
      item.id,
    ]
  );
}

export async function deleteWishlistItem(id: string): Promise<void> {
  const db = await getDatabase();
  await db.runAsync('DELETE FROM wishlist_items WHERE id = ?', [id]);
}

export interface AffordabilityAssessment {
  status: 'affordable' | 'stretch' | 'tight';
  safeToSpend: number;
  percentageOfSafeCash: number;
  advice: string;
}

export async function evaluateWishlistAffordability(cost: number): Promise<AffordabilityAssessment> {
  const summary = await getDashboardSummary();
  const safeToSpend = summary.safeToSpend;

  if (safeToSpend <= 0) {
    return {
      status: 'tight',
      safeToSpend: 0,
      percentageOfSafeCash: 100,
      advice: 'Your safe-to-spend cash is depleted or reserved for bills. Avoid buying this right now.',
    };
  }

  const ratio = (cost / safeToSpend) * 100;

  if (ratio <= 40) {
    return {
      status: 'affordable',
      safeToSpend,
      percentageOfSafeCash: Math.round(ratio),
      advice: 'Comfortably affordable! Takes under 40% of your remaining discretionary cash.',
    };
  } else if (ratio <= 85) {
    return {
      status: 'stretch',
      safeToSpend,
      percentageOfSafeCash: Math.round(ratio),
      advice: 'Stretch purchase: within your safe balance, but leaves little margin for surprises.',
    };
  } else {
    return {
      status: 'tight',
      safeToSpend,
      percentageOfSafeCash: Math.round(ratio),
      advice: 'Tight or exceeds safe-to-spend: buying now may interfere with upcoming bills or loan repayments.',
    };
  }
}
