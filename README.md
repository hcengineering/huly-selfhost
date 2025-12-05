# Huly Self-Hosted

Please use this README if you want to deploy Huly on your server with `docker compose`. I'm using a Basic Droplet on Digital Ocean with Ubuntu 24.04, but these instructions can be easily adapted for any Linux distribution.

> [!NOTE]
> Huly is quite resource-heavy, so I recommend using a Droplet with 2 vCPUs and 4GB of RAM. Droplets with less RAM may
> stop responding or fail.

If you prefer Kubernetes deployment, there is a sample Kubernetes configuration under [kube](kube) directory.

## Platform Repository

The Huly platform source code is available on GitHub: **[hcengineering/platform](https://github.com/hcengineering/platform)**

> [!NOTE]
> For self-hosted deployments, use production versions (`v*` tags). For example: `v0.7.310`, `v0.7.307`, `v0.6.501`
> See all available versions on [GitHub Releases](https://github.com/hcengineering/platform/releases).

## Architecture Overview

For detailed information about the Huly self-hosted architecture, services, and their interactions, see [ARCHITECTURE_OVERVIEW.md](ARCHITECTURE_OVERVIEW.md).

## Quick Start (Local Testing)

For fast local verification without going through the full setup process:

```bash
git clone https://github.com/hcengineering/huly-selfhost.git
cd huly-selfhost
./setup.sh --quick
```

This will:
- Use `localhost:8087` as the host address
- Skip all configuration prompts
- Use default Docker volumes
- Automatically start all services

Access Huly at **http://localhost:8087** (wait ~60 seconds for services to initialize).

> [!NOTE]
> Quick start is intended for local testing only. For production deployments, follow the full setup instructions below.

## Installing `nginx` and `docker`

First, update repositories cache:

```bash
sudo apt update
```

Now, install `nginx`:

```bash
sudo apt install nginx
```

Install docker using the [recommended method](https://docs.docker.com/engine/install/ubuntu/) from docker website.
Afterwards perform [post-installation steps](https://docs.docker.com/engine/install/linux-postinstall/). Pay attention to 3rd step with `newgrp docker` command, it needed for correct execution in setup script.

## Clone the `huly-selfhost` repository and configure `nginx`

Next, let's clone the `huly-selfhost` repository and configure Huly.

```bash
git clone https://github.com/hcengineering/huly-selfhost.git
cd huly-selfhost
./setup.sh
```

This will generate a [huly_v7.conf](./huly_v7.conf) file with your chosen values and create your nginx config.

To add the generated configuration to your Nginx setup, run the following:

```bash
sudo ln -s $(pwd)/nginx.conf /etc/nginx/sites-enabled/huly.conf
```

> [!NOTE]
> If you change `HOST_ADDRESS`, `SECURE`, `HTTP_PORT` or `HTTP_BIND` be sure to update your [nginx.conf](./nginx.conf)
> by running:
> ```bash
> ./nginx.sh
> ```
>You can safely execute this script after adding your custom configurations like ssl. It will only overwrite the
> necessary settings.

Finally, let's reload `nginx` and start Huly with `docker compose`.

```bash
sudo nginx -s reload
sudo docker compose up -d
```

Now, launch your web browser and enjoy Huly!

> [!IMPORTANT]
> Provided configrations include deployments of CockroachDB and Redpanda which might not be production-ready. Please inspect them carefully before using in production. For more information on the recommended deployment configurations, please refer to the [CockroachDB](https://www.cockroachlabs.com/docs/stable/recommended-production-settings) and [Redpanda](https://docs.redpanda.com/24.3/deploy/) documentation.

## Volume Configuration

By default, Huly uses Docker named volumes to store persistent data (database, Elasticsearch indices, and uploaded files). You can optionally configure custom host paths for these volumes during the setup process.

### During Setup

When running `./setup.sh`, you'll be prompted to specify custom paths for:

- **Elasticsearch volume**: Search index data storage  
- **Files volume**: User-uploaded files and attachments
- **CockroachDB data volume**: Data storage for workspaces and accounts
- **CockroachDB certs volume**: Certificates for CockroachDB
- **Redpanda data volume**: Data storage for Kafka

You can either:
- Press Enter to use the default Docker named volumes
- Specify an absolute path on your host system (e.g., `/var/huly/db`)
- Enter `default` to clear an existing custom path and revert to Docker named volumes

### Quick Reset to Default Volumes

To quickly reset all volumes back to default Docker named volumes without prompts:

```bash
./setup.sh --reset-volumes
```

### Manual Configuration

You can also manually configure volume paths by editing the `huly_v7.conf` file:

```bash
# Docker volume paths - specify custom paths for persistent data storage
# Leave empty to use default Docker named volumes
VOLUME_ELASTIC_PATH=/path/to/elasticsearch
VOLUME_FILES_PATH=/path/to/files
VOLUME_CR_DATA_PATH=/path/to/cockroachdb/data
VOLUME_CR_CERTS_PATH=/path/to/cockroachdb/certs
VOLUME_REDPANDA_PATH=/path/to/redpanda/data
```

To revert to default volumes, simply leave the paths empty:

```bash
VOLUME_ELASTIC_PATH=
VOLUME_FILES_PATH=
VOLUME_CR_DATA_PATH=
VOLUME_CR_CERTS_PATH=
VOLUME_REDPANDA_PATH=
```

After modifying the configuration, restart the services:

```bash
docker compose down
docker compose up -d
```

> [!WARNING]
> When changing from named volumes to host paths (or vice versa), make sure to migrate your data appropriately to avoid data loss.

## Redpanda Configuration

When using a production deployment of Redpanda with topics auto-creation turned off, you'll need to manually create the following topics:

- fulltext
- process
- tx
- users
- workspace

## Generating Public and Private VAPID keys for front-end

You'll need `Node.js` installed on your machine. Installing `npm` on Debian based distro:

```
sudo apt-get install npm
```

Install web-push using npm

```bash
sudo npm install -g web-push
```

Generate VAPID Keys. Run the following command to generate a VAPID key pair:

```
web-push generate-vapid-keys
```

It will generate both keys that looks like this:

```bash
=======================================

Public Key:
sdfgsdgsdfgsdfggsdf

Private Key:
asdfsadfasdfsfd

=======================================
```

Keep these keys secure, as you will need them to set up your push notification service on the server.

Add these keys into `compose.yaml` in section `services:ses:environment`:

```yaml
- PUSH_PUBLIC_KEY=your public key
- PUSH_PRIVATE_KEY=your private key
```

As the browser must access the public key for web push notifications setup, you also need to provide it to the front-end service.

Add the public key into `compose.yaml` in section `services:front:environment`:

```yaml
- PUSH_PUBLIC_KEY=your public key
```

## Web Push Notifications

> [!NOTE]
> In version 0.7.x and later, the `ses` service has been replaced with the `notification` service for web push notifications and the `mail` service for sending emails using SES. The environment variables `SECRET_KEY`, `PUSH_PUBLIC_KEY`, and `PUSH_PRIVATE_KEY` are not required for web push notifications in 0.7.x.

To enable web push notifications in Huly, you need to configure the SES service with the VAPID keys.

### Step 1: Configure the Transactor Service

Add `WEB_PUSH_URL` to `transactor` container:

```yaml
transactor:
  ...
  environment:
    - WEB_PUSH_URL=http://ses:3335
  ...
```

### Step 2: Configure the SES Service

Add the `ses` container to your `docker-compose.yaml` file with the generated VAPID keys:

```yaml
ses:
  image: hardcoreeng/ses:${HULY_VERSION}
  environment:
    - PORT=3335
    - SOURCE=mail@example.com
    - ACCESS_KEY=none
    - SECRET_KEY=none
    - PUSH_PUBLIC_KEY=${PUSH_PUBLIC_KEY}
    - PUSH_PRIVATE_KEY=${PUSH_PRIVATE_KEY}
  restart: unless-stopped
  networks:
    - huly_net
```

## Mail Service

The Mail Service is responsible for sending email notifications and confirmation emails during user login or signup processes. It can be configured to send emails through either an SMTP server or Amazon SES (Simple Email Service), but not both at the same time.

### General Configuration

1. Add the `mail` container to the `docker-compose.yaml` file. Specify the email address you will use to send emails as "SOURCE":

    ```yaml
    mail:
      image: hardcoreeng/mail:${HULY_VERSION}
      container_name: mail
      ports:
        - 8097:8097
      environment:
        - PORT=8097
        - SOURCE=<EMAIL_FROM>
      restart: unless-stopped
      networks:
        - huly_net
    ```

2. Add the mail container URL to the `transactor` and `account` containers:

    ```yaml
    account:
      ...
      environment:
        - MAIL_URL=http://mail:8097
      ...
    transactor:
      ...
      environment:
        - MAIL_URL=http://mail:8097
      ...
    ```

3. In `Settings -> Notifications`, set up email notifications for the events you want to be notified about. Note that this is a user-specific setting, not company-wide; each user must set up their own notification preferences.

### SMTP Configuration

To integrate with an external SMTP server, update the `docker-compose.yaml` file with the following environment variables:

1. Add SMTP configuration to the environment section:

    ```yaml
    mail:
      ...
      environment:
        ...
        - SMTP_HOST=<SMTP_SERVER_URL>
        - SMTP_PORT=<SMTP_SERVER_PORT>
        - SMTP_USERNAME=<SMTP_USER>
        - SMTP_PASSWORD=<SMTP_PASSWORD>
    ```

2. Replace `<SMTP_SERVER_URL>` and `<SMTP_SERVER_PORT>` with your SMTP server's hostname and port. It's recommended to use a secure port, such as `587`.

3. Replace `<SMTP_USER>` and `<SMTP_PASSWORD>` with credentials for an account that can send emails via your SMTP server. If your service provider supports it, consider using an application API key as `<SMTP_USER>` and a token as `<SMTP_PASSWORD>` for enhanced security.

### Amazon SES Configuration

1. Set up Amazon Simple Email Service in AWS: [AWS SES Setup Guide](https://docs.aws.amazon.com/ses/latest/dg/setting-up.html)

2. Create a new IAM policy with the following permissions:

    ```json
    {
      "Version": "2012-10-17",
      "Statement": [
        {
          "Effect": "Allow",
          "Action": [
            "ses:SendEmail",
            "ses:SendRawEmail"
          ],
          "Resource": "*"
        }
      ]
    }
    ```

3. Create a separate IAM user for SES API access, assigning the newly created policy to this user.

4. Configure SES environment variables in the `mail` container:

    ```yaml
    mail:
      ...
      environment:
        ...
        - SES_ACCESS_KEY=<SES_ACCESS_KEY>
        - SES_SECRET_KEY=<SES_SECRET_KEY>
        - SES_REGION=<SES_REGION>
    ```

### Verifying Mail Service

To verify that the mail service is running correctly:

```bash
# Check if the mail container is running
sudo docker ps | grep mail

# View mail service logs
sudo docker logs mail

# Follow mail service logs in real-time
sudo docker logs -f mail
```

### Troubleshooting SMTP Issues

If you're experiencing issues with email delivery, see the [SMTP Troubleshooting Guide](guides/smtp-troubleshooting.md) for comprehensive debugging steps and solutions.

### Notes

1. SMTP and SES configurations cannot be used simultaneously.
2. `SES_URL` is not supported in version v0.6.470 and later, please use `MAIL_URL` instead.

## Gmail Integration

Huly supports Gmail integration allowing users to connect their Gmail accounts and manage emails directly within the platform.

For detailed setup instructions, see the [Gmail Configuration Guide](guides/gmail-configuration.md).


## Love Service (Audio & Video calls)

Huly audio and video calls are created on top of LiveKit insfrastructure. In order to use Love service in your
self-hosted Huly, perform the following steps:

1. Set up [LiveKit Cloud](https://cloud.livekit.io) account
2. Add `love` container to the docker-compose.yaml

    ```yaml
      love:
        image: hardcoreeng/love:${HULY_VERSION}
        container_name: love
        ports:
          - 8096:8096
        environment:
          - PORT=8096
          - SECRET=${SECRET}
          - ACCOUNTS_URL=http://account:3000
          - DB_URL=${CR_DB_URL}
          - STORAGE_CONFIG=minio|minio?accessKey=minioadmin&secretKey=minioadmin
          - STORAGE_PROVIDER_NAME=minio
          - LIVEKIT_HOST=<LIVEKIT_HOST>
          - LIVEKIT_API_KEY=<LIVEKIT_API_KEY>
          - LIVEKIT_API_SECRET=<LIVEKIT_API_SECRET>
        restart: unless-stopped
        networks:
          - huly_net
    ```

3. Configure `front` service:

    ```yaml
      front:
        ...
        environment:
          - LIVEKIT_WS=ws${SECURE:+s}://<LIVEKIT_HOST>
        ...
    ```

## Print Service

1. Add `print` container to the docker-compose.yaml

    ```yaml
      print:
        image: hardcoreeng/print:${HULY_VERSION}
        container_name: print
        ports:
          - 4005:4005
        environment:
          - STORAGE_CONFIG=minio|minio?accessKey=minioadmin&secretKey=minioadmin
          - STATS_URL=http://stats:4900
          - SECRET=${SECRET}
        restart: unless-stopped
        networks:
          - huly_net
    ```

2. Configure `front` service:

    ```yaml
      front:
        ...
        environment:
          - PRINT_URL=http${SECURE:+s}://${HOST_ADDRESS}/_print
        ...
    ```

3. Uncomment print section in `.huly.nginx` file and reload nginx

## AI Service

Huly provides AI-powered chatbot that provides several services:

- chat with AI
- text message translations in the chat
- live translations for virtual office voice and video chats

1. Set up OpenAI account
2. Add `aibot` container to the docker-compose.yaml

    ```yaml
      aibot:
        image: hardcoreeng/ai-bot:${HULY_VERSION}
        ports:
          - 4010:4010
        environment:
          - STORAGE_CONFIG=minio|minio?accessKey=minioadmin&secretKey=minioadmin
          - SERVER_SECRET=${SECRET}
          - ACCOUNTS_URL=http://account:3000
          - DB_URL=${CR_DB_URL}
          - MONGO_URL=mongodb://mongodb:27017
          - STATS_URL=http://stats:4900
          - FIRST_NAME=Bot
          - LAST_NAME=Huly AI
          - PASSWORD=<PASSWORD>
          - OPENAI_API_KEY=<OPENAI_API_KEY>
          - OPENAI_BASE_URL=<OPENAI_BASE_URL>
          # optional if you use love service
          - LOVE_ENDPOINT=http://love:8096
        restart: unless-stopped
        networks:
          - huly_net
    ```

3. Configure `front` service:

    ```yaml
      front:
        ...
        environment:
          # this should be available outside of the cluster
          - AI_URL=http${SECURE:+s}://${HOST_ADDRESS}/_aibot
        ...
    ```

4. Configure `transactor` service:

    ```yaml
      transactor:
        ...
        environment:
          # this should be available inside of the cluster
          - AI_BOT_URL=http://aibot:4010
        ...
    ```

5. Uncomment aibot section in `.huly.nginx` file and reload nginx

## Configure Google Calendar Service

To integrate Google Calendar with Huly, follow these steps:

### Google side

1. Set up a Google Cloud project and enable the Google Calendar API in Google Cloud Console.
2. Create OAuth 2.0 credentials. Use `Web application` as the application type and `https://${HOST_ADDRESS}/_calendar/signin/code` (SET REAL VALUE INSTEAD OF ${HOST_ADDRESS}, https is required!!!) as Authorised redirect URIs. Save your credentials!
3. Add these scopes `./auth/calendar.calendarlist.readonly` `./auth/userinfo.email` `./auth/calendar.calendars.readonly` `./auth/calendar.events`

### Docker-compose side

Add `calendar` container to the docker-compose.yaml

```yaml
  calendar:
    image: hardcoreeng/calendar:${HULY_VERSION}
    ports:
      - 8095:8095
    environment:
      - MONGO_URI=mongodb://mongodb:27017
      - MONGO_DB=%calendar-service
      - Credentials=<JSON_STRING_CREDENTIALS_FROM_GOOGLE_CONSOLE>
      - WATCH_URL=https://${HOST_ADDRESS}/_calendar/push
      - ACCOUNTS_URL=http://account:3000
      - STATS_URL=http://stats:4900
      - SECRET=${SECRET}
      - KVS_URL=http://kvs:8094
    restart: unless-stopped
    networks:
      - huly_net
```

## Configure OpenID Connect (OIDC)

You can configure a Huly instance to authorize users (sign-in/sign-up) using an OpenID Connect identity provider (IdP).

### On the IdP side
1. Create a new OpenID application.
   * Use `{huly_account_svc}/auth/openid/callback` as the sign-in redirect URI. The `huly_account_svc` is the hostname for the account service of the deployment, which should be accessible externally from the client/browser side. In the provided example setup, the account service runs on port 3000.

   **URI Example:**
   - `http://huly.mydomain.com:3000/auth/openid/callback`

2. Configure user access to the application as needed.

### On the Huly side

For the account service, set the following environment variables as provided by the IdP:

* OPENID_CLIENT_ID
* OPENID_CLIENT_SECRET
* OPENID_ISSUER

Ensure you have configured or add the following environment variable to the front service:

* ACCOUNTS_URL (This should contain the URL of the account service, accessible from the client side.)

You will need to expose your account service port (e.g. 3000) in your nginx.conf.

Note: Once all the required environment variables are configured, you will see an additional button on the
sign-in/sign-up pages.

## Configure GitHub OAuth

You can also configure a Huly instance to use GitHub OAuth for user authorization (sign-in/sign-up).

### On the GitHub side
1. Create a new GitHub OAuth application.
   * Use `{huly_account_svc}/_account/auth/github/callback` as the sign-in redirect URI. The `huly_account_svc` is the hostname for the account service of the deployment, which should be accessible externally from the client/browser side.


   **URI Example:**
   - `http://huly.mydomain.com/_account/auth/github/callback`

### On the Huly side

Specify the following environment variables for the account service:

* `GITHUB_CLIENT_ID`
* `GITHUB_CLIENT_SECRET`

Ensure you have configured or add the following environment variable to the front service:

* `ACCOUNTS_URL` (The URL of the account service, accessible from the client side.)

Notes:

* The `ISSUER` environment variable is not required for GitHub OAuth.
* Once all the required environment variables are configured, you will see an additional button on the sign-in/sign-up
  pages.

## Disable Sign-Up

You can disable public sign-ups for a deployment. When configured, sign-ups will only be permitted through an invite
link to a specific workspace.

To implement this, set the following environment variable for both the front and account services:

```yaml
  account:
    # ...
    environment:
      - DISABLE_SIGNUP=true
    # ...
  front:
    # ...
    environment:
      - DISABLE_SIGNUP=true
    # ...
```

_Note: When setting up a new deployment, either create the initial account before disabling sign-ups or use the
development tool to create the first account._

## GitHub Service

Huly provides GitHub integration for bi-directional synchronization of issues, pull requests, comments, and reviews.

### Prerequisites

Set up a GitHub Application for your deployment.
Please refer to [GitHub Apps documentation](https://docs.github.com/en/apps/creating-github-apps/registering-a-github-app/registering-a-github-app) for full instructions on how to register your app.

During registration of the GitHub app, the following secrets should be obtained:

- `GITHUB_APPID` - An application ID number (e.g., 123456), which can be found in General/About in the GitHub UI.
- `GITHUB_CLIENTID` - A client ID, an identifier from the same page (e.g., Iv1.11a1aaa11aa11111).
- `GITHUB_CLIENT_SECRET` - A client secret that can be generated in the client secrets section of the General GitHub App UI page.
- `GITHUB_PRIVATE_KEY` - A private key for authentication.

### Configure Permissions

Set the following permissions for the app:

- Commit statuses: _Read and write_
- Contents: _Read and write_
- Custom properties: _Read and write_
- Discussions: _Read and write_
- Issues: _Read and write_
- Metadata: _Read-only_
- Pages: _Read and write_
- Projects: _Read and write_
- Pull requests: _Read and write_
- Webhooks: _Read and write_

### Subscribe to Events

Enable the following event subscriptions:

- Issues
- Pull request
- Pull request review
- Pull request review comment
- Pull request review thread

### Docker Configuration

1. Add the `github` container to the docker-compose.yaml

```yaml
github:
  image: hardcoreeng/github:${HULY_VERSION}
  ports:
    - 3500:3500
  environment:
    - PORT=3500
    - STORAGE_CONFIG=minio|minio?accessKey=minioadmin&secretKey=minioadmin
    - SERVER_SECRET=${SECRET}
    - ACCOUNTS_URL=http://account:3000
    - STATS_URL=http://stats:4900
    - APP_ID=${GITHUB_APPID}
    - CLIENT_ID=${GITHUB_CLIENTID}
    - CLIENT_SECRET=${GITHUB_CLIENT_SECRET}
    - PRIVATE_KEY=${GITHUB_PRIVATE_KEY}
    - COLLABORATOR_URL=ws${SECURE:+s}://${HOST_ADDRESS}/_collaborator
    - WEBHOOK_SECRET=secret
    - FRONT_URL=http${SECURE:+s}://${HOST_ADDRESS}
    - BOT_NAME=${yourAppName}[bot]
  restart: unless-stopped
  networks:
    - huly_net
```

2. Configure the `front` service:

```yaml
  front:
   ...
   environment:
    # this should be available outside of the cluster
    - GITHUB_APP=${GITHUB_APPID}
    - GITHUB_CLIENTID=${GITHUB_CLIENTID}
   ...
```

3. Uncomment the github section in `.huly.nginx` file and reload nginx

4. Configure Callback URL and Setup URL (with redirect on update set) to your host: `http${SECURE:+s}://${HOST_ADDRESS}/github`

5. Configure Webhook URL to `http${SECURE:+s}://${HOST_ADDRESS}/_github` with the secret `secret`
