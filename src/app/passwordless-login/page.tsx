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
    <div className="passwordless-container">
      <div>
        <div className="passwordless-card">
          {/* Header */}
          <div className="passwordless-header">
            <h1>Passwordless Login</h1>
            <p>
              {step === 'email'
                ? 'Enter your email to receive a verification code'
                : 'Enter the code sent to your email'}
            </p>
          </div>

          {/* Email Step */}
          {step === 'email' && (
            <form onSubmit={handleSendCode} className="passwordless-form">
              <div className="form-group">
                <label htmlFor="email">Email Address</label>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  placeholder="you@example.com"
                  disabled={loading}
                />
              </div>

              {error && (
                <div className="alert alert-error">
                  <p>{error}</p>
                </div>
              )}

              {message && (
                <div className="alert alert-success">
                  <p>{message}</p>
                </div>
              )}

              <button type="submit" disabled={loading} className="btn btn-primary">
                {loading ? 'Sending Code...' : 'Send Verification Code'}
              </button>

              <div className="text-center">
                <button
                  type="button"
                  onClick={() => (window.location.href = '/')}
                  className="btn-link"
                >
                  ← Back to login options
                </button>
              </div>
            </form>
          )}

          {/* Code Verification Step */}
          {step === 'code' && (
            <form onSubmit={handleVerifyCode} className="passwordless-form">
              <div className="alert alert-info">
                <p>
                  <strong>Code sent to:</strong> {email}
                </p>
              </div>

              <div className="form-group">
                <label htmlFor="code">Verification Code</label>
                <input
                  id="code"
                  type="text"
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  required
                  className="code-input"
                  placeholder="000000"
                  maxLength={8}
                  disabled={loading}
                  autoFocus
                />
              </div>

              {error && (
                <div className="alert alert-error">
                  <p>{error}</p>
                </div>
              )}

              {message && (
                <div className="alert alert-success">
                  <p>{message}</p>
                </div>
              )}

              <button type="submit" disabled={loading} className="btn btn-primary">
                {loading ? 'Verifying...' : 'Verify & Login'}
              </button>

              <div className="form-actions">
                <button
                  type="button"
                  onClick={handleResendCode}
                  disabled={loading}
                  className="btn-link"
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
                  className="btn-link-gray"
                >
                  Change Email
                </button>
              </div>
            </form>
          )}
        </div>

        {/* Footer Info */}
        <div className="passwordless-footer">
          <p>Secured with Amazon Cognito</p>
        </div>
      </div>
    </div>
  )
}
