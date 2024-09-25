# Huly Self-Hosted

Please use this README if you want to deploy Huly on your server with `docker compose`. I'm using a Basic Droplet on Digital Ocean with Ubuntu 23.10, but these instructions can be easily adapted for any Linux distribution.

> [!NOTE]
> Huly is quite resource-heavy, so I recommend using a Droplet with 2 vCPUs and 4GB of RAM. Droplets with less RAM may stop responding or fail.

If you prefer Kubernetes deployment, there is a sample Kubernetes configuration under [kube](kube) directory.

## Installing `nginx` and `docker`

First, let's install `nginx` and `docker` using the commands below if you have not already installed them on your machine.

```bash
sudo apt update
sudo apt install nginx
sudo snap install docker
```

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
> If you change `HOST_ADDRESS`, `HTTP_PORT`, `HTTP_BIND` be sure to update your [nginx.conf](./nginx.conf) by running:
> ```bash
> ./nginx.sh
> ```
>You can safely execute this script after adding your custom configurations like ssl. It will only overwrite the necessary settings.

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

Add these keys into `compose.yaml` in section `services:front:environnement`:
```
- PUSH_PUBLIC_KEY=your public key
- PUSH_PRIVATE_KEY=your private key
```