import { NextRequest, NextResponse } from 'next/server'
import { getCognitoService } from '@/auth/cognito'

export async function GET(_request: NextRequest) {
  try {
    const redirectUri = process.env.COGNITO_REDIRECT_URI || ''

    if (!redirectUri) {
      return NextResponse.json(
        { error: 'Cognito redirect URI not configured' },
        { status: 500 }
      )
    }

    const cognitoService = getCognitoService()

    // Generate a random state parameter for CSRF protection
    const state = crypto.randomUUID()

    // Store state in cookie for verification
    const response = NextResponse.redirect(
      cognitoService.getAuthorizationUrl(redirectUri, state)
    )

    response.cookies.set('cognito_state', state, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 600, // 10 minutes
    })

    return response
  } catch (error) {
    console.error('Cognito login error:', error)
    return NextResponse.json(
      { error: 'Failed to initiate Cognito login' },
      { status: 500 }
    )
  }
}
