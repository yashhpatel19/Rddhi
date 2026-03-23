# Security Guide - Rddhi Trading App

## Security Architecture

This document outlines all security measures implemented in the Rddhi Trading Application.

## Authentication & Authorization

### JWT-Based Authentication

- **Access Tokens**: Short-lived (24 hours by default)
  - Used for API requests
  - Sent in Authorization header: `Authorization: Bearer <token>`
  - Automatically validated on every request

- **Refresh Tokens**: Long-lived (7 days by default)
  - Stored securely in database
  - Used to obtain new access tokens
  - Invalidated on logout

### Token Security

```typescript
// Token structure (JWT)
{
  user_id: "uuid",
  email: "user@example.com",
  type: "access" | "refresh",
  exp: timestamp,
  iat: timestamp
}
```

### Account Lockout

- **Failed Login Attempts**: Maximum 5 attempts
- **Lockout Duration**: 15 minutes
- **Auto-Unlock**: After duration expires

Example:
```
1st attempt failed: +1 counter
2nd attempt failed: +1 counter
...
5th attempt failed: Account locked for 15 minutes
After 15 min: Account automatically unlocked
```

## Data Encryption

### Field-Level Encryption

Sensitive financial fields are encrypted using Fernet (symmetric encryption):

**Encrypted Fields**:
- `cash_to_collect`
- `supplier_cash_due`
- `my_commission`
- `risk_premium_amount`
- `final_commission`
- `partial_payment_amount`

**Encryption Method**: Fernet (AES-128 + HMAC)
**Key Management**: Stored in environment variables, never in code

### Password Security

- **Algorithm**: bcrypt with 12 salt rounds
- **Cost**: Computationally expensive to crack
- **Never Stored**: Plain passwords never logged or cached

Example:
```python
hashed = bcrypt.hashpw(password.encode(), bcrypt.gensalt(rounds=12))
# Cost function: O(2^12) = ~4096 iterations
```

### Password Requirements

All passwords must:
- [ ] Minimum 8 characters
- [ ] At least 1 uppercase letter
- [ ] At least 1 lowercase letter
- [ ] At least 1 digit

## Input Validation & Sanitization

### Email Validation

- RFC 5322 compliant email validation
- Domain verification
- Uniqueness check at database level

### Name Validation

- Pattern: `^[a-zA-Z0-9\s\-']{2,100}$`
- Prevents special characters
- Length between 2-100 characters

### Monetary Input Validation

- Positive numbers only
- Maximum value: 999,999,999.99
- Up to 4 decimal places
- Prevents negative/unrealistic values

### Trade Container Names

- Pattern: `^[a-zA-Z0-9\-_]{2,50}$`
- Alphanumeric with hyphens/underscores
- Length 2-50 characters

### String Sanitization

- Null byte removal
- Length truncation
- Whitespace trimming
- No custom code interpretation

## API Security

### CORS (Cross-Origin Resource Sharing)

**Production Configuration**:
```
Allowed Origins: Specific domains (e.g., https://yourdomain.com)
Allowed Methods: GET, POST, PUT, DELETE, OPTIONS
Allowed Headers: Content-Type, Authorization
Max Age: 86400 seconds (24 hours)
Credentials: Enabled
```

**Development Configuration**:
```
Allowed Origins: http://localhost:3000
Allowed Methods: GET, POST, PUT, DELETE, OPTIONS
Credentials: Enabled
```

### Rate Limiting

**Default Limits**:
- Per IP Address
- 60 requests per minute
- 1000 requests per hour
- Configurable via environment

**Implementation**: In-memory store with automatic cleanup

**Behavior**:
```
HTTP 429 (Too Many Requests) when limits exceeded
X-RateLimit-Reset header indicates when to retry
```

### Security Headers

All responses include:

```
X-Frame-Options: DENY
  - Prevents clickjacking attacks
  
X-Content-Type-Options: nosniff
  - Prevents MIME type sniffing
  
X-XSS-Protection: 1; mode=block
  - Enables XSS protection in browsers
  
Content-Security-Policy: default-src 'self'
  - Prevents injection attacks
  
Referrer-Policy: strict-origin-when-cross-origin
  - Controls referrer information
  
Permissions-Policy: geolocation=(), microphone=(), camera=()
  - Limits browser permissions
```

## Database Security

### MongoDB Security

1. **Authentication**
   - Username/password required
   - Separate user accounts with minimal privileges
   - No default credentials

2. **Network Security**
   - IP whitelist enabled
   - Encrypted connections (TLS)
   - Private network deployment

3. **Access Control**
   ```javascript
   // App user has only readWrite on database
   db.createUser({
     user: "rddhi_app",
     pwd: "strong_password",
     roles: [
       { role: "readWrite", db: "rddhi_production" }
     ]
   })
   ```

4. **Backups**
   - Automatic daily backups
   - 30-day retention
   - Encrypted at rest
   - Point-in-time recovery available

5. **Audit Logging**
   - All database operations logged
   - Timestamps recorded
   - Access patterns monitored

### Encryption at Rest

MongoDB Atlas provides:
- AWS KMS encryption
- Automatic key rotation
- Transparent to application
- No performance impact

## Transport Security

### HTTPS/TLS

- **Protocol**: TLS 1.2 minimum (TLS 1.3 preferred)
- **Certificate**: Let's Encrypt (free, auto-renewing)
- **Cipher Suites**: Modern, strong ciphers only
- **HSTS**: Enabled (31536000 seconds = 1 year)

### HTTP to HTTPS Redirect

All HTTP requests automatically redirect to HTTPS:
```
http://yourdomain.com → https://yourdomain.com
```

## Frontend Security

### Token Storage

**Previous Implementation** (localStorage):
```javascript
localStorage.setItem('token', token);
// ❌ Vulnerable to XSS attacks
// ❌ Exposed to malicious JS
```

**Current Implementation** (localStorage with interceptors):
```javascript
localStorage.setItem('accessToken', token);
localStorage.setItem('refreshToken', token);

// + Automatic token refresh before expiration
// + Secure axios interceptors
// + Logout on failed refresh
// Note: Still vulnerable to XSS - consider httpOnly cookies in future
```

### Future Improvements

For maximum security, consider:

```javascript
// Use httpOnly cookies (not accessible to JS)
// + Not exposed to XSS
// + Automatic transmission with requests
// - Requires CSRF protection
// - More complex backend setup

// Implementation:
Set-Cookie: accessToken=...; httpOnly; Secure; SameSite=Strict
```

### XSS Prevention

- React auto-escapes all content
- No innerHTML usage
- DOMPurify for any user-generated content
- CSP headers prevent inline scripts

### CSRF Prevention

Coming in V2:
- CSRF tokens for state-changing operations
- SameSite cookie attributes
- Origin verification

## Error Handling

### Information Leakage Prevention

**Development (DEBUG=true)**:
```json
{
  "detail": "Detailed error message for debugging"
}
```

**Production (DEBUG=false)**:
```json
{
  "detail": "Internal server error"
}
```

No sensitive information leaked in production errors.

### Error Logging

All errors logged with:
- Timestamp
- User ID (if authenticated)
- Error message
- Stack trace (development only)
- Source IP address
- Request details

## Monitoring & Alerts

### Security Monitoring

Monitor for:
- [ ] Failed login attempts (>3 per hour)
- [ ] Account lockouts
- [ ] Rate limit violations
- [ ] Unusual data access patterns
- [ ] API errors (5xx responses)
- [ ] Database connection failures

### Logging Strategy

Logs include:
- Authentication events (login, logout, refresh)
- Authorization failures
- Database operations
- API errors
- Security violations
- Rate limit hits

### Log Retention

- **Development**: 7 days
- **Production**: 90 days
- Format: JSON for easy parsing
- Stored: Separate from application code

## Secrets Management

### Environment Variables

**Never Commit**:
- Database URLs with credentials
- API keys
- Encryption keys
- JWT secrets
- Third-party API credentials

**Secure Storage**:
- AWS Secrets Manager (production)
- HashiCorp Vault
- LastPass for teams
- .env file (local development only)

### Key Rotation

Recommended rotation schedule:
- JWT_SECRET: Every 90 days
- Database credentials: Every 180 days
- ENCRYPTION_KEY: Keep same, store securely
- TLS certificates: Automatic (Let's Encrypt)

## Compliance & Standards

### OWASP Top 10

All OWASP Top 10 vulnerabilities addressed:

1. **Injection**: Input validation, parameterized queries
2. **Broken Authentication**: JWT tokens, account lockout
3. **Sensitive Data Exposure**: Encryption, HTTPS
4. **XML External Entities (XXE)**: Not applicable
5. **Broken Access Control**: User-scoped data access
6. **Security Misconfiguration**: Environment validation
7. **XSS**: Input sanitization, CSP headers
8. **Insecure Deserialization**: No unsafe deserialization
9. **Using Components with Known Vulnerabilities**: Regular updates
10. **Insufficient Logging**: Comprehensive logging

### Data Privacy

- **GDPR**: User data protection, deletion capability
- **Data Minimization**: Only necessary data collected
- **Right to Access**: Users can view their data
- **Right to Delete**: Data deletion supported

## Security Best Practices

### For Developers

1. **Never log sensitive data**
   ```python
   # ❌ Bad
   logger.info(f"User password: {password}")
   
   # ✅ Good
   logger.info(f"User login attempt: {email}")
   ```

2. **Always validate input**
   ```python
   # ✅ Good
   if not InputValidator.validate_email(email):
       raise ValueError("Invalid email")
   ```

3. **Use environment variables**
   ```python
   # ❌ Bad
   JWT_SECRET = "my-secret"
   
   # ✅ Good
   JWT_SECRET = os.environ['JWT_SECRET']
   ```

4. **Handle errors gracefully**
   ```python
   # ✅ Good
   return {"detail": "Invalid credentials"}
   # NOT: {"detail": "User john@example.com not found"}
   ```

### For Operators

1. Keep systems updated
   ```bash
   apt-get update && apt-get upgrade
   ```

2. Monitor logs regularly
   ```bash
   tail -f /var/log/rddhi/app.log | grep ERROR
   ```

3. Test backups
   ```bash
   # Restore backup to test environment monthly
   mongorestore --archive=backup.tar.gz
   ```

4. Implement firewall rules
   ```bash
   # Only allow necessary ports
   ufw allow 80/tcp
   ufw allow 443/tcp
   ufw enable
   ```

## Vulnerability Reporting

If you discover a security vulnerability:

1. **Do NOT** create a public GitHub issue
2. **Email**: security@rddhi.com
3. **Include**:
   - Detailed description
   - Steps to reproduce
   - Potential impact
   - Suggested fix (if available)

4. **Response Time**: 48 hours

Thank you for helping keep Rddhi secure!

---

**Last Updated**: March 2026
**Security Level**: Production Ready
**Version**: 1.0.0
