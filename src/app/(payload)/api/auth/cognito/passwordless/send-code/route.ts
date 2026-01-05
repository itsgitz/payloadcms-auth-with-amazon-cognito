import { NextRequest, NextResponse } from 'next/server'
import { getPasswordlessService } from '@/auth/cognito-passwordless'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { email } = body

    if (!email) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 })
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      return NextResponse.json({ error: 'Invalid email format' }, { status: 400 })
    }

    const passwordlessService = getPasswordlessService()

    // Initiate passwordless authentication
    const result = await passwordlessService.sendEmailOTP(email)

    // Create response
    const response = NextResponse.json({
      success: true,
      message: 'Verification code sent to your email',
      session: result.session,
      codeDeliveryDetails: result.codeDeliveryDetails,
    })

    // Store session in httpOnly cookie for CSRF protection
    response.cookies.set('cognito_passwordless_session', result.session, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 600, // 10 minutes
    })

    // Store email for verification step
    response.cookies.set('cognito_passwordless_email', email, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 600, // 10 minutes
    })

    return response
  } catch (error) {
    console.error('Send OTP error:', error)

    // Handle specific Cognito errors
    if (error instanceof Error) {
      if (error.name === 'UserNotFoundException') {
        return NextResponse.json(
          { error: 'User not found. Please sign up first.' },
          { status: 404 },
        )
      }
      if (error.name === 'NotAuthorizedException') {
        return NextResponse.json(
          { error: 'Email OTP is not enabled for this user pool' },
          { status: 403 },
        )
      }
    }

    return NextResponse.json({ error: 'Failed to send verification code' }, { status: 500 })
  }
}
