# The Invisible Agent (Rddhi Trading App)

**Status**: 🟢 Production Ready | **Version**: 1.0.0 | **Last Updated**: March 2026

A secure, enterprise-grade ERP system for international trade agents managing back-to-back orders with discreet financial tracking, built with React + FastAPI + MongoDB.

## 🚀 Quick Start

### Prerequisites
- Docker & Docker Compose
- Git
- (Optional) Python 3.11+, Node.js 18+

### Local Development (with Docker)

```bash
# 1. Clone repository
git clone https://github.com/yourusername/rddhi.git
cd rddhi

# 2. Create environment file
cp .env.example backend/.env
# Edit backend/.env with your local MongoDB URL

# 3. Start services
docker-compose up -d

# 4. Access application
# Frontend: http://localhost:3000
# Backend API: http://localhost:8000
# API Docs: http://localhost:8000/api/docs
```

### Local Development (without Docker)

**Backend**:
```bash
cd backend
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
python -m uvicorn server:app --reload
```

**Frontend**:
```bash
cd frontend
npm install
npm start
```

## 📋 Documentation

- **[DEPLOY_NOW.md](./DEPLOY_NOW.md)** - Step-by-step production deployment guide (60 minutes)
- **[PRODUCTION_DEPLOYMENT.md](./PRODUCTION_DEPLOYMENT.md)** - Complete deployment guide with architecture
- **[SECURITY.md](./SECURITY.md)** - Security architecture and best practices
- **[SECRETS_MANAGEMENT.md](./SECRETS_MANAGEMENT.md)** - How to safely handle secrets and credentials
- **[SECRETS_QUICK_REFERENCE.md](./SECRETS_QUICK_REFERENCE.md)** - Quick reference for the team
- **[DEPLOYMENT_CHECKLIST.md](./DEPLOYMENT_CHECKLIST.md)** - Pre/post-deployment verification
- **[CONTRIBUTING.md](./CONTRIBUTING.md)** - Contributing guidelines (includes security setup)
- **[design_guidelines.json](./design_guidelines.json)** - UI/UX design specifications

## 🏗️ Architecture

### Technology Stack

| Layer | Technology | Purpose |
|-------|-----------|---------|
| **Frontend** | React 18, Tailwind CSS, Shadcn UI | User interface |
| **Backend** | FastAPI (Python) | REST API |
| **Database** | MongoDB | Data persistence |
| **Auth** | JWT Tokens | Authentication |
| **Encryption** | Fernet (AES-128) | Field-level encryption |
| **Deployment** | Docker, Nginx | Container orchestration |

### Project Structure

```
rddhi/
├── backend/
│   ├── server.py           # FastAPI application
│   ├── security.py         # Security utilities (validators, encryption, tokens)
│   ├── requirements.txt     # Python dependencies
│   └── .env.example        # Environment template
├── frontend/
│   ├── src/
│   │   ├── contexts/       # React context (Auth, etc.)
│   │   ├── pages/          # Route pages
│   │   ├── components/     # Reusable components
│   │   └── lib/            # Utilities
│   ├── package.json        # NPM dependencies
│   └── Dockerfile          # Frontend container
├── docker-compose.yml      # Service orchestration
├── Dockerfile              # Backend container
├── SECURITY.md             # Security documentation
├── PRODUCTION_DEPLOYMENT.md # Deployment guide
└── DEPLOYMENT_CHECKLIST.md  # Pre-deployment checklist
```

## 🔐 Security Features

### Authentication & Authorization

✅ **JWT Tokens** with refresh token mechanism
✅ **Account Lockout** - 5 failed attempts → 15 min lockout
✅ **Password Requirements** - Minimum 8 chars, complexity rules
✅ **Session Management** - Automatic token refresh

### Data Protection

✅ **Field-Level Encryption** - Financial data encrypted with Fernet
✅ **Password Hashing** - bcrypt with 12 salt rounds
✅ **HTTPS/TLS** - All traffic encrypted
✅ **Input Validation** - All inputs validated and sanitized

### API Security

✅ **Rate Limiting** - 60 req/min per IP, 1000 req/hour
✅ **CORS** - Restricted to specific domains
✅ **Security Headers** - HSTS, CSP, X-Frame-Options, etc.
✅ **Request Validation** - Pydantic models with validators

### Infrastructure Security

✅ **Database Authentication** - MongoDB with credentials
✅ **Firewall Rules** - Only necessary ports open
✅ **Non-root Containers** - Services run as unprivileged user
✅ **Automated Backups** - Daily with 30-day retention

## 🚀 Deployment

### Quick Deploy to Production

```bash
# 1. Prepare on production server
ssh user@your-server.com
cd /srv
git clone https://github.com/yourusername/rddhi.git
cd rddhi

# 2. Create production environment
nano .env
# Set all production values:
# ENVIRONMENT=production
# DEBUG=false
# MONGO_URL=mongodb+srv://...
# ENCRYPTION_KEY=<generated>
# JWT_SECRET=<generated>
# etc.

# 3. Run pre-deployment checklist
# Review DEPLOYMENT_CHECKLIST.md

# 4. Build and deploy
docker-compose build
docker-compose up -d

# 5. Verify
curl https://api.yourdomain.com/health
```

### Using Docker Compose

```bash
# View logs
docker-compose logs -f api
docker-compose logs -f frontend

# Restart services
docker-compose restart api

# Update services
docker-compose pull
docker-compose up -d

# Stop services
docker-compose down

# View running containers
docker-compose ps
```

## 🔑 Environment Configuration

### Required Environment Variables

```env
# Database
MONGO_URL=mongodb+srv://user:pass@cluster.mongodb.net/
DB_NAME=rddhi_production

# Security (generate with scripts below)
ENCRYPTION_KEY=<fernet-key>
JWT_SECRET=<random-string>

# CORS
CORS_ORIGINS=https://yourdomain.com,https://app.yourdomain.com

# App
ENVIRONMENT=production
DEBUG=false
LOG_LEVEL=INFO
```

### Generate Secure Keys

```bash
# Generate ENCRYPTION_KEY (Fernet)
python3 -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())"

# Generate JWT_SECRET
python3 -c "import secrets; print(secrets.token_urlsafe(32))"
```

## 🧪 Testing

### Backend Tests

```bash
cd backend
pytest
```

### Manual Testing

```bash
# Test authentication
curl -X POST http://localhost:8000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password123"}'

# Test with token
curl -H "Authorization: Bearer <token>" \
  http://localhost:8000/api/trades

# Health check
curl http://localhost:8000/health
```

## 📊 Core Features

### Trades Management
- Create, read, update, delete trades
- Triple-ledger calculation (official bill, actual cost, sale price)
- Partial payment tracking
- Custom commission with risk premium

### Financial Analytics
- Dashboard with key metrics
- Supplier ranking by quality
- Customer trust scores
- Cash flow forecasts (30-day)
- Monthly commission reports

### Smart Payments
- Automated payment reminders (30/20/7 days)
- Collection heatmap (red/yellow/green status)
- Payment tracking (collected, partially paid)
- Due date management

### Notifications
- In-app notification system
- Payment reminder triggers
- Collection status updates
- Claims tracking

## 🔧 API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login user
- `POST /api/auth/refresh` - Refresh access token
- `POST /api/auth/logout` - Logout user
- `GET /api/auth/me` - Get current user

### Trades
- `GET /api/trades` - List user's trades
- `POST /api/trades` - Create trade
- `GET /api/trades/{id}` - Get trade details
- `PUT /api/trades/{id}` - Update trade
- `DELETE /api/trades/{id}` - Delete trade

### Analytics
- `GET /api/analytics/suppliers` - Supplier ranking
- `GET /api/analytics/customers` - Customer trust scores
- `GET /api/analytics/cashflow` - Cash flow forecast
- `GET /api/analytics/best-customers` - Top customers by commission
- `GET /api/analytics/claims` - Claims analysis
- `GET /api/analytics/commission` - Commission report

## 📱 Supported Browsers

- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+

## 🆘 Troubleshooting

### Backend won't start

```bash
# Check logs
docker-compose logs api

# Verify environment
grep MONGO_URL backend/.env

# Check database connection
python3 -c "from pymongo import MongoClient; MongoClient('YOUR_MONGO_URL')"
```

### Frontend can't connect to API

```bash
# Verify API is running
curl http://localhost:8000/health

# Check CORS in browser console
# CORS errors indicate origin mismatch
# Update CORS_ORIGINS in .env
```

### High Memory Usage

```bash
# Check container memory
docker stats

# Limit container memory in docker-compose.yml
# deploy:
#   resources:
#     limits:
#       memory: 512M
```

## 📈 Performance Tips

1. **Enable CDN** for static assets
2. **MongoDB Indexing** - Create indexes for common queries
3. **Frontend Caching** - Cache trade lists in localStorage
4. **Database Optimization** - Regular index maintenance
5. **Load Balancing** - Use reverse proxy for multiple backends

## 🔒 Security Best Practices

**For Users**:
- Use strong, unique passwords
- Enable two-factor authentication (future feature)
- Keep session tokens secure
- Report suspicious activity

**For Operators**:
- Keep systems updated
- Monitor logs and alerts
- Test disaster recovery monthly
- Rotate secrets quarterly
- Review access logs

**For Developers**:
- Never commit `.env` files or secrets
- Always validate user input
- Use parameterized queries
- Handle errors securely
- Log appropriate detail level

## 🤝 Support & Contributing

### Issues & Bugs

Report security issues to: `security@rddhi.com` (NOT GitHub issues)

### Contributing

1. Fork repository
2. Create feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit changes (`git commit -m 'Add AmazingFeature'`)
4. Push to branch (`git push origin feature/AmazingFeature`)
5. Open Pull Request

### Code Standards

- Python: PEP 8
- JavaScript: Prettier + ESLint
- Security: Follow OWASP guidelines

## 📄 License

MIT License - see LICENSE file

## 📞 Contact

- **Email**: support@rddhi.com
- **GitHub**: https://github.com/yashhpatel19/rddhi
- **Issues**: https://github.com/yashhpatel19/rddhi/issues

---

**Made with ❤️ for International Trade Agents**

**Current Version**: 1.0.0
**Built**: March 2026
**Status**: Production Ready 🚀

