'use client'

// 日付入力＋クリアボタン。iOSの標準カレンダーには日付を消す手段がないため、
// 端末を問わず日付を空にできるよう独自のクリアボタンを用意する。
export function ClearableDateInput({
  value,
  onChange,
  className,
  max,
}: {
  value: string
  onChange: (v: string) => void
  className: string
  max?: string
}) {
  return (
    <div className="relative">
      <input
        type="date"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        max={max}
        className={`${className} pr-12`}
      />
      {value && (
        <button
          type="button"
          onClick={() => onChange('')}
          aria-label="日付をクリア"
          className="absolute right-2 top-1/2 -translate-y-1/2 w-10 h-10 flex items-center justify-center text-gray-400 text-2xl rounded-full active:bg-gray-100"
        >
          ×
        </button>
      )}
    </div>
  )
}
