import BottomNav from '@/components/layout/BottomNav'

export default function CowsLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-gray-50 pb-[calc(6rem+env(safe-area-inset-bottom))]">
      {children}
      <BottomNav />
    </div>
  )
}
