'use client'

import React from 'react'

export function AuthButtons() {
  return (
    <>
      <p style={{ marginBottom: '2rem', color: '#666' }}>
        Choose your preferred authentication method:
      </p>
      <div className="links" style={{ flexDirection: 'column', gap: '1rem' }}>
        <button
          onClick={() => window.location.href = '/api/auth/cognito/login'}
          style={{
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            padding: '1rem 2rem',
            borderRadius: '8px',
            textDecoration: 'none',
            color: 'white',
            fontWeight: '600',
            transition: 'transform 0.2s',
            border: 'none',
            cursor: 'pointer',
            fontSize: '1rem',
            width: '100%',
          }}
          onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-2px)'}
          onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
        >
          🔐 OAuth Login (Cognito Hosted UI)
        </button>
        <button
          onClick={() => window.location.href = '/passwordless-login'}
          style={{
            background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
            padding: '1rem 2rem',
            borderRadius: '8px',
            textDecoration: 'none',
            color: 'white',
            fontWeight: '600',
            transition: 'transform 0.2s',
            border: 'none',
            cursor: 'pointer',
            fontSize: '1rem',
            width: '100%',
          }}
          onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-2px)'}
          onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
        >
          ✉️ Passwordless Login (Email OTP)
        </button>
      </div>
      <div style={{ marginTop: '2rem', padding: '1rem', background: '#f0f9ff', borderRadius: '8px', border: '1px solid #bfdbfe' }}>
        <p style={{ fontSize: '0.875rem', color: '#1e40af', margin: 0 }}>
          <strong>Demo Info:</strong> Both methods authenticate with Amazon Cognito and work with Payload CMS admin panel.
        </p>
      </div>
    </>
  )
}
