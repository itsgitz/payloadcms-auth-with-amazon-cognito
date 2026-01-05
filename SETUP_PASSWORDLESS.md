# Passwordless Authentication Setup Guide

This guide will help you configure Amazon Cognito for passwordless EMAIL_OTP authentication.

## Prerequisites

- Existing Amazon Cognito User Pool (from OAuth setup)
- AWS Console access
- User with verified email in Cognito

## Step 1: Enable USER_AUTH Flow in Cognito

1. Go to AWS Console → Amazon Cognito → User pools
2. Select your user pool
3. Go to **App integration** tab
4. Click on your App client name
5. Click **Edit** in the **Hosted UI** section
6. Scroll to **Advanced app client settings**
7. Under **Authentication flows**, enable:
   - ✅ **ALLOW_USER_AUTH**
   - ✅ Keep existing flows (ALLOW_USER_SRP_AUTH, etc.)
8. Click **Save changes**

## Step 2: Configure Sign-in Experience

1. Go to **Sign-in experience** tab
2. Under **Preferred authentication option**:
   - Enable **Email OTP**
3. Under **Multi-factor authentication (MFA)**:
   - Set to **Optional** or **Required** (your choice)
4. Under **User account recovery**:
   - Make sure **Email** is enabled
5. Click **Save changes**

## Step 3: Email Configuration

1. Go to **Messaging** tab
2. Verify email configuration:
   - **FROM email address**: Should be configured (either Cognito default or SES)
   - **Email templates**: Verify OTP template exists
3. If using custom domain, configure SES properly

## Step 4: Create a Test User

### Option A: AWS Console

1. Go to **Users** tab
2. Click **Create user**
3. Enter email address
4. Set **Email verified** to **True** (important!)
5. Click **Create user**

### Option B: AWS CLI

```bash
aws cognito-idp admin-create-user \
  --user-pool-id YOUR_USER_POOL_ID \
  --username test@example.com \
  --user-attributes Name=email,Value=test@example.com Name=email_verified,Value=true \
  --message-action SUPPRESS
```

## Step 5: Test the Flow

### Start Development Server

```bash
bun run dev
```

### Test Passwordless Login

1. Open browser to `http://localhost:3000`
2. Click **✉️ Passwordless Login (Email OTP)**
3. Enter your test user email
4. Click **Send Verification Code**
5. Check your email for the 6-digit code
6. Enter the code
7. Click **Verify & Login**
8. You should be redirected to `/admin`

### Test OAuth Login (for comparison)

1. Go back to `http://localhost:3000`
2. Click **🔐 OAuth Login (Cognito Hosted UI)**
3. Login via Cognito hosted page
4. Same result - redirected to `/admin`

## Troubleshooting

### "NotAuthorizedException: User is not authorized"

**Solution:**
- Verify USER_AUTH flow is enabled in app client
- Check that EMAIL_OTP is configured in sign-in experience

### OTP Email Not Received

**Solutions:**
- Check spam/junk folder
- Verify user's email is marked as **verified** in Cognito
- Check SES sending limits (if using custom email)
- Look at CloudWatch logs for email delivery issues

### "UserNotFoundException"

**Solution:**
- User must exist in Cognito User Pool
- Email must be verified
- Use the email address as username

### "ExpiredCodeException"

**Solution:**
- OTP codes expire after 3 minutes
- Request a new code using the "Resend Code" button

### Session Expired Error

**Solution:**
- Session cookies expire after 10 minutes
- Start the flow again from the beginning

## Demo for Manager

### Presentation Script

```
"I've implemented two authentication methods for our Payload CMS:

1. OAuth 2.0 Flow (Traditional)
   - Uses Cognito's hosted UI
   - Standard enterprise approach
   - Redirects to Cognito, then back

2. Passwordless Email OTP (Modern)
   - Custom branded login page
   - No passwords to remember
   - Code sent via email
   - Better user experience

Both methods:
- Authenticate with Amazon Cognito
- Use the same backend verification
- Work seamlessly with Payload CMS
- Store tokens securely in httpOnly cookies
- Support the same user database

Let me show you both flows..."
```

### Demo Steps

1. **Show landing page** - Two authentication options
2. **Demo OAuth** - Click → Hosted UI → Login → Admin panel
3. **Logout** - Clear session
4. **Demo Passwordless**:
   - Click → Custom page
   - Enter email
   - Show email with code
   - Enter code
   - Same admin panel access
5. **Show code** - Explain architecture
6. **Show docs** - COGNITO_AUTH.md comparison table

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────┐
│                    Landing Page (/)                      │
│                                                          │
│   ┌──────────────────┐     ┌──────────────────┐        │
│   │  OAuth Login     │     │ Passwordless     │        │
│   │  (Cognito UI)    │     │ (Custom UI)      │        │
│   └────────┬─────────┘     └────────┬─────────┘        │
└────────────┼─────────────────────────┼──────────────────┘
             │                         │
             │                         │
        ┌────▼─────┐             ┌─────▼──────┐
        │ /login   │             │ /send-code │
        │ callback │             │ verify-code│
        └────┬─────┘             └─────┬──────┘
             │                         │
             │  Set cookies            │  Set cookies
             │  (id_token)             │  (id_token)
             │                         │
             └────────┬─────────────────┘
                      │
                ┌─────▼──────┐
                │   Payload  │
                │   Custom   │
                │  Strategy  │
                └─────┬──────┘
                      │
                ┌─────▼──────┐
                │   Admin    │
                │   Panel    │
                └────────────┘
```

## Next Steps

1. ✅ Test both flows thoroughly
2. ✅ Show demo to manager
3. 📝 Gather feedback
4. 🚀 Choose preferred method for production
5. 🔧 Configure production Cognito settings
6. 📊 Monitor authentication metrics

## Production Checklist

Before deploying to production:

- [ ] Configure custom SES email for OTP (better deliverability)
- [ ] Set up CloudWatch alarms for failed authentications
- [ ] Test with multiple email providers (Gmail, Outlook, etc.)
- [ ] Configure MFA if required
- [ ] Set appropriate session timeouts
- [ ] Test logout flow thoroughly
- [ ] Update callback URLs to production domain
- [ ] Enable HTTPS (required for secure cookies)
- [ ] Test user account recovery flow
- [ ] Document user onboarding process

## Resources

- [Cognito USER_AUTH Flow](https://docs.aws.amazon.com/cognito/latest/developerguide/amazon-cognito-user-pools-authentication-flow.html)
- [Email OTP Authentication](https://docs.aws.amazon.com/cognito/latest/developerguide/user-pool-settings-email-phone-verification.html)
- [Payload CMS Authentication](https://payloadcms.com/docs/authentication/overview)
- [Main Documentation](./COGNITO_AUTH.md)
