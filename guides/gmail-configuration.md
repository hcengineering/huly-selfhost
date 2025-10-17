# Gmail Integration Configuration Guide

This guide will walk you through setting up Gmail integration in your self-hosted Huly instance, allowing users to connect their Gmail accounts and manage emails directly within Huly.

## Important Limitations

> [!WARNING]
> **Gmail Integration Limitations**
> 
> - **Testing Mode Only**: The Gmail integration will operate in Google's testing mode, which limits functionality and requires manual user approval
> - **Domain Restriction**: Gmail integration only supports users with email addresses from the same custom domain that was used during the OAuth application registration
> - **User Limit**: Testing mode is limited to a maximum of 100 users
> - **Manual Approval Required**: Each user must be manually added to the test users list in Google Cloud Console
> - **Not for Production**: This integration is suitable for internal/testing use only, not for public-facing production deployments

If you need Gmail integration for a larger user base or public deployment, you'll need to submit your OAuth application for Google's verification process, which requires additional compliance steps.

## Prerequisites

- A running Huly self-hosted instance
- A Google Cloud Platform (GCP) project
- Administrative access to your domain (if using custom domain)

## Step 1: Set up Google Cloud Project

### 1.1 Create a Google Cloud Project

1. Go to the [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Note down your project ID (you'll need it for `WATCH_TOPIC_NAME`)

### 1.2 Enable Required APIs

Enable the following APIs in your GCP project:

1. **Gmail API**
   - Go to APIs & Services > Library
   - Search for "Gmail API" and enable it

2. **Cloud Pub/Sub API** (for email notifications)
   - Search for "Cloud Pub/Sub API" and enable it

## Step 2: Configure OAuth 2.0

### 2.1 Create OAuth 2.0 Credentials

1. Go to APIs & Services > Credentials
2. Click "Create Credentials" > "OAuth 2.0 Client IDs"
3. If prompted, configure the OAuth consent screen first:
   - Choose "External" for user type
   - Fill in the required fields:
     - Application name: "Huly Gmail Integration"
     - User support email: your email
     - Developer contact email: your email

### 2.2 Configure OAuth Client

1. Application type: **Web application**
2. Name: "Huly Gmail Client"
3. Authorized redirect URIs:
   ```
   http://your-huly-domain.com:8093/signin/code
   https://your-huly-domain.com:8093/signin/code
   ```
   Replace `your-huly-domain.com` with your actual domain

4. Click "Create" and note down:
   - **Client ID**
   - **Client Secret**

## Step 3: Set up Cloud Pub/Sub (Optional but Recommended)

### 3.1 Create a Pub/Sub Topic

1. Go to Pub/Sub > Topics
2. Click "Create Topic"
3. Topic ID: `email` (or choose your preferred name)
4. Note the full topic name: `projects/YOUR_PROJECT_ID/topics/email`

### 3.2 Configure Gmail Push Notifications

1. Go to Gmail API in the console
2. Set up push notifications to use your Pub/Sub topic
3. This allows real-time email synchronization

## Step 4: Configure Huly Gmail Service

### 4.1 Gmail Integration Versions

Gmail integration supports two versions with different behaviors:

#### Version 1 (v1) - Default
- **Shared Email Access**: All emails are shared across the entire Huly instance

#### Version 2 (v2) - Beta
- **Space-Specific Emails**: Email access can be configured per workspace/space
- **Additional Requirements**: Requires enabling 'chat' and 'inbox' modules in Huly
- **Beta Status**: Still in development, may have limitations

> [!NOTE]
> **Version Selection**: Use `VERSION=v1` (default) for old integration with shared emails, or `VERSION=v2` for space-isolated emails (requires additional module configuration).

### 4.2 Update docker-compose.yaml

Add the Gmail service to your `docker-compose.yaml`:

```yaml
gmail:
  image: 'hardcoreeng/gmail'
  container_name: gmail
  depends_on:
    account:
      condition: service_started
  ports:
    - 8093:8093
  environment:
    - PORT=8093
    - ACCOUNTS_URL=http://account:3000
    - SECRET=${SECRET}
    - WATCH_TOPIC_NAME=projects/YOUR_PROJECT_ID/topics/email
    - Credentials={"web":{"client_id":"YOUR_CLIENT_ID","client_secret":"YOUR_CLIENT_SECRET","redirect_uris":["http://your-huly-domain.com:8093/signin/code"]}}
    - KVS_URL=http://kvs:8094
    - STORAGE_CONFIG=minio|minio?accessKey=minioadmin&secretKey=minioadmin
    - VERSION=v1  # Use v1 (default) or v2 (beta, requires chat/inbox modules)
    - QUEUE_CONFIG=${QUEUE_CONFIG}
  restart: unless-stopped
```

### 4.3 Network Configuration

Replace the following placeholders with your actual values:

- `YOUR_PROJECT_ID`: Your Google Cloud Project ID
- `YOUR_CLIENT_ID`: OAuth 2.0 Client ID from Step 2
- `YOUR_CLIENT_SECRET`: OAuth 2.0 Client Secret from Step 2
- `your-huly-domain.com`: Your actual domain name
- `your_secret_key`: Your Huly secret key
- `VERSION`: Choose `v1` (default, shared emails) or `v2` (beta, space-specific emails)

### 4.4 Additional Configuration for Version 2

If using `VERSION=v2`, you must also enable the required modules in your Huly instance:

1. **Enable Chat Module**: Ensure the chat functionality is activated
2. **Enable Inbox Module**: Ensure the inbox functionality is activated

> [!WARNING]
> **Version 2 Requirements**: v2 is in beta and requires both 'chat' and 'inbox' modules to be enabled in your Huly configuration. Without these modules, v2 will not function properly.

## Step 5: Environment Variables Configuration

Create or update your `huly.conf` file with the following Gmail-related variables:

```bash
# Gmail Configuration
GMAIL_CLIENT_ID=YOUR_CLIENT_ID
GMAIL_CLIENT_SECRET=YOUR_CLIENT_SECRET
GMAIL_PROJECT_ID=YOUR_PROJECT_ID
GMAIL_TOPIC_NAME=projects/YOUR_PROJECT_ID/topics/email
```

## Step 6: Deploy and Test

### 6.1 Restart Services

```bash
sudo docker compose down
sudo docker compose up -d
```

### 6.2 Verify Gmail Service

Check if the Gmail service is running:

```bash
# Check container status
sudo docker ps | grep gmail

# Check Gmail service logs
sudo docker logs gmail
```

### 6.3 Test OAuth Flow

1. Open Huly in your browser
2. Go to Settings > Integrations
3. Click on Gmail integration
4. Follow the OAuth flow to connect your Gmail account

> [!NOTE]
> The OAuth flow will redirect to `your-domain:8093` which is handled directly by the Gmail service container.

## Troubleshooting

### Common Issues

1. **OAuth Redirect URI Mismatch**
   - Ensure the redirect URI in Google Console matches exactly with your domain
   - Include both HTTP and HTTPS variants if needed

2. **Gmail Service Not Starting**
   ```bash
   # Check service logs
   sudo docker logs gmail
   
   # Verify environment variables
   sudo docker exec gmail env | grep -E "(CLIENT_ID|CLIENT_SECRET|PROJECT_ID)"
   ```

3. **Pub/Sub Topic Not Found**
   - Verify the topic exists in Google Cloud Console
   - Check the topic name format: `projects/PROJECT_ID/topics/TOPIC_NAME`

4. **Permission Denied Errors**
   - Ensure the OAuth client has the necessary scopes
   - Verify the service account (if used) has Pub/Sub permissions
