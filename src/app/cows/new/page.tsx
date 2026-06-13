import CowNewForm from '@/components/cows/CowNewForm'
import Link from 'next/link'
import { ChevronLeft } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'

export default async function CowNewPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  // 過去に入力した父牛名を候補として取得（母牛は重複が少ないため対象外）
  const { data: cows } = await supabase
    .from('cows')
    .select('father_name')
    .eq('user_id', user!.id)

  const pastFathers = Array.from(
    new Set((cows ?? []).map(c => c.father_name).filter((v): v is string => !!v && v.trim() !== ''))
  ).slice(0, 8)

  return (
    <div>
      <header className="bg-[#1b4332] text-white px-4 py-5 flex items-center gap-3">
        <Link href="/cows" className="text-white">
          <ChevronLeft size={28} />
        </Link>
        <h1 className="text-2xl font-bold">牛を登録</h1>
      </header>
      <div className="px-4 py-6">
        <CowNewForm pastFathers={pastFathers} />
      </div>
    </div>
  )
}
