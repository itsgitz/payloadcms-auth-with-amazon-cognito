import jwt from 'jsonwebtoken'
import jwksClient from 'jwks-rsa'

export interface CognitoConfig {
  region: string
  userPoolId: string
  clientId: string
  domain: string
}

export interface CognitoUser {
  sub: string
  email: string
  email_verified?: boolean
  name?: string
  given_name?: string
  family_name?: string
}

export class CognitoAuthService {
  private config: CognitoConfig
  private jwksClient: jwksClient.JwksClient

  constructor(config: CognitoConfig) {
    this.config = config
    this.jwksClient = jwksClient({
      jwksUri: `https://cognito-idp.${config.region}.amazonaws.com/${config.userPoolId}/.well-known/jwks.json`,
      cache: true,
      cacheMaxAge: 600000, // 10 minutes
    })
  }

  /**
   * Verify JWT token from Cognito
   */
  async verifyToken(token: string): Promise<CognitoUser> {
    return new Promise((resolve, reject) => {
      const decoded = jwt.decode(token, { complete: true })

      if (!decoded || typeof decoded === 'string') {
        return reject(new Error('Invalid token'))
      }

      const { kid } = decoded.header

      this.jwksClient.getSigningKey(kid, (err, key) => {
        if (err) {
          return reject(err)
        }

        const signingKey = key?.getPublicKey()

        if (!signingKey) {
          return reject(new Error('Unable to get signing key'))
        }

        jwt.verify(
          token,
          signingKey,
          {
            algorithms: ['RS256'],
            issuer: `https://cognito-idp.${this.config.region}.amazonaws.com/${this.config.userPoolId}`,
            audience: this.config.clientId,
          },
          (err, decoded) => {
            if (err) {
              return reject(err)
            }

            resolve(decoded as CognitoUser)
          },
        )
      })
    })
  }

  /**
   * Get Cognito OAuth authorization URL
   */
  getAuthorizationUrl(redirectUri: string, state?: string): string {
    const params = new URLSearchParams({
      client_id: this.config.clientId,
      response_type: 'code',
      redirect_uri: redirectUri,
      scope: 'openid email profile',
    })

    if (state) {
      params.append('state', state)
    }

    return `https://${this.config.domain}/oauth2/authorize?${params.toString()}`
  }

  /**
   * Exchange authorization code for tokens
   */
  async exchangeCodeForTokens(code: string, redirectUri: string): Promise<{
    access_token: string
    id_token: string
    refresh_token: string
    expires_in: number
    token_type: string
  }> {
    const params = new URLSearchParams({
      grant_type: 'authorization_code',
      client_id: this.config.clientId,
      code,
      redirect_uri: redirectUri,
    })

    const response = await fetch(`https://${this.config.domain}/oauth2/token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: params.toString(),
    })

    if (!response.ok) {
      const error = await response.text()
      throw new Error(`Token exchange failed: ${error}`)
    }

    return response.json()
  }

  /**
   * Get user info from access token
   */
  async getUserInfo(accessToken: string): Promise<CognitoUser> {
    const response = await fetch(`https://${this.config.domain}/oauth2/userInfo`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    })

    if (!response.ok) {
      const error = await response.text()
      throw new Error(`Failed to get user info: ${error}`)
    }

    return response.json()
  }
}

// Singleton instance
let cognitoService: CognitoAuthService | null = null

export function getCognitoService(): CognitoAuthService {
  if (!cognitoService) {
    const config: CognitoConfig = {
      region: process.env.AWS_REGION || '',
      userPoolId: process.env.AWS_COGNITO_USER_POOL_ID || '',
      clientId: process.env.AWS_COGNITO_CLIENT_ID || '',
      domain: process.env.AWS_COGNITO_DOMAIN || '',
    }

    if (!config.region || !config.userPoolId || !config.clientId || !config.domain) {
      throw new Error('Missing required Cognito configuration')
    }

    cognitoService = new CognitoAuthService(config)
  }

  return cognitoService
}
