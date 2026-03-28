# ZentrixCRM — Production Deployment Guide

## Pre-Deployment Checklist

### 1. 🔑 Generate Production Secrets
```bash
cd server
node scripts/generate-secrets.js
```
Copy the output into your production `.env` file.

### 2. 🌐 HTTPS / TLS Setup

**Option A — Reverse Proxy (Recommended)**
Use nginx or Caddy in front of the Node.js server:

```nginx
# /etc/nginx/sites-available/zentrixcrm
server {
    listen 80;
    server_name crm.yourdomain.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name crm.yourdomain.com;

    ssl_certificate     /etc/letsencrypt/live/crm.yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/crm.yourdomain.com/privkey.pem;

    # Frontend (Vite build output)
    location / {
        root /var/www/zentrixcrm/dist;
        try_files $uri $uri/ /index.html;
    }

    # API proxy
    location /api/ {
        proxy_pass http://127.0.0.1:4000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # File uploads
    location /uploads/ {
        alias /var/www/zentrixcrm/server/uploads/;
        expires 30d;
        add_header Cache-Control "public, immutable";
    }

    client_max_body_size 10M;
}
```

Get free SSL via Let's Encrypt:
```bash
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d crm.yourdomain.com
```

**Option B — Platform Deploy**
Deploy to Render, Railway, or DigitalOcean App Platform which auto-provide HTTPS.

### 3. 📦 Build Frontend for Production
```bash
npm run build
```
Output goes to `dist/` — serve this via nginx or a CDN.

### 4. 🗃️ Database
- Use a managed PostgreSQL service (Supabase, Neon, AWS RDS, DigitalOcean)
- Update `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, `DB_PASSWORD` in `.env`
- Run migrations: `npm run db:migrate`
- Seed demo data (optional): `npm run db:seed`

### 5. 🔐 Production `.env` Example
```env
# Database
DB_HOST=your-db-host.cloud.com
DB_PORT=5432
DB_NAME=zentrixcrm
DB_USER=zentrix_prod
DB_PASSWORD=<strong-random-password>

# Server
PORT=4000
NODE_ENV=production

# Auth — MUST be unique random values (run generate-secrets.js)
JWT_SECRET=<generated-64-char-random>
JWT_EXPIRES_IN=1d
REFRESH_TOKEN_SECRET=<generated-64-char-random>
REFRESH_TOKEN_EXPIRES_IN=7d

# CORS
FRONTEND_URL=https://crm.yourdomain.com

# Email (optional)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=noreply@yourdomain.com
SMTP_PASS=app-specific-password
SMTP_FROM_NAME=ZentrixCRM

# SMS/WhatsApp (optional)
TWILIO_ACCOUNT_SID=ACxxxxxxxx
TWILIO_AUTH_TOKEN=xxxxxxxx
TWILIO_PHONE_NUMBER=+1xxxxxxxxxx
TWILIO_WHATSAPP_FROM=+14155238886
```

### 6. 🚀 Run with Process Manager
```bash
npm install -g pm2
pm2 start index.js --name zentrixcrm-api -i 2
pm2 save
pm2 startup
```

### 7. 📋 Post-Launch Monitoring
- Enable PM2 monitoring: `pm2 monit`
- Set up health check: `curl https://crm.yourdomain.com/api/health`
- Monitor logs: `pm2 logs zentrixcrm-api`

### 8. 🗂️ File Uploads in Production
For production, consider migrating from local disk to:
- **AWS S3** — most common
- **Cloudflare R2** — cheaper
- **DigitalOcean Spaces** — simple

Update `server/middleware/upload.js` storage config accordingly.

### 9. 🔒 Security Hardening
- ✅ Helmet (HTTP headers) — already configured
- ✅ Rate limiting — already configured
- ✅ CORS — already configured
- ✅ Bcrypt password hashing — already configured
- ✅ JWT with refresh tokens — already configured
- ✅ Parameterized SQL queries — no SQL injection risk
- ✅ Input validation on all endpoints
- ✅ Tenant isolation on all queries
- [ ] Enable `NODE_ENV=production` in `.env`
- [ ] Set shorter JWT expiry (`1d` instead of `7d`)
- [ ] Add CSP headers if needed
- [ ] Set up database backups
