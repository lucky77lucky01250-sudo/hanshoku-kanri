'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

export default function CowNewForm() {
  const [earTag, setEarTag] = useState('')
  const [birthDate, setBirthDate] = useState('')
  const [fatherName, setFatherName] = useState('')
  const [motherName, setMotherName] = useState('')
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

    const { error } = await supabase.from('cows').insert({
      user_id: user.id,
      ear_tag: earTag.trim(),
      birth_date: birthDate || null,
      father_name: fatherName.trim() || null,
      mother_name: motherName.trim() || null,
      current_status: 'idle',
    })

    if (error) {
      setError('登録に失敗しました。もう一度お試しください。')
    } else {
      router.push('/cows')
      router.refresh()
    }
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

      {error && (
        <p className="text-red-700 text-base font-bold bg-red-50 p-3 rounded-xl border border-red-200">{error}</p>
      )}

      <div className="fixed bottom-0 left-0 right-0 p-4 pb-8 bg-white border-t border-gray-200">
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
