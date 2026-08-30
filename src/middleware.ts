import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseKey || supabaseUrl === 'your_supabase_url') {
    // 本番環境では環境変数が必須
    if (process.env.NODE_ENV === 'production') {
      return new NextResponse('Service unavailable: missing configuration', { status: 503 })
    }
    // 開発環境ではそのまま通過（ローカル確認用）
    return NextResponse.next({ request })
  }

  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    supabaseUrl,
    supabaseKey!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()

  const { pathname } = request.nextUrl

  if (!user && pathname !== '/' && !pathname.startsWith('/auth')) {
    return NextResponse.redirect(new URL('/', request.url))
  }

  if (user && pathname === '/') {
    return NextResponse.redirect(new URL('/cows', request.url))
  }

  return supabaseResponse
}

export const config = {
  // api を除外する。除外しないと Vercel Cron からの /api/notify が
  // 未ログイン扱いで '/' へリダイレクトされ、通知処理が一度も走らない。
  // API側は各ルートが自前で認証する（notify=CRON_SECRET / notify/test=ログイン必須）。
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico|manifest.json|icons).*)'],
}
