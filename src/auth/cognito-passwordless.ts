import {
  CognitoIdentityProviderClient,
  InitiateAuthCommand,
  RespondToAuthChallengeCommand,
  AuthFlowType,
  ChallengeNameType,
} from '@aws-sdk/client-cognito-identity-provider'

export interface PasswordlessConfig {
  region: string
  userPoolId: string
  clientId: string
}

export class CognitoPasswordlessService {
  private client: CognitoIdentityProviderClient
  private config: PasswordlessConfig

  constructor(config: PasswordlessConfig) {
    this.config = config
    this.client = new CognitoIdentityProviderClient({
      region: config.region,
    })
  }

  /**
   * Initiate passwordless authentication with email OTP
   */
  async sendEmailOTP(email: string): Promise<{
    session: string
    codeDeliveryDetails?: {
      destination?: string
      deliveryMedium?: string
      attributeName?: string
    }
  }> {
    const command = new InitiateAuthCommand({
      ClientId: this.config.clientId,
      AuthFlow: AuthFlowType.USER_AUTH,
      AuthParameters: {
        USERNAME: email,
      },
      Session: undefined,
    })

    const response = await this.client.send(command)

    if (!response.Session) {
      throw new Error('Failed to initiate authentication')
    }

    return {
      session: response.Session,
      codeDeliveryDetails: response.ChallengeParameters?.CODE_DELIVERY_DESTINATION
        ? {
            destination: response.ChallengeParameters.CODE_DELIVERY_DESTINATION,
            deliveryMedium: response.ChallengeParameters.CODE_DELIVERY_DELIVERY_MEDIUM,
            attributeName: response.ChallengeParameters.CODE_DELIVERY_ATTRIBUTE_NAME,
          }
        : undefined,
    }
  }

  /**
   * Verify the OTP code and get tokens
   */
  async verifyEmailOTP(
    email: string,
    code: string,
    session: string,
  ): Promise<{
    accessToken: string
    idToken: string
    refreshToken: string
    expiresIn: number
  }> {
    const command = new RespondToAuthChallengeCommand({
      ClientId: this.config.clientId,
      ChallengeName: ChallengeNameType.EMAIL_OTP,
      ChallengeResponses: {
        USERNAME: email,
        EMAIL_OTP_CODE: code,
      },
      Session: session,
    })

    const response = await this.client.send(command)

    if (
      !response.AuthenticationResult ||
      !response.AuthenticationResult.AccessToken ||
      !response.AuthenticationResult.IdToken
    ) {
      throw new Error('Invalid OTP code or session expired')
    }

    return {
      accessToken: response.AuthenticationResult.AccessToken,
      idToken: response.AuthenticationResult.IdToken,
      refreshToken: response.AuthenticationResult.RefreshToken || '',
      expiresIn: response.AuthenticationResult.ExpiresIn || 3600,
    }
  }
}

// Singleton instance
let passwordlessService: CognitoPasswordlessService | null = null

export function getPasswordlessService(): CognitoPasswordlessService {
  if (!passwordlessService) {
    const config: PasswordlessConfig = {
      region: process.env.AWS_REGION || '',
      userPoolId: process.env.AWS_COGNITO_USER_POOL_ID || '',
      clientId: process.env.AWS_COGNITO_CLIENT_ID || '',
    }

    if (!config.region || !config.userPoolId || !config.clientId) {
      throw new Error('Missing required Cognito configuration for passwordless auth')
    }

    passwordlessService = new CognitoPasswordlessService(config)
  }

  return passwordlessService
}
