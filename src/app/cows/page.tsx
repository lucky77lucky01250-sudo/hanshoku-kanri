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

  return (
    <div>
      <header className="bg-[#1b4332] text-white px-4 py-5">
        <h1 className="text-2xl font-bold">繁殖牛管理</h1>
        <p className="text-green-200 text-sm">{cows?.length ?? 0}頭登録中</p>
      </header>

      <CowList initialCows={cows ?? []} />
    </div>
  )
}
