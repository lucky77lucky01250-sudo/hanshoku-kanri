'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { ClearableDateInput } from '@/components/ui/ClearableDateInput'

function getTodayStr() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function getDateOffset(days: number) {
  const d = new Date()
  d.setDate(d.getDate() - days)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function addDays(dateStr: string, days: number) {
  const d = new Date(dateStr + 'T00:00:00')
  d.setDate(d.getDate() + days)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export default function RecordForm({
  cowId, step, pastSemen, inseminationDate,
}: {
  cowId: string
  step: string
  pastSemen: string[]
  inseminationDate?: string | null
}) {
  const [date, setDate] = useState(getTodayStr())
  const [semenName, setSemenName] = useState('')
  const [semenInput, setSemenInput] = useState('')
  const [pregnancyResult, setPregnancyResult] = useState<boolean | null>(null)
  // 妊娠確定時の分娩予定日は「授精+285日」を初期値にする（手修正も可）
  const [expectedCalvingDate, setExpectedCalvingDate] = useState(
    inseminationDate ? addDays(inseminationDate, 285) : ''
  )
  const [calfGender, setCalfGender] = useState('')
  const [calfWeight, setCalfWeight] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const router = useRouter()

  // 発情日が分からない場合：日付なしで発情確認を記録し、そのまま種付け記録へ進む
  const handleEstrusUnknown = async () => {
    setLoading(true)
    setError('')
    const supabase = createClient()
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/'); return }

      const { data: cycle } = await supabase
        .from('breeding_cycles')
        .select('*, breeding_events(*)')
        .eq('cow_id', cowId)
        .order('cycle_number', { ascending: false })
        .limit(1)
        .maybeSingle()

      const cycleNum = cycle ? cycle.cycle_number + 1 : 1
      const { data: newCycle, error: cycleErr } = await supabase
        .from('breeding_cycles')
        .insert({ cow_id: cowId, user_id: user.id, cycle_number: cycleNum })
        .select()
        .single()
      if (cycleErr) throw cycleErr

      // 発情確認日は未定（null）。イベント行は作るので「発情確認済み」として扱われる
      const { error: evErr } = await supabase.from('breeding_events').insert({
        cycle_id: newCycle.id, cow_id: cowId, user_id: user.id, estrus_date: null,
      })
      if (evErr) throw evErr

      await supabase.from('cows').update({
        current_status: 'inseminated',
        next_action_date: null,
      }).eq('id', cowId)

      // そのまま種付け記録へ
      router.push(`/cows/${cowId}/record/insemination`)
      router.refresh()
    } catch (err) {
      const msg = err instanceof Error ? err.message : '記録の保存に失敗しました。もう一度お試しください。'
      setError(msg)
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!date) { setError('日付を選択してください'); return }
    setLoading(true)
    setError('')

    const supabase = createClient()

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/'); return }

      // 現在のサイクルを取得（0件でもエラーにならないmaybeSingle使用）
      const { data: cycle, error: cycleQueryErr } = await supabase
        .from('breeding_cycles')
        .select('*, breeding_events(*)')
        .eq('cow_id', cowId)
        .order('cycle_number', { ascending: false })
        .limit(1)
        .maybeSingle()

      if (cycleQueryErr) throw cycleQueryErr

      let activeCycle = cycle

      // 発情ステップ or サイクル未作成の場合は新サイクルを作成
      if (!activeCycle || step === 'estrus') {
        const cycleNum = activeCycle ? activeCycle.cycle_number + 1 : 1
        const { data: newCycle, error: cycleErr } = await supabase
          .from('breeding_cycles')
          .insert({ cow_id: cowId, user_id: user.id, cycle_number: cycleNum })
          .select()
          .single()
        if (cycleErr) throw cycleErr
        activeCycle = { ...newCycle, breeding_events: [] }
      }

      const existingEvent = activeCycle.breeding_events?.[0] ?? null

      if (step === 'estrus') {
        if (existingEvent) {
          await supabase.from('breeding_events').update({ estrus_date: date }).eq('id', existingEvent.id)
        } else {
          await supabase.from('breeding_events').insert({
            cycle_id: activeCycle.id, cow_id: cowId, user_id: user.id, estrus_date: date,
          })
        }
        await supabase.from('cows').update({
          current_status: 'inseminated',
          next_action_date: addDays(date, 1),
        }).eq('id', cowId)

      } else if (step === 'insemination') {
        const { data: records } = await supabase
          .from('insemination_records')
          .select('attempt_number')
          .eq('cycle_id', activeCycle.id)
          .order('attempt_number', { ascending: false })
          .limit(1)
        const nextAttempt = (records?.[0]?.attempt_number ?? 0) + 1

        await supabase.from('insemination_records').insert({
          cycle_id: activeCycle.id, user_id: user.id,
          insemination_date: date,
          semen_name: semenName || semenInput || null,
          attempt_number: nextAttempt,
        })
        await supabase.from('cows').update({
          current_status: 'pregnancy_check_pending',
          next_action_date: addDays(date, 40),
        }).eq('id', cowId)

      } else if (step === 'pregnancy_check') {
        // existingEventが必須
        if (!existingEvent) throw new Error('繁殖記録が見つかりません。先に発情確認を記録してください。')

        const updates: {
          pregnancy_check_date: string
          pregnancy_result: boolean | null
          expected_calving_date?: string
        } = {
          pregnancy_check_date: date,
          pregnancy_result: pregnancyResult,
        }
        if (pregnancyResult && expectedCalvingDate) {
          updates.expected_calving_date = expectedCalvingDate
        }
        const { error: updateErr } = await supabase.from('breeding_events').update(updates).eq('id', existingEvent.id)
        if (updateErr) throw updateErr

        if (pregnancyResult === true) {
          await supabase.from('cows').update({
            current_status: 'calving_pending',
            next_action_date: expectedCalvingDate || null,
          }).eq('id', cowId)
        } else {
          await supabase.from('cows').update({
            current_status: 'estrus_pending',
            next_action_date: addDays(date, 21),
          }).eq('id', cowId)
        }

      } else if (step === 'calving') {
        // existingEventが必須
        if (!existingEvent) throw new Error('繁殖記録が見つかりません。先に発情確認を記録してください。')

        const updates: {
          actual_calving_date: string
          calf_gender?: string | null
          calf_weight?: number | null
        } = {
          actual_calving_date: date,
          calf_gender: calfGender || null,
          calf_weight: calfWeight ? parseFloat(calfWeight) : null,
        }
        const { error: updateErr } = await supabase.from('breeding_events').update(updates).eq('id', existingEvent.id)
        if (updateErr) throw updateErr

        await supabase.from('cows').update({
          current_status: 'idle',
          next_action_date: null,
        }).eq('id', cowId)
      }

      router.push(`/cows/${cowId}?saved=1`)
      router.refresh()
    } catch (err) {
      const msg = err instanceof Error ? err.message : '記録の保存に失敗しました。もう一度お試しください。'
      setError(msg)
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6 pb-28">
      {/* 日付ボタン群 */}
      <div>
        <label className="block text-base font-bold text-gray-700 mb-3">
          {step === 'calving' ? '分娩日' : step === 'pregnancy_check' ? '鑑定日' : step === 'insemination' ? '種付け日' : '発情確認日'}
          <span className="text-red-600"> *</span>
        </label>
        {/* 2列2行 → 片手操作に十分な幅を確保 */}
        <div className="grid grid-cols-2 gap-3 mb-3">
          {[
            { label: '今日', val: getTodayStr() },
            { label: '昨日', val: getDateOffset(1) },
            { label: '2日前', val: getDateOffset(2) },
            { label: '3日前', val: getDateOffset(3) },
          ].map(({ label, val }) => (
            <button
              key={label}
              type="button"
              onClick={() => setDate(val)}
              className={`h-14 rounded-xl font-bold text-lg border-2 transition-colors ${
                date === val
                  ? 'bg-[#1b4332] text-white border-[#1b4332]'
                  : 'bg-white text-gray-600 border-gray-200'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
        <input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className="w-full h-14 px-4 text-lg border-2 border-gray-300 rounded-xl focus:outline-none focus:border-[#1b4332]"
        />
        {step === 'estrus' && (
          <button
            type="button"
            onClick={handleEstrusUnknown}
            disabled={loading}
            className="mt-3 w-full h-12 border-2 border-gray-300 rounded-xl font-bold text-gray-600 text-base disabled:opacity-50"
          >
            発情日は未定（不明）→ 種付け記録へ進む
          </button>
        )}
      </div>

      {/* 種付け固有フィールド */}
      {step === 'insemination' && (
        <div>
          <label className="block text-base font-bold text-gray-700 mb-2">使用精液（任意）</label>
          {pastSemen.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-3">
              {pastSemen.slice(0, 5).map(s => (
                <button
                  key={s}
                  type="button"
                  onClick={() => { setSemenName(s); setSemenInput(s) }}
                  className={`h-12 px-4 rounded-xl border-2 text-base font-medium transition-colors ${
                    semenName === s
                      ? 'bg-[#1b4332] text-white border-[#1b4332]'
                      : 'bg-white text-gray-600 border-gray-200'
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>
          )}
          <input
            type="text"
            value={semenInput}
            onChange={(e) => { setSemenInput(e.target.value); setSemenName('') }}
            className="w-full h-14 px-4 text-lg border-2 border-gray-300 rounded-xl focus:outline-none focus:border-[#1b4332]"
            placeholder="精液名を入力（例：安福久）"
          />
        </div>
      )}

      {/* 妊娠鑑定固有フィールド */}
      {step === 'pregnancy_check' && (
        <>
          <div>
            <label className="block text-base font-bold text-gray-700 mb-3">鑑定結果 <span className="text-red-600">*</span></label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setPregnancyResult(true)}
                className={`h-16 rounded-xl font-bold text-lg border-2 transition-colors ${
                  pregnancyResult === true
                    ? 'bg-green-600 text-white border-green-600'
                    : 'bg-white text-gray-600 border-gray-200'
                }`}
              >
                ✅ 陽性（妊娠）
              </button>
              <button
                type="button"
                onClick={() => setPregnancyResult(false)}
                className={`h-16 rounded-xl font-bold text-lg border-2 transition-colors ${
                  pregnancyResult === false
                    ? 'bg-red-600 text-white border-red-600'
                    : 'bg-white text-gray-600 border-gray-200'
                }`}
              >
                ❌ 陰性（空胎）
              </button>
            </div>
          </div>
          {pregnancyResult === true && (
            <div>
              <label className="block text-base font-bold text-gray-700 mb-2">分娩予定日（授精+285日で自動入力・修正可）</label>
              <ClearableDateInput
                value={expectedCalvingDate}
                onChange={setExpectedCalvingDate}
                className="w-full h-14 px-4 text-lg border-2 border-gray-300 rounded-xl focus:outline-none focus:border-[#1b4332]"
              />
            </div>
          )}
        </>
      )}

      {/* 分娩固有フィールド */}
      {step === 'calving' && (
        <>
          <div>
            <label className="block text-base font-bold text-gray-700 mb-3">子牛の性別（任意）</label>
            <div className="grid grid-cols-2 gap-3">
              {[{ val: 'male', label: '♂ オス' }, { val: 'female', label: '♀ メス' }].map(({ val, label }) => (
                <button
                  key={val}
                  type="button"
                  onClick={() => setCalfGender(val)}
                  className={`h-14 rounded-xl font-bold text-lg border-2 transition-colors ${
                    calfGender === val
                      ? 'bg-[#1b4332] text-white border-[#1b4332]'
                      : 'bg-white text-gray-600 border-gray-200'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="block text-base font-bold text-gray-700 mb-2">子牛体重（任意）</label>
            <div className="relative">
              <input
                type="number"
                step="0.1"
                value={calfWeight}
                onChange={(e) => setCalfWeight(e.target.value)}
                className="w-full h-14 px-4 pr-12 text-lg border-2 border-gray-300 rounded-xl focus:outline-none focus:border-[#1b4332]"
                placeholder="例: 32.5"
              />
              <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 font-medium">kg</span>
            </div>
          </div>
        </>
      )}

      {error && (
        <p className="text-red-700 text-base font-bold bg-red-50 p-3 rounded-xl border border-red-200">{error}</p>
      )}

      <div className="fixed bottom-20 left-0 right-0 p-4 bg-white border-t border-gray-200">
        <button
          type="submit"
          disabled={loading || (step === 'pregnancy_check' && pregnancyResult === null)}
          className="w-full h-14 bg-[#f4a261] text-white text-xl font-bold rounded-xl disabled:opacity-50"
        >
          {loading ? '保存中...' : '記録を保存'}
        </button>
      </div>
    </form>
  )
}
