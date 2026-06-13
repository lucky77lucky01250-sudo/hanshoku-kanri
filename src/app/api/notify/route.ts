import { createClient } from '@supabase/supabase-js'
import { Resend } from 'resend'
import { NextResponse } from 'next/server'

// このAPIは毎朝8時にSupabase Edge FunctionsのCronから呼ばれる
// または手動でGET /api/notify を叩いてもテストできる

const resend = new Resend(process.env.RESEND_API_KEY)

function addDays(dateStr: string, days: number): string {
  const d = new Date(dateStr + 'T00:00:00')
  d.setDate(d.getDate() + days)
  return d.toISOString().split('T')[0]
}

function formatDate(dateStr: string): string {
  return new Date(dateStr + 'T00:00:00').toLocaleDateString('ja-JP', {
    year: 'numeric', month: 'long', day: 'numeric'
  })
}

function diffDays(dateStr: string): number {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const target = new Date(dateStr + 'T00:00:00')
  return Math.floor((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
}

export async function GET(request: Request) {
  // Cronからの呼び出しを簡易認証（Authorization: Bearer <CRON_SECRET>）
  const authHeader = request.headers.get('authorization')
  const cronSecret = process.env.CRON_SECRET
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY! // Service Role Keyで全ユーザーのデータにアクセス
  )

  const today = new Date().toISOString().split('T')[0]
  let sentCount = 0
  const errors: string[] = []

  try {
    // 通知設定を持つ全ユーザーを取得
    const { data: settings, error: settingsErr } = await supabase
      .from('notification_settings')
      .select('*')

    if (settingsErr) throw settingsErr
    if (!settings || settings.length === 0) {
      return NextResponse.json({ message: '通知設定なし', sent: 0 })
    }

    for (const setting of settings) {
      const userId = setting.user_id
      const notifyEmail = setting.email

      // そのユーザーの全牛を取得
      const { data: cows } = await supabase
        .from('cows')
        .select('*')
        .eq('user_id', userId)

      if (!cows || cows.length === 0) continue

      for (const cow of cows) {
        // 通知対象のイベントを収集
        const notifications: { type: string; date: string; daysUntil: number }[] = []

        // 分娩予定日の通知
        if (cow.current_status === 'calving_pending' && cow.next_action_date) {
          const days = diffDays(cow.next_action_date)
          if ((setting.notify_7days && days === 7) || (setting.notify_3days && days === 3)) {
            notifications.push({ type: '分娩予定', date: cow.next_action_date, daysUntil: days })
          }
        }

        // 妊娠鑑定予定日の通知
        if (cow.current_status === 'pregnancy_check_pending' && cow.next_action_date) {
          const days = diffDays(cow.next_action_date)
          if ((setting.notify_7days && days === 7) || (setting.notify_3days && days === 3)) {
            notifications.push({ type: '妊娠鑑定予定', date: cow.next_action_date, daysUntil: days })
          }
        }

        // 次回発情予定日の通知（種付け済み・未鑑定の場合）
        if (cow.current_status === 'estrus_pending' && cow.next_action_date) {
          const days = diffDays(cow.next_action_date)
          if ((setting.notify_7days && days === 7) || (setting.notify_3days && days === 3)) {
            notifications.push({ type: '次回発情予定', date: cow.next_action_date, daysUntil: days })
          }
        }

        for (const notif of notifications) {
          const notifType = `${notif.type}_${notif.daysUntil}days`

          // 重複送信チェック（notification_logs）
          const { data: existing } = await supabase
            .from('notification_logs')
            .select('id')
            .eq('cow_id', cow.id)
            .eq('notification_type', notifType)
            .eq('scheduled_date', notif.date)
            .maybeSingle()

          if (existing) continue // 既に送信済み

          // メール送信
          const { error: mailErr } = await resend.emails.send({
            from: '繁殖牛管理 <noreply@ryuoshida.com>',
            to: notifyEmail,
            subject: `【繁殖牛管理】${cow.ear_tag} の${notif.type}まで${notif.daysUntil}日前です`,
            html: `
              <div style="font-family: sans-serif; max-width: 500px; margin: 0 auto; padding: 20px;">
                <h2 style="color: #1b4332;">🐂 繁殖牛管理 お知らせ</h2>
                <div style="background: #f0fdf4; border-left: 4px solid #1b4332; padding: 16px; border-radius: 8px; margin: 16px 0;">
                  <p style="font-size: 18px; font-weight: bold; margin: 0;">
                    ${cow.ear_tag} の<strong>${notif.type}</strong>まで<strong>${notif.daysUntil}日</strong>です
                  </p>
                  <p style="color: #555; margin: 8px 0 0;">
                    予定日：${formatDate(notif.date)}
                  </p>
                </div>
                <p style="color: #666; font-size: 14px;">
                  このメールは繁殖牛管理システムから自動送信されています。
                </p>
              </div>
            `,
          })

          if (mailErr) {
            errors.push(`${cow.ear_tag}: ${mailErr.message}`)
            continue
          }

          // 送信ログに記録（失敗すると翌日同じ通知が再送されうるため、エラーを記録して可視化する）
          const { error: logErr } = await supabase.from('notification_logs').insert({
            user_id: userId,
            cow_id: cow.id,
            notification_type: notifType,
            scheduled_date: notif.date,
          })
          if (logErr) {
            errors.push(`${cow.ear_tag}: メール送信は成功しましたが送信ログの記録に失敗しました（重複送信の可能性）: ${logErr.message}`)
          }

          sentCount++
        }
      }
    }

    return NextResponse.json({
      message: '通知処理完了',
      sent: sentCount,
      errors: errors.length > 0 ? errors : undefined,
      date: today,
    })
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
