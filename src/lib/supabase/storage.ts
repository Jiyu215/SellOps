import { createClient } from '@/lib/supabase/client'

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

export async function deleteProductImage(url: string) {
  const supabase = createClient()
  // URL에서 path 추출
  const path = url.split('/product-images/')[1]
  const { error } = await supabase.storage
    .from('product-images')
    .remove([path])
  if (error) throw error
}