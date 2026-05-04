# Vercel Deployment Guide

## Quick Start

### 1. Prerequisites
- Vercel account (sign up at https://vercel.com)
- Git repository connected to Vercel
- Supabase project configured

### 2. Environment Variables

Add these to your Vercel project settings (Settings > Environment Variables):

```bash
# Supabase Configuration
VITE_SUPABASE_URL=https://gkmvncioffmvzxhuaohv.supabase.co
VITE_SUPABASE_ANON_KEY=your_anon_key_here

# Application Configuration
VITE_APP_NAME=Gold X Usdt
VITE_APP_URL=https://your-production-domain.vercel.app

# Google OAuth (if enabled)
VITE_GOOGLE_CLIENT_ID=your_google_client_id_here
```

### 3. Build Configuration

Vercel should auto-detect these settings, but verify:

```json
{
  "buildCommand": "npm run build",
  "outputDirectory": "dist",
  "installCommand": "npm install",
  "framework": "vite"
}
```

### 4. Deploy

#### Option A: Via Vercel Dashboard
1. Go to https://vercel.com/new
2. Import your Git repository
3. Configure environment variables
4. Click "Deploy"

#### Option C: Via CI/CD Pipeline (Recommended)
1. Push your code to the `main` or `master` branch.
2. The GitHub Actions workflow (`.github/workflows/ci-cd.yml`) will automatically:
   - Run linting and type checks
   - Run Vitest unit tests
   - Build the application
   - Deploy to Vercel (if configured with secrets)

### 5. Post-Deployment

1. **Update Supabase CORS**
   - Go to Supabase Dashboard > Settings > API
   - Add your Vercel domain to allowed origins

2. **Update App URL**
   - Update `VITE_APP_URL` in Vercel environment variables
   - Redeploy if needed

3. **Test Critical Flows**
   - User registration
   - User login
   - Deposit creation
   - Admin access

## Troubleshooting

### Build Fails
- Check Node.js version (should be 18.x or higher)
- Verify all dependencies are in package.json
- Check build logs for specific errors

### Environment Variables Not Working
- Ensure all variables start with `VITE_` for client-side access
- Redeploy after adding/changing environment variables
- Check for typos in variable names

### 404 Errors on Routes
- Ensure `vercel.json` is configured for SPA routing
- Check that all routes are defined in your router

### API Errors
- Verify Supabase URL and keys are correct
- Check Supabase CORS settings
- Ensure RLS policies allow client access

## Performance Optimization

1. **Enable Vercel Analytics**
   - Go to Project Settings > Analytics
   - Enable Web Analytics

2. **Enable Speed Insights**
   - Go to Project Settings > Speed Insights
   - Enable Real Experience Score

3. **Configure Caching**
   - Static assets are automatically cached
   - Configure cache headers if needed

## Security Checklist

- [ ] All environment variables set correctly
- [ ] No secrets in source code
- [ ] HTTPS enabled (automatic on Vercel)
- [ ] CORS configured in Supabase
- [ ] RLS policies enabled in database
- [ ] Admin routes protected
- [ ] MFA enabled for admin accounts

## Monitoring

### Vercel Dashboard
- Monitor deployments
- Check build logs
- View analytics
- Track performance

### Supabase Dashboard
- Monitor database usage
- Check Edge Function logs
- Review authentication logs
- Track API usage

## Rollback Procedure

If issues occur after deployment:

```bash
# Via CLI
vercel rollback

# Or via Dashboard
# Go to Deployments > [Previous Deployment] > Promote to Production
```

## Support

- Vercel Support: https://vercel.com/support
- Supabase Support: https://supabase.com/support
- Project Issues: Check DEPLOYMENT_AUDIT_REPORT.md
