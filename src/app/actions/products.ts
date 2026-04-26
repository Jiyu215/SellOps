'use server';

import { revalidatePath } from 'next/cache';
import { getSupabaseAdmin } from '@/lib/supabase/admin';
import type { ProductFormData, ProductDetail, ProductStatus } from '@/types/products';

// ── 상품 저장 서버 액션 ───────────────────────────────────────────────────────

/**
 * Create a new product or update an existing product in Supabase; when creating, initialize stock and record initial inbound history.
 *
 * @param data - Product form values to persist
 * @param id - If provided, updates the existing product with this ID; if omitted, creates a new product
 * @param initialStock - Initial stock totals used only on creation; when provided, sets stock and records an inbound history entry
 * @returns An object containing the saved product `id`; when a new product is created, includes a `product` field with the created ProductDetail
 * @throws Error when product creation or update fails
 */
export async function saveProductAction(
  data: ProductFormData,
  id?: string,
  initialStock?: { total: number; sold: number; available: number },
): Promise<{ id: string; product?: ProductDetail }> {
  const supabaseAdmin = getSupabaseAdmin()
  const now = new Date().toISOString();
  const categoryId = data.categoryId?.trim() || null;

  const { data: category } = categoryId
    ? await supabaseAdmin
        .from('categories')
        .select('id, name')
        .eq('id', categoryId)
        .maybeSingle()
    : { data: null };

  if (id) {
    // ── 수정 ──────────────────────────────────────────────────────────────────
    const { error } = await supabaseAdmin
      .from('products')
      .update({
        name:              data.name,
        ...(typeof data.price === 'number' && { price: data.price }),
        product_code:      data.productCode,
        category_id:       categoryId,
        summary:           data.summary,
        short_description: data.shortDescription,
        description:       data.description,
        status:            data.status,
        updated_at:        now,
      })
      .eq('id', id);

    if (error) throw new Error('상품 수정에 실패했습니다.');

    revalidatePath(`/dashboard/products/${id}`);
    revalidatePath('/dashboard/products');
    return { id };
  }

  // ── 신규 생성 ──────────────────────────────────────────────────────────────
  const { data: newRow, error: createError } = await supabaseAdmin
    .from('products')
    .insert({
      name:              data.name,
      price:             typeof data.price === 'number' ? data.price : 0,
      product_code:      data.productCode,
      category_id:       categoryId,
      summary:           data.summary,
      short_description: data.shortDescription,
      description:       data.description,
      status:            data.status,
    })
    .select()
    .single();

  if (createError || !newRow) throw new Error('상품 등록에 실패했습니다.');

  // stocks 레코드 생성
  const stockTotal = initialStock?.total ?? 0;
  await supabaseAdmin
    .from('stocks')
    .upsert(
      { product_id: newRow.id, total: stockTotal, sold: 0 },
      { onConflict: 'product_id' },
    );

  // 초기 재고가 있으면 stock_histories에 입고 이력 기록
  if (stockTotal > 0) {
    await supabaseAdmin.from('stock_histories').insert({
      product_id: newRow.id,
      type:       'in',
      quantity:   stockTotal,
      reason:     '초기 입고',
    });
  }

  const newDetail: ProductDetail = {
    id:               newRow.id,
    productCode:      newRow.product_code,
    name:             newRow.name,
    categoryId:       newRow.category_id ?? categoryId,
    category:         category?.name ?? '',
    price:            newRow.price,
    summary:          newRow.summary,
    shortDescription: newRow.short_description ?? '',
    description:      newRow.description,
    status:           newRow.status as ProductStatus,
    stock:            initialStock ?? { total: 0, sold: 0, available: 0 },
    images:           [],
    createdAt:        newRow.created_at ?? now,
    updatedAt:        newRow.updated_at ?? now,
    createdBy:        '-',
  };

  revalidatePath('/dashboard/products');
  return { id: newRow.id, product: newDetail };
}
