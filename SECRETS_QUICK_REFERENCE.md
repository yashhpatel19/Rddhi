# 🔐 Secrets Quick Reference Card

## DO NOT EVER COMMIT

```
❌ .env files with real values
❌ Private keys, passwords, tokens
❌ API keys, secret strings
❌ Database passwords
❌ Encryption keys
❌ MongoDB connection strings with credentials
```

## LOCAL SETUP (5 minutes)

### 1. Copy Templates
```bash
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env
```

### 2. Generate Local Secrets
```bash
./generate-secrets.sh
# Copy ENCRYPTION_KEY and JWT_SECRET into backend/.env
```

### 3. Set Backend Values
```bash
# backend/.env
MONGO_URL=mongodb://rddhi_user:your_password@localhost:27017/rddhi_trading?authSource=admin
ENCRYPTION_KEY=<paste from generate-secrets.sh>
JWT_SECRET=<paste from generate-secrets.sh>
CORS_ORIGINS=http://localhost:3000
ENVIRONMENT=development
```

### 4. Set Frontend Values
```bash
# frontend/.env
REACT_APP_BACKEND_URL=http://localhost:8000
REACT_APP_ENVIRONMENT=development
```

### 5. Verify .env is Hidden from Git
```bash
git status  # Should NOT show .env files
```

## PRODUCTION SETUP (30 minutes)

### 1. Generate Production Secrets
```bash
./generate-secrets.sh > /tmp/prod-secrets.txt
# Save to 1Password/Bitwarden immediately
# DO NOT leave on disk
```

### 2. Add to GitHub Secrets
Go to: **Settings → Secrets and variables → Actions**
```
ENCRYPTION_KEY=<from generate-secrets.sh>
JWT_SECRET=<from generate-secrets.sh>
MONGO_URL=<from MongoDB Atlas>
DIGITALOCEAN_TOKEN=<from DigitalOcean>
```

### 3. Add to DigitalOcean App
Go to: **App Settings → Environment**
- Set all variables from generate-secrets.sh output
- Set CORS_ORIGINS to your domain
- Set ENVIRONMENT=production

### 4. Push & Watch Deploy
```bash
git push origin main
# GitHub Actions automatically deploys with secrets
```

## EMERGENCY: Secret Exposed! 🚨

```bash
# Step 1: Generate all new secrets
./generate-secrets.sh

# Step 2: Update everywhere
# - GitHub Actions Secrets
# - DigitalOcean Environment
# - MongoDB password
# - Any third-party services

# Step 3: Verify git history (if it was committed)
git log --oneline | grep "\.env"

# Step 4: Notify team
```

## KEY COMMANDS

| Command | Purpose |
|---------|---------|
| `./generate-secrets.sh` | Generate all production secrets |
| `git status` | Verify .env files NOT tracked |
| `chmod 600 backend/.env` | Restrict permissions to owner only |
| `cat backend/.env.example` | View what variables are needed |

## CHECKLIST BEFORE PUSH

- [ ] `git status` shows NO `.env` files
- [ ] `git diff` shows NO secrets
- [ ] `.env` files have mode 600 permissions
- [ ] Example files have only placeholders
- [ ] No secrets hardcoded in source code

## WHICH SECRET FOR WHAT?

| Secret | Used By | Regenerate If |
|--------|---------|---|
| `ENCRYPTION_KEY` | Backend (field encryption) | User data exposed |
| `JWT_SECRET` | Backend (token signing) | Auth bypass suspected |
| `MONGO_URL` | Backend (database) | Database access lost |
| `DIGITALOCEAN_TOKEN` | GitHub Actions (deployment) | Token compromised |

## FILES NEVER EDIT OR COMMIT

```
backend/.env         ← ❌ Local only
frontend/.env        ← ❌ Local only
.env                 ← ❌ Local only
production-secrets.txt ← ❌ Delete after saving to manager
*.pem                ← ❌ Never commit
*.key                ← ❌ Never commit
```

## FILES ALWAYS SAFE TO COMMIT

```
backend/.env.example        ← ✅ Template, no real values
frontend/.env.example       ← ✅ Template, no real values
.env.production.example     ← ✅ Template, no real values
.gitignore                  ← ✅ Protection rules
generate-secrets.sh         ← ✅ Script to create secrets
SECRETS_MANAGEMENT.md       ← ✅ This guide
```

---

**Questions?** See `SECRETS_MANAGEMENT.md` for details  
**Need help?** Check GitHub Wiki or ask the team lead

🔒 **Remember: A leaked secret is a production incident**
