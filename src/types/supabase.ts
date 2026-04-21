export type Database = {
  public: {
    Tables: {
      products: { Row: Record<string, unknown> }
      stocks: { Row: Record<string, unknown> }
      product_images: { Row: Record<string, unknown> }
      orders: { Row: Record<string, unknown> }
      order_items: { Row: Record<string, unknown> }
      stock_histories: { Row: Record<string, unknown> }
      profiles: { Row: Record<string, unknown> }
    }
    Views: Record<string, unknown>
    Functions: Record<string, unknown>
  }
}