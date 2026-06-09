import Link from 'next/link'
import { Home, Settings, Plus } from 'lucide-react'

export default function BottomNav() {
  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white border-t-2 border-gray-200 flex items-center justify-around h-20 px-4 z-50">
      <Link href="/cows" className="flex flex-col items-center gap-1 text-[#1b4332] min-w-[60px]">
        <Home size={24} />
        <span className="text-xs font-medium">牛一覧</span>
      </Link>

      <Link
        href="/cows/new"
        className="flex flex-col items-center justify-center w-16 h-16 bg-[#1b4332] text-white rounded-full shadow-lg -mt-6"
      >
        <Plus size={28} />
        <span className="text-xs font-medium">登録</span>
      </Link>

      <Link href="/settings" className="flex flex-col items-center gap-1 text-gray-500 min-w-[60px]">
        <Settings size={24} />
        <span className="text-xs font-medium">設定</span>
      </Link>
    </nav>
  )
}
