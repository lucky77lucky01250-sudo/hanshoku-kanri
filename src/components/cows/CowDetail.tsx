'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
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
  const [isEditing, setIsEditing] = useState(false)
  const [isEditingRecord, setIsEditingRecord] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const router = useRouter()

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

  const handleDelete = async () => {
    const supabase = createClient()
    await supabase.from('cows').delete().eq('id', cow.id)
    router.push('/cows')
    router.refresh()
  }

  if (isEditing) {
    return (
      <CowEditForm
        cow={cow}
        onCancel={() => setIsEditing(false)}
        onSaved={() => { setIsEditing(false); router.refresh() }}
      />
    )
  }

  if (isEditingRecord && currentEvent) {
    return (
      <RecordEditForm
        cow={cow}
        event={currentEvent}
        insemination={latestInsemination}
        onCancel={() => setIsEditingRecord(false)}
        onSaved={() => { setIsEditingRecord(false); router.refresh() }}
      />
    )
  }

  return (
    <div className="px-4 py-4">
      {/* 母牛情報 */}
      <div className="bg-white rounded-2xl border-2 border-gray-100 p-4 mb-4 space-y-2">
        <div className="flex items-center justify-between mb-1">
          <h2 className="text-lg font-bold text-gray-700">母牛情報</h2>
          <div className="flex gap-2">
            <button
              onClick={() => setIsEditing(true)}
              className="px-3 py-1 text-sm font-medium text-[#1b4332] border border-[#1b4332] rounded-lg"
            >
              編集
            </button>
            <button
              onClick={() => setShowDeleteConfirm(true)}
              className="px-3 py-1 text-sm font-medium text-red-600 border border-red-300 rounded-lg"
            >
              削除
            </button>
          </div>
        </div>
        {cow.father_name && <PedigreeRow label="父牛名" value={cow.father_name} />}
        {cow.mother_name && <PedigreeRow label="母牛名" value={cow.mother_name} />}
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
                const isDone = isStepDone(step.key, cow.current_status as CowStatus, currentEvent, latestInsemination)
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
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-gray-700">現在のサイクルの記録</h3>
                <button
                  onClick={() => setIsEditingRecord(true)}
                  className="px-3 py-1 text-sm font-medium text-[#1b4332] border border-[#1b4332] rounded-lg"
                >
                  ✏️ 修正
                </button>
              </div>
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
            pastCycles.map((cycle: any) => {
              const ev = cycle.breeding_events?.[0]
              const insem = cycle.insemination_records?.sort(
                (a: any, b: any) => b.attempt_number - a.attempt_number
              )[0]
              return (
                <div key={cycle.id} className="bg-white rounded-2xl border-2 border-gray-100 p-4">
                  <div className="flex items-center justify-between mb-2">
                    <p className="font-bold text-gray-700">サイクル {cycle.cycle_number}</p>
                    {ev?.pregnancy_result != null && (
                      <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${ev.pregnancy_result ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                        {ev.pregnancy_result ? '妊娠' : '空胎'}
                      </span>
                    )}
                  </div>
                  {ev ? (
                    <div className="space-y-1 text-sm">
                      {ev.estrus_date && <InfoRow label="発情確認日" value={formatDate(ev.estrus_date)} />}
                      {insem?.insemination_date && <InfoRow label="種付け日" value={formatDate(insem.insemination_date)} />}
                      {insem?.semen_name && <InfoRow label="使用精液" value={insem.semen_name} />}
                      {insem && insem.attempt_number > 1 && <InfoRow label="種付け回数" value={`${insem.attempt_number}回`} />}
                      {ev.pregnancy_check_date && <InfoRow label="妊娠鑑定日" value={formatDate(ev.pregnancy_check_date)} />}
                      {ev.expected_calving_date && <InfoRow label="分娩予定日" value={formatDate(ev.expected_calving_date)} />}
                      {ev.actual_calving_date && <InfoRow label="分娩日" value={formatDate(ev.actual_calving_date)} />}
                      {ev.calf_gender && <InfoRow label="子牛性別" value={ev.calf_gender === 'male' ? '♂ オス' : '♀ メス'} />}
                      {ev.calf_weight && <InfoRow label="子牛体重" value={`${ev.calf_weight} kg`} />}
                    </div>
                  ) : (
                    <p className="text-gray-400 text-sm">記録なし</p>
                  )}
                </div>
              )
            })
          )}
        </div>
      )}

      {/* 削除確認モーダル */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm space-y-4">
            <h3 className="text-xl font-bold text-gray-800">牛を削除しますか？</h3>
            <p className="text-gray-600">
              <span className="font-bold">{cow.ear_tag}</span> の全ての記録が削除されます。この操作は取り消せません。
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="flex-1 h-14 border-2 border-gray-300 rounded-xl font-bold text-gray-600 text-lg"
              >
                キャンセル
              </button>
              <button
                onClick={handleDelete}
                className="flex-1 h-14 bg-red-600 text-white rounded-xl font-bold text-lg"
              >
                削除する
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function RecordEditForm({
  cow, event, insemination, onCancel, onSaved,
}: {
  cow: Cow
  event: any
  insemination: any
  onCancel: () => void
  onSaved: () => void
}) {
  const [estrusDate, setEstrusDate] = useState(event.estrus_date ?? '')
  const [inseminationDate, setInseminationDate] = useState(insemination?.insemination_date ?? '')
  const [semenName, setSemenName] = useState(insemination?.semen_name ?? '')
  const [pregnancyCheckDate, setPregnancyCheckDate] = useState(event.pregnancy_check_date ?? '')
  const [pregnancyResult, setPregnancyResult] = useState<boolean | null>(event.pregnancy_result ?? null)
  const [expectedCalvingDate, setExpectedCalvingDate] = useState(event.expected_calving_date ?? '')
  const [actualCalvingDate, setActualCalvingDate] = useState(event.actual_calving_date ?? '')
  const [calfGender, setCalfGender] = useState(event.calf_gender ?? '')
  const [calfWeight, setCalfWeight] = useState(event.calf_weight != null ? String(event.calf_weight) : '')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  // 現在のステータスまでに通過したステップは、未記録（スキップ登録）でも編集対象にする
  const passed = STATUS_PASSED_STEPS[cow.current_status as CowStatus] ?? []
  const showEstrus = event.estrus_date != null || passed.includes('estrus')
  const showInsemination = !!insemination || passed.includes('insemination')
  const showPregnancy = !!event.pregnancy_check_date || passed.includes('pregnancy_check')
  const showCalving = !!event.actual_calving_date

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    const supabase = createClient()

    try {
      // breeding_events を更新
      const eventUpdate: Record<string, unknown> = {}
      if (showEstrus) eventUpdate.estrus_date = estrusDate || null
      if (showPregnancy) {
        eventUpdate.pregnancy_check_date = pregnancyCheckDate || null
        eventUpdate.pregnancy_result = pregnancyResult
        eventUpdate.expected_calving_date = expectedCalvingDate || null
      }
      if (showCalving) {
        eventUpdate.actual_calving_date = actualCalvingDate || null
        eventUpdate.calf_gender = calfGender || null
        eventUpdate.calf_weight = calfWeight ? parseFloat(calfWeight) : null
      }
      if (Object.keys(eventUpdate).length > 0) {
        const { error: e1 } = await supabase.from('breeding_events').update(eventUpdate).eq('id', event.id)
        if (e1) throw e1
      }

      // insemination_records を更新（既存があれば更新、なければ入力があった場合に新規作成）
      if (showInsemination && inseminationDate) {
        if (insemination) {
          const { error: e2 } = await supabase.from('insemination_records').update({
            insemination_date: inseminationDate,
            semen_name: semenName || null,
          }).eq('id', insemination.id)
          if (e2) throw e2
        } else {
          const { error: e2 } = await supabase.from('insemination_records').insert({
            cycle_id: event.cycle_id,
            user_id: cow.user_id,
            insemination_date: inseminationDate,
            semen_name: semenName || null,
            attempt_number: 1,
          })
          if (e2) throw e2
        }
      }

      // 現在ステータスに応じて次回予定日を再計算
      let nextDate: string | null = cow.next_action_date
      switch (cow.current_status) {
        case 'inseminated':
          if (estrusDate) nextDate = addDays(estrusDate, 1)
          break
        case 'pregnancy_check_pending':
          if (inseminationDate) nextDate = addDays(inseminationDate, 30)
          break
        case 'calving_pending':
          nextDate = expectedCalvingDate || null
          break
        case 'estrus_pending':
          if (pregnancyCheckDate) nextDate = addDays(pregnancyCheckDate, 18)
          break
      }
      if (nextDate !== cow.next_action_date) {
        const { error: e3 } = await supabase.from('cows').update({ next_action_date: nextDate }).eq('id', cow.id)
        if (e3) throw e3
      }

      onSaved()
    } catch {
      setError('修正の保存に失敗しました。もう一度お試しください。')
    } finally {
      setLoading(false)
    }
  }

  const inputCls = 'w-full h-14 px-4 text-lg border-2 border-gray-300 rounded-xl focus:outline-none focus:border-[#1b4332]'

  return (
    <form onSubmit={handleSubmit} className="px-4 py-4 space-y-6 pb-28">
      <h2 className="text-lg font-bold text-gray-700">記録を修正</h2>

      {!showEstrus && !showInsemination && !showPregnancy && !showCalving && (
        <p className="text-gray-500 text-base bg-gray-50 p-4 rounded-xl">
          まだ修正できる記録がありません。「記録する」から記録を追加してください。
        </p>
      )}

      {showEstrus && (
        <div>
          <label className="block text-base font-bold text-gray-700 mb-2">発情確認日</label>
          <input type="date" value={estrusDate} onChange={(e) => setEstrusDate(e.target.value)} className={inputCls} />
        </div>
      )}

      {showInsemination && (
        <>
          <div>
            <label className="block text-base font-bold text-gray-700 mb-2">種付け日</label>
            <input type="date" value={inseminationDate} onChange={(e) => setInseminationDate(e.target.value)} className={inputCls} />
          </div>
          <div>
            <label className="block text-base font-bold text-gray-700 mb-2">使用精液</label>
            <input type="text" value={semenName} onChange={(e) => setSemenName(e.target.value)} className={inputCls} placeholder="精液名（任意）" />
          </div>
        </>
      )}

      {showPregnancy && (
        <>
          <div>
            <label className="block text-base font-bold text-gray-700 mb-2">妊娠鑑定日</label>
            <input type="date" value={pregnancyCheckDate} onChange={(e) => setPregnancyCheckDate(e.target.value)} className={inputCls} />
          </div>
          <div>
            <label className="block text-base font-bold text-gray-700 mb-3">鑑定結果</label>
            <div className="grid grid-cols-2 gap-3">
              <button type="button" onClick={() => setPregnancyResult(true)}
                className={`h-16 rounded-xl font-bold text-lg border-2 transition-colors ${pregnancyResult === true ? 'bg-green-600 text-white border-green-600' : 'bg-white text-gray-600 border-gray-200'}`}>
                ✅ 陽性（妊娠）
              </button>
              <button type="button" onClick={() => setPregnancyResult(false)}
                className={`h-16 rounded-xl font-bold text-lg border-2 transition-colors ${pregnancyResult === false ? 'bg-red-600 text-white border-red-600' : 'bg-white text-gray-600 border-gray-200'}`}>
                ❌ 陰性（空胎）
              </button>
            </div>
          </div>
          {pregnancyResult === true && (
            <div>
              <label className="block text-base font-bold text-gray-700 mb-2">分娩予定日</label>
              <input type="date" value={expectedCalvingDate} onChange={(e) => setExpectedCalvingDate(e.target.value)} className={inputCls} />
            </div>
          )}
        </>
      )}

      {showCalving && (
        <>
          <div>
            <label className="block text-base font-bold text-gray-700 mb-2">分娩日</label>
            <input type="date" value={actualCalvingDate} onChange={(e) => setActualCalvingDate(e.target.value)} className={inputCls} />
          </div>
          <div>
            <label className="block text-base font-bold text-gray-700 mb-3">子牛の性別</label>
            <div className="grid grid-cols-2 gap-3">
              {[{ val: 'male', label: '♂ オス' }, { val: 'female', label: '♀ メス' }].map(({ val, label }) => (
                <button key={val} type="button" onClick={() => setCalfGender(val)}
                  className={`h-14 rounded-xl font-bold text-lg border-2 transition-colors ${calfGender === val ? 'bg-[#1b4332] text-white border-[#1b4332]' : 'bg-white text-gray-600 border-gray-200'}`}>
                  {label}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="block text-base font-bold text-gray-700 mb-2">子牛体重</label>
            <div className="relative">
              <input type="number" step="0.1" value={calfWeight} onChange={(e) => setCalfWeight(e.target.value)}
                className={`${inputCls} pr-12`} placeholder="例: 32.5" />
              <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 font-medium">kg</span>
            </div>
          </div>
        </>
      )}

      {error && (
        <p className="text-red-700 text-base font-bold bg-red-50 p-3 rounded-xl border border-red-200">{error}</p>
      )}

      <div className="fixed bottom-20 left-0 right-0 p-4 bg-white border-t border-gray-200 flex gap-3">
        <button type="button" onClick={onCancel}
          className="flex-1 h-14 border-2 border-gray-300 rounded-xl font-bold text-gray-600 text-lg">
          キャンセル
        </button>
        <button type="submit" disabled={loading}
          className="flex-1 h-14 bg-[#1b4332] text-white text-lg font-bold rounded-xl disabled:opacity-50">
          {loading ? '保存中...' : '保存する'}
        </button>
      </div>
    </form>
  )
}

function CowEditForm({ cow, onCancel, onSaved }: { cow: Cow; onCancel: () => void; onSaved: () => void }) {
  const [earTag, setEarTag] = useState(cow.ear_tag)
  const [birthDate, setBirthDate] = useState(cow.birth_date ?? '')
  const [fatherName, setFatherName] = useState(cow.father_name ?? '')
  const [motherName, setMotherName] = useState(cow.mother_name ?? '')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!earTag.trim()) { setError('耳標番号は必須です'); return }
    setLoading(true)
    setError('')

    const supabase = createClient()
    const { error: updateErr } = await supabase.from('cows').update({
      ear_tag: earTag.trim(),
      birth_date: birthDate || null,
      father_name: fatherName.trim() || null,
      mother_name: motherName.trim() || null,
    }).eq('id', cow.id)

    if (updateErr) {
      setError('更新に失敗しました。もう一度お試しください。')
    } else {
      onSaved()
    }
    setLoading(false)
  }

  return (
    <form onSubmit={handleSubmit} className="px-4 py-4 space-y-6 pb-28">
      <h2 className="text-lg font-bold text-gray-700">牛情報を編集</h2>

      <div>
        <label className="block text-base font-bold text-gray-700 mb-2">
          耳標番号 <span className="text-red-500">*</span>
        </label>
        <input
          type="text"
          value={earTag}
          onChange={(e) => setEarTag(e.target.value)}
          required
          className="w-full h-14 px-4 text-lg border-2 border-gray-300 rounded-xl focus:outline-none focus:border-[#1b4332]"
        />
      </div>

      <div>
        <label className="block text-base font-bold text-gray-700 mb-2">生年月日</label>
        <input
          type="date"
          value={birthDate}
          onChange={(e) => setBirthDate(e.target.value)}
          className="w-full h-14 px-4 text-lg border-2 border-gray-300 rounded-xl focus:outline-none focus:border-[#1b4332]"
        />
      </div>

      <div>
        <label className="block text-base font-bold text-gray-700 mb-2">父牛名</label>
        <input
          type="text"
          value={fatherName}
          onChange={(e) => setFatherName(e.target.value)}
          className="w-full h-14 px-4 text-lg border-2 border-gray-300 rounded-xl focus:outline-none focus:border-[#1b4332]"
          placeholder="例: 勝忠平"
        />
      </div>

      <div>
        <label className="block text-base font-bold text-gray-700 mb-2">母牛名</label>
        <input
          type="text"
          value={motherName}
          onChange={(e) => setMotherName(e.target.value)}
          className="w-full h-14 px-4 text-lg border-2 border-gray-300 rounded-xl focus:outline-none focus:border-[#1b4332]"
          placeholder="例: はな"
        />
      </div>

      {error && (
        <p className="text-red-700 text-base font-bold bg-red-50 p-3 rounded-xl border border-red-200">{error}</p>
      )}

      <div className="fixed bottom-20 left-0 right-0 p-4 bg-white border-t border-gray-200 flex gap-3">
        <button
          type="button"
          onClick={onCancel}
          className="flex-1 h-14 border-2 border-gray-300 rounded-xl font-bold text-gray-600 text-lg"
        >
          キャンセル
        </button>
        <button
          type="submit"
          disabled={loading}
          className="flex-1 h-14 bg-[#1b4332] text-white text-lg font-bold rounded-xl disabled:opacity-50"
        >
          {loading ? '保存中...' : '保存する'}
        </button>
      </div>
    </form>
  )
}

function PedigreeRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center gap-3 py-1">
      <span className="text-gray-500 w-16 flex-shrink-0">{label}</span>
      <span className="font-medium text-gray-900">{value}</span>
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

// 現在ステータスより前のステップ（スキップ登録分）も完了扱いにする
const STATUS_PASSED_STEPS: Record<CowStatus, string[]> = {
  idle: [],
  estrus_pending: [],
  inseminated: ['estrus'],
  pregnancy_check_pending: ['estrus', 'insemination'],
  calving_pending: ['estrus', 'insemination', 'pregnancy_check'],
}

function isStepDone(step: string, status: CowStatus, event: any, insemination: any): boolean {
  // スキップ登録などで現在ステータスが先に進んでいる場合は完了扱い
  if (STATUS_PASSED_STEPS[status]?.includes(step)) return true
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
