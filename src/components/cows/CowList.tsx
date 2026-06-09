'use client'

import { useState } from 'react'
import Link from 'next/link'
import { ChevronRight } from 'lucide-react'
import type { Database, CowStatus } from '@/types/database'
import { STATUS_CONFIG, getUrgencyLabel } from '@/lib/status'

type Cow = Database['public']['Tables']['cows']['Row']

export default function CowList({ initialCows }: { initialCows: Cow[] }) {
  const [filter, setFilter] = useState<'all' | 'action'>('all')

  const filtered = filter === 'action'
    ? initialCows.filter(c => c.current_status !== 'idle')
    : initialCows

  return (
    <div className="px-4 pt-4">
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
          <div className="text-5xl mb-4">🐄</div>
          <p className="text-lg">
            {filter === 'action' ? '対応が必要な牛はいません' : '牛が登録されていません'}
          </p>
          {filter === 'all' && (
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
