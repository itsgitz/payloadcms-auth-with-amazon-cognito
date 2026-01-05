'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function PasswordlessLoginPage() {
  const router = useRouter()
  const [step, setStep] = useState<'email' | 'code'>('email')
  const [email, setEmail] = useState('')
  const [code, setCode] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')

  const handleSendCode = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    setMessage('')

    try {
      const response = await fetch('/api/auth/cognito/passwordless/send-code', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to send code')
      }

      setMessage(data.message || 'Verification code sent to your email')
      setStep('code')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send code')
    } finally {
      setLoading(false)
    }
  }

  const handleVerifyCode = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    setMessage('')

    try {
      const response = await fetch('/api/auth/cognito/passwordless/verify-code', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ code }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to verify code')
      }

      setMessage('Authentication successful! Redirecting...')
      setTimeout(() => {
        router.push(data.redirectUrl || '/admin')
      }, 1000)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to verify code')
    } finally {
      setLoading(false)
    }
  }

  const handleResendCode = async () => {
    setCode('')
    setError('')
    setMessage('')
    const submitEvent = { preventDefault: () => {} } as React.FormEvent
    await handleSendCode(submitEvent)
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 px-4">
      <div className="max-w-md w-full">
        <div className="bg-white rounded-2xl shadow-xl p-8">
          {/* Header */}
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Passwordless Login</h1>
            <p className="text-gray-600">
              {step === 'email'
                ? 'Enter your email to receive a verification code'
                : 'Enter the code sent to your email'}
            </p>
          </div>

          {/* Email Step */}
          {step === 'email' && (
            <form onSubmit={handleSendCode} className="space-y-6">
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                  Email Address
                </label>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition"
                  placeholder="you@example.com"
                  disabled={loading}
                />
              </div>

              {error && (
                <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                  <p className="text-sm text-red-600">{error}</p>
                </div>
              )}

              {message && (
                <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                  <p className="text-sm text-green-600">{message}</p>
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 px-4 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Sending Code...' : 'Send Verification Code'}
              </button>

              <div className="text-center">
                <button
                  type="button"
                  onClick={() => window.location.href = '/'}
                  className="text-sm text-indigo-600 hover:text-indigo-700 font-medium bg-transparent border-none cursor-pointer"
                >
                  ← Back to login options
                </button>
              </div>
            </form>
          )}

          {/* Code Verification Step */}
          {step === 'code' && (
            <form onSubmit={handleVerifyCode} className="space-y-6">
              <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg mb-6">
                <p className="text-sm text-blue-700">
                  <strong>Code sent to:</strong> {email}
                </p>
              </div>

              <div>
                <label htmlFor="code" className="block text-sm font-medium text-gray-700 mb-2">
                  Verification Code
                </label>
                <input
                  id="code"
                  type="text"
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  required
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition text-center text-2xl tracking-widest"
                  placeholder="000000"
                  maxLength={6}
                  disabled={loading}
                  autoFocus
                />
              </div>

              {error && (
                <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                  <p className="text-sm text-red-600">{error}</p>
                </div>
              )}

              {message && (
                <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                  <p className="text-sm text-green-600">{message}</p>
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 px-4 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Verifying...' : 'Verify & Login'}
              </button>

              <div className="flex justify-between items-center text-sm">
                <button
                  type="button"
                  onClick={handleResendCode}
                  disabled={loading}
                  className="text-indigo-600 hover:text-indigo-700 font-medium disabled:opacity-50"
                >
                  Resend Code
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setStep('email')
                    setCode('')
                    setError('')
                    setMessage('')
                  }}
                  className="text-gray-600 hover:text-gray-700 font-medium"
                >
                  Change Email
                </button>
              </div>
            </form>
          )}
        </div>

        {/* Footer Info */}
        <div className="mt-6 text-center text-sm text-gray-600">
          <p>Secured with Amazon Cognito</p>
        </div>
      </div>
    </div>
  )
}
