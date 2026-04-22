'use server';

import { revalidatePath } from 'next/cache';
import { supabaseAdmin } from '@/lib/supabase/admin';
import type { ProductFormData, ProductDetail, ProductStatus } from '@/types/products';

// ── 상품 저장 서버 액션 ───────────────────────────────────────────────────────

/**
 * 상품 생성 또는 수정 서버 액션
 * 신규: Supabase admin 클라이언트로 직접 처리
 * 수정: Supabase admin 클라이언트로 직접 처리
 *
 * @param data         - 폼 데이터
 * @param id           - 수정 시 상품 ID (없으면 신규 생성)
 * @param initialStock - 신규 등록 시 초기 재고 (폼에서 미리 조정한 값)
 */
export async function saveProductAction(
  data: ProductFormData,
  id?: string,
  initialStock?: { total: number; sold: number; available: number },
): Promise<{ id: string; product?: ProductDetail }> {
  const now = new Date().toISOString();

  if (id) {
    // ── 수정 ──────────────────────────────────────────────────────────────────
    const { error } = await supabaseAdmin
      .from('products')
      .update({
        name:              data.name,
        ...(typeof data.price === 'number' && { price: data.price }),
        product_code:      data.productCode,
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
    category:         '',
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
