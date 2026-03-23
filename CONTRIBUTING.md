# Contributing to Rddhi Trading App

Thank you for your interest in contributing! This document provides guidelines for contributing to the project.

## Code of Conduct

- Be respectful and inclusive
- Focus on the code, not the person
- Help others grow their skills
- Report security issues privately

## Getting Started

### Setup Development Environment

```bash
# Clone repository
git clone https://github.com/yourusername/rddhi.git
cd rddhi

# Backend setup
cd backend
python -m venv venv
source venv/bin/activate  # or `venv\Scripts\activate` on Windows
pip install -r requirements.txt
cp .env.example .env

# Frontend setup
cd ../frontend
npm install
```

### Security Setup (IMPORTANT!)

Before running the app, you MUST set up security:

```bash
# 1. Install pre-commit hooks (prevents accidental secret commits)
./scripts/setup-security-hooks.sh

# 2. Create local .env files from examples
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env

# 3. Generate development secrets
./generate-secrets.sh
# Copy ENCRYPTION_KEY and JWT_SECRET from output into backend/.env

# 4. Set local MongoDB credentials in backend/.env
# MONGO_URL=mongodb://rddhi_user:password@localhost:27017/rddhi_trading?authSource=admin
```

⚠️ **CRITICAL**: Read [SECRETS_MANAGEMENT.md](SECRETS_MANAGEMENT.md) before your first commit!

### Running Locally

```bash
# Terminal 1 - Backend
cd backend
source venv/bin/activate
python -m uvicorn server:app --reload

# Terminal 2 - Frontend
cd frontend
npm start

# Terminal 3 - MongoDB (if not using Docker)
mongod
```

**With Docker**:
```bash
docker-compose up -d
```

## Development Workflow

### 1. Create Feature Branch

```bash
git checkout -b feature/your-feature-name
# or
git checkout -b fix/bug-description
```

Branch naming:
- `feature/` - New feature
- `fix/` - Bug fix
- `docs/` - Documentation
- `refactor/` - Code refactoring
- `test/` - Test additions

### 2. Make Changes

**Please follow:**

#### Python/Backend
- Style: PEP 8 (use `black` for formatting)
- Imports: Use `isort` for organization
- Type hints: Use for all function parameters
- Docstrings: Google-style docstrings
- Testing: Write tests for new functions

```python
def create_trade(trade_data: Dict[str, Any]) -> str:
    """Create a new trade record.
    
    Args:
        trade_data: Dictionary containing trade information
        
    Returns:
        Trade ID of created trade
        
    Raises:
        ValueError: If trade data is invalid
    """
    # Implementation
```

**Run formatters**:
```bash
cd backend
black .
isort .
flake8 .
mypy .
```

#### JavaScript/Frontend
- Style: Prettier (configured)
- Linting: ESLint (configured)
- Format: `npm run format`
- Lint: `npm run lint`

```bash
cd frontend
npm run format
npm run lint
```

### 3. Write Tests

**Backend**:
```python
# backend/tests/test_auth.py
def test_register_valid_user():
    """Test successful user registration"""
    # Arrange
    user_data = {
        "name": "John Doe",
        "email": "john@example.com",
        "password": "SecurePass123"
    }
    
    # Act
    result = register_user(user_data)
    
    # Assert
    assert result['id'] is not None
    assert result['email'] == user_data['email']
```

**Frontend**:
```javascript
// frontend/src/__tests__/auth.test.js
test('login with valid credentials', async () => {
    const response = await login('user@example.com', 'password123');
    expect(response).toHaveProperty('accessToken');
});
```

**Run tests**:
```bash
# Backend
cd backend
pytest

# Frontend
cd frontend
npm test
```

### 4. Commit Changes

**Commit message format**:
```
type(scope): subject

body

footer
```

**Types**:
- `feat`: Feature addition
- `fix`: Bug fix
- `docs`: Documentation
- `style`: Code style (formatting)
- `refactor`: Code refactoring
- `test`: Test additions
- `chore`: Maintenance

**Example**:
```
feat(trades): add partial payment tracking

Implement partial payment feature allowing users to mark
payments as partially collected and track remaining balance.

- Add `is_partially_paid` flag to trade
- Add `partial_payment_amount` field
- Add dialog UI for partial payment entry
- Update analytics to include partial payments

Closes #123
```

### 5. Push and Create Pull Request

```bash
git push origin feature/your-feature-name
```

**Pull Request Format**:
```markdown
## Description
Brief description of changes

## Related Issues
Closes #123

## Type of Change
- [ ] Bug fix
- [ ] Feature addition
- [ ] Breaking change
- [ ] Documentation

## Testing
- [ ] Unit tests added/updated
- [ ] Manual testing completed
- [ ] No new warnings generated

## Checklist
- [ ] Code follows style guidelines
- [ ] Self-review completed
- [ ] Documentation updated
- [ ] No sensitive data in commits
- [ ] Tests pass locally
```

## Security Considerations

### When Contributing Code

⚠️ **NEVER**:
- Commit `.env` files or secrets
- Log sensitive information
- Use hardcoded API keys/passwords
- Store user passwords in plain text
- Use `eval()` or `exec()`

✅ **DO**:
- Validate all user input
- Encrypt sensitive data
- Use environment variables for secrets
- Follow OWASP guidelines
- Test for SQL/NoSQL injection
- Report security issues privately

### Reporting Security Issues

**DO NOT** create public GitHub issues for security vulnerabilities!

Instead, email: `security@rddhi.com`

Include:
- Description of vulnerability
- Steps to reproduce
- Potential impact
- Suggested fix (optional)

## Documentation

### Code Documentation

- Write docstrings for all functions/classes
- Use clear, concise language
- Include type hints
- Add examples for complex functions

### User Documentation

Changes affecting users?
- Update README.md
- Update API documentation
- Add user guide entries
- Update SECURITY.md if security-related

## Testing Requirements

### Coverage Targets

- Backend: Minimum 80% code coverage
- Frontend: Minimum 70% code coverage
- Critical paths: 100% coverage

### Manual Testing Checklist

Before submitting PR, manually test:

- [ ] Feature works as expected
- [ ] Error handling works
- [ ] Mobile responsive
- [ ] No console errors/warnings
- [ ] Performance acceptable
- [ ] Data persists correctly
- [ ] Logout/login cycle works

## Performance

### Backend Optimization

- Use database indexes for frequent queries
- Avoid N+1 query problems
- Cache frequently accessed data
- Profile slow endpoints

### Frontend Optimization

- Lazy load components
- Minimize bundle size
- Optimize images
- Use React.memo for expensive components

## Deployment

### Before Merging to Main

- [ ] All tests passing
- [ ] Code review approved
- [ ] Pre-deployment checklist reviewed
- [ ] No merge conflicts
- [ ] Changelog updated

### CI/CD Pipeline

We use GitHub Actions for:
- Running tests
- Code quality checks
- Security scanning
- Building artifacts

View workflows in `.github/workflows/`

## Version Management

We follow [Semantic Versioning](https://semver.org/):

- MAJOR: Breaking changes
- MINOR: Feature additions
- PATCH: Bug fixes

Example: `1.2.3`

Update `CHANGELOG.md` with:
- New features
- Bug fixes
- Breaking changes
- Security updates

## Release Process

1. Update version in files
2. Update CHANGELOG.md
3. Create release tag
4. Upload artifacts
5. Create GitHub Release
6. Deploy to production

## Communication

### Questions?

- **GitHub Issues**: Feature requests, bug reports
- **GitHub Discussions**: Questions, ideas
- **Email**: technical questions → dev@rddhi.com

### Staying Updated

- Watch releases
- Follow GitHub discussions
- Subscribe to security advisories

## Additional Resources

- [API Documentation](./README.md#-api-endpoints)
- [Architecture Guide](./README.md#-architecture)
- [Security Guide](./SECURITY.md)
- [Deployment Guide](./PRODUCTION_DEPLOYMENT.md)
- [OWASP Guidelines](https://owasp.org/www-project-top-ten/)

## Recognition

Contributors will be recognized in:
- CONTRIBUTORS.md
- Release notes
- GitHub sponsors (if applicable)

---

**Thank you for contributing to Rddhi! 🙏**

By contributing, you agree to the MIT License and Code of Conduct.
