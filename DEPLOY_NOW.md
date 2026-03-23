# 🚀 STEP-BY-STEP PRODUCTION DEPLOYMENT GUIDE

This guide walks you through deploying Rddhi to production using DigitalOcean (15-60 minutes total).

---

## 📋 PREREQUISITES (Before Starting)

- GitHub account with repo pushed
- Credit card for DigitalOcean
- Domain purchased (e.g., rddhi-trade.com)
- 30-60 minutes of time

**Total estimated cost:** $12-25/month (includes domain, app, database, monitoring)

---

## PART 1: SET UP DATABASE (MongoDB Atlas)

### Step 1: Create MongoDB Atlas Account

**Time: 5 minutes**

1. Go to [mongodb.com/cloud/atlas](https://www.mongodb.com/cloud/atlas)
2. Click "Sign Up" → Create free account
3. Verify email
4. Create organization: `Your Company Name`

### Step 2: Create Database Cluster

1. Click "Create a Project" → name it "Rddhi"
2. In Databases, click "Create"
3. Choose **M0 (Free)** tier
   - 512MB storage (enough to start)
   - Auto-upgrades as you grow
4. Cloud provider: AWS
5. Region: Closest to your location
6. Click "Create"
7. **Wait 10 minutes for cluster to initialize**

### Step 3: Create Database User

1. In Security → Database Access → "Add Database User"
   - Username: `rddhi_api`
   - Password: `[Choose strong password]` - save this!
   - Built-in Role: `Read and Write to Any Database`
2. Click "Add User"

### Step 4: Configure Network Access

1. Security → Network Access → "Add IP Address"
2. Choose "Allow Access from Anywhere" (for now - DigitalOcean IPs)
   - Or add specific DigitalOcean IP ranges for better security
3. Click "Confirm"

### Step 5: Get Connection String

1. Cluster → "Connect" → "Connect your application"
2. Driver: Python 3.6+
3. Copy connection string like:
   ```
   mongodb+srv://rddhi_api:[PASSWORD]@cluster0.xxxxx.mongodb.net/?retryWrites=true&w=majority
   ```
4. Save this - you'll need it soon!

---

## PART 2: SET UP HOSTING (DigitalOcean)

### Step 1: Create DigitalOcean Account

**Time: 5 minutes**

1. Go to [digitalocean.com](https://www.digitalocean.com)
2. Click "Sign up" → Create account
3. Add payment method (card)
4. Create project: "Rddhi Trading Platform"

### Step 2: Prepare GitHub Connection

1. In DigitalOcean → Settings → Personal access tokens
2. Click "Generate New Token"
   - Name: "GitHub Deploy"
   - Expiration: 90 days
   - Scopes: read, write
3. Copy token - save to safe place

### Step 3: Create App

1. Click "Create" → "App Platform"
2. **Source**: "GitHub"
   - Select your Rddhi repository
   - Branch: `main`
   - Deploy on push: YES ✓

3. When it detects your services:
   - Confirm it found `frontend/` → Buildpack: Node JS
   - Confirm it found `backend/` → Buildpack: Python

### Step 4: Configure Backend Service

1. Edit `backend` service:
   - **Name**: `api`
   - **Build Command**: `pip install -r requirements.txt`
   - **Run Command**: `cd backend && uvicorn server:app --host 0.0.0.0 --port 8080`
   - **Port**: 8080
   - **HTTP Routes**:
     - Path: `/api`
     - Leave blank everything else
   - **Health Check**:
     - HTTP Path: `/health`

2. Add Environment Variables (click "Edit" next to HTTP Routes):
   - `ENVIRONMENT`: `production`
   - `DEBUG`: `false`
   - `LOG_LEVEL`: `INFO`
   - `MONGO_URL`: `[Paste MongoDB connection string]`
   - `DB_NAME`: `rddhi`
   - `ENCRYPTION_KEY`: [Generate: `python3 -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())"`]
   - `JWT_SECRET`: [Generate: `python3 -c "import secrets; print(secrets.token_urlsafe(32))"`]
   - `JWT_ALGORITHM`: `HS256`
   - `JWT_EXPIRATION_HOURS`: `24`
   - `JWT_REFRESH_EXPIRATION_DAYS`: `7`
   - `CORS_ORIGINS`: `https://yourdomain.com` (will update after domain set)
   - `RATE_LIMIT_ENABLED`: `true`
   - `RATE_LIMIT_PER_MINUTE`: `60`
   - `RATE_LIMIT_PER_HOUR`: `1000`

3. Click "Save"

### Step 5: Configure Frontend Service

1. Edit `frontend` service:
   - **Name**: `web`
   - **Build Command**: `npm install && npm run build`
   - **Run Command**: `npm start`
   - **Port**: 3000
   - **HTTP Routes**:
     - Path: `/` (root)

2. Add Environment Variables:
   - `REACT_APP_BACKEND_URL`: `https://api.yourdomain.com` (will update after domain)
   - `REACT_APP_ENVIRONMENT`: `production`
   - `SKIP_PREFLIGHT_CHECK`: `true`

3. Click "Save"

### Step 6: Add Domain

1. In App → Settings → Domains
2. Click "Edit"
3. Add custom domain: `yourdomain.com`
4. Also add: `api.yourdomain.com` (for API)
5. DigitalOcean automatically creates SSL certificates! 🎉

### Step 7: Update Domain DNS

*You need to do this at your domain registrar (GoDaddy, Namecheap, etc.)*

1. DigitalOcean shows 3 nameservers you need to add to your domain:
   ```
   ns1.digitalocean.com
   ns2.digitalocean.com
   ns3.digitalocean.com
   ```

2. In your domain registrar account:
   - Find "DNS" or "Nameservers"
   - Replace existing nameservers with above 3
   - **Wait 24 hours for DNS to propagate** (can be faster)

### Step 8: Deploy!

1. DigitalOcean App → "Deploy"
2. Review changes → "Deploy"
3. Watch the deployment progress (takes 5-10 minutes)
4. When complete, click "Live App" to open

---

## PART 3: VERIFY DEPLOYMENT (5-10 minutes)

### Test Backend Health

```bash
curl https://api.yourdomain.com/health
```

**Expected response:**
```json
{"status":"healthy","environment":"production","timestamp":"..."}
```

### Test Frontend

1. Open `https://yourdomain.com` in browser
2. Should see Rddhi login page

### Test Authentication

```bash
# Register new user
curl -X POST https://api.yourdomain.com/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email":"test@company.com",
    "password":"SecurePass123",
    "name":"Test User"
  }'

# Login
curl -X POST https://api.yourdomain.com/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email":"test@company.com",
    "password":"SecurePass123"
  }'
```

### Test in Browser

1. Open https://yourdomain.com
2. Register new account
3. Login
4. Create a trade
5. View dashboard
6. Logout

---

## PART 4: BACKUP STRATEGY

### Automatic Backups

**MongoDB Atlas** (if using cloud):
- Already automatic! Goes to your backup dashboard
- Keeps 35 days of automatic backups
- Can restore with one click

**Self-hosted MongoDB**:
```bash
# Make backup script executable
chmod +x /workspaces/Rddhi/backup.sh

# Run manually
./backup.sh

# Or schedule daily at 2 AM:
# Add to crontab:
# 0 2 * * * /home/rddhi/app/backup.sh >> /home/rddhi/backup.log
```

### Restore from Backup

```bash
# Make restoration script executable
chmod +x /workspaces/Rddhi/restore.sh

# List available backups
ls -lh /backups/rddhi/

# Restore specific backup
./restore.sh /backups/rddhi/rddhi_backup_YYYYMMDD_HHMMSS.archive
```

---

## PART 5: CONTINUOUS UPDATES

### For Future Updates

**When you add new features:**

1. **Develop locally and test**
   ```bash
   npm start        # Frontend
   ./run_backend.sh # Backend in another terminal
   ```

2. **Push to GitHub**
   ```bash
   git add .
   git commit -m "Add new feature: [description]"
   git push origin main
   ```

3. **DigitalOcean auto-deploys** (no action needed!)
   - Watches main branch
   - Automatically builds and deploys
   - Old version stays running until new is ready
   - Zero downtime!

4. **Monitor logs**
   - In DigitalOcean Dashboard
   - Either service → Logs
   - Wait 2 minutes after push

---

## 🚨 TROUBLESHOOTING

### Issue: Deployment fails to build

**Check logs:**
```
App → [Service] → Logs → Build Logs
```

**Common causes:**
- Missing environment variables
- npm install failing (run locally: `npm install`)
- Python dependency issues (run locally: `pip install -r backend/requirements.txt`)

**Fix:**
1. Check error message in logs
2. Fix locally
3. Push to GitHub
4. Auto-redeploys automatically

### Issue: Frontend blank (white screen)

**Check browser console:**
- Right-click → Inspect → Console tab
- Look for errors

**Common causes:**
- `REACT_APP_BACKEND_URL` wrong in environment
- API not responding

**Fix:**
```bash
# Test API
curl https://api.yourdomain.com/health

# Update REACT_APP_BACKEND_URL in DigitalOcean if needed
# Redeploy
```

### Issue: Can't login

**Check:**
1. API health: `curl https://api.yourdomain.com/health`
2. Database connected: Check MongoDB Atlas dashboard
3. User exists: Check database collections

**Fix:**
```bash
# Test login API directly
curl -X POST https://api.yourdomain.com/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"SecurePass123"}'

# Check backend logs for errors
```

### Issue: Need to rollback

**Fast rollback:**
```bash
# In DigitalOcean App Platform:
1. Click "Deployments" tab
2. Find previous working deployment
3. Click "..." menu
4. Select "Redeploy"
5. Wait 5 minutes

# Your app is back to previous version!
```

---

## ✅ CHECKLIST: YOU'RE LIVE!

- [ ] Domain pointing to DigitalOcean
- [ ] Frontend loads at yourdomain.com
- [ ] Backend health check returns 200
- [ ] Can register new user
- [ ] Can login with credentials
- [ ] Can create a trade
- [ ] Can view dashboard
- [ ] MongoDB backups configured
- [ ] Monitoring alerts set up
- [ ] Team knows how to handle issues

**Congratulations! 🎉 Your app is production-ready!**

---

## 📞 SUPPORT

**For DigitalOcean issues:** docs.digitalocean.com/products/app-platform/

**For MongoDB issues:** docs.mongodb.com/manual/

**For Rddhi app issues:** Check SECURITY.md and README.md

---

## 🔄 NEXT STEPS

1. **Monitor first 24 hours** - Watch logs, test features
2. **Set up monitoring alerts** - Email on errors
3. **Plan first update** - Add feature and redeploy
4. **Train team** - Show them the update process
5. **Document procedures** - Write your own runbook
