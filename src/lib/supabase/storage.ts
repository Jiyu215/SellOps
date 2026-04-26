import { createClient } from '@/lib/supabase/client'

/**
 * Uploads a product image to the Supabase `product-images` bucket and returns its public URL.
 *
 * @param file - The file to upload
 * @param productId - The product identifier used as the object path prefix
 * @param type - A short label included in the filename (for example `thumbnail` or `main`)
 * @returns The public URL of the uploaded image
 * @throws The storage upload error if the upload fails
 */
export async function uploadProductImage(
  file: File,
  productId: string,
  type: string
) {
  const supabase = createClient()
  const ext = file.name.split('.').pop()
  const path = `${productId}/${type}_${Date.now()}.${ext}`

  const { data, error } = await supabase.storage
    .from('product-images')
    .upload(path, file, { upsert: false })

  if (error) throw error

  const { data: { publicUrl } } = supabase.storage
    .from('product-images')
    .getPublicUrl(data.path)

  return publicUrl
}

/**
 * Deletes a product image from the Supabase `product-images` bucket corresponding to the given public URL.
 *
 * @param url - Public URL of the product image; the storage object path is derived from this URL.
 * @throws The error returned by the storage removal operation if deletion fails.
 */
export async function deleteProductImage(url: string) {
  const supabase = createClient()
  // URL에서 path 추출
  const path = url.split('/product-images/')[1]
  const { error } = await supabase.storage
    .from('product-images')
    .remove([path])
  if (error) throw error
}