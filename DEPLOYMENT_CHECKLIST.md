# Vyaapar Deployment Checklist

## ✅ Completed Steps

1. **Fixed API_BASE Configuration**
   - Local files already have `API_BASE = ''` (empty string)
   - Ready for deployment without localhost references

2. **Converted Vercel Functions to ESM**
   - Updated all /api functions to use ESM imports
   - Changed to `export default async function handler`
   - Added package.json with `"type": "module"`

3. **Tested Locally**
   - Signup endpoint working: Creates user with Argon2 password hash
   - Session management functional with HttpOnly cookies

## 🔧 Manual Steps Required

### 1. Configure Vercel Environment Variables
```bash
# In Vercel Dashboard (vyaapar.com):
# Settings → Environment Variables → Add:

DATABASE_URL = "postgresql://vyaapar.wawdmoxrkbqzjklbygjh:[YOUR_PASSWORD]@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres?pgbouncer=true&connection_limit=1"
NODE_ENV = "production"
```

### 2. Deploy to Vercel
```bash
# Option A: Using Git (Recommended)
git add .
git commit -m "fix: Convert to Vercel Functions with ESM format"
git push origin feature/dashboard-clean

# Then merge to main:
git checkout main
git merge feature/dashboard-clean
git push origin main

# Option B: Using Vercel CLI
vercel --prod
```

### 3. Verify Domain Configuration
```bash
# Check current domain status
vercel domains ls

# If vyaapar.com shows wrong site:
vercel domains add vyaapar.com
vercel alias vyaapar.com
```

### 4. Test Production Deployment

#### Test Signup
```bash
curl -X POST https://vyaapar.com/auth/signup \
  -H "Content-Type: application/json" \
  -d '{"phone": "+919876543210", "password": "testpass123"}'
```

#### Test Login
```bash
curl -X POST https://vyaapar.com/auth/login \
  -H "Content-Type: application/json" \
  -d '{"phone": "+919876543210", "password": "testpass123"}'
```

#### Test Dashboard Access
```bash
# Visit in browser with cookies enabled:
https://vyaapar.com/dashboard.html
```

## 🔍 Verification Checklist

- [ ] vyaapar.com shows Vibha Net login page (not Atlas directory)
- [ ] Can create new account with phone + password
- [ ] Can login with created credentials
- [ ] Dashboard shows after login with user phone number
- [ ] Dashboard has "Create Receipt" and "Manage Inventory" buttons
- [ ] Logout works and redirects to login page
- [ ] Phone validation accepts international numbers (+1, +44, +91)
- [ ] Duplicate signup returns 409 error
- [ ] Failed login attempts trigger account lockout after 5 attempts

## 📝 Quick Fixes if Issues Persist

### If API returns 405 errors:
```bash
# Ensure vercel.json has correct rewrites
cat vercel.json
# Should contain rewrites for /auth/* and /dashboard/*
```

### If "Cannot find module" errors:
```bash
# Install dependencies in root
npm install pg argon2
```

### If Database connection fails:
```sql
-- Test connection from Supabase SQL Editor:
SELECT COUNT(*) FROM users;
SELECT COUNT(*) FROM sessions;
```

### If Domain shows wrong site:
1. Go to Vercel Dashboard
2. Select your project
3. Settings → Domains
4. Remove incorrect domain
5. Add vyaapar.com
6. Wait for DNS propagation (5-10 mins)

## 📊 Production Monitoring

Monitor these after deployment:
- Vercel Functions logs: `vercel logs`
- Database connections: Supabase Dashboard → Database → Connection Pool
- Error rates: Vercel Analytics → Functions tab
- User signups: `SELECT COUNT(*) FROM users WHERE created_at > NOW() - INTERVAL '1 day';`

## 🚀 Success Criteria

The deployment is successful when:
1. vyaapar.com loads the Vibha Net authentication page
2. Users can sign up with global phone numbers
3. Users can login and see the dashboard
4. All security features work (rate limiting, lockout)
5. No console errors in browser
6. API endpoints respond < 500ms

## 🆘 Support Resources

- Vercel Status: https://www.vercel-status.com/
- Supabase Status: https://status.supabase.com/
- Vercel Support: https://vercel.com/support
- Supabase Support: https://supabase.com/support