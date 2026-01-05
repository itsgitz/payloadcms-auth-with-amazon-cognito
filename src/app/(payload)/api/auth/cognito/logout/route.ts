import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    const cognitoDomain = process.env.AWS_COGNITO_DOMAIN
    const clientId = process.env.AWS_COGNITO_CLIENT_ID
    const logoutUri = `${request.nextUrl.origin}/admin/login`

    // Create response
    const response = NextResponse.redirect(new URL(logoutUri, request.url))

    // Clear all Cognito cookies
    response.cookies.delete('cognito_access_token')
    response.cookies.delete('cognito_id_token')
    response.cookies.delete('cognito_refresh_token')
    response.cookies.delete('cognito_state')

    // If Cognito domain is configured, redirect to Cognito logout
    if (cognitoDomain && clientId) {
      const cognitoLogoutUrl = `https://${cognitoDomain}/logout?client_id=${clientId}&logout_uri=${encodeURIComponent(logoutUri)}`

      // First clear cookies, then redirect to Cognito logout
      const logoutResponse = NextResponse.redirect(cognitoLogoutUrl)
      logoutResponse.cookies.delete('cognito_access_token')
      logoutResponse.cookies.delete('cognito_id_token')
      logoutResponse.cookies.delete('cognito_refresh_token')
      logoutResponse.cookies.delete('cognito_state')

      return logoutResponse
    }

    return response
  } catch (error) {
    console.error('Cognito logout error:', error)
    return NextResponse.redirect(new URL('/admin/login', request.url))
  }
}
