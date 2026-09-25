export type TrendingItem = {
  id: number
  keyword: string
  source: string
  fetched_at: string
  is_bookmarked: boolean
  metadata: Record<string, any>
}