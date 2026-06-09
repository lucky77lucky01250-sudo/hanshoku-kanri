'use client'

import { useState } from 'react'
import Link from 'next/link'
import type { Database, CowStatus } from '@/types/database'
import { STATUS_CONFIG } from '@/lib/status'

type Cow = Database['public']['Tables']['cows']['Row']

const STEPS = [
  { key: 'estrus', label: '発情確認', icon: '🔴' },
  { key: 'insemination', label: '種付け', icon: '🟡' },
  { key: 'pregnancy_check', label: '妊娠鑑定', icon: '🟠' },
  { key: 'calving', label: '分娩', icon: '🟢' },
]

export default function CowDetail({ cow, cycles }: { cow: Cow; cycles: any[] }) {
  const [tab, setTab] = useState<'current' | 'history'>('current')
  const status = STATUS_CONFIG[cow.current_status as CowStatus]
  const currentCycle = cycles[0]
  const pastCycles = cycles.slice(1)

  const currentEvent = currentCycle?.breeding_events?.[0]
  const latestInsemination = currentCycle?.insemination_records?.sort(
    (a: any, b: any) => b.attempt_number - a.attempt_number
  )[0]

  const nextEstrusDate = latestInsemination && !currentEvent?.pregnancy_result
    ? addDays(latestInsemination.insemination_date, 21)
    : null

  return (
    <div className="px-4 py-4">
      {/* 母牛情報 */}
      <div className="bg-white rounded-2xl border-2 border-gray-100 p-4 mb-4 space-y-2">
        <h2 className="text-lg font-bold text-gray-700">母牛情報</h2>
        {cow.father_name && <InfoRow label="父牛名" value={cow.father_name} />}
        {cow.mother_name && <InfoRow label="母牛名" value={cow.mother_name} />}
        {!cow.father_name && !cow.mother_name && (
          <p className="text-gray-400 text-sm">血統情報なし</p>
        )}
      </div>

      {/* 現在のステータス */}
      <div className={`flex items-center gap-3 px-4 py-3 rounded-2xl mb-4 ${status.bgColor} border-2 ${status.borderColor}`}>
        <span className="text-2xl">{status.icon}</span>
        <div>
          <p className="font-bold text-lg">{status.label}</p>
          {cow.next_action_date && (
            <p className="text-sm text-gray-600">
              予定日: {new Date(cow.next_action_date).toLocaleDateString('ja-JP')}
            </p>
          )}
        </div>
      </div>

      {/* タブ */}
      <div className="flex gap-2 mb-4">
        {(['current', 'history'] as const).map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`flex-1 h-12 rounded-xl font-medium text-base border-2 transition-colors ${
              tab === t ? 'bg-[#1b4332] text-white border-[#1b4332]' : 'bg-white text-gray-600 border-gray-200'
            }`}
          >
            {t === 'current' ? '今回のサイクル' : '過去の記録'}
          </button>
        ))}
      </div>

      {tab === 'current' && (
        <div className="space-y-3">
          {nextEstrusDate && (
            <div className="bg-blue-50 border-2 border-blue-200 rounded-2xl p-4">
              <p className="text-blue-700 font-bold">
                🔄 次回発情予想日: {new Date(nextEstrusDate).toLocaleDateString('ja-JP')}
              </p>
              <p className="text-blue-500 text-sm">種付け日+21日（目安）</p>
            </div>
          )}

          {/* プログレスインジケーター */}
          <div className="bg-white rounded-2xl border-2 border-gray-100 p-4">
            <div className="flex items-center justify-between mb-4">
              {STEPS.map((step, i) => {
                const isActive = isStepActive(step.key, cow.current_status as CowStatus, currentEvent, latestInsemination)
                const isDone = isStepDone(step.key, currentEvent, latestInsemination)
                return (
                  <div key={step.key} className="flex items-center flex-1">
                    <div className={`flex flex-col items-center flex-1 ${i < STEPS.length - 1 ? 'relative' : ''}`}>
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center text-xl border-2 ${
                        isDone ? 'bg-[#1b4332] border-[#1b4332]' :
                        isActive ? 'bg-white border-[#1b4332] border-4' :
                        'bg-gray-100 border-gray-200'
                      }`}>
                        {isDone ? '✓' : step.icon}
                      </div>
                      <p className={`text-xs mt-1 text-center ${isActive ? 'font-bold text-[#1b4332]' : 'text-gray-500'}`}>
                        {step.label}
                      </p>
                    </div>
                    {i < STEPS.length - 1 && (
                      <div className={`h-0.5 flex-1 -mt-5 ${isDone ? 'bg-[#1b4332]' : 'bg-gray-200'}`} />
                    )}
                  </div>
                )
              })}
            </div>

            {/* 記録ボタン */}
            <Link
              href={`/cows/${cow.id}/record/${getNextStep(cow.current_status as CowStatus)}`}
              className="block w-full h-14 bg-[#f4a261] text-white text-xl font-bold rounded-xl text-center leading-[56px]"
            >
              ＋ 記録する
            </Link>
          </div>

          {/* 現在のサイクルの記録 */}
          {currentEvent && (
            <div className="bg-white rounded-2xl border-2 border-gray-100 p-4 space-y-2">
              <h3 className="font-bold text-gray-700">現在のサイクルの記録</h3>
              {currentEvent.estrus_date && <InfoRow label="発情確認日" value={formatDate(currentEvent.estrus_date)} />}
              {latestInsemination?.insemination_date && (
                <>
                  <InfoRow label="種付け日" value={formatDate(latestInsemination.insemination_date)} />
                  {latestInsemination.semen_name && <InfoRow label="使用精液" value={latestInsemination.semen_name} />}
                </>
              )}
              {currentEvent.pregnancy_check_date && (
                <>
                  <InfoRow label="妊娠鑑定日" value={formatDate(currentEvent.pregnancy_check_date)} />
                  <InfoRow label="鑑定結果" value={currentEvent.pregnancy_result === true ? '✅ 陽性' : currentEvent.pregnancy_result === false ? '❌ 陰性' : '未記録'} />
                </>
              )}
              {currentEvent.expected_calving_date && <InfoRow label="分娩予定日" value={formatDate(currentEvent.expected_calving_date)} />}
              {currentEvent.actual_calving_date && (
                <>
                  <InfoRow label="分娩日" value={formatDate(currentEvent.actual_calving_date)} />
                  {currentEvent.calf_gender && <InfoRow label="子牛性別" value={currentEvent.calf_gender === 'male' ? '♂ オス' : '♀ メス'} />}
                  {currentEvent.calf_weight && <InfoRow label="子牛体重" value={`${currentEvent.calf_weight} kg`} />}
                </>
              )}
            </div>
          )}
        </div>
      )}

      {tab === 'history' && (
        <div className="space-y-3">
          {pastCycles.length === 0 ? (
            <p className="text-gray-400 text-center py-8">過去の記録はありません</p>
          ) : (
            pastCycles.map((cycle: any) => (
              <div key={cycle.id} className="bg-white rounded-2xl border-2 border-gray-100 p-4">
                <p className="font-bold text-gray-700 mb-2">サイクル {cycle.cycle_number}</p>
                {cycle.breeding_events?.[0] && (
                  <div className="space-y-1 text-sm">
                    {cycle.breeding_events[0].estrus_date && <InfoRow label="発情" value={formatDate(cycle.breeding_events[0].estrus_date)} />}
                    {cycle.breeding_events[0].actual_calving_date && <InfoRow label="分娩" value={formatDate(cycle.breeding_events[0].actual_calving_date)} />}
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      )}
    </div>
  )
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between items-center py-1">
      <span className="text-gray-500">{label}</span>
      <span className="font-medium">{value}</span>
    </div>
  )
}

function formatDate(d: string) {
  return new Date(d).toLocaleDateString('ja-JP')
}

function addDays(dateStr: string, days: number): string {
  const d = new Date(dateStr)
  d.setDate(d.getDate() + days)
  return d.toISOString().split('T')[0]
}

function isStepActive(step: string, status: CowStatus, event: any, insemination: any): boolean {
  if (step === 'estrus') return status === 'estrus_pending'
  if (step === 'insemination') return status === 'inseminated' || (!!event?.estrus_date && !insemination)
  if (step === 'pregnancy_check') return status === 'pregnancy_check_pending'
  if (step === 'calving') return status === 'calving_pending'
  return false
}

function isStepDone(step: string, event: any, insemination: any): boolean {
  if (!event) return false
  if (step === 'estrus') return !!event.estrus_date
  if (step === 'insemination') return !!insemination?.insemination_date
  if (step === 'pregnancy_check') return event.pregnancy_result !== null && event.pregnancy_result !== undefined
  if (step === 'calving') return !!event.actual_calving_date
  return false
}

function getNextStep(status: CowStatus): string {
  const map: Record<CowStatus, string> = {
    idle: 'estrus',
    estrus_pending: 'estrus',
    inseminated: 'insemination',
    pregnancy_check_pending: 'pregnancy_check',
    calving_pending: 'calving',
  }
  return map[status]
}
