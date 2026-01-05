import { NextRequest, NextResponse } from 'next/server'
import { getCognitoService } from '@/auth/cognito'
import { cookies } from 'next/headers'

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const code = searchParams.get('code')
    const state = searchParams.get('state')
    const error = searchParams.get('error')

    // Check for OAuth errors
    if (error) {
      const errorDescription = searchParams.get('error_description')
      console.error('Cognito OAuth error:', error, errorDescription)
      return NextResponse.redirect(
        new URL(`/admin/login?error=${encodeURIComponent(error)}`, request.url)
      )
    }

    if (!code) {
      return NextResponse.json(
        { error: 'Authorization code not provided' },
        { status: 400 }
      )
    }

    // Verify state parameter for CSRF protection
    const cookieStore = await cookies()
    const savedState = cookieStore.get('cognito_state')?.value

    if (!state || state !== savedState) {
      return NextResponse.json(
        { error: 'Invalid state parameter' },
        { status: 400 }
      )
    }

    const cognitoService = getCognitoService()
    const redirectUri = process.env.COGNITO_REDIRECT_URI || ''

    // Exchange code for tokens
    const tokens = await cognitoService.exchangeCodeForTokens(code, redirectUri)

    // Verify the ID token to ensure it's valid
    await cognitoService.verifyToken(tokens.id_token)

    // Create response with redirect to admin panel
    const response = NextResponse.redirect(new URL('/admin', request.url))

    // Set tokens in httpOnly cookies
    response.cookies.set('cognito_access_token', tokens.access_token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: tokens.expires_in,
    })

    response.cookies.set('cognito_id_token', tokens.id_token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: tokens.expires_in,
    })

    response.cookies.set('cognito_refresh_token', tokens.refresh_token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 30, // 30 days
    })

    // Clear state cookie
    response.cookies.delete('cognito_state')

    return response
  } catch (error) {
    console.error('Cognito callback error:', error)
    return NextResponse.redirect(
      new URL('/admin/login?error=authentication_failed', request.url)
    )
  }
}
