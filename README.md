# Huly Self-Hosted

Please use this README if you want to deploy Huly on your server with `docker compose`. I'm using a Basic Droplet on Digital Ocean with Ubuntu 24.04, but these instructions can be easily adapted for any Linux distribution.

> [!NOTE]
> Huly is quite resource-heavy, so I recommend using a Droplet with 2 vCPUs and 4GB of RAM. Droplets with less RAM may
> stop responding or fail.

If you prefer Kubernetes deployment, there is a sample Kubernetes configuration under [kube](kube) directory.

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

This will generate a [huly.conf](./huly.conf) file with your chosen values and create your nginx config.

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

## Mail Service

The Mail Service is responsible for sending email notifications and confirmation emails during user login or signup processes. It can be configured to send emails through either an SMTP server or Amazon SES (Simple Email Service), but not both at the same time.

### General Configuration

1. Add the `mail` container to the `docker-compose.yaml` file. Specify the email address you will use to send emails as "SOURCE":

    ```yaml
    mail:
      image: hardcoreeng/mail:v0.6.501
      container_name: mail
      ports:
        - 8097:8097
      environment:
        - PORT=8097
        - SOURCE=<EMAIL_FROM>
      restart: unless-stopped
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

### Notes

1. SMTP and SES configurations cannot be used simultaneously.
2. `SES_URL` is not supported in version v0.6.470 and later, please use `MAIL_URL` instead.


## Love Service (Audio & Video calls)

Huly audio and video calls are created on top of LiveKit insfrastructure. In order to use Love service in your
self-hosted Huly, perform the following steps:

1. Set up [LiveKit Cloud](https://cloud.livekit.io) account
2. Add `love` container to the docker-compose.yaml

    ```yaml
      love:
        image: hardcoreeng/love:v0.6.501
        container_name: love
        ports:
          - 8096:8096
        environment:
          - STORAGE_CONFIG=minio|minio?accessKey=minioadmin&secretKey=minioadmin
          - SECRET=secret
          - ACCOUNTS_URL=http://account:3000
          - DB_URL=mongodb://mongodb:27017
          - MONGO_URL=mongodb://mongodb:27017
          - STORAGE_PROVIDER_NAME=minio
          - PORT=8096
          - LIVEKIT_HOST=<LIVEKIT_HOST>
          - LIVEKIT_API_KEY=<LIVEKIT_API_KEY>
          - LIVEKIT_API_SECRET=<LIVEKIT_API_SECRET>
        restart: unless-stopped
    ```

3. Configure `front` service:

    ```yaml
      front:
        ...
        environment:
          - LIVEKIT_WS=<LIVEKIT_HOST>
          - LOVE_ENDPOINT=http://love:8096
        ...
    ```

## AI Service

Huly provides AI-powered chatbot that provides several services:

- chat with AI
- text message translations in the chat
- live translations for virtual office voice and video chats

1. Set up OpenAI account
2. Add `aibot` container to the docker-compose.yaml

    ```yaml
      aibot:
        image: hardcoreeng/ai-bot:v0.6.501
        ports:
          - 4010:4010
        environment:
          - STORAGE_CONFIG=minio|minio?accessKey=minioadmin&secretKey=minioadmin
          - SERVER_SECRET=secret
          - ACCOUNTS_URL=http://account:3000
          - DB_URL=mongodb://mongodb:27017
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
    ```

3. Configure `front` service:

    ```yaml
      front:
        ...
        environment:
          # this should be available outside of the cluster
          - AI_URL=http://aibot:4010
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
   * Use `{huly_account_svc}/auth/github/callback` as the sign-in redirect URI. The `huly_account_svc` is the hostname for the account service of the deployment, which should be accessible externally from the client/browser side. In the provided example setup, the account service runs on port 3000.

   **URI Example:**
   - `http://huly.mydomain.com:3000/auth/github/callback`

### On the Huly side

Specify the following environment variables for the account service:

* `GITHUB_CLIENT_ID`
* `GITHUB_CLIENT_SECRET`

Ensure you have configured or add the following environment variable to the front service:

* `ACCOUNTS_URL` (The URL of the account service, accessible from the client side.)

You will need to expose your account service port (e.g. 3000) in your nginx.conf.

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
