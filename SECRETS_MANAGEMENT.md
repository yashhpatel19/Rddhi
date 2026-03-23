# 🔐 Secrets Management Guide

This document outlines how to safely manage secrets and environment variables in Rddhi's development and production environments.

## Table of Contents
1. [Overview](#overview)
2. [Local Development Setup](#local-development-setup)
3. [Secret Generation](#secret-generation)
4. [Production Deployment](#production-deployment)
5. [GitHub Actions Secrets](#github-actions-secrets)
6. [Emergency Response](#emergency-response)
7. [Security Best Practices](#security-best-practices)

---

## Overview

### What Will Never Be Committed
- `.env` files with actual secrets
- Private keys, tokens, or credentials
- Database passwords
- API keys
- Encryption keys
- JWT secrets
- MongoDB connection strings with passwords

### What Should Be Committed
- `backend/.env.example` - Template for backend vars
- `frontend/.env.example` - Template for frontend vars
- `.env.production.example` - Template for production vars
- `.gitignore` - Rules preventing accidental commits
- `generate-secrets.sh` - Script to create new secrets

---

## Local Development Setup

### Step 1: Copy Environment Templates

**Backend:**
```bash
cd /workspaces/Rddhi/backend
cp .env.example .env
```

**Frontend:**
```bash
cd /workspaces/Rddhi/frontend
cp .env.example .env
```

### Step 2: Fill In Local Values

**backend/.env (for local development):**
```env
MONGO_URL=mongodb://rddhi_user:your_password@localhost:27017/rddhi_trading?authSource=admin
DB_NAME=rddhi_trading
ENCRYPTION_KEY=<generate using script below>
JWT_SECRET=<generate using script below>
JWT_ALGORITHM=HS256
JWT_EXPIRATION_HOURS=24
JWT_REFRESH_EXPIRATION_DAYS=7
CORS_ORIGINS=http://localhost:3000
ENVIRONMENT=development
LOG_LEVEL=DEBUG
DEBUG=true
RATE_LIMIT_PER_MINUTE=60
RATE_LIMIT_PER_HOUR=1000
```

**frontend/.env (for local development):**
```env
REACT_APP_BACKEND_URL=http://localhost:8000
REACT_APP_ENVIRONMENT=development
```

### Step 3: Never Add .env to Git

The `.gitignore` file already prevents this, but verify:
```bash
# This should show NO .env files
git status | grep "\.env" 

# This should work (hidden)
ls -la backend/.env
```

---

## Secret Generation

### Using the Provided Script

```bash
# Make script executable
chmod +x generate-secrets.sh

# Generate all secrets at once
./generate-secrets.sh

# Output will show:
# Generated ENCRYPTION_KEY: Fernet...
# Generated JWT_SECRET: ...
# Generated DATABASE_PASSWORD: ...
# Generated ADMIN_API_TOKEN: ...
```

### Manual Generation

If you need to generate individual secrets:

**ENCRYPTION_KEY (Fernet):**
```bash
python3 -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())"
```

**JWT_SECRET (48 bytes):**
```bash
python3 -c "import secrets; print(secrets.token_urlsafe(48))"
```

**DATABASE_PASSWORD (32 characters):**
```bash
python3 -c "import secrets; print(secrets.token_urlsafe(24))"
```

**ADMIN_API_TOKEN (64 characters):**
```bash
python3 -c "import secrets; print(secrets.token_urlsafe(48))"
```

---

## Production Deployment

### Step 1: Generate Production Secrets

```bash
# Run on your local machine (NOT in the container)
./generate-secrets.sh > production-secrets.txt

# ⚠️ IMMEDIATELY save to secure location:
# - 1Password
# - LastPass
# - AWS Secrets Manager
# - Vault
# - Bitwarden
```

### Step 2: Set DigitalOcean Environment Variables

1. Go to **DigitalOcean Dashboard** → **App Platform** → Your App
2. Click **Settings** → **Environment**
3. Add each variable from `production-secrets.txt`:

```
MONGO_URL=mongodb+srv://USERNAME:PASSWORD@cluster.mongodb.net/rddhi_trading...
ENCRYPTION_KEY=<from generate-secrets.sh>
JWT_SECRET=<from generate-secrets.sh>
CORS_ORIGINS=https://yourdomain.com,https://app.yourdomain.com
ENVIRONMENT=production
LOG_LEVEL=INFO
DEBUG=false
```

### Step 3: Deploy with GitHub Actions

The `.github/workflows/deploy.yml` automatically:
1. Runs tests
2. Scans for vulnerabilities
3. Deploys to DigitalOcean using secrets stored in GitHub

---

## GitHub Actions Secrets

GitHub Actions secrets are encrypted environment variables that are:
- ✅ Encrypted at rest
- ✅ Never logged in CI/CD output
- ✅ Only accessible to authorized workflows
- ✅ Separate from code

### Adding GitHub Secrets

1. Go to **GitHub** → **Settings** → **Secrets and variables** → **Actions**
2. Click **New repository secret**
3. Add each required secret:

```
Name: DIGITALOCEAN_TOKEN
Value: <from DigitalOcean API tokens>

Name: MONGODB_URI
Value: <from MongoDB Atlas>

Name: ENCRYPTION_KEY
Value: <from generate-secrets.sh>
```

### Using in Workflows

Secrets in `.github/workflows/deploy.yml`:
```yaml
env:
  ENCRYPTION_KEY: ${{ secrets.ENCRYPTION_KEY }}
  MONGO_URL: ${{ secrets.MONGODB_URI }}
  JWT_SECRET: ${{ secrets.JWT_SECRET }}
```

---

## Emergency Response

### If a Secret is Exposed

1. **Immediately** rotate all secrets:
   ```bash
   ./generate-secrets.sh
   ```

2. **Update** all services with new secrets:
   - DigitalOcean environment variables
   - GitHub Actions secrets
   - MongoDB Atlas password
   - Any third-party services

3. **Verify** no code dependency:
   ```bash
   git log --oneline | head -20
   git diff HEAD~1 -- backend/.env
   ```

4. **Force push** if necessary (extreme case):
   ```bash
   # Only if secret was in git history!
   git revert <commit-sha>
   git push origin main --force-with-lease
   ```

### If .env is Accidentally Committed

1. **Remove from git history:**
   ```bash
   git filter-branch --tree-filter 'rm -f backend/.env' HEAD
   ```

2. **Force push:**
   ```bash
   git push origin main --force
   ```

3. **Immediately generate new secrets** and update all services

4. **Notify the team** about the exposure

---

## Security Best Practices

### ✅ DO

- ✅ Use `generate-secrets.sh` for all key generation
- ✅ Store production secrets in password manager (1Password, Bitwarden)
- ✅ Rotate secrets every 90 days in production
- ✅ Use separate secrets for dev/staging/production
- ✅ Make `.env` files 0600 permissions (readable only by owner):
  ```bash
  chmod 600 backend/.env
  chmod 600 frontend/.env
  ```
- ✅ Add to `.gitignore` (`already done - verify regularly`)
- ✅ Use GitHub Actions secrets for CI/CD
- ✅ Enable audit logging for secret access
- ✅ Document which team members have access to which secrets
- ✅ Require secrets to be approved before PR merge

### ❌ DON'T

- ❌ Hardcode secrets in code
- ❌ Log secrets (even in debug mode)
- ❌ Share secrets via Slack, email, or chat
- ❌ Use same secret for dev/staging/production
- ❌ Commit `.env` files
- ❌ Use weak passwords (< 16 characters)
- ❌ Store secrets in code comments
- ❌ Pass secrets through URLs or query parameters
- ❌ Copy-paste secrets between terminals (use password manager)
- ❌ Disable `.gitignore` rules

---

## Environment-Specific Secrets

### Development
- Use localhost connections
- Can have DEBUG=true
- Shorter expiration times for testing
- Rate limits can be higher
- Log level: DEBUG

```bash
# backend/.env
MONGO_URL=mongodb://rddhi_user:devpass@localhost:27017/rddhi_trading?authSource=admin
ENVIRONMENT=development
LOG_LEVEL=DEBUG
DEBUG=true
```

### Staging
- Use production-like services (MongoDB Atlas, cloud infrastructure)
- All security features enabled
- Monitoring and logging set up
- Rate limits close to production

```bash
# .env.staging
MONGO_URL=mongodb+srv://user:pass@cluster.mongodb.net/rddhi_staging
ENVIRONMENT=staging
LOG_LEVEL=INFO
DEBUG=false
```

### Production
- All security hardened
- Minimal logging (prevents sensitive data exposure)
- Full rate limiting enabled
- Backup systems active
- Monitoring alerts enabled

```bash
# .env.production
MONGO_URL=mongodb+srv://user:pass@cluster.mongodb.net/rddhi_trading
ENVIRONMENT=production
LOG_LEVEL=WARNING
DEBUG=false
RATE_LIMIT_PER_MINUTE=60
RATE_LIMIT_PER_HOUR=1000
```

---

## Verification Checklist

Before committing code:
- [ ] `git status` shows NO `.env` files
- [ ] `git diff` shows NO secrets
- [ ] `.gitignore` contains all secret patterns
- [ ] `backend/.env` has permissions `600` (if on Unix)
- [ ] No hardcoded API keys in code
- [ ] Example files (`.env.example`) have placeholders, not real values
- [ ] All team members use secret manager for prod secrets

---

## Team Onboarding

When adding a new team member:

1. Create account in shared secret manager (1Password team account)
2. Grant access to:
   - GitHub repo (with branch protection enabled)
   - MongoDB Atlas project
   - DigitalOcean account (if DevOps role)
3. Share **only** `backend/.env.example` and `frontend/.env.example` (no secrets)
4. Team member generates their own local `.env` from examples
5. For production access, add them to:
   - GitHub Actions secret viewers
   - DigitalOcean team members
   - 1Password shared vault

---

## Monitoring & Auditing

### Review .gitignore Regularly
```bash
# Check for any .env files that might be tracked
git ls-files | grep -i "\.env"

# Should return 0 results
```

### Audit Git History
```bash
# Look for any secrets in recent commits
git log -p -S "mongodb://" --all | head -50
git log -p -S "token" --all | head -50
```

### Check Permissions
```bash
# Verify .env files are not world-readable
ls -l backend/.env frontend/.env

# Should show: -rw------- (600)
```

---

## References

- 🔗 [OWASP: Secrets Management](https://owasp.org/www-community/Secrets_Management)
- 🔗 [GitHub: Using Secrets in Actions](https://docs.github.com/en/actions/security-guides/using-secrets-in-github-actions)
- 🔗 [MongoDB: Environment Variables](https://www.mongodb.com/docs/drivers/node/current/)

---

**Last Updated**: 2024
**Maintained By**: Security Team
**Review Frequency**: Quarterly
