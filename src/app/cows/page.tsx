import { createClient } from '@/lib/supabase/server'
import CowList from '@/components/cows/CowList'

export default async function CowsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: cows } = await supabase
    .from('cows')
    .select('*')
    .eq('user_id', user!.id)
    .order('next_action_date', { ascending: true, nullsFirst: false })

  // 牛ごとの最新分娩日（産後日数表示用）
  const { data: calvings } = await supabase
    .from('breeding_events')
    .select('cow_id, actual_calving_date')
    .eq('user_id', user!.id)
    .not('actual_calving_date', 'is', null)

  const lastCalvingByCow: Record<string, string> = {}
  for (const ev of calvings ?? []) {
    const cur = lastCalvingByCow[ev.cow_id]
    if (ev.actual_calving_date && (!cur || ev.actual_calving_date > cur)) {
      lastCalvingByCow[ev.cow_id] = ev.actual_calving_date
    }
  }

  return (
    <div>
      <header className="bg-[#1b4332] text-white px-4 py-5">
        <h1 className="text-2xl font-bold">繁殖牛管理</h1>
        <p className="text-green-200 text-sm">{cows?.length ?? 0}頭登録中</p>
      </header>

      <CowList initialCows={cows ?? []} lastCalvingByCow={lastCalvingByCow} />
    </div>
  )
}
