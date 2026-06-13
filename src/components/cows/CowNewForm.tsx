'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

type InitialStatus = 'idle' | 'pregnancy_check_pending' | 'calving_pending'

const STATUS_OPTIONS: { value: InitialStatus; label: string; desc: string }[] = [
  { value: 'idle', label: '⚪ 待機中', desc: '発情確認から開始' },
  { value: 'pregnancy_check_pending', label: '🟠 妊娠鑑定待ち', desc: '種付け済みで購入した牛など' },
  { value: 'calving_pending', label: '🟢 分娩待ち', desc: '妊娠が確認済みの牛など' },
]

function getTodayStr() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export default function CowNewForm() {
  const [earTag, setEarTag] = useState('')
  const [birthDate, setBirthDate] = useState('')
  const [fatherName, setFatherName] = useState('')
  const [motherName, setMotherName] = useState('')
  const [initialStatus, setInitialStatus] = useState<InitialStatus>('idle')
  const [nextActionDate, setNextActionDate] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const router = useRouter()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!earTag.trim()) { setError('耳標番号は必須です'); return }
    setLoading(true)
    setError('')

    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/'); return }

    const { data: cow, error: cowErr } = await supabase.from('cows').insert({
      user_id: user.id,
      ear_tag: earTag.trim(),
      birth_date: birthDate || null,
      father_name: fatherName.trim() || null,
      mother_name: motherName.trim() || null,
      current_status: initialStatus,
      next_action_date: nextActionDate || null,
    }).select().single()

    if (cowErr || !cow) {
      setError('登録に失敗しました。もう一度お試しください。')
      setLoading(false)
      return
    }

    // スキップ: 待機中以外はサイクル＋イベントを作成して現在ステータスから開始
    if (initialStatus !== 'idle') {
      const { data: cycle, error: cycleErr } = await supabase
        .from('breeding_cycles')
        .insert({ cow_id: cow.id, user_id: user.id, cycle_number: 1 })
        .select()
        .single()

      // サイクル作成に失敗したら、作成済みの牛を削除してロールバック（イベント無しの不整合牛を防ぐ）
      if (cycleErr || !cycle) {
        await supabase.from('cows').delete().eq('id', cow.id)
        setError('登録に失敗しました。もう一度お試しください。')
        setLoading(false)
        return
      }

      const eventData: Record<string, unknown> = {
        cycle_id: cycle.id,
        cow_id: cow.id,
        user_id: user.id,
      }
      if (initialStatus === 'calving_pending' && nextActionDate) {
        eventData.expected_calving_date = nextActionDate
      }
      const { error: eventErr } = await supabase.from('breeding_events').insert(eventData)
      if (eventErr) {
        // 牛を削除（cycle はCASCADEで一緒に消える）
        await supabase.from('cows').delete().eq('id', cow.id)
        setError('登録に失敗しました。もう一度お試しください。')
        setLoading(false)
        return
      }
    }

    router.push('/cows')
    router.refresh()
    setLoading(false)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6 pb-28">
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
          placeholder="例: 1234567890"
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

      {/* 現在のステータス（スキップ機能） */}
      <div>
        <label id="status-label" className="block text-base font-bold text-gray-700 mb-1">現在のステータス</label>
        <p className="text-sm text-gray-500 mb-3">購入した妊娠牛など、途中から開始する場合に変更してください</p>
        <div className="space-y-2" role="radiogroup" aria-labelledby="status-label">
          {STATUS_OPTIONS.map(opt => (
            <button
              key={opt.value}
              type="button"
              role="radio"
              aria-checked={initialStatus === opt.value}
              onClick={() => { setInitialStatus(opt.value); setNextActionDate('') }}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl border-2 text-left transition-colors ${
                initialStatus === opt.value
                  ? 'bg-[#1b4332] text-white border-[#1b4332]'
                  : 'bg-white text-gray-700 border-gray-200'
              }`}
            >
              <div>
                <p className="font-bold">{opt.label}</p>
                <p className={`text-sm ${initialStatus === opt.value ? 'text-green-200' : 'text-gray-500'}`}>{opt.desc}</p>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* 分娩待ちの場合は分娩予定日を入力できる */}
      {initialStatus === 'calving_pending' && (
        <div>
          <label className="block text-base font-bold text-gray-700 mb-2">分娩予定日（任意）</label>
          <input
            type="date"
            value={nextActionDate}
            onChange={(e) => setNextActionDate(e.target.value)}
            min={getTodayStr()}
            className="w-full h-14 px-4 text-lg border-2 border-gray-300 rounded-xl focus:outline-none focus:border-[#1b4332]"
          />
        </div>
      )}

      {/* 妊娠鑑定待ちの場合は鑑定予定日 */}
      {initialStatus === 'pregnancy_check_pending' && (
        <div>
          <label className="block text-base font-bold text-gray-700 mb-2">妊娠鑑定予定日（任意）</label>
          <input
            type="date"
            value={nextActionDate}
            onChange={(e) => setNextActionDate(e.target.value)}
            className="w-full h-14 px-4 text-lg border-2 border-gray-300 rounded-xl focus:outline-none focus:border-[#1b4332]"
          />
        </div>
      )}

      {error && (
        <p className="text-red-700 text-base font-bold bg-red-50 p-3 rounded-xl border border-red-200">{error}</p>
      )}

      <div className="fixed bottom-20 left-0 right-0 p-4 pb-[calc(1rem+env(safe-area-inset-bottom))] bg-white border-t border-gray-200">
        <button
          type="submit"
          disabled={loading}
          className="w-full h-14 bg-[#1b4332] text-white text-xl font-bold rounded-xl disabled:opacity-50"
        >
          {loading ? '登録中...' : '登録する'}
        </button>
      </div>
    </form>
  )
}
