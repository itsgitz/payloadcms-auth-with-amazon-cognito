import type { CollectionConfig } from 'payload'
import { getCognitoService } from '../auth/cognito'

export const Users: CollectionConfig = {
  slug: 'users',
  admin: {
    useAsTitle: 'email',
  },
  auth: {
    disableLocalStrategy: true,
    strategies: [
      {
        name: 'cognito',
        authenticate: async ({ payload, headers }) => {
          console.log('Custom strategy authentication triggered.')

          // Get the authorization header or cookie
          const authHeader = headers.get('authorization')
          const cookieHeader = headers.get('cookie')

          console.log('authHeader', authHeader)
          console.log('cookieHeader', cookieHeader)

          let token: string | null = null

          // Try to get token from Authorization header first
          if (authHeader && authHeader.startsWith('Bearer ')) {
            token = authHeader.substring(7)
          }
          // Fallback to cookie if no Authorization header
          else if (cookieHeader) {
            const cookies = cookieHeader.split(';').reduce(
              (acc, cookie) => {
                const [key, value] = cookie.trim().split('=')
                acc[key] = value
                return acc
              },
              {} as Record<string, string>,
            )

            token = cookies['cognito_id_token'] || null
          }

          if (!token) {
            return { user: null }
          }

          try {
            const cognitoService = getCognitoService()

            // Verify the Cognito token
            const cognitoUser = await cognitoService.verifyToken(token)

            if (!cognitoUser || !cognitoUser.email) {
              return { user: null }
            }

            // Find or create user in Payload
            const users = await payload.find({
              collection: 'users',
              where: {
                email: {
                  equals: cognitoUser.email,
                },
              },
              limit: 1,
            })

            console.log('User from database', users)

            let user

            if (users.docs.length > 0) {
              // User exists, return it
              user = users.docs[0]
            } else {
              // Create new user
              user = await payload.create({
                collection: 'users',
                data: {
                  email: cognitoUser.email,
                  cognitoSub: cognitoUser.sub,
                  emailVerified: cognitoUser.email_verified || false,
                },
              })
            }

            return {
              user: {
                ...user,
                collection: 'users' as const,
              },
            }
          } catch (error) {
            console.error('Cognito authentication error:', error)
            return { user: null }
          }
        },
      },
    ],
  },
  fields: [
    {
      name: 'email',
      type: 'email',
      required: true,
      unique: true,
      admin: {
        readOnly: true,
      },
    },
    {
      name: 'cognitoSub',
      type: 'text',
      admin: {
        readOnly: true,
      },
      label: 'Cognito User ID',
    },
    {
      name: 'emailVerified',
      type: 'checkbox',
      defaultValue: false,
      admin: {
        readOnly: true,
      },
      label: 'Email Verified',
    },
  ],
}
