# Huly Self-Hosted

Please use this README if you want to deploy Huly on your server with `docker compose`. I'm using a Basic Droplet on Digital Ocean with Ubuntu 23.10, but these instructions can be easily adapted for any Linux distribution.

> [!NOTE]
> Huly is quite resource-heavy, so I recommend using a Droplet with 2 vCPUs and 4GB of RAM. Droplets with less RAM may stop responding or fail.

If you prefer Kubernetes deployment, there is a sample Kubernetes configuration under [kube](kube) directory.

## Installing `nginx` and `docker`

First, let's install `nginx` and `docker` using the commands below if you have not already installed them on your machine.

```bash
$ sudo apt update
$ sudo apt install nginx
$ sudo snap install docker
```

## Clone the `huly-selfhost` repository and configure `nginx`

Next, let's clone the `huly-selfhost` repository and configure the server address. _Please replace **x.y.z.w** with your server's IP address_.

```bash
$ git clone https://github.com/hcengineering/huly-selfhost.git
$ cd huly-selfhost
$ ./setup.sh x.y.z.w # Replace x.y.z.w with your server's IP address
$ sudo ln -s $(pwd)/nginx.conf /etc/nginx/sites-enabled/
```

## Now we're ready to run Huly

Finally, let's restart `nginx` and run Huly with `docker compose`.

```bash
$ sudo systemctl restart nginx
$ sudo docker compose up
```

Now, launch your web browser and enjoy Huly!

## Security

When exposing your self-hosted Huly deployment to the internet, it's crucial to implement some security measures to protect your server and data.

1. Do not expose MongoDB, MinIO, and Elastic services to the internet. Huly does not require them to be accessible from the internet.
2. It is highly recommended to change the default credentials. By default the services, mentioned above, require no authentication, or use default well-known credentials.

## Generating Public and Private VAPID keys for front-end

You'll need `Node.js` installed on your machine. Installing `npm` on Debian based distro:
```
sudo apt-get install npm
```
Install web-push using npm
```
sudo npm install -g web-push
```
Generate VAPID Keys. Run the following command to generate a VAPID key pair:
```
web-push generate-vapid-keys 
```
It will generate both keys that looks like this:
```
=======================================

Public Key:
sdfgsdgsdfgsdfggsdf

Private Key:
asdfsadfasdfsfd

=======================================
```
Keep these keys secure, as you will need them to set up your push notification service on the server.

Add these keys into `compose.yaml` in section `services:front:environment`:
```
- PUSH_PUBLIC_KEY=your public key
- PUSH_PRIVATE_KEY=your private key
```

## AWS SES email notifications

1. Setup Amazon Simple Email Service in AWS: https://docs.aws.amazon.com/ses/latest/dg/setting-up.html

2. Add email address you'll use to send notifications into "SOURCE", SES access such as ACCESS_KEY, SECRET_KEY, REGION

```
  ses:
    image: hardcoreeng/ses:v0.6.295
    container_name: ses
    ports:
      - 3335:3335
    environment:
      - SOURCE=<EMAIL_FROM>
      - ACCESS_KEY=<SES_ACCESS_KEY>
      - SECRET_KEY=<SES_SECRET_KEY>
      - REGION=<SES_REGION>
      - PORT=3335
    restart: unless-stopped
```

3. Add SES container URL into transactor and account containers

`transactor:environment` AND `account:environment`:

```
- SES_URL=http://ses:3335
```

4. In `Settings -> Notifications` setup email notifications for events you need to be notified for. It's a user's setting not a company wide, meaning each user has to setup their own notification rules.


## Configure OpenId Connect

You can configure a Huly instance to authorize users (sign-in/sign-up) using an OpenID Connect identity provider (IdP).

### On the IdP side

* Create a new OpenID application.
* Configure user access to the application as needed.

### On the Huly side

Specify the following environment variables (provided by the IdP) for the account service:

* OPENID_CLIENT_ID
* OPENID_CLIENT_SECRET
* OPENID_ISSUER


Ensure you have configured or add the following environment variable to the front service:

* ACCOUNTS_URL (This should contain the URL of the account service, accessible from the client side.)

Note: Once all the required environment variables are configured, you will see an additional button on the sign-in/sign-up pages.

