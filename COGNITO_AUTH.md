# Payload CMS Authentication with Amazon Cognito

This document explains how Amazon Cognito authentication is integrated with Payload CMS in this project.

## Overview

This implementation uses a custom authentication strategy in Payload CMS to authenticate users via Amazon Cognito. The local authentication strategy is disabled, and all authentication is handled through Cognito.

**Two authentication methods are supported:**
1. **OAuth 2.0 Flow** - Traditional redirect-based authentication using Cognito Hosted UI
2. **Passwordless Email OTP** - Modern passwordless authentication with one-time codes sent via email

## Architecture

### Components

1. **Cognito Service** (`src/auth/cognito.ts`)
   - Handles JWT token verification using Cognito's JWKS
   - Provides OAuth 2.0 authorization URL generation
   - Exchanges authorization codes for tokens
   - Retrieves user information from Cognito

2. **Cognito Passwordless Service** (`src/auth/cognito-passwordless.ts`)
   - Initiates EMAIL_OTP authentication flow
   - Sends one-time codes via email
   - Verifies OTP codes and returns tokens

3. **API Routes** (`src/app/(payload)/api/auth/cognito/`)
   - OAuth Routes:
     - `/login` - Initiates OAuth flow with Cognito
     - `/callback` - Handles OAuth callback and token exchange
   - Passwordless Routes:
     - `/passwordless/send-code` - Sends OTP to user's email
     - `/passwordless/verify-code` - Verifies OTP and sets auth cookies
   - Shared:
     - `/logout` - Clears session and logs out from Cognito

4. **Custom Authentication Strategy** (`src/collections/Users.ts`)
   - Verifies Cognito tokens from both Authorization headers and cookies
   - Creates or retrieves users in Payload database
   - Syncs user data from Cognito to Payload
   - **Works with both OAuth and Passwordless flows**

## Authentication Flows

### Method 1: OAuth 2.0 Flow (Traditional)

```
User → /api/auth/cognito/login
  ↓
Generates state (CSRF protection)
  ↓
Redirects to Cognito OAuth authorize endpoint
  ↓
User authenticates with Cognito
  ↓
Cognito redirects to /api/auth/cognito/callback?code=xxx&state=xxx
  ↓
Verifies state parameter
  ↓
Exchanges authorization code for tokens
  ↓
Stores tokens in httpOnly cookies:
  - cognito_access_token
  - cognito_id_token
  - cognito_refresh_token
  ↓
Redirects to /admin (Payload admin panel)
  ↓
Payload's custom strategy reads cognito_id_token from cookies
  ↓
Verifies token with Cognito JWKS
  ↓
Finds or creates user in Payload database
  ↓
User is authenticated and can access admin panel
```

### Method 2: Passwordless Email OTP Flow (Modern)

```
User → /passwordless-login page
  ↓
Enters email address
  ↓
POST /api/auth/cognito/passwordless/send-code
  ↓
Calls Cognito InitiateAuth with USER_AUTH flow
  ↓
Cognito sends OTP code to user's email
  ↓
Stores session + email in httpOnly cookies (CSRF protection)
  ↓
User receives email with 6-digit code
  ↓
User enters code on verification page
  ↓
POST /api/auth/cognito/passwordless/verify-code
  ↓
Calls Cognito RespondToAuthChallenge with EMAIL_OTP
  ↓
Cognito validates code and returns tokens
  ↓
Stores tokens in httpOnly cookies:
  - cognito_access_token
  - cognito_id_token
  - cognito_refresh_token
  ↓
Redirects to /admin (Payload admin panel)
  ↓
Payload's custom strategy reads cognito_id_token from cookies
  ↓
Verifies token with Cognito JWKS
  ↓
Finds or creates user in Payload database
  ↓
User is authenticated and can access admin panel
```

### Logout Flow (Shared by Both Methods)

```
User → /api/auth/cognito/logout
  ↓
Clears all Cognito cookies:
  - cognito_access_token
  - cognito_id_token
  - cognito_refresh_token
  - cognito_state
  ↓
Redirects to Cognito logout endpoint
  ↓
Cognito logs out user from all sessions
  ↓
Cognito redirects to /admin/login
```

## Key Implementation Details

### Custom Authentication Strategy

The custom strategy in `src/collections/Users.ts` implements dual token source support:

```typescript
authenticate: async ({ payload, headers }) => {
  // 1. Try Authorization header first (for API requests)
  const authHeader = headers.get('authorization')
  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.substring(7)
  }
  // 2. Fallback to cookies (for admin panel)
  else if (cookieHeader) {
    token = cookies['cognito_id_token']
  }

  // 3. Verify token with Cognito
  const cognitoUser = await cognitoService.verifyToken(token)

  // 4. Find or create user in Payload
  // 5. Return authenticated user
}
```

**Why both sources?**
- **Authorization header**: Used for API requests where clients send `Authorization: Bearer <token>`
- **Cookies**: Used by Payload's admin panel, which relies on cookie-based sessions

Without cookie support, users would be redirected back to login after authenticating because Payload's admin panel doesn't send Authorization headers.

### Token Storage

Tokens are stored in httpOnly cookies for security:

```typescript
response.cookies.set('cognito_id_token', tokens.id_token, {
  httpOnly: true,                           // Prevents XSS attacks
  secure: process.env.NODE_ENV === 'production', // HTTPS only in production
  sameSite: 'lax',                          // CSRF protection
  maxAge: tokens.expires_in,                // Auto-expire with token
})
```

### CSRF Protection

State parameter is used to prevent CSRF attacks:

1. Login route generates random UUID state
2. Stores state in cookie
3. Callback route verifies state matches
4. Rejects requests with mismatched state

### User Synchronization

When a user authenticates:

1. Token is verified with Cognito
2. User email from token is used to find user in Payload
3. If user doesn't exist, create new user with:
   - `email` from Cognito token
   - `cognitoSub` (Cognito user ID)
   - `emailVerified` status
4. User is returned to Payload for session creation

## Environment Variables

Required configuration in `.env`:

```bash
# AWS Cognito Configuration
AWS_REGION=us-east-1
AWS_COGNITO_USER_POOL_ID=us-east-1_xxxxxxxxx
AWS_COGNITO_CLIENT_ID=your-client-id
AWS_COGNITO_DOMAIN=your-domain.auth.us-east-1.amazoncognito.com
COGNITO_REDIRECT_URI=http://localhost:3000/api/auth/cognito/callback

# Payload CMS
DATABASE_URL=mongodb://127.0.0.1/your-database-name
PAYLOAD_SECRET=your-secret-here
```

## Cognito Configuration Requirements

### User Pool Settings

1. **App Client Configuration**
   - Enable OAuth 2.0 flows: Authorization code grant
   - Add callback URL: `http://localhost:3000/api/auth/cognito/callback` (or your production URL)
   - Add sign-out URL: `http://localhost:3000/admin/login`
   - OAuth scopes: `openid`, `email`, `profile`

2. **Domain Configuration**
   - Configure a Cognito domain (e.g., `your-app.auth.us-east-1.amazoncognito.com`)
   - Use this domain in `AWS_COGNITO_DOMAIN` environment variable

3. **User Pool Attributes**
   - Email (required)
   - Email verification (recommended)

4. **Passwordless Authentication (EMAIL_OTP)**
   - Go to AWS Cognito Console → User Pools → Your User Pool
   - Navigate to **Sign-in experience** tab
   - Under **Authentication flows**, enable:
     - ✅ **USER_AUTH** flow
     - ✅ **EMAIL_OTP** as preferred authentication method
   - Under **User authentication**, configure:
     - Email as a sign-in option
     - Email verification required
   - Save changes

   **Important Notes:**
   - Users must have verified email addresses in Cognito to use EMAIL_OTP
   - OTP codes are typically 6 digits and expire after 3 minutes
   - Cognito handles email sending automatically (using Amazon SES in background)

## Security Considerations

1. **Token Verification**: All tokens are verified against Cognito's JWKS endpoint
2. **HttpOnly Cookies**: Prevents XSS attacks from stealing tokens
3. **CSRF Protection**: State parameter validates OAuth callbacks
4. **Secure Cookies**: HTTPS-only in production
5. **Token Expiration**: Tokens automatically expire based on Cognito settings
6. **No Local Credentials**: Local authentication is disabled (`disableLocalStrategy: true`)

## API Endpoints

### GET `/api/auth/cognito/login`

Initiates OAuth 2.0 authorization flow.

**Response**: Redirects to Cognito authorization page

### GET `/api/auth/cognito/callback`

Handles OAuth callback from Cognito.

**Query Parameters**:
- `code` - Authorization code from Cognito
- `state` - CSRF protection token

**Response**: Redirects to `/admin` with authentication cookies set

### GET `/api/auth/cognito/logout`

Logs out user from both application and Cognito.

**Response**: Redirects to Cognito logout endpoint

## User Fields

The Users collection includes these Cognito-specific fields:

```typescript
{
  email: string           // User's email from Cognito
  cognitoSub: string     // Cognito user ID (unique identifier)
  emailVerified: boolean // Email verification status from Cognito
}
```

All fields are read-only in the admin panel to prevent manual modification.

## Troubleshooting

### Issue: User redirected to login after successful Cognito authentication

**Cause**: Custom strategy only checking Authorization headers, not cookies

**Solution**: Ensure the custom strategy includes cookie fallback (already implemented in this project)

### Issue: "Invalid state parameter" error

**Cause**: State cookie expired or CSRF attack

**Solution**:
- Check cookie settings (httpOnly, sameSite)
- Ensure cookies are enabled in browser
- State cookies expire after 10 minutes - try logging in again

### Issue: "Token exchange failed"

**Cause**: Incorrect Cognito configuration or expired authorization code

**Solution**:
- Verify `COGNITO_REDIRECT_URI` matches callback URL in Cognito app client
- Verify `AWS_COGNITO_CLIENT_ID` is correct
- Authorization codes expire quickly - don't refresh the callback page

### Issue: JWT verification fails

**Cause**: Token validation issues

**Solution**:
- Verify `AWS_COGNITO_USER_POOL_ID` is correct
- Verify `AWS_REGION` matches your user pool region
- Check token hasn't expired

### Issue: EMAIL_OTP not working / "NotAuthorizedException"

**Cause**: EMAIL_OTP flow not enabled in Cognito User Pool

**Solution**:
- Enable USER_AUTH flow in Cognito console
- Enable EMAIL_OTP as authentication method
- Ensure user's email is verified in Cognito
- Check that email is configured as sign-in option

### Issue: OTP code not received

**Cause**: Email delivery issues or verification status

**Solution**:
- Check user's email is verified in Cognito User Pool
- Verify Amazon SES is properly configured (if using custom email)
- Check spam/junk folder
- Ensure email attribute exists for the user
- Try resending the code (codes expire after 3 minutes)

## Why AWS SDK Instead of Amplify v6 Gen 2?

This implementation uses `@aws-sdk/client-cognito-identity-provider` directly rather than AWS Amplify v6 Gen 2 for several important architectural reasons:

### 1. **Server-Side vs Client-Side Architecture**
- **Amplify v6 Gen 2** is designed primarily for **client-side** (frontend) authentication in React/Next.js applications
- This implementation is **server-side** (Next.js API routes) with backend token management
- The AWS SDK provides direct control over server-side authentication flows through Next.js API routes

### 2. **Custom Payload CMS Integration**
- Payload CMS requires a **custom authentication strategy** (implemented in `src/collections/Users.ts`)
- This strategy needs **direct token verification** and user synchronization on the backend
- Amplify's frontend-focused approach doesn't integrate cleanly with Payload's server-side custom auth strategy
- The custom strategy reads tokens from httpOnly cookies, which Amplify doesn't natively support

### 3. **Security: HttpOnly Cookie Management**
- All tokens are stored in **httpOnly cookies** for maximum security (prevents XSS attacks)
- Cookie setting and management happens entirely on the server-side in API routes
- Amplify v6 typically manages tokens in browser storage (localStorage/sessionStorage), which is vulnerable to XSS
- Server-side cookie management ensures tokens never touch client-side JavaScript

### 4. **Fine-Grained API Control**
The AWS SDK provides direct access to specific Cognito APIs:
```typescript
// Direct control over authentication flow
InitiateAuthCommand         // Start EMAIL_OTP flow
RespondToAuthChallengeCommand  // Verify OTP codes
```
This level of control is essential for:
- Custom error handling
- Session management
- Token exchange logic
- Integration with Payload CMS

### 5. **No Client-Side Bundle Bloat**
- Amplify v6 would add ~200KB+ to the frontend JavaScript bundle
- Since authentication is handled entirely on the server, there's no need for client-side authentication libraries
- Smaller bundle size = faster page loads

### 6. **Dual Authentication Method Support**
- Supports both OAuth 2.0 (Hosted UI) and Passwordless (EMAIL_OTP) with consistent server-side handling
- Both methods use the same token storage, verification, and Payload integration
- Amplify v6 Gen 2's approach might require different handling for each authentication method

### 7. **Backend-First Design**
This is a **backend-first authentication system** where:
- Authentication logic lives in Next.js API routes (server)
- Tokens are verified server-side before reaching Payload CMS
- Frontend only handles UI and API calls
- No authentication state management needed on the client

### What Would Be Required with Amplify v6 Gen 2

If using Amplify instead, the implementation would need:
- ❌ Client-side Amplify configuration (`amplify/auth/resource.ts`)
- ❌ Frontend state management with Amplify React hooks
- ❌ Browser-based token storage (less secure)
- ❌ Complex bridging between Amplify's client-side tokens and Payload's server-side auth
- ❌ Larger frontend bundle size (~200KB+)
- ❌ Additional complexity managing auth state on both client and server

### Benefits of Current AWS SDK Approach

✅ **Server-side authentication** (Next.js API routes)
✅ **Custom auth strategy** integration (Payload CMS)
✅ **HttpOnly cookie security** (XSS protection)
✅ **Backend token verification** (JWKS)
✅ **Direct Cognito API control** (fine-grained error handling)
✅ **Minimal frontend bundle** (no client-side auth libraries)
✅ **Consistent dual-method support** (OAuth + Passwordless)
✅ **Full control over authentication flow** (custom error messages, redirects)

### When to Use Amplify v6 Gen 2 Instead

Amplify v6 Gen 2 would be appropriate for:
- Frontend-only React/Next.js applications
- Applications using Amplify's full backend stack (AppSync, DynamoDB, etc.)
- Apps that need client-side authentication state management
- Projects already using Amplify ecosystem
- Simple authentication without custom backend integration

### Conclusion

For a **Payload CMS integration with custom authentication**, the AWS SDK approach provides:
- Better security (httpOnly cookies)
- Cleaner architecture (server-side only)
- More control (direct API access)
- Smaller bundle size (no client libraries)
- Easier maintenance (single source of truth on server)

This makes it the superior choice for backend-first CMS platforms like Payload.

## Comparison: OAuth vs Passwordless

| Feature | OAuth 2.0 Flow | Passwordless EMAIL_OTP |
|---------|---------------|------------------------|
| **User Experience** | Redirect to Cognito UI | Stay on your custom page |
| **Branding** | Cognito's UI (customizable) | Fully custom UI |
| **Setup Complexity** | Medium | Medium |
| **Security** | High (industry standard) | High (no password to compromise) |
| **User Convenience** | Good (SSO-like) | Excellent (no password to remember) |
| **Mobile Friendly** | Redirect-based | Very friendly |
| **Best For** | Enterprise, SSO integration | Modern apps, consumer-facing |
| **Implementation** | 3 routes | 2 routes + custom page |
| **Dependencies** | Cognito Hosted UI | Custom frontend |

Both methods use the same:
- Token verification (JWKS)
- Cookie storage
- Payload CMS custom strategy
- User synchronization

## Development vs Production

### Development (localhost)

```bash
COGNITO_REDIRECT_URI=http://localhost:3000/api/auth/cognito/callback
```

Cookies use `secure: false` to work over HTTP.

### Production

```bash
COGNITO_REDIRECT_URI=https://yourdomain.com/api/auth/cognito/callback
```

- Update callback URL in Cognito app client settings
- Cookies use `secure: true` to require HTTPS
- Use production Cognito domain or custom domain

## References

- [Payload CMS Custom Authentication](https://payloadcms.com/docs/authentication/overview)
- [Amazon Cognito OAuth 2.0](https://docs.aws.amazon.com/cognito/latest/developerguide/cognito-userpools-server-contract-reference.html)
- [JWKS (JSON Web Key Sets)](https://auth0.com/docs/secure/tokens/json-web-tokens/json-web-key-sets)
