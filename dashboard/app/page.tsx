import { supabase } from '@/lib/supabase'
import Dashboard from './Dashboard'
import type { TrendingItem } from '@/lib/types'

export default async function Home() {
  const { data } = await supabase
    .from('trending_items')
    .select('*')
    .order('fetched_at', { ascending: false })
    .limit(50)

  return <Dashboard initialItems={(data ?? []) as TrendingItem[]} />
}