import 'server-only';

import { getSupabaseAdmin } from '@/lib/supabase/admin';
import type { ProductCategoryOption } from '@/types/products';

/**
 * Fetches active product categories and returns them as simple `{ id, name }` options.
 *
 * Queries the `categories` table for rows where `is_active` is true, selecting `id` and `name` and ordering results by `sort_order` ascending then `name` ascending. If the query fails or yields no data, an empty array is returned.
 *
 * @returns An array of category option objects, each containing `id` and `name`.
 */
export async function getProductCategoryOptions(): Promise<ProductCategoryOption[]> {
  const supabaseAdmin = getSupabaseAdmin();
  const { data, error } = await supabaseAdmin
    .from('categories')
    .select('id, name')
    .eq('is_active', true)
    .order('sort_order', { ascending: true })
    .order('name', { ascending: true });

  if (error || !data) {
    return [];
  }

  return data.map((category) => ({
    id: category.id,
    name: category.name,
  }));
}
