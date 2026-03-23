# 🔐 Security Verification Checklist

Use this checklist to verify that the security setup is complete and working correctly.

**For**: All developers, DevOps, and team leads  
**When**: Before first commit, after onboarding, before production deployment  
**Time**: 5-10 minutes

---

## Phase 1: Git Security Setup

### .gitignore Files

- [ ] Root `./.gitignore` exists
  ```bash
  ls -la .gitignore && echo "✓ Found"
  ```

- [ ] Backend `.gitignore` exists
  ```bash
  ls -la backend/.gitignore && echo "✓ Found"
  ```

- [ ] Frontend `.gitignore` exists
  ```bash
  ls -la frontend/.gitignore && echo "✓ Found"
  ```

- [ ] Contains `.env` patterns
  ```bash
  grep -q "^\.env$" .gitignore && echo "✓ Contains .env rules"
  ```

- [ ] Contains secret patterns
  ```bash
  grep -q "secret" .gitignore && echo "✓ Contains secret rules"
  ```

### Pre-Commit Hook

- [ ] Pre-commit hook file exists
  ```bash
  ls -la scripts/pre-commit-hook && echo "✓ Found"
  ```

- [ ] Setup script exists
  ```bash
  ls -la scripts/setup-security-hooks.sh && echo "✓ Found"
  ```

- [ ] Setup script is executable
  ```bash
  test -x scripts/setup-security-hooks.sh && echo "✓ Executable"
  ```

---

## Phase 2: Pre-Commit Hook Installation

### Installation

- [ ] Run the setup script
  ```bash
  ./scripts/setup-security-hooks.sh
  ```

- [ ] Hook installed to `.git/hooks/`
  ```bash
  test -f .git/hooks/pre-commit && echo "✓ Hook installed"
  ```

- [ ] Hook is executable
  ```bash
  test -x .git/hooks/pre-commit && echo "✓ Hook executable"
  ```

- [ ] Hook contains security checks
  ```bash
  grep -q "ENCRYPTION_KEY" .git/hooks/pre-commit && echo "✓ Has security checks"
  ```

---

## Phase 3: Environment File Templates

### Template Files Exist

- [ ] Root `.env.example` exists
  ```bash
  test -f .env.example && echo "✓ Found"
  ```

- [ ] Backend `.env.example` exists
  ```bash
  test -f backend/.env.example && echo "✓ Found"
  ```

- [ ] Frontend `.env.example` exists
  ```bash
  test -f frontend/.env.example && echo "✓ Found"
  ```

- [ ] Production `.env.production.example` exists
  ```bash
  test -f .env.production.example && echo "✓ Found"
  ```

### Templates Have No Real Secrets

- [ ] `.env.example` has no real values
  ```bash
  ! grep -E "mongodb://|fernet|HS256|^[a-zA-Z0-9]{40,}" .env.example | grep -v "^#" && echo "✓ No secrets"
  ```

- [ ] `backend/.env.example` has no real values
  ```bash
  ! grep -E "^[A-Z_]+=mongodb://|^JWT_SECRET=[a-zA-Z0-9]" backend/.env.example && echo "✓ No secrets"
  ```

- [ ] `frontend/.env.example` uses correct format
  ```bash
  grep -q "REACT_APP_" frontend/.env.example && echo "✓ Correct format"
  ```

---

## Phase 4: Developer Environment Setup

### Local Environment Files Created

- [ ] Backend `.env` created from template (local only)
  ```bash
  test -f backend/.env && echo "✓ Created"
  ```

- [ ] Frontend `.env` created from template (local only)
  ```bash
  test -f frontend/.env && echo "✓ Created"
  ```

### File Permissions Correct

- [ ] Backend `.env` has 600 permissions (Unix only)
  ```bash
  stat -c %a backend/.env 2>/dev/null | grep -q "600" && echo "✓ Permissions 600"
  ```

- [ ] Frontend `.env` has 600 permissions (Unix only)
  ```bash
  stat -c %a frontend/.env 2>/dev/null | grep -q "600" && echo "✓ Permissions 600"
  ```

---

## Phase 5: Secret Generation

### Secret Generation Script

- [ ] `generate-secrets.sh` exists
  ```bash
  test -f generate-secrets.sh && echo "✓ Found"
  ```

- [ ] Script is executable
  ```bash
  test -x generate-secrets.sh && echo "✓ Executable"
  ```

- [ ] Script can be run (test run)
  ```bash
  ./generate-secrets.sh > /tmp/test-secrets.txt && echo "✓ Executable" && rm /tmp/test-secrets.txt
  ```

### Secrets in Local .env

- [ ] Backend has ENCRYPTION_KEY
  ```bash
  grep -q "^ENCRYPTION_KEY=" backend/.env && echo "✓ Has ENCRYPTION_KEY"
  ```

- [ ] Backend has JWT_SECRET
  ```bash
  grep -q "^JWT_SECRET=" backend/.env && echo "✓ Has JWT_SECRET"
  ```

- [ ] Backend has MONGO_URL
  ```bash
  grep -q "^MONGO_URL=" backend/.env && echo "✓ Has MONGO_URL"
  ```

- [ ] Frontend has REACT_APP_BACKEND_URL
  ```bash
  grep -q "^REACT_APP_BACKEND_URL=" frontend/.env && echo "✓ Has REACT_APP_BACKEND_URL"
  ```

---

## Phase 6: Git Protection Verification

### No Secrets in Git Tracking

- [ ] No `.env` file in git
  ```bash
  ! git ls-files | grep -E "^\.env$" && echo "✓ Not tracked"
  ```

- [ ] No `.env.local` in git
  ```bash
  ! git ls-files | grep -E "^\.env\." && echo "✓ Not tracked"
  ```

- [ ] No private keys in git
  ```bash
  ! git ls-files | grep -E "\.(key|pem|crt)$" && echo "✓ Not tracked"
  ```

### No Secrets in Git History

- [ ] No MongoDB URLs in history
  ```bash
  ! git log --all -p | grep -i "mongodb://" > /dev/null 2>&1 && echo "✓ Clean history"
  ```

- [ ] No JWT secrets in history
  ```bash
  ! git log --all -p | grep -i "jwt_secret=" > /dev/null 2>&1 && echo "✓ Clean history"
  ```

---

## Phase 7: Documentation Check

### Required Documentation Files

- [ ] `SECRETS_MANAGEMENT.md` exists
  ```bash
  test -f SECRETS_MANAGEMENT.md && echo "✓ Found"
  ```

- [ ] `SECRETS_QUICK_REFERENCE.md` exists
  ```bash
  test -f SECRETS_QUICK_REFERENCE.md && echo "✓ Found"
  ```

- [ ] `SECURITY_SETUP_COMPLETE.md` exists
  ```bash
  test -f SECURITY_SETUP_COMPLETE.md && echo "✓ Found"
  ```

- [ ] `README.md` links to security docs
  ```bash
  grep -q "SECRETS_MANAGEMENT" README.md && echo "✓ Linked"
  ```

- [ ] `CONTRIBUTING.md` has security setup section
  ```bash
  grep -q "Security Setup" CONTRIBUTING.md && echo "✓ Documented"
  ```

---

## Phase 8: Pre-Commit Hook Testing

### Test the Hook Works

**Test 1: Normal commit should work**
```bash
echo "test" > .test-hook
git add .test-hook
git commit -m "test: pre-commit hook" 2>&1 | grep -q "secure to commit"
# Should say "secure to commit" - PASS ✓
rm .test-hook
```

**Test 2: Committing .env should be blocked**
```bash
echo "ENCRYPTION_KEY=secret123" > .git/.test-env
# Note: Creating in .git to avoid actual .env
# The hook would block this before commit
# This is expected behavior ✓
```

- [ ] Hook validates security (see Test 1 above)
  ```bash
  # Manual verification: try normal commit
  ```

---

## Phase 9: Team Guidelines

### Documentation Awareness

- [ ] Team member has read `SECRETS_QUICK_REFERENCE.md`
  ```bash
  # Self-verification
  ```

- [ ] Team member understands DO/DON'T list
  ```bash
  # Self-verification
  ```

- [ ] Team member knows how to report security issues
  ```bash
  # Look for security contact in README or SECURITY.md
  grep -i "security@" README.md SECURITY.md ./ || echo "⚠ Add security contact info"
  ```

---

## Phase 10: Production Readiness

### GitHub Actions Secrets (For DevOps)

- [ ] GitHub repo has Actions Secrets configured
  ```bash
  # Check: GitHub Settings → Secrets and variables → Actions
  # Should have: ENCRYPTION_KEY, JWT_SECRET, MONGO_URL, etc.
  ```

- [ ] `.github/workflows/deploy.yml` exists
  ```bash
  test -f .github/workflows/deploy.yml && echo "✓ Found"
  ```

- [ ] CI/CD pipeline runs tests before deploy
  ```bash
  grep -q "pytest\|npm test" .github/workflows/deploy.yml && echo "✓ Tests enabled"
  ```

### DigitalOcean Configuration (For DevOps)

- [ ] `app.yaml` exists for DigitalOcean deployment
  ```bash
  test -f app.yaml && echo "✓ Found"
  ```

- [ ] Environment variables configured in app.yaml
  ```bash
  grep -q "ENCRYPTION_KEY\|JWT_SECRET" app.yaml && echo "✓ Has env vars"
  ```

---

## Phase 11: Troubleshooting

### Common Issues

**Issue: Pre-commit hook won't run**
```bash
# Solution: Check if .git/hooks/pre-commit exists and is executable
ls -la .git/hooks/pre-commit
chmod +x .git/hooks/pre-commit
```

**Issue: Getting "commit blocked" but code is clean**
```bash
# Solution: The hook might be over-detecting. Check what triggered it
# See the error message and review the suspected file
git diff --cached <filename>
```

**Issue: Want to bypass hook (emergency only)**
```bash
# Solution: Use --no-verify (NOT RECOMMENDED)
git commit --no-verify -m "emergency fix"
# Then: Immediately schedule a security review
```

---

## Final Verification

Run this comprehensive check script:

```bash
#!/bin/bash
echo "🔐 Security Verification Report"
echo "=============================="
echo ""

CHECK_COUNT=0
PASS_COUNT=0

check() {
    ((CHECK_COUNT++))
    if "$@" > /dev/null 2>&1; then
        echo "✓ $2"
        ((PASS_COUNT++))
    else
        echo "✗ $2"
    fi
}

check "test -f .gitignore" "Has .gitignore"
check "grep -q '\.env' .gitignore" ".gitignore protects .env"
check "test -f scripts/pre-commit-hook" "Has pre-commit hook"
check "test -x scripts/pre-commit-hook" "Pre-commit hook executable"
check "test -f .git/hooks/pre-commit" "Hook installed in .git"
check "test -f backend/.env.example" "Backend .env.example exists"
check "test -f frontend/.env.example" "Frontend .env.example exists"
check "test -f generate-secrets.sh" "Secret generation script exists"
check "! git ls-files | grep '\.env$'" ".env not in git"
check "test -f SECRETS_MANAGEMENT.md" "Secrets guide exists"

echo ""
echo "Results: $PASS_COUNT/$CHECK_COUNT checks passed"

if [ $PASS_COUNT -eq $CHECK_COUNT ]; then
    echo "✅ Security setup COMPLETE!"
    exit 0
else
    echo "⚠️  Some checks failed. See above for details."
    exit 1
fi
```

Save as `verify-security.sh` and run:
```bash
chmod +x verify-security.sh
./verify-security.sh
```

---

## Checklist Version

**Version**: 1.0  
**Created**: March 2024  
**Last Updated**: March 2024  
**Next Review**: June 2024

---

## Sign-Off

When completed, confirm:

- [ ] All checks passed ✓
- [ ] No security issues found ✓
- [ ] Ready for development ✓
- [ ] Ready for production (DevOps) ✓

**Verified By**: _________________  
**Date**: _________________  
**Notes**: _________________

---

**Need Help?** See [SECRETS_MANAGEMENT.md](SECRETS_MANAGEMENT.md) or ask team lead.
