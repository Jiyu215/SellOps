import 'server-only';

import { getSupabaseAdmin } from '@/lib/supabase/admin';
import type { ProductCategoryOption } from '@/types/products';

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
