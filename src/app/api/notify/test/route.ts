import { createClient } from '@/lib/supabase/server'
import { Resend } from 'resend'
import { NextResponse } from 'next/server'

// 設定画面の「テスト送信」から呼ばれる。ログインユーザー本人にテストメールを送る。
const resend = new Resend(process.env.RESEND_API_KEY)

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: '認証が必要です' }, { status: 401 })
  }

  // 送信先はサーバ側でログインユーザー本人に固定する（任意宛先への踏み台送信を防ぐ）。
  // 設定画面で別アドレスを通知先にしている場合のみ、その値を許可する。
  let to = user.email ?? ''
  try {
    const body = await request.json()
    if (body?.email) {
      const { data: setting } = await supabase
        .from('notification_settings')
        .select('email')
        .eq('user_id', user.id)
        .maybeSingle()
      // 本人のメール、または保存済みの通知先メールと一致する場合のみ許可
      if (body.email === user.email || (setting && body.email === setting.email)) {
        to = String(body.email)
      }
    }
  } catch {}

  if (!to) {
    return NextResponse.json({ error: '送信先メールアドレスがありません' }, { status: 400 })
  }

  const { error } = await resend.emails.send({
    from: '繁殖牛管理 <noreply@ryuoshida.com>',
    to,
    subject: '【繁殖牛管理】テスト通知',
    html: `
      <div style="font-family: sans-serif; max-width: 500px; margin: 0 auto; padding: 20px;">
        <h2 style="color: #1b4332;">🐂 繁殖牛管理 テスト通知</h2>
        <div style="background: #f0fdf4; border-left: 4px solid #1b4332; padding: 16px; border-radius: 8px; margin: 16px 0;">
          <p style="font-size: 18px; font-weight: bold; margin: 0;">
            メール通知は正常に設定されています ✅
          </p>
          <p style="color: #555; margin: 8px 0 0;">
            このメールが届いていれば、予定日が近づいた牛のお知らせも届きます。
          </p>
        </div>
        <p style="color: #666; font-size: 14px;">
          これは設定確認用のテストメールです。
        </p>
      </div>
    `,
  })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ message: 'テストメールを送信しました', to })
}
