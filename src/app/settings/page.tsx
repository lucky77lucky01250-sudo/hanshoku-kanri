import { createClient } from '@/lib/supabase/server'
import SettingsForm from '@/components/settings/SettingsForm'
import BottomNav from '@/components/layout/BottomNav'
import Link from 'next/link'
import { ChevronLeft } from 'lucide-react'

export default async function SettingsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: settings } = await supabase
    .from('notification_settings')
    .select('*')
    .eq('user_id', user!.id)
    .single()

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      <header className="bg-[#1b4332] text-white px-4 py-5 flex items-center gap-3">
        <Link href="/cows" className="text-white">
          <ChevronLeft size={28} />
        </Link>
        <h1 className="text-2xl font-bold">設定</h1>
      </header>
      <div className="px-4 py-6">
        <SettingsForm
          userId={user!.id}
          userEmail={user!.email ?? ''}
          initialSettings={settings}
        />
      </div>
      <BottomNav />
    </div>
  )
}
