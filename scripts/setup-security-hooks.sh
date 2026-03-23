#!/bin/bash
# Setup script to install security hooks and pre-commit checks
# Run: ./scripts/setup-security-hooks.sh

set -e

echo "🔐 Setting up security hooks..."

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m'

# Check if git repo exists
if [ ! -d ".git" ]; then
    echo -e "${RED}✗ Not a git repository. Run from project root.${NC}"
    exit 1
fi

# Create hooks directory if it doesn't exist
mkdir -p .git/hooks

# Install pre-commit hook
if [ ! -f "scripts/pre-commit-hook" ]; then
    echo -e "${RED}✗ scripts/pre-commit-hook not found${NC}"
    exit 1
fi

echo "📝 Installing pre-commit hook..."
cp scripts/pre-commit-hook .git/hooks/pre-commit
chmod +x .git/hooks/pre-commit

if [ -x ".git/hooks/pre-commit" ]; then
    echo -e "${GREEN}✓ Pre-commit hook installed${NC}"
else
    echo -e "${RED}✗ Failed to install pre-commit hook${NC}"
    exit 1
fi

# Verify .gitignore exists
echo "🔍 Verifying .gitignore..."
if [ ! -f ".gitignore" ]; then
    echo -e "${RED}✗ .gitignore not found in project root${NC}"
    exit 1
fi

# Check critical .gitignore patterns
CRITICAL_PATTERNS=("\.env" "secret" "\.key" "\.pem")
for pattern in "${CRITICAL_PATTERNS[@]}"; do
    if grep -q "$pattern" .gitignore; then
        echo -e "${GREEN}✓ .gitignore includes $pattern${NC}"
    else
        echo -e "${RED}⚠ .gitignore missing pattern: $pattern${NC}"
    fi
done

# Set restrictive permissions on local .env files
echo "🔒 Setting file permissions..."
for env_file in backend/.env frontend/.env .env; do
    if [ -f "$env_file" ]; then
        chmod 600 "$env_file"
        echo -e "${GREEN}✓ $env_file set to 600 permissions${NC}"
    fi
done

# Verify no commits with secrets
echo "📊 Checking git history for accidental secrets..."
SUSPICIOUS_COMMITS=0

# Search for common secret patterns
if git log --all --oneline | grep -i "secret\|password\|token" > /dev/null 2>&1; then
    echo -e "${BLUE}ℹ  Found commits mentioning secrets in message (review these)${NC}"
    ((SUSPICIOUS_COMMITS++))
fi

# Check for .env commits
if git log --all --full-history --pretty=format: --name-status | grep -E "^[A-Z].*\.env$" | grep -v "\.env\.example" > /dev/null 2>&1; then
    echo -e "${RED}✗ Found .env files in git history!${NC}"
    echo "  This is a security issue. See SECRETS_MANAGEMENT.md for remediation."
    ((SUSPICIOUS_COMMITS++))
fi

if [ $SUSPICIOUS_COMMITS -eq 0 ]; then
    echo -e "${GREEN}✓ No obvious secrets found in git history${NC}"
fi

# Final summary
echo ""
echo -e "${BLUE}═══════════════════════════════════════${NC}"
echo -e "${GREEN}✓ Security hooks successfully installed!${NC}"
echo -e "${BLUE}═══════════════════════════════════════${NC}"
echo ""
echo "What was installed:"
echo "  • Pre-commit hook: .git/hooks/pre-commit"
echo "    - Blocks commits with .env files"
echo "    - Detects secret patterns"
echo "    - Checks file permissions"
echo ""
echo "Next steps:"
echo "  1. Copy .env.example to .env: cp backend/.env.example backend/.env"
echo "  2. Fill in local values (development only)"
echo "  3. Try committing: git add . && git commit -m 'test'"
echo "     (will be blocked if secrets detected)"
echo ""
echo "Configuration files to review:"
echo "  • .gitignore - Git ignore rules"
echo "  • SECRETS_MANAGEMENT.md - Detailed security guide"
echo "  • SECRETS_QUICK_REFERENCE.md - Quick reference"
echo ""
echo -e "${BLUE}For more info, see: SECRETS_MANAGEMENT.md${NC}"
