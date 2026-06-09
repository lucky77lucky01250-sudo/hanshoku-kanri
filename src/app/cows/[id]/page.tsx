import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ChevronLeft } from 'lucide-react'
import CowDetail from '@/components/cows/CowDetail'
import type { Database } from '@/types/database'

type Cow = Database['public']['Tables']['cows']['Row']

export default async function CowDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: cowData } = await supabase
    .from('cows')
    .select('*')
    .eq('id', id)
    .eq('user_id', user!.id)
    .single()

  if (!cowData) notFound()
  const cow = cowData as Cow

  const { data: cycles } = await supabase
    .from('breeding_cycles')
    .select(`
      *,
      breeding_events(*),
      insemination_records(*)
    `)
    .eq('cow_id', id)
    .order('cycle_number', { ascending: false })

  return (
    <div>
      <header className="bg-[#1b4332] text-white px-4 py-5 flex items-center gap-3">
        <Link href="/cows" className="text-white">
          <ChevronLeft size={28} />
        </Link>
        <div>
          <h1 className="text-2xl font-bold">{cow.ear_tag}</h1>
          {cow.birth_date && (
            <p className="text-green-200 text-sm">
              {new Date(cow.birth_date).toLocaleDateString('ja-JP')} 生まれ
            </p>
          )}
        </div>
      </header>
      <CowDetail cow={cow} cycles={cycles ?? []} />
    </div>
  )
}
