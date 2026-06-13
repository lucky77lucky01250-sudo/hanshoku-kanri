'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

export default function SettingsForm({
  userId,
  userEmail,
  initialSettings,
}: {
  userId: string
  userEmail: string
  initialSettings: {
    email: string
    notify_7days: boolean
    notify_3days: boolean
  } | null
}) {
  const [email, setEmail] = useState(initialSettings?.email ?? userEmail)
  const [notify7, setNotify7] = useState(initialSettings?.notify_7days ?? true)
  const [notify3, setNotify3] = useState(initialSettings?.notify_3days ?? true)
  const [loading, setLoading] = useState(false)
  const [saved, setSaved] = useState(false)
  const [saveError, setSaveError] = useState('')
  const [testing, setTesting] = useState(false)
  const [testResult, setTestResult] = useState<{ ok: boolean; message: string } | null>(null)
  const [exporting, setExporting] = useState(false)
  const [exportError, setExportError] = useState('')
  const router = useRouter()

  const handleTestNotify = async () => {
    setTesting(true)
    setTestResult(null)
    try {
      const res = await fetch('/api/notify/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      })
      const data = await res.json()
      if (res.ok) {
        setTestResult({ ok: true, message: `✅ ${data.to ?? email} に送信しました。受信を確認してください。` })
      } else {
        setTestResult({ ok: false, message: `⚠️ 送信に失敗しました：${data.error ?? '不明なエラー'}` })
      }
    } catch {
      setTestResult({ ok: false, message: '⚠️ 送信に失敗しました。通信エラーです。' })
    }
    setTesting(false)
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setSaveError('')

    const supabase = createClient()
    // user_id にUNIQUE制約があるため upsert で統一（別タブ等での二重作成による一意制約違反を回避）
    const { error } = await supabase
      .from('notification_settings')
      .upsert({ user_id: userId, email, notify_7days: notify7, notify_3days: notify3 }, { onConflict: 'user_id' })

    if (error) {
      setSaveError('設定の保存に失敗しました。もう一度お試しください。')
    } else {
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    }
    setLoading(false)
  }

  const handleExportCSV = async () => {
    setExporting(true)
    setExportError('')
    const supabase = createClient()

    // サイクル情報も取得して精液を正しく紐付ける
    const [cowsRes, eventsRes, insemRes] = await Promise.all([
      supabase.from('cows').select('*').eq('user_id', userId),
      supabase.from('breeding_events').select('*').eq('user_id', userId),
      supabase.from('insemination_records').select('*').eq('user_id', userId),
    ])

    if (cowsRes.error || eventsRes.error || insemRes.error) {
      setExportError('エクスポートに失敗しました。通信環境を確認してもう一度お試しください。')
      setExporting(false)
      return
    }
    const cows = cowsRes.data
    const events = eventsRes.data
    const inseminations = insemRes.data

    if (!cows || cows.length === 0) {
      setExportError('エクスポートできる牛の記録がありません。')
      setExporting(false)
      return
    }

    const rows = [
      ['耳標番号', '生年月日', '父牛名', '母牛名', '発情確認日', '種付け日', '使用精液', '妊娠鑑定日', '妊娠結果', '分娩予定日', '分娩日', '子牛性別', '子牛体重'],
    ]

    for (const cow of cows ?? []) {
      const cowEvents = events?.filter(e => e.cow_id === cow.id) ?? []

      if (cowEvents.length === 0) {
        rows.push([cow.ear_tag, cow.birth_date ?? '', cow.father_name ?? '', cow.mother_name ?? '', '', '', '', '', '', '', '', '', ''])
      } else {
        for (const event of cowEvents) {
          // cycle_idを介して正しく精液を紐付ける
          const cowInseminations = inseminations?.filter(i => i.cycle_id === event.cycle_id) ?? []
          const latestInsem = cowInseminations.sort((a, b) => b.attempt_number - a.attempt_number)[0]

          rows.push([
            cow.ear_tag,
            cow.birth_date ?? '',
            cow.father_name ?? '',
            cow.mother_name ?? '',
            event.estrus_date ?? '',
            latestInsem?.insemination_date ?? '',
            latestInsem?.semen_name ?? '',
            event.pregnancy_check_date ?? '',
            event.pregnancy_result === true ? '陽性' : event.pregnancy_result === false ? '陰性' : '',
            event.expected_calving_date ?? '',
            event.actual_calving_date ?? '',
            event.calf_gender === 'male' ? 'オス' : event.calf_gender === 'female' ? 'メス' : '',
            event.calf_weight?.toString() ?? '',
          ])
        }
      }
    }

    const csv = rows.map(r => r.map(v => `"${v}"`).join(',')).join('\n')
    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `繁殖記録_${new Date().toLocaleDateString('ja-JP').replace(/\//g, '-')}.csv`
    a.click()
    URL.revokeObjectURL(url)
    setExporting(false)
  }

  const handleLogout = async () => {
    if (!window.confirm('ログアウトしますか？')) return
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/')
  }

  return (
    <div className="space-y-6">
      <form onSubmit={handleSave} className="space-y-6">
        <div className="bg-white rounded-2xl border-2 border-gray-100 p-4 space-y-4">
          <h2 className="text-lg font-bold text-gray-700">通知設定</h2>

          <div>
            <label className="block text-base font-medium text-gray-700 mb-2">通知先メールアドレス</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full h-14 px-4 text-lg border-2 border-gray-300 rounded-xl focus:outline-none focus:border-[#1b4332]"
            />
          </div>

          <div className="space-y-1">
            <ToggleRow label="7日前に通知" value={notify7} onChange={setNotify7} />
            <ToggleRow label="3日前に通知" value={notify3} onChange={setNotify3} />
          </div>

          <div className="pt-2 border-t border-gray-100">
            <button
              type="button"
              onClick={handleTestNotify}
              disabled={testing}
              className="w-full h-12 bg-white border-2 border-[#f4a261] text-[#c8762f] text-base font-bold rounded-xl disabled:opacity-50"
            >
              {testing ? '送信中...' : '✉️ テストメールを送信'}
            </button>
            {testResult && (
              <p role={testResult.ok ? 'status' : 'alert'} className={`text-sm font-bold mt-2 p-3 rounded-xl border ${
                testResult.ok
                  ? 'text-green-700 bg-green-50 border-green-200'
                  : 'text-red-700 bg-red-50 border-red-200'
              }`}>
                {testResult.message}
              </p>
            )}
          </div>
        </div>

        {saveError && (
          <p role="alert" className="text-red-700 text-base font-bold bg-red-50 p-3 rounded-xl border border-red-200">{saveError}</p>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full h-14 bg-[#1b4332] text-white text-xl font-bold rounded-xl disabled:opacity-50"
        >
          {saved ? '✅ 保存しました' : loading ? '保存中...' : '設定を保存'}
        </button>
      </form>

      <div className="bg-white rounded-2xl border-2 border-gray-100 p-4 space-y-4">
        <h2 className="text-lg font-bold text-gray-700">データ</h2>
        <button
          onClick={handleExportCSV}
          disabled={exporting}
          className="w-full h-14 bg-white border-2 border-[#1b4332] text-[#1b4332] text-lg font-bold rounded-xl disabled:opacity-50"
        >
          {exporting ? '出力中...' : '📥 CSVでエクスポート'}
        </button>
        {exportError && (
          <p role="alert" className="text-red-700 text-base font-bold bg-red-50 p-3 rounded-xl border border-red-200">{exportError}</p>
        )}
      </div>

      <div className="bg-white rounded-2xl border-2 border-gray-100 p-4">
        <h2 className="text-lg font-bold text-gray-700 mb-4">アカウント</h2>
        <button
          onClick={handleLogout}
          className="w-full h-14 bg-white border-2 border-red-300 text-red-600 text-lg font-bold rounded-xl"
        >
          ログアウト
        </button>
      </div>
    </div>
  )
}

function ToggleRow({ label, value, onChange }: { label: string; value: boolean; onChange: (v: boolean) => void }) {
  return (
    // ラベル行全体をタップ領域にして44px以上確保
    <label className="flex items-center justify-between py-3 cursor-pointer">
      <span className="text-base text-gray-700">{label}</span>
      <button
        type="button"
        role="switch"
        aria-checked={value}
        onClick={() => onChange(!value)}
        className={`w-14 h-8 rounded-full transition-colors relative flex-shrink-0 ${value ? 'bg-[#1b4332]' : 'bg-gray-300'}`}
      >
        <span className={`absolute top-1 w-6 h-6 bg-white rounded-full shadow transition-transform ${value ? 'translate-x-7' : 'translate-x-1'}`} />
      </button>
    </label>
  )
}
