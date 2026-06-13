import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ChevronLeft } from 'lucide-react'
import RecordForm from '@/components/cows/RecordForm'

const STEP_LABELS: Record<string, string> = {
  estrus: '発情確認を記録',
  insemination: '種付けを記録',
  pregnancy_check: '妊娠鑑定を記録',
  calving: '分娩を記録',
}

export default async function RecordPage({
  params,
}: {
  params: Promise<{ id: string; step: string }>
}) {
  const { id, step } = await params
  if (!STEP_LABELS[step]) notFound()

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: cowData } = await supabase
    .from('cows')
    .select('*')
    .eq('id', id)
    .eq('user_id', user!.id)
    .single()

  if (!cowData) notFound()
  const cow = cowData as { ear_tag: string; id: string }

  // 過去の精液名を取得（サジェスト用）
  const { data: pastSemen } = await supabase
    .from('insemination_records')
    .select('semen_name')
    .eq('user_id', user!.id)
    .not('semen_name', 'is', null)
    .order('created_at', { ascending: false })
    .limit(20)

  const allSemen = (pastSemen ?? []).map((s: { semen_name: string | null }) => s.semen_name).filter((v): v is string => !!v)
  const uniqueSemen = allSemen.filter((v, i, arr) => arr.indexOf(v) === i)

  // 妊娠鑑定の分娩予定日プレフィル用：現在サイクルの最新の授精日を取得
  let latestInseminationDate: string | null = null
  if (step === 'pregnancy_check') {
    const { data: cycle } = await supabase
      .from('breeding_cycles')
      .select('id, insemination_records(insemination_date, attempt_number)')
      .eq('cow_id', id)
      .order('cycle_number', { ascending: false })
      .limit(1)
      .maybeSingle()
    const records = (cycle?.insemination_records ?? []) as { insemination_date: string; attempt_number: number }[]
    latestInseminationDate = records.sort((a, b) => b.attempt_number - a.attempt_number)[0]?.insemination_date ?? null
  }

  return (
    <div>
      <header className="bg-[#1b4332] text-white px-4 py-5 flex items-center gap-3">
        <Link href={`/cows/${id}`} className="text-white">
          <ChevronLeft size={28} />
        </Link>
        <div>
          <h1 className="text-2xl font-bold">{STEP_LABELS[step]}</h1>
          <p className="text-green-200 text-sm">{cow.ear_tag}</p>
        </div>
      </header>
      <div className="px-4 py-6">
        <RecordForm cowId={id} step={step} pastSemen={uniqueSemen as string[]} inseminationDate={latestInseminationDate} />
      </div>
    </div>
  )
}
