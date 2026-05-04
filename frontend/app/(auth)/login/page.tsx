"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/hooks/useAuth"
import { Eye, EyeOff, Loader2, Gem } from "lucide-react"
import { Providers } from "@/app/providers"

function LoginForm() {
  const { login } = useAuth()
  const router = useRouter()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [showPw, setShowPw] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(""); setLoading(true)
    try {
      await login(email, password)
      router.push("/dashboard")
    } catch {
      setError("Invalid email or password")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-brand-900 via-brand-800 to-sidebar flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 rounded-2xl bg-amber-500 flex items-center justify-center mx-auto mb-4 shadow-lg">
            <Gem size={28} className="text-white" />
          </div>
          <h1 className="text-2xl font-bold text-white">CaratFlow CRM</h1>
          <p className="text-brand-300 text-sm mt-1">Jewellery ERP · CRM System</p>
        </div>

        <div className="bg-white rounded-2xl shadow-2xl p-8">
          <h2 className="text-lg font-bold text-gray-800 mb-1">Welcome back</h2>
          <p className="text-sm text-gray-400 mb-6">Sign in to your account</p>

          {error && (
            <div className="bg-red-50 border border-red-100 rounded-lg px-4 py-3 text-sm text-red-600 mb-4">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="label">Email address</label>
              <input id="email" type="email" autoComplete="email" required value={email} onChange={e => setEmail(e.target.value)} className="input" placeholder="admin@caratflow.com" />
            </div>
            <div>
              <label className="label">Password</label>
              <div className="relative">
                <input id="password" type={showPw ? "text" : "password"} autoComplete="current-password" required value={password} onChange={e => setPassword(e.target.value)} className="input pr-10" placeholder="••••••••" />
                <button type="button" onClick={() => setShowPw(!showPw)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                  {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>
            <button type="submit" disabled={loading} className="btn-primary w-full justify-center py-2.5 mt-2">
              {loading && <Loader2 size={16} className="animate-spin" />}
              {loading ? "Signing in…" : "Sign in"}
            </button>
          </form>

          <p className="text-center text-xs text-gray-400 mt-6">Contact your administrator if you need access.</p>
        </div>
      </div>
    </div>
  )
}

export default function LoginPage() {
  return (
    <Providers>
      <LoginForm />
    </Providers>
  )
}
