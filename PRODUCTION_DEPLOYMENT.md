# Production Deployment Guide - Rddhi Trading App

## Overview

This guide covers deploying "The Invisible Agent" (Rddhi Trading App) to production with proper security, scalability, and reliability.

## Prerequisites

- Docker & Docker Compose
- MongoDB Atlas account (or self-hosted MongoDB with authentication)
- AWS/GCP/Azure account (for hosting, or any cloud provider)
- Domain name with SSL certificate
- Basic knowledge of Linux, Docker, and deployment

## Architecture

```
┌─────────────────────────────────────────────────────┐
│                   Internet Users                     │
└─────────────────────┬───────────────────────────────┘
                      │
┌─────────────────────▼───────────────────────────────┐
│              Reverse Proxy (Nginx)                   │
│         - SSL/TLS Termination                        │
│         - Load Balancing                             │
│         - Rate Limiting                              │
└─────────────────────┬───────────────────────────────┘
                      │
        ┌─────────────┴──────────────┐
        │                            │
┌───────▼────────────────┐  ┌───────▼────────────────┐
│  Frontend (React)      │  │  Backend (FastAPI)     │
│  - Static Assets       │  │  - REST API            │
│  - Load & Deploy       │  │  - Security            │
│  - CDN Cacheable       │  │  - Rate Limiting       │
└────────────────────────┘  └───────┬────────────────┘
                                    │
                      ┌─────────────▼────────────────┐
                      │    MongoDB (Production)      │
                      │ - Authentication             │
                      │ - Encrypted Connections      │
                      │ - Backups & Replication      │
                      └──────────────────────────────┘
```

## Security Checklist

Before deploying to production:

- [ ] All environment variables set securely (.env file in production server only)
- [ ] MongoDB authentication enabled with strong credentials
- [ ] ENCRYPTION_KEY generated and stored securely
- [ ] JWT_SECRET generated with cryptographically strong randomness
- [ ] CORS_ORIGINS set to specific domains (not "*")
- [ ] HTTPS/SSL certificates installed
- [ ] Database backups configured
- [ ] Monitoring and logging enabled
- [ ] Rate limiting configured appropriately
- [ ] Firewall rules restrictive (only necessary ports open)
- [ ] Database backups automated
- [ ] Secrets manager (AWS Secrets Manager, etc.) configured

## Step 1: Prepare Environment

### Generate Secure Keys

```bash
# Generate ENCRYPTION_KEY (Fernet)
python3 -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())"

# Generate JWT_SECRET (Strong random)
python3 -c "import secrets; print(secrets.token_urlsafe(32))"
```

### Create Production .env File

On your production server, create `/srv/rddhi/.env`:

```bash
sudo mkdir -p /srv/rddhi
sudo nano /srv/rddhi/.env
```

Fill with (NEVER commit this to Git):

```
ENVIRONMENT=production
DEBUG=false
LOG_LEVEL=INFO

# Database
MONGO_URL=mongodb+srv://username:password@cluster.mongodb.net/?retryWrites=true&w=majority
DB_NAME=rddhi_production

# Security
ENCRYPTION_KEY=[your-generated-key]
JWT_SECRET=[your-generated-secret]
JWT_ALGORITHM=HS256
JWT_EXPIRATION_HOURS=24
JWT_REFRESH_EXPIRATION_DAYS=7

# CORS - Set to your actual domain
CORS_ORIGINS=https://yourdomin.com,https://app.yourdomain.com

# Rate Limiting
RATE_LIMIT_PER_MINUTE=60
RATE_LIMIT_PER_HOUR=1000

# Frontend
REACT_APP_BACKEND_URL=https://api.yourdomain.com
REACT_APP_ENVIRONMENT=production
```

Secure the file:

```bash
sudo chmod 600 /srv/rddhi/.env
sudo chown root:root /srv/rddhi/.env
```

## Step 2: MongoDB Setup

### Option A: MongoDB Atlas (Recommended for Production)

1. Create account at https://www.mongodb.com/cloud/atlas
2. Create cluster with:
   - Backup enabled (daily)
   - Encryption at rest enabled
   - IP whitelist configured
   - Network access restricted to API server IP
3. Get connection string and update MONGO_URL in .env

### Option B: Self-Hosted MongoDB

```bash
# Install MongoDB on Ubuntu 22.04
wget -qO - https://www.mongodb.org/static/pgp/server-7.0.asc | sudo apt-key add -
echo "deb [ arch=amd64,arm64 ] https://repo.mongodb.org/apt/ubuntu jammy/mongodb-org/7.0 multiverse" | sudo tee /etc/apt/sources.list.d/mongodb-org-7.0.list
sudo apt-get update
sudo apt-get install -y mongodb-org

# Enable authentication
# Generate admin user password hash
python3 << EOF
import hashlib
password = "YourStrongPassword"  # Change this
print(hashlib.sha1(password.encode()).hexdigest())
EOF

# Configure MongoDB with authentication
sudo nano /etc/mongod.conf
# Add:
# security:
#   authorization: "enabled"

# Restart MongoDB
sudo systemctl restart mongod

# Create admin user
mongosh
# In mongo shell:
use admin
db.createUser({
  user: "admin",
  pwd: "YourStrongPassword",
  roles: ["root"]
})

# Create app user with limited permissions
use rddhi_production
db.createUser({
  user: "rddhi_app",
  pwd: "AppPassword123!",
  roles: [
    { role: "readWrite", db: "rddhi_production" }
  ]
})
```

## Step 3: Setup Docker on Server

### Install Docker & Docker Compose

```bash
# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
sudo usermod -aG docker $USER

# Install Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/download/v2.20.0/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

# Verify
docker --version
docker-compose --version
```

## Step 4: Deploy Using Docker

### Clone Repository

```bash
cd /srv
git clone https://github.com/yourusername/rddhi.git
cd rddhi
```

### Build and Run

```bash
# Build images
docker-compose build

# Pull environment
cp /srv/rddhi/.env ./backend/.env

# Start services (background)
docker-compose up -d

# View logs
docker-compose logs -f api
docker-compose logs -f frontend

# Check health
curl http://localhost:8000/health
```

## Step 5: Nginx Configuration

### Install Nginx

```bash
sudo apt-get install -y nginx
```

### Configure Reverse Proxy

Create `/etc/nginx/sites-available/rddhi`:

```nginx
# HTTP redirect to HTTPS
server {
    listen 80;
    server_name yourdomain.com api.yourdomain.com;
    return 301 https://$server_name$request_uri;
}

# HTTPS - Frontend
server {
    listen 443 ssl http2;
    server_name yourdomain.com app.yourdomain.com;

    ssl_certificate /etc/letsencrypt/live/yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/yourdomain.com/privkey.pem;

    # Security headers
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    add_header X-Frame-Options "DENY" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;
    add_header Content-Security-Policy "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline';" always;

    # Gzip compression
    gzip on;
    gzip_types text/plain text/css application/json application/javascript;

    root /srv/rddhi/frontend/build;
    try_files $uri /index.html;

    location / {
        proxy_pass http://localhost:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}

# HTTPS - API
server {
    listen 443 ssl http2;
    server_name api.yourdomain.com;

    ssl_certificate /etc/letsencrypt/live/yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/yourdomain.com/privkey.pem;

    # Security headers
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    add_header X-Frame-Options "DENY" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;

    # Gzip compression
    gzip on;
    gzip_types text/plain text/css application/json application/javascript;

    location / {
        proxy_pass http://localhost:8000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_read_timeout 60s;
        proxy_connect_timeout 60s;
    }
}
```

### Enable Configuration

```bash
sudo ln -s /etc/nginx/sites-available/rddhi /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

## Step 6: SSL Certificate

### Use Let's Encrypt (Free)

```bash
sudo apt-get install -y certbot python3-certbot-nginx

# Get certificate
sudo certbot certonly --nginx -d yourdomain.com -d api.yourdomain.com -d app.yourdomain.com

# Auto-renew
sudo systemctl enable certbot.timer
sudo systemctl start certbot.timer
```

## Step 7: Monitoring & Logging

### Setup Logs Directory

```bash
sudo mkdir -p /var/log/rddhi
sudo chown -R $USER:$USER /var/log/rddhi

# In docker-compose.yml, mount logs:
# volumes:
#   - /var/log/rddhi:/app/logs
```

### Monitor Logs

```bash
# Real-time logs
docker-compose logs -f api

# Specific service
docker-compose logs -f backend

# View previous errors
docker-compose logs --tail 100 api
```

### Setup Monitoring (Optional)

Consider using:
- Prometheus + Grafana for metrics
- ELK Stack for logging
- Newrelic or DataDog for APM

## Step 8: Database Backups

### Automated Backups (MongoDB Atlas)

Already configured in MongoDB Atlas settings.

### Manual Backup (Self-hosted)

```bash
#!/bin/bash
# backup-mongodb.sh

BACKUP_DIR="/backups/mongodb"
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="$BACKUP_DIR/rddhi_$DATE.tar.gz"

# Create backup
mongodump --uri "mongodb://rddhi_app:password@localhost/rddhi_production" --archive="$BACKUP_FILE"

# Keep only last 30 days
find $BACKUP_DIR -name "rddhi_*.tar.gz" -mtime +30 -delete

echo "Backup completed: $BACKUP_FILE"
```

Setup cron:

```bash
0 2 * * * /usr/local/bin/backup-mongodb.sh >> /var/log/mongodb-backup.log 2>&1
```

## Step 9: Performance Optimization

### Enable CDN for Static Assets

```nginx
# In nginx config
location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
    expires 1y;
    add_header Cache-Control "public, immutable";
}
```

### Database Indexing

```javascript
// Create indexes for better query performance
db.trades.createIndex({ user_id: 1, created_at: -1 });
db.trades.createIndex({ customer_name: 1 });
db.trades.createIndex({ supplier_name: 1 });
db.users.createIndex({ email: 1 }, { unique: true });
```

## Step 10: Maintenance

### Regular Tasks

```bash
# Update Docker images
docker pull mongo:latest
docker pull python:3.11-slim
docker-compose up -d  # Redeploy with new images

# Monitor disk space
df -h

# Check memory
free -h

# View container stats
docker stats
```

### Scaling

For high traffic:

1. Use load balancer (AWS ELB, GCP Load Balancer)
2. Deploy multiple API instances
3. Use managed database (MongoDB Atlas already scales)
4. Add CDN for frontend (Cloudflare, CloudFront)
5. Cache with Redis

## Troubleshooting

### API not responding

```bash
# Check if container is running
docker-compose ps

# View error logs
docker-compose logs api --tail 50

# Restart service
docker-compose restart api
```

### Database connection issues

```bash
# Test connection
mongosh "mongodb+srv://username:password@cluster.mongodb.net/dbname"

# Check MongoDB status
sudo systemctl status mongod
```

### High CPU/Memory

```bash
# Monitor container resources
docker stats

# Check slow queries
mongostat

# Optimize indexes
db.trades.find().explain("executionStats")
```

## Security Hardening Checklist

- [ ] SSL/TLS with strong ciphers
- [ ] MongoDB authentication enabled
- [ ] Database backups automated
- [ ] Firewall rules configured
- [ ] Regular security patches applied
- [ ] Error messages don't leak sensitive info
- [ ] Rate limiting configured
- [ ] Input validation on all endpoints
- [ ] CORS properly restricted
- [ ] Secrets not in version control
- [ ] Security headers enabled
- [ ] API keys rotated regularly
- [ ] Monitoring and alerting set up
- [ ] Incident response plan in place

## Support & Maintenance

For issues or updates:
- GitHub Issues: [your-repo]/issues
- Email: support@rddhi.com
- Documentation: https://docs.rddhi.com

---

**Last Updated:** March 2026
**Version:** 1.0.0
