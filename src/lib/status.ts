import type { CowStatus } from '@/types/database'

export type StatusConfig = {
  label: string
  icon: string
  color: string
  bgColor: string
  borderColor: string
}

export const STATUS_CONFIG: Record<CowStatus, StatusConfig> = {
  estrus_pending: {
    label: '発情確認待ち',
    icon: '🔴',
    color: 'text-red-700',
    bgColor: 'bg-red-50',
    borderColor: 'border-red-200',
  },
  inseminated: {
    label: '種付け待ち',
    icon: '🟡',
    color: 'text-yellow-700',
    bgColor: 'bg-yellow-50',
    borderColor: 'border-yellow-200',
  },
  pregnancy_check_pending: {
    label: '妊娠鑑定待ち',
    icon: '🟠',
    color: 'text-orange-700',
    bgColor: 'bg-orange-50',
    borderColor: 'border-orange-200',
  },
  calving_pending: {
    label: '分娩待ち',
    icon: '🟢',
    color: 'text-green-700',
    bgColor: 'bg-green-50',
    borderColor: 'border-green-200',
  },
  idle: {
    label: '待機中',
    icon: '⚪',
    color: 'text-gray-500',
    bgColor: 'bg-gray-50',
    borderColor: 'border-gray-200',
  },
}

export function getUrgencyLabel(dateStr: string | null): { label: string; urgent: boolean } | null {
  if (!dateStr) return null
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const target = new Date(dateStr)
  target.setHours(0, 0, 0, 0)
  const diff = Math.floor((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))

  if (diff < 0) return { label: `⚠️ ${Math.abs(diff)}日超過`, urgent: true }
  if (diff === 0) return { label: '本日', urgent: true }
  if (diff <= 7) return { label: `${diff}日後`, urgent: false }
  return { label: `${diff}日後`, urgent: false }
}
