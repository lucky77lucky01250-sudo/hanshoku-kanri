'use client'

import { useState } from 'react'
import Link from 'next/link'
import { ChevronRight } from 'lucide-react'
import type { Database, CowStatus } from '@/types/database'
import { STATUS_CONFIG, getUrgencyLabel } from '@/lib/status'

type Cow = Database['public']['Tables']['cows']['Row']

type SortKey = 'next_action' | 'ear_tag' | 'created'

export default function CowList({ initialCows }: { initialCows: Cow[] }) {
  const [filter, setFilter] = useState<'all' | 'action'>('all')
  const [search, setSearch] = useState('')
  const [sortKey, setSortKey] = useState<SortKey>('next_action')

  const query = search.trim().toLowerCase()
  const filtered = initialCows
    .filter(c => filter === 'action' ? c.current_status !== 'idle' : true)
    .filter(c => {
      if (!query) return true
      return (
        c.ear_tag.toLowerCase().includes(query) ||
        (c.father_name?.toLowerCase().includes(query) ?? false) ||
        (c.mother_name?.toLowerCase().includes(query) ?? false)
      )
    })
    .sort((a, b) => {
      if (sortKey === 'ear_tag') return a.ear_tag.localeCompare(b.ear_tag, 'ja', { numeric: true })
      if (sortKey === 'created') return (b.created_at ?? '').localeCompare(a.created_at ?? '')
      // next_action: 予定日が近い順。予定日なし（idle）は末尾。
      const ad = a.next_action_date
      const bd = b.next_action_date
      if (!ad && !bd) return 0
      if (!ad) return 1
      if (!bd) return -1
      return ad.localeCompare(bd)
    })

  return (
    <div className="px-4 pt-4">
      {/* 検索 */}
      <div className="mb-3">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="🔍 耳標番号・父牛・母牛で検索"
          className="w-full h-12 px-4 text-base border-2 border-gray-200 rounded-xl focus:outline-none focus:border-[#1b4332]"
        />
      </div>

      {/* 並び替え */}
      <div className="flex items-center gap-2 mb-4">
        <span className="text-sm text-gray-500 flex-shrink-0">並び替え</span>
        <select
          value={sortKey}
          onChange={(e) => setSortKey(e.target.value as SortKey)}
          className="flex-1 h-11 px-3 text-base border-2 border-gray-200 rounded-xl bg-white focus:outline-none focus:border-[#1b4332]"
        >
          <option value="next_action">予定日が近い順</option>
          <option value="ear_tag">耳標番号順</option>
          <option value="created">登録が新しい順</option>
        </select>
      </div>

      {/* フィルタータブ */}
      <div className="flex gap-2 mb-4">
        <button
          onClick={() => setFilter('all')}
          className={`flex-1 h-12 rounded-xl font-medium text-base border-2 transition-colors ${
            filter === 'all'
              ? 'bg-[#1b4332] text-white border-[#1b4332]'
              : 'bg-gray-100 text-gray-500 border-gray-200'
          }`}
        >
          全頭 ({initialCows.length})
        </button>
        <button
          onClick={() => setFilter('action')}
          className={`flex-1 h-12 rounded-xl font-medium text-base border-2 transition-colors ${
            filter === 'action'
              ? 'bg-[#1b4332] text-white border-[#1b4332]'
              : 'bg-gray-100 text-gray-500 border-gray-200'
          }`}
        >
          要対応 ({initialCows.filter(c => c.current_status !== 'idle').length})
        </button>
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <div className="text-5xl mb-4">🐂</div>
          <p className="text-lg">
            {query
              ? '該当する牛が見つかりません'
              : filter === 'action' ? '対応が必要な牛はいません' : '牛が登録されていません'}
          </p>
          {filter === 'all' && !query && (
            <p className="text-base mt-2">下の＋ボタンから登録してください</p>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(cow => <CowCard key={cow.id} cow={cow} />)}
        </div>
      )}
    </div>
  )
}

function CowCard({ cow }: { cow: Cow }) {
  const status = STATUS_CONFIG[cow.current_status as CowStatus]
  const urgency = getUrgencyLabel(cow.next_action_date)

  return (
    <Link href={`/cows/${cow.id}`}>
      <div className={`bg-white rounded-2xl border-2 ${status.borderColor} p-4 shadow-sm active:opacity-70 transition-opacity`}>
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1">
            <p className="text-xl font-bold text-gray-900">{cow.ear_tag}</p>
            {cow.birth_date && (
              <p className="text-sm text-gray-600 mt-0.5">
                生年月日: {new Date(cow.birth_date).toLocaleDateString('ja-JP')}
              </p>
            )}
            {(cow.father_name || cow.mother_name) && (
              <p className="text-sm text-gray-600 mt-0.5">
                {cow.father_name && <span>父: {cow.father_name}</span>}
                {cow.father_name && cow.mother_name && <span className="mx-1.5 text-gray-300">/</span>}
                {cow.mother_name && <span>母: {cow.mother_name}</span>}
              </p>
            )}
          </div>
          <div className="flex items-center gap-2">
            <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full ${status.bgColor}`}>
              <span role="img" aria-label={status.label}>{status.icon}</span>
              <span className={`text-base font-bold ${status.color}`}>{status.label}</span>
            </div>
            <ChevronRight size={20} className="text-gray-400 flex-shrink-0" />
          </div>
        </div>

        {cow.next_action_date && urgency && (
          <div className={`mt-3 flex items-center gap-2 text-sm ${urgency.urgent ? 'text-red-600 font-bold' : 'text-gray-600'}`}>
            <span>📅</span>
            <span>次回予定: {new Date(cow.next_action_date).toLocaleDateString('ja-JP')}</span>
            <span className={`ml-auto px-2 py-0.5 rounded-full text-xs font-bold ${urgency.urgent ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-600'}`}>
              {urgency.label}
            </span>
          </div>
        )}
      </div>
    </Link>
  )
}
