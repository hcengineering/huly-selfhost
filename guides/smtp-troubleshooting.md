# SMTP Troubleshooting Guide

This guide helps you diagnose and resolve common SMTP configuration issues in your Huly self-hosted deployment.

## Checking Mail Service Status

### 1. Verify Mail Service is Running

Check if the mail container is running and healthy:

```bash
# Check container status
sudo docker ps | grep mail

# Check container health
sudo docker inspect mail --format='{{.State.Status}}'

# View detailed container information
sudo docker inspect mail
```

### 2. Check Mail Service Logs

The mail service logs contain valuable information about SMTP connections and errors:

```bash
# View recent logs
sudo docker logs mail

# Follow logs in real-time
sudo docker logs -f mail

# View last 50 lines of logs
sudo docker logs --tail 50 mail

# View logs with timestamps
sudo docker logs -t mail

# Search for specific error patterns
sudo docker logs mail 2>&1 | grep -i "error\|failed\|timeout"
```

## Testing SMTP Connection Without Service Restart

Before restarting the mail service, test your SMTP credentials and connectivity directly.

### 3. Test SMTP Connection from Host

#### Using telnet (Basic Connection Test)

```bash
# Test basic connectivity to SMTP server
telnet your-smtp-server.com 587

# Expected response should be something like:
# 220 your-smtp-server.com ESMTP ready
```

If the connection is successful, type `QUIT` to exit.

#### Using openssl (Secure Connection Test)

For SMTP servers using TLS/SSL:

```bash
# Test STARTTLS connection (port 587)
openssl s_client -connect your-smtp-server.com:587 -starttls smtp

# Test SSL connection (port 465)
openssl s_client -connect your-smtp-server.com:465

# Test with SNI (Server Name Indication)
openssl s_client -connect your-smtp-server.com:587 -starttls smtp -servername your-smtp-server.com
```

### 4. Test SMTP Authentication

#### Using swaks (SMTP Swiss Army Knife)

Install swaks if not available:

```bash
# Ubuntu/Debian
sudo apt-get install swaks

# CentOS/RHEL
sudo yum install swaks
```

Test SMTP with authentication:

```bash
# Basic SMTP test with authentication
swaks --to test@example.com \
      --from your-email@domain.com \
      --server your-smtp-server.com:587 \
      --auth LOGIN \
      --auth-user your-username \
      --auth-password your-password \
      --tls

# Dry run (don't actually send)
swaks --to test@example.com \
      --from your-email@domain.com \
      --server your-smtp-server.com:587 \
      --auth LOGIN \
      --auth-user your-username \
      --auth-password your-password \
      --tls \
      --dry-run
```

#### Using curl

```bash
# Test SMTP with curl
curl --url "smtps://your-smtp-server.com:587" \
     --ssl-reqd \
     --mail-from "your-email@domain.com" \
     --mail-rcpt "test@example.com" \
     --user "your-username:your-password" \
     --upload-file - << EOF
From: your-email@domain.com
To: test@example.com
Subject: Test Email

This is a test email.
EOF
```

### 5. Test from Inside Docker Network

Test SMTP connectivity from within the Docker environment:

```bash
# Run a temporary container in the same network
sudo docker run --rm -it --network huly-selfhost_default alpine sh

# Inside the container, install curl and test
apk add curl
curl --url "smtps://your-smtp-server.com:587" \
     --ssl-reqd \
     --mail-from "your-email@domain.com" \
     --mail-rcpt "test@example.com" \
     --user "your-username:your-password" \
     -v
```

## Common SMTP Issues and Solutions

### 6. Authentication Failures

**Symptoms:**
- "Authentication failed" in logs
- "535 Authentication credentials invalid" errors

**Solutions:**

1. **Verify credentials are correct:**
   ```bash
   # Check environment variables in running container
   sudo docker exec mail env | grep -E "(SMTP_USERNAME|SMTP_PASSWORD|SMTP_HOST|SMTP_PORT)"
   ```

2. **Test with swaks:**
   ```bash
   swaks --to test@example.com \
         --from your-email@domain.com \
         --server your-smtp-server.com:587 \
         --auth LOGIN \
         --auth-user your-username \
         --auth-password your-password \
         --tls
   ```

3. **Common authentication issues:**
   - Gmail: Use App Passwords instead of regular password
   - Office 365: Enable "Less secure app access" or use OAuth
   - Yahoo: Use App Passwords
   - Custom SMTP: Check if special characters in password need escaping

### 7. Connection Timeouts

**Symptoms:**
- "Connection timeout" errors
- "Could not connect to SMTP server"

**Solutions:**

1. **Check firewall rules:**
   ```bash
   # Test connectivity
   telnet your-smtp-server.com 587
   nc -zv your-smtp-server.com 587
   ```

2. **Verify DNS resolution:**
   ```bash
   nslookup your-smtp-server.com
   dig your-smtp-server.com
   ```

3. **Check if port is blocked:**
   ```bash
   # Common SMTP ports
   nc -zv your-smtp-server.com 25    # Standard SMTP
   nc -zv your-smtp-server.com 587   # SMTP with STARTTLS
   nc -zv your-smtp-server.com 465   # SMTPS (SSL)
   ```

### 8. TLS/SSL Certificate Issues

**Symptoms:**
- "Certificate verification failed"
- "SSL handshake failed"

**Solutions:**

1. **Test SSL certificate:**
   ```bash
   openssl s_client -connect your-smtp-server.com:587 -starttls smtp
   ```

2. **Check certificate validity:**
   ```bash
   echo | openssl s_client -connect your-smtp-server.com:587 -starttls smtp 2>/dev/null | openssl x509 -noout -dates
   ```

3. **Test without certificate verification (debug only):**
   ```bash
   swaks --to test@example.com \
         --from your-email@domain.com \
         --server your-smtp-server.com:587 \
         --auth LOGIN \
         --auth-user your-username \
         --auth-password your-password \
         --tls \
         --tls-verify=0
   ```

### 9. Port Configuration Issues

**Common SMTP Ports:**
- **25**: Standard SMTP (often blocked by ISPs)
- **587**: SMTP with STARTTLS (recommended)
- **465**: SMTPS (SSL from start)

**Test different ports:**
```bash
# Test port 587 (STARTTLS)
telnet your-smtp-server.com 587

# Test port 465 (SSL)
openssl s_client -connect your-smtp-server.com:465

# Test port 25 (usually blocked)
telnet your-smtp-server.com 25
```
