import 'server-only';

import { getSupabaseAdmin } from '@/lib/supabase/admin';
import type { ProductDetail, ProductImage } from '@/types/products';

/**
 * 상품 상세 조회 — 서버 전용 DAL
 * Server Component, generateMetadata 에서만 사용
 */
export async function getProductById(id: string): Promise<ProductDetail | null> {
  const supabaseAdmin = getSupabaseAdmin()
  const { data: product, error } = await supabaseAdmin
    .from('products')
    .select('*')
    .eq('id', id)
    .single();

  if (error || !product) return null;

  const { data: category } = product.category_id
    ? await supabaseAdmin
        .from('categories')
        .select('id, name')
        .eq('id', product.category_id)
        .maybeSingle()
    : { data: null };

  const [{ data: stock }, { data: images }] = await Promise.all([
    supabaseAdmin
      .from('stocks')
      .select('product_id, total, sold')
      .eq('product_id', id)
      .single(),
    supabaseAdmin
      .from('product_images')
      .select('*')
      .eq('product_id', id)
      .order('order', { ascending: true }),
  ]);

  const stockData = stock
    ? { total: stock.total, sold: stock.sold, available: stock.total - stock.sold }
    : { total: 0, sold: 0, available: 0 };

  const mappedImages: ProductImage[] = (images ?? []).map(img => ({
    id:        img.id,
    type:      img.type as ProductImage['type'],
    url:       img.url,
    fileName:  img.url.split('/').pop() ?? '',
    fileSize:  Math.round((img.size_mb ?? 0) * 1024 * 1024),
    order:     img.order,
    createdAt: '',
  }));

  return {
    id:               product.id,
    productCode:      product.product_code,
    name:             product.name,
    categoryId:       product.category_id ?? null,
    category:         category?.name ?? '',
    price:            product.price,
    summary:          product.summary,
    shortDescription: product.short_description ?? '',
    description:      product.description,
    status:           product.status as ProductDetail['status'],
    stock:            stockData,
    images:           mappedImages,
    createdAt:        product.created_at ?? '',
    updatedAt:        product.updated_at ?? '',
    createdBy:        '-',
  };
}
