import CowNewForm from '@/components/cows/CowNewForm'
import Link from 'next/link'
import { ChevronLeft } from 'lucide-react'

export default function CowNewPage() {
  return (
    <div>
      <header className="bg-[#1b4332] text-white px-4 py-5 flex items-center gap-3">
        <Link href="/cows" className="text-white">
          <ChevronLeft size={28} />
        </Link>
        <h1 className="text-2xl font-bold">牛を登録</h1>
      </header>
      <div className="px-4 py-6">
        <CowNewForm />
      </div>
    </div>
  )
}
