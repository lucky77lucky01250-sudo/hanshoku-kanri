'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

export default function LoginForm() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isSignUp, setIsSignUp] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const router = useRouter()

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    const supabase = createClient()

    const { error } = isSignUp
      ? await supabase.auth.signUp({ email, password })
      : await supabase.auth.signInWithPassword({ email, password })

    if (error) {
      setError(error.message === 'Invalid login credentials'
        ? 'メールアドレスまたはパスワードが違います'
        : error.message)
    } else {
      router.push('/cows')
      router.refresh()
    }
    setLoading(false)
  }

  const handleGoogleAuth = async () => {
    setLoading(true)
    const supabase = createClient()
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    })
    if (error) setError(error.message)
    setLoading(false)
  }

  return (
    <div className="space-y-4">
      <form onSubmit={handleEmailAuth} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            メールアドレス
          </label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="w-full h-14 px-4 text-lg border-2 border-gray-300 rounded-xl focus:outline-none focus:border-[#1b4332]"
            placeholder="example@email.com"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            パスワード
          </label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={6}
            className="w-full h-14 px-4 text-lg border-2 border-gray-300 rounded-xl focus:outline-none focus:border-[#1b4332]"
            placeholder="6文字以上"
          />
        </div>

        {error && (
          <p className="text-red-500 text-sm bg-red-50 p-3 rounded-lg">{error}</p>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full h-14 bg-[#1b4332] text-white text-xl font-bold rounded-xl disabled:opacity-50"
        >
          {loading ? '処理中...' : isSignUp ? '新規登録' : 'ログイン'}
        </button>
      </form>

      <div className="relative flex items-center">
        <div className="flex-grow border-t border-gray-300" />
        <span className="mx-3 text-gray-400 text-sm">または</span>
        <div className="flex-grow border-t border-gray-300" />
      </div>

      <button
        onClick={handleGoogleAuth}
        disabled={loading}
        className="w-full h-14 bg-white border-2 border-gray-300 text-gray-700 text-lg font-medium rounded-xl flex items-center justify-center gap-3 disabled:opacity-50"
      >
        <svg width="20" height="20" viewBox="0 0 24 24">
          <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
          <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
          <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
          <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
        </svg>
        Googleでログイン
      </button>

      <button
        onClick={() => { setIsSignUp(!isSignUp); setError('') }}
        className="w-full text-center text-[#1b4332] text-base py-2"
      >
        {isSignUp ? 'すでにアカウントをお持ちの方はこちら' : '新規登録はこちら'}
      </button>
    </div>
  )
}
