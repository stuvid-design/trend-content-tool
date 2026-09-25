'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import type { TrendingItem } from '@/lib/types'

type SourceFilter = 'all' | 'google_trends' | 'youtube'

export default function Dashboard({ initialItems }: { initialItems: TrendingItem[] }) {
  const [items, setItems] = useState<TrendingItem[]>(initialItems)
  const [source, setSource] = useState<SourceFilter>('all')
  const [date, setDate] = useState<string>('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    async function fetchFiltered() {
      setLoading(true)
      let query = supabase
        .from('trending_items')
        .select('*')
        .order('fetched_at', { ascending: false })
        .limit(50)

      if (source !== 'all') {
        query = query.eq('source', source)
      }
      if (date) {
        const start = `${date}T00:00:00`
        const end = `${date}T23:59:59`
        query = query.gte('fetched_at', start).lte('fetched_at', end)
      }

      const { data, error } = await query
      if (!error && data) {
        setItems(data as TrendingItem[])
      }
      setLoading(false)
    }

    fetchFiltered()
  }, [source, date])

  async function handleToggleBookmark(id: number) {
    // Update tampilan dulu (optimistic), baru panggil server
    setItems((prev) =>
      prev.map((item) =>
        item.id === id ? { ...item, is_bookmarked: !item.is_bookmarked } : item
      )
    )

    const { error } = await supabase.rpc('toggle_bookmark', { item_id: id })

    if (error) {
      // Kalau gagal, kembalikan tampilan seperti semula
      setItems((prev) =>
        prev.map((item) =>
          item.id === id ? { ...item, is_bookmarked: !item.is_bookmarked } : item
        )
      )
      console.error('Gagal toggle bookmark:', error)
    }
  }

  const trends = items.filter((i) => i.source === 'google_trends').slice(0, 10)
  const videos = items.filter((i) => i.source === 'youtube').slice(0, 10)

  return (
    <div className="max-w-[1100px] mx-auto px-5 py-8 pb-16">
      <header className="flex justify-between items-baseline flex-wrap gap-2 mb-7">
        <h1 className="text-xl font-semibold tracking-tight">Trend Content Research</h1>
        <div className="text-[var(--text-dim)] text-sm">Region: Indonesia</div>
      </header>

      {/* Filter bar */}
      <div className="flex gap-2.5 flex-wrap items-center bg-[var(--card)] border border-[var(--border)] rounded-lg px-4 py-3 mb-8">
        <label className="text-xs text-[var(--text-dim)]">Sumber</label>
        <select
          value={source}
          onChange={(e) => setSource(e.target.value as SourceFilter)}
          className="bg-[var(--bg)] text-[var(--text)] border border-[var(--border)] rounded-md px-2.5 py-1.5 text-sm"
        >
          <option value="all">Semua sumber</option>
          <option value="google_trends">Google Trends</option>
          <option value="youtube">YouTube</option>
        </select>

        <label className="text-xs text-[var(--text-dim)] ml-2">Tanggal</label>
        <input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className="bg-[var(--bg)] text-[var(--text)] border border-[var(--border)] rounded-md px-2.5 py-1.5 text-sm"
        />
        {date && (
          <button
            onClick={() => setDate('')}
            className="text-xs text-[var(--accent)] ml-1"
          >
            reset tanggal
          </button>
        )}

        {loading && <span className="text-xs text-[var(--text-dim)] ml-2">Memuat...</span>}
      </div>

      {/* Google Trends */}
      {(source === 'all' || source === 'google_trends') && (
        <section className="mb-10">
          <div className="flex justify-between items-baseline mb-3.5">
            <h2 className="text-base font-semibold">Google Trends — kata kunci naik</h2>
            <span className="text-[var(--text-dim)] text-sm">{trends.length} item</span>
          </div>
          <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl overflow-hidden">
            {trends.map((item, idx) => (
              <div
                key={item.id}
                className="flex items-center gap-3.5 px-4 py-3 border-b border-[var(--border)] last:border-b-0 hover:bg-[var(--card-hover)] transition-colors"
              >
                <span className="text-sm text-[var(--text-dim)] w-5 shrink-0">{idx + 1}</span>
                <div className="flex-1">
                  <div className="text-[0.92rem]">{item.keyword}</div>
                  <div className="text-xs text-[var(--text-dim)] mt-0.5">
                    {item.metadata?.approx_traffic ? `${item.metadata.approx_traffic} pencarian · ` : ''}
                    {new Date(item.fetched_at).toLocaleString('id-ID')}
                  </div>
                </div>
                <button
                  onClick={() => handleToggleBookmark(item.id)}
                  className={`text-base px-1 ${item.is_bookmarked ? 'text-[var(--accent)]' : 'text-[var(--text-dim)]'}`}
                >
                  {item.is_bookmarked ? '★' : '☆'}
                </button>
              </div>
            ))}
            {trends.length === 0 && (
              <div className="px-4 py-6 text-center text-[var(--text-dim)] text-sm">Belum ada data.</div>
            )}
          </div>
        </section>
      )}

      {/* YouTube */}
      {(source === 'all' || source === 'youtube') && (
        <section>
          <div className="flex justify-between items-baseline mb-3.5">
            <h2 className="text-base font-semibold">YouTube — video populer di Indonesia</h2>
            <span className="text-[var(--text-dim)] text-sm">{videos.length} item</span>
          </div>
          <div className="grid grid-cols-[repeat(auto-fill,minmax(220px,1fr))] gap-3.5">
            {videos.map((item) => (
              <div
                key={item.id}
                className="bg-[var(--card)] border border-[var(--border)] rounded-xl overflow-hidden hover:bg-[var(--card-hover)] transition-colors"
              >
                <div className="aspect-video bg-gradient-to-br from-[var(--card-hover)] to-[var(--border)] flex items-center justify-center text-[var(--text-dim)] text-xs">
                  thumbnail
                </div>
                <div className="p-3.5">
                  <div className="text-sm mb-1.5 line-clamp-2">{item.keyword}</div>
                  <div className="flex justify-between items-center text-xs text-[var(--text-dim)]">
                    <span className="text-[var(--accent)]">
                      {item.metadata?.view_count
                        ? `${Number(item.metadata.view_count).toLocaleString('id-ID')} views`
                        : '-'}
                    </span>
                    <button
                      onClick={() => handleToggleBookmark(item.id)}
                      className={item.is_bookmarked ? 'text-[var(--accent)]' : 'text-[var(--text-dim)]'}
                    >
                      {item.is_bookmarked ? '★' : '☆'}
                    </button>
                  </div>
                </div>
              </div>
            ))}
            {videos.length === 0 && (
              <div className="px-4 py-6 text-center text-[var(--text-dim)] text-sm col-span-full">
                Belum ada data.
              </div>
            )}
          </div>
        </section>
      )}
    </div>
  )
}