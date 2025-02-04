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

## AWS SES email notifications

1. Setup Amazon Simple Email Service in AWS: https://docs.aws.amazon.com/ses/latest/dg/setting-up.html

2. [Create new policy](https://us-east-1.console.aws.amazon.com/iam/home?region=eu-central-1#/policies/create) with
   following permissions:

    ```yaml
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

3. [Create separate IAM user](https://us-east-1.console.aws.amazon.com/iam/home?region=eu-central-1#/users/create) for
   SES API access. Assign previously created policy to this user during creation.

4. Add email address you'll use to send notifications into "SOURCE", SES access such as ACCESS_KEY, SECRET_KEY, REGION

    ```yaml
      ses:
        image: hardcoreeng/ses:v0.6.424
        container_name: ses
        expose:
          - 3335
        environment:
          - SOURCE=<EMAIL_FROM>
          - ACCESS_KEY=<SES_ACCESS_KEY>
          - SECRET_KEY=<SES_SECRET_KEY>
          - PUSH_PUBLIC_KEY=<PUSH_PUBLIC_KEY>
          - PUSH_PRIVATE_KEY=<PUSH_PRIVATE_KEY>
          - REGION=<SES_REGION>
          - PORT=3335
        restart: unless-stopped
    ```

5. Add SES container URL into `transactor` and `account` containers:

    ```yaml
    account:
      # ...
      environment:
        - SES_URL=http://ses:3335
      # ...
    transactor:
      # ...
      environment:
        - SES_URL=http://ses:3335
      # ...
    ```

6. In `Settings -> Notifications` setup email notifications for events you need to be notified for. It's a user's
   setting not a company wide, meaning each user has to setup their own notification rules.

## Love Service (Audio & Video calls)

Huly audio and video calls are created on top of LiveKit insfrastructure. In order to use Love service in your
self-hosted Huly, perform the following steps:

1. Set up [LiveKit Cloud](https://cloud.livekit.io) account
2. Add `love` container to the docker-compose.yaml

    ```yaml
      love:
        image: hardcoreeng/love:v0.6.424
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
        # ...
        environment:
          - LIVEKIT_WS=<LIVEKIT_HOST>
          - LOVE_ENDPOINT=http://love:8096
        # ...
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
