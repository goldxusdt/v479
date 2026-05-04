# Google OAuth Configuration Guide

## Google OAuth Client ID Setup

Your Google OAuth Client ID has been provided:
```
177188909353-25feb1b7el138ljg1r1ch1oc1j2g73cl.apps.googleusercontent.com
```

## Configuration Steps

### 1. Configure Google Cloud Console

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Navigate to **APIs & Services** > **Credentials**
3. Find your OAuth 2.0 Client ID: `177188909353-25feb1b7el138ljg1r1ch1oc1j2g73cl.apps.googleusercontent.com`
4. Click **Edit** on the OAuth client
5. Under **Authorized redirect URIs**, add:
   ```
   https://gkmvncioffmvzxhuaohv.supabase.co/auth/v1/callback
   ```
6. Click **Save**

### 2. Configure Supabase Dashboard

1. Go to your [Supabase Dashboard](https://supabase.com/dashboard/project/gkmvncioffmvzxhuaohv)
2. Navigate to **Authentication** > **Providers**
3. Find **Google** in the provider list
4. Enable the Google provider
5. Enter your credentials:
   - **Client ID**: `177188909353-25feb1b7el138ljg1r1ch1oc1j2g73cl.apps.googleusercontent.com`
   - **Client Secret**: (You need to get this from Google Cloud Console)
6. Click **Save**

### 3. Get Client Secret from Google Cloud Console

1. In Google Cloud Console, go to **APIs & Services** > **Credentials**
2. Click on your OAuth 2.0 Client ID
3. You'll see both:
   - **Client ID** (already provided above)
   - **Client Secret** (copy this value)
4. Copy the Client Secret and paste it into Supabase Dashboard

### 4. Test Google Login

After configuration:
1. Go to your application's login page: `/login`
2. Click the **Continue with Google** button
3. You should be redirected to Google's OAuth consent screen
4. After authorization, you'll be redirected back to your application

## Redirect URL Reference

**Production Redirect URL:**
```
https://gkmvncioffmvzxhuaohv.supabase.co/auth/v1/callback
```

**Local Development Redirect URL (if needed):**
```
http://localhost:54321/auth/v1/callback
```

## Troubleshooting

### Error: "redirect_uri_mismatch"
- Ensure the redirect URI in Google Cloud Console exactly matches the Supabase callback URL
- No trailing slashes
- Use HTTPS for production

### Error: "Access blocked: This app's request is invalid"
- Verify that the OAuth consent screen is properly configured
- Ensure your app is published (or add test users if in testing mode)

### Error: "Provider is disabled"
- Make sure Google provider is enabled in Supabase Dashboard
- Verify Client ID and Secret are correctly entered

## Security Notes

- Never commit your Client Secret to version control
- The Client Secret should only be stored in Supabase Dashboard
- Regularly rotate your OAuth credentials for security
- Monitor OAuth usage in Google Cloud Console

## Additional Resources

- [Supabase Google OAuth Documentation](https://supabase.com/docs/guides/auth/social-login/auth-google)
- [Google OAuth 2.0 Documentation](https://developers.google.com/identity/protocols/oauth2)
