import { headers as getHeaders } from 'next/headers.js'
import Image from 'next/image'
import { getPayload } from 'payload'
import React from 'react'
import { fileURLToPath } from 'url'

import config from '@/payload.config'
import './styles.css'

export default async function HomePage() {
  const headers = await getHeaders()
  const payloadConfig = await config
  const payload = await getPayload({ config: payloadConfig })
  const { user } = await payload.auth({ headers })

  const fileURL = `vscode://file/${fileURLToPath(import.meta.url)}`

  return (
    <div className="home">
      <div className="content">
        <picture>
          <source srcSet="https://raw.githubusercontent.com/payloadcms/payload/main/packages/ui/src/assets/payload-favicon.svg" />
          <Image
            alt="Payload Logo"
            height={65}
            src="https://raw.githubusercontent.com/payloadcms/payload/main/packages/ui/src/assets/payload-favicon.svg"
            width={65}
          />
        </picture>
        {!user && <h1>Amazon Cognito Authentication Demo</h1>}
        {user && <h1>Welcome back, {user.email}</h1>}

        {!user && (
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
        )}

        {user && (
          <div className="links">
            <a
              className="admin"
              href={payloadConfig.routes.admin}
              rel="noopener noreferrer"
              target="_blank"
            >
              Go to admin panel
            </a>
            <button
              onClick={() => window.location.href = '/api/auth/cognito/logout'}
              className="docs"
              style={{
                border: 'none',
                cursor: 'pointer',
                fontSize: '1rem',
                background: 'transparent',
              }}
            >
              Logout
            </button>
          </div>
        )}
      </div>
      <div className="footer">
        <p>Payload CMS with Amazon Cognito Authentication</p>
        <a className="codeLink" href={fileURL}>
          <code>app/(frontend)/page.tsx</code>
        </a>
      </div>
    </div>
  )
}
