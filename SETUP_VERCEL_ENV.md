# Setting Up Vercel Environment Variables

Your application is deployed but needs the DATABASE_URL environment variable to connect to Supabase.

## Quick Setup

1. Go to your Vercel dashboard: https://vercel.com/manjulsinghals-projects/vyaapar/settings/environment-variables

2. Add the following environment variable:
   - **Key**: `DATABASE_URL`
   - **Value**: `postgresql://postgres.fartjyxunprpgllvrkaj:!@£$%^qwerty!@£@aws-1-eu-west-2.pooler.supabase.com:6543/postgres`
   - **Environment**: Select all (Production, Preview, Development)

3. Click "Save"

4. Redeploy your application:
   - Go to the Deployments tab
   - Click on the three dots menu for the latest deployment
   - Select "Redeploy"

## Alternative: Using Vercel CLI

If you have Vercel CLI configured:

```bash
vercel env add DATABASE_URL production
# Paste the database URL when prompted
```

Then redeploy:
```bash
vercel --prod
```

## Test Your Application

After setting up and redeploying, test your application at:
- Production: https://vyaapar-eight.vercel.app
- Custom domain: https://vyapaa.com (needs SSL fix)

The signup/login functionality should now work correctly!