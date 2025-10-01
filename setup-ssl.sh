#!/bin/bash
# SSL and Nginx Setup for OatCode

echo "🔧 Setting up Nginx and SSL for oatcode.com..."

# Create Nginx config
cat > /etc/nginx/sites-available/oatcode << 'ENDOFCONFIG'
server {
    server_name oatcode.com *.oatcode.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    listen 443 ssl;
    ssl_certificate /etc/letsencrypt/live/oatcode.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/oatcode.com/privkey.pem;
}

server {
    listen 80;
    server_name oatcode.com *.oatcode.com;
    return 301 https://$host$request_uri;
}
ENDOFCONFIG

# Enable site
ln -sf /etc/nginx/sites-available/oatcode /etc/nginx/sites-enabled/

# Test and restart
nginx -t && systemctl restart nginx

echo "✅ Done! Visit https://oatcode.com"
