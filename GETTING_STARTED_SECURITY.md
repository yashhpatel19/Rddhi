# 🚀 Getting Started with Security - Team Guide

**⏱️ Time Required**: 5-10 minutes  
**👥 For**: All team members  
**📅 When**: Before your first commit

---

## What You Need to Know

This project has **automatic secret protection**. You don't need to worry about accidentally committing passwords or API keys—the system prevents it automatically.

### The Good News ✨
- ✅ Secrets are automatically protected
- ✅ Setup takes 5 minutes
- ✅ No complicated manual steps
- ✅ No software to install (uses git hooks)
- ✅ Transparent to daily workflow

### What You Do
1. Run one setup script (1 minute)
2. Create `.env` files from templates (1 minute)
3. Generate development secrets (1 minute)
4. Start coding normally (2 minutes)

---

## Step-by-Step Setup

### Step 1: Install Security Hooks (1 minute)

```bash
# From project root
./scripts/setup-security-hooks.sh
```

**What this does:**
- Installs a git pre-commit hook
- Verifies `.gitignore` is complete
- Sets file permissions correctly
- Checks git history for secrets

**Expected output:**
```
🔐 Setting up security hooks...
✓ Pre-commit hook installed
✓ .gitignore includes .env
✓ No obvious secrets found in git history
✓ Security hooks successfully installed!
```

### Step 2: Create Environment Files (1 minute)

**Backend:**
```bash
cp backend/.env.example backend/.env
```

**Frontend:**
```bash
cp frontend/.env.example frontend/.env
```

### Step 3: Generate Development Secrets (1 minute)

```bash
./generate-secrets.sh
```

**Output example:**
```
🔐 Generating cryptographically secure secrets...
Generated ENCRYPTION_KEY: gAAAAABj_vQkx...
Generated JWT_SECRET: L8f9k2_qmxQpR...
Generated DATABASE_PASSWORD: x9Kw2pLm8nQvR...
Generated ADMIN_API_TOKEN: B4dF7hJ2mNoPqR...
```

### Step 4: Configure Backend (1 minute)

Edit `backend/.env`:

```env
# Copy the ENCRYPTION_KEY from Step 3
ENCRYPTION_KEY=<paste your ENCRYPTION_KEY here>

# Copy the JWT_SECRET from Step 3
JWT_SECRET=<paste your JWT_SECRET here>

# Set MongoDB URL (for local development)
MONGO_URL=mongodb://rddhi_user:password@localhost:27017/rddhi_trading?authSource=admin

# Keep the rest as-is for development
CORS_ORIGINS=http://localhost:3000
ENVIRONMENT=development
LOG_LEVEL=DEBUG
DEBUG=true
```

### Step 5: Configure Frontend (1 minute)

Edit `frontend/.env`:

```env
REACT_APP_BACKEND_URL=http://localhost:8000
REACT_APP_ENVIRONMENT=development
```

### Step 6: Verify Setup (Done!)

```bash
# Check that .env files exist but are hidden from git
git status
# Should NOT show: backend/.env or frontend/.env

# You're done! ✓
```

---

## Daily Workflow

### Committing Changes

**No special steps needed!** Just work normally:

```bash
git add .
git commit -m "feature: add trading page"
git push origin main
```

The pre-commit hook runs automatically:
- ✓ Checks for .env files
- ✓ Looks for secret patterns
- ✓ Verifies file permissions
- ✓ Blocks commit if issues found

### If Commit is Blocked

The hook might block your commit if it detects a potential secret. Example:

```
❌ Commit BLOCKED: 1 critical security issue(s) found
✗ ERROR: .env file staged for commit!
  .env files must never be committed to git
  Use: git reset HEAD <filename>
```

**What to do:**
1. Unstage the problematic file: `git reset HEAD filename`
2. Verify it shouldn't be committed
3. Try again: `git commit -m "your message"`

---

## Do's and Don'ts

### ✅ DO

- ✅ Commit `.env.example` (template files)
- ✅ Copy `.env.example` to `.env` locally
- ✅ Fill in `.env` with local development values
- ✅ Use `generate-secrets.sh` for keys
- ✅ Save production secrets to password manager
- ✅ Report security issues privately

### ❌ DON'T

- ❌ Share `.env` files via Slack, email, or chat
- ❌ Commit `.env` files with actual values
- ❌ Hardcode secrets in code
- ❌ Log secrets (even in debug mode)
- ❌ Copy-paste secrets between terminals
- ❌ Disable git hooks (`git commit --no-verify`)
- ❌ Store passwords in your browser history

---

## Common Questions

### Q: "What if I accidentally commit a secret?"

**A:** The pre-commit hook prevents this. But if it happens:

1. See `SECRETS_MANAGEMENT.md` → "Emergency Response"
2. Contact your team lead immediately
3. Follow the secret rotation procedure

### Q: "Can I keep my `.env` files?"

**A:** YES! They're in `.gitignore`, so they won't be committed. But:
- Keep permissions secret: `chmod 600 .env`
- Never share the file
- Keep them local to your machine only

### Q: "What if setup script fails?"

**A:** Try these fixes:

```bash
# Make script executable
chmod +x scripts/setup-security-hooks.sh

# Remove old hook if it exists
rm -f .git/hooks/pre-commit

# Try setup again
./scripts/setup-security-hooks.sh
```

If still stuck, see `SECURITY_SETUP_COMPLETE.md` troubleshooting section.

### Q: "Do I need to do this for production?"

**A:** YES, but differently:

**Development** (you just did this):
- Use `./generate-secrets.sh` locally
- Copy values to `backend/.env`
- Only for local machine

**Production** (DevOps team):
- Generate secrets: `./generate-secrets.sh`
- Save to password manager (1Password, Bitwarden)
- Add to GitHub Actions Secrets
- Add to DigitalOcean Environment
- See `SECRETS_MANAGEMENT.md` for details

### Q: "What about private keys (*.key, *.pem)?"

**A:** They're already protected:
- `.gitignore` ignores all `*.key` and `*.pem` files
- Pre-commit hook detects private key patterns
- Never commit them
- Store locally in `.gitignore` folders only

### Q: "My frontend needs some config. Can I put it in `.env`?"

**A:** YES! But only public config:

```env
# ✅ OK - Public config (visible in browser)
REACT_APP_BACKEND_URL=http://localhost:8000
REACT_APP_ENABLE_ANALYTICS=true

# ❌ NEVER - Secrets in frontend
REACT_APP_API_KEY=secret123  # NO! Never do this
REACT_APP_JWT_SECRET=...     # NO! Never do this
```

**Rule**: If it's prefixed with `REACT_APP_`, it will be visible in the browser. Never put secrets there.

---

## Security Checklist

Before your first commit, verify:

- [ ] Ran `./scripts/setup-security-hooks.sh`
- [ ] Created `backend/.env` from `.env.example`
- [ ] Created `frontend/.env` from `.env.example`
- [ ] Ran `./generate-secrets.sh`
- [ ] Copied secrets into `backend/.env`
- [ ] Git shows NO `.env` files: `git status`
- [ ] Read `SECRETS_QUICK_REFERENCE.md` (5 min)

✅ **If all checked**: You're ready to code!

---

## File Locations

```
Project Root
├── scripts/
│   ├── setup-security-hooks.sh    ← Run this ONCE
│   └── pre-commit-hook             (used by .git/)
├── generate-secrets.sh             ← Run this for development
├── backend/
│   ├── .env.example                ← Copy this
│   ├── .env                        ← Created locally (don't commit)
│   └── security.py                 (existing, handles encryption)
├── frontend/
│   ├── .env.example                ← Copy this
│   ├── .env                        ← Created locally (don't commit)
│   └── ... (React code)
├── SECRETS_QUICK_REFERENCE.md      ← Read this (5 min)
├── SECRETS_MANAGEMENT.md           ← Full guide
└── .gitignore                      (protects your .env)
```

---

## Support

### Quick Questions
→ Read: `SECRETS_QUICK_REFERENCE.md` (one page)

### Detailed Questions
→ Read: `SECRETS_MANAGEMENT.md` (complete guide)

### Setup Issues
→ Read: `SECURITY_SETUP_COMPLETE.md` (troubleshooting)

### Need Help?
1. Check the appropriate guide above
2. Ask your team lead
3. Use `./SECURITY_VERIFICATION_CHECKLIST.md` to verify setup

---

## Next Steps

1. **Right now** (5 min): 
   - Follow the 6 setup steps above

2. **Today** (5 min):
   - Read `SECRETS_QUICK_REFERENCE.md`
   - Try making a normal commit

3. **This week** (optional):
   - Read `SECRETS_MANAGEMENT.md` (deeper knowledge)
   - Learn about secret rotation

---

## You're All Set! 🎉

Your development environment is now **securely configured**. 

You can now:
- ✅ Code confidently knowing secrets are protected
- ✅ Commit changes without worrying about leaking secrets
- ✅ Collaborate with the team safely
- ✅ Contribute to the project

**Welcome to the team!**

---

**Questions?** See `SECRETS_QUICK_REFERENCE.md` or ask your team lead.

**Ready to deploy?** See `DEPLOY_NOW.md` for production deployment.

---

⏱️ **Total Setup Time**: 5-10 minutes  
✅ **Status**: Production-Ready  
🔐 **Security Level**: Enterprise-Grade
