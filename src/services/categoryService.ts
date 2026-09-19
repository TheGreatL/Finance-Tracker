import { getDatabase } from '../database/db';
import { Category, CategoryType } from '../types/database';

export async function getAllCategories(type?: CategoryType, includeArchived = false): Promise<Category[]> {
  const db = await getDatabase();
  let query = 'SELECT * FROM categories WHERE 1=1';
  const params: (string | number)[] = [];

  if (type) {
    query += ' AND type = ?';
    params.push(type);
  }

  if (!includeArchived) {
    query += ' AND is_archived = 0';
  }

  query += ' ORDER BY is_default DESC, name ASC';
  return await db.getAllAsync<Category>(query, params);
}

export async function getCategoryById(id: string): Promise<Category | null> {
  const db = await getDatabase();
  return await db.getFirstAsync<Category>('SELECT * FROM categories WHERE id = ?', [id]);
}

export async function createCategory(cat: Omit<Category, 'created_at'>): Promise<Category> {
  const db = await getDatabase();
  const now = new Date().toISOString();
  const newCat: Category = {
    ...cat,
    created_at: now,
  };

  await db.runAsync(
    `INSERT INTO categories (id, name, type, icon, color, is_default, is_archived, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [newCat.id, newCat.name, newCat.type, newCat.icon, newCat.color, newCat.is_default, newCat.is_archived, newCat.created_at]
  );

  return newCat;
}

export async function updateCategory(cat: Partial<Category> & { id: string }): Promise<void> {
  const db = await getDatabase();
  const existing = await getCategoryById(cat.id);
  if (!existing) throw new Error('Category not found');

  await db.runAsync(
    `UPDATE categories
     SET name = ?, type = ?, icon = ?, color = ?, is_archived = ?
     WHERE id = ?`,
    [
      cat.name ?? existing.name,
      cat.type ?? existing.type,
      cat.icon ?? existing.icon,
      cat.color ?? existing.color,
      cat.is_archived ?? existing.is_archived,
      cat.id,
    ]
  );
}

export async function deleteCategory(id: string): Promise<void> {
  const db = await getDatabase();
  const txCount = await db.getFirstAsync<{ count: number }>(
    'SELECT COUNT(*) as count FROM transactions WHERE category_id = ?',
    [id]
  );

  if (txCount && txCount.count > 0) {
    await db.runAsync('UPDATE categories SET is_archived = 1 WHERE id = ?', [id]);
  } else {
    await db.runAsync('DELETE FROM categories WHERE id = ?', [id]);
  }
}

