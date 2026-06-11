import LoginForm from '@/components/auth/LoginForm'

export default function LoginPage() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-6 py-12 bg-white">
      <div className="w-full max-w-sm">
        <div className="text-center mb-10">
          <div className="text-5xl mb-4">🐂</div>
          <h1 className="text-3xl font-bold text-[#1b4332] mb-2">繁殖牛管理</h1>
          <p className="text-gray-500 text-base">繁殖サイクルをシンプルに管理</p>
        </div>
        <LoginForm />
      </div>
    </main>
  )
}
