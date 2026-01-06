'use client'

import React from 'react'

export function LogoutButton() {
  return (
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
  )
}
