import { NextRequest, NextResponse } from 'next/server'
import { getPasswordlessService } from '@/auth/cognito-passwordless'
import { cookies } from 'next/headers'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { code } = body

    if (!code) {
      return NextResponse.json({ error: 'Verification code is required' }, { status: 400 })
    }

    // Get session and email from cookies
    const cookieStore = await cookies()
    const session = cookieStore.get('cognito_passwordless_session')?.value
    const email = cookieStore.get('cognito_passwordless_email')?.value

    if (!session || !email) {
      return NextResponse.json(
        { error: 'Session expired. Please request a new code.' },
        { status: 400 },
      )
    }

    const passwordlessService = getPasswordlessService()

    // Verify the OTP code
    const tokens = await passwordlessService.verifyEmailOTP(email, code, session)

    // Create response with redirect to admin panel
    const response = NextResponse.json({
      success: true,
      message: 'Authentication successful',
      redirectUrl: '/admin',
    })

    // Set tokens in httpOnly cookies (same as OAuth callback)
    response.cookies.set('cognito_access_token', tokens.accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: tokens.expiresIn,
    })

    response.cookies.set('cognito_id_token', tokens.idToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: tokens.expiresIn,
    })

    if (tokens.refreshToken) {
      response.cookies.set('cognito_refresh_token', tokens.refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 60 * 60 * 24 * 30, // 30 days
      })
    }

    // Clear passwordless session cookies
    response.cookies.delete('cognito_passwordless_session')
    response.cookies.delete('cognito_passwordless_email')

    return response
  } catch (error) {
    console.error('Verify OTP error:', error)

    // Handle specific Cognito errors
    if (error instanceof Error) {
      if (error.name === 'CodeMismatchException') {
        return NextResponse.json({ error: 'Invalid verification code' }, { status: 400 })
      }
      if (error.name === 'ExpiredCodeException') {
        return NextResponse.json(
          { error: 'Verification code expired. Please request a new code.' },
          { status: 400 },
        )
      }
      if (error.name === 'NotAuthorizedException') {
        return NextResponse.json({ error: 'Authentication failed' }, { status: 401 })
      }
    }

    return NextResponse.json(
      { error: 'Failed to verify code. Please try again.' },
      { status: 500 },
    )
  }
}
