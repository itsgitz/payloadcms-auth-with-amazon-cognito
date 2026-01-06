import type { Metadata } from 'next'
import './styles.css'

export const metadata: Metadata = {
  title: 'Passwordless Login - Amazon Cognito',
  description: 'Sign in with email verification code',
}

export default function PasswordlessLoginLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
